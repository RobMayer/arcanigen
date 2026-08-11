import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject } from "../../helpers/nodeHelper";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { extractSingle, wrapResult } from "../../helpers/mathHelper";
import { SocketTypes } from "../../socketTypes";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    args: { N: $.NUMERIC },
    in: ({ N }) => ({ input: N }),
    out: ({ N }) => ({ output: N }),
});

export type NegateDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
    }
>;

type NegateNode = NodeDefinitions.BuiltNodeOf<"negate", NegateDefinition>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<NegateDefinition>>, id: string = nanoid()): NegateNode => {
    return {
        id,
        in: { input: null },
        out: { output: [] },
        payload: {
            label: "",
        },
        type: "negate",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<NegateDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
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
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<NegateDefinition>, outSocket: "output", _deps: AllDeps): (keyof NegateDefinition["inputs"])[] => {
    if (outSocket === "output") return ["input"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<NegateDefinition>, _inSocket: keyof NegateDefinition["inputs"], _deps: AllDeps): (keyof NegateDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<NegateDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const val = context.resolve(node.id, "input");
        if (!val) return null;
        const { value, unit } = extractSingle(val.kind, val.data);
        return wrapResult(-value, val.kind, unit);
    }
    return null;
};

export const NegateType: NodeTypes.Type<"negate", NegateDefinition> = {
    type: "negate",
    displayName: "Negate",
    defaultLabel: "Negate",
    iconNode: <NodeIcon shape={NODE_ICONS.subtract} />,
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
