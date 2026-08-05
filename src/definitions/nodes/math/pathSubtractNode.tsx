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

export type PathSubtractDefinition = {
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

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<PathSubtractDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"pathSubtract", PathSubtractDefinition> => {
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
        type: "pathSubtract",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PathSubtractDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PathSubtractDefinition>>) => {
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

const dependsOn = (_node: NodeDefinitions.NodeFor<PathSubtractDefinition>, outSocket: keyof PathSubtractDefinition["outputs"], _deps: AllDeps): (keyof PathSubtractDefinition["inputs"])[] => {
    return ["pathA", "pathB", "swap"];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PathSubtractDefinition>, inSocket: keyof PathSubtractDefinition["inputs"], _deps: AllDeps): (keyof PathSubtractDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<PathSubtractDefinition>, socket: keyof PathSubtractDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const pathAData = context.resolve<"path">(node.id, "pathA")?.data;
    if (!pathAData) return null;

    const pathBData = context.resolve<"path">(node.id, "pathB")?.data;
    if (!pathBData) return null;

    const swap = context.resolve<"boolean">(node.id, "swap")?.data ?? node.payload.swap;
    return swap ? PaperHelper.subtract(pathBData, pathAData) : PaperHelper.subtract(pathAData, pathBData);
};

const SOCKETTYPES_IN: { [key in keyof Required<PathSubtractDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    pathA: { types: ["path"], mode: "or" },
    pathB: { types: ["path"], mode: "or" },
    swap: { types: ["boolean"], mode: "or" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<PathSubtractDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["path"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<PathSubtractDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const PathSubtractNodeType: NodeTypes.Type<"pathSubtract", PathSubtractDefinition> = {
    type: "pathSubtract",
    displayName: "Path Subtract",
    defaultLabel: "Path Subtract",
    iconNode: <NodeIcon shape={NODE_ICONS.pathSubtract} />,
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
