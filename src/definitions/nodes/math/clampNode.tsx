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
import { dominantKind, wrapResult, extractSingle } from "../../helpers/mathHelper";
import { SocketTypes } from "../../socketTypes";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    args: { T: $.combine.NUMERIC_ADDABLE },
    in: ({ T }) => ({ input: $.defaulted(T, "float"), min: $.defaulted(T, "float"), max: $.defaulted(T, "float") }),
    out: ({ T }) => ({ output: T }),
});

export type ClampDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        input: DataTypes.TypeOf<DataTypes.Float>;
        min: DataTypes.TypeOf<DataTypes.Float>;
        max: DataTypes.TypeOf<DataTypes.Float>;
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<ClampDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"clamp", ClampDefinition> => {
    return {
        id,
        in: { input: null, min: null, max: null },
        out: { output: [] },
        payload: {
            label: "",
            input: "0",
            min: "0",
            max: "1",
        },
        type: "clamp",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ClampDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "output");
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ClampDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} label={"Output"}>
                <ValuePreview value={preview} />
            </SocketOut>
            <SocketIn node={node} socketId={"input"} label={"Input"}>
                <DecimalInput value={node.payload.input} onCommit={(input) => handleUpdate({ input })} disabled={node.in.input !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"min"} label={"Min"}>
                <DecimalInput value={node.payload.min} onCommit={(min) => handleUpdate({ min })} disabled={node.in.min !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"max"} label={"Max"}>
                <DecimalInput value={node.payload.max} onCommit={(max) => handleUpdate({ max })} disabled={node.in.max !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<ClampDefinition>, outSocket: "output", _deps: AllDeps): (keyof ClampDefinition["inputs"])[] => {
    if (outSocket === "output") return ["input", "min", "max"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ClampDefinition>, _inSocket: keyof ClampDefinition["inputs"], _deps: AllDeps): (keyof ClampDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<ClampDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const inputVal = context.resolve(node.id, "input") ?? { kind: "float", data: node.payload.input };
        const minVal = context.resolve(node.id, "min") ?? { kind: "float", data: node.payload.min };
        const maxVal = context.resolve(node.id, "max") ?? { kind: "float", data: node.payload.max };

        const { value, unit } = extractSingle(inputVal.kind, inputVal.data);
        const { value: lo } = extractSingle(minVal.kind, minVal.data);
        const { value: hi } = extractSingle(maxVal.kind, maxVal.data);

        const outputKind = dominantKind(dominantKind(inputVal.kind, minVal.kind), maxVal.kind);
        return wrapResult(Math.max(lo, Math.min(hi, value)), outputKind, unit);
    }
    return null;
};

export const ClampType: NodeTypes.Type<"clamp", ClampDefinition> = {
    type: "clamp",
    displayName: "Clamp",
    defaultLabel: "Clamp",
    iconNode: <NodeIcon shape={NODE_ICONS.round} />,
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
