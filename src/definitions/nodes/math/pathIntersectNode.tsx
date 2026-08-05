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

export type PathIntersectDefinition = {
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

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<PathIntersectDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"pathIntersect", PathIntersectDefinition> => {
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
        type: "pathIntersect",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PathIntersectDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
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

const dependsOn = (_node: NodeDefinitions.NodeFor<PathIntersectDefinition>, outSocket: keyof PathIntersectDefinition["outputs"], _deps: AllDeps): (keyof PathIntersectDefinition["inputs"])[] => {
    return ["pathA", "pathB"];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PathIntersectDefinition>, inSocket: keyof PathIntersectDefinition["inputs"], _deps: AllDeps): (keyof PathIntersectDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<PathIntersectDefinition>, socket: keyof PathIntersectDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const pathAData = context.resolve<"path">(node.id, "pathA")?.data;
    if (!pathAData) return null;

    const pathBData = context.resolve<"path">(node.id, "pathB")?.data;
    if (!pathBData) return null;

    return PaperHelper.intersect(pathAData, pathBData);
};

const SOCKETTYPES_IN: { [key in keyof Required<PathIntersectDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    pathA: { types: ["path"], mode: "or" },
    pathB: { types: ["path"], mode: "or" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<PathIntersectDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["path"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<PathIntersectDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const PathIntersectNodeType: NodeTypes.Type<"pathIntersect", PathIntersectDefinition> = {
    type: "pathIntersect",
    displayName: "Path Intersect",
    defaultLabel: "Path Intersect",
    iconNode: <NodeIcon shape={NODE_ICONS.pathIntersect} />,
    category: "Math",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
    canInterject: makeCanInterject(SOCKETTYPES_IN.pathA, SOCKETTYPES_OUT.output),
    onInterject: makeOnInterject("pathA", "output"),
};
