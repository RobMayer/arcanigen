import { nanoid } from "nanoid";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { ReactNode } from "react";
import { TypicalNode } from "../../../features/nodeview/node";
import { SocketOut, SocketIn } from "../../../features/nodeview/slots";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { PaperHelper } from "../../../util/paperHelper";
import { makeCanInterject, makeOnInterject } from "./numericMath";

export type PathExcludeDefinition = {
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

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<PathExcludeDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"pathExclude", PathExcludeDefinition> => {
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
        type: "pathExclude",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PathExcludeDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
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

const dependsOn = (_node: NodeDefinitions.NodeFor<PathExcludeDefinition>, outSocket: keyof PathExcludeDefinition["outputs"], _deps: AllDeps): (keyof PathExcludeDefinition["inputs"])[] => {
    return ["pathA", "pathB"];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PathExcludeDefinition>, inSocket: keyof PathExcludeDefinition["inputs"], _deps: AllDeps): (keyof PathExcludeDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<PathExcludeDefinition>, socket: keyof PathExcludeDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const pathAData = context.resolve<"path">(node.id, "pathA")?.data;
    if (!pathAData) return null;

    const pathBData = context.resolve<"path">(node.id, "pathB")?.data;
    if (!pathBData) return null;

    return PaperHelper.exclude(pathAData, pathBData);
};

const SOCKETTYPES_IN: { [key in keyof Required<PathExcludeDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    pathA: { types: ["path"], mode: "or" },
    pathB: { types: ["path"], mode: "or" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<PathExcludeDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["path"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<PathExcludeDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const PathExcludeNodeType: NodeTypes.Type<"pathExclude", PathExcludeDefinition> = {
    type: "pathExclude",
    displayName: "Path Exclude",
    defaultLabel: "Path Exclude",
    iconNode: <Icon shape={NODE_ICONS.pathExclude} color={"var(--icon-flavour)"} />,
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
