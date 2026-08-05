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
import { Angle } from "../../datatypes/angle";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { EmptyOr } from "../../../util/misc";

export type AngleStopBreakoutDefinition = {
    inputs: {
        value: DataTypes.Use<"angle">;
        position: DataTypes.Use<"float">;
        enabled: DataTypes.Use<"boolean">;
    };
    outputs: {
        output: DataTypes.Use<"stop<angle>">;
    };
    payload: {
        label: string;
        value: EmptyOr<Angle.Type>;
        position: EmptyOr<NumericString.Type>;
        enabled: boolean;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<AngleStopBreakoutDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"angleStop", AngleStopBreakoutDefinition> => {
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
            value: input.value ?? "0",
            position: input.position ?? "50",
            enabled: input.enabled ?? true,
        },
        type: "angleStop",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<AngleStopBreakoutDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<AngleStopBreakoutDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Stop
            </SocketOut>
            <SocketIn node={node} socketId={"value"} label={"Angle"}>
                <AngleInput.SliderInput value={node.payload.value} onCommit={(value) => handleUpdate({ value })} disabled={node.in.value !== null} unbound />
            </SocketIn>
            <SocketIn node={node} socketId={"position"} label={"Position"}>
                <DecimalInput value={node.payload.position} onCommit={(position) => handleUpdate({ position })} disabled={node.in.position !== null} min={"0"} max={"100"} />
            </SocketIn>
            <SocketIn node={node} socketId={"enabled"}>
                <CheckBox checked={node.payload.enabled} onToggle={(enabled) => handleUpdate({ enabled })} disabled={node.in.enabled !== null}>
                    Enabled
                </CheckBox>
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<AngleStopBreakoutDefinition>, outSocket: keyof AngleStopBreakoutDefinition["outputs"], _deps: AllDeps): (keyof AngleStopBreakoutDefinition["inputs"])[] => {
    if (outSocket === "output") {
        return ["value", "position", "enabled"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<AngleStopBreakoutDefinition>, inSocket: keyof AngleStopBreakoutDefinition["inputs"], _deps: AllDeps): (keyof AngleStopBreakoutDefinition["outputs"])[] => {
    if (inSocket === "value" || inSocket === "position" || inSocket === "enabled") {
        return ["output"];
    }
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<AngleStopBreakoutDefinition>, socket: keyof AngleStopBreakoutDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") {
        return null;
    }
    const valStr = context.resolve<"angle">(node.id, "value")?.data ?? node.payload.value;
    const posStr = context.resolve<"float">(node.id, "position")?.data ?? node.payload.position;
    const enabled = context.resolve<"boolean">(node.id, "enabled")?.data ?? node.payload.enabled;
    return {
        kind: "stop<angle>",
        data: {
            value: NumericString.Emptyable.asNumber(valStr),
            position: NumericString.Emptyable.asNumber(posStr),
            enabled,
        },
    };
};

const SOCKETTYPES_IN: { [key in keyof Required<AngleStopBreakoutDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    value: { types: ["angle"], mode: "and" },
    position: { types: ["float"], mode: "and" },
    enabled: { types: ["boolean"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<AngleStopBreakoutDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    if (side === "out") {
        return { types: ["stop<angle>"], mode: "and" };
    }
    return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
};

export const AngleStopNodeType: NodeTypes.Type<"angleStop", AngleStopBreakoutDefinition> = {
    type: "angleStop",
    displayName: "Angle Stop",
    defaultLabel: "Angle Stop",
    iconNode: <Icon shape={NODE_ICONS.angle} color={"var(--icon-flavour)"} cutout={"scoop"} layer={NODE_ICONS.modifiers.stopOf} layerColor="#fff" />,
    category: "Collections",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
