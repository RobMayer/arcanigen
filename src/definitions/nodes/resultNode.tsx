import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { BuiltNodeOf, NodeType } from "./abstractNode";
import { nanoid } from "nanoid";
import { DataType, DataTypes } from "../datatypes";
import { ICONS } from "../../components/Icon";
import { Resolver } from "../../util/resolver";
import { ReactNode, useCallback } from "react";
import { Project } from "../../state/project";
import { TypicalNode } from "../../features/nodeview/node";
import { NodeAccordion, SocketIn } from "../../features/nodeview/slots";
import LengthInput from "../../components/inputs/LengthInput";
import ColorHexInput from "../../components/inputs/ColorHexInput";

export type ResultDefinition = {
    outputs: never;
    inputs: {
        input: DataType<"shape">;
        w: DataType<"length">;
        h: DataType<"length">;
        x: DataType<"length">;
        y: DataType<"length">;
        color: DataType<"color">;
    };
    payload: {
        label: DataType<"string">;
        w: DataType<"length">;
        h: DataType<"length">;
        x: DataType<"length">;
        y: DataType<"length">;
        color: DataType<"color">;
    };
};

const create = (input: Partial<DataTypes.PayloadFor<ResultDefinition>>, id: string = nanoid()): BuiltNodeOf<ResultDefinition> => {
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

const Controls = ({ node, methods }: { node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<ResultDefinition>>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<DataTypes.PayloadFor<ResultDefinition>>) => {
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
                    <LengthInput value={node.payload.h} onCommit={(x) => handleUpdate({ x })} disabled={node.in.x !== null} required min={"0px"} />
                </SocketIn>
                <SocketIn node={node} socketId={"y"} type={"length"} label={"Origin Y"}>
                    <LengthInput value={node.payload.h} onCommit={(y) => handleUpdate({ y })} disabled={node.in.y !== null} required min={"0px"} />
                </SocketIn>
                <SocketIn node={node} socketId={"color"} type={"color"} label={"Color"}>
                    <ColorHexInput value={node.payload.color} onCommit={(color) => handleUpdate({ color })} nullable alpha />
                </SocketIn>
            </NodeAccordion>
        </TypicalNode>
    );
};

const dependsOn = <K extends string | number | symbol>(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<ResultDefinition>>, outSocket: K): ("w" | "h" | "x" | "y" | "color")[] => {
    return [];
};
const evaluate = (node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<ResultDefinition>>, socket: string | number | symbol, context: Resolver.Context): DataTypes.AnyEvaluation | null => {
    // this should never be reached.
    return null;
};

export const ResultNodeType: NodeType<ResultDefinition> = {
    type: "result",
    displayName: "Result",
    defaultLabel: "Result",
    iconNode: ICONS.Bolt,
    iconCard: ICONS.Bolt,
    category: "result",
    create,
    dependsOn,
    evaluate,
    Controls,
};
