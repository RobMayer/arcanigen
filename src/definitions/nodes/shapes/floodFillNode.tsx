import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Color } from "../../datatypes/color";
import { ColorHexInput } from "../../../components/inputs/ColorHexInput";

export type FloodFillDefinition = {
    inputs: {
        fillColor: DataTypes.Use<"color">;
    };
    outputs: {
        output: DataTypes.Use<"shape">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        fillColor: DataTypes.TypeOf<DataTypes.Use<"color">>;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<FloodFillDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"floodFill", FloodFillDefinition> => {
    return {
        id,
        in: {
            fillColor: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            fillColor: { r: 1, g: 1, b: 1, a: 1 },
        },
        type: "floodFill",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<FloodFillDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<FloodFillDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"fillColor"} label={"Color"}>
                <ColorHexInput value={node.payload.fillColor} onCommit={(fillColor) => handleUpdate({ fillColor })} disabled={node.in.fillColor !== null} nullable alpha />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<FloodFillDefinition>, _outSocket: keyof FloodFillDefinition["outputs"], _deps: AllDeps): (keyof FloodFillDefinition["inputs"])[] => {
    return ["fillColor"];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<FloodFillDefinition>, _inSocket: keyof FloodFillDefinition["inputs"], _deps: AllDeps): (keyof FloodFillDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<FloodFillDefinition>, socket: keyof FloodFillDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const fillColor = context.resolve<"color">(node.id, "fillColor")?.data ?? node.payload.fillColor;

        if (fillColor === null) {
            return null;
        }

        return {
            kind: "shape",
            data: {
                type: "rect",
                x: "-5000%",
                y: "-5000%",
                width: "10000%",
                height: "10000%",
                paint: { fill: Color.toHex(fillColor) },
                transform: "",
                preview: { x: 0, y: 0, w: 100, h: 100 },
            },
        };
    }

    return null;
};

const SOCKETTYPES_IN: { [key in keyof Required<FloodFillDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    fillColor: { types: ["color"], mode: "or" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<FloodFillDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["shape"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<FloodFillDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const FloodFillNodeType: NodeTypes.Type<"floodFill", FloodFillDefinition> = {
    type: "floodFill",
    displayName: "Flood Fill",
    defaultLabel: "Flood Fill",
    iconNode: <Icon shape={NODE_ICONS.flood} color={"var(--icon-flavour)"} />,
    category: "Shapes",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
