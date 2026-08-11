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
import { extractPair, dominantKind, wrapResult } from "../../helpers/mathHelper";
import { SocketTypes } from "../../socketTypes";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    args: { T: $.combine.NUMERIC_ADDABLE },
    in: ({ T }) => ({ a: T, b: T }),
    out: ({ T }) => ({ output: T }),
});

export type MinDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<MinDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"min", MinDefinition> => {
    return {
        id,
        in: {
            a: null,
            b: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
        },
        type: "min",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<MinDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "output");
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} label={"Output"}>
                <ValuePreview value={preview} />
            </SocketOut>
            <SocketIn node={node} socketId={"a"}>
                A
            </SocketIn>
            <SocketIn node={node} socketId={"b"}>
                B
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<MinDefinition>, outSocket: "output", _deps: AllDeps): (keyof MinDefinition["inputs"])[] => {
    if (outSocket === "output") return ["a", "b"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<MinDefinition>, _inSocket: keyof MinDefinition["inputs"], _deps: AllDeps): (keyof MinDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<MinDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const aVal = context.resolve(node.id, "a");
        const bVal = context.resolve(node.id, "b");
        if (!aVal || !bVal) return null;
        const { a, b, unit } = extractPair(aVal.kind, aVal.data, bVal.kind, bVal.data);
        const outputKind = dominantKind(aVal.kind, bVal.kind);
        return wrapResult(Math.min(a, b), outputKind, unit);
    }
    return null;
};

export const MinType: NodeTypes.Type<"min", MinDefinition> = {
    type: "min",
    displayName: "Min",
    defaultLabel: "Min",
    iconNode: <NodeIcon shape={NODE_ICONS.min} />,
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
    onInterject: passthroughInterject("a", "output"),
};
