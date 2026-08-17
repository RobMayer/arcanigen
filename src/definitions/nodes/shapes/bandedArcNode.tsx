import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Angle } from "../../datatypes/angle";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { StylingPrefab } from "../../helpers/stylingPrefab";
import { TransformPrefab } from "../../helpers/transformPrefab";
import { BandHelper } from "../../helpers/bandHelper";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

// The "banded" counterpart to Arc (as Ring is to Circle): a thick arc / annular sector. The band spans
// inner->outer radius (Ring's radial vocab) over a sweep (Arc's angular vocab), with a bandCap at each
// angular end -- reusing BandHelper.capCommands (cap circle radius = half the band thickness, centered
// on the mid-radius endpoint, bulging tangentially). innerRadius 0 gives a filled sector; a full sweep
// gives a full ring.
const def = signature({
    in: {
        radius: "length",
        spread: "length",
        innerRadius: "length",
        outerRadius: "length",
        spanMode: "enum",
        spreadAlign: "enum",
        startCap: "enum",
        endCap: "enum",
        arcMode: "enum",
        thetaStart: "angle",
        sweep: "angle",
        thetaFrom: "angle",
        thetaTo: "angle",
        ...TransformPrefab.SIG_IN,
        ...StylingPrefab.SIG_IN,
        ...StylingPrefab.SIG_FILL,
        ...StylingPrefab.SIG_JOIN,
    },
    out: { output: "shape", path: "path", centerline: "path" },
});

export type BandedArcDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        radius: DataTypes.TypeOf<DataTypes.Length>;
        spread: DataTypes.TypeOf<DataTypes.Length>;
        innerRadius: DataTypes.TypeOf<DataTypes.Length>;
        outerRadius: DataTypes.TypeOf<DataTypes.Length>;
        spanMode: DataTypes.TypeOf<DataTypes.Enum>;
        spreadAlign: DataTypes.TypeOf<DataTypes.Enum>;
        startCap: DataTypes.TypeOf<DataTypes.Enum>;
        endCap: DataTypes.TypeOf<DataTypes.Enum>;
        arcMode: DataTypes.TypeOf<DataTypes.Enum>;
        thetaStart: DataTypes.TypeOf<DataTypes.Angle>;
        sweep: DataTypes.TypeOf<DataTypes.Angle>;
        thetaFrom: DataTypes.TypeOf<DataTypes.Angle>;
        thetaTo: DataTypes.TypeOf<DataTypes.Angle>;
    } & StylingPrefab.Definition["payload"] &
        TransformPrefab.Definition["payload"]
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<BandedArcDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"bandedArc", BandedArcDefinition> => {
    return {
        id,
        in: {
            radius: null,
            spread: null,
            innerRadius: null,
            outerRadius: null,
            spanMode: null,
            spreadAlign: null,
            startCap: null,
            endCap: null,
            arcMode: null,
            thetaStart: null,
            sweep: null,
            thetaFrom: null,
            thetaTo: null,

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
            radius: "100px",
            spread: "20px",
            innerRadius: "90px",
            outerRadius: "110px",
            spanMode: Enum.Common.spanMode.INNER_OUTER.value,
            spreadAlign: 0,
            startCap: Enum.Common.bandCap.BUTT.value,
            endCap: Enum.Common.bandCap.BUTT.value,
            arcMode: Enum.Common.arcMode.START_SWEEP.value,
            thetaStart: "0deg",
            sweep: "90deg",
            thetaFrom: "0deg",
            thetaTo: "90deg",
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
        type: "bandedArc",
    };
};

const SPAN_MODE_OPTIONS = Enum.options(Enum.Common.spanMode);
const SPREAD_ALIGN_OPTIONS = Enum.options(Enum.Common.spreadAlign);
const ARC_MODE_OPTIONS = Enum.options(Enum.Common.arcMode);
const BAND_CAP_OPTIONS = Enum.options(Enum.Common.bandCap);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<BandedArcDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<BandedArcDefinition>>) => {
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
            <SocketOut node={node} socketId={"centerline"}>
                Centerline
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
            <SocketIn node={node} socketId={"startCap"} label={"Start Cap"}>
                <RadioButton.Group
                    options={BAND_CAP_OPTIONS}
                    value={`${node.payload.startCap}`}
                    onValue={(v) => handleUpdate({ startCap: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.startCap !== null}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"endCap"} label={"End Cap"}>
                <RadioButton.Group
                    options={BAND_CAP_OPTIONS}
                    value={`${node.payload.endCap}`}
                    onValue={(v) => handleUpdate({ endCap: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.endCap !== null}
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

            <StylingPrefab.Controls node={node} handleUpdate={handleUpdate} fill join accordion />
            <TransformPrefab.Controls node={node} handleUpdate={handleUpdate} accordion />
        </TypicalNode>
    );
};

// The mid-radius arc (centerline) depends on the radial + angular layout, but NOT the end caps.
const CENTERLINE_INPUTS: (keyof BandedArcDefinition["inputs"])[] = [
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
    "position",
    "rotation",
];
const CAP_INPUTS: (keyof BandedArcDefinition["inputs"])[] = ["startCap", "endCap"];
const GEOMETRY_INPUTS: (keyof BandedArcDefinition["inputs"])[] = [...CENTERLINE_INPUTS, ...CAP_INPUTS];
const STYLING_INPUTS: (keyof BandedArcDefinition["inputs"])[] = ["strokeWidth", "strokeColor", "strokeCap", "strokeJoin", "strokeDash", "strokeDashOffset", "fillColor", "paintOrder", "opacity"];

const dependsOn = (_node: NodeDefinitions.NodeFor<BandedArcDefinition>, outSocket: keyof BandedArcDefinition["outputs"], _deps: AllDeps): (keyof BandedArcDefinition["inputs"])[] => {
    if (outSocket === "centerline") {
        return CENTERLINE_INPUTS;
    }
    if (outSocket === "path") {
        return GEOMETRY_INPUTS;
    }
    return [...GEOMETRY_INPUTS, ...STYLING_INPUTS];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<BandedArcDefinition>, inSocket: keyof BandedArcDefinition["inputs"], _deps: AllDeps): (keyof BandedArcDefinition["outputs"])[] => {
    if (STYLING_INPUTS.includes(inSocket)) {
        return ["output"];
    }
    if (CAP_INPUTS.includes(inSocket)) {
        return ["output", "path"];
    }
    return ["output", "path", "centerline"];
};

/** Our angle convention (0deg = top, CW positive) to radians. */
const toRad = (deg: number): number => ((deg - 90) * Math.PI) / 180;
const polar = (r: number, thetaRad: number): BandHelper.Vec => ({ x: r * Math.cos(thetaRad), y: r * Math.sin(thetaRad) });
// Unit tangent in the direction of increasing theta.
const tangent = (thetaRad: number): BandHelper.Vec => ({ x: -Math.sin(thetaRad), y: Math.cos(thetaRad) });
const scaleVec = (v: BandHelper.Vec, s: number): BandHelper.Vec => ({ x: v.x * s, y: v.y * s });

const fullRing = (rI: number, rO: number): string => {
    let d = `M ${rO},0 A ${rO},${rO} 0 0,0 ${-rO},0 A ${rO},${rO} 0 0,0 ${rO},0 z`;
    if (rI > BandHelper.EPS) {
        d += ` M ${rI},0 A ${rI},${rI} 0 0,1 ${-rI},0 A ${rI},${rI} 0 0,1 ${rI},0 z`;
    }
    return d;
};

const evaluate = (node: NodeDefinitions.NodeFor<BandedArcDefinition>, socket: keyof BandedArcDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const spanMode = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "spanMode")?.data, Enum.Common.spanMode) ?? node.payload.spanMode ?? 0;

    let rI: number;
    let rO: number;
    if (spanMode === Enum.Common.spanMode.INNER_OUTER.value) {
        rI = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "innerRadius")?.data ?? node.payload.innerRadius, "0px")) ?? 0;
        rO = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "outerRadius")?.data ?? node.payload.outerRadius, "0px")) ?? 0;
    } else {
        const radius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "radius")?.data ?? node.payload.radius, "0px")) ?? 0;
        const spread = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "spread")?.data ?? node.payload.spread, "0px")) ?? 0;
        const spreadAlign = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "spreadAlign")?.data, Enum.Common.spreadAlign) ?? node.payload.spreadAlign ?? 0;
        if (spreadAlign === Enum.Common.spreadAlign.INWARD.value) {
            rO = radius;
            rI = radius - spread;
        } else if (spreadAlign === Enum.Common.spreadAlign.OUTWARD.value) {
            rO = radius + spread;
            rI = radius;
        } else {
            rO = radius + spread / 2;
            rI = radius - spread / 2;
        }
    }
    rI = Math.max(0, rI);
    rO = Math.max(0, rO);

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
    effectiveSweep = Math.max(-360, Math.min(360, effectiveSweep));
    if (effectiveSweep === 0) return null;

    const absSweep = Math.abs(effectiveSweep);
    const sweepFlag = effectiveSweep > 0 ? 1 : 0;
    const largeArc = absSweep > 180 ? 1 : 0;
    const th0 = toRad(effectiveStart);
    const th1 = toRad(effectiveStart + effectiveSweep);

    const [transforms] = TransformPrefab.evaluate(node, context);

    if (socket === "centerline") {
        const rM = (rI + rO) / 2;
        if (rM < BandHelper.EPS) return null;
        const d =
            absSweep >= 360
                ? `M ${rM},0 A ${rM},${rM} 0 0,0 ${-rM},0 A ${rM},${rM} 0 0,0 ${rM},0`
                : `M ${BandHelper.pt(polar(rM, th0))} A ${rM} ${rM} 0 ${largeArc} ${sweepFlag} ${BandHelper.pt(polar(rM, th1))}`;
        return { kind: "path", data: { d, transform: transforms.join(" ") } };
    }

    const thickness = rO - rI;
    if (thickness <= BandHelper.EPS) return null;

    let d: string;
    if (absSweep >= 360) {
        d = fullRing(rI, rO);
    } else {
        const startCap = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "startCap")?.data, Enum.Common.bandCap) ?? node.payload.startCap ?? 0;
        const endCap = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "endCap")?.data, Enum.Common.bandCap) ?? node.payload.endCap ?? 0;

        const capR = thickness / 2;
        const sign = effectiveSweep > 0 ? 1 : -1;

        const oStart = polar(rO, th0);
        const oEnd = polar(rO, th1);
        const iStart = polar(rI, th0);
        const iEnd = polar(rI, th1);
        const mid0 = polar((rI + rO) / 2, th0);
        const mid1 = polar((rI + rO) / 2, th1);

        // Outward (tangential, away from the sweep) at each angular end.
        const uEnd = scaleVec(tangent(th1), sign);
        const uStart = scaleVec(tangent(th0), -sign);

        const endCapCmds = BandHelper.capCommands(endCap, mid1, capR, uEnd, oEnd, iEnd, uEnd, uEnd);
        const startCapCmds = BandHelper.capCommands(startCap, mid0, capR, uStart, iStart, oStart, uStart, uStart);

        d =
            `M ${BandHelper.pt(oStart)} A ${rO} ${rO} 0 ${largeArc} ${sweepFlag} ${BandHelper.pt(oEnd)} ` +
            `${endCapCmds} A ${rI} ${rI} 0 ${largeArc} ${1 - sweepFlag} ${BandHelper.pt(iStart)} ${startCapCmds} Z`;
    }

    if (socket === "path") {
        return { kind: "path", data: { d, transform: transforms.join(" ") } };
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

export const BandedArcNodeType: NodeTypes.Type<"bandedArc", BandedArcDefinition> = {
    type: "bandedArc",
    displayName: "Banded Arc",
    defaultLabel: "Banded Arc",
    iconNode: <NodeIcon shape={NODE_ICONS.shapeArc} />,
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
