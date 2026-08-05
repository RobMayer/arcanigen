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
import { LengthInput } from "../../../components/inputs/LengthInput";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { EmptyOr } from "../../../util/misc";

export type LengthStopBreakoutDefinition = {
    inputs: {
        value: DataTypes.Use<"length">;
        position: DataTypes.Use<"float">;
        enabled: DataTypes.Use<"boolean">;
    };
    outputs: {
        output: DataTypes.Use<"stop<length>">;
    };
    payload: {
        label: string;
        value: DataTypes.TypeOf<DataTypes.Use<"length">>;
        position: EmptyOr<NumericString.Type>;
        enabled: boolean;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<LengthStopBreakoutDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"lengthStop", LengthStopBreakoutDefinition> => {
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
            value: input.value ?? "50px",
            position: input.position ?? "50",
            enabled: input.enabled ?? true,
        },
        type: "lengthStop",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<LengthStopBreakoutDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<LengthStopBreakoutDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Stop
            </SocketOut>
            <SocketIn node={node} socketId={"value"} label={"Length"}>
                <LengthInput value={node.payload.value} onCommit={(value) => handleUpdate({ value })} disabled={node.in.value !== null} />
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

const dependsOn = (_node: NodeDefinitions.NodeFor<LengthStopBreakoutDefinition>, outSocket: keyof LengthStopBreakoutDefinition["outputs"], _deps: AllDeps): (keyof LengthStopBreakoutDefinition["inputs"])[] => {
    if (outSocket === "output") {
        return ["value", "position", "enabled"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<LengthStopBreakoutDefinition>, inSocket: keyof LengthStopBreakoutDefinition["inputs"], _deps: AllDeps): (keyof LengthStopBreakoutDefinition["outputs"])[] => {
    if (inSocket === "value" || inSocket === "position" || inSocket === "enabled") {
        return ["output"];
    }
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<LengthStopBreakoutDefinition>, socket: keyof LengthStopBreakoutDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") {
        return null;
    }
    const valStr = context.resolve<"length">(node.id, "value")?.data ?? node.payload.value;
    const posStr = context.resolve<"float">(node.id, "position")?.data ?? node.payload.position;
    const enabled = context.resolve<"boolean">(node.id, "enabled")?.data ?? node.payload.enabled;
    return {
        kind: "stop<length>",
        data: {
            value: valStr === "" ? null : valStr,
            position: NumericString.Emptyable.asNumber(posStr),
            enabled,
        },
    };
};

const SOCKETTYPES_IN: { [key in keyof Required<LengthStopBreakoutDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    value: { types: ["length"], mode: "and" },
    position: { types: ["float"], mode: "and" },
    enabled: { types: ["boolean"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<LengthStopBreakoutDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    if (side === "out") {
        return { types: ["stop<length>"], mode: "and" };
    }
    return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
};

export const LengthStopNodeType: NodeTypes.Type<"lengthStop", LengthStopBreakoutDefinition> = {
    type: "lengthStop",
    displayName: "Length Stop",
    defaultLabel: "Length Stop",
    iconNode: <NodeIcon shape={NODE_ICONS.length} modifierIcon={NODE_ICONS.modifiers.stopOf} />,
    flavour: "danger",
    category: "Values",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
