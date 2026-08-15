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
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

// Splice inserts a whole `insert` array into `source` at an anchor + side (the array-level Inject). Same
// addressing as Inject: `anchor` picks a real element (negative from the end), `side` picks which side ->
// default `after -1` appends the block. Anchor clamps to the ends; empty source -> just the inserted block;
// disconnected insert -> source unchanged. `T` is shared, so both arrays must carry the same element type.
const def = signature({
    args: { T: $.ANY },
    in: ({ T }) => ({ source: $.arrayOf(T), insert: $.arrayOf(T), anchor: "integer", side: "enum" }),
    out: ({ T }) => ({ output: $.arrayOf(T), count: "integer" }),
});

export type SpliceDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        anchor: DataTypes.TypeOf<DataTypes.Integer>;
        side: DataTypes.TypeOf<DataTypes.Enum>;
    }
>;

const SIDE_OPTIONS = Enum.options(Enum.Common.injectSide);

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<SpliceDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"splice", SpliceDefinition> => {
    return {
        id,
        in: { source: null, insert: null, anchor: null, side: null },
        out: { output: [], count: [] },
        payload: {
            label: "",
            anchor: "-1",
            side: Enum.Common.injectSide.AFTER.value, // default = append the block to the end
            ...input,
        },
        type: "splice",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<SpliceDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<SpliceDefinition>>) => {
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
            <SocketIn node={node} socketId={"source"} label={"Source"} />
            <SocketIn node={node} socketId={"insert"} label={"Insert"} />
            <SocketIn node={node} socketId={"anchor"} label={"Anchor"}>
                <IntegerInput value={node.payload.anchor} onCommit={(anchor) => handleUpdate({ anchor })} disabled={node.in.anchor !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"side"} label={"Side"}>
                <RadioButton.Group
                    orientation={"horizontal"}
                    value={`${node.payload.side}`}
                    onValue={(v) => handleUpdate({ side: Number(v) })}
                    disabled={node.in.side !== null}
                    options={SIDE_OPTIONS}
                />
            </SocketIn>
        </TypicalNode>
    );
};

const ALL_INPUTS: (keyof SpliceDefinition["inputs"])[] = ["source", "insert", "anchor", "side"];

const dependsOn = (_node: NodeDefinitions.NodeFor<SpliceDefinition>, outSocket: keyof SpliceDefinition["outputs"], _deps: AllDeps): (keyof SpliceDefinition["inputs"])[] => {
    if (outSocket === "output" || outSocket === "count") return ALL_INPUTS;
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<SpliceDefinition>, _inSocket: keyof SpliceDefinition["inputs"], _deps: AllDeps): (keyof SpliceDefinition["outputs"])[] => {
    return ["output", "count"];
};

/** Unwrap one `array<...>` layer to its element kind string. */
const unwrapArray = (kind: string): string => (kind.startsWith("array<") && kind.endsWith(">") ? kind.slice("array<".length, -1) : kind);

const evaluate = (node: NodeDefinitions.NodeFor<SpliceDefinition>, socket: keyof SpliceDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output" && socket !== "count") return null;

    const source = context.resolve<DataTypes.ArrayOf<DataTypes.AnyKind>>(node.id, "source");
    if (!source) return null;
    const items = source.data;
    const outKind = `array<${unwrapArray(source.kind)}>`;

    const insert = context.resolve<DataTypes.ArrayOf<DataTypes.AnyKind>>(node.id, "insert");
    const block = insert ? insert.data : [];
    const n = items.length;

    let data: unknown[];
    if (block.length === 0) {
        data = [...items]; // nothing to insert -> passthrough
    } else if (n === 0) {
        data = [...block];
    } else {
        const anchorRaw = Math.round(NumericString.Emptyable.asNumber(context.resolve<DataTypes.Integer>(node.id, "anchor")?.data ?? node.payload.anchor) ?? -1);
        const side = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "side")?.data, Enum.Common.injectSide) ?? node.payload.side;

        let a = anchorRaw < 0 ? n + anchorRaw : anchorRaw;
        a = Math.max(0, Math.min(n - 1, a)); // clamp to a real element
        const p = side === Enum.Common.injectSide.AFTER.value ? a + 1 : a;
        data = [...items.slice(0, p), ...block, ...items.slice(p)];
    }

    if (socket === "count") return { kind: "integer", data: `${data.length}` };
    return { kind: outKind, data };
};

export const SpliceNodeType: NodeTypes.Type<"splice", SpliceDefinition> = {
    type: "splice",
    displayName: "Splice",
    defaultLabel: "Splice",
    iconNode: <NodeIcon shape={NODE_ICONS.merge} modifierIcon={NODE_ICONS.modifiers.arrayOf} />,
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
