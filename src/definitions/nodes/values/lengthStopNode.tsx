import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, SocketPair } from "../../../features/nodeview/slots";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { NumericString } from "../../datatypes/numericString";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { EmptyOr } from "../../../util/misc";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { value: "length", position: "float", enabled: "boolean" },
    out: { output: "stop:length" },
});

export type LengthStopBreakoutDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        value: DataTypes.TypeOf<DataTypes.Length>;
        position: EmptyOr<NumericString.Type>;
        enabled: boolean;
    }
>;

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
            <SocketPair node={node} socketInId={"value"} socketOutId={"output"} label={"Value"}>
                <LengthInput value={node.payload.value} onCommit={(value) => handleUpdate({ value })} disabled={node.in.value !== null} />
            </SocketPair>

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
    _node: NodeDefinitions.NodeFor<LengthStopBreakoutDefinition>,
    outSocket: keyof LengthStopBreakoutDefinition["outputs"],
    _deps: AllDeps,
): (keyof LengthStopBreakoutDefinition["inputs"])[] => {
    if (outSocket === "output") {
        return ["value", "position", "enabled"];
    }
    return [];
};

const contributesTo = (
    _node: NodeDefinitions.NodeFor<LengthStopBreakoutDefinition>,
    inSocket: keyof LengthStopBreakoutDefinition["inputs"],
    _deps: AllDeps,
): (keyof LengthStopBreakoutDefinition["outputs"])[] => {
    if (inSocket === "value" || inSocket === "position" || inSocket === "enabled") {
        return ["output"];
    }
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<LengthStopBreakoutDefinition>, socket: keyof LengthStopBreakoutDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") {
        return null;
    }
    const valStr = context.resolve<DataTypes.Length>(node.id, "value")?.data ?? node.payload.value;
    const posStr = context.resolve<DataTypes.Float>(node.id, "position")?.data ?? node.payload.position;
    const enabled = context.resolve<DataTypes.Boolean>(node.id, "enabled")?.data ?? node.payload.enabled;
    return {
        kind: "stop:length",
        data: {
            value: valStr === "" ? null : valStr,
            position: NumericString.Emptyable.asNumber(posStr),
            enabled,
        },
    };
};

export const LengthStopNodeType: NodeTypes.Type<"lengthStop", LengthStopBreakoutDefinition> = {
    type: "lengthStop",
    displayName: "Length Stop",
    defaultLabel: "Length Stop",
    iconNode: <NodeIcon shape={NODE_ICONS.length} modifierIcon={NODE_ICONS.modifiers.stopOf} />,
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
