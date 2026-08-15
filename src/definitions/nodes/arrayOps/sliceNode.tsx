import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { Enum } from "../../datatypes/enum";
import { NumericString } from "../../datatypes/numericString";
import { EmptyOr } from "../../../util/misc";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

// Slice takes a contiguous run of `source` -> array<T>. The array analogue of Substring: `startIndex`
// (negative counts from the end), then `mode` picks how the extent is given -- LENGTH = a count from start,
// END = an exclusive end index (end <= 0 measures from the end, so end=0 means "to the end").
const def = signature({
    args: { T: $.ANY },
    in: ({ T }) => ({ source: $.arrayOf(T), startIndex: "integer", mode: "enum", length: "integer", end: "integer" }),
    out: ({ T }) => ({ output: $.arrayOf(T), count: "integer" }),
});

export type SliceDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        startIndex: DataTypes.TypeOf<DataTypes.Integer>;
        mode: DataTypes.TypeOf<DataTypes.Enum>;
        length: DataTypes.TypeOf<DataTypes.Integer>;
        end: DataTypes.TypeOf<DataTypes.Integer>;
    }
>;

const MODE_OPTIONS = Enum.options(Enum.Common.subelementMode);

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<SliceDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"slice", SliceDefinition> => {
    return {
        id,
        in: { source: null, startIndex: null, mode: null, length: null, end: null },
        out: { output: [], count: [] },
        payload: {
            label: "",
            startIndex: "0",
            // End mode with end=0 maps to "to the end" -> a fresh node passes the array through unchanged.
            mode: Enum.Common.subelementMode.END.value,
            length: "0",
            end: "0",
            ...input,
        },
        type: "slice",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<SliceDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<SliceDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const isLength = node.payload.mode === Enum.Common.subelementMode.LENGTH.value;
    const isEnd = node.payload.mode === Enum.Common.subelementMode.END.value;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketOut node={node} socketId={"count"}>
                Count
            </SocketOut>
            <SocketIn node={node} socketId={"source"} label={"Source"} />
            <SocketIn node={node} socketId={"startIndex"} label={"Start Index"}>
                <IntegerInput value={node.payload.startIndex} onCommit={(startIndex) => handleUpdate({ startIndex })} disabled={node.in.startIndex !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"mode"} label={"Mode"}>
                <RadioButton.Group
                    orientation={"horizontal"}
                    value={`${node.payload.mode}`}
                    onValue={(v) => handleUpdate({ mode: Number(v) })}
                    disabled={node.in.mode !== null}
                    options={MODE_OPTIONS}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"length"} label={"Length"}>
                <IntegerInput value={node.payload.length} onCommit={(length) => handleUpdate({ length })} disabled={node.in.length !== null || !isLength} min={"0"} />
            </SocketIn>
            <SocketIn node={node} socketId={"end"} label={"End"}>
                <IntegerInput value={node.payload.end} onCommit={(end) => handleUpdate({ end })} disabled={node.in.end !== null || !isEnd} />
            </SocketIn>
        </TypicalNode>
    );
};

const ALL_INPUTS: (keyof SliceDefinition["inputs"])[] = ["source", "startIndex", "mode", "length", "end"];

const dependsOn = (_node: NodeDefinitions.NodeFor<SliceDefinition>, outSocket: keyof SliceDefinition["outputs"], _deps: AllDeps): (keyof SliceDefinition["inputs"])[] => {
    if (outSocket === "output" || outSocket === "count") return ALL_INPUTS;
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<SliceDefinition>, _inSocket: keyof SliceDefinition["inputs"], _deps: AllDeps): (keyof SliceDefinition["outputs"])[] => {
    return ["output", "count"];
};

/** Unwrap one `array<...>` layer to its element kind string. */
const unwrapArray = (kind: string): string => (kind.startsWith("array<") && kind.endsWith(">") ? kind.slice("array<".length, -1) : kind);

const resolveInt = (context: Resolver.Context, nodeId: string, socketId: keyof SliceDefinition["inputs"], fallback: EmptyOr<NumericString.Type>, def: number): number => {
    const raw = context.resolve<DataTypes.Integer>(nodeId, socketId)?.data ?? fallback;
    return Math.round(NumericString.Emptyable.asNumber(raw) ?? def);
};

const evaluate = (node: NodeDefinitions.NodeFor<SliceDefinition>, socket: keyof SliceDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output" && socket !== "count") return null;

    const source = context.resolve<DataTypes.ArrayOf<DataTypes.AnyKind>>(node.id, "source");
    if (!source) return null;
    const items = source.data;
    const len = items.length;

    // start: negative counts from the end, then clamp into [0, len].
    const startRaw = resolveInt(context, node.id, "startIndex", node.payload.startIndex, 0);
    const start = Math.max(0, Math.min(len, startRaw < 0 ? len + startRaw : startRaw));

    const mode = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "mode")?.data, Enum.Common.subelementMode) ?? node.payload.mode;

    let end: number;
    if (mode === Enum.Common.subelementMode.LENGTH.value) {
        const length = Math.max(0, resolveInt(context, node.id, "length", node.payload.length, 0));
        end = start + length;
    } else {
        // End mode: end <= 0 measures from the end (end=0 means "to the end"), end > 0 is absolute.
        const endRaw = resolveInt(context, node.id, "end", node.payload.end, 0);
        end = endRaw <= 0 ? len + endRaw : endRaw;
    }
    end = Math.max(start, Math.min(len, end));

    const result = items.slice(start, end);
    if (socket === "count") return { kind: "integer", data: `${result.length}` };
    return { kind: `array<${unwrapArray(source.kind)}>`, data: result };
};

export const SliceNodeType: NodeTypes.Type<"slice", SliceDefinition> = {
    type: "slice",
    displayName: "Slice",
    defaultLabel: "Slice",
    iconNode: <NodeIcon shape={NODE_ICONS.split} modifierIcon={NODE_ICONS.modifiers.arrayOf} />,
    flavour: "danger",
    category: "Collection Ops",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
