import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
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
import { distroInterpolator, getTrueRadius } from "../../../util/misc";
import { StylingPrefab } from "../../helpers/stylingPrefab";
import { TransformPrefab } from "../../helpers/transformPrefab";
import { StarHelper } from "../../helpers/starHelper";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

// The "banded" counterpart to Star (as Ring is to Circle, Knot to Polygram): a hollow star frame -- an
// outer star outline with an inner star outline cut out (reverse-wound, via StarHelper). Two nested
// levels of spec: the BAND (spanMode Inner/Outer = two whole stars, vs Spread = one star + a thickness)
// and, per boundary star, its RADIUS mode (radiusMode Major/Minor = tip+valley radii, vs Amplitude =
// base radius + swing). The two boundary stars share the angular skeleton (pointCount, scribe, corners,
// distribution) and differ only in radial extent.
const def = signature({
    in: {
        pointCount: "integer",
        spanMode: "enum",
        // per-boundary radial spec (Spread mode uses the un-prefixed set as the single base star)
        radiusMode: "enum",
        majorRadius: "length",
        minorRadius: "length",
        radius: "length",
        amplitude: "length",
        amplitudeAlign: "enum",
        spread: "length",
        spreadAlign: "enum",
        expandMode: "enum",
        outerRadiusMode: "enum",
        outerMajorRadius: "length",
        outerMinorRadius: "length",
        outerRadius: "length",
        outerAmplitude: "length",
        outerAmplitudeAlign: "enum",
        innerRadiusMode: "enum",
        innerMajorRadius: "length",
        innerMinorRadius: "length",
        innerRadius: "length",
        innerAmplitude: "length",
        innerAmplitudeAlign: "enum",
        // shared angular skeleton
        rScribe: "enum",
        majorScribe: "enum",
        minorScribe: "enum",
        pointDistro: "distribution",
        majorCornerRadius: "length",
        majorCornerShape: "enum",
        minorCornerRadius: "length",
        minorCornerShape: "enum",
        ...TransformPrefab.SIG_IN,
        ...StylingPrefab.SIG_IN,
        ...StylingPrefab.SIG_FILL,
        ...StylingPrefab.SIG_JOIN,
    },
    out: { output: "shape", path: "path", centerline: "path" },
});

export type BandedStarDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        pointCount: DataTypes.TypeOf<DataTypes.Integer>;
        spanMode: DataTypes.TypeOf<DataTypes.Enum>;
        radiusMode: DataTypes.TypeOf<DataTypes.Enum>;
        majorRadius: DataTypes.TypeOf<DataTypes.Length>;
        minorRadius: DataTypes.TypeOf<DataTypes.Length>;
        radius: DataTypes.TypeOf<DataTypes.Length>;
        amplitude: DataTypes.TypeOf<DataTypes.Length>;
        amplitudeAlign: DataTypes.TypeOf<DataTypes.Enum>;
        spread: DataTypes.TypeOf<DataTypes.Length>;
        spreadAlign: DataTypes.TypeOf<DataTypes.Enum>;
        expandMode: DataTypes.TypeOf<DataTypes.Enum>;
        outerRadiusMode: DataTypes.TypeOf<DataTypes.Enum>;
        outerMajorRadius: DataTypes.TypeOf<DataTypes.Length>;
        outerMinorRadius: DataTypes.TypeOf<DataTypes.Length>;
        outerRadius: DataTypes.TypeOf<DataTypes.Length>;
        outerAmplitude: DataTypes.TypeOf<DataTypes.Length>;
        outerAmplitudeAlign: DataTypes.TypeOf<DataTypes.Enum>;
        innerRadiusMode: DataTypes.TypeOf<DataTypes.Enum>;
        innerMajorRadius: DataTypes.TypeOf<DataTypes.Length>;
        innerMinorRadius: DataTypes.TypeOf<DataTypes.Length>;
        innerRadius: DataTypes.TypeOf<DataTypes.Length>;
        innerAmplitude: DataTypes.TypeOf<DataTypes.Length>;
        innerAmplitudeAlign: DataTypes.TypeOf<DataTypes.Enum>;
        rScribe: DataTypes.TypeOf<DataTypes.Enum>;
        majorScribe: DataTypes.TypeOf<DataTypes.Enum>;
        minorScribe: DataTypes.TypeOf<DataTypes.Enum>;
        majorCornerRadius: DataTypes.TypeOf<DataTypes.Length>;
        majorCornerShape: DataTypes.TypeOf<DataTypes.Enum>;
        minorCornerRadius: DataTypes.TypeOf<DataTypes.Length>;
        minorCornerShape: DataTypes.TypeOf<DataTypes.Enum>;
    } & StylingPrefab.Definition["payload"] &
        TransformPrefab.Definition["payload"]
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<BandedStarDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"bandedStar", BandedStarDefinition> => {
    return {
        id,
        in: {
            pointCount: null,
            spanMode: null,
            radiusMode: null,
            majorRadius: null,
            minorRadius: null,
            radius: null,
            amplitude: null,
            amplitudeAlign: null,
            spread: null,
            spreadAlign: null,
            expandMode: null,
            outerRadiusMode: null,
            outerMajorRadius: null,
            outerMinorRadius: null,
            outerRadius: null,
            outerAmplitude: null,
            outerAmplitudeAlign: null,
            innerRadiusMode: null,
            innerMajorRadius: null,
            innerMinorRadius: null,
            innerRadius: null,
            innerAmplitude: null,
            innerAmplitudeAlign: null,
            rScribe: null,
            majorScribe: null,
            minorScribe: null,
            pointDistro: null,
            majorCornerRadius: null,
            majorCornerShape: null,
            minorCornerRadius: null,
            minorCornerShape: null,

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
            pointCount: "5",
            spanMode: Enum.Common.spanMode.SPREAD.value,
            // single base star (Spread mode)
            radiusMode: Enum.Common.starRadiusMode.MAJOR_MINOR.value,
            majorRadius: "100px",
            minorRadius: "50px",
            radius: "100px",
            amplitude: "50px",
            amplitudeAlign: 0,
            spread: "20px",
            spreadAlign: 0,
            expandMode: Enum.Common.expandMode.POINT.value,
            // outer star (Inner/Outer mode)
            outerRadiusMode: Enum.Common.starRadiusMode.MAJOR_MINOR.value,
            outerMajorRadius: "110px",
            outerMinorRadius: "60px",
            outerRadius: "110px",
            outerAmplitude: "50px",
            outerAmplitudeAlign: 0,
            // inner star (Inner/Outer mode)
            innerRadiusMode: Enum.Common.starRadiusMode.MAJOR_MINOR.value,
            innerMajorRadius: "90px",
            innerMinorRadius: "40px",
            innerRadius: "90px",
            innerAmplitude: "50px",
            innerAmplitudeAlign: 0,
            // shared skeleton
            rScribe: Enum.Common.scribeMode.INSCRIBE.value,
            majorScribe: Enum.Common.scribeMode.INSCRIBE.value,
            minorScribe: Enum.Common.scribeMode.INSCRIBE.value,
            majorCornerRadius: "0px",
            majorCornerShape: 0,
            minorCornerRadius: "0px",
            minorCornerShape: 0,
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
        type: "bandedStar",
    };
};

const SPAN_MODE_OPTIONS = Enum.options(Enum.Common.spanMode);
const RADIUS_MODE_OPTIONS = Enum.options(Enum.Common.starRadiusMode);
const SCRIBE_MODE_OPTIONS = Enum.options(Enum.Common.scribeMode);
const CORNER_SHAPE_OPTIONS = Enum.options(Enum.Common.cornerShape);
const ALIGN_OPTIONS = Enum.options(Enum.Common.spreadAlign);
const EXPAND_MODE_OPTIONS = Enum.options(Enum.Common.expandMode);

// A single boundary star's radial inputs (Major/Minor vs Radius+Amplitude), one accordion's worth.
const StarRadiusControls = ({
    node,
    handleUpdate,
    disabled,
    modeSocket,
    majorSocket,
    minorSocket,
    radiusSocket,
    amplitudeSocket,
    alignSocket,
}: {
    node: NodeDefinitions.NodeFor<BandedStarDefinition>;
    handleUpdate: (v: Partial<NodeDefinitions.PayloadTypeOf<BandedStarDefinition>>) => void;
    disabled: boolean;
    modeSocket: "radiusMode" | "outerRadiusMode" | "innerRadiusMode";
    majorSocket: "majorRadius" | "outerMajorRadius" | "innerMajorRadius";
    minorSocket: "minorRadius" | "outerMinorRadius" | "innerMinorRadius";
    radiusSocket: "radius" | "outerRadius" | "innerRadius";
    amplitudeSocket: "amplitude" | "outerAmplitude" | "innerAmplitude";
    alignSocket: "amplitudeAlign" | "outerAmplitudeAlign" | "innerAmplitudeAlign";
}): ReactNode => {
    const mode = node.payload[modeSocket];
    const isMajorMinor = (mode === Enum.Common.starRadiusMode.MAJOR_MINOR.value && node.in[modeSocket] === null) || disabled;
    const isAmplitude = (mode === Enum.Common.starRadiusMode.AMPLITUDE.value && node.in[modeSocket] === null) || disabled;

    return (
        <>
            <SocketIn node={node} socketId={modeSocket} label={"Radius Mode"}>
                <RadioButton.Group
                    options={RADIUS_MODE_OPTIONS}
                    value={`${node.payload[modeSocket]}`}
                    onValue={(v) => handleUpdate({ [modeSocket]: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in[modeSocket] !== null || disabled}
                />
            </SocketIn>
            <SocketIn node={node} socketId={majorSocket} label={"Major Radius"}>
                <LengthInput value={node.payload[majorSocket]} onCommit={(v) => handleUpdate({ [majorSocket]: v })} disabled={node.in[majorSocket] !== null || isAmplitude} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={minorSocket} label={"Minor Radius"}>
                <LengthInput value={node.payload[minorSocket]} onCommit={(v) => handleUpdate({ [minorSocket]: v })} disabled={node.in[minorSocket] !== null || isAmplitude} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={radiusSocket} label={"Radius"}>
                <LengthInput value={node.payload[radiusSocket]} onCommit={(v) => handleUpdate({ [radiusSocket]: v })} disabled={node.in[radiusSocket] !== null || isMajorMinor} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={amplitudeSocket} label={"Amplitude"}>
                <LengthInput
                    value={node.payload[amplitudeSocket]}
                    onCommit={(v) => handleUpdate({ [amplitudeSocket]: v })}
                    disabled={node.in[amplitudeSocket] !== null || isMajorMinor}
                    min={"0px"}
                    required
                />
            </SocketIn>
            <SocketIn node={node} socketId={alignSocket} label={"Amplitude Align"}>
                <RadioButton.Group
                    options={ALIGN_OPTIONS}
                    value={`${node.payload[alignSocket]}`}
                    onValue={(v) => handleUpdate({ [alignSocket]: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in[alignSocket] !== null || isMajorMinor}
                />
            </SocketIn>
        </>
    );
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<BandedStarDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<BandedStarDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const isSpread = node.payload.spanMode === Enum.Common.spanMode.SPREAD.value && node.in.spanMode === null;
    const isInOut = node.payload.spanMode === Enum.Common.spanMode.INNER_OUTER.value && node.in.spanMode === null;

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
            <SocketIn node={node} socketId={"pointCount"} label={"Points"}>
                <IntegerInput.SliderInput
                    value={node.payload.pointCount}
                    onCommit={(pointCount) => handleUpdate({ pointCount })}
                    disabled={node.in.pointCount !== null}
                    min={"3"}
                    max={"64"}
                    required
                />
            </SocketIn>
            <SocketIn node={node} socketId={"spanMode"} label={"Band Mode"}>
                <RadioButton.Group
                    options={SPAN_MODE_OPTIONS}
                    value={`${node.payload.spanMode}`}
                    onValue={(v) => handleUpdate({ spanMode: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.spanMode !== null}
                />
            </SocketIn>
            <hr />

            {/* Spread band mode: one base star + a thickness. */}
            <StarRadiusControls
                node={node}
                handleUpdate={handleUpdate}
                disabled={!isSpread}
                modeSocket={"radiusMode"}
                majorSocket={"majorRadius"}
                minorSocket={"minorRadius"}
                radiusSocket={"radius"}
                amplitudeSocket={"amplitude"}
                alignSocket={"amplitudeAlign"}
            />
            <SocketIn node={node} socketId={"spread"} label={"Spread"}>
                <LengthInput value={node.payload.spread} onCommit={(spread) => handleUpdate({ spread })} disabled={node.in.spread !== null || !isSpread} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"spreadAlign"} label={"Spread Align"}>
                <RadioButton.Group
                    options={ALIGN_OPTIONS}
                    value={`${node.payload.spreadAlign}`}
                    onValue={(v) => handleUpdate({ spreadAlign: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.spreadAlign !== null || !isSpread}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"expandMode"} label={"Expand Mode"}>
                <RadioButton.Group
                    options={EXPAND_MODE_OPTIONS}
                    value={`${node.payload.expandMode}`}
                    onValue={(v) => handleUpdate({ expandMode: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.expandMode !== null || !isSpread}
                />
            </SocketIn>

            {/* Inner/Outer band mode: two independent boundary stars. */}
            <NodeAccordion label={"Outer Star"} socketsIn={"outerRadiusMode|outerMajorRadius|outerMinorRadius|outerRadius|outerAmplitude|outerAmplitudeAlign"} nodeId={node.id}>
                <StarRadiusControls
                    node={node}
                    handleUpdate={handleUpdate}
                    disabled={!isInOut}
                    modeSocket={"outerRadiusMode"}
                    majorSocket={"outerMajorRadius"}
                    minorSocket={"outerMinorRadius"}
                    radiusSocket={"outerRadius"}
                    amplitudeSocket={"outerAmplitude"}
                    alignSocket={"outerAmplitudeAlign"}
                />
            </NodeAccordion>
            <NodeAccordion label={"Inner Star"} socketsIn={"innerRadiusMode|innerMajorRadius|innerMinorRadius|innerRadius|innerAmplitude|innerAmplitudeAlign"} nodeId={node.id}>
                <StarRadiusControls
                    node={node}
                    handleUpdate={handleUpdate}
                    disabled={!isInOut}
                    modeSocket={"innerRadiusMode"}
                    majorSocket={"innerMajorRadius"}
                    minorSocket={"innerMinorRadius"}
                    radiusSocket={"innerRadius"}
                    amplitudeSocket={"innerAmplitude"}
                    alignSocket={"innerAmplitudeAlign"}
                />
            </NodeAccordion>

            <NodeAccordion label={"More"} socketsIn={"rScribe|majorScribe|minorScribe|majorCornerRadius|majorCornerShape|minorCornerRadius|minorCornerShape|pointDistro"} nodeId={node.id}>
                <SocketIn node={node} socketId={"majorScribe"} label={"Major Scribe Mode"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.majorScribe}`}
                        onValue={(v) => handleUpdate({ majorScribe: Number(v) })}
                        disabled={node.in.majorScribe !== null}
                        options={SCRIBE_MODE_OPTIONS}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"minorScribe"} label={"Minor Scribe Mode"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.minorScribe}`}
                        onValue={(v) => handleUpdate({ minorScribe: Number(v) })}
                        disabled={node.in.minorScribe !== null}
                        options={SCRIBE_MODE_OPTIONS}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"rScribe"} label={"Radius Scribe Mode"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.rScribe}`}
                        onValue={(v) => handleUpdate({ rScribe: Number(v) })}
                        disabled={node.in.rScribe !== null}
                        options={SCRIBE_MODE_OPTIONS}
                    />
                </SocketIn>
                <hr />
                <SocketIn node={node} socketId={"majorCornerRadius"} label={"Major Corner Radius"}>
                    <LengthInput
                        value={node.payload.majorCornerRadius}
                        onCommit={(majorCornerRadius) => handleUpdate({ majorCornerRadius })}
                        disabled={node.in.majorCornerRadius !== null}
                        min={"0px"}
                        required
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"majorCornerShape"} label={"Major Corner Shape"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.majorCornerShape}`}
                        options={CORNER_SHAPE_OPTIONS}
                        onValue={(v) => handleUpdate({ majorCornerShape: Number(v) })}
                        disabled={node.in.majorCornerShape !== null}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"minorCornerRadius"} label={"Minor Corner Radius"}>
                    <LengthInput
                        value={node.payload.minorCornerRadius}
                        onCommit={(minorCornerRadius) => handleUpdate({ minorCornerRadius })}
                        disabled={node.in.minorCornerRadius !== null}
                        min={"0px"}
                        required
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"minorCornerShape"} label={"Minor Corner Shape"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.minorCornerShape}`}
                        options={CORNER_SHAPE_OPTIONS}
                        onValue={(v) => handleUpdate({ minorCornerShape: Number(v) })}
                        disabled={node.in.minorCornerShape !== null}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"pointDistro"}>
                    Angular Distribution
                </SocketIn>
            </NodeAccordion>

            <StylingPrefab.Controls node={node} handleUpdate={handleUpdate} fill join accordion />
            <TransformPrefab.Controls node={node} handleUpdate={handleUpdate} accordion />
        </TypicalNode>
    );
};

const GEOMETRY_INPUTS: (keyof BandedStarDefinition["inputs"])[] = [
    "pointCount",
    "spanMode",
    "radiusMode",
    "majorRadius",
    "minorRadius",
    "radius",
    "amplitude",
    "amplitudeAlign",
    "spread",
    "spreadAlign",
    "expandMode",
    "outerRadiusMode",
    "outerMajorRadius",
    "outerMinorRadius",
    "outerRadius",
    "outerAmplitude",
    "outerAmplitudeAlign",
    "innerRadiusMode",
    "innerMajorRadius",
    "innerMinorRadius",
    "innerRadius",
    "innerAmplitude",
    "innerAmplitudeAlign",
    "rScribe",
    "majorScribe",
    "minorScribe",
    "pointDistro",
    "majorCornerRadius",
    "majorCornerShape",
    "minorCornerRadius",
    "minorCornerShape",
    "position",
    "rotation",
];
const STYLING_INPUTS: (keyof BandedStarDefinition["inputs"])[] = ["strokeWidth", "strokeColor", "strokeCap", "strokeJoin", "strokeDash", "strokeDashOffset", "fillColor", "paintOrder", "opacity"];

const dependsOn = (_node: NodeDefinitions.NodeFor<BandedStarDefinition>, outSocket: keyof BandedStarDefinition["outputs"], _deps: AllDeps): (keyof BandedStarDefinition["inputs"])[] => {
    // The centerline (mid star) is the average of both boundary stars, so it needs the full radial spec
    // just like the band -- no tighter scoping than `path`.
    if (outSocket === "path" || outSocket === "centerline") {
        return GEOMETRY_INPUTS;
    }
    return [...GEOMETRY_INPUTS, ...STYLING_INPUTS];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<BandedStarDefinition>, inSocket: keyof BandedStarDefinition["inputs"], _deps: AllDeps): (keyof BandedStarDefinition["outputs"])[] => {
    if (STYLING_INPUTS.includes(inSocket)) {
        return ["output"];
    }
    return ["output", "path", "centerline"];
};

const alignMods = (amount: number, align: number): { out: number; in: number } => ({
    out: align === Enum.Common.spreadAlign.CENTER.value ? amount / 2 : align === Enum.Common.spreadAlign.OUTWARD.value ? amount : 0,
    in: align === Enum.Common.spreadAlign.CENTER.value ? amount / 2 : align === Enum.Common.spreadAlign.INWARD.value ? amount : 0,
});

type ScribeKey = Parameters<typeof getTrueRadius>[1];

// Resolve one boundary star's true tip/valley radii from its 6-value radial spec + the shared scribes.
const resolveStar = (
    radiusMode: number,
    majorR: number,
    minorR: number,
    baseR: number,
    amplitude: number,
    amplitudeAlign: number,
    majorScribe: ScribeKey,
    minorScribe: ScribeKey,
    rScribe: ScribeKey,
    N: number,
): { tMajor: number; tMinor: number } => {
    if (radiusMode === Enum.Common.starRadiusMode.MAJOR_MINOR.value) {
        return { tMajor: getTrueRadius(majorR, majorScribe, N), tMinor: getTrueRadius(minorR, minorScribe, N) };
    }
    const base = getTrueRadius(baseR, rScribe, N);
    const mods = alignMods(amplitude, amplitudeAlign);
    return { tMajor: base + mods.out, tMinor: base - mods.in };
};

const len = (context: Resolver.Context, node: NodeDefinitions.NodeFor<BandedStarDefinition>, socket: keyof BandedStarDefinition["inputs"], fallback: DataTypes.TypeOf<DataTypes.Length>): number =>
    Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, socket)?.data ?? fallback, "0px")) ?? 0;

const enumVal = (context: Resolver.Context, node: NodeDefinitions.NodeFor<BandedStarDefinition>, socket: keyof BandedStarDefinition["inputs"], fallback: number): number =>
    Enum.resolve(context.resolve<DataTypes.Enum>(node.id, socket)?.data, Enum.Common.spreadAlign) ?? fallback;

const evaluate = (node: NodeDefinitions.NodeFor<BandedStarDefinition>, socket: keyof BandedStarDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const pointCount = Math.round(Math.max(3, Math.min(64, NumericString.Emptyable.asNumber(context.resolve<DataTypes.Integer>(node.id, "pointCount")?.data ?? node.payload.pointCount) ?? NaN)));
    if (!isFinite(pointCount)) return null;
    const N = pointCount;

    const majorScribe = Enum.keyOf(Enum.Common.scribeMode, context.resolve<DataTypes.Enum>(node.id, "majorScribe")?.data ?? node.payload.majorScribe ?? Enum.Common.scribeMode.INSCRIBE.value);
    const minorScribe = Enum.keyOf(Enum.Common.scribeMode, context.resolve<DataTypes.Enum>(node.id, "minorScribe")?.data ?? node.payload.minorScribe ?? Enum.Common.scribeMode.INSCRIBE.value);
    const rScribe = Enum.keyOf(Enum.Common.scribeMode, context.resolve<DataTypes.Enum>(node.id, "rScribe")?.data ?? node.payload.rScribe ?? Enum.Common.scribeMode.INSCRIBE.value);

    const spanMode = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "spanMode")?.data, Enum.Common.spanMode) ?? node.payload.spanMode ?? 0;

    let tOMajor: number;
    let tOMinor: number;
    let tIMajor: number;
    let tIMinor: number;

    if (spanMode === Enum.Common.spanMode.INNER_OUTER.value) {
        const outer = resolveStar(
            Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "outerRadiusMode")?.data, Enum.Common.starRadiusMode) ?? node.payload.outerRadiusMode ?? 0,
            len(context, node, "outerMajorRadius", node.payload.outerMajorRadius),
            len(context, node, "outerMinorRadius", node.payload.outerMinorRadius),
            len(context, node, "outerRadius", node.payload.outerRadius),
            len(context, node, "outerAmplitude", node.payload.outerAmplitude),
            enumVal(context, node, "outerAmplitudeAlign", node.payload.outerAmplitudeAlign ?? 0),
            majorScribe,
            minorScribe,
            rScribe,
            N,
        );
        const inner = resolveStar(
            Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "innerRadiusMode")?.data, Enum.Common.starRadiusMode) ?? node.payload.innerRadiusMode ?? 0,
            len(context, node, "innerMajorRadius", node.payload.innerMajorRadius),
            len(context, node, "innerMinorRadius", node.payload.innerMinorRadius),
            len(context, node, "innerRadius", node.payload.innerRadius),
            len(context, node, "innerAmplitude", node.payload.innerAmplitude),
            enumVal(context, node, "innerAmplitudeAlign", node.payload.innerAmplitudeAlign ?? 0),
            majorScribe,
            minorScribe,
            rScribe,
            N,
        );
        tOMajor = outer.tMajor;
        tOMinor = outer.tMinor;
        tIMajor = inner.tMajor;
        tIMinor = inner.tMinor;
    } else {
        const base = resolveStar(
            Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "radiusMode")?.data, Enum.Common.starRadiusMode) ?? node.payload.radiusMode ?? 0,
            len(context, node, "majorRadius", node.payload.majorRadius),
            len(context, node, "minorRadius", node.payload.minorRadius),
            len(context, node, "radius", node.payload.radius),
            len(context, node, "amplitude", node.payload.amplitude),
            enumVal(context, node, "amplitudeAlign", node.payload.amplitudeAlign ?? 0),
            majorScribe,
            minorScribe,
            rScribe,
            N,
        );
        const spread = len(context, node, "spread", node.payload.spread);
        const spreadAlign = enumVal(context, node, "spreadAlign", node.payload.spreadAlign ?? 0);
        const expandMode = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "expandMode")?.data, Enum.Common.expandMode) ?? node.payload.expandMode ?? 0;
        const mods = alignMods(spread, spreadAlign);

        // Perpendicular distance from center to the base star's tip->valley edge. Scaling the star from
        // the center (a homothety) keeps every edge parallel, so `spread` apart PERPENDICULARLY means
        // scaling the edge's distance-from-center by spread/pBase.
        const h = Math.PI / N;
        const M = base.tMajor;
        const m = base.tMinor;
        const edgeLen = Math.hypot(m * Math.cos(h) - M, m * Math.sin(h));
        const pBase = edgeLen > 1e-9 ? (M * m * Math.sin(h)) / edgeLen : 0;

        if (expandMode === Enum.Common.expandMode.EDGE.value && pBase > 1e-9) {
            // Edge: constant perpendicular thickness -> inner/outer outlines are parallel scaled copies.
            const kOut = 1 + mods.out / pBase;
            const kIn = 1 - mods.in / pBase;
            tOMajor = kOut * M;
            tOMinor = kOut * m;
            tIMajor = kIn * M;
            tIMinor = kIn * m;
        } else {
            // Point: constant radial thickness -> a uniform radial gap at every vertex.
            tOMajor = M + mods.out;
            tOMinor = m + mods.out;
            tIMajor = M - mods.in;
            tIMinor = m - mods.in;
        }
    }

    tOMajor = Math.max(0, tOMajor);
    tOMinor = Math.max(0, tOMinor);
    tIMajor = Math.max(0, tIMajor);
    tIMinor = Math.max(0, tIMinor);
    if (tOMajor <= 0 && tOMinor <= 0) return null;

    const majorCornerR = len(context, node, "majorCornerRadius", node.payload.majorCornerRadius);
    const majorCornerShape = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "majorCornerShape")?.data, Enum.Common.cornerShape) ?? node.payload.majorCornerShape ?? 0;
    const minorCornerR = len(context, node, "minorCornerRadius", node.payload.minorCornerRadius);
    const minorCornerShape = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "minorCornerShape")?.data, Enum.Common.cornerShape) ?? node.payload.minorCornerShape ?? 0;

    const distro = context.resolve<DataTypes.Distribution>(node.id, "pointDistro")?.data ?? {
        func: Enum.Common.distroFunctions.LINEAR.value,
        easing: Enum.Common.distroEasing.IN.value,
        intensity: "1",
    };
    const distroLerper = distroInterpolator(
        Enum.keyOf(Enum.Common.distroFunctions, distro.func),
        Enum.keyOf(Enum.Common.distroEasing, distro.easing),
        NumericString.Emptyable.asNumber(distro.intensity) ?? 1,
    );

    const [transforms] = TransformPrefab.evaluate(node, context);

    if (socket === "centerline") {
        // The midline of the frame: a single star outline at the average of the outer/inner radii.
        const midMajor = (tOMajor + tIMajor) / 2;
        const midMinor = (tOMinor + tIMinor) / 2;
        if (midMajor <= 1e-6 && midMinor <= 1e-6) return null;
        const midVerts = StarHelper.outlineVertices(N, midMajor, midMinor, majorCornerR, majorCornerShape, minorCornerR, minorCornerShape, distroLerper);
        const [midD] = StarHelper.buildOutline(midVerts, false);
        return { kind: "path", data: { d: midD, transform: transforms.join(" ") } };
    }

    const outerVerts = StarHelper.outlineVertices(N, tOMajor, tOMinor, majorCornerR, majorCornerShape, minorCornerR, minorCornerShape, distroLerper);
    const [outerD, outerCut] = StarHelper.buildOutline(outerVerts, false);

    const hasInner = tIMajor > 1e-6 || tIMinor > 1e-6;
    let innerD = "";
    let innerCut = false;
    if (hasInner) {
        const innerVerts = StarHelper.outlineVertices(N, tIMajor, tIMinor, majorCornerR, majorCornerShape, minorCornerR, minorCornerShape, distroLerper);
        [innerD, innerCut] = StarHelper.buildOutline([...innerVerts].reverse(), true);
    }

    const d = hasInner ? `${outerD} ${innerD}` : outerD;
    const hasCut = outerCut || innerCut;

    if (socket === "path") {
        return { kind: "path", data: { d, transform: transforms.join(" ") } };
    }

    if (socket === "output") {
        const paint = StylingPrefab.evaluate(node, context);
        if (hasCut) paint.fill = null;
        return {
            kind: "shape",
            data: {
                type: "path",
                d,
                paint,
                signals: hasCut ? ["noFill"] : undefined,
                transform: transforms.join(" "),
            },
        };
    }

    return null;
};

export const BandedStarNodeType: NodeTypes.Type<"bandedStar", BandedStarDefinition> = {
    type: "bandedStar",
    displayName: "Star (Banded)",
    defaultLabel: "Star (Banded)",
    iconNode: <NodeIcon shape={NODE_ICONS.shapeBandedStar} />,
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
