import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { NumericString } from "../../datatypes/numericString";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { EmptyOr } from "../../../util/misc";

export type IntegerStopBreakoutDefinition = {
    inputs: {
        value: DataTypes.Use<"integer">;
        position: DataTypes.Use<"float">;
        enabled: DataTypes.Use<"boolean">;
    };
    outputs: {
        output: DataTypes.Use<"stop<integer>">;
    };
    payload: {
        label: string;
        value: EmptyOr<NumericString.Type>;
        position: EmptyOr<NumericString.Type>;
        enabled: boolean;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<IntegerStopBreakoutDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"integerStop", IntegerStopBreakoutDefinition> => {
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
        type: "integerStop",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<IntegerStopBreakoutDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<IntegerStopBreakoutDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Stop
            </SocketOut>
            <SocketIn node={node} socketId={"value"} label={"Value"}>
                <IntegerInput value={node.payload.value} onCommit={(value) => handleUpdate({ value })} disabled={node.in.value !== null} />
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

const dependsOn = (_node: NodeDefinitions.NodeFor<IntegerStopBreakoutDefinition>, outSocket: keyof IntegerStopBreakoutDefinition["outputs"], _deps: AllDeps): (keyof IntegerStopBreakoutDefinition["inputs"])[] => {
    if (outSocket === "output") {
        return ["value", "position", "enabled"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<IntegerStopBreakoutDefinition>, inSocket: keyof IntegerStopBreakoutDefinition["inputs"], _deps: AllDeps): (keyof IntegerStopBreakoutDefinition["outputs"])[] => {
    if (inSocket === "value" || inSocket === "position" || inSocket === "enabled") {
        return ["output"];
    }
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<IntegerStopBreakoutDefinition>, socket: keyof IntegerStopBreakoutDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") {
        return null;
    }
    const valStr = context.resolve<"integer">(node.id, "value")?.data ?? node.payload.value;
    const posStr = context.resolve<"float">(node.id, "position")?.data ?? node.payload.position;
    const enabled = context.resolve<"boolean">(node.id, "enabled")?.data ?? node.payload.enabled;
    const value = NumericString.Emptyable.asNumber(valStr);
    return {
        kind: "stop<integer>",
        data: {
            value: value === null ? null : Math.round(value),
            position: NumericString.Emptyable.asNumber(posStr),
            enabled,
        },
    };
};

const SOCKETTYPES_IN: { [key in keyof Required<IntegerStopBreakoutDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    value: { types: ["integer"], mode: "and" },
    position: { types: ["float"], mode: "and" },
    enabled: { types: ["boolean"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<IntegerStopBreakoutDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    if (side === "out") {
        return { types: ["stop<integer>"], mode: "and" };
    }
    return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
};

export const IntegerStopNodeType: NodeTypes.Type<"integerStop", IntegerStopBreakoutDefinition> = {
    type: "integerStop",
    displayName: "Integer Stop",
    defaultLabel: "Integer Stop",
    iconNode: <NodeIcon shape={NODE_ICONS.num} modifierIcon={NODE_ICONS.modifiers.stopOf} />,
    category: "Collections",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
