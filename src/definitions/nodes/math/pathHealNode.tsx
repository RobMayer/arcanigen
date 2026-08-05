import { nanoid } from "nanoid";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { ReactNode } from "react";
import { TypicalNode } from "../../../features/nodeview/node";
import { SocketOut, SocketIn } from "../../../features/nodeview/slots";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { PaperHelper } from "../../../util/paperHelper";
import { makeCanInterject, makeOnInterject } from "./numericMath";

export type PathHealNodeDefinition = {
    inputs: {
        path: DataTypes.Use<"path">;
    };
    outputs: {
        output: DataTypes.Use<"path">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<PathHealNodeDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"pathHeal", PathHealNodeDefinition> => {
    return {
        id,
        in: {
            path: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
        },
        type: "pathHeal",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PathHealNodeDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"path"}>
                Input
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<PathHealNodeDefinition>, outSocket: keyof PathHealNodeDefinition["outputs"], _deps: AllDeps): (keyof PathHealNodeDefinition["inputs"])[] => {
    return ["path"];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PathHealNodeDefinition>, inSocket: keyof PathHealNodeDefinition["inputs"], _deps: AllDeps): (keyof PathHealNodeDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<PathHealNodeDefinition>, socket: keyof PathHealNodeDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const pathData = context.resolve<"path">(node.id, "path")?.data;
    if (!pathData) return null;

    return PaperHelper.heal(pathData);
};

const SOCKETTYPES_IN: { [key in keyof Required<PathHealNodeDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    path: { types: ["path"], mode: "or" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<PathHealNodeDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["path"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<PathHealNodeDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const PathHealNodeType: NodeTypes.Type<"pathHeal", PathHealNodeDefinition> = {
    type: "pathHeal",
    displayName: "Path Heal",
    defaultLabel: "Path Heal",
    iconNode: <NodeIcon shape={NODE_ICONS.pathHeal} />,
    flavour: "help",
    category: "Modifiers",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
    canInterject: makeCanInterject(SOCKETTYPES_IN.path, SOCKETTYPES_OUT.output),
    onInterject: makeOnInterject("path", "output"),
};
