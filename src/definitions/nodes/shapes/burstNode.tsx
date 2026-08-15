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
import { RadioButton } from "../../../components/buttons/RadioButton";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { NumericString } from "../../datatypes/numericString";
import { deg2rad, delerp, distroInterpolator, lerp } from "../../../util/misc";
import { StylingPrefab } from "../../helpers/stylingPrefab";
import { TransformPrefab } from "../../helpers/transformPrefab";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: {
        spurCount: "integer",
        radius: "length",
        spread: "length",
        innerRadius: "length",
        outerRadius: "length",
        spanMode: "enum",
        spreadAlign: "enum",
        arcMode: "enum",
        thetaStart: "angle",
        sweep: "angle",
        thetaFrom: "angle",
        thetaTo: "angle",
        thetaInclusive: "boolean",
        thetaCurve: "distribution",
        markerStart: "shape",
        markerEnd: "shape",
        markerAlign: "boolean",
        ...TransformPrefab.SIG_IN,
        ...StylingPrefab.SIG_IN,
    },
    out: { output: "shape", path: "path" },
});

export type BurstDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        spurCount: DataTypes.TypeOf<DataTypes.Integer>;
        spanMode: DataTypes.TypeOf<DataTypes.Enum>;
        spreadAlign: DataTypes.TypeOf<DataTypes.Enum>;
        radius: DataTypes.TypeOf<DataTypes.Length>;
        spread: DataTypes.TypeOf<DataTypes.Length>;
        innerRadius: DataTypes.TypeOf<DataTypes.Length>;
        outerRadius: DataTypes.TypeOf<DataTypes.Length>;
        arcMode: DataTypes.TypeOf<DataTypes.Enum>;
        thetaStart: DataTypes.TypeOf<DataTypes.Angle>;
        sweep: DataTypes.TypeOf<DataTypes.Angle>;
        thetaFrom: DataTypes.TypeOf<DataTypes.Angle>;
        thetaTo: DataTypes.TypeOf<DataTypes.Angle>;
        thetaInclusive: DataTypes.TypeOf<DataTypes.Boolean>;
        markerAlign: DataTypes.TypeOf<DataTypes.Boolean>;
    } & StylingPrefab.Definition["payload"] &
        TransformPrefab.Definition["payload"]
>;

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
            arcMode: null,
            thetaStart: null,
            sweep: null,
            thetaFrom: null,
            thetaTo: null,
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
            paintOrder: null,
            opacity: null,
            // transforms
            position: null,
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
            arcMode: Enum.Common.arcMode.START_SWEEP.value,
            thetaStart: "0deg",
            sweep: "90deg",
            thetaFrom: "0deg",
            thetaTo: "90deg",
            thetaInclusive: false,
            markerAlign: true,
            // stroke
            strokeWidth: "1px",
            strokeDash: "",
            strokeColor: { r: 0, g: 0, b: 0, a: 1 },
            strokeDashOffset: "0px",
            strokeCap: Enum.Common.strokeCap.BUTT.value,
            paintOrder: 0,
            opacity: "100",
            // transforms
            position: { ...TransformPrefab.POSITION_DEFAULT },
            rotation: "0deg",
        },
        type: "burst",
    };
};

const SPAN_MODE_OPTIONS = Enum.options(Enum.Common.spanMode);
const ARC_MODE_OPTIONS = Enum.options(Enum.Common.arcMode);
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
            <hr />
            <SocketIn node={node} socketId={"outerRadius"} label={"Outer Radius"}>
                <LengthInput value={node.payload.outerRadius} onCommit={(outerRadius) => handleUpdate({ outerRadius })} disabled={node.in.outerRadius !== null || isSpread} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"innerRadius"} label={"Inner Radius"}>
                <LengthInput value={node.payload.innerRadius} onCommit={(innerRadius) => handleUpdate({ innerRadius })} disabled={node.in.innerRadius !== null || isSpread} min={"0px"} required />
            </SocketIn>
            <hr />
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
            <SocketIn node={node} socketId={"arcMode"} label={"Arc Mode"}>
                <RadioButton.Group
                    options={ARC_MODE_OPTIONS}
                    value={`${node.payload.arcMode}`}
                    onValue={(v) => handleUpdate({ arcMode: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.arcMode !== null}
                />
            </SocketIn>

            <SocketIn node={node} socketId={"thetaStart"} label={"Start"}>
                <AngleInput.SliderInput value={node.payload.thetaStart} onCommit={(thetaStart) => handleUpdate({ thetaStart })} disabled={node.in.thetaStart !== null || isFromTo} unbound />
            </SocketIn>
            <SocketIn node={node} socketId={"sweep"} label={"Sweep"}>
                <AngleInput.SliderInput value={node.payload.sweep} onCommit={(sweep) => handleUpdate({ sweep })} disabled={node.in.sweep !== null || isFromTo} unbound min={-360} max={360} />
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"thetaFrom"} label={"From"}>
                <AngleInput.SliderInput value={node.payload.thetaFrom} onCommit={(thetaFrom) => handleUpdate({ thetaFrom })} disabled={node.in.thetaFrom !== null || isStartSweep} unbound />
            </SocketIn>
            <SocketIn node={node} socketId={"thetaTo"} label={"To"}>
                <AngleInput.SliderInput value={node.payload.thetaTo} onCommit={(thetaTo) => handleUpdate({ thetaTo })} disabled={node.in.thetaTo !== null || isStartSweep} unbound />
            </SocketIn>

            <SocketIn node={node} socketId={"thetaInclusive"}>
                <CheckBox checked={node.payload.thetaInclusive} onToggle={(thetaInclusive) => handleUpdate({ thetaInclusive })} disabled={node.in.thetaInclusive !== null}>
                    Inclusive End
                </CheckBox>
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
            <StylingPrefab.Controls node={node} handleUpdate={handleUpdate} accordion />
            <TransformPrefab.Controls node={node} handleUpdate={handleUpdate} accordion />
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
    "arcMode",
    "thetaStart",
    "sweep",
    "thetaFrom",
    "thetaTo",
    "thetaInclusive",
    "thetaCurve",
    "markerStart",
    "markerEnd",
    "markerAlign",
    "position",
    "rotation",
];
const STYLING_INPUTS: (keyof BurstDefinition["inputs"])[] = ["strokeWidth", "strokeColor", "strokeCap", "strokeDash", "strokeDashOffset", "paintOrder", "opacity"];

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
    const spurCount = Math.round(Math.max(0, NumericString.Emptyable.asNumber(context.resolve<DataTypes.Integer>(node.id, "spurCount")?.data ?? node.payload.spurCount) ?? NaN));
    if (!isFinite(spurCount) || spurCount <= 0) return null;

    const N = spurCount;
    const spanMode = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "spanMode")?.data, Enum.Common.spanMode) ?? node.payload.spanMode ?? 0;

    let rI: number;
    let rO: number;

    if (spanMode === Enum.Common.spanMode.INNER_OUTER.value) {
        rI = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "innerRadius")?.data ?? node.payload.innerRadius, "0px")) ?? 0;
        rO = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "outerRadius")?.data ?? node.payload.outerRadius, "0px")) ?? 0;
    } else {
        const radius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "radius")?.data ?? node.payload.radius, "0px")) ?? 0;
        const spread = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "spread")?.data ?? node.payload.spread, "0px")) ?? 0;
        if (!radius) return null;

        const spreadAlign = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "spreadAlign")?.data, Enum.Common.spreadAlign) ?? node.payload.spreadAlign ?? 0;

        const tIMod = spreadAlign === Enum.Common.spreadAlign.CENTER.value ? spread / 2 : spreadAlign === Enum.Common.spreadAlign.INWARD.value ? spread : 0;
        const tOMod = spreadAlign === Enum.Common.spreadAlign.CENTER.value ? spread / 2 : spreadAlign === Enum.Common.spreadAlign.OUTWARD.value ? spread : 0;

        rI = radius - tIMod;
        rO = radius + tOMod;
    }

    if (rO <= 0) return null;
    rI = Math.max(0, rI);

    const arcMode = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "arcMode")?.data, Enum.Common.arcMode) ?? node.payload.arcMode ?? 0;

    let effectiveStart: number;
    let effectiveSweep: number;

    if (arcMode === Enum.Common.arcMode.FROM_TO.value) {
        const from = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "thetaFrom")?.data ?? node.payload.thetaFrom) ?? 0;
        const to = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "thetaTo")?.data ?? node.payload.thetaTo) ?? 0;
        effectiveStart = from;
        effectiveSweep = to - from;
    } else {
        effectiveStart = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "thetaStart")?.data ?? node.payload.thetaStart) ?? 0;
        effectiveSweep = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "sweep")?.data ?? node.payload.sweep) ?? 0;
    }

    const thetaInclusive = context.resolve<DataTypes.Boolean>(node.id, "thetaInclusive")?.data ?? node.payload.thetaInclusive ?? false;

    const distro = context.resolve<DataTypes.Distribution>(node.id, "thetaCurve")?.data ?? { func: Enum.Common.distroFunctions.LINEAR.value, easing: Enum.Common.distroEasing.IN.value, intensity: "1" };
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
        const angle = lerp(coeff, effectiveStart, effectiveStart + effectiveSweep, distroLerper);
        const c = Math.cos(deg2rad(angle - 90));
        const s = Math.sin(deg2rad(angle - 90));
        lineCoords.push({ x1: rI * c, y1: rI * s, x2: rO * c, y2: rO * s });
    }

    const [transforms, { translateX, translateY }] = TransformPrefab.evaluate(node, context);

    if (socket === "path") {
        const d = lineCoords.map((l) => `M ${l.x1},${l.y1} L ${l.x2},${l.y2}`).join(" ");
        return {
            kind: "path",
            data: { d, transform: transforms.join(" "), preview: { x: -rO + translateX, y: -rO + translateY, w: 2 * rO, h: 2 * rO } },
        };
    }

    if (socket === "output") {
        const markerStartShape = context.resolve<DataTypes.Shape>(node.id, "markerStart")?.data;
        const markerEndShape = context.resolve<DataTypes.Shape>(node.id, "markerEnd")?.data;
        const markerAlign = context.resolve<DataTypes.Boolean>(node.id, "markerAlign")?.data ?? node.payload.markerAlign ?? false;

        const paint = StylingPrefab.evaluate(node, context);
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

export const BurstNodeType: NodeTypes.Type<"burst", BurstDefinition> = {
    type: "burst",
    displayName: "Burst",
    defaultLabel: "Burst",
    iconNode: <NodeIcon shape={NODE_ICONS.shapeBurst} />,
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
