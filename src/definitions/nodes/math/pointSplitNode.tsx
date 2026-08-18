import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { PointInput } from "../../../components/inputs/PointInput";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { PointHelper } from "../../helpers/pointHelper";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { input: "point" },
    out: { x: "length", y: "length", radius: "length", theta: "angle" },
});

export type PointSplitDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        input: PointInput.Value;
    }
>;

type OutKey = keyof PointSplitDefinition["outputs"];

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<PointSplitDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"pointSplit", PointSplitDefinition> => {
    return {
        id,
        in: { input: null },
        out: { x: [], y: [], radius: [], theta: [] },
        payload: { label: "", input: { ...PointInput.DEFAULT } },
        type: "pointSplit",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PointSplitDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PointSplitDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketIn node={node} socketId={"input"} label={"Point"}>
                <PointInput value={node.payload.input} onChange={(v) => handleUpdate({ input: { ...node.payload.input, ...v } })} disabled={node.in.input !== null} />
            </SocketIn>
            <hr />
            <SocketOut node={node} socketId={"x"}>
                X
            </SocketOut>
            <SocketOut node={node} socketId={"y"}>
                Y
            </SocketOut>
            <hr />
            <SocketOut node={node} socketId={"radius"}>
                Radius
            </SocketOut>
            <SocketOut node={node} socketId={"theta"}>
                Theta
            </SocketOut>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<PointSplitDefinition>, _outSocket: OutKey, _deps: AllDeps): (keyof PointSplitDefinition["inputs"])[] => {
    return ["input"];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PointSplitDefinition>, inSocket: keyof PointSplitDefinition["inputs"], _deps: AllDeps): OutKey[] => {
    if (inSocket === "input") return ["x", "y", "radius", "theta"];
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<PointSplitDefinition>, socket: OutKey, context: Resolver.Context): DataTypes.AnyEval | null => {
    const point = context.resolve<DataTypes.Point>(node.id, "input")?.data ?? PointHelper.fromAuthoring(node.payload.input);

    switch (socket) {
        case "x":
            return { kind: "length", data: `${point.x}px` };
        case "y":
            return { kind: "length", data: `${point.y}px` };
        case "radius":
            return { kind: "length", data: `${PointHelper.toPolar(point.x, point.y).radius}px` };
        case "theta":
            return { kind: "angle", data: `${PointHelper.toPolar(point.x, point.y).theta}deg` };
    }
};

export const PointSplitType: NodeTypes.Type<"pointSplit", PointSplitDefinition> = {
    type: "pointSplit",
    displayName: "Point Split",
    defaultLabel: "Point Split",
    iconNode: <NodeIcon shape={NODE_ICONS.point} modifierIcon={NODE_ICONS.split} />,
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
