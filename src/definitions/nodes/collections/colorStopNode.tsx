import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { NumericString } from "../../datatypes/numericString";
import { Color } from "../../datatypes/color";
import { ColorHexInput } from "../../../components/inputs/ColorHexInput";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { EmptyOr } from "../../../util/misc";

export type ColorStopBreakoutDefinition = {
    inputs: {
        value: DataTypes.Use<"color">;
        position: DataTypes.Use<"float">;
        enabled: DataTypes.Use<"boolean">;
    };
    outputs: {
        output: DataTypes.Use<"stop<color>">;
    };
    payload: {
        label: string;
        value: Color.Type;
        position: EmptyOr<NumericString.Type>;
        enabled: boolean;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<ColorStopBreakoutDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"colorStop", ColorStopBreakoutDefinition> => {
    return {
        id,
        in: {
            value: null,
            position: null,
            enabled: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            value: input.value ?? { r: 0.5, g: 0.5, b: 0.5, a: 1 },
            position: input.position ?? "50",
            enabled: input.enabled ?? true,
        },
        type: "colorStop",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ColorStopBreakoutDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ColorStopBreakoutDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Stop
            </SocketOut>
            <SocketIn node={node} socketId={"value"} label={"Color"}>
                <ColorHexInput value={node.payload.value} onCommit={(value) => handleUpdate({ value })} disabled={node.in.value !== null} alpha />
            </SocketIn>
            <SocketIn node={node} socketId={"enabled"}>
                <CheckBox checked={node.payload.enabled} onToggle={(enabled) => handleUpdate({ enabled })} disabled={node.in.enabled !== null}>
                    Enabled
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"position"} label={"Position"}>
                <DecimalInput value={node.payload.position} onCommit={(position) => handleUpdate({ position })} disabled={node.in.position !== null} min={"0"} max={"100"} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<ColorStopBreakoutDefinition>, outSocket: keyof ColorStopBreakoutDefinition["outputs"], _deps: AllDeps): (keyof ColorStopBreakoutDefinition["inputs"])[] => {
    if (outSocket === "output") {
        return ["value", "position", "enabled"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ColorStopBreakoutDefinition>, inSocket: keyof ColorStopBreakoutDefinition["inputs"], _deps: AllDeps): (keyof ColorStopBreakoutDefinition["outputs"])[] => {
    if (inSocket === "value" || inSocket === "position" || inSocket === "enabled") {
        return ["output"];
    }
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<ColorStopBreakoutDefinition>, socket: keyof ColorStopBreakoutDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") {
        return null;
    }
    const value = context.resolve<"color">(node.id, "value")?.data ?? node.payload.value;
    const posStr = context.resolve<"float">(node.id, "position")?.data ?? node.payload.position;
    const enabled = context.resolve<"boolean">(node.id, "enabled")?.data ?? node.payload.enabled;
    return {
        kind: "stop<color>",
        data: {
            value,
            position: NumericString.Emptyable.asNumber(posStr),
            enabled,
        },
    };
};

const SOCKETTYPES_IN: { [key in keyof Required<ColorStopBreakoutDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    value: { types: ["color"], mode: "and" },
    position: { types: ["float"], mode: "and" },
    enabled: { types: ["boolean"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<ColorStopBreakoutDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    if (side === "out") {
        return { types: ["stop<color>"], mode: "and" };
    }
    return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
};

export const ColorStopNodeType: NodeTypes.Type<"colorStop", ColorStopBreakoutDefinition> = {
    type: "colorStop",
    displayName: "Color Stop",
    defaultLabel: "Color Stop",
    iconNode: <Icon shape={NODE_ICONS.color} color={"var(--icon-flavour)"} cutout={"scoop"} layer={NODE_ICONS.modifiers.stopOf} layerColor="#fff" />,
    category: "Collections",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
