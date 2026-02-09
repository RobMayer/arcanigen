import { nanoid } from "nanoid";
import { NODE_ICONS } from "../../components/Icon";
import { Resolver } from "../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../features/nodeview/node";
import { NodeAccordion, SocketIn } from "../../features/nodeview/slots";
import LengthInput from "../../components/inputs/LengthInput";
import { ColorHexInput } from "../../components/inputs/ColorHexInput";
import { DataTypes, NodeDefinitions, NodeTypes } from "../betterTypes";
import { Project } from "../../state/project";

export type ResultDefinition = {
    outputs: never;
    inputs: {
        input: DataTypes.Use<"shape">;
        w: DataTypes.Use<"length">;
        h: DataTypes.Use<"length">;
        x: DataTypes.Use<"length">;
        y: DataTypes.Use<"length">;
        color: DataTypes.Use<"color">;
    };
    payload: {
        label: DataTypes.Use<"string">;
        w: DataTypes.Use<"length">;
        h: DataTypes.Use<"length">;
        x: DataTypes.Use<"length">;
        y: DataTypes.Use<"length">;
        color: DataTypes.Use<"color">;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<ResultDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"result", ResultDefinition> => {
    return {
        in: {
            input: null,
            w: null,
            h: null,
            x: null,
            y: null,
            color: null,
        },
        out: {},
        payload: {
            w: `800px`,
            h: `800px`,
            x: `0px`,
            y: `0px`,
            color: "#ffffffff",
            label: "",
            ...input,
        },
        type: "result",
        id,
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ResultDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ResultDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketIn node={node} socketId={"input"} type={"shape"}>
                Input
            </SocketIn>
            <NodeAccordion socketsIn={"w|h|x|y|color"} label={"Canvas"} nodeId={node.id}>
                <SocketIn node={node} socketId={"w"} type={"length"} label={"Canvas Width"}>
                    <LengthInput value={node.payload.w} onCommit={(w) => handleUpdate({ w })} disabled={node.in.w !== null} required min={"0px"} />
                </SocketIn>
                <SocketIn node={node} socketId={"h"} type={"length"} label={"Canvas Height"}>
                    <LengthInput value={node.payload.h} onCommit={(h) => handleUpdate({ h })} disabled={node.in.h !== null} required min={"0px"} />
                </SocketIn>
                <SocketIn node={node} socketId={"x"} type={"length"} label={"Origin X"}>
                    <LengthInput value={node.payload.x} onCommit={(x) => handleUpdate({ x })} disabled={node.in.x !== null} required min={"0px"} />
                </SocketIn>
                <SocketIn node={node} socketId={"y"} type={"length"} label={"Origin Y"}>
                    <LengthInput value={node.payload.y} onCommit={(y) => handleUpdate({ y })} disabled={node.in.y !== null} required min={"0px"} />
                </SocketIn>
                <SocketIn node={node} socketId={"color"} type={"color"} label={"Color"}>
                    <ColorHexInput value={node.payload.color} onCommit={(color) => handleUpdate({ color })} nullable alpha disabled={node.in.color !== null} />
                </SocketIn>
            </NodeAccordion>
        </TypicalNode>
    );
};

const dependsOn = <K extends string | number | symbol>(node: NodeDefinitions.NodeFor<ResultDefinition>, outSocket: K): ("w" | "h" | "x" | "y" | "color")[] => {
    return [];
};
const evaluate = (node: NodeDefinitions.NodeFor<ResultDefinition>, socket: string | number | symbol, context: Resolver.Context): DataTypes.AnyEval | null => {
    // this should never be reached.
    return null;
};

export const ResultNodeType: NodeTypes.Type<"result", ResultDefinition> = {
    type: "result",
    displayName: "Result",
    defaultLabel: "Result",
    iconNode: NODE_ICONS.result.Item,
    iconCard: NODE_ICONS.result.Card,
    category: "result",
    create,
    dependsOn,
    evaluate,
    Controls,
};
