import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject } from "../nodeHelpers";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { Resolver } from "../../../util/resolver";

export type LogicalNotDefinition = {
    inputs: {
        input: DataTypes.Use<"boolean">;
    };
    outputs: {
        output: DataTypes.Use<"boolean">;
    };
    payload: {
        label: string;
    };
};

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
            <SocketOut node={node} socketId={"output"} label={"Output"}>
                <ValuePreview value={preview} />
            </SocketOut>
            <SocketIn node={node} socketId={"input"}>
                Input
            </SocketIn>
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
        const input = context.resolve<"boolean">(node.id, "input");
        return { kind: "boolean", data: input !== null ? !input.data : true };
    }
    return null;
};

const getSocketType = (_node: NodeDefinitions.NodeFor<LogicalNotDefinition>, _socketId: string, _side: "in" | "out"): SocketTypes.SocketRule => {
    return SocketTypes.of("boolean");
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
    getSocketType,
    canInterject: passthroughCanInterject(SocketTypes.of("boolean"), SocketTypes.of("boolean")),
    onInterject: passthroughInterject("input", "output"),
};
