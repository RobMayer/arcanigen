import { nanoid } from "nanoid";
import styled from "styled-components";
import { passthroughCanInterject, passthroughInterject } from "../../helpers/nodeHelper";
import { Icon, ICONS, NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { SliderInput } from "../../../components/inputs/SliderInput";
import { ColorHexInput } from "../../../components/inputs/ColorHexInput";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { LoopButton } from "../../../components/buttons/LoopButton";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { SocketTypes } from "../../socketTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { NumericString } from "../../datatypes/numericString";
import { Length } from "../../datatypes/length";
import { PointHelper } from "../../helpers/pointHelper";
import { Color } from "../../datatypes/color";
import { Enum } from "../../datatypes/enum";
import { FilterPrimitive } from "../../shapeTypes";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const MODE_OPTIONS = [
    { value: `${Enum.Common.positionMode.CARTESIAN.value}`, label: <Icon shape={ICONS.Coordinates.Cartesian} /> },
    { value: `${Enum.Common.positionMode.POLAR.value}`, label: <Icon shape={ICONS.Coordinates.Polar} /> },
];

const PointRow = styled.div`
    display: flex;
    align-items: center;
    gap: 3px;
    width: 100%;

    & > .pointField {
        flex: 1 1 0;
        width: 0;
        min-width: 0;
    }
`;

const def = signature({
    in: {
        input: "shape",
        artColor: "boolean",
        color: "color",
        blur: "length",
        spread: "length",
        strength: "float",
        opacity: "float",
        offset: "point",
    },
    out: { output: "shape" },
});

export type GlowEffectDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        artColor: DataTypes.TypeOf<DataTypes.Boolean>;
        color: DataTypes.TypeOf<DataTypes.Color>;
        blur: DataTypes.TypeOf<DataTypes.Length>;
        spread: DataTypes.TypeOf<DataTypes.Length>;
        strength: DataTypes.TypeOf<DataTypes.Float>;
        opacity: DataTypes.TypeOf<DataTypes.Float>;
        offsetMode: DataTypes.TypeOf<DataTypes.Enum>;
        offsetX: DataTypes.TypeOf<DataTypes.Length>;
        offsetY: DataTypes.TypeOf<DataTypes.Length>;
        offsetRadius: DataTypes.TypeOf<DataTypes.Length>;
        offsetTheta: DataTypes.TypeOf<DataTypes.Angle>;
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<GlowEffectDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"glowEffect", GlowEffectDefinition> => {
    return {
        id,
        in: {
            input: null,
            artColor: null,
            color: null,
            blur: null,
            spread: null,
            strength: null,
            opacity: null,
            offset: null,
        },
        out: { output: [] },
        payload: {
            label: "",
            artColor: false,
            color: { r: 0, g: 0, b: 0, a: 1 },
            blur: "1px",
            spread: "1px",
            strength: "1",
            opacity: "0.5",
            offsetMode: Enum.Common.positionMode.CARTESIAN.value,
            offsetX: "0px",
            offsetY: "0px",
            offsetRadius: "0px",
            offsetTheta: "0deg",
        },
        type: "glowEffect",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<GlowEffectDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<GlowEffectDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const isPolar = node.payload.offsetMode === Enum.Common.positionMode.POLAR.value;
    const offsetConnected = node.in.offset !== null;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"input"}>
                Input
            </SocketIn>
            <SocketIn node={node} socketId={"color"} label={"Color"}>
                <ColorHexInput value={node.payload.color} onCommit={(color) => handleUpdate({ color })} required alpha disabled={node.in.color !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"artColor"}>
                <CheckBox checked={node.payload.artColor} onToggle={(artColor) => handleUpdate({ artColor })} disabled={node.in.artColor !== null}>
                    Use Art Color
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"blur"} label={"Blur"}>
                <LengthInput value={node.payload.blur} onCommit={(blur) => handleUpdate({ blur })} disabled={node.in.blur !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"spread"} label={"Spread"}>
                <LengthInput value={node.payload.spread} onCommit={(spread) => handleUpdate({ spread })} disabled={node.in.spread !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"strength"} label={"Strength"}>
                <SliderInput value={node.payload.strength} onCommit={(strength) => handleUpdate({ strength })} disabled={node.in.strength !== null} min={"0"} max={"5"} step={"0.01"} />
            </SocketIn>
            <SocketIn node={node} socketId={"opacity"} label={"Opacity"}>
                <SliderInput value={node.payload.opacity} onCommit={(opacity) => handleUpdate({ opacity })} disabled={node.in.opacity !== null} min={"0"} max={"1"} step={"0.001"} />
            </SocketIn>
            <SocketIn node={node} socketId={"offset"} label={"Offset"}>
                <PointRow>
                    <LoopButton.Lite value={`${node.payload.offsetMode}`} options={MODE_OPTIONS} onValue={(v) => handleUpdate({ offsetMode: Number(v) })} disabled={offsetConnected} />
                    {isPolar ? (
                        <>
                            <LengthInput className={"pointField"} value={node.payload.offsetRadius} onCommit={(offsetRadius) => handleUpdate({ offsetRadius })} disabled={offsetConnected} required />
                            <AngleInput className={"pointField"} value={node.payload.offsetTheta} onCommit={(offsetTheta) => handleUpdate({ offsetTheta })} disabled={offsetConnected} />
                        </>
                    ) : (
                        <>
                            <LengthInput className={"pointField"} value={node.payload.offsetX} onCommit={(offsetX) => handleUpdate({ offsetX })} disabled={offsetConnected} required />
                            <LengthInput className={"pointField"} value={node.payload.offsetY} onCommit={(offsetY) => handleUpdate({ offsetY })} disabled={offsetConnected} required />
                        </>
                    )}
                </PointRow>
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<GlowEffectDefinition>, outSocket: "output", _deps: AllDeps): (keyof GlowEffectDefinition["inputs"])[] => {
    if (outSocket === "output") return ["input", "artColor", "color", "blur", "spread", "strength", "opacity", "offset"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<GlowEffectDefinition>, _inSocket: keyof GlowEffectDefinition["inputs"], _deps: AllDeps): (keyof GlowEffectDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<GlowEffectDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const inputShape = context.resolve<DataTypes.Shape>(node.id, "input")?.data;
    if (!inputShape) return null;

    const artColor: boolean = context.resolve<DataTypes.Boolean>(node.id, "artColor")?.data ?? node.payload.artColor;
    const color: Color.Type = context.resolve<DataTypes.Color>(node.id, "color")?.data ?? node.payload.color;
    const blurPx = Math.max(0, Length.Emptyable.asNumber(context.resolve<DataTypes.Length>(node.id, "blur")?.data ?? node.payload.blur) ?? 0);
    const spreadPx = Math.max(0, Length.Emptyable.asNumber(context.resolve<DataTypes.Length>(node.id, "spread")?.data ?? node.payload.spread) ?? 0);
    const strength = Math.max(0, NumericString.Emptyable.asNumber(context.resolve<DataTypes.Float>(node.id, "strength")?.data ?? node.payload.strength) ?? 1);
    const opacity = Math.max(0, Math.min(1, NumericString.Emptyable.asNumber(context.resolve<DataTypes.Float>(node.id, "opacity")?.data ?? node.payload.opacity) ?? 1));

    const offset =
        context.resolve<DataTypes.Point>(node.id, "offset")?.data ??
        PointHelper.resolve(node.payload.offsetMode, node.payload.offsetX, node.payload.offsetY, node.payload.offsetRadius, node.payload.offsetTheta);
    const dx = offset.x;
    const dy = offset.y;

    const filter: FilterPrimitive[] = [];
    let lastResult = "SourceGraphic";

    if (!artColor && color !== null) {
        // Colored glow: flood + clip to source alpha
        const hex = Color.toHex(color).slice(0, 7); // RGB only
        filter.push({ tag: "feFlood", attrs: { "flood-color": hex, "flood-opacity": color.a, result: "flood" } });
        filter.push({ tag: "feComposite", attrs: { in: "flood", in2: "SourceAlpha", operator: "in", result: "silhouette" } });
        lastResult = "silhouette";
    }

    if (spreadPx > 0) {
        filter.push({ tag: "feMorphology", attrs: { in: lastResult, operator: "dilate", radius: spreadPx, result: "spread" } });
        lastResult = "spread";
    }

    filter.push({ tag: "feGaussianBlur", attrs: { in: lastResult, stdDeviation: blurPx, result: "blurred" } });
    lastResult = "blurred";

    // Scale alpha by strength * opacity
    const alphaScale = strength * opacity;
    if (alphaScale !== 1) {
        // prettier-ignore
        filter.push({ tag: "feColorMatrix", attrs: { in: lastResult, type: "matrix", values: `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${alphaScale} 0`, result: "scaled" } });
        lastResult = "scaled";
    }

    if (dx !== 0 || dy !== 0) {
        filter.push({ tag: "feOffset", attrs: { in: lastResult, dx, dy, result: "offset" } });
        lastResult = "offset";
    }

    // Layer original on top of glow
    filter.push({ tag: "feBlend", attrs: { in: "SourceGraphic", in2: lastResult, mode: "normal" } });

    return {
        kind: "shape",
        data: {
            type: "filtered",
            content: inputShape,
            filter,
            transform: "",
            preview: inputShape.preview,
        },
    };
};

export const GlowEffectNodeType: NodeTypes.Type<"glowEffect", GlowEffectDefinition> = {
    type: "glowEffect",
    displayName: "Glow",
    defaultLabel: "Glow",
    iconNode: <NodeIcon shape={NODE_ICONS.eclipse} />,
    flavour: "emphasis",
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
