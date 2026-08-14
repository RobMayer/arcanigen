import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject } from "../../helpers/nodeHelper";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { PointInput } from "../../../components/inputs/PointInput";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Enum } from "../../datatypes/enum";
import { NumericString } from "../../datatypes/numericString";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { SocketTypes } from "../../socketTypes";
import { PointHelper } from "../../helpers/pointHelper";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { a: "point", b: "point", amount: $.oneOf("float", "integer"), mode: "enum" },
    out: { output: "point" },
});

export type PointLerpDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        a: PointInput.Value;
        b: PointInput.Value;
        amount: DataTypes.TypeOf<DataTypes.Float>;
        mode: DataTypes.TypeOf<DataTypes.Enum>;
    }
>;

type PointLerpNode = NodeDefinitions.BuiltNodeOf<"pointLerp", PointLerpDefinition>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<PointLerpDefinition>>, id: string = nanoid()): PointLerpNode => {
    return {
        id,
        in: { a: null, b: null, amount: null, mode: null },
        out: { output: [] },
        payload: { label: "", a: { ...PointInput.DEFAULT }, b: { ...PointInput.DEFAULT }, amount: "0.5", mode: Enum.Common.positionMode.CARTESIAN.value },
        type: "pointLerp",
    };
};

const MODE_OPTIONS = Enum.options(Enum.Common.positionMode);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PointLerpDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "output");
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PointLerpDefinition>>) => {
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
            <SocketIn node={node} socketId={"amount"} label={"Amount"}>
                <DecimalInput value={node.payload.amount} onCommit={(amount) => handleUpdate({ amount })} disabled={node.in.amount !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"mode"} label={"Mode"}>
                <RadioButton.Group
                    options={MODE_OPTIONS}
                    value={`${node.payload.mode}`}
                    onValue={(v) => handleUpdate({ mode: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.mode !== null}
                />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<PointLerpDefinition>, outSocket: "output", _deps: AllDeps): (keyof PointLerpDefinition["inputs"])[] => {
    if (outSocket === "output") return ["a", "b", "amount", "mode"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PointLerpDefinition>, _inSocket: keyof PointLerpDefinition["inputs"], _deps: AllDeps): (keyof PointLerpDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<PointLerpDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const a = context.resolve<DataTypes.Point>(node.id, "a")?.data ?? PointHelper.fromAuthoring(node.payload.a);
        const b = context.resolve<DataTypes.Point>(node.id, "b")?.data ?? PointHelper.fromAuthoring(node.payload.b);
        const t = NumericString.Emptyable.asNumber(context.resolve<DataTypes.Float>(node.id, "amount")?.data ?? node.payload.amount) ?? 0;
        const mode = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "mode")?.data, Enum.Common.positionMode) ?? node.payload.mode ?? 0;

        if (mode === Enum.Common.positionMode.POLAR.value) {
            const pa = PointHelper.toPolar(a.x, a.y);
            const pb = PointHelper.toPolar(b.x, b.y);
            return { kind: "point", data: PointHelper.fromPolar(pa.radius + (pb.radius - pa.radius) * t, pa.theta + (pb.theta - pa.theta) * t) };
        }
        return { kind: "point", data: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t } };
    }
    return null;
};

const POINT = SocketTypes.of(DataTypes.POINT);

export const PointLerpType: NodeTypes.Type<"pointLerp", PointLerpDefinition> = {
    type: "pointLerp",
    displayName: "Lerp (Point)",
    defaultLabel: "Lerp",
    iconNode: <NodeIcon shape={NODE_ICONS.range} modifierIcon={NODE_ICONS.point} />,
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
