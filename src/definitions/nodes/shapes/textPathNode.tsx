import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Angle } from "../../datatypes/angle";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { StylingPrefab } from "../../helpers/stylingPrefab";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { BlockInput } from "../../../components/inputs/BlockInput";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { NumericString } from "../../datatypes/numericString";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { PaperHelper } from "../../../util/paperHelper";
import { Dropdown } from "../../../components/inputs/Dropdown";
import { Fonts } from "../../fonts";
import { $, signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: {
        text: "string",
        font: "enum",
        path: "path",
        size: "length",
        spacing: "length",
        rotation: "angle",
        anchor: "enum",
        align: "enum",
        offsetMode: "enum",
        offsetPercent: $.oneOf("float", "integer"),
        offsetLength: "length",
        offsetOrigin: "enum",
        reversePath: "boolean",
        ...StylingPrefab.SIG_IN,
        ...StylingPrefab.SIG_FILL,
    },
    out: { output: "shape", charCount: "integer" },
});

export type TextPathDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        font: DataTypes.TypeOf<DataTypes.Enum>;
        text: DataTypes.TypeOf<DataTypes.String>;
        size: DataTypes.TypeOf<DataTypes.Length>;
        spacing: DataTypes.TypeOf<DataTypes.Length>;
        rotation: DataTypes.TypeOf<DataTypes.Angle>;
        anchor: DataTypes.TypeOf<DataTypes.Enum>;
        align: DataTypes.TypeOf<DataTypes.Enum>;
        offsetMode: DataTypes.TypeOf<DataTypes.Enum>;
        offsetPercent: DataTypes.TypeOf<DataTypes.Float>;
        offsetLength: DataTypes.TypeOf<DataTypes.Length>;
        offsetOrigin: DataTypes.TypeOf<DataTypes.Enum>;
        reversePath: DataTypes.TypeOf<DataTypes.Boolean>;
    } & StylingPrefab.Definition["payload"]
>;

const TEXT_ALIGN_OPTIONS = Enum.options(Enum.Common.linearAlign);
const TEXT_ANCHOR_OPTIONS = Enum.options(Enum.Common.verticalAlign);
const OFFSET_MODE_OPTIONS = Enum.options(Enum.Common.offsetMode);
const OFFSET_ORIGIN_OPTIONS = Enum.options(Enum.Common.linearAlign);
const FONT_OPTIONS = Enum.options(Fonts.ENUM);

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<TextPathDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"textPath", TextPathDefinition> => {
    return {
        id,
        in: {
            text: null,
            font: null,
            path: null,
            size: null,
            spacing: null,
            rotation: null,
            anchor: null,
            align: null,
            offsetMode: null,
            offsetPercent: null,
            offsetLength: null,
            offsetOrigin: null,
            reversePath: null,
            strokeWidth: null,
            strokeColor: null,
            strokeDash: null,
            strokeDashOffset: null,
            strokeCap: null,
            fillColor: null,
            paintOrder: null,
            opacity: null,
        },
        out: {
            output: [],
            charCount: [],
        },
        payload: {
            label: "",
            font: 0,
            text: "Text",
            size: "16px",
            spacing: "0px",
            rotation: "0deg",
            anchor: Enum.Common.verticalAlign.MIDDLE.value,
            align: Enum.Common.linearAlign.START.value,
            offsetMode: Enum.Common.offsetMode.RELATIVE.value,
            offsetPercent: "0",
            offsetLength: "0px",
            offsetOrigin: Enum.Common.linearAlign.START.value,
            reversePath: false,
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
            ...input,
        },
        type: "textPath",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<TextPathDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<TextPathDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"path"}>
                Path
            </SocketIn>
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
            <SocketIn node={node} socketId={"reversePath"}>
                <CheckBox checked={node.payload.reversePath} onToggle={(reversePath) => handleUpdate({ reversePath })} disabled={node.in.reversePath !== null}>
                    Reverse Path
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"size"} label={"Font Size"}>
                <LengthInput value={node.payload.size} onCommit={(size) => handleUpdate({ size })} disabled={node.in.size !== null} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"spacing"} label={"Letter Spacing"}>
                <LengthInput value={node.payload.spacing} onCommit={(spacing) => handleUpdate({ spacing })} disabled={node.in.spacing !== null} required />
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
            <SocketIn node={node} socketId={"rotation"} label={"Letter Rotation"}>
                <AngleInput.SliderInput value={node.payload.rotation} onCommit={(rotation) => handleUpdate({ rotation })} disabled={node.in.rotation !== null} />
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
            <SocketIn node={node} socketId={"offsetPercent"} label={"Offset %"}>
                <DecimalInput.SliderInput
                    value={node.payload.offsetPercent}
                    onCommit={(offsetPercent) => handleUpdate({ offsetPercent })}
                    disabled={node.in.offsetPercent !== null || node.payload.offsetMode !== Enum.Common.offsetMode.RELATIVE.value}
                    min={-100}
                    max={100}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"offsetLength"} label={"Offset Length"}>
                <LengthInput
                    value={node.payload.offsetLength}
                    onCommit={(offsetLength) => handleUpdate({ offsetLength })}
                    disabled={node.in.offsetLength !== null || node.payload.offsetMode !== Enum.Common.offsetMode.ABSOLUTE.value}
                    required
                />
            </SocketIn>
            <SocketIn node={node} socketId={"offsetOrigin"} label={"Offset Origin"}>
                <RadioButton.Group
                    orientation={"horizontal"}
                    value={`${node.payload.offsetOrigin}`}
                    onValue={(v) => handleUpdate({ offsetOrigin: Number(v) })}
                    disabled={node.in.offsetOrigin !== null}
                    options={OFFSET_ORIGIN_OPTIONS}
                />
            </SocketIn>
            <StylingPrefab.Controls node={node} handleUpdate={handleUpdate} fill accordion />
            <NodeAccordion label={"Additional Options"} socketsOut={"charCount"} nodeId={node.id}>
                <SocketOut node={node} socketId={"charCount"}>
                    Character Count
                </SocketOut>
            </NodeAccordion>
        </TypicalNode>
    );
};

const ALL_INPUTS: (keyof TextPathDefinition["inputs"])[] = [
    "text",
    "font",
    "path",
    "size",
    "spacing",
    "rotation",
    "anchor",
    "align",
    "offsetMode",
    "offsetPercent",
    "offsetLength",
    "offsetOrigin",
    "reversePath",
    "strokeWidth",
    "strokeColor",
    "strokeCap",
    "strokeDash",
    "strokeDashOffset",
    "fillColor",
    "paintOrder",
];

const dependsOn = (_node: NodeDefinitions.NodeFor<TextPathDefinition>, outSocket: keyof TextPathDefinition["outputs"], _deps: AllDeps): (keyof TextPathDefinition["inputs"])[] => {
    if (outSocket === "charCount") return ["text"];
    return ALL_INPUTS;
};

const contributesTo = (_node: NodeDefinitions.NodeFor<TextPathDefinition>, inSocket: keyof TextPathDefinition["inputs"], _deps: AllDeps): (keyof TextPathDefinition["outputs"])[] => {
    if (inSocket === "text") return ["output", "charCount"];
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<TextPathDefinition>, socket: keyof TextPathDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output" && socket !== "charCount") return null;

    if (socket === "charCount") {
        const text = context.resolve<DataTypes.String>(node.id, "text")?.data ?? node.payload.text;
        return { kind: "integer", data: `${(text ?? "").length}` };
    }

    const pathData = context.resolve<DataTypes.Path>(node.id, "path")?.data;
    if (!pathData) return null;

    const reversePath = context.resolve<DataTypes.Boolean>(node.id, "reversePath")?.data ?? node.payload.reversePath;
    const pathD = reversePath ? (PaperHelper.reverseD(pathData.d) ?? pathData.d) : pathData.d;

    const text = context.resolve<DataTypes.String>(node.id, "text")?.data ?? node.payload.text;
    if (!text) return null;

    const fontVal = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "font")?.data, Fonts.ENUM) ?? node.payload.font ?? 0;
    const fontFamily = Fonts.familyOf(fontVal);

    const size = Math.max(0, Length.Emptyable.asNumber(context.resolve<DataTypes.Length>(node.id, "size")?.data ?? node.payload.size) ?? 16);
    const spacing = Length.Emptyable.asNumber(context.resolve<DataTypes.Length>(node.id, "spacing")?.data ?? node.payload.spacing) ?? 0;
    const rotation = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "rotation")?.data ?? node.payload.rotation) ?? 0;
    const align = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "align")?.data, Enum.Common.linearAlign) ?? node.payload.align;
    const anchor = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "anchor")?.data, Enum.Common.verticalAlign) ?? node.payload.anchor;

    const textAnchorValue: string = Resolver.EnumMappings.linearAlign[align] ?? "start";
    const dominantBaseline: string = Resolver.EnumMappings.textAnchor[anchor] ?? "central";

    const offsetMode = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "offsetMode")?.data, Enum.Common.offsetMode) ?? node.payload.offsetMode;
    const offsetOrigin = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "offsetOrigin")?.data, Enum.Common.linearAlign) ?? node.payload.offsetOrigin;
    const originPct = ["0%", "50%", "100%"][offsetOrigin] ?? "0%";

    let startOffset: string;
    if (offsetMode === Enum.Common.offsetMode.RELATIVE.value) {
        const pct = NumericString.Emptyable.asNumber(context.resolve<DataTypes.Float | DataTypes.Integer>(node.id, "offsetPercent")?.data ?? node.payload.offsetPercent) ?? 0;
        startOffset = `calc(clamp(0%, ${originPct} + ${pct}%, 100%))`;
    } else {
        const len = context.resolve<DataTypes.Length>(node.id, "offsetLength")?.data ?? node.payload.offsetLength;
        const lenNum = Length.Emptyable.asNumber(len) ?? 0;
        startOffset = `calc(clamp(0%, ${originPct} + ${lenNum}px, 100%))`;
    }

    const paint = StylingPrefab.evaluate(node, context);

    return {
        kind: "shape",
        data: {
            type: "text",
            text,
            fontFamily,
            fontSize: size,
            letterSpacing: spacing !== 0 ? spacing : undefined,
            textAnchor: textAnchorValue as "start" | "middle" | "end",
            dominantBaseline,
            rotate: rotation !== 0 ? rotation : undefined,
            paint,
            textPath: { d: pathD, startOffset },
            transform: pathData.transform,
        },
    };
};

export const TextPathNodeType: NodeTypes.Type<"textPath", TextPathDefinition> = {
    type: "textPath",
    displayName: "Text Path",
    defaultLabel: "Text Path",
    iconNode: <NodeIcon shape={NODE_ICONS.textPath} />,
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
