import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject } from "../../helpers/nodeHelper";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { SocketTypes } from "../../socketTypes";
import { Project } from "../../../state/project";
import { GroupShape } from "../../shapeTypes";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { input: "shape", points: $.arrayOf("point") },
    out: { output: "shape", sequence: "sequence" },
});

export type ScatterLayoutDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
    }
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<ScatterLayoutDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"scatterLayout", ScatterLayoutDefinition> => {
    return {
        id,
        in: {
            input: null,
            points: null,
        },
        out: {
            output: [],
            sequence: [],
        },
        payload: {
            label: "",
            ...input,
        },
        type: "scatterLayout",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ScatterLayoutDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"input"}>
                Input
            </SocketIn>
            <SocketIn node={node} socketId={"points"}>
                Points
            </SocketIn>
            <SocketOut node={node} socketId={"sequence"}>
                Sequence
            </SocketOut>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<ScatterLayoutDefinition>, outSocket: keyof ScatterLayoutDefinition["outputs"], _deps: AllDeps): (keyof ScatterLayoutDefinition["inputs"])[] => {
    if (outSocket === "output") {
        return ["input", "points"];
    }
    if (outSocket === "sequence") {
        return ["points"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ScatterLayoutDefinition>, inSocket: keyof ScatterLayoutDefinition["inputs"], _deps: AllDeps): (keyof ScatterLayoutDefinition["outputs"])[] => {
    if (inSocket === "points") {
        return ["output", "sequence"];
    }
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<ScatterLayoutDefinition>, socket: keyof ScatterLayoutDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const points = context.resolve<DataTypes.ArrayOf<DataTypes.Point>>(node.id, "points")?.data ?? null;

    if (socket === "sequence") {
        return { kind: "sequence", data: { senderId: node.id, count: points?.length ?? 0 } };
    }

    if (socket !== "output") return null;
    if (!points || points.length === 0) return null;

    const children: GroupShape[] = [];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < points.length; i++) {
        // Sequence-resolve the member so upstream iterators can vary it per index.
        const shape = context.resolve<DataTypes.Shape>(node.id, "input", { ...context.cursorData, [node.id]: i })?.data ?? null;
        if (shape === null) continue;

        const { x, y } = points[i];
        children.push({ type: "group", children: [shape], transform: `translate(${x}, ${y})`, preview: shape.preview });

        // Union the member's (translated) bounds for the group preview.
        const pv = shape.preview;
        minX = Math.min(minX, x + pv.x);
        minY = Math.min(minY, y + pv.y);
        maxX = Math.max(maxX, x + pv.x + pv.w);
        maxY = Math.max(maxY, y + pv.y + pv.h);
    }

    if (children.length === 0) return null;

    const group: GroupShape = {
        type: "group",
        children,
        transform: "",
        preview: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
    };

    return { kind: "shape", data: group };
};

export const ScatterLayoutNodeType: NodeTypes.Type<"scatterLayout", ScatterLayoutDefinition> = {
    type: "scatterLayout",
    displayName: "Scatter Layout",
    defaultLabel: "Scatter Layout",
    iconNode: <NodeIcon shape={NODE_ICONS.point} modifierIcon={NODE_ICONS.modifiers.patternFor} />,
    flavour: "danger",
    category: "Modifiers",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
    canInterject: passthroughCanInterject(SocketTypes.of(DataTypes.SHAPE), SocketTypes.of(DataTypes.SHAPE)),
    onInterject: passthroughInterject("input", "output"),
};
