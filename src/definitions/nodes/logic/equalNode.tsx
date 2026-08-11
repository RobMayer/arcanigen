import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { Resolver } from "../../../util/resolver";
import { extractPair } from "../../helpers/mathHelper";
import { SignatureEngine } from "../../helpers/signatureEngine";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";

const def = signature({
    args: { T: $.combine.NUMERIC_ADDABLE },
    in: ({ T }) => ({ a: T, b: T }),
    out: { output: "boolean" },
});

export type EqualDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<EqualDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"equal", EqualDefinition> => {
    return {
        id,
        in: { a: null, b: null },
        out: { output: [] },
        payload: { label: "" },
        type: "equal",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<EqualDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "output");
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} label={"Output"}>
                <ValuePreview value={preview} />
            </SocketOut>
            <SocketIn node={node} socketId={"a"}>
                A
            </SocketIn>
            <SocketIn node={node} socketId={"b"}>
                B
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<EqualDefinition>, outSocket: "output", _deps: AllDeps): (keyof EqualDefinition["inputs"])[] => {
    if (outSocket === "output") return ["a", "b"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<EqualDefinition>, _inSocket: keyof EqualDefinition["inputs"], _deps: AllDeps): (keyof EqualDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<EqualDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;
    const aVal = context.resolve(node.id, "a");
    const bVal = context.resolve(node.id, "b");
    if (!aVal || !bVal) return null;
    const { a, b } = extractPair(aVal.kind, aVal.data, bVal.kind, bVal.data);
    return { kind: "boolean", data: a === b };
};

export const EqualNodeType: NodeTypes.Type<"equal", EqualDefinition> = {
    type: "equal",
    displayName: "Equal",
    defaultLabel: "Equal",
    iconNode: <NodeIcon shape={NODE_ICONS.equal} />,
    flavour: "help",
    category: "Logic",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
