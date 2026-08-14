import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject } from "../../helpers/nodeHelper";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { PointInput } from "../../../components/inputs/PointInput";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Length } from "../../datatypes/length";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { SocketTypes } from "../../socketTypes";
import { PointHelper } from "../../helpers/pointHelper";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { a: "point", distance: "length", origin: "point" },
    out: { output: "point" },
});

export type PointDisplaceDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        a: PointInput.Value;
        distance: DataTypes.TypeOf<DataTypes.Length>;
        origin: PointInput.Value;
    }
>;

type PointDisplaceNode = NodeDefinitions.BuiltNodeOf<"pointDisplace", PointDisplaceDefinition>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<PointDisplaceDefinition>>, id: string = nanoid()): PointDisplaceNode => {
    return {
        id,
        in: { a: null, distance: null, origin: null },
        out: { output: [] },
        payload: { label: "", a: { ...PointInput.DEFAULT }, distance: "10px", origin: { ...PointInput.DEFAULT } },
        type: "pointDisplace",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PointDisplaceDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "output");
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PointDisplaceDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} label={"Output"}>
                <ValuePreview value={preview} />
            </SocketOut>
            <SocketIn node={node} socketId={"a"} label={"Point"}>
                <PointInput value={node.payload.a} onChange={(v) => handleUpdate({ a: { ...node.payload.a, ...v } })} disabled={node.in.a !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"distance"} label={"Distance"}>
                <LengthInput value={node.payload.distance} onCommit={(distance) => handleUpdate({ distance })} disabled={node.in.distance !== null} required />
            </SocketIn>
            <SocketIn node={node} socketId={"origin"} label={"Origin"}>
                <PointInput value={node.payload.origin} onChange={(v) => handleUpdate({ origin: { ...node.payload.origin, ...v } })} disabled={node.in.origin !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<PointDisplaceDefinition>, outSocket: "output", _deps: AllDeps): (keyof PointDisplaceDefinition["inputs"])[] => {
    if (outSocket === "output") return ["a", "distance", "origin"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PointDisplaceDefinition>, _inSocket: keyof PointDisplaceDefinition["inputs"], _deps: AllDeps): (keyof PointDisplaceDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<PointDisplaceDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const a = context.resolve<DataTypes.Point>(node.id, "a")?.data ?? PointHelper.fromAuthoring(node.payload.a);
        const o = context.resolve<DataTypes.Point>(node.id, "origin")?.data ?? PointHelper.fromAuthoring(node.payload.origin);
        const d = Length.Emptyable.asNumber(context.resolve<DataTypes.Length>(node.id, "distance")?.data ?? node.payload.distance) ?? 0;
        // push `a` along its ray from the pole by `d`; a point on the pole falls back to theta 0
        const { radius, theta } = PointHelper.toPolar(a.x - o.x, a.y - o.y);
        const p = PointHelper.fromPolar(radius + d, theta);
        return { kind: "point", data: { x: o.x + p.x, y: o.y + p.y } };
    }
    return null;
};

const POINT = SocketTypes.of(DataTypes.POINT);

export const PointDisplaceType: NodeTypes.Type<"pointDisplace", PointDisplaceDefinition> = {
    type: "pointDisplace",
    displayName: "Displace (Point)",
    defaultLabel: "Displace",
    iconNode: <NodeIcon shape={NODE_ICONS.length} modifierIcon={NODE_ICONS.point} />,
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
