import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../components/Icon";
import { Resolver } from "../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../features/nodeview/node";
import { NodeAccordion, SocketIn } from "../../features/nodeview/slots";
import { LengthInput } from "../../components/inputs/LengthInput";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../betterTypes";
import { Project } from "../../state/project";
import { ColorHexInput } from "../../components/inputs/ColorHexInput";

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
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        w: DataTypes.TypeOf<DataTypes.Use<"length">>;
        h: DataTypes.TypeOf<DataTypes.Use<"length">>;
        x: DataTypes.TypeOf<DataTypes.Use<"length">>;
        y: DataTypes.TypeOf<DataTypes.Use<"length">>;
        color: DataTypes.TypeOf<DataTypes.Use<"color">>;
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
            color: { r: 1, g: 1, b: 1, a: 1 },
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
            <SocketIn node={node} socketId={"input"}>
                Input
            </SocketIn>
            <NodeAccordion socketsIn={"w|h|x|y|color"} label={"Canvas"} nodeId={node.id}>
                <SocketIn node={node} socketId={"w"} label={"Canvas Width"}>
                    <LengthInput value={node.payload.w} onCommit={(w) => handleUpdate({ w })} disabled={node.in.w !== null} required min={"0px"} />
                </SocketIn>
                <SocketIn node={node} socketId={"h"} label={"Canvas Height"}>
                    <LengthInput value={node.payload.h} onCommit={(h) => handleUpdate({ h })} disabled={node.in.h !== null} required min={"0px"} />
                </SocketIn>
                <SocketIn node={node} socketId={"x"} label={"Origin X"}>
                    <LengthInput value={node.payload.x} onCommit={(x) => handleUpdate({ x })} disabled={node.in.x !== null} required min={"0px"} />
                </SocketIn>
                <SocketIn node={node} socketId={"y"} label={"Origin Y"}>
                    <LengthInput value={node.payload.y} onCommit={(y) => handleUpdate({ y })} disabled={node.in.y !== null} required min={"0px"} />
                </SocketIn>
                <SocketIn node={node} socketId={"color"} label={"Color"}>
                    <ColorHexInput value={node.payload.color} onCommit={(color) => handleUpdate({ color })} nullable alpha disabled={node.in.color !== null} />
                </SocketIn>
            </NodeAccordion>
        </TypicalNode>
    );
};

const dependsOn = <K extends string | number | symbol>(_node: NodeDefinitions.NodeFor<ResultDefinition>, _outSocket: K, _deps: AllDeps): (keyof ResultDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ResultDefinition>, _inSocket: keyof ResultDefinition["inputs"], _deps: AllDeps): (keyof ResultDefinition["outputs"])[] => {
    return [];
};
const evaluate = (node: NodeDefinitions.NodeFor<ResultDefinition>, socket: string | number | symbol, context: Resolver.Context): DataTypes.AnyEval | null => {
    // this should never be reached.
    return null;
};

const SOCKETTYPES_IN: { [key in keyof Required<ResultDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    input: { types: ["shape"], mode: "or" },
    w: { types: ["length"], mode: "or" },
    h: { types: ["length"], mode: "or" },
    x: { types: ["length"], mode: "or" },
    y: { types: ["length"], mode: "or" },
    color: { types: ["color"], mode: "or" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<ResultDefinition>, socketId: string, _side: "in" | "out"): SocketTypes.SocketRule => {
    return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
};

export const ResultNodeType: NodeTypes.Type<"result", ResultDefinition> = {
    type: "result",
    displayName: "Result",
    defaultLabel: "Result",
    iconNode: <Icon shape={NODE_ICONS.result.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.result.Card} color={"var(--icon-flavour)"} />,
    category: "Result",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
