import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject } from "../nodeHelpers";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { ReactNode } from "react";
import { TypicalNode } from "../../../features/nodeview/node";
import { SocketOut, SocketIn } from "../../../features/nodeview/slots";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { PaperHelper } from "../../../util/paperHelper";

export type PathJoinDefinition = {
    inputs: {
        pathA: DataTypes.Use<"path">;
        pathB: DataTypes.Use<"path">;
    };
    outputs: {
        output: DataTypes.Use<"path">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<PathJoinDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"pathJoin", PathJoinDefinition> => {
    return {
        id,
        in: {
            pathA: null,
            pathB: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
        },
        type: "pathJoin",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PathJoinDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"pathA"}>
                Path A
            </SocketIn>
            <SocketIn node={node} socketId={"pathB"}>
                Path B
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<PathJoinDefinition>, outSocket: keyof PathJoinDefinition["outputs"], _deps: AllDeps): (keyof PathJoinDefinition["inputs"])[] => {
    return ["pathA", "pathB"];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PathJoinDefinition>, inSocket: keyof PathJoinDefinition["inputs"], _deps: AllDeps): (keyof PathJoinDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<PathJoinDefinition>, socket: keyof PathJoinDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    // Join keeps both paths intact, so a single connected path is a valid result on its own.
    const pathAData = context.resolve<"path">(node.id, "pathA")?.data ?? null;
    const pathBData = context.resolve<"path">(node.id, "pathB")?.data ?? null;

    return PaperHelper.join([pathAData, pathBData]);
};

const SOCKETTYPES_IN: { [key in keyof Required<PathJoinDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    pathA: { types: ["path"], mode: "or" },
    pathB: { types: ["path"], mode: "or" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<PathJoinDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["path"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<PathJoinDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const PathJoinNodeType: NodeTypes.Type<"pathJoin", PathJoinDefinition> = {
    type: "pathJoin",
    displayName: "Path Join",
    defaultLabel: "Path Join",
    iconNode: <NodeIcon shape={NODE_ICONS.pathJoin} />,
    flavour: "help",
    category: "Modifiers",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
    canInterject: passthroughCanInterject(SOCKETTYPES_IN.pathA, SOCKETTYPES_OUT.output),
    onInterject: passthroughInterject("pathA", "output"),
};
