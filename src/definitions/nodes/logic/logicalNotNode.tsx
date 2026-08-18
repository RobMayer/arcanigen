import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject } from "../../helpers/nodeHelper";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, SocketPair, ValuePreview } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { SocketTypes } from "../../socketTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { Resolver } from "../../../util/resolver";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { input: "boolean" },
    out: { output: "boolean" },
});

export type LogicalNotDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<LogicalNotDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"logicalNot", LogicalNotDefinition> => {
    return {
        id,
        in: { input: null },
        out: { output: [] },
        payload: { label: "" },
        type: "logicalNot",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<LogicalNotDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "output");
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketPair node={node} socketInId={"input"} socketOutId={"output"} label={"Value"}>
                <ValuePreview value={preview} />
            </SocketPair>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<LogicalNotDefinition>, outSocket: keyof LogicalNotDefinition["outputs"], _deps: AllDeps): (keyof LogicalNotDefinition["inputs"])[] => {
    if (outSocket === "output") return ["input"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<LogicalNotDefinition>, inSocket: keyof LogicalNotDefinition["inputs"], _deps: AllDeps): (keyof LogicalNotDefinition["outputs"])[] => {
    if (inSocket === "input") return ["output"];
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<LogicalNotDefinition>, socket: keyof LogicalNotDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const input = context.resolve<DataTypes.Boolean>(node.id, "input");
        return { kind: "boolean", data: input !== null ? !input.data : true };
    }
    return null;
};

export const LogicalNotNodeType: NodeTypes.Type<"logicalNot", LogicalNotDefinition> = {
    type: "logicalNot",
    displayName: "Not",
    defaultLabel: "Not",
    iconNode: <NodeIcon shape={NODE_ICONS.logicalNot} />,
    flavour: "help",
    category: "Logic",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
    canInterject: passthroughCanInterject(SocketTypes.of(DataTypes.BOOLEAN), SocketTypes.of(DataTypes.BOOLEAN)),
    onInterject: passthroughInterject("input", "output"),
};
