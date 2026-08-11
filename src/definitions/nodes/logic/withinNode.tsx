import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { Resolver } from "../../../util/resolver";
import { extractPair } from "../../helpers/mathHelper";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    args: { T: $.combine.NUMERIC_ADDABLE },
    in: ({ T }) => ({ value: T, target: T, tolerance: T }),
    out: { output: "boolean" },
});

export type WithinDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<WithinDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"within", WithinDefinition> => {
    return {
        id,
        in: { value: null, target: null, tolerance: null },
        out: { output: [] },
        payload: { label: "" },
        type: "within",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<WithinDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "output");
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} label={"Output"}>
                <ValuePreview value={preview} />
            </SocketOut>
            <SocketIn node={node} socketId={"value"}>
                Value
            </SocketIn>
            <SocketIn node={node} socketId={"target"}>
                Target
            </SocketIn>
            <SocketIn node={node} socketId={"tolerance"}>
                Tolerance
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

    const valEval = context.resolve(node.id, "value");
    const tgtEval = context.resolve(node.id, "target");
    const tolEval = context.resolve(node.id, "tolerance");
    if (!valEval || !tgtEval || !tolEval) return null;

    // Extract value and target as a pair (handles length unit conversion)
    const { a: val, b: tgt } = extractPair(valEval.kind, valEval.data, tgtEval.kind, tgtEval.data);
    // Extract tolerance — also paired with value for unit conversion
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
};
