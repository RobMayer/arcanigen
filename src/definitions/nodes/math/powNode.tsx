import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject } from "../../helpers/nodeHelper";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { extractSingle, wrapResult } from "../../helpers/mathHelper";
import { SocketTypes } from "../../socketTypes";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    args: { N: $.NUMERIC },
    in: ({ N }) => ({ input: N, exponent: $.oneOf("float", "integer") }),
    out: ({ N }) => ({ output: N }),
});

export type PowDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        exponent: DataTypes.TypeOf<"float">;
    }
>;

type PowNode = NodeDefinitions.BuiltNodeOf<"pow", PowDefinition>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<PowDefinition>>, id: string = nanoid()): PowNode => {
    return {
        id,
        in: { input: null, exponent: null },
        out: { output: [] },
        payload: {
            label: "",
            exponent: input.exponent ?? "2",
        },
        type: "pow",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PowDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PowDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "output");
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} label={"Output"}>
                <ValuePreview value={preview} />
            </SocketOut>
            <SocketIn node={node} socketId={"input"}>
                Input
            </SocketIn>
            <SocketIn node={node} socketId={"exponent"} label={"Exponent"}>
                <DecimalInput value={node.payload.exponent} onCommit={(exponent) => handleUpdate({ exponent })} disabled={node.in.exponent !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<PowDefinition>, outSocket: "output", _deps: AllDeps): (keyof PowDefinition["inputs"])[] => {
    if (outSocket === "output") return ["input", "exponent"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PowDefinition>, inSocket: keyof PowDefinition["inputs"], _deps: AllDeps): (keyof PowDefinition["outputs"])[] => {
    if (inSocket === "input" || inSocket === "exponent") return ["output"];
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<PowDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const val = context.resolve(node.id, "input");
        if (!val) return null;
        const { value, unit } = extractSingle(val.kind, val.data);
        const expVal = context.resolve(node.id, "exponent");
        const expData = expVal?.data ?? node.payload.exponent;
        const { value: exp } = extractSingle(expVal?.kind ?? "float", expData);
        return wrapResult(Math.pow(value, exp), val.kind, unit);
    }
    return null;
};

export const PowType: NodeTypes.Type<"pow", PowDefinition> = {
    type: "pow",
    displayName: "Pow",
    defaultLabel: "Pow",
    iconNode: <NodeIcon shape={NODE_ICONS.pow} />,
    flavour: "help",
    category: "Math",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    signature: def.instance,
    ...SignatureEngine.hooks,
    canInterject: passthroughCanInterject(SocketTypes.NUMERIC, SocketTypes.NUMERIC),
    onInterject: passthroughInterject("input", "output"),
};
