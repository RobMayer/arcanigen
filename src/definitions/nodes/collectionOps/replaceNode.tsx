import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { NumericString } from "../../datatypes/numericString";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

// Replace overwrites the element AT `index` with `value` (the SET half of the get/insert/remove quartet --
// At Index gets, Inject inserts beside, Pluck removes, Replace sets in place). Negative index counts from the
// end; out of range -> no change (passthrough). `T` is shared between the array element and `value`.
const def = signature({
    args: { T: $.ANY },
    in: ({ T }) => ({ source: $.arrayOf(T), index: "integer", value: T }),
    out: ({ T }) => ({ output: $.arrayOf(T), count: "integer" }),
});

export type ReplaceDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        index: DataTypes.TypeOf<DataTypes.Integer>;
    }
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<ReplaceDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"replace", ReplaceDefinition> => {
    return {
        id,
        in: { source: null, index: null, value: null },
        out: { output: [], count: [] },
        payload: { label: "", index: "-1", ...input },
        type: "replace",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ReplaceDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ReplaceDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketOut node={node} socketId={"count"}>
                Count
            </SocketOut>
            <hr />
            <SocketIn node={node} socketId={"source"}>
                Source
            </SocketIn>
            <SocketIn node={node} socketId={"index"} label={"Index"}>
                <IntegerInput value={node.payload.index} onCommit={(index) => handleUpdate({ index })} disabled={node.in.index !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"value"}>
                Value
            </SocketIn>
        </TypicalNode>
    );
};

const ALL_INPUTS: (keyof ReplaceDefinition["inputs"])[] = ["source", "index", "value"];

const dependsOn = (_node: NodeDefinitions.NodeFor<ReplaceDefinition>, outSocket: keyof ReplaceDefinition["outputs"], _deps: AllDeps): (keyof ReplaceDefinition["inputs"])[] => {
    if (outSocket === "output" || outSocket === "count") return ALL_INPUTS;
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ReplaceDefinition>, _inSocket: keyof ReplaceDefinition["inputs"], _deps: AllDeps): (keyof ReplaceDefinition["outputs"])[] => {
    return ["output", "count"];
};

/** Unwrap one `array<...>` layer to its element kind string. */
const unwrapArray = (kind: string): string => (kind.startsWith("array<") && kind.endsWith(">") ? kind.slice("array<".length, -1) : kind);

const evaluate = (node: NodeDefinitions.NodeFor<ReplaceDefinition>, socket: keyof ReplaceDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output" && socket !== "count") return null;

    const source = context.resolve<DataTypes.ArrayOf<DataTypes.AnyKind>>(node.id, "source");
    if (!source) return null;
    const items = source.data;
    const outKind = `array<${unwrapArray(source.kind)}>`;
    const n = items.length;

    const value = context.resolve<DataTypes.AnyKind>(node.id, "value");

    const data = [...items];
    if (value) {
        const raw = Math.round(NumericString.Emptyable.asNumber(context.resolve<DataTypes.Integer>(node.id, "index")?.data ?? node.payload.index) ?? -1);
        const i = raw < 0 ? n + raw : raw;
        if (i >= 0 && i < n) data[i] = value.data; // out of range -> no change
    }

    if (socket === "count") return { kind: "integer", data: `${data.length}` };
    return { kind: outKind, data };
};

export const ReplaceNodeType: NodeTypes.Type<"replace", ReplaceDefinition> = {
    type: "replace",
    displayName: "Replace",
    defaultLabel: "Replace",
    iconNode: <NodeIcon shape={NODE_ICONS.replace} modifierIcon={NODE_ICONS.modifiers.arrayOf} />,
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
