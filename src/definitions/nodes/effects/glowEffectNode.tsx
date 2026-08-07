import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject } from "../nodeHelpers";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { SliderInput } from "../../../components/inputs/SliderInput";
import { ColorHexInput } from "../../../components/inputs/ColorHexInput";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { NumericString } from "../../datatypes/numericString";
import { Length } from "../../datatypes/length";
import { Color } from "../../datatypes/color";
import { Enum } from "../../datatypes/enum";
import { FilterPrimitive } from "../../shapeTypes";

const OFFSET_MODE_OPTIONS = Enum.options(Enum.Common.positionMode);

export type GlowEffectDefinition = {
    inputs: {
        input: DataTypes.Use<"shape">;
        artColor: DataTypes.Use<"boolean">;
        color: DataTypes.Use<"color">;
        blur: DataTypes.Use<"length">;
        spread: DataTypes.Use<"length">;
        strength: DataTypes.Use<"float">;
        opacity: DataTypes.Use<"float">;
        offsetMode: DataTypes.Use<"enum">;
        offsetX: DataTypes.Use<"length">;
        offsetY: DataTypes.Use<"length">;
        offsetRadius: DataTypes.Use<"length">;
        offsetTheta: DataTypes.Use<"angle">;
    };
    outputs: {
        output: DataTypes.Use<"shape">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        artColor: DataTypes.TypeOf<DataTypes.Use<"boolean">>;
        color: DataTypes.TypeOf<DataTypes.Use<"color">>;
        blur: DataTypes.TypeOf<DataTypes.Use<"length">>;
        spread: DataTypes.TypeOf<DataTypes.Use<"length">>;
        strength: DataTypes.TypeOf<DataTypes.Use<"float">>;
        opacity: DataTypes.TypeOf<DataTypes.Use<"float">>;
        offsetMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        offsetX: DataTypes.TypeOf<DataTypes.Use<"length">>;
        offsetY: DataTypes.TypeOf<DataTypes.Use<"length">>;
        offsetRadius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        offsetTheta: DataTypes.TypeOf<DataTypes.Use<"angle">>;
    };
};

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
            offsetMode: null,
            offsetX: null,
            offsetY: null,
            offsetRadius: null,
            offsetTheta: null,
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
            offsetTheta: "0",
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

    const isCartesian = node.payload.offsetMode === Enum.Common.positionMode.CARTESIAN.value;
    const isPolar = node.payload.offsetMode === Enum.Common.positionMode.POLAR.value;

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
            <SocketIn node={node} socketId={"offsetMode"} label={"Offset Mode"}>
                <RadioButton.Group
                    orientation={"horizontal"}
                    value={`${node.payload.offsetMode}`}
                    onValue={(v) => handleUpdate({ offsetMode: Number(v) })}
                    disabled={node.in.offsetMode !== null}
                    options={OFFSET_MODE_OPTIONS}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"offsetX"} label={"Offset X"}>
                <LengthInput value={node.payload.offsetX} onCommit={(offsetX) => handleUpdate({ offsetX })} disabled={node.in.offsetX !== null || isPolar} required />
            </SocketIn>
            <SocketIn node={node} socketId={"offsetY"} label={"Offset Y"}>
                <LengthInput value={node.payload.offsetY} onCommit={(offsetY) => handleUpdate({ offsetY })} disabled={node.in.offsetY !== null || isPolar} required />
            </SocketIn>
            <SocketIn node={node} socketId={"offsetRadius"} label={"Offset Radius"}>
                <LengthInput value={node.payload.offsetRadius} onCommit={(offsetRadius) => handleUpdate({ offsetRadius })} disabled={node.in.offsetRadius !== null || isCartesian} required />
            </SocketIn>
            <SocketIn node={node} socketId={"offsetTheta"} label={"Offset Angle"}>
                <AngleInput.SliderInput value={node.payload.offsetTheta} onCommit={(offsetTheta) => handleUpdate({ offsetTheta })} disabled={node.in.offsetTheta !== null || isCartesian} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<GlowEffectDefinition>, outSocket: "output", _deps: AllDeps): (keyof GlowEffectDefinition["inputs"])[] => {
    if (outSocket === "output") return ["input", "artColor", "color", "blur", "spread", "strength", "opacity", "offsetMode", "offsetX", "offsetY", "offsetRadius", "offsetTheta"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<GlowEffectDefinition>, _inSocket: keyof GlowEffectDefinition["inputs"], _deps: AllDeps): (keyof GlowEffectDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<GlowEffectDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const inputShape = context.resolve<"shape">(node.id, "input")?.data;
    if (!inputShape) return null;

    const artColor: boolean = context.resolve<"boolean">(node.id, "artColor")?.data ?? node.payload.artColor;
    const color: Color.Type = context.resolve<"color">(node.id, "color")?.data ?? node.payload.color;
    const blurPx = Math.max(0, Length.Emptyable.asNumber(context.resolve<"length">(node.id, "blur")?.data ?? node.payload.blur) ?? 0);
    const spreadPx = Math.max(0, Length.Emptyable.asNumber(context.resolve<"length">(node.id, "spread")?.data ?? node.payload.spread) ?? 0);
    const strength = Math.max(0, NumericString.Emptyable.asNumber(context.resolve<"float">(node.id, "strength")?.data ?? node.payload.strength) ?? 1);
    const opacity = Math.max(0, Math.min(1, NumericString.Emptyable.asNumber(context.resolve<"float">(node.id, "opacity")?.data ?? node.payload.opacity) ?? 1));

    const offsetMode = Enum.resolve(context.resolve<"enum">(node.id, "offsetMode")?.data, Enum.Common.positionMode) ?? node.payload.offsetMode;
    let dx: number;
    let dy: number;
    if (offsetMode === Enum.Common.positionMode.POLAR.value) {
        const radius = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "offsetRadius")?.data ?? node.payload.offsetRadius) ?? 0;
        const theta = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "offsetTheta")?.data ?? node.payload.offsetTheta) ?? 0;
        const thetaRad = ((theta - 90) * Math.PI) / 180;
        dx = radius * Math.cos(thetaRad);
        dy = radius * Math.sin(thetaRad);
    } else {
        dx = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "offsetX")?.data ?? node.payload.offsetX) ?? 0;
        dy = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "offsetY")?.data ?? node.payload.offsetY) ?? 0;
    }

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

const SOCKETTYPES_IN: { [key in keyof GlowEffectDefinition["inputs"]]: SocketTypes.SocketRule } = {
    input: { types: ["shape"], mode: "and" },
    artColor: { types: ["boolean"], mode: "and" },
    color: { types: ["color"], mode: "and" },
    blur: { types: ["length"], mode: "and" },
    spread: { types: ["length"], mode: "and" },
    strength: { types: ["float"], mode: "and" },
    opacity: { types: ["float"], mode: "and" },
    offsetMode: { types: ["enum"], mode: "and" },
    offsetX: { types: ["length"], mode: "and" },
    offsetY: { types: ["length"], mode: "and" },
    offsetRadius: { types: ["length"], mode: "and" },
    offsetTheta: { types: ["angle"], mode: "and" },
};

const SOCKETTYPES_OUT: { [key in keyof GlowEffectDefinition["outputs"]]: SocketTypes.SocketRule } = {
    output: { types: ["shape"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<GlowEffectDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    if (side === "out") return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT] ?? { types: ["shape"], mode: "and" };
    return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN] ?? { types: ["shape"], mode: "and" };
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
    getSocketType,
    canInterject: passthroughCanInterject(SOCKETTYPES_IN.input, SOCKETTYPES_OUT.output),
    onInterject: passthroughInterject("input", "output"),
};
