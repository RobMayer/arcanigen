import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { NumericString } from "../../datatypes/numericString";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { EmptyOr } from "../../../util/misc";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { value: "float", position: "float", enabled: "boolean" },
    out: { output: "stop:float" },
});

export type StopFloatBreakoutDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        value: EmptyOr<NumericString.Type>;
        position: EmptyOr<NumericString.Type>;
        enabled: boolean;
    }
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<StopFloatBreakoutDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"floatStop", StopFloatBreakoutDefinition> => {
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
        type: "floatStop",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<StopFloatBreakoutDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<StopFloatBreakoutDefinition>>) => {
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
                <DecimalInput value={node.payload.value} onCommit={(value) => handleUpdate({ value })} disabled={node.in.value !== null} />
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

const dependsOn = (
    _node: NodeDefinitions.NodeFor<StopFloatBreakoutDefinition>,
    outSocket: keyof StopFloatBreakoutDefinition["outputs"],
    _deps: AllDeps,
): (keyof StopFloatBreakoutDefinition["inputs"])[] => {
    if (outSocket === "output") {
        return ["value", "position", "enabled"];
    }
    return [];
};

const contributesTo = (
    _node: NodeDefinitions.NodeFor<StopFloatBreakoutDefinition>,
    inSocket: keyof StopFloatBreakoutDefinition["inputs"],
    _deps: AllDeps,
): (keyof StopFloatBreakoutDefinition["outputs"])[] => {
    if (inSocket === "value" || inSocket === "position" || inSocket === "enabled") {
        return ["output"];
    }
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<StopFloatBreakoutDefinition>, socket: keyof StopFloatBreakoutDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") {
        return null;
    }
    const valStr = context.resolve<DataTypes.Float>(node.id, "value")?.data ?? node.payload.value;
    const posStr = context.resolve<DataTypes.Float>(node.id, "position")?.data ?? node.payload.position;
    const enabled = context.resolve<DataTypes.Boolean>(node.id, "enabled")?.data ?? node.payload.enabled;
    return {
        kind: "stop:float",
        data: {
            value: NumericString.Emptyable.asNumber(valStr),
            position: NumericString.Emptyable.asNumber(posStr),
            enabled,
        },
    };
};

export const FloatStopNodeType: NodeTypes.Type<"floatStop", StopFloatBreakoutDefinition> = {
    type: "floatStop",
    displayName: "Float Stop",
    defaultLabel: "Float Stop",
    iconNode: <NodeIcon shape={NODE_ICONS.num} modifierIcon={NODE_ICONS.modifiers.stopOf} />,
    flavour: "accent",
    category: "Values",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
