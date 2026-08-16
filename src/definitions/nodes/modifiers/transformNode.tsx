import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";
import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { SocketTypes } from "../../socketTypes";
import { ArcaneGraph } from "../../../util/structs/arcaneGraph";
import { Project } from "../../../state/project";
import { Angle } from "../../datatypes/angle";
import { NumericString } from "../../datatypes/numericString";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { PointInput } from "../../../components/inputs/PointInput";
import { PointHelper } from "../../helpers/pointHelper";
import { Shape } from "../../shapeTypes";
import { SVGPath } from "../../../types";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: {
        shape: "shape",
        path: "path",
        position: "point",
        preRotation: "angle",
        postRotation: "angle",
        skewX: "angle",
        skewY: "angle",
        scaleX: "float",
        scaleY: "float",
    },
    out: { output: "shape", pathOutput: "path" },
});

export type TransformDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        position: PointInput.Value;
        preRotation: DataTypes.TypeOf<DataTypes.Angle>;
        postRotation: DataTypes.TypeOf<DataTypes.Angle>;
        skewX: DataTypes.TypeOf<DataTypes.Angle>;
        skewY: DataTypes.TypeOf<DataTypes.Angle>;
        scaleX: DataTypes.TypeOf<DataTypes.Float>;
        scaleY: DataTypes.TypeOf<DataTypes.Float>;
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<TransformDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"transform", TransformDefinition> => {
    return {
        id,
        in: {
            shape: null,
            path: null,
            position: null,
            preRotation: null,
            postRotation: null,
            skewX: null,
            skewY: null,
            scaleX: null,
            scaleY: null,
        },
        out: {
            output: [],
            pathOutput: [],
        },
        payload: {
            label: "",
            position: { ...PointInput.DEFAULT },
            preRotation: "0deg",
            postRotation: "0deg",
            skewX: "0deg",
            skewY: "0deg",
            scaleX: "1",
            scaleY: "1",
        },
        type: "transform",
    };
};

const Controls =({ node, methods }: { node: NodeDefinitions.NodeFor<TransformDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<TransformDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const positionConnected = node.in.position !== null;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Shape
            </SocketOut>
            <SocketIn node={node} socketId={"shape"}>
                Shape
            </SocketIn>
            <hr />
            <SocketOut node={node} socketId={"pathOutput"}>
                Path
            </SocketOut>
            <SocketIn node={node} socketId={"path"}>
                Path
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"position"} label={"Position"}>
                <PointInput value={node.payload.position} onChange={(v) => handleUpdate({ position: { ...node.payload.position, ...v } })} disabled={positionConnected} />
            </SocketIn>
            <NodeAccordion label={"Rotation"} nodeId={node.id} socketsIn={"preRotation|postRotation"}>
                <SocketIn node={node} socketId={"preRotation"} label={"Pre-Rotation"}>
                    <AngleInput.SliderInput value={node.payload.preRotation} onCommit={(preRotation) => handleUpdate({ preRotation })} disabled={node.in.preRotation !== null} />
                </SocketIn>
                <SocketIn node={node} socketId={"postRotation"} label={"Post-Rotation"}>
                    <AngleInput.SliderInput value={node.payload.postRotation} onCommit={(postRotation) => handleUpdate({ postRotation })} disabled={node.in.postRotation !== null} />
                </SocketIn>
            </NodeAccordion>
            <NodeAccordion label={"Skew"} nodeId={node.id} socketsIn={"skewX|skewY"}>
                <SocketIn node={node} socketId={"skewX"} label={"Skew X"}>
                    <AngleInput.SliderInput value={node.payload.skewX} onCommit={(skewX) => handleUpdate({ skewX })} disabled={node.in.skewX !== null} />
                </SocketIn>
                <SocketIn node={node} socketId={"skewY"} label={"Skew Y"}>
                    <AngleInput.SliderInput value={node.payload.skewY} onCommit={(skewY) => handleUpdate({ skewY })} disabled={node.in.skewY !== null} />
                </SocketIn>
            </NodeAccordion>
            <NodeAccordion label={"Scale"} nodeId={node.id} socketsIn={"scaleX|scaleY"}>
                <SocketIn node={node} socketId={"scaleX"} label={"Scale X"}>
                    <DecimalInput value={node.payload.scaleX} onCommit={(scaleX) => handleUpdate({ scaleX })} disabled={node.in.scaleX !== null} />
                </SocketIn>
                <SocketIn node={node} socketId={"scaleY"} label={"Scale Y"}>
                    <DecimalInput value={node.payload.scaleY} onCommit={(scaleY) => handleUpdate({ scaleY })} disabled={node.in.scaleY !== null} />
                </SocketIn>
            </NodeAccordion>
        </TypicalNode>
    );
};

const PARAM_INPUTS: (keyof TransformDefinition["inputs"])[] = ["position", "preRotation", "postRotation", "skewX", "skewY", "scaleX", "scaleY"];

const dependsOn = (_node: NodeDefinitions.NodeFor<TransformDefinition>, outSocket: keyof TransformDefinition["outputs"], _deps: AllDeps): (keyof TransformDefinition["inputs"])[] => {
    if (outSocket === "output") return ["shape", ...PARAM_INPUTS];
    if (outSocket === "pathOutput") return ["path", ...PARAM_INPUTS];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<TransformDefinition>, _inSocket: keyof TransformDefinition["inputs"], _deps: AllDeps): (keyof TransformDefinition["outputs"])[] => {
    return ["output", "pathOutput"];
};

/** Resolves all transform parameters and builds a CSS transform string + translation offsets */
const resolveTransform = (node: NodeDefinitions.NodeFor<TransformDefinition>, context: Resolver.Context): { css: string; translateX: number; translateY: number } => {
    const position = context.resolve<DataTypes.Point>(node.id, "position")?.data ?? PointHelper.fromAuthoring(node.payload.position);
    const preRotation = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "preRotation")?.data ?? node.payload.preRotation) ?? 0;
    const postRotation = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "postRotation")?.data ?? node.payload.postRotation) ?? 0;
    const skewX = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "skewX")?.data ?? node.payload.skewX) ?? 0;
    const skewY = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "skewY")?.data ?? node.payload.skewY) ?? 0;
    const scaleX = NumericString.Emptyable.asNumber(context.resolve<DataTypes.Float>(node.id, "scaleX")?.data ?? node.payload.scaleX) ?? 1;
    const scaleY = NumericString.Emptyable.asNumber(context.resolve<DataTypes.Float>(node.id, "scaleY")?.data ?? node.payload.scaleY) ?? 1;

    const translateX = position.x;
    const translateY = position.y;

    // Build transform string: postRotation translate preRotation skewX skewY scale
    // SVG applies right-to-left: scale -> skewY -> skewX -> preRotate -> translate -> postRotate
    const parts: string[] = [];
    if (postRotation !== 0) parts.push(`rotate(${postRotation})`);
    if (translateX !== 0 || translateY !== 0) parts.push(`translate(${translateX}, ${translateY})`);
    if (preRotation !== 0) parts.push(`rotate(${preRotation})`);
    if (skewX !== 0) parts.push(`skewX(${skewX})`);
    if (skewY !== 0) parts.push(`skewY(${skewY})`);
    if (scaleX !== 1 || scaleY !== 1) parts.push(`scale(${scaleX}, ${scaleY})`);

    return { css: parts.join(" "), translateX, translateY };
};

const evaluate = (node: NodeDefinitions.NodeFor<TransformDefinition>, socket: keyof TransformDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const inputShape = context.resolve<DataTypes.Shape>(node.id, "shape")?.data;
        if (!inputShape) return null;

        const { css } = resolveTransform(node, context);
        const newTransform = [css, inputShape.transform].filter(Boolean).join(" ");
        const shape: Shape = {
            ...inputShape,
            transform: newTransform,
        };
        return { kind: "shape", data: shape };
    }

    if (socket === "pathOutput") {
        const inputPath = context.resolve<DataTypes.Path>(node.id, "path")?.data;
        if (!inputPath) return null;

        const { css } = resolveTransform(node, context);
        const newTransform = [css, inputPath.transform].filter(Boolean).join(" ");
        const path: SVGPath = {
            ...inputPath,
            transform: newTransform,
        };
        return { kind: "path", data: path };
    }

    return null;
};

const SHAPE_IN: SocketTypes.Term = SocketTypes.of(DataTypes.SHAPE);
const SHAPE_OUT: SocketTypes.Term = SocketTypes.of(DataTypes.SHAPE);
const PATH_IN: SocketTypes.Term = SocketTypes.of(DataTypes.PATH);
const PATH_OUT: SocketTypes.Term = SocketTypes.of(DataTypes.PATH);

const canInterject = (link: ArcaneGraph.Link, graphId: string, ctx: NodeTypes.MethodContext): boolean => {
    const fromNode = ctx.getNode(graphId, link.fromNode);
    const toNode = ctx.getNode(graphId, link.toNode);
    if (!fromNode || !toNode) return false;
    const sourceOut = NodeTypes.getSocketType(fromNode, link.fromSocket, "out", graphId, ctx);
    const destIn = NodeTypes.getSocketType(toNode, link.toSocket, "in", graphId, ctx);
    if (SocketTypes.canFlow(sourceOut, SHAPE_IN) && SocketTypes.canFlow(SHAPE_OUT, destIn)) return true;
    if (SocketTypes.canFlow(sourceOut, PATH_IN) && SocketTypes.canFlow(PATH_OUT, destIn)) return true;
    return false;
};

const onInterjectTransform = (node: NodeDefinitions.NodeFor<NodeDefinitions.Generic>, link: ArcaneGraph.Link, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const fromNode = ctx.getNode(graphId, link.fromNode);
    if (!fromNode) return;
    const sourceOut = NodeTypes.getSocketType(fromNode, link.fromSocket, "out", graphId, ctx);
    ctx.removeLinks(graphId, link.id);
    if (SocketTypes.canFlow(sourceOut, PATH_IN)) {
        ctx.connect(graphId, link.fromNode, node.id, link.fromSocket, "path");
        ctx.connect(graphId, node.id, link.toNode, "pathOutput", link.toSocket);
    } else {
        ctx.connect(graphId, link.fromNode, node.id, link.fromSocket, "shape");
        ctx.connect(graphId, node.id, link.toNode, "output", link.toSocket);
    }
};

export const TransformType: NodeTypes.Type<"transform", TransformDefinition> = {
    type: "transform",
    displayName: "Transform",
    defaultLabel: "Transform",
    iconNode: <NodeIcon shape={NODE_ICONS.dolly} />,
    flavour: "emphasis",
    category: "Modifiers",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    signature: def.instance,
    ...SignatureEngine.hooks,
    canInterject,
    onInterject: onInterjectTransform,
};
