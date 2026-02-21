import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Stylings } from "../abstract";
import { Paint, Shape } from "../../shapeTypes";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { ColorHexInput } from "../../../components/inputs/ColorHexInput";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { TextInput } from "../../../components/inputs/TextInput";
import { Dropdown } from "../../../components/inputs/Dropdown";
import { Length } from "../../datatypes/length";

const STROKE_CAP_OPTIONS = Enum.options(Enum.Common.strokeCap);
const STROKE_JOIN_OPTIONS = Enum.options(Enum.Common.strokeJoin);
const PAINT_ORDER_OPTIONS = Enum.options(Enum.Common.paintOrder);

export type RestyleDefinition = {
    inputs: {
        shape: DataTypes.Use<"shape">;
        overrideStrokeColor: DataTypes.Use<"boolean">;
        overrideStrokeWidth: DataTypes.Use<"boolean">;
        overrideStrokeCap: DataTypes.Use<"boolean">;
        overrideStrokeJoin: DataTypes.Use<"boolean">;
        overrideStrokeDash: DataTypes.Use<"boolean">;
        overrideStrokeDashOffset: DataTypes.Use<"boolean">;
        overrideFillColor: DataTypes.Use<"boolean">;
        overridePaintOrder: DataTypes.Use<"boolean">;
    } & Stylings.Definition["inputs"];
    outputs: {
        output: DataTypes.Use<"shape">;
    };
    payload: {
        label: string;
        overrideStrokeColor: boolean;
        overrideStrokeWidth: boolean;
        overrideStrokeCap: boolean;
        overrideStrokeJoin: boolean;
        overrideStrokeDash: boolean;
        overrideStrokeDashOffset: boolean;
        overrideFillColor: boolean;
        overridePaintOrder: boolean;
    } & Stylings.Definition["payload"];
};

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
            strokeColor: null,
            strokeWidth: null,
            strokeCap: null,
            strokeJoin: null,
            strokeDash: null,
            strokeDashOffset: null,
            fillColor: null,
            paintOrder: null,
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
            // styling defaults
            strokeColor: { r: 0, g: 0, b: 0, a: 1 },
            strokeWidth: "1px",
            strokeCap: Enum.Common.strokeCap.BUTT.value,
            strokeJoin: Enum.Common.strokeJoin.MITER.value,
            strokeDash: "",
            strokeDashOffset: "0px",
            fillColor: null,
            paintOrder: 0,
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
};

const OVERRIDE_KEYS: { socket: keyof Stylings.Definition["inputs"]; flag: keyof OverrideFlags; payloadFlag: keyof RestyleDefinition["payload"]; overrideSocket: keyof RestyleDefinition["inputs"] }[] = [
    { socket: "strokeColor", flag: "strokeColor", payloadFlag: "overrideStrokeColor", overrideSocket: "overrideStrokeColor" },
    { socket: "strokeWidth", flag: "strokeWidth", payloadFlag: "overrideStrokeWidth", overrideSocket: "overrideStrokeWidth" },
    { socket: "strokeCap", flag: "strokeCap", payloadFlag: "overrideStrokeCap", overrideSocket: "overrideStrokeCap" },
    { socket: "strokeJoin", flag: "strokeJoin", payloadFlag: "overrideStrokeJoin", overrideSocket: "overrideStrokeJoin" },
    { socket: "strokeDash", flag: "strokeDash", payloadFlag: "overrideStrokeDash", overrideSocket: "overrideStrokeDash" },
    { socket: "strokeDashOffset", flag: "strokeDashOffset", payloadFlag: "overrideStrokeDashOffset", overrideSocket: "overrideStrokeDashOffset" },
    { socket: "fillColor", flag: "fillColor", payloadFlag: "overrideFillColor", overrideSocket: "overrideFillColor" },
    { socket: "paintOrder", flag: "paintOrder", payloadFlag: "overridePaintOrder", overrideSocket: "overridePaintOrder" },
];

const getOverrideFlags = (node: NodeDefinitions.NodeFor<RestyleDefinition>, context: Resolver.Context): OverrideFlags => {
    const flags: Record<string, boolean> = {};
    for (const { socket, flag, payloadFlag, overrideSocket } of OVERRIDE_KEYS) {
        if (node.in[socket] !== null) {
            flags[flag] = true;
        } else {
            const boolValue = context.resolve<"boolean">(node.id, overrideSocket)?.data;
            flags[flag] = boolValue ?? (node.payload[payloadFlag] as boolean);
        }
    }
    return flags as unknown as OverrideFlags;
};

const mergePaint = (original: Paint, resolved: Paint, overrides: OverrideFlags, signals?: string[]): Paint => {
    const result: Paint = { ...original };
    const noFill = signals?.includes("noFill") ?? false;

    if (overrides.fillColor && !noFill) result.fill = resolved.fill;
    if (overrides.paintOrder) result.paintOrder = resolved.paintOrder;

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
    }
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<RestyleDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<RestyleDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const strokeColorActive = node.in.strokeColor !== null || node.in.overrideStrokeColor !== null || node.payload.overrideStrokeColor;
    const strokeWidthActive = node.in.strokeWidth !== null || node.in.overrideStrokeWidth !== null || node.payload.overrideStrokeWidth;
    const strokeCapActive = node.in.strokeCap !== null || node.in.overrideStrokeCap !== null || node.payload.overrideStrokeCap;
    const strokeJoinActive = node.in.strokeJoin !== null || node.in.overrideStrokeJoin !== null || node.payload.overrideStrokeJoin;
    const strokeDashActive = node.in.strokeDash !== null || node.in.overrideStrokeDash !== null || node.payload.overrideStrokeDash;
    const strokeDashOffsetActive = node.in.strokeDashOffset !== null || node.in.overrideStrokeDashOffset !== null || node.payload.overrideStrokeDashOffset;
    const fillColorActive = node.in.fillColor !== null || node.in.overrideFillColor !== null || node.payload.overrideFillColor;
    const paintOrderActive = node.in.paintOrder !== null || node.in.overridePaintOrder !== null || node.payload.overridePaintOrder;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"shape"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"shape"} type={"shape"}>
                Shape
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"overrideStrokeColor"} type={"boolean"}>
                <CheckBox checked={strokeColorActive} onToggle={(overrideStrokeColor) => handleUpdate({ overrideStrokeColor })} disabled={node.in.overrideStrokeColor !== null || node.in.strokeColor !== null}>
                    Stroke Color
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"strokeColor"} type={"color"}>
                <ColorHexInput value={node.payload.strokeColor} onCommit={(strokeColor) => handleUpdate({ strokeColor })} disabled={!strokeColorActive} nullable alpha />
            </SocketIn>
            <SocketIn node={node} socketId={"overrideStrokeWidth"} type={"boolean"}>
                <CheckBox checked={strokeWidthActive} onToggle={(overrideStrokeWidth) => handleUpdate({ overrideStrokeWidth })} disabled={node.in.overrideStrokeWidth !== null || node.in.strokeWidth !== null}>
                    Stroke Width
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"strokeWidth"} type={"length"}>
                <LengthInput value={node.payload.strokeWidth} onCommit={(strokeWidth) => handleUpdate({ strokeWidth })} disabled={!strokeWidthActive} required />
            </SocketIn>
            <SocketIn node={node} socketId={"overrideStrokeCap"} type={"boolean"}>
                <CheckBox checked={strokeCapActive} onToggle={(overrideStrokeCap) => handleUpdate({ overrideStrokeCap })} disabled={node.in.overrideStrokeCap !== null || node.in.strokeCap !== null}>
                    Stroke Cap
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"strokeCap"} type={"enum"}>
                <RadioButton.Group
                    orientation={"horizontal"}
                    value={`${node.payload.strokeCap}`}
                    onValue={(v) => handleUpdate({ strokeCap: Number(v) })}
                    disabled={!strokeCapActive}
                    options={STROKE_CAP_OPTIONS}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"overrideStrokeJoin"} type={"boolean"}>
                <CheckBox checked={strokeJoinActive} onToggle={(overrideStrokeJoin) => handleUpdate({ overrideStrokeJoin })} disabled={node.in.overrideStrokeJoin !== null || node.in.strokeJoin !== null}>
                    Stroke Join
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"strokeJoin"} type={"enum"}>
                <RadioButton.Group
                    orientation={"horizontal"}
                    value={`${node.payload.strokeJoin}`}
                    onValue={(v) => handleUpdate({ strokeJoin: Number(v) })}
                    disabled={!strokeJoinActive}
                    options={STROKE_JOIN_OPTIONS}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"overrideStrokeDash"} type={"boolean"}>
                <CheckBox checked={strokeDashActive} onToggle={(overrideStrokeDash) => handleUpdate({ overrideStrokeDash })} disabled={node.in.overrideStrokeDash !== null || node.in.strokeDash !== null}>
                    Stroke Dash
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"strokeDash"} type={"tokens<length>"}>
                <TextInput value={node.payload.strokeDash} onCommit={(strokeDash) => handleUpdate({ strokeDash })} disabled={!strokeDashActive} pattern={Length.TOKENS_REGEX} />
            </SocketIn>
            <SocketIn node={node} socketId={"overrideStrokeDashOffset"} type={"boolean"}>
                <CheckBox checked={strokeDashOffsetActive} onToggle={(overrideStrokeDashOffset) => handleUpdate({ overrideStrokeDashOffset })} disabled={node.in.overrideStrokeDashOffset !== null || node.in.strokeDashOffset !== null}>
                    Dash Offset
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"strokeDashOffset"} type={"length"}>
                <LengthInput value={node.payload.strokeDashOffset} onCommit={(strokeDashOffset) => handleUpdate({ strokeDashOffset })} disabled={!strokeDashOffsetActive} required />
            </SocketIn>
            <SocketIn node={node} socketId={"overrideFillColor"} type={"boolean"}>
                <CheckBox checked={fillColorActive} onToggle={(overrideFillColor) => handleUpdate({ overrideFillColor })} disabled={node.in.overrideFillColor !== null || node.in.fillColor !== null}>
                    Fill Color
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"fillColor"} type={"color"}>
                <ColorHexInput value={node.payload.fillColor!} onCommit={(fillColor) => handleUpdate({ fillColor: fillColor! })} disabled={!fillColorActive} nullable alpha />
            </SocketIn>
            <SocketIn node={node} socketId={"overridePaintOrder"} type={"boolean"}>
                <CheckBox checked={paintOrderActive} onToggle={(overridePaintOrder) => handleUpdate({ overridePaintOrder })} disabled={node.in.overridePaintOrder !== null || node.in.paintOrder !== null}>
                    Paint Order
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"paintOrder"} type={"enum"}>
                <Dropdown value={`${node.payload.paintOrder}`} onValue={(v) => handleUpdate({ paintOrder: Number(v) })} disabled={!paintOrderActive}>
                    {PAINT_ORDER_OPTIONS.map((each) => (
                        <option value={`${each.value}`} key={`${each.value}`}>
                            {each.label}
                        </option>
                    ))}
                </Dropdown>
            </SocketIn>
        </TypicalNode>
    );
};

const OVERRIDE_INPUTS: (keyof RestyleDefinition["inputs"])[] = ["overrideStrokeColor", "overrideStrokeWidth", "overrideStrokeCap", "overrideStrokeJoin", "overrideStrokeDash", "overrideStrokeDashOffset", "overrideFillColor", "overridePaintOrder"];
const STYLING_INPUTS: (keyof RestyleDefinition["inputs"])[] = ["strokeColor", "strokeWidth", "strokeCap", "strokeJoin", "strokeDash", "strokeDashOffset", "fillColor", "paintOrder"];

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

    const inputShape = context.resolve<"shape">(node.id, "shape")?.data;
    if (!inputShape) return null;

    const overrides = getOverrideFlags(node, context);
    const anyActive = Object.values(overrides).some(Boolean);
    if (!anyActive) {
        return { kind: "shape", data: inputShape };
    }

    const resolvedPaint = Stylings.evaluate(node, context);
    const restyled = restyleShape(inputShape, resolvedPaint, overrides);
    return { kind: "shape", data: restyled };
};

const SOCKETTYPES_IN: { [key in keyof Required<RestyleDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    shape: { types: ["shape"], mode: "or" },
    overrideStrokeColor: { types: ["boolean"], mode: "or" },
    overrideStrokeWidth: { types: ["boolean"], mode: "or" },
    overrideStrokeCap: { types: ["boolean"], mode: "or" },
    overrideStrokeJoin: { types: ["boolean"], mode: "or" },
    overrideStrokeDash: { types: ["boolean"], mode: "or" },
    overrideStrokeDashOffset: { types: ["boolean"], mode: "or" },
    overrideFillColor: { types: ["boolean"], mode: "or" },
    overridePaintOrder: { types: ["boolean"], mode: "or" },
    ...Stylings.IN_SOCKET_TYPES,
};

const SOCKETTYPES_OUT: { [key in keyof Required<RestyleDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["shape"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<RestyleDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const RestyleNodeType: NodeTypes.Type<"restyle", RestyleDefinition> = {
    type: "restyle",
    displayName: "Re-style",
    defaultLabel: "Re-style",
    iconNode: <Icon shape={NODE_ICONS.overrideStyles.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.overrideStyles.Card} color={"var(--icon-flavour)"} />,
    category: "Collections",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
