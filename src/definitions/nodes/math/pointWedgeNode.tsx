import { nanoid } from "nanoid";
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
import { PointHelper } from "../../helpers/pointHelper";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { a: "point", b: "point" },
    out: { output: "float" },
});

export type PointWedgeDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        a: PointInput.Value;
        b: PointInput.Value;
    }
>;

type PointWedgeNode = NodeDefinitions.BuiltNodeOf<"pointWedge", PointWedgeDefinition>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<PointWedgeDefinition>>, id: string = nanoid()): PointWedgeNode => {
    return {
        id,
        in: { a: null, b: null },
        out: { output: [] },
        payload: { label: "", a: { ...PointInput.DEFAULT }, b: { ...PointInput.DEFAULT } },
        type: "pointWedge",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PointWedgeDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "output");
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PointWedgeDefinition>>) => {
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

const dependsOn = (_node: NodeDefinitions.NodeFor<PointWedgeDefinition>, outSocket: "output", _deps: AllDeps): (keyof PointWedgeDefinition["inputs"])[] => {
    if (outSocket === "output") return ["a", "b"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PointWedgeDefinition>, _inSocket: keyof PointWedgeDefinition["inputs"], _deps: AllDeps): (keyof PointWedgeDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<PointWedgeDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const a = context.resolve<DataTypes.Point>(node.id, "a")?.data ?? PointHelper.fromAuthoring(node.payload.a);
        const b = context.resolve<DataTypes.Point>(node.id, "b")?.data ?? PointHelper.fromAuthoring(node.payload.b);
        // 2D wedge / perp-dot: signed area (also the z of the 3D cross). Positive = b is CCW from a.
        return { kind: "float", data: `${a.x * b.y - a.y * b.x}` };
    }
    return null;
};

export const PointWedgeType: NodeTypes.Type<"pointWedge", PointWedgeDefinition> = {
    type: "pointWedge",
    displayName: "Wedge (Point)",
    defaultLabel: "Wedge",
    iconNode: <NodeIcon shape={NODE_ICONS.plusMinus} modifierIcon={NODE_ICONS.point} />,
    flavour: "help",
    category: "Math",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
