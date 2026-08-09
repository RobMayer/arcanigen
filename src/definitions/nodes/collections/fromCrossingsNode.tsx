import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { PaperHelper } from "../../../util/paperHelper";

export type FromCrossingsDefinition = {
    inputs: {
        path: DataTypes.Use<"path">;
    };
    outputs: {
        output: DataTypes.Use<"array<point>">;
        pointCount: DataTypes.Use<"integer">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<FromCrossingsDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"fromCrossings", FromCrossingsDefinition> => {
    return {
        id,
        in: {
            path: null,
        },
        out: {
            output: [],
            pointCount: [],
        },
        payload: {
            label: "",
        },
        type: "fromCrossings",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<FromCrossingsDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Points
            </SocketOut>
            <SocketIn node={node} socketId={"path"}>
                Path
            </SocketIn>
            <NodeAccordion label="Additional Options" nodeId={node.id} socketsOut="pointCount">
                <SocketOut node={node} socketId={"pointCount"}>
                    Point Count
                </SocketOut>
            </NodeAccordion>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<FromCrossingsDefinition>, outSocket: keyof FromCrossingsDefinition["outputs"], _deps: AllDeps): (keyof FromCrossingsDefinition["inputs"])[] => {
    if (outSocket === "output" || outSocket === "pointCount") {
        return ["path"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<FromCrossingsDefinition>, _inSocket: keyof FromCrossingsDefinition["inputs"], _deps: AllDeps): (keyof FromCrossingsDefinition["outputs"])[] => {
    return ["output", "pointCount"];
};

// The path's self-crossings, in world space. A single input path is intentional — combine multiple
// paths upstream with Path Join so crossings between them surface as self-crossings here.
const resolvePoints = (node: NodeDefinitions.NodeFor<FromCrossingsDefinition>, context: Resolver.Context): { x: number; y: number }[] => {
    const pathData = context.resolve<"path">(node.id, "path")?.data ?? null;
    if (!pathData) return [];
    return PaperHelper.crossings(pathData) ?? [];
};

const evaluate = (node: NodeDefinitions.NodeFor<FromCrossingsDefinition>, socket: keyof FromCrossingsDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "pointCount") {
        return { kind: "integer", data: `${resolvePoints(node, context).length}` };
    }
    if (socket === "output") {
        return { kind: "array<point>", data: resolvePoints(node, context) };
    }
    return null;
};

const SOCKETTYPES_IN: { [key in keyof Required<FromCrossingsDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    path: { types: ["path"], mode: "or" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<FromCrossingsDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["array<point>"], mode: "and" },
    pointCount: { types: ["integer"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<FromCrossingsDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const FromCrossingsNodeType: NodeTypes.Type<"fromCrossings", FromCrossingsDefinition> = {
    type: "fromCrossings",
    displayName: "From Crossings",
    defaultLabel: "From Crossings",
    iconNode: <NodeIcon shape={NODE_ICONS.point} modifierIcon={NODE_ICONS.modifiers.arrayOf} />,
    flavour: "accent",
    category: "Values",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
