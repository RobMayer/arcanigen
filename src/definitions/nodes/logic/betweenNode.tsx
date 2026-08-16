import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { TextInput } from "../../../components/inputs/TextInput";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { Resolver } from "../../../util/resolver";
import { extractPair } from "../../helpers/mathHelper";
import { NumericKind } from "../../helpers/numericKind";
import { numericConflict } from "../../helpers/numericConflict";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    args: { T: $.combine.NUMERIC_ADDABLE },
    in: ({ T }) => ({ value: $.defaulted(T, NumericKind.kindOf), min: $.defaulted(T, NumericKind.kindOf), max: $.defaulted(T, NumericKind.kindOf) }),
    out: { output: "boolean" },
});

export type BetweenDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        value: string;
        min: string;
        max: string;
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<BetweenDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"between", BetweenDefinition> => {
    return {
        id,
        in: { value: null, min: null, max: null },
        out: { output: [] },
        payload: { label: "", value: "0", min: "0", max: "0" },
        type: "between",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<BetweenDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "output");
    const in0 = Project.useInboundType(graphId, node, "value");
    const in1 = Project.useInboundType(graphId, node, "min");
    const in2 = Project.useInboundType(graphId, node, "max");
    const conflict = numericConflict(node, ["value", "min", "max"], [in0, in1, in2]);
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<BetweenDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} label={"Output"}>
                <ValuePreview value={preview} />
            </SocketOut>
            <SocketIn node={node} socketId={"value"} label={"Value"}>
                <TextInput value={node.payload.value} onCommit={(value) => handleUpdate({ value })} disabled={node.in.value !== null} pattern={NumericKind.PATTERN} invalid={conflict} />
            </SocketIn>
            <SocketIn node={node} socketId={"min"} label={"Min"}>
                <TextInput value={node.payload.min} onCommit={(min) => handleUpdate({ min })} disabled={node.in.min !== null} pattern={NumericKind.PATTERN} invalid={conflict} />
            </SocketIn>
            <SocketIn node={node} socketId={"max"} label={"Max"}>
                <TextInput value={node.payload.max} onCommit={(max) => handleUpdate({ max })} disabled={node.in.max !== null} pattern={NumericKind.PATTERN} invalid={conflict} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<BetweenDefinition>, outSocket: "output", _deps: AllDeps): (keyof BetweenDefinition["inputs"])[] => {
    if (outSocket === "output") return ["value", "min", "max"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<BetweenDefinition>, _inSocket: keyof BetweenDefinition["inputs"], _deps: AllDeps): (keyof BetweenDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<BetweenDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const valEval = context.resolve(node.id, "value") ?? { kind: NumericKind.kindOf(node.payload.value), data: node.payload.value };
    const minEval = context.resolve(node.id, "min") ?? { kind: NumericKind.kindOf(node.payload.min), data: node.payload.min };
    const maxEval = context.resolve(node.id, "max") ?? { kind: NumericKind.kindOf(node.payload.max), data: node.payload.max };

    // Extract value and min as a pair (handles length unit conversion)
    const { a: val, b: mn } = extractPair(valEval.kind, valEval.data, minEval.kind, minEval.data);
    // Extract value and max as a pair (same unit reference from value)
    const { b: mx } = extractPair(valEval.kind, valEval.data, maxEval.kind, maxEval.data);

    return { kind: "boolean", data: val >= mn && val <= mx };
};

export const BetweenNodeType: NodeTypes.Type<"between", BetweenDefinition> = {
    type: "between",
    displayName: "Between",
    defaultLabel: "Between",
    iconNode: <NodeIcon shape={NODE_ICONS.tilde} />,
    flavour: "help",
    category: "Logic",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
    onPayloadChange: SignatureEngine.onPayloadChange,
};
