import { nanoid } from "nanoid";
import { Icon, ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";

export type DebugDefinition = {
    inputs: {
        input: DataTypes.Use<"float">;
    };
    outputs: never;
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        someFloat: DataTypes.TypeOf<DataTypes.Use<"float">>;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<DebugDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"debug", DebugDefinition> => {
    return {
        id,
        in: {
            input: null,
        },
        out: {},
        payload: {
            label: "",
            someFloat: "0.5",
        },
        type: "debug",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<DebugDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const valueToRender = Project.useCachedInput(graphId, node, "input")?.data;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketIn node={node} socketId={"input"} type={"float"} label={"Value"}>
                {valueToRender ?? "Nothing"}
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<DebugDefinition>, _outSocket: keyof DebugDefinition["outputs"], _deps: AllDeps): (keyof DebugDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<DebugDefinition>, _inSocket: keyof DebugDefinition["inputs"], _deps: AllDeps): (keyof DebugDefinition["outputs"])[] => {
    return [];
};
const evaluate = (node: NodeDefinitions.NodeFor<DebugDefinition>, socket: keyof DebugDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    return null;
};

const getSocketType = (_node: NodeDefinitions.NodeFor<DebugDefinition>, socketId: string, _side: "in" | "out"): string => {
    switch (socketId) {
        case "input": return "float";
        default: return "float";
    }
};

export const DebugType: NodeTypes.Type<"debug", DebugDefinition> = {
    type: "debug",
    displayName: "Debug",
    defaultLabel: "Debug",
    iconNode: <Icon shape={ICONS.Bug} color={"var(--icon-flavour)"} />,
    category: "Meta",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    getSocketType,
};
