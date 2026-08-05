import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { ColorHexInput } from "../../../components/inputs/ColorHexInput";
import { Project } from "../../../state/project";
import { Enum } from "../../datatypes/enum";
import { componentsFromRGB } from "../../../util/colorSpaces";

export type ColorSplitDefinition = {
    inputs: {
        input: DataTypes.Use<"color">;
    };
    outputs: {
        // RGB (0–100 float)
        rgb_r: DataTypes.Use<"float">;
        rgb_g: DataTypes.Use<"float">;
        rgb_b: DataTypes.Use<"float">;
        // RGB byte (0–255 integer)
        rgb255_r: DataTypes.Use<"integer">;
        rgb255_g: DataTypes.Use<"integer">;
        rgb255_b: DataTypes.Use<"integer">;
        // CMY
        cmy_c: DataTypes.Use<"float">;
        cmy_m: DataTypes.Use<"float">;
        cmy_y: DataTypes.Use<"float">;
        // CMYK
        cmyk_c: DataTypes.Use<"float">;
        cmyk_m: DataTypes.Use<"float">;
        cmyk_y: DataTypes.Use<"float">;
        cmyk_k: DataTypes.Use<"float">;
        // HSV
        hsv_h: DataTypes.Use<"angle">;
        hsv_s: DataTypes.Use<"float">;
        hsv_v: DataTypes.Use<"float">;
        // HSL
        hsl_h: DataTypes.Use<"angle">;
        hsl_s: DataTypes.Use<"float">;
        hsl_l: DataTypes.Use<"float">;
        // HWK
        hwk_h: DataTypes.Use<"angle">;
        hwk_w: DataTypes.Use<"float">;
        hwk_k: DataTypes.Use<"float">;
        // HSI
        hsi_h: DataTypes.Use<"angle">;
        hsi_s: DataTypes.Use<"float">;
        hsi_i: DataTypes.Use<"float">;
        // HCY
        hcy_h: DataTypes.Use<"angle">;
        hcy_c: DataTypes.Use<"float">;
        hcy_y: DataTypes.Use<"float">;
        // CIELAB
        cielab_l: DataTypes.Use<"float">;
        cielab_a: DataTypes.Use<"float">;
        cielab_b: DataTypes.Use<"float">;
        // OKLAB
        oklab_l: DataTypes.Use<"float">;
        oklab_a: DataTypes.Use<"float">;
        oklab_b: DataTypes.Use<"float">;
        // OKLCH
        oklch_l: DataTypes.Use<"float">;
        oklch_c: DataTypes.Use<"float">;
        oklch_h: DataTypes.Use<"angle">;
        // CIELCH
        cielch_l: DataTypes.Use<"float">;
        cielch_c: DataTypes.Use<"float">;
        cielch_h: DataTypes.Use<"angle">;
        // Alpha
        alpha_f: DataTypes.Use<"float">;
        alpha_b: DataTypes.Use<"integer">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        value: DataTypes.TypeOf<DataTypes.Use<"color">>;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<ColorSplitDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"colorSplit", ColorSplitDefinition> => {
    return {
        id,
        in: {
            input: null,
        },
        out: {
            rgb_r: [],
            rgb_g: [],
            rgb_b: [],
            rgb255_r: [],
            rgb255_g: [],
            rgb255_b: [],
            cmy_c: [],
            cmy_m: [],
            cmy_y: [],
            cmyk_c: [],
            cmyk_m: [],
            cmyk_y: [],
            cmyk_k: [],
            hsv_h: [],
            hsv_s: [],
            hsv_v: [],
            hsl_h: [],
            hsl_s: [],
            hsl_l: [],
            hwk_h: [],
            hwk_w: [],
            hwk_k: [],
            hsi_h: [],
            hsi_s: [],
            hsi_i: [],
            hcy_h: [],
            hcy_c: [],
            hcy_y: [],
            cielab_l: [],
            cielab_a: [],
            cielab_b: [],
            oklab_l: [],
            oklab_a: [],
            oklab_b: [],
            oklch_l: [],
            oklch_c: [],
            oklch_h: [],
            cielch_l: [],
            cielch_c: [],
            cielch_h: [],
            alpha_f: [],
            alpha_b: [],
        },
        payload: {
            label: "",
            value: input.value ?? { r: 0, g: 0, b: 0, a: 1 },
        },
        type: "colorSplit",
    };
};

type OutKey = keyof ColorSplitDefinition["outputs"];

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ColorSplitDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ColorSplitDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketIn node={node} socketId={"input"} label={"Color"}>
                <ColorHexInput value={node.payload.value} onCommit={(value) => handleUpdate({ value })} required alpha disabled={node.in.input !== null} />
            </SocketIn>
            <NodeAccordion label={"RGB"} accordionId={"rgb"} nodeId={node.id} socketsOut={"rgb_r|rgb_g|rgb_b"}>
                <SocketOut node={node} socketId={"rgb_r"}>
                    RGB: Red
                </SocketOut>
                <SocketOut node={node} socketId={"rgb_g"}>
                    RGB: Green
                </SocketOut>
                <SocketOut node={node} socketId={"rgb_b"}>
                    RGB: Blue
                </SocketOut>
            </NodeAccordion>
            <NodeAccordion label={"RGB (byte)"} accordionId={"rgb255"} nodeId={node.id} socketsOut={"rgb255_r|rgb255_g|rgb255_b"}>
                <SocketOut node={node} socketId={"rgb255_r"}>
                    RGB (byte): Red
                </SocketOut>
                <SocketOut node={node} socketId={"rgb255_g"}>
                    RGB (byte): Green
                </SocketOut>
                <SocketOut node={node} socketId={"rgb255_b"}>
                    RGB (byte): Blue
                </SocketOut>
            </NodeAccordion>
            <NodeAccordion label={"CMY"} accordionId={"cmy"} nodeId={node.id} socketsOut={"cmy_c|cmy_m|cmy_y"}>
                <SocketOut node={node} socketId={"cmy_c"}>
                    CMY: Cyan
                </SocketOut>
                <SocketOut node={node} socketId={"cmy_m"}>
                    CMY: Magenta
                </SocketOut>
                <SocketOut node={node} socketId={"cmy_y"}>
                    CMY: Yellow
                </SocketOut>
            </NodeAccordion>
            <NodeAccordion label={"CMYK"} accordionId={"cmyk"} nodeId={node.id} socketsOut={"cmyk_c|cmyk_m|cmyk_y|cmyk_k"}>
                <SocketOut node={node} socketId={"cmyk_c"}>
                    CMYK: Cyan
                </SocketOut>
                <SocketOut node={node} socketId={"cmyk_m"}>
                    CMYK: Magenta
                </SocketOut>
                <SocketOut node={node} socketId={"cmyk_y"}>
                    CMYK: Yellow
                </SocketOut>
                <SocketOut node={node} socketId={"cmyk_k"}>
                    CMYK: Key (Black)
                </SocketOut>
            </NodeAccordion>
            <NodeAccordion label={"HSV"} accordionId={"hsv"} nodeId={node.id} socketsOut={"hsv_h|hsv_s|hsv_v"}>
                <SocketOut node={node} socketId={"hsv_h"}>
                    HSV: Hue
                </SocketOut>
                <SocketOut node={node} socketId={"hsv_s"}>
                    HSV: Saturation
                </SocketOut>
                <SocketOut node={node} socketId={"hsv_v"}>
                    HSV: Value
                </SocketOut>
            </NodeAccordion>
            <NodeAccordion label={"HSL"} accordionId={"hsl"} nodeId={node.id} socketsOut={"hsl_h|hsl_s|hsl_l"}>
                <SocketOut node={node} socketId={"hsl_h"}>
                    HSL: Hue
                </SocketOut>
                <SocketOut node={node} socketId={"hsl_s"}>
                    HSL: Saturation
                </SocketOut>
                <SocketOut node={node} socketId={"hsl_l"}>
                    HSL: Lightness
                </SocketOut>
            </NodeAccordion>
            <NodeAccordion label={"HWK"} accordionId={"hwk"} nodeId={node.id} socketsOut={"hwk_h|hwk_w|hwk_k"}>
                <SocketOut node={node} socketId={"hwk_h"}>
                    HWK: Hue
                </SocketOut>
                <SocketOut node={node} socketId={"hwk_w"}>
                    HWK: Whiteness
                </SocketOut>
                <SocketOut node={node} socketId={"hwk_k"}>
                    HWK: Blackness
                </SocketOut>
            </NodeAccordion>
            <NodeAccordion label={"HSI"} accordionId={"hsi"} nodeId={node.id} socketsOut={"hsi_h|hsi_s|hsi_i"}>
                <SocketOut node={node} socketId={"hsi_h"}>
                    HSI: Hue
                </SocketOut>
                <SocketOut node={node} socketId={"hsi_s"}>
                    HSI: Saturation
                </SocketOut>
                <SocketOut node={node} socketId={"hsi_i"}>
                    HSI: Intensity
                </SocketOut>
            </NodeAccordion>
            <NodeAccordion label={"HCY"} accordionId={"hcy"} nodeId={node.id} socketsOut={"hcy_h|hcy_c|hcy_y"}>
                <SocketOut node={node} socketId={"hcy_h"}>
                    HCY: Hue
                </SocketOut>
                <SocketOut node={node} socketId={"hcy_c"}>
                    HCY: Chroma
                </SocketOut>
                <SocketOut node={node} socketId={"hcy_y"}>
                    HCY: Luma
                </SocketOut>
            </NodeAccordion>
            <NodeAccordion label={"CIELAB"} accordionId={"cielab"} nodeId={node.id} socketsOut={"cielab_l|cielab_a|cielab_b"}>
                <SocketOut node={node} socketId={"cielab_l"}>
                    CIELAB: Lightness
                </SocketOut>
                <SocketOut node={node} socketId={"cielab_a"}>
                    CIELAB: a*
                </SocketOut>
                <SocketOut node={node} socketId={"cielab_b"}>
                    CIELAB: b*
                </SocketOut>
            </NodeAccordion>
            <NodeAccordion label={"CIELCH"} accordionId={"cielch"} nodeId={node.id} socketsOut={"cielch_l|cielch_c|cielch_h"}>
                <SocketOut node={node} socketId={"cielch_l"}>
                    CIELCH: Lightness
                </SocketOut>
                <SocketOut node={node} socketId={"cielch_c"}>
                    CIELCH: Chroma
                </SocketOut>
                <SocketOut node={node} socketId={"cielch_h"}>
                    CIELCH: Hue
                </SocketOut>
            </NodeAccordion>
            <NodeAccordion label={"okLAB"} accordionId={"oklab"} nodeId={node.id} socketsOut={"oklab_l|oklab_a|oklab_b"}>
                <SocketOut node={node} socketId={"oklab_l"}>
                    OKLAB: Lightness
                </SocketOut>
                <SocketOut node={node} socketId={"oklab_a"}>
                    OKLAB: a
                </SocketOut>
                <SocketOut node={node} socketId={"oklab_b"}>
                    OKLAB: b
                </SocketOut>
            </NodeAccordion>
            <NodeAccordion label={"okLCH"} accordionId={"oklch"} nodeId={node.id} socketsOut={"oklch_l|oklch_c|oklch_h"}>
                <SocketOut node={node} socketId={"oklch_l"}>
                    OKLCH: Lightness
                </SocketOut>
                <SocketOut node={node} socketId={"oklch_c"}>
                    OKLCH: Chroma
                </SocketOut>
                <SocketOut node={node} socketId={"oklch_h"}>
                    OKLCH: Hue
                </SocketOut>
            </NodeAccordion>
            <NodeAccordion label={"Alpha"} accordionId={"alpha"} nodeId={node.id} socketsOut={"alpha_f|alpha_b"}>
                <SocketOut node={node} socketId={"alpha_f"}>
                    Alpha: as Float
                </SocketOut>
                <SocketOut node={node} socketId={"alpha_b"}>
                    Alpha: as Byte
                </SocketOut>
            </NodeAccordion>
        </TypicalNode>
    );
};

const ALL_OUT_SOCKETS: OutKey[] = [
    "rgb_r",
    "rgb_g",
    "rgb_b",
    "rgb255_r",
    "rgb255_g",
    "rgb255_b",
    "cmy_c",
    "cmy_m",
    "cmy_y",
    "cmyk_c",
    "cmyk_m",
    "cmyk_y",
    "cmyk_k",
    "hsv_h",
    "hsv_s",
    "hsv_v",
    "hsl_h",
    "hsl_s",
    "hsl_l",
    "hwk_h",
    "hwk_w",
    "hwk_k",
    "hsi_h",
    "hsi_s",
    "hsi_i",
    "hcy_h",
    "hcy_c",
    "hcy_y",
    "cielab_l",
    "cielab_a",
    "cielab_b",
    "oklab_l",
    "oklab_a",
    "oklab_b",
    "oklch_l",
    "oklch_c",
    "oklch_h",
    "cielch_l",
    "cielch_c",
    "cielch_h",
    "alpha_f",
    "alpha_b",
];

const dependsOn = (_node: NodeDefinitions.NodeFor<ColorSplitDefinition>, _outSocket: OutKey, _deps: AllDeps): (keyof ColorSplitDefinition["inputs"])[] => {
    return ["input"];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ColorSplitDefinition>, inSocket: keyof ColorSplitDefinition["inputs"], _deps: AllDeps): OutKey[] => {
    if (inSocket === "input") return ALL_OUT_SOCKETS;
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<ColorSplitDefinition>, socket: OutKey, context: Resolver.Context): DataTypes.AnyEval | null => {
    const color = context.resolve<"color">(node.id, "input")?.data ?? node.payload.value;
    if (color === null) return null;
    const { r, g, b, a } = color;

    switch (socket) {
        // RGB 0–100
        case "rgb_r":
            return { kind: "float", data: `${r * 100}` };
        case "rgb_g":
            return { kind: "float", data: `${g * 100}` };
        case "rgb_b":
            return { kind: "float", data: `${b * 100}` };
        // RGB 0–255
        case "rgb255_r":
            return { kind: "integer", data: `${Math.round(r * 255)}` };
        case "rgb255_g":
            return { kind: "integer", data: `${Math.round(g * 255)}` };
        case "rgb255_b":
            return { kind: "integer", data: `${Math.round(b * 255)}` };
        // CMY
        case "cmy_c":
        case "cmy_m":
        case "cmy_y": {
            const [c, m, y] = componentsFromRGB(Enum.Common.colorSpace.CMY.value, r, g, b);
            const v = socket === "cmy_c" ? c : socket === "cmy_m" ? m : y;
            return { kind: "float", data: `${v * 100}` };
        }
        // CMYK
        case "cmyk_c":
        case "cmyk_m":
        case "cmyk_y":
        case "cmyk_k": {
            const [c, m, y, k] = componentsFromRGB(Enum.Common.colorSpace.CMYK.value, r, g, b);
            const v = socket === "cmyk_c" ? c : socket === "cmyk_m" ? m : socket === "cmyk_y" ? y : k;
            return { kind: "float", data: `${v * 100}` };
        }
        // HSV
        case "hsv_h":
        case "hsv_s":
        case "hsv_v": {
            const [h, s, v] = componentsFromRGB(Enum.Common.colorSpace.HSV.value, r, g, b);
            if (socket === "hsv_h") return { kind: "angle", data: `${h}` };
            return { kind: "float", data: `${(socket === "hsv_s" ? s : v) * 100}` };
        }
        // HSL
        case "hsl_h":
        case "hsl_s":
        case "hsl_l": {
            const [h, s, l] = componentsFromRGB(Enum.Common.colorSpace.HSL.value, r, g, b);
            if (socket === "hsl_h") return { kind: "angle", data: `${h}` };
            return { kind: "float", data: `${(socket === "hsl_s" ? s : l) * 100}` };
        }
        // HWK
        case "hwk_h":
        case "hwk_w":
        case "hwk_k": {
            const [h, w, k] = componentsFromRGB(Enum.Common.colorSpace.HWK.value, r, g, b);
            if (socket === "hwk_h") return { kind: "angle", data: `${h}` };
            return { kind: "float", data: `${(socket === "hwk_w" ? w : k) * 100}` };
        }
        // HSI
        case "hsi_h":
        case "hsi_s":
        case "hsi_i": {
            const [h, s, i] = componentsFromRGB(Enum.Common.colorSpace.HSI.value, r, g, b);
            if (socket === "hsi_h") return { kind: "angle", data: `${h}` };
            return { kind: "float", data: `${(socket === "hsi_s" ? s : i) * 100}` };
        }
        // HCY
        case "hcy_h":
        case "hcy_c":
        case "hcy_y": {
            const [h, c, y] = componentsFromRGB(Enum.Common.colorSpace.HCY.value, r, g, b);
            if (socket === "hcy_h") return { kind: "angle", data: `${h}` };
            return { kind: "float", data: `${(socket === "hcy_c" ? c : y) * 100}` };
        }
        // CIELAB — L is natively 0–100; a/b are signed floats already on a 100-ish magnitude
        case "cielab_l":
        case "cielab_a":
        case "cielab_b": {
            const [l, av, bv] = componentsFromRGB(Enum.Common.colorSpace.CIELAB.value, r, g, b);
            const v = socket === "cielab_l" ? l : socket === "cielab_a" ? av : bv;
            return { kind: "float", data: `${v}` };
        }
        // OKLAB — L is 0–1, a/b are ±~0.4 → scale by 100
        case "oklab_l":
        case "oklab_a":
        case "oklab_b": {
            const [l, av, bv] = componentsFromRGB(Enum.Common.colorSpace.OKLAB.value, r, g, b);
            const v = socket === "oklab_l" ? l : socket === "oklab_a" ? av : bv;
            return { kind: "float", data: `${v * 100}` };
        }
        // OKLCH — L 0–1, C 0–~0.4 → scale by 100; H is angle
        case "oklch_l":
        case "oklch_c":
        case "oklch_h": {
            const [l, c, h] = componentsFromRGB(Enum.Common.colorSpace.OKLCH.value, r, g, b);
            if (socket === "oklch_h") return { kind: "angle", data: `${h}` };
            return { kind: "float", data: `${(socket === "oklch_l" ? l : c) * 100}` };
        }
        // CIELCH — L is 0–100, C is ≥0 (~0–150 in-gamut), already 100-magnitude; H is angle
        case "cielch_l":
        case "cielch_c":
        case "cielch_h": {
            const [l, c, h] = componentsFromRGB(Enum.Common.colorSpace.CIELCH.value, r, g, b);
            if (socket === "cielch_h") return { kind: "angle", data: `${h}` };
            return { kind: "float", data: `${socket === "cielch_l" ? l : c}` };
        }
        // Alpha
        case "alpha_f":
            return { kind: "float", data: `${a * 100}` };
        case "alpha_b":
            return { kind: "integer", data: `${Math.round(a * 255)}` };
    }
};

const SOCKETTYPES_IN: { [key in keyof Required<ColorSplitDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    input: { types: ["color"], mode: "and" },
};

const FLOAT_OUT: SocketTypes.SocketRule = { types: ["float"], mode: "and" };
const INTEGER_OUT: SocketTypes.SocketRule = { types: ["integer"], mode: "and" };
const ANGLE_OUT: SocketTypes.SocketRule = { types: ["angle"], mode: "and" };

const SOCKETTYPES_OUT: { [key in OutKey]: SocketTypes.SocketRule } = {
    rgb_r: FLOAT_OUT,
    rgb_g: FLOAT_OUT,
    rgb_b: FLOAT_OUT,
    rgb255_r: INTEGER_OUT,
    rgb255_g: INTEGER_OUT,
    rgb255_b: INTEGER_OUT,
    cmy_c: FLOAT_OUT,
    cmy_m: FLOAT_OUT,
    cmy_y: FLOAT_OUT,
    cmyk_c: FLOAT_OUT,
    cmyk_m: FLOAT_OUT,
    cmyk_y: FLOAT_OUT,
    cmyk_k: FLOAT_OUT,
    hsv_h: ANGLE_OUT,
    hsv_s: FLOAT_OUT,
    hsv_v: FLOAT_OUT,
    hsl_h: ANGLE_OUT,
    hsl_s: FLOAT_OUT,
    hsl_l: FLOAT_OUT,
    hwk_h: ANGLE_OUT,
    hwk_w: FLOAT_OUT,
    hwk_k: FLOAT_OUT,
    hsi_h: ANGLE_OUT,
    hsi_s: FLOAT_OUT,
    hsi_i: FLOAT_OUT,
    hcy_h: ANGLE_OUT,
    hcy_c: FLOAT_OUT,
    hcy_y: FLOAT_OUT,
    cielab_l: FLOAT_OUT,
    cielab_a: FLOAT_OUT,
    cielab_b: FLOAT_OUT,
    oklab_l: FLOAT_OUT,
    oklab_a: FLOAT_OUT,
    oklab_b: FLOAT_OUT,
    oklch_l: FLOAT_OUT,
    oklch_c: FLOAT_OUT,
    oklch_h: ANGLE_OUT,
    cielch_l: FLOAT_OUT,
    cielch_c: FLOAT_OUT,
    cielch_h: ANGLE_OUT,
    alpha_f: FLOAT_OUT,
    alpha_b: INTEGER_OUT,
};

const getSocketType = (_node: NodeDefinitions.NodeFor<ColorSplitDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    if (side === "in") return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
    return SOCKETTYPES_OUT[socketId as OutKey];
};

export const ColorSplitNodeType: NodeTypes.Type<"colorSplit", ColorSplitDefinition> = {
    type: "colorSplit",
    displayName: "Color Split",
    defaultLabel: "Color Split",
    iconNode: <NodeIcon shape={NODE_ICONS.color} modifierIcon={NODE_ICONS.split} />,
    flavour: "help",
    category: "Math",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    getSocketType,
};
