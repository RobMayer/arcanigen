import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";
import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Enum } from "../../datatypes/enum";
import { Length } from "../../datatypes/length";
import { NumericString } from "../../datatypes/numericString";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { Shape } from "../../shapeTypes";
import { SVGPath } from "../../../types";

export type TransformDefinition = {
    inputs: {
        shape: DataTypes.Use<"shape">;
        path: DataTypes.Use<"path">;
        positionMode: DataTypes.Use<"enum">;
        positionX: DataTypes.Use<"length">;
        positionY: DataTypes.Use<"length">;
        positionRadius: DataTypes.Use<"length">;
        positionTheta: DataTypes.Use<"angle">;
        preRotation: DataTypes.Use<"angle">;
        postRotation: DataTypes.Use<"angle">;
        skewX: DataTypes.Use<"angle">;
        skewY: DataTypes.Use<"angle">;
        scaleX: DataTypes.Use<"float">;
        scaleY: DataTypes.Use<"float">;
    };
    outputs: {
        output: DataTypes.Use<"shape">;
        pathOutput: DataTypes.Use<"path">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        positionMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        positionX: DataTypes.TypeOf<DataTypes.Use<"length">>;
        positionY: DataTypes.TypeOf<DataTypes.Use<"length">>;
        positionRadius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        positionTheta: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        preRotation: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        postRotation: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        skewX: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        skewY: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        scaleX: DataTypes.TypeOf<DataTypes.Use<"float">>;
        scaleY: DataTypes.TypeOf<DataTypes.Use<"float">>;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<TransformDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"transform", TransformDefinition> => {
    return {
        id,
        in: {
            shape: null,
            path: null,
            positionMode: null,
            positionX: null,
            positionY: null,
            positionRadius: null,
            positionTheta: null,
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
            positionMode: Enum.Common.positionMode.CARTESIAN.value,
            positionX: "0px",
            positionY: "0px",
            positionRadius: "0px",
            positionTheta: "0",
            preRotation: "0",
            postRotation: "0",
            skewX: "0",
            skewY: "0",
            scaleX: "1",
            scaleY: "1",
        },
        type: "transform",
    };
};

const POSITION_MODE_OPTIONS = Enum.options(Enum.Common.positionMode);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<TransformDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<TransformDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const isCartesian = node.payload.positionMode === Enum.Common.positionMode.CARTESIAN.value;
    const isPolar = node.payload.positionMode === Enum.Common.positionMode.POLAR.value;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"shape"}>
                Shape
            </SocketOut>
            <SocketIn node={node} socketId={"shape"} type={"shape"}>
                Shape
            </SocketIn>
            <SocketOut node={node} socketId={"pathOutput"} type={"path"}>
                Path
            </SocketOut>
            <SocketIn node={node} socketId={"path"} type={"path"}>
                Path
            </SocketIn>
            <hr />
            <NodeAccordion label={"Translate"} nodeId={node.id} socketsIn={"positionMode|positionX|positionY|positionRadius|positionTheta"}>
                <SocketIn node={node} socketId={"positionMode"} type={"enum"} label={"Mode"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.positionMode}`}
                        onValue={(v) => handleUpdate({ positionMode: Number(v) })}
                        disabled={node.in.positionMode !== null}
                        options={POSITION_MODE_OPTIONS}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"positionX"} type={"length"} label={"X"}>
                    <LengthInput value={node.payload.positionX} onCommit={(positionX) => handleUpdate({ positionX })} disabled={node.in.positionX !== null || isPolar} required />
                </SocketIn>
                <SocketIn node={node} socketId={"positionY"} type={"length"} label={"Y"}>
                    <LengthInput value={node.payload.positionY} onCommit={(positionY) => handleUpdate({ positionY })} disabled={node.in.positionY !== null || isPolar} required />
                </SocketIn>
                <SocketIn node={node} socketId={"positionRadius"} type={"length"} label={"Radius"}>
                    <LengthInput
                        value={node.payload.positionRadius}
                        onCommit={(positionRadius) => handleUpdate({ positionRadius })}
                        disabled={node.in.positionRadius !== null || isCartesian}
                        required
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"positionTheta"} type={"angle"} label={"Theta"}>
                    <AngleInput.SliderInput value={node.payload.positionTheta} onCommit={(positionTheta) => handleUpdate({ positionTheta })} disabled={node.in.positionTheta !== null || isCartesian} />
                </SocketIn>
            </NodeAccordion>
            <NodeAccordion label={"Rotation"} nodeId={node.id} socketsIn={"preRotation|postRotation"}>
                <SocketIn node={node} socketId={"preRotation"} type={"angle"} label={"Pre-Rotation"}>
                    <AngleInput.SliderInput value={node.payload.preRotation} onCommit={(preRotation) => handleUpdate({ preRotation })} disabled={node.in.preRotation !== null} />
                </SocketIn>
                <SocketIn node={node} socketId={"postRotation"} type={"angle"} label={"Post-Rotation"}>
                    <AngleInput.SliderInput value={node.payload.postRotation} onCommit={(postRotation) => handleUpdate({ postRotation })} disabled={node.in.postRotation !== null} />
                </SocketIn>
            </NodeAccordion>
            <NodeAccordion label={"Skew"} nodeId={node.id} socketsIn={"skewX|skewY"}>
                <SocketIn node={node} socketId={"skewX"} type={"angle"} label={"Skew X"}>
                    <AngleInput.SliderInput value={node.payload.skewX} onCommit={(skewX) => handleUpdate({ skewX })} disabled={node.in.skewX !== null} />
                </SocketIn>
                <SocketIn node={node} socketId={"skewY"} type={"angle"} label={"Skew Y"}>
                    <AngleInput.SliderInput value={node.payload.skewY} onCommit={(skewY) => handleUpdate({ skewY })} disabled={node.in.skewY !== null} />
                </SocketIn>
            </NodeAccordion>
            <NodeAccordion label={"Scale"} nodeId={node.id} socketsIn={"scaleX|scaleY"}>
                <SocketIn node={node} socketId={"scaleX"} type={"float"} label={"Scale X"}>
                    <DecimalInput value={node.payload.scaleX} onCommit={(scaleX) => handleUpdate({ scaleX })} disabled={node.in.scaleX !== null} />
                </SocketIn>
                <SocketIn node={node} socketId={"scaleY"} type={"float"} label={"Scale Y"}>
                    <DecimalInput value={node.payload.scaleY} onCommit={(scaleY) => handleUpdate({ scaleY })} disabled={node.in.scaleY !== null} />
                </SocketIn>
            </NodeAccordion>
        </TypicalNode>
    );
};

const PARAM_INPUTS: (keyof TransformDefinition["inputs"])[] = [
    "positionMode",
    "positionX",
    "positionY",
    "positionRadius",
    "positionTheta",
    "preRotation",
    "postRotation",
    "skewX",
    "skewY",
    "scaleX",
    "scaleY",
];

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
    const positionMode = Enum.resolve(context.resolve<"enum">(node.id, "positionMode")?.data, Enum.Common.positionMode) ?? node.payload.positionMode;
    const positionX = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "positionX")?.data ?? node.payload.positionX) ?? 0;
    const positionY = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "positionY")?.data ?? node.payload.positionY) ?? 0;
    const positionRadius = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "positionRadius")?.data ?? node.payload.positionRadius) ?? 0;
    const positionTheta = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "positionTheta")?.data ?? node.payload.positionTheta) ?? 0;
    const preRotation = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "preRotation")?.data ?? node.payload.preRotation) ?? 0;
    const postRotation = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "postRotation")?.data ?? node.payload.postRotation) ?? 0;
    const skewX = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "skewX")?.data ?? node.payload.skewX) ?? 0;
    const skewY = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "skewY")?.data ?? node.payload.skewY) ?? 0;
    const scaleX = NumericString.Emptyable.asNumber(context.resolve<"float">(node.id, "scaleX")?.data ?? node.payload.scaleX) ?? 1;
    const scaleY = NumericString.Emptyable.asNumber(context.resolve<"float">(node.id, "scaleY")?.data ?? node.payload.scaleY) ?? 1;

    // Resolve translation
    let translateX: number;
    let translateY: number;
    if (positionMode === Enum.Common.positionMode.POLAR.value) {
        const thetaRad = ((positionTheta - 90) * Math.PI) / 180;
        translateX = positionRadius * Math.cos(thetaRad);
        translateY = positionRadius * Math.sin(thetaRad);
    } else {
        translateX = positionX;
        translateY = positionY;
    }

    // Build transform string: postRotation translate preRotation skewX skewY scale
    // SVG applies right-to-left: scale → skewY → skewX → preRotate → translate → postRotate
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
        const inputShape = context.resolve<"shape">(node.id, "shape")?.data;
        if (!inputShape) return null;

        const { css, translateX, translateY } = resolveTransform(node, context);
        const newTransform = [css, inputShape.transform].filter(Boolean).join(" ");
        const shape: Shape = {
            ...inputShape,
            transform: newTransform,
            preview: { ...inputShape.preview, x: inputShape.preview.x + translateX, y: inputShape.preview.y + translateY },
        };
        return { kind: "shape", data: shape };
    }

    if (socket === "pathOutput") {
        const inputPath = context.resolve<"path">(node.id, "path")?.data;
        if (!inputPath) return null;

        const { css, translateX, translateY } = resolveTransform(node, context);
        const newTransform = [css, inputPath.transform].filter(Boolean).join(" ");
        const path: SVGPath = {
            ...inputPath,
            transform: newTransform,
            preview: { ...inputPath.preview, x: inputPath.preview.x + translateX, y: inputPath.preview.y + translateY },
        };
        return { kind: "path", data: path };
    }

    return null;
};

const SOCKETTYPES_IN: { [key in keyof Required<TransformDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    shape: { types: ["shape"], mode: "or" },
    path: { types: ["path"], mode: "or" },
    positionMode: { types: ["enum"], mode: "or" },
    positionX: { types: ["length"], mode: "or" },
    positionY: { types: ["length"], mode: "or" },
    positionRadius: { types: ["length"], mode: "or" },
    positionTheta: { types: ["angle"], mode: "or" },
    preRotation: { types: ["angle"], mode: "or" },
    postRotation: { types: ["angle"], mode: "or" },
    skewX: { types: ["angle"], mode: "or" },
    skewY: { types: ["angle"], mode: "or" },
    scaleX: { types: ["float"], mode: "or" },
    scaleY: { types: ["float"], mode: "or" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<TransformDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["shape"], mode: "and" },
    pathOutput: { types: ["path"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<TransformDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    if (side === "in") return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
    return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
};

export const TransformType: NodeTypes.Type<"transform", TransformDefinition> = {
    type: "transform",
    displayName: "Transform",
    defaultLabel: "Transform",
    iconNode: <Icon shape={NODE_ICONS.transform.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.transform.Card} color={"var(--icon-flavour)"} />,
    category: "Collections",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    getSocketType,
};
