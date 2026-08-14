import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject } from "../../helpers/nodeHelper";
import { ICONS, NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { PointInput } from "../../../components/inputs/PointInput";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Angle } from "../../datatypes/angle";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { SocketTypes } from "../../socketTypes";
import { PointHelper } from "../../helpers/pointHelper";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { a: "point", angle: "angle", origin: "point" },
    out: { output: "point" },
});

export type PointRotateDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        a: PointInput.Value;
        angle: DataTypes.TypeOf<DataTypes.Angle>;
        origin: PointInput.Value;
    }
>;

type PointRotateNode = NodeDefinitions.BuiltNodeOf<"pointRotate", PointRotateDefinition>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<PointRotateDefinition>>, id: string = nanoid()): PointRotateNode => {
    return {
        id,
        in: { a: null, angle: null, origin: null },
        out: { output: [] },
        payload: { label: "", a: { ...PointInput.DEFAULT }, angle: "0deg", origin: { ...PointInput.DEFAULT } },
        type: "pointRotate",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PointRotateDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "output");
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PointRotateDefinition>>) => {
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
            <SocketIn node={node} socketId={"angle"} label={"Angle"}>
                <AngleInput.SliderInput value={node.payload.angle} onCommit={(angle) => handleUpdate({ angle })} disabled={node.in.angle !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"origin"} label={"Origin"}>
                <PointInput value={node.payload.origin} onChange={(v) => handleUpdate({ origin: { ...node.payload.origin, ...v } })} disabled={node.in.origin !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<PointRotateDefinition>, outSocket: "output", _deps: AllDeps): (keyof PointRotateDefinition["inputs"])[] => {
    if (outSocket === "output") return ["a", "angle", "origin"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PointRotateDefinition>, _inSocket: keyof PointRotateDefinition["inputs"], _deps: AllDeps): (keyof PointRotateDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<PointRotateDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const a = context.resolve<DataTypes.Point>(node.id, "a")?.data ?? PointHelper.fromAuthoring(node.payload.a);
        const o = context.resolve<DataTypes.Point>(node.id, "origin")?.data ?? PointHelper.fromAuthoring(node.payload.origin);
        const ang = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "angle")?.data ?? node.payload.angle) ?? 0;
        const { radius, theta } = PointHelper.toPolar(a.x - o.x, a.y - o.y);
        const p = PointHelper.fromPolar(radius, theta + ang);
        return { kind: "point", data: { x: o.x + p.x, y: o.y + p.y } };
    }
    return null;
};

const POINT = SocketTypes.of(DataTypes.POINT);

export const PointRotateType: NodeTypes.Type<"pointRotate", PointRotateDefinition> = {
    type: "pointRotate",
    displayName: "Rotate (Point)",
    defaultLabel: "Rotate",
    iconNode: <NodeIcon shape={ICONS.Rotate} modifierIcon={NODE_ICONS.point} />,
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
