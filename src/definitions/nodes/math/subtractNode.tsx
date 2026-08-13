import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject } from "../../helpers/nodeHelper";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
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
    in: ({ T }) => ({ a: $.defaulted(T, "float"), b: $.defaulted(T, "float") }),
    out: ({ T }) => ({ output: T }),
});

export type SubtractDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        a: DataTypes.TypeOf<DataTypes.Float>;
        b: DataTypes.TypeOf<DataTypes.Float>;
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<SubtractDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"subtract", SubtractDefinition> => {
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
            a: "0",
            b: "0",
        },
        type: "subtract",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<SubtractDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "output");
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<SubtractDefinition>>) => {
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

const dependsOn = (_node: NodeDefinitions.NodeFor<SubtractDefinition>, outSocket: "output", _deps: AllDeps): (keyof SubtractDefinition["inputs"])[] => {
    if (outSocket === "output") return ["a", "b"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<SubtractDefinition>, _inSocket: keyof SubtractDefinition["inputs"], _deps: AllDeps): (keyof SubtractDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<SubtractDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const aVal = context.resolve(node.id, "a") ?? { kind: "float", data: node.payload.a };
        const bVal = context.resolve(node.id, "b") ?? { kind: "float", data: node.payload.b };
        const { a, b, unit } = extractPair(aVal.kind, aVal.data, bVal.kind, bVal.data);
        const outputKind = dominantKind(aVal.kind, bVal.kind);
        return wrapResult(a - b, outputKind, unit);
    }
    return null;
};

export const SubtractType: NodeTypes.Type<"subtract", SubtractDefinition> = {
    type: "subtract",
    displayName: "Subtract",
    defaultLabel: "Subtract",
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
    onInterject: passthroughInterject("a", "output"),
};
