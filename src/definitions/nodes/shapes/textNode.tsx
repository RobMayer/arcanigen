import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { StylingPrefab } from "../../helpers/stylingPrefab";
import { TransformPrefab } from "../../helpers/transformPrefab";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { BlockInput } from "../../../components/inputs/BlockInput";
import { NumericString } from "../../datatypes/numericString";
import { Dropdown } from "../../../components/inputs/Dropdown";
import { Fonts } from "../../fonts";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: {
        text: "string",
        font: "enum",
        size: "length",
        spacing: "length",
        lineHeight: "length",
        letterRotation: "angle",
        anchor: "enum",
        align: "enum",
        ...TransformPrefab.SIG_IN,
        ...StylingPrefab.SIG_IN,
        ...StylingPrefab.SIG_FILL,
    },
    out: { output: "shape", charCount: "integer" },
});

export type TextDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<"string">;
        text: DataTypes.TypeOf<"string">;
        font: DataTypes.TypeOf<"enum">;
        size: DataTypes.TypeOf<"length">;
        spacing: DataTypes.TypeOf<"length">;
        lineHeight: DataTypes.TypeOf<"length">;
        letterRotation: DataTypes.TypeOf<"angle">;
        anchor: DataTypes.TypeOf<"enum">;
        align: DataTypes.TypeOf<"enum">;
    } & StylingPrefab.Definition["payload"] &
        TransformPrefab.Definition["payload"]
>;

const TEXT_ALIGN_OPTIONS = Enum.options(Enum.Common.linearAlign);
const TEXT_ANCHOR_OPTIONS = Enum.options(Enum.Common.verticalAlign);
const FONT_OPTIONS = Enum.options(Fonts.ENUM);

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<TextDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"text", TextDefinition> => {
    return {
        id,
        in: {
            text: null,
            font: null,
            size: null,
            spacing: null,
            lineHeight: null,
            letterRotation: null,
            anchor: null,
            align: null,
            strokeWidth: null,
            strokeColor: null,
            strokeDash: null,
            strokeDashOffset: null,
            strokeCap: null,
            fillColor: null,
            paintOrder: null,
            opacity: null,
            // transforms
            positionMode: null,
            positionX: null,
            positionY: null,
            positionRadius: null,
            positionTheta: null,
            rotation: null,
        },
        out: {
            output: [],
            charCount: [],
        },
        payload: {
            label: "",
            text: "Text",
            font: 0,
            size: "16px",
            spacing: "0px",
            lineHeight: "",
            letterRotation: "0",
            anchor: Enum.Common.verticalAlign.MIDDLE.value,
            align: Enum.Common.linearAlign.CENTER.value,
            // stroke
            strokeWidth: "0px",
            strokeDash: "",
            strokeColor: { r: 0, g: 0, b: 0, a: 0 },
            strokeDashOffset: "0px",
            strokeCap: Enum.Common.strokeCap.BUTT.value,
            // fill
            fillColor: { r: 0, g: 0, b: 0, a: 1 },
            paintOrder: 0,
            opacity: "100",
            // transforms
            positionMode: Enum.Common.positionMode.CARTESIAN.value,
            positionX: "0px",
            positionY: "0px",
            positionRadius: "0px",
            positionTheta: "0",
            rotation: "0",
            ...input,
        },
        type: "text",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<TextDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<TextDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"text"} label={"Text"}>
                <BlockInput.WithModal value={node.payload.text} onCommit={(text) => handleUpdate({ text })} disabled={node.in.text !== null} title={"Edit Text"} />
            </SocketIn>
            <SocketIn node={node} socketId={"font"} label={"Font"}>
                <Dropdown value={`${node.payload.font}`} onValue={(v) => handleUpdate({ font: Number(v) })} disabled={node.in.font !== null}>
                    {FONT_OPTIONS.map((each) => (
                        <option value={`${each.value}`} key={`${each.value}`}>
                            {each.label}
                        </option>
                    ))}
                </Dropdown>
            </SocketIn>
            <SocketIn node={node} socketId={"size"} label={"Font Size"}>
                <LengthInput value={node.payload.size} onCommit={(size) => handleUpdate({ size })} disabled={node.in.size !== null} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"spacing"} label={"Letter Spacing"}>
                <LengthInput value={node.payload.spacing} onCommit={(spacing) => handleUpdate({ spacing })} disabled={node.in.spacing !== null} required />
            </SocketIn>
            <SocketIn node={node} socketId={"lineHeight"} label={"Line Height"}>
                <LengthInput value={node.payload.lineHeight} onCommit={(lineHeight) => handleUpdate({ lineHeight })} disabled={node.in.lineHeight !== null} min={"0px"} placeholder={"auto"} />
            </SocketIn>
            <SocketIn node={node} socketId={"align"} label={"Align"}>
                <RadioButton.Group
                    orientation={"horizontal"}
                    value={`${node.payload.align}`}
                    onValue={(v) => handleUpdate({ align: Number(v) })}
                    disabled={node.in.align !== null}
                    options={TEXT_ALIGN_OPTIONS}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"anchor"} label={"Anchor"}>
                <RadioButton.Group
                    orientation={"horizontal"}
                    value={`${node.payload.anchor}`}
                    onValue={(v) => handleUpdate({ anchor: Number(v) })}
                    disabled={node.in.anchor !== null}
                    options={TEXT_ANCHOR_OPTIONS}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"letterRotation"} label={"Letter Rotation"}>
                <AngleInput.SliderInput value={node.payload.letterRotation} onCommit={(letterRotation) => handleUpdate({ letterRotation })} disabled={node.in.letterRotation !== null} />
            </SocketIn>
            <StylingPrefab.Controls node={node} handleUpdate={handleUpdate} fill accordion />
            <TransformPrefab.Controls node={node} handleUpdate={handleUpdate} accordion />
            <NodeAccordion label={"Additional Options"} socketsOut={"charCount"} nodeId={node.id}>
                <SocketOut node={node} socketId={"charCount"}>
                    Character Count
                </SocketOut>
            </NodeAccordion>
        </TypicalNode>
    );
};

const ALL_INPUTS: (keyof TextDefinition["inputs"])[] = [
    "text",
    "font",
    "size",
    "spacing",
    "lineHeight",
    "letterRotation",
    "anchor",
    "align",
    "rotation",
    "strokeWidth",
    "strokeColor",
    "strokeCap",
    "strokeDash",
    "strokeDashOffset",
    "fillColor",
    "paintOrder",
    "positionMode",
    "positionX",
    "positionY",
    "positionRadius",
    "positionTheta",
];

const dependsOn = (_node: NodeDefinitions.NodeFor<TextDefinition>, outSocket: keyof TextDefinition["outputs"], _deps: AllDeps): (keyof TextDefinition["inputs"])[] => {
    if (outSocket === "charCount") return ["text"];
    return ALL_INPUTS;
};

const contributesTo = (_node: NodeDefinitions.NodeFor<TextDefinition>, inSocket: keyof TextDefinition["inputs"], _deps: AllDeps): (keyof TextDefinition["outputs"])[] => {
    if (inSocket === "text") return ["output", "charCount"];
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<TextDefinition>, socket: keyof TextDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output" && socket !== "charCount") return null;

    const text = context.resolve<"string">(node.id, "text")?.data ?? node.payload.text;

    if (socket === "charCount") return { kind: "integer", data: `${(text ?? "").length}` };

    if (!text) return null;

    const fontVal = Enum.resolve(context.resolve<"enum">(node.id, "font")?.data, Fonts.ENUM) ?? node.payload.font ?? 0;
    const fontFamily = Fonts.familyOf(fontVal);

    const size = Math.max(0, Length.Emptyable.asNumber(context.resolve<"length">(node.id, "size")?.data ?? node.payload.size) ?? 16);
    const spacing = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "spacing")?.data ?? node.payload.spacing) ?? 0;
    // Empty line height falls back to a font-relative default.
    const lineHeight = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "lineHeight")?.data ?? node.payload.lineHeight) ?? size * 1.2;
    const letterRotation = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "letterRotation")?.data ?? node.payload.letterRotation) ?? 0;
    const align = Enum.resolve(context.resolve<"enum">(node.id, "align")?.data, Enum.Common.linearAlign) ?? node.payload.align;
    const anchor = Enum.resolve(context.resolve<"enum">(node.id, "anchor")?.data, Enum.Common.verticalAlign) ?? node.payload.anchor;

    const textAnchorValue = (Resolver.EnumMappings.linearAlign[align] ?? "start") as "start" | "middle" | "end";
    const dominantBaseline: string = Resolver.EnumMappings.textAnchor[anchor] ?? "central";

    const paint = StylingPrefab.evaluate(node, context);

    const [transforms, { translateX, translateY }] = TransformPrefab.evaluate(node, context);

    // The text has no geometric path, so approximate its bounds for layout/preview
    // purposes from font metrics: ~0.6em advance per character, one em tall per line.
    const lines = text.split("\n");
    const longest = Math.max(...lines.map((l) => l.length));
    const approxWidth = longest * size * 0.6 + Math.max(0, longest - 1) * spacing;
    const blockHeight = lines.length * lineHeight;
    const offsetX = textAnchorValue === "middle" ? -approxWidth / 2 : textAnchorValue === "end" ? -approxWidth : 0;
    // Match the renderer's vertical block anchoring (see TextElement).
    const offsetY = dominantBaseline === "central" ? -blockHeight / 2 : dominantBaseline === "auto" ? -blockHeight : 0;
    const preview = { x: translateX + offsetX, y: translateY + offsetY, w: approxWidth, h: blockHeight };

    return {
        kind: "shape",
        data: {
            type: "text",
            text,
            fontFamily,
            fontSize: size,
            letterSpacing: spacing !== 0 ? spacing : undefined,
            lineHeight,
            textAnchor: textAnchorValue,
            dominantBaseline,
            rotate: letterRotation !== 0 ? letterRotation : undefined,
            paint,
            transform: transforms.join(" "),
            preview,
        },
    };
};

export const TextNodeType: NodeTypes.Type<"text", TextDefinition> = {
    type: "text",
    displayName: "Text",
    defaultLabel: "Text",
    iconNode: <NodeIcon shape={NODE_ICONS.text} />,
    flavour: "confirm",
    category: "Shapes",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
