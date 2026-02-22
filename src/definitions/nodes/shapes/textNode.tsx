import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Stylings } from "../abstract";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { BlockInput } from "../../../components/inputs/BlockInput";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { NumericString } from "../../datatypes/numericString";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { PaperHelper } from "../../../util/paperHelper";

export type TextPathDefinition = {
    inputs: {
        text: DataTypes.Use<"string">;
        // font: DataTypes.Use<"enum">; // for later
        path: DataTypes.Use<"path">;
        size: DataTypes.Use<"length">; // font size
        spacing: DataTypes.Use<"length">; // font spacing
        rotation: DataTypes.Use<"angle">;
        anchor: DataTypes.Use<"enum">;
        align: DataTypes.Use<"enum">;
        offsetMode: DataTypes.Use<"enum">;
        offsetPercent: DataTypes.Use<"float" | "integer">;
        offsetLength: DataTypes.Use<"length">;
        offsetOrigin: DataTypes.Use<"enum">;
        reversePath: DataTypes.Use<"boolean">;
    } & Stylings.Definition["inputs"];
    outputs: {
        output: DataTypes.Use<"shape">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        // font: DataTypes.TypeOf<DataTypes.Use<"enum">>; // later
        text: DataTypes.TypeOf<DataTypes.Use<"string">>;
        size: DataTypes.TypeOf<DataTypes.Use<"length">>;
        spacing: DataTypes.TypeOf<DataTypes.Use<"length">>;
        rotation: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        anchor: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        align: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        offsetMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        offsetPercent: DataTypes.TypeOf<DataTypes.Use<"float">>;
        offsetLength: DataTypes.TypeOf<DataTypes.Use<"length">>;
        offsetOrigin: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        reversePath: DataTypes.TypeOf<DataTypes.Use<"boolean">>;
    } & Stylings.Definition["payload"];
};

const TEXT_ALIGN_OPTIONS = Enum.options(Enum.Common.textAlign);
const TEXT_ANCHOR_OPTIONS = Enum.options(Enum.Common.textAnchor);
const OFFSET_MODE_OPTIONS = Enum.options(Enum.Common.offsetMode);
const OFFSET_ORIGIN_OPTIONS = Enum.options(Enum.Common.offsetOrigin);

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<TextPathDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"textPath", TextPathDefinition> => {
    return {
        id,
        in: {
            text: null,
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
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            text: "Text",
            size: "16px",
            spacing: "0px",
            rotation: "0",
            anchor: Enum.Common.textAnchor.MIDDLE.value,
            align: Enum.Common.textAlign.START.value,
            offsetMode: Enum.Common.offsetMode.RELATIVE.value,
            offsetPercent: "0",
            offsetLength: "0px",
            offsetOrigin: Enum.Common.offsetOrigin.START.value,
            reversePath: false,
            // stroke
            strokeWidth: "0px",
            strokeDash: "",
            strokeColor: null,
            strokeDashOffset: "0px",
            strokeCap: Enum.Common.strokeCap.BUTT.value,
            // fill
            fillColor: { r: 0, g: 0, b: 0, a: 1 },
            paintOrder: 0,
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
            <SocketIn node={node} socketId={"text"} label={"Text"}>
                <BlockInput value={node.payload.text} onCommit={(text) => handleUpdate({ text })} disabled={node.in.text !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"path"} label={"Path"} />
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
            <Stylings.Controls node={node} handleUpdate={handleUpdate} fill accordion />
        </TypicalNode>
    );
};

const ALL_INPUTS: (keyof TextPathDefinition["inputs"])[] = [
    "text",
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

const dependsOn = (_node: NodeDefinitions.NodeFor<TextPathDefinition>, _outSocket: keyof TextPathDefinition["outputs"], _deps: AllDeps): (keyof TextPathDefinition["inputs"])[] => {
    return ALL_INPUTS;
};

const contributesTo = (_node: NodeDefinitions.NodeFor<TextPathDefinition>, _inSocket: keyof TextPathDefinition["inputs"], _deps: AllDeps): (keyof TextPathDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<TextPathDefinition>, socket: keyof TextPathDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const pathData = context.resolve<"path">(node.id, "path")?.data;
    if (!pathData) return null;

    const reversePath = context.resolve<"boolean">(node.id, "reversePath")?.data ?? node.payload.reversePath;
    const pathD = reversePath ? (PaperHelper.reverseD(pathData.d) ?? pathData.d) : pathData.d;

    const text = context.resolve<"string">(node.id, "text")?.data ?? node.payload.text;
    if (!text) return null;

    const size = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "size")?.data ?? node.payload.size) ?? 16;
    const spacing = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "spacing")?.data ?? node.payload.spacing) ?? 0;
    const rotation = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "rotation")?.data ?? node.payload.rotation) ?? 0;
    const align = Enum.resolve(context.resolve<"enum">(node.id, "align")?.data, Enum.Common.textAlign) ?? node.payload.align;
    const anchor = Enum.resolve(context.resolve<"enum">(node.id, "anchor")?.data, Enum.Common.textAnchor) ?? node.payload.anchor;

    const textAnchorValue: string = Resolver.EnumMappings.textAlign[align] ?? "start";
    const dominantBaseline: string = Resolver.EnumMappings.textAnchor[anchor] ?? "central";

    const offsetMode = Enum.resolve(context.resolve<"enum">(node.id, "offsetMode")?.data, Enum.Common.offsetMode) ?? node.payload.offsetMode;
    const offsetOrigin = Enum.resolve(context.resolve<"enum">(node.id, "offsetOrigin")?.data, Enum.Common.offsetOrigin) ?? node.payload.offsetOrigin;
    const originPct = ["0%", "50%", "100%"][offsetOrigin] ?? "0%";

    let startOffset: string;
    if (offsetMode === Enum.Common.offsetMode.RELATIVE.value) {
        const pct = NumericString.Emptyable.asNumber(context.resolve<"float" | "integer">(node.id, "offsetPercent")?.data ?? node.payload.offsetPercent) ?? 0;
        startOffset = `calc(clamp(0%, ${originPct} + ${pct}%, 100%))`;
    } else {
        const len = context.resolve<"length">(node.id, "offsetLength")?.data ?? node.payload.offsetLength;
        const lenNum = Length.Emptyable.asNumber(len) ?? 0;
        startOffset = `calc(clamp(0%, ${originPct} + ${lenNum}px, 100%))`;
    }

    const paint = Stylings.evaluate(node, context);

    return {
        kind: "shape",
        data: {
            type: "text",
            text,
            fontSize: size,
            letterSpacing: spacing !== 0 ? spacing : undefined,
            textAnchor: textAnchorValue as "start" | "middle" | "end",
            dominantBaseline,
            rotate: rotation !== 0 ? rotation : undefined,
            paint,
            textPath: { d: pathD, startOffset },
            transform: pathData.transform,
            preview: pathData.preview,
        },
    };
};

const SOCKETTYPES_IN: { [key in keyof Required<TextPathDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    text: { types: ["string"], mode: "or" },
    path: { types: ["path"], mode: "or" },
    size: { types: ["length"], mode: "or" },
    spacing: { types: ["length"], mode: "or" },
    rotation: { types: ["angle"], mode: "or" },
    anchor: { types: ["enum"], mode: "or" },
    align: { types: ["enum"], mode: "or" },
    offsetMode: { types: ["enum"], mode: "or" },
    offsetPercent: { types: ["float", "integer"], mode: "or" },
    offsetLength: { types: ["length"], mode: "or" },
    offsetOrigin: { types: ["enum"], mode: "or" },
    reversePath: { types: ["boolean"], mode: "or" },
    ...Stylings.IN_SOCKET_TYPES,
};

const SOCKETTYPES_OUT: { [key in keyof Required<TextPathDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["shape"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<TextPathDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const TextPathNodeType: NodeTypes.Type<"textPath", TextPathDefinition> = {
    type: "textPath",
    displayName: "Text Path",
    defaultLabel: "Text Path",
    iconNode: <Icon shape={NODE_ICONS.text} color={"var(--icon-flavour)"} />,
    category: "Shapes",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
