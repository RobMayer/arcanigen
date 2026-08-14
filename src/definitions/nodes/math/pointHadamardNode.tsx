import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject } from "../../helpers/nodeHelper";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { PointInput } from "../../../components/inputs/PointInput";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { SocketTypes } from "../../socketTypes";
import { PointHelper } from "../../helpers/pointHelper";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { a: "point", b: "point" },
    out: { output: "point" },
});

export type PointHadamardDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        a: PointInput.Value;
        b: PointInput.Value;
    }
>;

type PointHadamardNode = NodeDefinitions.BuiltNodeOf<"pointHadamard", PointHadamardDefinition>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<PointHadamardDefinition>>, id: string = nanoid()): PointHadamardNode => {
    return {
        id,
        in: { a: null, b: null },
        out: { output: [] },
        payload: { label: "", a: { ...PointInput.DEFAULT }, b: { ...PointInput.DEFAULT } },
        type: "pointHadamard",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PointHadamardDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "output");
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PointHadamardDefinition>>) => {
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
                <PointInput value={node.payload.a} onChange={(v) => handleUpdate({ a: { ...node.payload.a, ...v } })} disabled={node.in.a !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"b"} label={"B"}>
                <PointInput value={node.payload.b} onChange={(v) => handleUpdate({ b: { ...node.payload.b, ...v } })} disabled={node.in.b !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<PointHadamardDefinition>, outSocket: "output", _deps: AllDeps): (keyof PointHadamardDefinition["inputs"])[] => {
    if (outSocket === "output") return ["a", "b"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PointHadamardDefinition>, _inSocket: keyof PointHadamardDefinition["inputs"], _deps: AllDeps): (keyof PointHadamardDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<PointHadamardDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const a = context.resolve<DataTypes.Point>(node.id, "a")?.data ?? PointHelper.fromAuthoring(node.payload.a);
        const b = context.resolve<DataTypes.Point>(node.id, "b")?.data ?? PointHelper.fromAuthoring(node.payload.b);
        return { kind: "point", data: { x: a.x * b.x, y: a.y * b.y } };
    }
    return null;
};

const POINT = SocketTypes.of(DataTypes.POINT);

export const PointHadamardType: NodeTypes.Type<"pointHadamard", PointHadamardDefinition> = {
    type: "pointHadamard",
    displayName: "Hadamard (Point)",
    defaultLabel: "Hadamard",
    iconNode: <NodeIcon shape={NODE_ICONS.asterisk} modifierIcon={NODE_ICONS.point} />,
    flavour: "help",
    category: "Math",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    signature: def.instance,
    ...SignatureEngine.hooks,
    canInterject: passthroughCanInterject(POINT, POINT),
    onInterject: passthroughInterject("a", "output"),
};
