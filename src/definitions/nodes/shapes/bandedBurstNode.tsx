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
import { BandHelper } from "../../helpers/bandHelper";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

// The "banded" counterpart to Burst (as Ring is to Circle): each radial spur, instead of a bare line
// from the inner radius to the outer radius, becomes a filled band via BandHelper -- given a width at
// its inner and outer ends (taper) and a cap at each end. All spurs are emitted as one compound path.
const def = signature({
    in: {
        spurCount: "integer",
        radius: "length",
        spread: "length",
        innerRadius: "length",
        outerRadius: "length",
        spanMode: "enum",
        spreadAlign: "enum",
        innerWidth: "length",
        outerWidth: "length",
        bandMode: "enum",
        innerCap: "enum",
        outerCap: "enum",
        arcMode: "enum",
        thetaStart: "angle",
        sweep: "angle",
        thetaFrom: "angle",
        thetaTo: "angle",
        thetaDirection: "angle",
        thetaSpread: "angle",
        flexSolveMode: "enum",
        thetaStep: "angle",
        flexJustify: "enum",
        thetaInclusive: "boolean",
        thetaCurve: "distribution",
        ...TransformPrefab.SIG_IN,
        ...StylingPrefab.SIG_IN,
        ...StylingPrefab.SIG_FILL,
        ...StylingPrefab.SIG_JOIN,
    },
    out: { output: "shape", path: "path", centerline: "path" },
});

export type BandedBurstDefinition = SignatureBuilder.DefinitionFrom<
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
        innerWidth: DataTypes.TypeOf<DataTypes.Length>;
        outerWidth: DataTypes.TypeOf<DataTypes.Length>;
        bandMode: DataTypes.TypeOf<DataTypes.Enum>;
        innerCap: DataTypes.TypeOf<DataTypes.Enum>;
        outerCap: DataTypes.TypeOf<DataTypes.Enum>;
        arcMode: DataTypes.TypeOf<DataTypes.Enum>;
        thetaStart: DataTypes.TypeOf<DataTypes.Angle>;
        sweep: DataTypes.TypeOf<DataTypes.Angle>;
        thetaFrom: DataTypes.TypeOf<DataTypes.Angle>;
        thetaTo: DataTypes.TypeOf<DataTypes.Angle>;
        thetaDirection: DataTypes.TypeOf<DataTypes.Angle>;
        thetaSpread: DataTypes.TypeOf<DataTypes.Angle>;
        flexSolveMode: DataTypes.TypeOf<DataTypes.Enum>;
        thetaStep: DataTypes.TypeOf<DataTypes.Angle>;
        flexJustify: DataTypes.TypeOf<DataTypes.Enum>;
        thetaInclusive: DataTypes.TypeOf<DataTypes.Boolean>;
    } & StylingPrefab.Definition["payload"] &
        TransformPrefab.Definition["payload"]
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<BandedBurstDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"bandedBurst", BandedBurstDefinition> => {
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
            innerWidth: null,
            outerWidth: null,
            bandMode: null,
            innerCap: null,
            outerCap: null,
            arcMode: null,
            thetaStart: null,
            sweep: null,
            thetaFrom: null,
            thetaTo: null,
            thetaDirection: null,
            thetaSpread: null,
            flexSolveMode: null,
            thetaStep: null,
            flexJustify: null,
            thetaInclusive: null,
            thetaCurve: null,

            strokeWidth: null,
            strokeColor: null,
            strokeDash: null,
            strokeDashOffset: null,
            strokeCap: null,
            strokeJoin: null,
            fillColor: null,
            paintOrder: null,
            opacity: null,
            // transforms
            position: null,
            rotation: null,
        },
        out: {
            output: [],
            path: [],
            centerline: [],
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
            innerWidth: "20px",
            outerWidth: "20px",
            bandMode: Enum.Common.bandMode.TANGENT.value,
            innerCap: Enum.Common.bandCap.BUTT.value,
            outerCap: Enum.Common.bandCap.BUTT.value,
            arcMode: Enum.Common.arcMode.START_SWEEP.value,
            thetaStart: "0deg",
            sweep: "90deg",
            thetaFrom: "0deg",
            thetaTo: "90deg",
            thetaDirection: "0deg",
            thetaSpread: "90deg",
            flexSolveMode: Enum.Common.flexSolveMode.SPACING.value,
            thetaStep: "30deg",
            flexJustify: Enum.Common.flexJustify.AROUND.value,
            thetaInclusive: false,
            // stroke
            strokeWidth: "1px",
            strokeDash: "",
            strokeColor: { r: 0, g: 0, b: 0, a: 1 },
            strokeDashOffset: "0px",
            strokeCap: Enum.Common.strokeCap.BUTT.value,
            strokeJoin: Enum.Common.strokeJoin.MITER.value,
            // fill
            fillColor: { r: 0, g: 0, b: 0, a: 1 },
            paintOrder: 0,
            opacity: "100",
            // transforms
            position: { ...TransformPrefab.POSITION_DEFAULT },
            rotation: "0deg",
        },
        type: "bandedBurst",
    };
};

const SPAN_MODE_OPTIONS = Enum.options(Enum.Common.spanMode);
const ARC_MODE_OPTIONS = Enum.options(Enum.Common.arcMode);
const SPREAD_ALIGN_OPTIONS = Enum.options(Enum.Common.spreadAlign);
const BAND_MODE_OPTIONS = Enum.options(Enum.Common.bandMode);
const BAND_CAP_OPTIONS = Enum.options(Enum.Common.bandCap);
const FLEX_SOLVE_OPTIONS = Enum.options(Enum.Common.flexSolveMode);
const FLEX_JUSTIFY_OPTIONS = Enum.options(Enum.Common.flexJustify);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<BandedBurstDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<BandedBurstDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const isInOut = node.payload.spanMode === 0 && node.in.spanMode === null;
    const isSpread = node.payload.spanMode === 1 && node.in.spanMode === null;
    const isStartSweep = node.payload.arcMode === Enum.Common.arcMode.START_SWEEP.value && node.in.arcMode === null;
    const isFromTo = node.payload.arcMode === Enum.Common.arcMode.FROM_TO.value && node.in.arcMode === null;
    const isDirectionSpread = node.payload.arcMode === Enum.Common.arcMode.DIRECTION_SPREAD.value && node.in.arcMode === null;
    const isSpacingMode = node.payload.flexSolveMode === Enum.Common.flexSolveMode.COUNT.value && node.in.flexSolveMode === null;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketOut node={node} socketId={"path"}>
                Path
            </SocketOut>
            <SocketOut node={node} socketId={"centerline"}>
                Centerline
            </SocketOut>
            <hr />
            <SocketIn node={node} socketId={"spanMode"} label={"Radial Mode"}>
                <RadioButton.Group
                    options={SPAN_MODE_OPTIONS}
                    value={`${node.payload.spanMode}`}
                    onValue={(v) => handleUpdate({ spanMode: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.spanMode !== null}
                />
            </SocketIn>
            <NodeAccordion nodeId={node.id} socketsIn={"innerRadius|outerRadius"} label={"Inner/Outer"}>
                <SocketIn node={node} socketId={"innerRadius"} label={"Inner Radius"}>
                    <LengthInput value={node.payload.innerRadius} onCommit={(innerRadius) => handleUpdate({ innerRadius })} disabled={node.in.innerRadius !== null || isSpread} min={"0px"} required />
                </SocketIn>
                <SocketIn node={node} socketId={"outerRadius"} label={"Outer Radius"}>
                    <LengthInput value={node.payload.outerRadius} onCommit={(outerRadius) => handleUpdate({ outerRadius })} disabled={node.in.outerRadius !== null || isSpread} min={"0px"} required />
                </SocketIn>
            </NodeAccordion>
            <NodeAccordion nodeId={node.id} socketsIn={"radius|spread|spreadAlign"} label={"Radius/Spread"}>
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
            </NodeAccordion>
            <hr />
            <SocketIn node={node} socketId={"innerWidth"} label={"Inner Width"}>
                <LengthInput value={node.payload.innerWidth} onCommit={(innerWidth) => handleUpdate({ innerWidth })} disabled={node.in.innerWidth !== null} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"outerWidth"} label={"Outer Width"}>
                <LengthInput value={node.payload.outerWidth} onCommit={(outerWidth) => handleUpdate({ outerWidth })} disabled={node.in.outerWidth !== null} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"bandMode"} label={"Band Mode"}>
                <RadioButton.Group
                    options={BAND_MODE_OPTIONS}
                    value={`${node.payload.bandMode}`}
                    onValue={(v) => handleUpdate({ bandMode: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.bandMode !== null}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"outerCap"} label={"Outer Cap"}>
                <RadioButton.Group
                    options={BAND_CAP_OPTIONS}
                    value={`${node.payload.outerCap}`}
                    onValue={(v) => handleUpdate({ outerCap: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.outerCap !== null}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"innerCap"} label={"Inner Cap"}>
                <RadioButton.Group
                    options={BAND_CAP_OPTIONS}
                    value={`${node.payload.innerCap}`}
                    onValue={(v) => handleUpdate({ innerCap: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.innerCap !== null}
                />
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"flexSolveMode"} label={"Solve For"}>
                <RadioButton.Group
                    options={FLEX_SOLVE_OPTIONS}
                    value={`${node.payload.flexSolveMode}`}
                    onValue={(v) => handleUpdate({ flexSolveMode: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.flexSolveMode !== null}
                />
            </SocketIn>
            <NodeAccordion nodeId={node.id} socketsIn="spurCount|thetaInclusive" label="By Count">
                <SocketIn node={node} socketId={"spurCount"} label={"Spurs"}>
                    <IntegerInput value={node.payload.spurCount} onCommit={(spurCount) => handleUpdate({ spurCount })} disabled={node.in.spurCount !== null || isSpacingMode} min={"0"} required />
                </SocketIn>
                <SocketIn node={node} socketId={"thetaInclusive"}>
                    <CheckBox checked={node.payload.thetaInclusive} onToggle={(thetaInclusive) => handleUpdate({ thetaInclusive })} disabled={node.in.thetaInclusive !== null || isSpacingMode}>
                        Inclusive End
                    </CheckBox>
                </SocketIn>
            </NodeAccordion>
            <NodeAccordion nodeId={node.id} socketsIn={"thetaStep|flexJustify"} label={"By Step"}>
                <SocketIn node={node} socketId={"thetaStep"} label={"Step"}>
                    <AngleInput
                        value={node.payload.thetaStep}
                        onCommit={(thetaStep) => handleUpdate({ thetaStep })}
                        disabled={node.in.thetaStep !== null || !isSpacingMode}
                        unbound
                        min={0}
                        max={360}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"flexJustify"} label={"Justify"}>
                    <RadioButton.Group
                        options={FLEX_JUSTIFY_OPTIONS}
                        value={`${node.payload.flexJustify}`}
                        onValue={(v) => handleUpdate({ flexJustify: Number(v) })}
                        orientation={"vertical"}
                        disabled={node.in.flexJustify !== null || !isSpacingMode}
                    />
                </SocketIn>
            </NodeAccordion>
            <SocketIn node={node} socketId={"thetaCurve"}>
                Angular Distribution
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"arcMode"} label={"Arc Mode"}>
                <RadioButton.Group
                    options={ARC_MODE_OPTIONS}
                    value={`${node.payload.arcMode}`}
                    onValue={(v) => handleUpdate({ arcMode: Number(v) })}
                    orientation={"vertical"}
                    disabled={node.in.arcMode !== null}
                />
            </SocketIn>
            <NodeAccordion label={"Start/Sweep"} nodeId={node.id} socketsIn="thetaStart|sweep">
                <SocketIn node={node} socketId={"thetaStart"} label={"Start"}>
                    <AngleInput.SliderInput
                        value={node.payload.thetaStart}
                        onCommit={(thetaStart) => handleUpdate({ thetaStart })}
                        disabled={node.in.thetaStart !== null || isFromTo || isDirectionSpread}
                        unbound
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"sweep"} label={"Sweep"}>
                    <AngleInput
                        value={node.payload.sweep}
                        onCommit={(sweep) => handleUpdate({ sweep })}
                        disabled={node.in.sweep !== null || isFromTo || isDirectionSpread}
                        unbound
                        min={-360}
                        max={360}
                    />
                </SocketIn>
            </NodeAccordion>
            <NodeAccordion label={"From/To"} nodeId={node.id} socketsIn="thetaFrom|thetaTo">
                <SocketIn node={node} socketId={"thetaFrom"} label={"From"}>
                    <AngleInput.SliderInput
                        value={node.payload.thetaFrom}
                        onCommit={(thetaFrom) => handleUpdate({ thetaFrom })}
                        disabled={node.in.thetaFrom !== null || isStartSweep || isDirectionSpread}
                        unbound
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"thetaTo"} label={"To"}>
                    <AngleInput.SliderInput
                        value={node.payload.thetaTo}
                        onCommit={(thetaTo) => handleUpdate({ thetaTo })}
                        disabled={node.in.thetaTo !== null || isStartSweep || isDirectionSpread}
                        unbound
                    />
                </SocketIn>
            </NodeAccordion>
            <NodeAccordion label={"Direction/Spread"} nodeId={node.id} socketsIn="thetaDirection|thetaSpread">
                <SocketIn node={node} socketId={"thetaDirection"} label={"Direction"}>
                    <AngleInput.SliderInput
                        value={node.payload.thetaDirection}
                        onCommit={(thetaDirection) => handleUpdate({ thetaDirection })}
                        disabled={node.in.thetaDirection !== null || !isDirectionSpread}
                        unbound
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"thetaSpread"} label={"Spread"}>
                    <AngleInput
                        value={node.payload.thetaSpread}
                        onCommit={(thetaSpread) => handleUpdate({ thetaSpread })}
                        disabled={node.in.thetaSpread !== null || !isDirectionSpread}
                        unbound
                        min={-360}
                        max={360}
                    />
                </SocketIn>
            </NodeAccordion>
            <hr />
            <StylingPrefab.Controls node={node} handleUpdate={handleUpdate} fill join accordion />
            <TransformPrefab.Controls node={node} handleUpdate={handleUpdate} accordion />
        </TypicalNode>
    );
};

// The spur centerlines depend on the radial/arc/distribution layout, but NOT on the per-spur band
// width/mode/caps -- so `centerline` gets a tighter dependency set than the filled `path`/`output`.
const CENTERLINE_INPUTS: (keyof BandedBurstDefinition["inputs"])[] = [
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
    "thetaDirection",
    "thetaSpread",
    "flexSolveMode",
    "thetaStep",
    "flexJustify",
    "thetaInclusive",
    "thetaCurve",
    "position",
    "rotation",
];
const BAND_INPUTS: (keyof BandedBurstDefinition["inputs"])[] = ["innerWidth", "outerWidth", "bandMode", "innerCap", "outerCap"];
const GEOMETRY_INPUTS: (keyof BandedBurstDefinition["inputs"])[] = [...CENTERLINE_INPUTS, ...BAND_INPUTS];
const STYLING_INPUTS: (keyof BandedBurstDefinition["inputs"])[] = ["strokeWidth", "strokeColor", "strokeCap", "strokeJoin", "strokeDash", "strokeDashOffset", "fillColor", "paintOrder", "opacity"];

const dependsOn = (_node: NodeDefinitions.NodeFor<BandedBurstDefinition>, outSocket: keyof BandedBurstDefinition["outputs"], _deps: AllDeps): (keyof BandedBurstDefinition["inputs"])[] => {
    if (outSocket === "centerline") {
        return CENTERLINE_INPUTS;
    }
    if (outSocket === "path") {
        return GEOMETRY_INPUTS;
    }
    return [...GEOMETRY_INPUTS, ...STYLING_INPUTS];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<BandedBurstDefinition>, inSocket: keyof BandedBurstDefinition["inputs"], _deps: AllDeps): (keyof BandedBurstDefinition["outputs"])[] => {
    if (STYLING_INPUTS.includes(inSocket)) {
        return ["output"];
    }
    if (BAND_INPUTS.includes(inSocket)) {
        return ["output", "path"];
    }
    return ["output", "path", "centerline"];
};

const solveArcCount = (available: number, step: number, justify: keyof typeof Enum.Common.flexJustify): { count: number; shift: number; step: number } => {
    if (step <= 0 || available <= 0) return { count: 0, shift: 0, step };
    const n = Math.floor(available / step);
    if (n <= 0) return { count: 0, shift: 0, step };
    switch (justify) {
        case "START":
            return { count: n, shift: 0, step };
        case "END": {
            const remainder = available - (n - 1) * step;
            return { count: n, shift: remainder - step, step };
        }
        case "CENTER": {
            const used = (n - 1) * step;
            return { count: n, shift: (available - used) / 2, step };
        }
        case "BETWEEN": {
            const derivedStep = n > 1 ? available / (n - 1) : 0;
            return { count: n, shift: 0, step: derivedStep };
        }
        case "AROUND": {
            const derivedStep = available / n;
            return { count: n, shift: derivedStep / 2, step: derivedStep };
        }
    }
};

const evaluate = (node: NodeDefinitions.NodeFor<BandedBurstDefinition>, socket: keyof BandedBurstDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
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

    if (arcMode === Enum.Common.arcMode.DIRECTION_SPREAD.value) {
        const dir = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "thetaDirection")?.data ?? node.payload.thetaDirection) ?? 0;
        const spr = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "thetaSpread")?.data ?? node.payload.thetaSpread) ?? 0;
        effectiveStart = dir - spr / 2;
        effectiveSweep = spr;
    } else if (arcMode === Enum.Common.arcMode.FROM_TO.value) {
        const from = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "thetaFrom")?.data ?? node.payload.thetaFrom) ?? 0;
        const to = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "thetaTo")?.data ?? node.payload.thetaTo) ?? 0;
        effectiveStart = from;
        effectiveSweep = to - from;
    } else {
        effectiveStart = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "thetaStart")?.data ?? node.payload.thetaStart) ?? 0;
        effectiveSweep = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "sweep")?.data ?? node.payload.sweep) ?? 0;
    }

    const flexSolveModeEnum = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "flexSolveMode")?.data, Enum.Common.flexSolveMode) ?? node.payload.flexSolveMode ?? 0;
    const isSpacingMode = flexSolveModeEnum === Enum.Common.flexSolveMode.COUNT.value;

    let N: number;
    let angleAt: (i: number) => number;

    if (isSpacingMode) {
        const thetaStepRaw = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "thetaStep")?.data ?? node.payload.thetaStep) ?? 30;
        const available = Math.abs(effectiveSweep);
        const justifyKey = Enum.keyOf(Enum.Common.flexJustify, context.resolve<DataTypes.Enum>(node.id, "flexJustify")?.data ?? node.payload.flexJustify);
        const solved = solveArcCount(available, Math.abs(thetaStepRaw), justifyKey);
        N = solved.count;
        if (N <= 0) return null;
        const sign = effectiveSweep >= 0 ? 1 : -1;
        const shiftDeg = sign * solved.shift;
        const stepDeg = sign * solved.step;
        angleAt = (i: number) => effectiveStart + shiftDeg + i * stepDeg;
    } else {
        const spurCount = Math.round(Math.max(0, NumericString.Emptyable.asNumber(context.resolve<DataTypes.Integer>(node.id, "spurCount")?.data ?? node.payload.spurCount) ?? NaN));
        if (!isFinite(spurCount) || spurCount <= 0) return null;
        N = spurCount;
        const thetaInclusive = context.resolve<DataTypes.Boolean>(node.id, "thetaInclusive")?.data ?? node.payload.thetaInclusive ?? false;
        const distro = context.resolve<DataTypes.Distribution>(node.id, "thetaCurve")?.data ?? {
            func: Enum.Common.distroFunctions.LINEAR.value,
            easing: Enum.Common.distroEasing.IN.value,
            intensity: "1",
        };
        const distroLerper = distroInterpolator(
            Enum.keyOf(Enum.Common.distroFunctions, distro.func),
            Enum.keyOf(Enum.Common.distroEasing, distro.easing),
            NumericString.Emptyable.asNumber(distro.intensity) ?? 1,
        );
        const denominator = thetaInclusive ? Math.max(1, N - 1) : N;
        angleAt = (i: number) => {
            const coeff = delerp(i, 0, denominator);
            return lerp(coeff, effectiveStart, effectiveStart + effectiveSweep, distroLerper);
        };
    }

    // Spur endpoints (inner -> outer) shared by both the filled bands and the centerline.
    const spurs: { inner: BandHelper.Vec; outer: BandHelper.Vec }[] = [];
    for (let i = 0; i < N; i++) {
        const angle = angleAt(i);
        const c = Math.cos(deg2rad(angle - 90));
        const s = Math.sin(deg2rad(angle - 90));
        spurs.push({ inner: { x: rI * c, y: rI * s }, outer: { x: rO * c, y: rO * s } });
    }

    const [transforms] = TransformPrefab.evaluate(node, context);

    if (socket === "centerline") {
        const lines = spurs.filter((sp) => sp.inner.x !== sp.outer.x || sp.inner.y !== sp.outer.y).map((sp) => `M ${sp.inner.x},${sp.inner.y} L ${sp.outer.x},${sp.outer.y}`);
        if (lines.length === 0) return null;
        return {
            kind: "path",
            data: { d: lines.join(" "), transform: transforms.join(" ") },
        };
    }

    const innerWidth = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "innerWidth")?.data ?? node.payload.innerWidth, "0px")) ?? 0;
    const outerWidth = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "outerWidth")?.data ?? node.payload.outerWidth, "0px")) ?? 0;
    const bandMode = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "bandMode")?.data, Enum.Common.bandMode) ?? node.payload.bandMode ?? 0;
    const innerCap = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "innerCap")?.data, Enum.Common.bandCap) ?? node.payload.innerCap ?? 0;
    const outerCap = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "outerCap")?.data, Enum.Common.bandCap) ?? node.payload.outerCap ?? 0;

    // One band per spur, concatenated into a single filled path.
    const subpaths = spurs.map((sp) => BandHelper.buildPath(sp.inner, sp.outer, innerWidth, outerWidth, bandMode, innerCap, outerCap)).filter((d): d is string => d !== null);

    if (subpaths.length === 0) return null;
    const d = subpaths.join(" ");

    if (socket === "path") {
        return {
            kind: "path",
            data: { d, transform: transforms.join(" ") },
        };
    }

    if (socket === "output") {
        return {
            kind: "shape",
            data: {
                type: "path",
                d,
                paint: StylingPrefab.evaluate(node, context),
                transform: transforms.join(" "),
            },
        };
    }

    return null;
};

export const BandedBurstNodeType: NodeTypes.Type<"bandedBurst", BandedBurstDefinition> = {
    type: "bandedBurst",
    displayName: "Burst (Banded)",
    defaultLabel: "Burst (Banded)",
    iconNode: <NodeIcon shape={NODE_ICONS.shapeThickBurst} />,
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
