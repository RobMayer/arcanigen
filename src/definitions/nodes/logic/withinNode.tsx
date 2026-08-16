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
    in: ({ T }) => ({ value: $.defaulted(T, NumericKind.kindOf), target: $.defaulted(T, NumericKind.kindOf), tolerance: $.defaulted(T, NumericKind.kindOf) }),
    out: { output: "boolean" },
});

export type WithinDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        value: string;
        target: string;
        tolerance: string;
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<WithinDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"within", WithinDefinition> => {
    return {
        id,
        in: { value: null, target: null, tolerance: null },
        out: { output: [] },
        payload: { label: "", value: "0", target: "0", tolerance: "0" },
        type: "within",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<WithinDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "output");
    const in0 = Project.useInboundType(graphId, node, "value");
    const in1 = Project.useInboundType(graphId, node, "target");
    const in2 = Project.useInboundType(graphId, node, "tolerance");
    const conflict = numericConflict(node, ["value", "target", "tolerance"], [in0, in1, in2]);
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<WithinDefinition>>) => {
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
            <SocketIn node={node} socketId={"target"} label={"Target"}>
                <TextInput value={node.payload.target} onCommit={(target) => handleUpdate({ target })} disabled={node.in.target !== null} pattern={NumericKind.PATTERN} invalid={conflict} />
            </SocketIn>
            <SocketIn node={node} socketId={"tolerance"} label={"Tolerance"}>
                <TextInput value={node.payload.tolerance} onCommit={(tolerance) => handleUpdate({ tolerance })} disabled={node.in.tolerance !== null} pattern={NumericKind.PATTERN} invalid={conflict} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<WithinDefinition>, outSocket: "output", _deps: AllDeps): (keyof WithinDefinition["inputs"])[] => {
    if (outSocket === "output") return ["value", "target", "tolerance"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<WithinDefinition>, _inSocket: keyof WithinDefinition["inputs"], _deps: AllDeps): (keyof WithinDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<WithinDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const valEval = context.resolve(node.id, "value") ?? { kind: NumericKind.kindOf(node.payload.value), data: node.payload.value };
    const tgtEval = context.resolve(node.id, "target") ?? { kind: NumericKind.kindOf(node.payload.target), data: node.payload.target };
    const tolEval = context.resolve(node.id, "tolerance") ?? { kind: NumericKind.kindOf(node.payload.tolerance), data: node.payload.tolerance };

    // Extract value and target as a pair (handles length unit conversion)
    const { a: val, b: tgt } = extractPair(valEval.kind, valEval.data, tgtEval.kind, tgtEval.data);
    // Extract tolerance -- also paired with value for unit conversion
    const { b: tol } = extractPair(valEval.kind, valEval.data, tolEval.kind, tolEval.data);

    return { kind: "boolean", data: Math.abs(val - tgt) <= tol };
};

export const WithinNodeType: NodeTypes.Type<"within", WithinDefinition> = {
    type: "within",
    displayName: "Within",
    defaultLabel: "Within",
    iconNode: <NodeIcon shape={NODE_ICONS.plusMinus} />,
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
