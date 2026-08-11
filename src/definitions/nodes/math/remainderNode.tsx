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
    args: { T: $.combine.NUMERIC_SCALABLE },
    in: ({ T }) => ({ a: T, b: T }),
    out: ({ T }) => ({ output: T }),
});

export type RemainderDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<RemainderDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"remainder", RemainderDefinition> => {
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
        type: "remainder",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<RemainderDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
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

const dependsOn = (_node: NodeDefinitions.NodeFor<RemainderDefinition>, outSocket: "output", _deps: AllDeps): (keyof RemainderDefinition["inputs"])[] => {
    if (outSocket === "output") return ["a", "b"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<RemainderDefinition>, _inSocket: keyof RemainderDefinition["inputs"], _deps: AllDeps): (keyof RemainderDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<RemainderDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const aVal = context.resolve(node.id, "a");
        const bVal = context.resolve(node.id, "b");
        if (!aVal || !bVal) return null;
        const { a, b, unit } = extractPair(aVal.kind, aVal.data, bVal.kind, bVal.data);
        const outputKind = dominantKind(aVal.kind, bVal.kind);
        return wrapResult(b === 0 ? 0 : a % b, outputKind, unit);
    }
    return null;
};

export const RemainderType: NodeTypes.Type<"remainder", RemainderDefinition> = {
    type: "remainder",
    displayName: "Remainder",
    defaultLabel: "Remainder",
    iconNode: <NodeIcon shape={NODE_ICONS.percent} />,
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
