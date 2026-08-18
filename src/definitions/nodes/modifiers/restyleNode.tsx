import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject } from "../../helpers/nodeHelper";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, SocketPair } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { SocketTypes } from "../../socketTypes";
import { Project } from "../../../state/project";
import { StylingPrefab } from "../../helpers/stylingPrefab";
import { Paint, Shape } from "../../shapeTypes";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { ColorHexInput } from "../../../components/inputs/ColorHexInput";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { TextInput } from "../../../components/inputs/TextInput";
import { Dropdown } from "../../../components/inputs/Dropdown";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { Length } from "../../datatypes/length";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const STROKE_CAP_OPTIONS = Enum.options(Enum.Common.strokeCap);
const STROKE_JOIN_OPTIONS = Enum.options(Enum.Common.strokeJoin);
const PAINT_ORDER_OPTIONS = Enum.options(Enum.Common.paintOrder);

const def = signature({
    in: {
        shape: "shape",
        overrideStrokeColor: "boolean",
        overrideStrokeWidth: "boolean",
        overrideStrokeCap: "boolean",
        overrideStrokeJoin: "boolean",
        overrideStrokeDash: "boolean",
        overrideStrokeDashOffset: "boolean",
        overrideFillColor: "boolean",
        overridePaintOrder: "boolean",
        overrideOpacity: "boolean",
        ...StylingPrefab.SIG_IN,
        ...StylingPrefab.SIG_FILL,
        ...StylingPrefab.SIG_JOIN,
    },
    out: { output: "shape" },
});

export type RestyleDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        overrideStrokeColor: boolean;
        overrideStrokeWidth: boolean;
        overrideStrokeCap: boolean;
        overrideStrokeJoin: boolean;
        overrideStrokeDash: boolean;
        overrideStrokeDashOffset: boolean;
        overrideFillColor: boolean;
        overridePaintOrder: boolean;
        overrideOpacity: boolean;
    } & StylingPrefab.Definition["payload"]
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<RestyleDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"restyle", RestyleDefinition> => {
    return {
        id,
        in: {
            shape: null,
            overrideStrokeColor: null,
            overrideStrokeWidth: null,
            overrideStrokeCap: null,
            overrideStrokeJoin: null,
            overrideStrokeDash: null,
            overrideStrokeDashOffset: null,
            overrideFillColor: null,
            overridePaintOrder: null,
            overrideOpacity: null,
            strokeColor: null,
            strokeWidth: null,
            strokeCap: null,
            strokeJoin: null,
            strokeDash: null,
            strokeDashOffset: null,
            fillColor: null,
            paintOrder: null,
            opacity: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            overrideStrokeColor: false,
            overrideStrokeWidth: false,
            overrideStrokeCap: false,
            overrideStrokeJoin: false,
            overrideStrokeDash: false,
            overrideStrokeDashOffset: false,
            overrideFillColor: false,
            overridePaintOrder: false,
            overrideOpacity: false,
            // styling defaults
            strokeColor: { r: 0, g: 0, b: 0, a: 1 },
            strokeWidth: "1px",
            strokeCap: Enum.Common.strokeCap.BUTT.value,
            strokeJoin: Enum.Common.strokeJoin.MITER.value,
            strokeDash: "",
            strokeDashOffset: "0px",
            fillColor: { r: 0, g: 0, b: 0, a: 0 },
            paintOrder: 0,
            opacity: "100",
        },
        type: "restyle",
    };
};

type OverrideFlags = {
    strokeColor: boolean;
    strokeWidth: boolean;
    strokeCap: boolean;
    strokeJoin: boolean;
    strokeDash: boolean;
    strokeDashOffset: boolean;
    fillColor: boolean;
    paintOrder: boolean;
    opacity: boolean;
};

const OVERRIDE_KEYS: {
    socket: keyof StylingPrefab.Definition["inputs"];
    flag: keyof OverrideFlags;
    payloadFlag: keyof RestyleDefinition["payload"];
    overrideSocket: keyof RestyleDefinition["inputs"];
}[] = [
    { socket: "strokeColor", flag: "strokeColor", payloadFlag: "overrideStrokeColor", overrideSocket: "overrideStrokeColor" },
    { socket: "strokeWidth", flag: "strokeWidth", payloadFlag: "overrideStrokeWidth", overrideSocket: "overrideStrokeWidth" },
    { socket: "strokeCap", flag: "strokeCap", payloadFlag: "overrideStrokeCap", overrideSocket: "overrideStrokeCap" },
    { socket: "strokeJoin", flag: "strokeJoin", payloadFlag: "overrideStrokeJoin", overrideSocket: "overrideStrokeJoin" },
    { socket: "strokeDash", flag: "strokeDash", payloadFlag: "overrideStrokeDash", overrideSocket: "overrideStrokeDash" },
    { socket: "strokeDashOffset", flag: "strokeDashOffset", payloadFlag: "overrideStrokeDashOffset", overrideSocket: "overrideStrokeDashOffset" },
    { socket: "fillColor", flag: "fillColor", payloadFlag: "overrideFillColor", overrideSocket: "overrideFillColor" },
    { socket: "paintOrder", flag: "paintOrder", payloadFlag: "overridePaintOrder", overrideSocket: "overridePaintOrder" },
    { socket: "opacity", flag: "opacity", payloadFlag: "overrideOpacity", overrideSocket: "overrideOpacity" },
];

const getOverrideFlags = (node: NodeDefinitions.NodeFor<RestyleDefinition>, context: Resolver.Context): OverrideFlags => {
    const flags: Record<string, boolean> = {};
    for (const { flag, payloadFlag, overrideSocket } of OVERRIDE_KEYS) {
        const boolValue = context.resolve<DataTypes.Boolean>(node.id, overrideSocket)?.data;
        flags[flag] = boolValue ?? (node.payload[payloadFlag] as boolean);
    }
    return flags as unknown as OverrideFlags;
};

const mergePaint = (original: Paint, resolved: Paint, overrides: OverrideFlags, signals?: string[]): Paint => {
    const result: Paint = { ...original };
    const noFill = signals?.includes("noFill") ?? false;

    if (overrides.fillColor && !noFill) result.fill = resolved.fill;
    if (overrides.paintOrder) result.paintOrder = resolved.paintOrder;
    if (overrides.opacity) result.opacity = resolved.opacity;

    const anyStroke = overrides.strokeColor || overrides.strokeWidth || overrides.strokeCap || overrides.strokeJoin || overrides.strokeDash || overrides.strokeDashOffset;

    if (anyStroke) {
        const orig = original.stroke;
        const neo = resolved.stroke;
        const color = overrides.strokeColor ? (neo?.color ?? null) : (orig?.color ?? null);

        if (color !== null) {
            const dashArray = overrides.strokeDash ? neo?.dash?.array : orig?.dash?.array;
            const dashOffset = overrides.strokeDashOffset ? (neo?.dash?.offset ?? 0) : (orig?.dash?.offset ?? 0);
            result.stroke = {
                color,
                width: overrides.strokeWidth ? (neo?.width ?? 0) : (orig?.width ?? 0),
                cap: overrides.strokeCap ? (neo?.cap ?? "butt") : (orig?.cap ?? "butt"),
                join: overrides.strokeJoin ? (neo?.join ?? "miter") : (orig?.join ?? "miter"),
                dash: dashArray ? { array: dashArray, offset: dashOffset } : undefined,
            };
        } else {
            delete result.stroke;
        }
    }

    return result;
};

const restyleShape = (shape: Shape, newPaint: Paint, overrides: OverrideFlags): Shape => {
    switch (shape.type) {
        case "path":
        case "line":
        case "rect":
        case "text":
            return { ...shape, paint: mergePaint(shape.paint, newPaint, overrides, shape.signals) };
        case "group":
            return { ...shape, children: shape.children.map((c) => (c ? restyleShape(c, newPaint, overrides) : null)) };
        case "offsetPath":
            return { ...shape, shape: restyleShape(shape.shape, newPaint, overrides) };
        case "symbol":
            return { ...shape, symbol: { ...shape.symbol, content: restyleShape(shape.symbol.content, newPaint, overrides) } };
        case "masked":
            return { ...shape, content: restyleShape(shape.content, newPaint, overrides) };
        case "clipped":
            return { ...shape, content: restyleShape(shape.content, newPaint, overrides) };
        case "filtered":
            return { ...shape, content: restyleShape(shape.content, newPaint, overrides) };
    }
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<RestyleDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<RestyleDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const strokeColorActive = node.in.overrideStrokeColor !== null || node.payload.overrideStrokeColor;
    const strokeWidthActive = node.in.overrideStrokeWidth !== null || node.payload.overrideStrokeWidth;
    const strokeCapActive = node.in.overrideStrokeCap !== null || node.payload.overrideStrokeCap;
    const strokeJoinActive = node.in.overrideStrokeJoin !== null || node.payload.overrideStrokeJoin;
    const strokeDashActive = node.in.overrideStrokeDash !== null || node.payload.overrideStrokeDash;
    const strokeDashOffsetActive = node.in.overrideStrokeDashOffset !== null || node.payload.overrideStrokeDashOffset;
    const fillColorActive = node.in.overrideFillColor !== null || node.payload.overrideFillColor;
    const paintOrderActive = node.in.overridePaintOrder !== null || node.payload.overridePaintOrder;
    const opacityActive = node.in.overrideOpacity !== null || node.payload.overrideOpacity;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketPair node={node} socketInId={"shape"} socketOutId={"output"}>
                <span>Shape</span>
                <span>Output</span>
            </SocketPair>
            <hr />
            <SocketIn node={node} socketId={"overrideStrokeColor"}>
                <CheckBox checked={strokeColorActive} onToggle={(overrideStrokeColor) => handleUpdate({ overrideStrokeColor })} disabled={node.in.overrideStrokeColor !== null}>
                    Stroke Color
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"strokeColor"}>
                <ColorHexInput value={node.payload.strokeColor} onCommit={(strokeColor) => handleUpdate({ strokeColor })} disabled={node.in.strokeColor !== null} alpha required />
            </SocketIn>
            <SocketIn node={node} socketId={"overrideStrokeWidth"}>
                <CheckBox checked={strokeWidthActive} onToggle={(overrideStrokeWidth) => handleUpdate({ overrideStrokeWidth })} disabled={node.in.overrideStrokeWidth !== null}>
                    Stroke Width
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"strokeWidth"}>
                <LengthInput value={node.payload.strokeWidth} onCommit={(strokeWidth) => handleUpdate({ strokeWidth })} disabled={node.in.strokeWidth !== null} required />
            </SocketIn>
            <SocketIn node={node} socketId={"overrideStrokeCap"}>
                <CheckBox checked={strokeCapActive} onToggle={(overrideStrokeCap) => handleUpdate({ overrideStrokeCap })} disabled={node.in.overrideStrokeCap !== null}>
                    Stroke Cap
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"strokeCap"}>
                <RadioButton.Group
                    orientation={"horizontal"}
                    value={`${node.payload.strokeCap}`}
                    onValue={(v) => handleUpdate({ strokeCap: Number(v) })}
                    disabled={node.in.strokeCap !== null}
                    options={STROKE_CAP_OPTIONS}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"overrideStrokeJoin"}>
                <CheckBox checked={strokeJoinActive} onToggle={(overrideStrokeJoin) => handleUpdate({ overrideStrokeJoin })} disabled={node.in.overrideStrokeJoin !== null}>
                    Stroke Join
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"strokeJoin"}>
                <RadioButton.Group
                    orientation={"horizontal"}
                    value={`${node.payload.strokeJoin}`}
                    onValue={(v) => handleUpdate({ strokeJoin: Number(v) })}
                    disabled={node.in.strokeJoin !== null}
                    options={STROKE_JOIN_OPTIONS}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"overrideStrokeDash"}>
                <CheckBox checked={strokeDashActive} onToggle={(overrideStrokeDash) => handleUpdate({ overrideStrokeDash })} disabled={node.in.overrideStrokeDash !== null}>
                    Stroke Dash
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"strokeDash"}>
                <TextInput value={node.payload.strokeDash} onCommit={(strokeDash) => handleUpdate({ strokeDash })} disabled={node.in.strokeDash !== null} pattern={Length.TOKENS_REGEX} />
            </SocketIn>
            <SocketIn node={node} socketId={"overrideStrokeDashOffset"}>
                <CheckBox checked={strokeDashOffsetActive} onToggle={(overrideStrokeDashOffset) => handleUpdate({ overrideStrokeDashOffset })} disabled={node.in.overrideStrokeDashOffset !== null}>
                    Dash Offset
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"strokeDashOffset"}>
                <LengthInput value={node.payload.strokeDashOffset} onCommit={(strokeDashOffset) => handleUpdate({ strokeDashOffset })} disabled={node.in.strokeDashOffset !== null} required />
            </SocketIn>
            <SocketIn node={node} socketId={"overrideFillColor"}>
                <CheckBox checked={fillColorActive} onToggle={(overrideFillColor) => handleUpdate({ overrideFillColor })} disabled={node.in.overrideFillColor !== null}>
                    Fill Color
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"fillColor"}>
                <ColorHexInput value={node.payload.fillColor!} onCommit={(fillColor) => handleUpdate({ fillColor: fillColor! })} disabled={node.in.fillColor !== null} required alpha />
            </SocketIn>
            <SocketIn node={node} socketId={"overridePaintOrder"}>
                <CheckBox checked={paintOrderActive} onToggle={(overridePaintOrder) => handleUpdate({ overridePaintOrder })} disabled={node.in.overridePaintOrder !== null}>
                    Paint Order
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"paintOrder"}>
                <Dropdown value={`${node.payload.paintOrder}`} onValue={(v) => handleUpdate({ paintOrder: Number(v) })} disabled={node.in.paintOrder !== null}>
                    {PAINT_ORDER_OPTIONS.map((each) => (
                        <option value={`${each.value}`} key={`${each.value}`}>
                            {each.label}
                        </option>
                    ))}
                </Dropdown>
            </SocketIn>
            <SocketIn node={node} socketId={"overrideOpacity"}>
                <CheckBox checked={opacityActive} onToggle={(overrideOpacity) => handleUpdate({ overrideOpacity })} disabled={node.in.overrideOpacity !== null}>
                    Opacity
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"opacity"}>
                <DecimalInput value={node.payload.opacity} onCommit={(opacity) => handleUpdate({ opacity })} disabled={node.in.opacity !== null} required />
            </SocketIn>
        </TypicalNode>
    );
};

const OVERRIDE_INPUTS: (keyof RestyleDefinition["inputs"])[] = [
    "overrideStrokeColor",
    "overrideStrokeWidth",
    "overrideStrokeCap",
    "overrideStrokeJoin",
    "overrideStrokeDash",
    "overrideStrokeDashOffset",
    "overrideFillColor",
    "overridePaintOrder",
    "overrideOpacity",
];
const STYLING_INPUTS: (keyof RestyleDefinition["inputs"])[] = ["strokeColor", "strokeWidth", "strokeCap", "strokeJoin", "strokeDash", "strokeDashOffset", "fillColor", "paintOrder", "opacity"];

const dependsOn = (_node: NodeDefinitions.NodeFor<RestyleDefinition>, outSocket: keyof RestyleDefinition["outputs"], _deps: AllDeps): (keyof RestyleDefinition["inputs"])[] => {
    if (outSocket === "output") {
        return ["shape", ...OVERRIDE_INPUTS, ...STYLING_INPUTS];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<RestyleDefinition>, _inSocket: keyof RestyleDefinition["inputs"], _deps: AllDeps): (keyof RestyleDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<RestyleDefinition>, socket: keyof RestyleDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const inputShape = context.resolve<DataTypes.Shape>(node.id, "shape")?.data;
    if (!inputShape) return null;

    const overrides = getOverrideFlags(node, context);
    const anyActive = Object.values(overrides).some(Boolean);
    if (!anyActive) {
        return { kind: "shape", data: inputShape };
    }

    const resolvedPaint = StylingPrefab.evaluate(node, context);
    const restyled = restyleShape(inputShape, resolvedPaint, overrides);
    return { kind: "shape", data: restyled };
};

const SHAPE_RULE_IN: SocketTypes.Term = SocketTypes.of(DataTypes.SHAPE);
const SHAPE_RULE_OUT: SocketTypes.Term = SocketTypes.of(DataTypes.SHAPE);

export const RestyleNodeType: NodeTypes.Type<"restyle", RestyleDefinition> = {
    type: "restyle",
    displayName: "Re-style",
    defaultLabel: "Re-style",
    iconNode: <NodeIcon shape={NODE_ICONS.restyle} />,
    flavour: "emphasis",
    category: "Modifiers",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
    canInterject: passthroughCanInterject(SHAPE_RULE_IN, SHAPE_RULE_OUT),
    onInterject: passthroughInterject("shape", "output"),
};
