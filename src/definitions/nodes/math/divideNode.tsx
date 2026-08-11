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

export type DivideDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<DivideDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"divide", DivideDefinition> => {
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
        type: "divide",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<DivideDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
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

const dependsOn = (_node: NodeDefinitions.NodeFor<DivideDefinition>, outSocket: "output", _deps: AllDeps): (keyof DivideDefinition["inputs"])[] => {
    if (outSocket === "output") return ["a", "b"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<DivideDefinition>, _inSocket: keyof DivideDefinition["inputs"], _deps: AllDeps): (keyof DivideDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<DivideDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const aVal = context.resolve(node.id, "a");
        const bVal = context.resolve(node.id, "b");
        if (!aVal || !bVal) return null;
        const { a, b, unit } = extractPair(aVal.kind, aVal.data, bVal.kind, bVal.data);
        const outputKind = dominantKind(aVal.kind, bVal.kind);
        return wrapResult(b === 0 ? 0 : a / b, outputKind, unit);
    }
    return null;
};

export const DivideType: NodeTypes.Type<"divide", DivideDefinition> = {
    type: "divide",
    displayName: "Divide",
    defaultLabel: "Divide",
    iconNode: <NodeIcon shape={NODE_ICONS.divide} />,
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
