import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { NumericString } from "../../datatypes/numericString";
import { deg2rad, delerp, distroInterpolator, lerp } from "../../../util/misc";
import { Stylings, Transforms } from "../abstract";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { AngleInput } from "../../../components/inputs/AngleInput";

export type BurstDefinition = {
    inputs: {
        spurCount: DataTypes.Use<"integer">;
        radius: DataTypes.Use<"length">;
        spread: DataTypes.Use<"length">;
        innerRadius: DataTypes.Use<"length">;
        outerRadius: DataTypes.Use<"length">;
        spanMode: DataTypes.Use<"enum">;
        spreadAlign: DataTypes.Use<"enum">;
        thetaMode: DataTypes.Use<"enum">;
        thetaStart: DataTypes.Use<"angle">;
        thetaEnd: DataTypes.Use<"angle">;
        thetaSteps: DataTypes.Use<"angle">;
        thetaInclusive: DataTypes.Use<"boolean">;
        thetaCurve: DataTypes.Use<"distribution">;
        markerStart: DataTypes.Use<"shape">;
        markerEnd: DataTypes.Use<"shape">;
        markerAlign: DataTypes.Use<"boolean">;
    } & Stylings.Definition["inputs"] &
        Transforms.Definition["inputs"];
    outputs: {
        output: DataTypes.Use<"shape">;
        path: DataTypes.Use<"path">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        spurCount: DataTypes.TypeOf<DataTypes.Use<"integer">>;
        spanMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        spreadAlign: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        radius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        spread: DataTypes.TypeOf<DataTypes.Use<"length">>;
        innerRadius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        outerRadius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        thetaMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        thetaStart: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        thetaEnd: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        thetaSteps: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        thetaInclusive: DataTypes.TypeOf<DataTypes.Use<"boolean">>;
        markerAlign: DataTypes.TypeOf<DataTypes.Use<"boolean">>;
    } & Stylings.Definition["payload"] &
        Transforms.Definition["payload"];
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<BurstDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"burst", BurstDefinition> => {
    return {
        id,
        in: {
            spurCount: null,
            radius: null,
            spread: null,
            innerRadius: null,
            outerRadius: null,
            spanMode: null,
            spreadAlign: null,
            thetaMode: null,
            thetaStart: null,
            thetaEnd: null,
            thetaSteps: null,
            thetaInclusive: null,
            thetaCurve: null,

            markerStart: null,
            markerEnd: null,
            markerAlign: null,

            strokeWidth: null,
            strokeColor: null,
            strokeDash: null,
            strokeDashOffset: null,
            strokeCap: null,
            fillColor: null,
            paintOrder: null,
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
            path: [],
        },
        payload: {
            label: "",
            spurCount: "5",
            spanMode: Enum.Common.spanMode.INNER_OUTER.value,
            spreadAlign: 0,
            radius: "150px",
            spread: "20px",
            innerRadius: "140px",
            outerRadius: "160px",
            thetaMode: Enum.Common.thetaMode.INCREMENTAL.value,
            thetaStart: "0",
            thetaEnd: "90",
            thetaSteps: "30",
            thetaInclusive: false,
            markerAlign: true,
            // stroke
            strokeWidth: "1px",
            strokeDash: "",
            strokeColor: { r: 0, g: 0, b: 0, a: 1 },
            strokeDashOffset: "0px",
            strokeCap: Enum.Common.strokeCap.BUTT.value,
            // fill
            fillColor: null,
            paintOrder: 0,
            // transforms
            positionMode: Enum.Common.positionMode.CARTESIAN.value,
            positionX: "0px",
            positionY: "0px",
            positionRadius: "0px",
            positionTheta: "0",
            rotation: "0",
        },
        type: "burst",
    };
};

const SPAN_MODE_OPTIONS = Enum.options(Enum.Common.spanMode);
const THETA_MODE_OPTIONS = Enum.options(Enum.Common.thetaMode);
const SPREAD_ALIGN_OPTIONS = Enum.options(Enum.Common.spreadAlign);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<BurstDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<BurstDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const isInOut = node.payload.spanMode === 0 && node.in.spanMode === null;
    const isSpread = node.payload.spanMode === 1 && node.in.spanMode === null;
    const isStartStop = node.payload.thetaMode === 0 && node.in.thetaMode === null;
    const isIncremental = node.payload.thetaMode === 1 && node.in.thetaMode === null;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketOut node={node} socketId={"path"}>
                Path
            </SocketOut>
            <SocketIn node={node} socketId={"spurCount"} label={"Spurs"}>
                <IntegerInput value={node.payload.spurCount} onCommit={(spurCount) => handleUpdate({ spurCount })} disabled={node.in.spurCount !== null} min={"0"} required />
            </SocketIn>

            <SocketIn node={node} socketId={"spanMode"} label={"Radial Mode"}>
                <RadioButton.Group
                    options={SPAN_MODE_OPTIONS}
                    value={`${node.payload.spanMode}`}
                    onValue={(v) => handleUpdate({ spanMode: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.spanMode !== null}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"innerRadius"} label={"Inner Radius"}>
                <LengthInput value={node.payload.innerRadius} onCommit={(innerRadius) => handleUpdate({ innerRadius })} disabled={node.in.innerRadius !== null || isSpread} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"outerRadius"} label={"Outer Radius"}>
                <LengthInput value={node.payload.outerRadius} onCommit={(outerRadius) => handleUpdate({ outerRadius })} disabled={node.in.outerRadius !== null || isSpread} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"radius"} label={"Radius"}>
                <LengthInput value={node.payload.radius} onCommit={(radius) => handleUpdate({ radius })} disabled={node.in.radius !== null || isInOut} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"spread"} label={"Spread"}>
                <LengthInput value={node.payload.spread} onCommit={(spread) => handleUpdate({ spread })} disabled={node.in.spread !== null || isInOut} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"spreadAlign"} label={"Spread Align"}>
                <RadioButton.Group
                    options={SPREAD_ALIGN_OPTIONS}
                    value={`${node.payload.spreadAlign}`}
                    onValue={(v) => handleUpdate({ spreadAlign: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.spreadAlign !== null || isInOut}
                />
            </SocketIn>

            <hr />
            <SocketIn node={node} socketId={"thetaMode"} label={"Theta Mode"}>
                <RadioButton.Group
                    options={THETA_MODE_OPTIONS}
                    value={`${node.payload.thetaMode}`}
                    onValue={(v) => handleUpdate({ thetaMode: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.thetaMode !== null}
                />
            </SocketIn>

            <SocketIn node={node} socketId={"thetaStart"} label={"Start Theta"}>
                <AngleInput.SliderInput value={node.payload.thetaStart} onCommit={(thetaStart) => handleUpdate({ thetaStart })} disabled={node.in.thetaStart !== null || isIncremental} unbound />
            </SocketIn>
            <SocketIn node={node} socketId={"thetaEnd"} label={"End Theta"}>
                <AngleInput.SliderInput value={node.payload.thetaEnd} onCommit={(thetaEnd) => handleUpdate({ thetaEnd })} disabled={node.in.thetaEnd !== null || isIncremental} unbound />
            </SocketIn>
            <SocketIn node={node} socketId={"thetaInclusive"}>
                <CheckBox checked={node.payload.thetaInclusive} onToggle={(thetaInclusive) => handleUpdate({ thetaInclusive })} disabled={node.in.thetaInclusive !== null || isIncremental}>
                    Inclusive End
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"thetaSteps"} label={"Step Theta"}>
                <AngleInput.SliderInput value={node.payload.thetaSteps} onCommit={(thetaSteps) => handleUpdate({ thetaSteps })} disabled={node.in.thetaSteps !== null || isStartStop} unbound />
            </SocketIn>
            <SocketIn node={node} socketId={"thetaCurve"}>
                Angular Distribution
            </SocketIn>

            <NodeAccordion label={"More"} socketsIn={"markerStart|markerEnd|markerAlign"} nodeId={node.id}>
                <SocketIn node={node} socketId={"markerStart"}>
                    Marker Start
                </SocketIn>
                <SocketIn node={node} socketId={"markerEnd"}>
                    Marker End
                </SocketIn>
                <SocketIn node={node} socketId={"markerAlign"}>
                    <CheckBox checked={node.payload.markerAlign} onToggle={(markerAlign) => handleUpdate({ markerAlign })} disabled={node.in.markerAlign !== null}>
                        Align Markers
                    </CheckBox>
                </SocketIn>
            </NodeAccordion>
            <Stylings.Controls node={node} handleUpdate={handleUpdate} accordion />
            <Transforms.Controls node={node} handleUpdate={handleUpdate} accordion />
        </TypicalNode>
    );
};

const GEOMETRY_INPUTS: (keyof BurstDefinition["inputs"])[] = [
    "spurCount",
    "radius",
    "spread",
    "innerRadius",
    "outerRadius",
    "spanMode",
    "spreadAlign",
    "thetaMode",
    "thetaStart",
    "thetaEnd",
    "thetaSteps",
    "thetaInclusive",
    "thetaCurve",
    "markerStart",
    "markerEnd",
    "markerAlign",
    "positionMode",
    "positionX",
    "positionY",
    "positionRadius",
    "positionTheta",
    "rotation",
];
const STYLING_INPUTS: (keyof BurstDefinition["inputs"])[] = ["strokeWidth", "strokeColor", "strokeCap", "strokeDash", "strokeDashOffset", "fillColor", "paintOrder"];

const dependsOn = (_node: NodeDefinitions.NodeFor<BurstDefinition>, outSocket: keyof BurstDefinition["outputs"], _deps: AllDeps): (keyof BurstDefinition["inputs"])[] => {
    if (outSocket === "path") {
        return GEOMETRY_INPUTS;
    }
    return [...GEOMETRY_INPUTS, ...STYLING_INPUTS];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<BurstDefinition>, inSocket: keyof BurstDefinition["inputs"], _deps: AllDeps): (keyof BurstDefinition["outputs"])[] => {
    if (STYLING_INPUTS.includes(inSocket)) {
        return ["output"];
    }
    return ["output", "path"];
};

const evaluate = (node: NodeDefinitions.NodeFor<BurstDefinition>, socket: keyof BurstDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const spurCount = Math.round(Math.max(0, NumericString.Emptyable.asNumber(context.resolve<"integer">(node.id, "spurCount")?.data ?? node.payload.spurCount) ?? NaN));
    if (!isFinite(spurCount) || spurCount <= 0) return null;

    const N = spurCount;
    const spanMode = Enum.resolve(context.resolve<"enum">(node.id, "spanMode")?.data, Enum.Common.spanMode) ?? node.payload.spanMode ?? 0;

    let rI: number;
    let rO: number;

    if (spanMode === Enum.Common.spanMode.INNER_OUTER.value) {
        rI = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "innerRadius")?.data ?? node.payload.innerRadius, "0px")) ?? 0;
        rO = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "outerRadius")?.data ?? node.payload.outerRadius, "0px")) ?? 0;
    } else {
        const radius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "radius")?.data ?? node.payload.radius, "0px")) ?? 0;
        const spread = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "spread")?.data ?? node.payload.spread, "0px")) ?? 0;
        if (!radius) return null;

        const spreadAlign = Enum.resolve(context.resolve<"enum">(node.id, "spreadAlign")?.data, Enum.Common.spreadAlign) ?? node.payload.spreadAlign ?? 0;

        const tIMod = spreadAlign === Enum.Common.spreadAlign.CENTER.value ? spread / 2 : spreadAlign === Enum.Common.spreadAlign.INWARD.value ? spread : 0;
        const tOMod = spreadAlign === Enum.Common.spreadAlign.CENTER.value ? spread / 2 : spreadAlign === Enum.Common.spreadAlign.OUTWARD.value ? spread : 0;

        rI = radius - tIMod;
        rO = radius + tOMod;
    }

    if (rO <= 0) return null;
    rI = Math.max(0, rI);

    const thetaMode = Enum.resolve(context.resolve<"enum">(node.id, "thetaMode")?.data, Enum.Common.thetaMode) ?? node.payload.thetaMode ?? 0;
    const thetaStart = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "thetaStart")?.data ?? node.payload.thetaStart) ?? 0;
    const thetaEnd = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "thetaEnd")?.data ?? node.payload.thetaEnd) ?? 0;
    const thetaSteps = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "thetaSteps")?.data ?? node.payload.thetaSteps) ?? 0;
    const thetaInclusive = context.resolve<"boolean">(node.id, "thetaInclusive")?.data ?? node.payload.thetaInclusive ?? false;

    const distro = context.resolve<"distribution">(node.id, "thetaCurve")?.data ?? { func: Enum.Common.distroFunctions.LINEAR.value, easing: Enum.Common.distroEasing.IN.value, intensity: "1" };
    const distroLerper = distroInterpolator(
        Enum.keyOf(Enum.Common.distroFunctions, distro.func),
        Enum.keyOf(Enum.Common.distroEasing, distro.easing),
        NumericString.Emptyable.asNumber(distro.intensity) ?? 1,
    );

    const denominator = thetaInclusive ? Math.max(1, N - 1) : N;

    // Compute line endpoints for both output and path
    const lineCoords: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let i = 0; i < N; i++) {
        const coeff = delerp(i, 0, denominator);
        const angle = thetaMode === Enum.Common.thetaMode.START_STOP.value ? lerp(coeff, thetaStart, thetaEnd, distroLerper) : lerp(coeff, 0, N * thetaSteps, distroLerper);
        const c = Math.cos(deg2rad(angle - 90));
        const s = Math.sin(deg2rad(angle - 90));
        lineCoords.push({ x1: rI * c, y1: rI * s, x2: rO * c, y2: rO * s });
    }

    const [transforms, { translateX, translateY }] = Transforms.evaluate(node, context);

    if (socket === "path") {
        const d = lineCoords.map((l) => `M ${l.x1},${l.y1} L ${l.x2},${l.y2}`).join(" ");
        return {
            kind: "path",
            data: { d, transform: transforms.join(" "), preview: { x: -rO + translateX, y: -rO + translateY, w: 2 * rO, h: 2 * rO } },
        };
    }

    if (socket === "output") {
        const markerStartShape = context.resolve<"shape">(node.id, "markerStart")?.data;
        const markerEndShape = context.resolve<"shape">(node.id, "markerEnd")?.data;
        const markerAlign = context.resolve<"boolean">(node.id, "markerAlign")?.data ?? node.payload.markerAlign ?? false;

        const paint = Stylings.evaluate(node, context);
        const markers =
            markerStartShape || markerEndShape
                ? {
                      start: markerStartShape ? { shape: markerStartShape, orient: markerAlign ? "auto-start-reverse" : undefined } : undefined,
                      end: markerEndShape ? { shape: markerEndShape, orient: markerAlign ? "auto-start-reverse" : undefined } : undefined,
                  }
                : undefined;

        const children = lineCoords.map((l) => ({
            type: "line" as const,
            x1: l.x1,
            y1: l.y1,
            x2: l.x2,
            y2: l.y2,
            paint,
            markers,
            transform: "",
            preview: { x: Math.min(l.x1, l.x2), y: Math.min(l.y1, l.y2), w: Math.abs(l.x2 - l.x1), h: Math.abs(l.y2 - l.y1) },
        }));

        return {
            kind: "shape",
            data: {
                type: "group",
                transform: transforms.join(" "),
                children,
                preview: { x: -rO + translateX, y: -rO + translateY, w: 2 * rO, h: 2 * rO },
            },
        };
    }

    return null;
};

const SOCKETTYPES_IN: { [key in keyof Required<BurstDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    spurCount: { types: ["integer"], mode: "or" },
    radius: { types: ["length"], mode: "or" },
    spread: { types: ["length"], mode: "or" },
    innerRadius: { types: ["length"], mode: "or" },
    outerRadius: { types: ["length"], mode: "or" },
    spanMode: { types: ["enum"], mode: "or" },
    spreadAlign: { types: ["enum"], mode: "or" },
    thetaMode: { types: ["enum"], mode: "or" },
    thetaStart: { types: ["angle"], mode: "or" },
    thetaEnd: { types: ["angle"], mode: "or" },
    thetaSteps: { types: ["angle"], mode: "or" },
    thetaInclusive: { types: ["boolean"], mode: "or" },
    thetaCurve: { types: ["distribution"], mode: "or" },
    markerStart: { types: ["shape"], mode: "or" },
    markerEnd: { types: ["shape"], mode: "or" },
    markerAlign: { types: ["boolean"], mode: "or" },
    ...Stylings.IN_SOCKET_TYPES,
    ...Transforms.IN_SOCKET_TYPES,
};

const SOCKETTYPES_OUT: { [key in keyof Required<BurstDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["shape"], mode: "and" },
    path: { types: ["path"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<BurstDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const BurstNodeType: NodeTypes.Type<"burst", BurstDefinition> = {
    type: "burst",
    displayName: "Burst",
    defaultLabel: "Burst",
    iconNode: <Icon shape={NODE_ICONS.shapeBurst} color={"var(--icon-flavour)"} />,
    category: "Shapes",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
