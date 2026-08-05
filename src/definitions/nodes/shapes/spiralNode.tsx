import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Stylings, Transforms } from "../abstract";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { NumericString } from "../../datatypes/numericString";

import { delerp, lerp } from "../../../util/misc";

export type SpiralDefinition = {
    inputs: {
        spanMode: DataTypes.Use<"enum">;
        innerRadius: DataTypes.Use<"length">;
        outerRadius: DataTypes.Use<"length">;
        radius: DataTypes.Use<"length">;
        spread: DataTypes.Use<"length">;
        arcMode: DataTypes.Use<"enum">;
        thetaStart: DataTypes.Use<"angle">;
        sweep: DataTypes.Use<"angle">;
        thetaFrom: DataTypes.Use<"angle">;
        thetaTo: DataTypes.Use<"angle">;
        markerStartShape: DataTypes.Use<"shape">;
        markerEndShape: DataTypes.Use<"shape">;
        markerAlign: DataTypes.Use<"boolean">;
    } & Stylings.Definition["inputs"] &
        Transforms.Definition["inputs"];
    outputs: {
        output: DataTypes.Use<"shape">;
        path: DataTypes.Use<"path">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        spanMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        innerRadius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        outerRadius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        radius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        spread: DataTypes.TypeOf<DataTypes.Use<"length">>;
        arcMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        thetaStart: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        sweep: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        thetaFrom: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        thetaTo: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        markerAlign: DataTypes.TypeOf<DataTypes.Use<"boolean">>;
    } & Stylings.Definition["payload"] &
        Transforms.Definition["payload"];
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<SpiralDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"spiral", SpiralDefinition> => {
    return {
        id,
        in: {
            spanMode: null,
            innerRadius: null,
            outerRadius: null,
            radius: null,
            spread: null,
            arcMode: null,
            thetaStart: null,
            sweep: null,
            thetaFrom: null,
            thetaTo: null,
            markerStartShape: null,
            markerEndShape: null,
            markerAlign: null,

            strokeWidth: null,
            strokeColor: null,
            strokeDash: null,
            strokeDashOffset: null,
            strokeCap: null,
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
            path: [],
        },
        payload: {
            label: "",
            spanMode: Enum.Common.spanMode.INNER_OUTER.value,
            innerRadius: "120px",
            outerRadius: "180px",
            radius: "150px",
            spread: "60px",
            arcMode: Enum.Common.arcMode.START_SWEEP.value,
            thetaStart: "0",
            sweep: "90",
            thetaFrom: "0",
            thetaTo: "90",
            markerAlign: true,
            // stroke
            strokeWidth: "1px",
            strokeDash: "",
            strokeColor: { r: 0, g: 0, b: 0, a: 1 },
            strokeDashOffset: "0px",
            strokeCap: Enum.Common.strokeCap.BUTT.value,
            // fill
            paintOrder: 0,
            opacity: "100",
            // transforms
            positionMode: Enum.Common.positionMode.CARTESIAN.value,
            positionX: "0px",
            positionY: "0px",
            positionRadius: "0px",
            positionTheta: "0",
            rotation: "0",
        },
        type: "spiral",
    };
};

const SPAN_MODE_OPTIONS = Enum.options(Enum.Common.spanMode);
const ARC_MODE_OPTIONS = Enum.options(Enum.Common.arcMode);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<SpiralDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<SpiralDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const isInOut = node.payload.spanMode === Enum.Common.spanMode.INNER_OUTER.value && node.in.spanMode === null;
    const isSpread = node.payload.spanMode === Enum.Common.spanMode.SPREAD.value && node.in.spanMode === null;
    const isStartSweep = node.payload.arcMode === Enum.Common.arcMode.START_SWEEP.value && node.in.arcMode === null;
    const isFromTo = node.payload.arcMode === Enum.Common.arcMode.FROM_TO.value && node.in.arcMode === null;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketOut node={node} socketId={"path"}>
                Path
            </SocketOut>

            <SocketIn node={node} socketId={"spanMode"} label={"Radial Mode"}>
                <RadioButton.Group
                    options={SPAN_MODE_OPTIONS}
                    value={`${node.payload.spanMode}`}
                    onValue={(v) => handleUpdate({ spanMode: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.spanMode !== null}
                />
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"innerRadius"} label={"Inner Radius"}>
                <LengthInput value={node.payload.innerRadius} onCommit={(innerRadius) => handleUpdate({ innerRadius })} disabled={node.in.innerRadius !== null || isSpread} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"outerRadius"} label={"Outer Radius"}>
                <LengthInput value={node.payload.outerRadius} onCommit={(outerRadius) => handleUpdate({ outerRadius })} disabled={node.in.outerRadius !== null || isSpread} min={"0px"} required />
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"radius"} label={"Radius"}>
                <LengthInput value={node.payload.radius} onCommit={(radius) => handleUpdate({ radius })} disabled={node.in.radius !== null || isInOut} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"spread"} label={"Sread"}>
                <LengthInput value={node.payload.spread} onCommit={(spread) => handleUpdate({ spread })} disabled={node.in.spread !== null || isInOut} min={"0px"} required />
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"arcMode"} label={"Angle Mode"}>
                <RadioButton.Group
                    options={ARC_MODE_OPTIONS}
                    value={`${node.payload.arcMode}`}
                    onValue={(v) => handleUpdate({ arcMode: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.arcMode !== null}
                />
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"thetaStart"} label={"Start"}>
                <AngleInput.SliderInput value={node.payload.thetaStart} onCommit={(thetaStart) => handleUpdate({ thetaStart })} disabled={node.in.thetaStart !== null || isFromTo} />
            </SocketIn>
            <SocketIn node={node} socketId={"sweep"} label={"Sweep"}>
                <AngleInput.SliderInput value={node.payload.sweep} onCommit={(sweep) => handleUpdate({ sweep })} disabled={node.in.sweep !== null || isFromTo} unbound />
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"thetaFrom"} label={"From"}>
                <AngleInput.SliderInput value={node.payload.thetaFrom} onCommit={(thetaFrom) => handleUpdate({ thetaFrom })} disabled={node.in.thetaFrom !== null || isStartSweep} unbound />
            </SocketIn>
            <SocketIn node={node} socketId={"thetaTo"} label={"To"}>
                <AngleInput.SliderInput value={node.payload.thetaTo} onCommit={(thetaTo) => handleUpdate({ thetaTo })} disabled={node.in.thetaTo !== null || isStartSweep} unbound />
            </SocketIn>

            <NodeAccordion label={"More"} socketsIn={"markerStartShape|markerEndShape|markerAlign"} nodeId={node.id}>
                <SocketIn node={node} socketId={"markerStartShape"}>
                    Start Marker
                </SocketIn>
                <SocketIn node={node} socketId={"markerEndShape"}>
                    End Marker
                </SocketIn>
                <SocketIn node={node} socketId={"markerAlign"}>
                    <CheckBox checked={node.payload.markerAlign} onToggle={(markerAlign) => handleUpdate({ markerAlign })} disabled={node.in.markerAlign !== null}>
                        Align Markers
                    </CheckBox>
                </SocketIn>
            </NodeAccordion>

            <Stylings.Controls node={node} handleUpdate={handleUpdate} fill accordion />
            <Transforms.Controls node={node} handleUpdate={handleUpdate} accordion />
        </TypicalNode>
    );
};

const GEOMETRY_INPUTS: (keyof SpiralDefinition["inputs"])[] = [
    "spanMode",
    "innerRadius",
    "outerRadius",
    "radius",
    "spread",
    "arcMode",
    "thetaStart",
    "sweep",
    "thetaFrom",
    "thetaTo",
    "markerStartShape",
    "markerEndShape",
    "markerAlign",
    "positionMode",
    "positionX",
    "positionY",
    "positionRadius",
    "positionTheta",
    "rotation",
];
const STYLING_INPUTS: (keyof SpiralDefinition["inputs"])[] = ["strokeWidth", "strokeColor", "strokeCap", "strokeDash", "strokeDashOffset", "fillColor", "paintOrder"];

const dependsOn = (_node: NodeDefinitions.NodeFor<SpiralDefinition>, outSocket: keyof SpiralDefinition["outputs"], _deps: AllDeps): (keyof SpiralDefinition["inputs"])[] => {
    if (outSocket === "path") {
        return GEOMETRY_INPUTS;
    }
    return [...GEOMETRY_INPUTS, ...STYLING_INPUTS];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<SpiralDefinition>, inSocket: keyof SpiralDefinition["inputs"], _deps: AllDeps): (keyof SpiralDefinition["outputs"])[] => {
    if (STYLING_INPUTS.includes(inSocket)) {
        return ["output"];
    }
    return ["output", "path"];
};

/** Convert our angle convention (0° = top, CW positive) to radians for Math.cos/sin */
const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;

/* ── Bézier smoothing helpers ── */

const lineProps = (a: readonly [number, number], b: readonly [number, number]) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    return { length: Math.sqrt(dx * dx + dy * dy), angle: Math.atan2(dy, dx) };
};

const SMOOTHING = 0.2;

const controlPoint = (current: readonly [number, number], previous: readonly [number, number], next: readonly [number, number], reverse: boolean = false) => {
    const o = lineProps(previous, next);
    const angle = o.angle + (reverse ? Math.PI : 0);
    const length = o.length * SMOOTHING;
    return [current[0] + Math.cos(angle) * length, current[1] + Math.sin(angle) * length] as const;
};

const bezierCommand = (points: (readonly [number, number])[], i: number) => {
    const prev = points[i - 1];
    const prevPrev = points[i - 2] ?? prev;
    const cur = points[i];
    const next = points[i + 1] ?? cur;
    const [cpsX, cpsY] = controlPoint(prev, prevPrev, cur);
    const [cpeX, cpeY] = controlPoint(cur, prev, next, true);
    return `C ${cpsX},${cpsY} ${cpeX},${cpeY} ${cur[0]},${cur[1]}`;
};

const evaluate = (node: NodeDefinitions.NodeFor<SpiralDefinition>, socket: keyof SpiralDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const spanMode = Enum.resolve(context.resolve<"enum">(node.id, "spanMode")?.data, Enum.Common.spanMode) ?? node.payload.spanMode ?? 0;

    let rI: number;
    let rO: number;

    if (spanMode === Enum.Common.spanMode.SPREAD.value) {
        const radius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "radius")?.data ?? node.payload.radius, "0px")) ?? 0;
        const spread = Math.max(0, Length.Emptyable.asNumber(context.resolve<"length">(node.id, "spread")?.data ?? node.payload.spread) ?? 0);
        rI = radius - spread / 2;
        rO = radius + spread / 2;
    } else {
        rI = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "innerRadius")?.data ?? node.payload.innerRadius, "0px")) ?? 0;
        rO = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "outerRadius")?.data ?? node.payload.outerRadius, "0px")) ?? 0;
    }

    const arcMode = Enum.resolve(context.resolve<"enum">(node.id, "arcMode")?.data, Enum.Common.arcMode) ?? node.payload.arcMode ?? 0;

    let effectiveStart: number;
    let effectiveSweep: number;

    if (arcMode === Enum.Common.arcMode.FROM_TO.value) {
        const from = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "thetaFrom")?.data ?? node.payload.thetaFrom) ?? 0;
        const to = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "thetaTo")?.data ?? node.payload.thetaTo) ?? 0;
        effectiveStart = from;
        effectiveSweep = to - from;
    } else {
        effectiveStart = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "thetaStart")?.data ?? node.payload.thetaStart) ?? 0;
        effectiveSweep = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "sweep")?.data ?? node.payload.sweep) ?? 0;
    }

    if (effectiveSweep === 0) {
        return null;
    }

    const effectiveEnd = effectiveStart + effectiveSweep;

    const count = Math.max(2, 2 + Math.floor(Math.abs(effectiveSweep) / 10));
    const points: (readonly [number, number])[] = [];

    for (let n = 0; n < count; n++) {
        const t = delerp(n, 0, count - 1);
        const rad = lerp(t, rI, rO);
        const ang = lerp(t, effectiveStart, effectiveEnd);
        points.push([rad * Math.cos(toRad(ang)), rad * Math.sin(toRad(ang))]);
    }

    let d = `M ${points[0][0]},${points[0][1]}`;
    for (let i = 1; i < points.length; i++) {
        d += ` ${bezierCommand(points, i)}`;
    }

    const [transforms, { translateX, translateY }] = Transforms.evaluate(node, context);

    if (socket === "path") {
        const maxR = Math.max(Math.abs(rI), Math.abs(rO));
        return {
            kind: "path",
            data: { d, transform: transforms.join(" "), preview: { x: -maxR + translateX, y: -maxR + translateY, w: 2 * maxR, h: 2 * maxR } },
        };
    }

    if (socket === "output") {
        const paint = Stylings.evaluate(node, context);

        const markerStartShape = context.resolve<"shape">(node.id, "markerStartShape")?.data;
        const markerEndShape = context.resolve<"shape">(node.id, "markerEndShape")?.data;
        const markerAlign = context.resolve<"boolean">(node.id, "markerAlign")?.data ?? node.payload.markerAlign ?? false;

        const markers =
            markerStartShape || markerEndShape
                ? {
                      start: markerStartShape ? { shape: markerStartShape, orient: markerAlign ? "auto-start-reverse" : undefined } : undefined,
                      end: markerEndShape ? { shape: markerEndShape, orient: markerAlign ? "auto-start-reverse" : undefined } : undefined,
                  }
                : undefined;

        const maxR = Math.max(Math.abs(rI), Math.abs(rO));

        return {
            kind: "shape",
            data: {
                type: "path",
                d,
                paint,
                markers,
                transform: transforms.join(" "),
                preview: { x: -maxR + translateX, y: -maxR + translateY, w: 2 * maxR, h: 2 * maxR },
            },
        };
    }

    return null;
};

const SOCKETTYPES_IN: { [key in keyof Required<SpiralDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    spanMode: { types: ["enum"], mode: "or" },
    innerRadius: { types: ["length"], mode: "or" },
    outerRadius: { types: ["length"], mode: "or" },
    radius: { types: ["length"], mode: "or" },
    spread: { types: ["length"], mode: "or" },
    arcMode: { types: ["enum"], mode: "or" },
    thetaStart: { types: ["angle"], mode: "or" },
    sweep: { types: ["angle"], mode: "or" },
    thetaFrom: { types: ["angle"], mode: "or" },
    thetaTo: { types: ["angle"], mode: "or" },
    markerStartShape: { types: ["shape"], mode: "or" },
    markerEndShape: { types: ["shape"], mode: "or" },
    markerAlign: { types: ["boolean"], mode: "or" },
    ...Stylings.IN_SOCKET_TYPES,
    ...Transforms.IN_SOCKET_TYPES,
};

const SOCKETTYPES_OUT: { [key in keyof Required<SpiralDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["shape"], mode: "and" },
    path: { types: ["path"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<SpiralDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const SpiralNodeType: NodeTypes.Type<"spiral", SpiralDefinition> = {
    type: "spiral",
    displayName: "Spiral",
    defaultLabel: "Spiral",
    iconNode: <NodeIcon shape={NODE_ICONS.shapeSpiral} />,
    category: "Shapes",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
