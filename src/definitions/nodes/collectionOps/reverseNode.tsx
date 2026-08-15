import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS, ICONS } from "../../../components/Icon";
import { ReactNode } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

// Reverse flips element order: array<T> -> array<T>. Pure, no params.
const def = signature({
    args: { T: $.ANY },
    in: ({ T }) => ({ source: $.arrayOf(T) }),
    out: ({ T }) => ({ output: $.arrayOf(T), count: "integer" }),
});

export type ReverseDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
    }
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<ReverseDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"reverse", ReverseDefinition> => {
    return {
        id,
        in: { source: null },
        out: { output: [], count: [] },
        payload: { label: "", ...input },
        type: "reverse",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ReverseDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"source"}>
                Source
            </SocketIn>
            <hr />
            <SocketOut node={node} socketId={"count"}>
                Count
            </SocketOut>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<ReverseDefinition>, outSocket: keyof ReverseDefinition["outputs"], _deps: AllDeps): (keyof ReverseDefinition["inputs"])[] => {
    if (outSocket === "output" || outSocket === "count") return ["source"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ReverseDefinition>, inSocket: keyof ReverseDefinition["inputs"], _deps: AllDeps): (keyof ReverseDefinition["outputs"])[] => {
    if (inSocket === "source") return ["output", "count"];
    return [];
};

/** Unwrap one `array<...>` layer to its element kind string. */
const unwrapArray = (kind: string): string => (kind.startsWith("array<") && kind.endsWith(">") ? kind.slice("array<".length, -1) : kind);

const evaluate = (node: NodeDefinitions.NodeFor<ReverseDefinition>, socket: keyof ReverseDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output" && socket !== "count") return null;
    const source = context.resolve<DataTypes.ArrayOf<DataTypes.AnyKind>>(node.id, "source");
    if (!source) return null;
    if (socket === "count") return { kind: "integer", data: `${source.data.length}` };
    return { kind: `array<${unwrapArray(source.kind)}>`, data: [...source.data].reverse() };
};

export const ReverseNodeType: NodeTypes.Type<"reverse", ReverseDefinition> = {
    type: "reverse",
    displayName: "Reverse",
    defaultLabel: "Reverse",
    iconNode: <NodeIcon shape={ICONS.Media.FastBackward} modifierIcon={NODE_ICONS.modifiers.arrayOf} />,
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
