import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut, SocketPair } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { SocketTypes } from "../../socketTypes";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { Length } from "../../datatypes/length";
import { Enum } from "../../datatypes/enum";
import { extractSingle } from "../../helpers/mathHelper";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const UNIT_OPTIONS = Enum.options(Enum.Common.lengthUnit);
const UNIT_FROM_ENUM: Length.Unit[] = ["px", "pt", "in", "mm", "cm"];

const def = signature({
    in: { value: $.oneOf("float", "integer", "length"), unit: "enum" },
    out: { output: "length" },
});

export type LengthDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        value: DataTypes.TypeOf<DataTypes.Length>;
        castUnit: number;
    }
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<LengthDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"length", LengthDefinition> => {
    return {
        id,
        in: {
            value: null,
            unit: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            value: input.value ?? "0px",
            castUnit: input.castUnit ?? Enum.Common.lengthUnit.PX.value,
        },
        type: "length",
    };
};

const resolveCastUnit = (node: NodeDefinitions.NodeFor<LengthDefinition>, context: Resolver.Context): Length.Unit => {
    const unitVal = context.resolve(node.id, "unit");
    const unitData = unitVal ? (unitVal.kind === "integer" ? Number(unitVal.data) : (unitVal.data as number)) : undefined;
    const idx = Enum.resolve(unitData, Enum.Common.lengthUnit) ?? node.payload.castUnit;
    return UNIT_FROM_ENUM[idx] ?? "px";
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<LengthDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<LengthDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    // Cast badge: derived LIVE from what the upstream socket is sending into `value` (no persisted state).
    const inbound = Project.useInboundType(useGraphId(), node, "value");
    const inboundKind = inbound ? (SocketTypes.project(inbound)[0] ?? "") : "";
    const isCasting = inboundKind !== "" && inboundKind !== "length";

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketPair node={node} socketInId={"value"} socketOutId={"output"} label={"Value"}>
                <LengthInput value={node.payload.value} onCommit={(value) => handleUpdate({ value })} disabled={node.in.value !== null} />
            </SocketPair>
            <NodeAccordion label={"Conversion"} nodeId={node.id}>
                <SocketIn node={node} socketId={"unit"} label={"Unit"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.castUnit}`}
                        options={UNIT_OPTIONS}
                        onValue={(v) => handleUpdate({ castUnit: Number(v) })}
                        disabled={!isCasting || node.in.unit !== null}
                    />
                </SocketIn>
            </NodeAccordion>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<LengthDefinition>, outSocket: "output", _deps: AllDeps): (keyof LengthDefinition["inputs"])[] => {
    if (outSocket === "output") return ["value", "unit"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<LengthDefinition>, inSocket: keyof LengthDefinition["inputs"], _deps: AllDeps): (keyof LengthDefinition["outputs"])[] => {
    if (inSocket === "value" || inSocket === "unit") return ["output"];
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<LengthDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const val = context.resolve(node.id, "value");
        if (val) {
            if (val.kind === "length") return val;
            const { value } = extractSingle(val.kind, val.data);
            const unit = resolveCastUnit(node, context);
            return { kind: "length", data: `${value}${unit}` };
        }
        return { kind: "length", data: node.payload.value };
    }
    return null;
};

export const LengthPrimitiveType: NodeTypes.Type<"length", LengthDefinition> = {
    type: "length",
    displayName: "Length",
    defaultLabel: "Length",
    iconNode: <NodeIcon shape={NODE_ICONS.length} />,
    flavour: "accent",
    category: "Values",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
