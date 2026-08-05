import { nanoid } from "nanoid";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { ReactNode, useCallback } from "react";
import { TypicalNode } from "../../../features/nodeview/node";
import { SocketOut, SocketIn } from "../../../features/nodeview/slots";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { PaperHelper } from "../../../util/paperHelper";
import { makeCanInterject, makeOnInterject } from "./numericMath";

export type PathDivideDefinition = {
    inputs: {
        pathA: DataTypes.Use<"path">;
        pathB: DataTypes.Use<"path">;
        swap: DataTypes.Use<"boolean">;
    };
    outputs: {
        output: DataTypes.Use<"path">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        swap: boolean;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<PathDivideDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"pathDivide", PathDivideDefinition> => {
    return {
        id,
        in: {
            pathA: null,
            pathB: null,
            swap: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            swap: false,
        },
        type: "pathDivide",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PathDivideDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PathDivideDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

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
            <SocketIn node={node} socketId={"swap"}>
                <CheckBox checked={node.payload.swap} onToggle={(swap) => handleUpdate({ swap })} disabled={node.in.swap !== null}>
                    Swap
                </CheckBox>
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<PathDivideDefinition>, outSocket: keyof PathDivideDefinition["outputs"], _deps: AllDeps): (keyof PathDivideDefinition["inputs"])[] => {
    return ["pathA", "pathB", "swap"];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PathDivideDefinition>, inSocket: keyof PathDivideDefinition["inputs"], _deps: AllDeps): (keyof PathDivideDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<PathDivideDefinition>, socket: keyof PathDivideDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const pathAData = context.resolve<"path">(node.id, "pathA")?.data;
    if (!pathAData) return null;

    const pathBData = context.resolve<"path">(node.id, "pathB")?.data;
    if (!pathBData) return null;

    const swap = context.resolve<"boolean">(node.id, "swap")?.data ?? node.payload.swap;
    return swap ? PaperHelper.divide(pathBData, pathAData) : PaperHelper.divide(pathAData, pathBData);
};

const SOCKETTYPES_IN: { [key in keyof Required<PathDivideDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    pathA: { types: ["path"], mode: "or" },
    pathB: { types: ["path"], mode: "or" },
    swap: { types: ["boolean"], mode: "or" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<PathDivideDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["path"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<PathDivideDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const PathDivideNodeType: NodeTypes.Type<"pathDivide", PathDivideDefinition> = {
    type: "pathDivide",
    displayName: "Path Divide",
    defaultLabel: "Path Divide",
    iconNode: <NodeIcon shape={NODE_ICONS.pathDivide} />,
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
