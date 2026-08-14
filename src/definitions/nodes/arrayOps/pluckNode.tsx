import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { Resolver } from "../../../util/resolver";
import { NumericString } from "../../datatypes/numericString";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

// Pluck removes one element at `index` (the element-level removeAt) -> the removed `entry` (T) AND the `rest`
// (array<T> without it). Negative index counts from the end (default -1 = pop, 0 = shift). Out of range ->
// `entry` null and `rest` = source unchanged.
const def = signature({
    args: { T: $.ANY },
    in: ({ T }) => ({ source: $.arrayOf(T), index: "integer" }),
    out: ({ T }) => ({ entry: T, rest: $.arrayOf(T), count: "integer" }),
});

export type PluckDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        index: DataTypes.TypeOf<DataTypes.Integer>;
    }
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<PluckDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"pluck", PluckDefinition> => {
    return {
        id,
        in: { source: null, index: null },
        out: { entry: [], rest: [], count: [] },
        payload: { label: "", index: "-1", ...input },
        type: "pluck",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PluckDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const entryPreview = Project.useCachedOutput(graphId, node, "entry");
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PluckDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"entry"} label={"Entry"}>
                <ValuePreview value={entryPreview} />
            </SocketOut>
            <SocketOut node={node} socketId={"rest"} label={"Rest"} />
            <SocketOut node={node} socketId={"count"} label={"Count"} />
            <hr />
            <SocketIn node={node} socketId={"source"} label={"Source"} />
            <SocketIn node={node} socketId={"index"} label={"Index"}>
                <IntegerInput value={node.payload.index} onCommit={(index) => handleUpdate({ index })} disabled={node.in.index !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<PluckDefinition>, outSocket: keyof PluckDefinition["outputs"], _deps: AllDeps): (keyof PluckDefinition["inputs"])[] => {
    if (outSocket === "entry" || outSocket === "rest" || outSocket === "count") return ["source", "index"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PluckDefinition>, inSocket: keyof PluckDefinition["inputs"], _deps: AllDeps): (keyof PluckDefinition["outputs"])[] => {
    if (inSocket === "source" || inSocket === "index") return ["entry", "rest", "count"];
    return [];
};

/** Unwrap one `array<...>` layer to its element kind string. */
const unwrapArray = (kind: string): string => (kind.startsWith("array<") && kind.endsWith(">") ? kind.slice("array<".length, -1) : kind);

const evaluate = (node: NodeDefinitions.NodeFor<PluckDefinition>, socket: keyof PluckDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "entry" && socket !== "rest" && socket !== "count") return null;

    const source = context.resolve<DataTypes.ArrayOf<DataTypes.AnyKind>>(node.id, "source");
    if (!source) return null;
    const items = source.data;
    const n = items.length;
    const elementKind = unwrapArray(source.kind);

    const raw = Math.round(NumericString.Emptyable.asNumber(context.resolve<DataTypes.Integer>(node.id, "index")?.data ?? node.payload.index) ?? -1);
    const i = raw < 0 ? n + raw : raw;
    const inRange = i >= 0 && i < n;

    if (socket === "entry") {
        if (!inRange) return null; // out of range -> null entry
        return { kind: elementKind, data: items[i] };
    }
    // rest: source without the plucked element (unchanged when out of range)
    const data = inRange ? [...items.slice(0, i), ...items.slice(i + 1)] : [...items];
    if (socket === "count") return { kind: "integer", data: `${data.length}` };
    return { kind: `array<${elementKind}>`, data };
};

export const PluckNodeType: NodeTypes.Type<"pluck", PluckDefinition> = {
    type: "pluck",
    displayName: "Pluck",
    defaultLabel: "Pluck",
    iconNode: <NodeIcon shape={NODE_ICONS.subtract} modifierIcon={NODE_ICONS.modifiers.arrayOf} />,
    flavour: "danger",
    category: "Math",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
