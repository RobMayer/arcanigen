import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { Enum } from "../../datatypes/enum";
import { NumericString } from "../../datatypes/numericString";
import { componentsToRGB } from "../../../util/colorSpaces";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { Dropdown } from "../../../components/inputs/Dropdown";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: {
        mode: "enum",
        alphaMode: "enum",
        // RGB float 0–100
        rgb_r: $.oneOf("float", "integer"),
        rgb_g: $.oneOf("float", "integer"),
        rgb_b: $.oneOf("float", "integer"),
        // RGB byte 0–255
        rgb255_r: $.oneOf("float", "integer"),
        rgb255_g: $.oneOf("float", "integer"),
        rgb255_b: $.oneOf("float", "integer"),
        // CMY
        cmy_c: $.oneOf("float", "integer"),
        cmy_m: $.oneOf("float", "integer"),
        cmy_y: $.oneOf("float", "integer"),
        // CMYK
        cmyk_c: $.oneOf("float", "integer"),
        cmyk_m: $.oneOf("float", "integer"),
        cmyk_y: $.oneOf("float", "integer"),
        cmyk_k: $.oneOf("float", "integer"),
        // HSV
        hsv_h: "angle",
        hsv_s: $.oneOf("float", "integer"),
        hsv_v: $.oneOf("float", "integer"),
        // HSL
        hsl_h: "angle",
        hsl_s: $.oneOf("float", "integer"),
        hsl_l: $.oneOf("float", "integer"),
        // HWK
        hwk_h: "angle",
        hwk_w: $.oneOf("float", "integer"),
        hwk_k: $.oneOf("float", "integer"),
        // HSI
        hsi_h: "angle",
        hsi_s: $.oneOf("float", "integer"),
        hsi_i: $.oneOf("float", "integer"),
        // HCY
        hcy_h: "angle",
        hcy_c: $.oneOf("float", "integer"),
        hcy_y: $.oneOf("float", "integer"),
        // CIELAB
        cielab_l: $.oneOf("float", "integer"),
        cielab_a: $.oneOf("float", "integer"),
        cielab_b: $.oneOf("float", "integer"),
        // CIELCH
        cielch_l: $.oneOf("float", "integer"),
        cielch_c: $.oneOf("float", "integer"),
        cielch_h: "angle",
        // OKLAB
        oklab_l: $.oneOf("float", "integer"),
        oklab_a: $.oneOf("float", "integer"),
        oklab_b: $.oneOf("float", "integer"),
        // OKLCH
        oklch_l: $.oneOf("float", "integer"),
        oklch_c: $.oneOf("float", "integer"),
        oklch_h: "angle",
        // Alpha
        alpha_f: $.oneOf("float", "integer"),
        alpha_b: $.oneOf("float", "integer"),
    },
    out: { output: "color" },
});

export type ColorJoinDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        mode: DataTypes.TypeOf<DataTypes.Enum>;
        alphaMode: DataTypes.TypeOf<DataTypes.Enum>;
        rgb_r: DataTypes.TypeOf<DataTypes.Float>;
        rgb_g: DataTypes.TypeOf<DataTypes.Float>;
        rgb_b: DataTypes.TypeOf<DataTypes.Float>;
        rgb255_r: DataTypes.TypeOf<DataTypes.Integer>;
        rgb255_g: DataTypes.TypeOf<DataTypes.Integer>;
        rgb255_b: DataTypes.TypeOf<DataTypes.Integer>;
        cmy_c: DataTypes.TypeOf<DataTypes.Float>;
        cmy_m: DataTypes.TypeOf<DataTypes.Float>;
        cmy_y: DataTypes.TypeOf<DataTypes.Float>;
        cmyk_c: DataTypes.TypeOf<DataTypes.Float>;
        cmyk_m: DataTypes.TypeOf<DataTypes.Float>;
        cmyk_y: DataTypes.TypeOf<DataTypes.Float>;
        cmyk_k: DataTypes.TypeOf<DataTypes.Float>;
        hsv_h: DataTypes.TypeOf<DataTypes.Angle>;
        hsv_s: DataTypes.TypeOf<DataTypes.Float>;
        hsv_v: DataTypes.TypeOf<DataTypes.Float>;
        hsl_h: DataTypes.TypeOf<DataTypes.Angle>;
        hsl_s: DataTypes.TypeOf<DataTypes.Float>;
        hsl_l: DataTypes.TypeOf<DataTypes.Float>;
        hwk_h: DataTypes.TypeOf<DataTypes.Angle>;
        hwk_w: DataTypes.TypeOf<DataTypes.Float>;
        hwk_k: DataTypes.TypeOf<DataTypes.Float>;
        hsi_h: DataTypes.TypeOf<DataTypes.Angle>;
        hsi_s: DataTypes.TypeOf<DataTypes.Float>;
        hsi_i: DataTypes.TypeOf<DataTypes.Float>;
        hcy_h: DataTypes.TypeOf<DataTypes.Angle>;
        hcy_c: DataTypes.TypeOf<DataTypes.Float>;
        hcy_y: DataTypes.TypeOf<DataTypes.Float>;
        cielab_l: DataTypes.TypeOf<DataTypes.Float>;
        cielab_a: DataTypes.TypeOf<DataTypes.Float>;
        cielab_b: DataTypes.TypeOf<DataTypes.Float>;
        cielch_l: DataTypes.TypeOf<DataTypes.Float>;
        cielch_c: DataTypes.TypeOf<DataTypes.Float>;
        cielch_h: DataTypes.TypeOf<DataTypes.Angle>;
        oklab_l: DataTypes.TypeOf<DataTypes.Float>;
        oklab_a: DataTypes.TypeOf<DataTypes.Float>;
        oklab_b: DataTypes.TypeOf<DataTypes.Float>;
        oklch_l: DataTypes.TypeOf<DataTypes.Float>;
        oklch_c: DataTypes.TypeOf<DataTypes.Float>;
        oklch_h: DataTypes.TypeOf<DataTypes.Angle>;
        alpha_f: DataTypes.TypeOf<DataTypes.Float>;
        alpha_b: DataTypes.TypeOf<DataTypes.Integer>;
    }
>;

type InKey = keyof ColorJoinDefinition["inputs"];

const MODE_OPTIONS = Enum.options(Enum.Common.colorSpace);
const ALPHA_MODE_OPTIONS = Enum.options(Enum.Common.alphaScale);

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<ColorJoinDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"colorJoin", ColorJoinDefinition> => {
    return {
        id,
        in: {
            mode: null,
            alphaMode: null,
            rgb_r: null, rgb_g: null, rgb_b: null,
            rgb255_r: null, rgb255_g: null, rgb255_b: null,
            cmy_c: null, cmy_m: null, cmy_y: null,
            cmyk_c: null, cmyk_m: null, cmyk_y: null, cmyk_k: null,
            hsv_h: null, hsv_s: null, hsv_v: null,
            hsl_h: null, hsl_s: null, hsl_l: null,
            hwk_h: null, hwk_w: null, hwk_k: null,
            hsi_h: null, hsi_s: null, hsi_i: null,
            hcy_h: null, hcy_c: null, hcy_y: null,
            cielab_l: null, cielab_a: null, cielab_b: null,
            cielch_l: null, cielch_c: null, cielch_h: null,
            oklab_l: null, oklab_a: null, oklab_b: null,
            oklch_l: null, oklch_c: null, oklch_h: null,
            alpha_f: null, alpha_b: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            mode: Enum.Common.colorSpace.RGB.value,
            alphaMode: Enum.Common.alphaScale.FLOAT.value,
            // Defaults below produce opaque black in every mode.
            rgb_r: "0", rgb_g: "0", rgb_b: "0",
            rgb255_r: "0", rgb255_g: "0", rgb255_b: "0",
            cmy_c: "100", cmy_m: "100", cmy_y: "100",
            cmyk_c: "0", cmyk_m: "0", cmyk_y: "0", cmyk_k: "100",
            hsv_h: "0", hsv_s: "0", hsv_v: "0",
            hsl_h: "0", hsl_s: "0", hsl_l: "0",
            hwk_h: "0", hwk_w: "0", hwk_k: "100",
            hsi_h: "0", hsi_s: "0", hsi_i: "0",
            hcy_h: "0", hcy_c: "0", hcy_y: "0",
            cielab_l: "0", cielab_a: "0", cielab_b: "0",
            cielch_l: "0", cielch_c: "0", cielch_h: "0",
            oklab_l: "0", oklab_a: "0", oklab_b: "0",
            oklch_l: "0", oklch_c: "0", oklch_h: "0",
            alpha_f: "100", alpha_b: "255",
        },
        type: "colorJoin",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ColorJoinDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "output");
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ColorJoinDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} label={"Output"}>
                <ValuePreview value={preview} />
            </SocketOut>
            <SocketIn node={node} socketId={"mode"} label={"Mode"}>
                <Dropdown value={`${node.payload.mode}`} onValue={(v) => handleUpdate({ mode: Number(v) })}>
                    {MODE_OPTIONS.map((each) => (
                        <option value={`${each.value}`} key={`${each.value}`}>{each.label}</option>
                    ))}
                </Dropdown>
            </SocketIn>
            <SocketIn node={node} socketId={"alphaMode"} label={"Alpha Mode"}>
                <Dropdown value={`${node.payload.alphaMode}`} onValue={(v) => handleUpdate({ alphaMode: Number(v) })}>
                    {ALPHA_MODE_OPTIONS.map((each) => (
                        <option value={`${each.value}`} key={`${each.value}`}>{each.label}</option>
                    ))}
                </Dropdown>
            </SocketIn>
            <NodeAccordion label={"RGB"} accordionId={"rgb"} nodeId={node.id} socketsIn={"rgb_r|rgb_g|rgb_b"}>
                <SocketIn node={node} socketId={"rgb_r"} label={"RGB: Red"}>
                    <DecimalInput.SliderInput value={node.payload.rgb_r} onCommit={(rgb_r) => handleUpdate({ rgb_r })} disabled={node.in.rgb_r !== null} min={0} max={100} required />
                </SocketIn>
                <SocketIn node={node} socketId={"rgb_g"} label={"RGB: Green"}>
                    <DecimalInput.SliderInput value={node.payload.rgb_g} onCommit={(rgb_g) => handleUpdate({ rgb_g })} disabled={node.in.rgb_g !== null} min={0} max={100} required />
                </SocketIn>
                <SocketIn node={node} socketId={"rgb_b"} label={"RGB: Blue"}>
                    <DecimalInput.SliderInput value={node.payload.rgb_b} onCommit={(rgb_b) => handleUpdate({ rgb_b })} disabled={node.in.rgb_b !== null} min={0} max={100} required />
                </SocketIn>
            </NodeAccordion>
            <NodeAccordion label={"RGB (Byte)"} accordionId={"rgb255"} nodeId={node.id} socketsIn={"rgb255_r|rgb255_g|rgb255_b"}>
                <SocketIn node={node} socketId={"rgb255_r"} label={"RGB (Byte): Red"}>
                    <IntegerInput.SliderInput value={node.payload.rgb255_r} onCommit={(rgb255_r) => handleUpdate({ rgb255_r })} disabled={node.in.rgb255_r !== null} min={0} max={255} required />
                </SocketIn>
                <SocketIn node={node} socketId={"rgb255_g"} label={"RGB (Byte): Green"}>
                    <IntegerInput.SliderInput value={node.payload.rgb255_g} onCommit={(rgb255_g) => handleUpdate({ rgb255_g })} disabled={node.in.rgb255_g !== null} min={0} max={255} required />
                </SocketIn>
                <SocketIn node={node} socketId={"rgb255_b"} label={"RGB (Byte): Blue"}>
                    <IntegerInput.SliderInput value={node.payload.rgb255_b} onCommit={(rgb255_b) => handleUpdate({ rgb255_b })} disabled={node.in.rgb255_b !== null} min={0} max={255} required />
                </SocketIn>
            </NodeAccordion>
            <NodeAccordion label={"CMY"} accordionId={"cmy"} nodeId={node.id} socketsIn={"cmy_c|cmy_m|cmy_y"}>
                <SocketIn node={node} socketId={"cmy_c"} label={"CMY: Cyan"}>
                    <DecimalInput.SliderInput value={node.payload.cmy_c} onCommit={(cmy_c) => handleUpdate({ cmy_c })} disabled={node.in.cmy_c !== null} min={0} max={100} required />
                </SocketIn>
                <SocketIn node={node} socketId={"cmy_m"} label={"CMY: Magenta"}>
                    <DecimalInput.SliderInput value={node.payload.cmy_m} onCommit={(cmy_m) => handleUpdate({ cmy_m })} disabled={node.in.cmy_m !== null} min={0} max={100} required />
                </SocketIn>
                <SocketIn node={node} socketId={"cmy_y"} label={"CMY: Yellow"}>
                    <DecimalInput.SliderInput value={node.payload.cmy_y} onCommit={(cmy_y) => handleUpdate({ cmy_y })} disabled={node.in.cmy_y !== null} min={0} max={100} required />
                </SocketIn>
            </NodeAccordion>
            <NodeAccordion label={"CMYK"} accordionId={"cmyk"} nodeId={node.id} socketsIn={"cmyk_c|cmyk_m|cmyk_y|cmyk_k"}>
                <SocketIn node={node} socketId={"cmyk_c"} label={"CMYK: Cyan"}>
                    <DecimalInput.SliderInput value={node.payload.cmyk_c} onCommit={(cmyk_c) => handleUpdate({ cmyk_c })} disabled={node.in.cmyk_c !== null} min={0} max={100} required />
                </SocketIn>
                <SocketIn node={node} socketId={"cmyk_m"} label={"CMYK: Magenta"}>
                    <DecimalInput.SliderInput value={node.payload.cmyk_m} onCommit={(cmyk_m) => handleUpdate({ cmyk_m })} disabled={node.in.cmyk_m !== null} min={0} max={100} required />
                </SocketIn>
                <SocketIn node={node} socketId={"cmyk_y"} label={"CMYK: Yellow"}>
                    <DecimalInput.SliderInput value={node.payload.cmyk_y} onCommit={(cmyk_y) => handleUpdate({ cmyk_y })} disabled={node.in.cmyk_y !== null} min={0} max={100} required />
                </SocketIn>
                <SocketIn node={node} socketId={"cmyk_k"} label={"CMYK: Key (Black)"}>
                    <DecimalInput.SliderInput value={node.payload.cmyk_k} onCommit={(cmyk_k) => handleUpdate({ cmyk_k })} disabled={node.in.cmyk_k !== null} min={0} max={100} required />
                </SocketIn>
            </NodeAccordion>
            <NodeAccordion label={"HSV"} accordionId={"hsv"} nodeId={node.id} socketsIn={"hsv_h|hsv_s|hsv_v"}>
                <SocketIn node={node} socketId={"hsv_h"} label={"HSV: Hue"}>
                    <AngleInput.SliderInput value={node.payload.hsv_h} onCommit={(hsv_h) => handleUpdate({ hsv_h })} disabled={node.in.hsv_h !== null} />
                </SocketIn>
                <SocketIn node={node} socketId={"hsv_s"} label={"HSV: Saturation"}>
                    <DecimalInput.SliderInput value={node.payload.hsv_s} onCommit={(hsv_s) => handleUpdate({ hsv_s })} disabled={node.in.hsv_s !== null} min={0} max={100} required />
                </SocketIn>
                <SocketIn node={node} socketId={"hsv_v"} label={"HSV: Value"}>
                    <DecimalInput.SliderInput value={node.payload.hsv_v} onCommit={(hsv_v) => handleUpdate({ hsv_v })} disabled={node.in.hsv_v !== null} min={0} max={100} required />
                </SocketIn>
            </NodeAccordion>
            <NodeAccordion label={"HSL"} accordionId={"hsl"} nodeId={node.id} socketsIn={"hsl_h|hsl_s|hsl_l"}>
                <SocketIn node={node} socketId={"hsl_h"} label={"HSL: Hue"}>
                    <AngleInput.SliderInput value={node.payload.hsl_h} onCommit={(hsl_h) => handleUpdate({ hsl_h })} disabled={node.in.hsl_h !== null} />
                </SocketIn>
                <SocketIn node={node} socketId={"hsl_s"} label={"HSL: Saturation"}>
                    <DecimalInput.SliderInput value={node.payload.hsl_s} onCommit={(hsl_s) => handleUpdate({ hsl_s })} disabled={node.in.hsl_s !== null} min={0} max={100} required />
                </SocketIn>
                <SocketIn node={node} socketId={"hsl_l"} label={"HSL: Lightness"}>
                    <DecimalInput.SliderInput value={node.payload.hsl_l} onCommit={(hsl_l) => handleUpdate({ hsl_l })} disabled={node.in.hsl_l !== null} min={0} max={100} required />
                </SocketIn>
            </NodeAccordion>
            <NodeAccordion label={"HWK"} accordionId={"hwk"} nodeId={node.id} socketsIn={"hwk_h|hwk_w|hwk_k"}>
                <SocketIn node={node} socketId={"hwk_h"} label={"HWK: Hue"}>
                    <AngleInput.SliderInput value={node.payload.hwk_h} onCommit={(hwk_h) => handleUpdate({ hwk_h })} disabled={node.in.hwk_h !== null} />
                </SocketIn>
                <SocketIn node={node} socketId={"hwk_w"} label={"HWK: Whiteness"}>
                    <DecimalInput.SliderInput value={node.payload.hwk_w} onCommit={(hwk_w) => handleUpdate({ hwk_w })} disabled={node.in.hwk_w !== null} min={0} max={100} required />
                </SocketIn>
                <SocketIn node={node} socketId={"hwk_k"} label={"HWK: Blackness"}>
                    <DecimalInput.SliderInput value={node.payload.hwk_k} onCommit={(hwk_k) => handleUpdate({ hwk_k })} disabled={node.in.hwk_k !== null} min={0} max={100} required />
                </SocketIn>
            </NodeAccordion>
            <NodeAccordion label={"HSI"} accordionId={"hsi"} nodeId={node.id} socketsIn={"hsi_h|hsi_s|hsi_i"}>
                <SocketIn node={node} socketId={"hsi_h"} label={"HSI: Hue"}>
                    <AngleInput.SliderInput value={node.payload.hsi_h} onCommit={(hsi_h) => handleUpdate({ hsi_h })} disabled={node.in.hsi_h !== null} />
                </SocketIn>
                <SocketIn node={node} socketId={"hsi_s"} label={"HSI: Saturation"}>
                    <DecimalInput.SliderInput value={node.payload.hsi_s} onCommit={(hsi_s) => handleUpdate({ hsi_s })} disabled={node.in.hsi_s !== null} min={0} max={100} required />
                </SocketIn>
                <SocketIn node={node} socketId={"hsi_i"} label={"HSI: Intensity"}>
                    <DecimalInput.SliderInput value={node.payload.hsi_i} onCommit={(hsi_i) => handleUpdate({ hsi_i })} disabled={node.in.hsi_i !== null} min={0} max={100} required />
                </SocketIn>
            </NodeAccordion>
            <NodeAccordion label={"HCY"} accordionId={"hcy"} nodeId={node.id} socketsIn={"hcy_h|hcy_c|hcy_y"}>
                <SocketIn node={node} socketId={"hcy_h"} label={"HCY: Hue"}>
                    <AngleInput.SliderInput value={node.payload.hcy_h} onCommit={(hcy_h) => handleUpdate({ hcy_h })} disabled={node.in.hcy_h !== null} />
                </SocketIn>
                <SocketIn node={node} socketId={"hcy_c"} label={"HCY: Chroma"}>
                    <DecimalInput.SliderInput value={node.payload.hcy_c} onCommit={(hcy_c) => handleUpdate({ hcy_c })} disabled={node.in.hcy_c !== null} min={0} max={100} required />
                </SocketIn>
                <SocketIn node={node} socketId={"hcy_y"} label={"HCY: Luma"}>
                    <DecimalInput.SliderInput value={node.payload.hcy_y} onCommit={(hcy_y) => handleUpdate({ hcy_y })} disabled={node.in.hcy_y !== null} min={0} max={100} required />
                </SocketIn>
            </NodeAccordion>
            <NodeAccordion label={"CIELAB"} accordionId={"cielab"} nodeId={node.id} socketsIn={"cielab_l|cielab_a|cielab_b"}>
                <SocketIn node={node} socketId={"cielab_l"} label={"CIELAB: Lightness"}>
                    <DecimalInput.SliderInput value={node.payload.cielab_l} onCommit={(cielab_l) => handleUpdate({ cielab_l })} disabled={node.in.cielab_l !== null} min={0} max={100} required />
                </SocketIn>
                <SocketIn node={node} socketId={"cielab_a"} label={"CIELAB: a*"}>
                    <DecimalInput value={node.payload.cielab_a} onCommit={(cielab_a) => handleUpdate({ cielab_a })} disabled={node.in.cielab_a !== null} required />
                </SocketIn>
                <SocketIn node={node} socketId={"cielab_b"} label={"CIELAB: b*"}>
                    <DecimalInput value={node.payload.cielab_b} onCommit={(cielab_b) => handleUpdate({ cielab_b })} disabled={node.in.cielab_b !== null} required />
                </SocketIn>
            </NodeAccordion>
            <NodeAccordion label={"CIELCH"} accordionId={"cielch"} nodeId={node.id} socketsIn={"cielch_l|cielch_c|cielch_h"}>
                <SocketIn node={node} socketId={"cielch_l"} label={"CIELCH: Lightness"}>
                    <DecimalInput.SliderInput value={node.payload.cielch_l} onCommit={(cielch_l) => handleUpdate({ cielch_l })} disabled={node.in.cielch_l !== null} min={0} max={100} required />
                </SocketIn>
                <SocketIn node={node} socketId={"cielch_c"} label={"CIELCH: Chroma"}>
                    <DecimalInput value={node.payload.cielch_c} onCommit={(cielch_c) => handleUpdate({ cielch_c })} disabled={node.in.cielch_c !== null} min={0} required />
                </SocketIn>
                <SocketIn node={node} socketId={"cielch_h"} label={"CIELCH: Hue"}>
                    <AngleInput.SliderInput value={node.payload.cielch_h} onCommit={(cielch_h) => handleUpdate({ cielch_h })} disabled={node.in.cielch_h !== null} />
                </SocketIn>
            </NodeAccordion>
            <NodeAccordion label={"OKLAB"} accordionId={"oklab"} nodeId={node.id} socketsIn={"oklab_l|oklab_a|oklab_b"}>
                <SocketIn node={node} socketId={"oklab_l"} label={"OKLAB: Lightness"}>
                    <DecimalInput.SliderInput value={node.payload.oklab_l} onCommit={(oklab_l) => handleUpdate({ oklab_l })} disabled={node.in.oklab_l !== null} min={0} max={100} required />
                </SocketIn>
                <SocketIn node={node} socketId={"oklab_a"} label={"OKLAB: a"}>
                    <DecimalInput value={node.payload.oklab_a} onCommit={(oklab_a) => handleUpdate({ oklab_a })} disabled={node.in.oklab_a !== null} required />
                </SocketIn>
                <SocketIn node={node} socketId={"oklab_b"} label={"OKLAB: b"}>
                    <DecimalInput value={node.payload.oklab_b} onCommit={(oklab_b) => handleUpdate({ oklab_b })} disabled={node.in.oklab_b !== null} required />
                </SocketIn>
            </NodeAccordion>
            <NodeAccordion label={"OKLCH"} accordionId={"oklch"} nodeId={node.id} socketsIn={"oklch_l|oklch_c|oklch_h"}>
                <SocketIn node={node} socketId={"oklch_l"} label={"OKLCH: Lightness"}>
                    <DecimalInput.SliderInput value={node.payload.oklch_l} onCommit={(oklch_l) => handleUpdate({ oklch_l })} disabled={node.in.oklch_l !== null} min={0} max={100} required />
                </SocketIn>
                <SocketIn node={node} socketId={"oklch_c"} label={"OKLCH: Chroma"}>
                    <DecimalInput value={node.payload.oklch_c} onCommit={(oklch_c) => handleUpdate({ oklch_c })} disabled={node.in.oklch_c !== null} min={0} required />
                </SocketIn>
                <SocketIn node={node} socketId={"oklch_h"} label={"OKLCH: Hue"}>
                    <AngleInput.SliderInput value={node.payload.oklch_h} onCommit={(oklch_h) => handleUpdate({ oklch_h })} disabled={node.in.oklch_h !== null} />
                </SocketIn>
            </NodeAccordion>
            <NodeAccordion label={"Alpha"} accordionId={"alpha"} nodeId={node.id} socketsIn={"alpha_f|alpha_b"}>
                <SocketIn node={node} socketId={"alpha_f"} label={"Alpha: Float"}>
                    <DecimalInput.SliderInput value={node.payload.alpha_f} onCommit={(alpha_f) => handleUpdate({ alpha_f })} disabled={node.in.alpha_f !== null} min={0} max={100} required />
                </SocketIn>
                <SocketIn node={node} socketId={"alpha_b"} label={"Alpha: Byte"}>
                    <IntegerInput.SliderInput value={node.payload.alpha_b} onCommit={(alpha_b) => handleUpdate({ alpha_b })} disabled={node.in.alpha_b !== null} min={0} max={255} required />
                </SocketIn>
            </NodeAccordion>
        </TypicalNode>
    );
};

const ALL_INPUTS: InKey[] = [
    "mode", "alphaMode",
    "rgb_r", "rgb_g", "rgb_b",
    "rgb255_r", "rgb255_g", "rgb255_b",
    "cmy_c", "cmy_m", "cmy_y",
    "cmyk_c", "cmyk_m", "cmyk_y", "cmyk_k",
    "hsv_h", "hsv_s", "hsv_v",
    "hsl_h", "hsl_s", "hsl_l",
    "hwk_h", "hwk_w", "hwk_k",
    "hsi_h", "hsi_s", "hsi_i",
    "hcy_h", "hcy_c", "hcy_y",
    "cielab_l", "cielab_a", "cielab_b",
    "cielch_l", "cielch_c", "cielch_h",
    "oklab_l", "oklab_a", "oklab_b",
    "oklch_l", "oklch_c", "oklch_h",
    "alpha_f", "alpha_b",
];

const dependsOn = (_node: NodeDefinitions.NodeFor<ColorJoinDefinition>, _outSocket: "output", _deps: AllDeps): InKey[] => {
    return ALL_INPUTS;
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ColorJoinDefinition>, _inSocket: InKey, _deps: AllDeps): "output"[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<ColorJoinDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const readNum = (sid: InKey, fallback: string): number => {
        const resolved = context.resolve<DataTypes.Float | DataTypes.Integer>(node.id, sid)?.data;
        const payloadVal = node.payload[sid as keyof ColorJoinDefinition["payload"]] as DataTypes.TypeOf<DataTypes.Float>;
        return NumericString.Emptyable.asNumber(resolved ?? payloadVal) ?? Number(fallback);
    };
    const readAng = (sid: InKey, fallback: string): number => {
        const resolved = context.resolve<DataTypes.Angle>(node.id, sid)?.data;
        const payloadVal = node.payload[sid as keyof ColorJoinDefinition["payload"]] as DataTypes.TypeOf<DataTypes.Angle>;
        return NumericString.Emptyable.asNumber(resolved ?? payloadVal) ?? Number(fallback);
    };

    const modeRaw = context.resolve<DataTypes.Enum>(node.id, "mode")?.data ?? node.payload.mode;
    const mode = Number(modeRaw);
    const alphaModeRaw = context.resolve<DataTypes.Enum>(node.id, "alphaMode")?.data ?? node.payload.alphaMode;
    const alphaMode = Number(alphaModeRaw);

    let r: number, g: number, b: number;

    const CS = Enum.Common.colorSpace;
    switch (mode) {
        case CS.RGB.value: {
            r = readNum("rgb_r", "0") / 100;
            g = readNum("rgb_g", "0") / 100;
            b = readNum("rgb_b", "0") / 100;
            break;
        }
        case CS.RGB_BYTE.value: {
            r = readNum("rgb255_r", "0") / 255;
            g = readNum("rgb255_g", "0") / 255;
            b = readNum("rgb255_b", "0") / 255;
            break;
        }
        case CS.CMY.value: {
            const c = readNum("cmy_c", "100") / 100;
            const m = readNum("cmy_m", "100") / 100;
            const y = readNum("cmy_y", "100") / 100;
            [r, g, b] = componentsToRGB(CS.CMY.value, [c, m, y]);
            break;
        }
        case CS.CMYK.value: {
            const c = readNum("cmyk_c", "0") / 100;
            const m = readNum("cmyk_m", "0") / 100;
            const y = readNum("cmyk_y", "0") / 100;
            const k = readNum("cmyk_k", "100") / 100;
            [r, g, b] = componentsToRGB(CS.CMYK.value, [c, m, y, k]);
            break;
        }
        case CS.HSV.value: {
            const h = readAng("hsv_h", "0");
            const s = readNum("hsv_s", "0") / 100;
            const v = readNum("hsv_v", "0") / 100;
            [r, g, b] = componentsToRGB(CS.HSV.value, [h, s, v]);
            break;
        }
        case CS.HSL.value: {
            const h = readAng("hsl_h", "0");
            const s = readNum("hsl_s", "0") / 100;
            const l = readNum("hsl_l", "0") / 100;
            [r, g, b] = componentsToRGB(CS.HSL.value, [h, s, l]);
            break;
        }
        case CS.HWK.value: {
            const h = readAng("hwk_h", "0");
            const w = readNum("hwk_w", "0") / 100;
            const k = readNum("hwk_k", "100") / 100;
            [r, g, b] = componentsToRGB(CS.HWK.value, [h, w, k]);
            break;
        }
        case CS.HSI.value: {
            const h = readAng("hsi_h", "0");
            const s = readNum("hsi_s", "0") / 100;
            const i = readNum("hsi_i", "0") / 100;
            [r, g, b] = componentsToRGB(CS.HSI.value, [h, s, i]);
            break;
        }
        case CS.HCY.value: {
            const h = readAng("hcy_h", "0");
            const c = readNum("hcy_c", "0") / 100;
            const y = readNum("hcy_y", "0") / 100;
            [r, g, b] = componentsToRGB(CS.HCY.value, [h, c, y]);
            break;
        }
        case CS.CIELAB.value: {
            // CIELAB: L is 0–100 native, a/b are pass-through signed floats
            const L = readNum("cielab_l", "0");
            const a = readNum("cielab_a", "0");
            const bv = readNum("cielab_b", "0");
            [r, g, b] = componentsToRGB(CS.CIELAB.value, [L, a, bv]);
            break;
        }
        case CS.CIELCH.value: {
            // CIELCH: L 0–100, C ≥0 pass-through, H angle
            const L = readNum("cielch_l", "0");
            const c = readNum("cielch_c", "0");
            const h = readAng("cielch_h", "0");
            [r, g, b] = componentsToRGB(CS.CIELCH.value, [L, c, h]);
            break;
        }
        case CS.OKLAB.value: {
            // OKLAB scaled by 100 in our splitter convention — invert by /100
            const L = readNum("oklab_l", "0") / 100;
            const a = readNum("oklab_a", "0") / 100;
            const bv = readNum("oklab_b", "0") / 100;
            [r, g, b] = componentsToRGB(CS.OKLAB.value, [L, a, bv]);
            break;
        }
        case CS.OKLCH.value: {
            const L = readNum("oklch_l", "0") / 100;
            const c = readNum("oklch_c", "0") / 100;
            const h = readAng("oklch_h", "0");
            [r, g, b] = componentsToRGB(CS.OKLCH.value, [L, c, h]);
            break;
        }
        default: {
            r = 0; g = 0; b = 0;
        }
    }

    const a = alphaMode === Enum.Common.alphaScale.BYTE.value
        ? readNum("alpha_b", "255") / 255
        : readNum("alpha_f", "100") / 100;

    return { kind: "color", data: { r, g, b, a } };
};

export const ColorJoinNodeType: NodeTypes.Type<"colorJoin", ColorJoinDefinition> = {
    type: "colorJoin",
    displayName: "Color Join",
    defaultLabel: "Color Join",
    iconNode: <NodeIcon shape={NODE_ICONS.color} modifierIcon={NODE_ICONS.merge} />,
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
