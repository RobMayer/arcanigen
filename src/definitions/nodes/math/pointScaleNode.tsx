import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject } from "../../helpers/nodeHelper";
import { ICONS, NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { PointInput } from "../../../components/inputs/PointInput";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { NumericString } from "../../datatypes/numericString";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { SocketTypes } from "../../socketTypes";
import { PointHelper } from "../../helpers/pointHelper";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { a: "point", factor: $.oneOf("float", "integer"), origin: "point" },
    out: { output: "point" },
});

export type PointScaleDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        a: PointInput.Value;
        factor: DataTypes.TypeOf<DataTypes.Float>;
        origin: PointInput.Value;
    }
>;

type PointScaleNode = NodeDefinitions.BuiltNodeOf<"pointScale", PointScaleDefinition>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<PointScaleDefinition>>, id: string = nanoid()): PointScaleNode => {
    return {
        id,
        in: { a: null, factor: null, origin: null },
        out: { output: [] },
        payload: { label: "", a: { ...PointInput.DEFAULT }, factor: "1", origin: { ...PointInput.DEFAULT } },
        type: "pointScale",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PointScaleDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "output");
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PointScaleDefinition>>) => {
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
            <SocketIn node={node} socketId={"factor"} label={"Factor"}>
                <DecimalInput value={node.payload.factor} onCommit={(factor) => handleUpdate({ factor })} disabled={node.in.factor !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"origin"} label={"Origin"}>
                <PointInput value={node.payload.origin} onChange={(v) => handleUpdate({ origin: { ...node.payload.origin, ...v } })} disabled={node.in.origin !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<PointScaleDefinition>, outSocket: "output", _deps: AllDeps): (keyof PointScaleDefinition["inputs"])[] => {
    if (outSocket === "output") return ["a", "factor", "origin"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PointScaleDefinition>, _inSocket: keyof PointScaleDefinition["inputs"], _deps: AllDeps): (keyof PointScaleDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<PointScaleDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const a = context.resolve<DataTypes.Point>(node.id, "a")?.data ?? PointHelper.fromAuthoring(node.payload.a);
        const o = context.resolve<DataTypes.Point>(node.id, "origin")?.data ?? PointHelper.fromAuthoring(node.payload.origin);
        const s = NumericString.Emptyable.asNumber(context.resolve<DataTypes.Float>(node.id, "factor")?.data ?? node.payload.factor) ?? 1;
        // scaling the radius about the pole preserves direction -> a plain linear scale about `o`
        return { kind: "point", data: { x: o.x + (a.x - o.x) * s, y: o.y + (a.y - o.y) * s } };
    }
    return null;
};

const POINT = SocketTypes.of(DataTypes.POINT);

export const PointScaleType: NodeTypes.Type<"pointScale", PointScaleDefinition> = {
    type: "pointScale",
    displayName: "Scale (Point)",
    defaultLabel: "Scale",
    iconNode: <NodeIcon shape={ICONS.Grow} modifierIcon={NODE_ICONS.point} />,
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
