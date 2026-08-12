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
import { extractPair, dominantKind, wrapResult, extractSingle } from "../../helpers/mathHelper";
import { SocketTypes } from "../../socketTypes";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    args: { T: $.combine.NUMERIC_ADDABLE },
    in: ({ T }) => ({ a: T, b: T, t: $.oneOf("float", "integer") }),
    out: ({ T }) => ({ output: T }),
});

export type LerpDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        t: DataTypes.TypeOf<DataTypes.Float>;
    }
>;

type LerpNode = NodeDefinitions.BuiltNodeOf<"lerp", LerpDefinition>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<LerpDefinition>>, id: string = nanoid()): LerpNode => {
    return {
        id,
        in: { a: null, b: null, t: null },
        out: { output: [] },
        payload: {
            label: "",
            t: input.t ?? "0.5",
        },
        type: "lerp",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<LerpDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<LerpDefinition>>) => {
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
            <SocketIn node={node} socketId={"a"}>
                A
            </SocketIn>
            <SocketIn node={node} socketId={"b"}>
                B
            </SocketIn>
            <SocketIn node={node} socketId={"t"} label={"T"}>
                <DecimalInput value={node.payload.t} onCommit={(t) => handleUpdate({ t })} disabled={node.in.t !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<LerpDefinition>, outSocket: "output", _deps: AllDeps): (keyof LerpDefinition["inputs"])[] => {
    if (outSocket === "output") return ["a", "b", "t"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<LerpDefinition>, _inSocket: keyof LerpDefinition["inputs"], _deps: AllDeps): (keyof LerpDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<LerpDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const aVal = context.resolve(node.id, "a");
        const bVal = context.resolve(node.id, "b");
        if (!aVal || !bVal) return null;
        const { a, b, unit } = extractPair(aVal.kind, aVal.data, bVal.kind, bVal.data);

        const tVal = context.resolve(node.id, "t");
        const tData = tVal?.data ?? node.payload.t;
        const { value: t } = extractSingle(tVal?.kind ?? "float", tData);

        const outputKind = dominantKind(aVal.kind, bVal.kind);
        return wrapResult(a + (b - a) * t, outputKind, unit);
    }
    return null;
};

export const LerpType: NodeTypes.Type<"lerp", LerpDefinition> = {
    type: "lerp",
    displayName: "Lerp",
    defaultLabel: "Lerp",
    iconNode: <NodeIcon shape={NODE_ICONS.range} />,
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
