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
import { SignatureEngine } from "../../helpers/signatureEngine";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";

const def = signature({
    args: { T: $.combine.NUMERIC_ADDABLE },
    in: ({ T }) => ({ a: $.defaulted(T, NumericKind.kindOf), b: $.defaulted(T, NumericKind.kindOf) }),
    out: { output: "boolean" },
});

export type EqualDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        a: string;
        b: string;
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<EqualDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"equal", EqualDefinition> => {
    return {
        id,
        in: { a: null, b: null },
        out: { output: [] },
        payload: { label: "", a: "0", b: "0" },
        type: "equal",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<EqualDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "output");
    const inA = Project.useInboundType(graphId, node, "a");
    const inB = Project.useInboundType(graphId, node, "b");
    const conflict = numericConflict(node, ["a", "b"], [inA, inB]);
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<EqualDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} label={"Output"}>
                <ValuePreview value={preview} />
            </SocketOut>
            <SocketIn node={node} socketId={"a"} label={"A"}>
                <TextInput value={node.payload.a} onCommit={(a) => handleUpdate({ a })} disabled={node.in.a !== null} pattern={NumericKind.PATTERN} invalid={conflict} />
            </SocketIn>
            <SocketIn node={node} socketId={"b"} label={"B"}>
                <TextInput value={node.payload.b} onCommit={(b) => handleUpdate({ b })} disabled={node.in.b !== null} pattern={NumericKind.PATTERN} invalid={conflict} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<EqualDefinition>, outSocket: "output", _deps: AllDeps): (keyof EqualDefinition["inputs"])[] => {
    if (outSocket === "output") return ["a", "b"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<EqualDefinition>, _inSocket: keyof EqualDefinition["inputs"], _deps: AllDeps): (keyof EqualDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<EqualDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;
    const aVal = context.resolve(node.id, "a") ?? { kind: NumericKind.kindOf(node.payload.a), data: node.payload.a };
    const bVal = context.resolve(node.id, "b") ?? { kind: NumericKind.kindOf(node.payload.b), data: node.payload.b };
    const { a, b } = extractPair(aVal.kind, aVal.data, bVal.kind, bVal.data);
    return { kind: "boolean", data: a === b };
};

export const EqualNodeType: NodeTypes.Type<"equal", EqualDefinition> = {
    type: "equal",
    displayName: "Equal",
    defaultLabel: "Equal",
    iconNode: <NodeIcon shape={NODE_ICONS.equal} />,
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
