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

// Rotate cyclically shifts elements by `by`, wrapping (no elements lost): [a,b,c,d] by 1 -> [b,c,d,a].
// Positive rotates toward the front, negative toward the back; `by` wraps mod length.
const def = signature({
    args: { T: $.ANY },
    in: ({ T }) => ({ source: $.arrayOf(T), by: "integer" }),
    out: ({ T }) => ({ output: $.arrayOf(T), count: "integer" }),
});

export type RotateArrayDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        by: DataTypes.TypeOf<DataTypes.Integer>;
    }
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<RotateArrayDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"rotateArray", RotateArrayDefinition> => {
    return {
        id,
        in: { source: null, by: null },
        out: { output: [], count: [] },
        payload: { label: "", by: "1", ...input },
        type: "rotateArray",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<RotateArrayDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<RotateArrayDefinition>>) => {
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
            <SocketIn node={node} socketId={"source"} label={"Source"} />
            <SocketIn node={node} socketId={"by"} label={"By"}>
                <IntegerInput value={node.payload.by} onCommit={(by) => handleUpdate({ by })} disabled={node.in.by !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<RotateArrayDefinition>, outSocket: keyof RotateArrayDefinition["outputs"], _deps: AllDeps): (keyof RotateArrayDefinition["inputs"])[] => {
    if (outSocket === "output" || outSocket === "count") return ["source", "by"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<RotateArrayDefinition>, _inSocket: keyof RotateArrayDefinition["inputs"], _deps: AllDeps): (keyof RotateArrayDefinition["outputs"])[] => {
    return ["output", "count"];
};

/** Unwrap one `array<...>` layer to its element kind string. */
const unwrapArray = (kind: string): string => (kind.startsWith("array<") && kind.endsWith(">") ? kind.slice("array<".length, -1) : kind);

const evaluate = (node: NodeDefinitions.NodeFor<RotateArrayDefinition>, socket: keyof RotateArrayDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output" && socket !== "count") return null;

    const source = context.resolve<DataTypes.ArrayOf<DataTypes.AnyKind>>(node.id, "source");
    if (!source) return null;
    const items = source.data;
    const outKind = `array<${unwrapArray(source.kind)}>`;
    const n = items.length;

    let data: unknown[];
    if (n === 0) {
        data = [];
    } else {
        const by = Math.round(NumericString.Emptyable.asNumber(context.resolve<DataTypes.Integer>(node.id, "by")?.data ?? node.payload.by) ?? 0);
        const shift = ((by % n) + n) % n; // normalize into [0, n)
        data = [...items.slice(shift), ...items.slice(0, shift)];
    }

    if (socket === "count") return { kind: "integer", data: `${data.length}` };
    return { kind: outKind, data };
};

export const RotateArrayNodeType: NodeTypes.Type<"rotateArray", RotateArrayDefinition> = {
    type: "rotateArray",
    displayName: "Rotate Array",
    defaultLabel: "Rotate Array",
    iconNode: <NodeIcon shape={NODE_ICONS.rotate} modifierIcon={NODE_ICONS.modifiers.arrayOf} />,
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
