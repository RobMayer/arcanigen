import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut, SocketPair } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { SocketTypes } from "../../socketTypes";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { Enum } from "../../datatypes/enum";
import { extractSingle, applyRounding } from "../../helpers/mathHelper";
import { Dropdown } from "../../../components/inputs/Dropdown";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const ROUNDING_MODE_OPTIONS = Enum.options(Enum.Common.roundingMode);

const def = signature({
    in: { value: $.oneOf("angle", "float", "integer", "length"), mode: "enum" },
    out: { output: "integer" },
});

export type IntegerDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        value: DataTypes.TypeOf<DataTypes.Integer>;
        roundingMode: number;
    }
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<IntegerDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"integer", IntegerDefinition> => {
    return {
        id,
        in: {
            value: null,
            mode: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            value: "0",
            roundingMode: input.roundingMode ?? Enum.Common.roundingMode.HALF_EXPAND.value,
        },
        type: "integer",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<IntegerDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<IntegerDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    // Cast badge: derived LIVE from what the upstream socket is sending into `value` (no persisted state).
    const inbound = Project.useInboundType(useGraphId(), node, "value");
    const inboundKind = inbound ? (SocketTypes.project(inbound)[0] ?? "") : "";
    const isCasting = inboundKind !== "" && inboundKind !== "integer";

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketPair node={node} socketInId={"value"} socketOutId={"output"} label={"Value"}>
                <DecimalInput value={node.payload.value} onCommit={(value) => handleUpdate({ value })} disabled={node.in.value !== null} />
            </SocketPair>
            <NodeAccordion label={"Conversion"} nodeId={node.id}>
                <SocketIn node={node} socketId={"mode"} label={"Rounding"}>
                    <Dropdown value={`${node.payload.roundingMode}`} onValue={(v) => handleUpdate({ roundingMode: Number(v) })} disabled={node.in.mode !== null || !isCasting}>
                        {ROUNDING_MODE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </Dropdown>
                </SocketIn>
            </NodeAccordion>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<IntegerDefinition>, outSocket: "output", _deps: AllDeps): (keyof IntegerDefinition["inputs"])[] => {
    if (outSocket === "output") return ["value", "mode"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<IntegerDefinition>, inSocket: keyof IntegerDefinition["inputs"], _deps: AllDeps): (keyof IntegerDefinition["outputs"])[] => {
    if (inSocket === "value" || inSocket === "mode") return ["output"];
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<IntegerDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const val = context.resolve(node.id, "value");
        if (val) {
            if (val.kind === "integer") return val;
            const { value } = extractSingle(val.kind, val.data);
            const modeVal = context.resolve(node.id, "mode");
            const modeData = modeVal ? (modeVal.kind === "integer" ? Number(modeVal.data) : (modeVal.data as number)) : undefined;
            const mode = Enum.resolve(modeData, Enum.Common.roundingMode) ?? node.payload.roundingMode;
            const rounded = applyRounding(value, mode);
            return { kind: "integer", data: `${rounded}` };
        }
        return { kind: "integer", data: node.payload.value };
    }
    return null;
};

export const IntegerPrimitiveType: NodeTypes.Type<"integer", IntegerDefinition> = {
    type: "integer",
    displayName: "Integer",
    defaultLabel: "Integer",
    iconNode: <NodeIcon shape={NODE_ICONS.num} />,
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
