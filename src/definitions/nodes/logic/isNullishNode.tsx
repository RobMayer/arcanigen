import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { Resolver } from "../../../util/resolver";

export type IsNullishDefinition = {
    inputs: {
        input: DataTypes.Any;
    };
    outputs: {
        output: DataTypes.Use<"boolean">;
    };
    payload: {
        label: string;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<IsNullishDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"isNullish", IsNullishDefinition> => {
    return {
        id,
        in: { input: null },
        out: { output: [] },
        payload: { label: "" },
        type: "isNullish",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<IsNullishDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
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

const dependsOn = (_node: NodeDefinitions.NodeFor<IsNullishDefinition>, outSocket: keyof IsNullishDefinition["outputs"], _deps: AllDeps): (keyof IsNullishDefinition["inputs"])[] => {
    if (outSocket === "output") return ["input"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<IsNullishDefinition>, inSocket: keyof IsNullishDefinition["inputs"], _deps: AllDeps): (keyof IsNullishDefinition["outputs"])[] => {
    if (inSocket === "input") return ["output"];
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<IsNullishDefinition>, socket: keyof IsNullishDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const input = context.resolve(node.id, "input");
        const isNullish = input === null || input.data === null || input.data === "";
        return { kind: "boolean", data: isNullish };
    }
    return null;
};

const getSocketType = (_node: NodeDefinitions.NodeFor<IsNullishDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    if (side === "in") return SocketTypes.ANY;
    return SocketTypes.of("boolean");
};

export const IsNullishNodeType: NodeTypes.Type<"isNullish", IsNullishDefinition> = {
    type: "isNullish",
    displayName: "Is Nullish",
    defaultLabel: "Is Nullish",
    iconNode: <Icon shape={NODE_ICONS.nullish} color={"var(--icon-flavour)"} />,
    category: "Logic",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
