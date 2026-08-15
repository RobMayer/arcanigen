import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { Resolver } from "../../../util/resolver";
import { extractPair } from "../../helpers/mathHelper";
import { SignatureEngine } from "../../helpers/signatureEngine";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";

const def = signature({
    args: { T: $.combine.NUMERIC_ADDABLE },
    in: ({ T }) => ({ a: $.defaulted(T, "float"), b: $.defaulted(T, "float") }),
    out: { output: "boolean" },
});

export type LessOrEqualDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        a: DataTypes.TypeOf<DataTypes.Float>;
        b: DataTypes.TypeOf<DataTypes.Float>;
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<LessOrEqualDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"lessOrEqual", LessOrEqualDefinition> => {
    return {
        id,
        in: { a: null, b: null },
        out: { output: [] },
        payload: { label: "", a: "0", b: "0" },
        type: "lessOrEqual",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<LessOrEqualDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "output");
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<LessOrEqualDefinition>>) => {
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
                <DecimalInput value={node.payload.a} onCommit={(a) => handleUpdate({ a })} disabled={node.in.a !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"b"} label={"B"}>
                <DecimalInput value={node.payload.b} onCommit={(b) => handleUpdate({ b })} disabled={node.in.b !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<LessOrEqualDefinition>, outSocket: "output", _deps: AllDeps): (keyof LessOrEqualDefinition["inputs"])[] => {
    if (outSocket === "output") return ["a", "b"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<LessOrEqualDefinition>, _inSocket: keyof LessOrEqualDefinition["inputs"], _deps: AllDeps): (keyof LessOrEqualDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<LessOrEqualDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;
    const aVal = context.resolve(node.id, "a") ?? { kind: "float", data: node.payload.a };
    const bVal = context.resolve(node.id, "b") ?? { kind: "float", data: node.payload.b };
    const { a, b } = extractPair(aVal.kind, aVal.data, bVal.kind, bVal.data);
    return { kind: "boolean", data: a <= b };
};

export const LessOrEqualNodeType: NodeTypes.Type<"lessOrEqual", LessOrEqualDefinition> = {
    type: "lessOrEqual",
    displayName: "Less or Equal",
    defaultLabel: "Less or Equal",
    iconNode: <NodeIcon shape={NODE_ICONS.lessEqual} />,
    flavour: "help",
    category: "Logic",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
