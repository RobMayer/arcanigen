import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { useGraphId } from "../../../state/graphId";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { PointInput } from "../../../components/inputs/PointInput";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { StylingPrefab } from "../../helpers/stylingPrefab";
import { TransformPrefab } from "../../helpers/transformPrefab";
import { BandHelper } from "../../helpers/bandHelper";
import { PointHelper } from "../../helpers/pointHelper";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const EPS = 1e-6;

const def = signature({
    in: {
        startPoint: "point",
        endPoint: "point",
        rise: "length",
        invert: "boolean",
        thickness: "length",
        thicknessAlign: "enum",
        startCap: "enum",
        endCap: "enum",
        ...TransformPrefab.SIG_IN,
        ...StylingPrefab.SIG_IN,
        ...StylingPrefab.SIG_FILL,
        ...StylingPrefab.SIG_JOIN,
    },
    out: { output: "shape", path: "path", centerpoint: "point", radius: "length", centerline: "path" },
});

export type BandedBowDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        start: PointInput.Value;
        end: PointInput.Value;
        rise: DataTypes.TypeOf<DataTypes.Length>;
        invert: DataTypes.TypeOf<DataTypes.Boolean>;
        thickness: DataTypes.TypeOf<DataTypes.Length>;
        thicknessAlign: DataTypes.TypeOf<DataTypes.Enum>;
        startCap: DataTypes.TypeOf<DataTypes.Enum>;
        endCap: DataTypes.TypeOf<DataTypes.Enum>;
    } & StylingPrefab.Definition["payload"] &
        TransformPrefab.Definition["payload"]
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<BandedBowDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"bandedBow", BandedBowDefinition> => {
    return {
        id,
        in: {
            startPoint: null,
            endPoint: null,
            rise: null,
            invert: null,
            thickness: null,
            thicknessAlign: null,
            startCap: null,
            endCap: null,
            strokeWidth: null,
            strokeColor: null,
            strokeDash: null,
            strokeDashOffset: null,
            strokeCap: null,
            strokeJoin: null,
            fillColor: null,
            paintOrder: null,
            opacity: null,
            position: null,
            rotation: null,
        },
        out: {
            output: [],
            path: [],
            centerpoint: [],
            radius: [],
            centerline: [],
        },
        payload: {
            label: "",
            start: { ...PointInput.DEFAULT },
            end: { mode: Enum.Common.positionMode.CARTESIAN.value, x: "100px", y: "0px", radius: "100px", theta: "90deg" },
            rise: "20px",
            invert: false,
            thickness: "10px",
            thicknessAlign: Enum.Common.spreadAlign.CENTER.value,
            startCap: Enum.Common.bandCap.BUTT.value,
            endCap: Enum.Common.bandCap.BUTT.value,
            strokeWidth: "1px",
            strokeDash: "",
            strokeColor: { r: 0, g: 0, b: 0, a: 1 },
            strokeDashOffset: "0px",
            strokeCap: Enum.Common.strokeCap.BUTT.value,
            strokeJoin: Enum.Common.strokeJoin.MITER.value,
            fillColor: { r: 0, g: 0, b: 0, a: 1 },
            paintOrder: 0,
            opacity: "100",
            position: { ...TransformPrefab.POSITION_DEFAULT },
            rotation: "0deg",
        },
        type: "bandedBow",
    };
};

const THICKNESS_ALIGN_OPTIONS = Enum.options(Enum.Common.spreadAlign);
const BAND_CAP_OPTIONS = Enum.options(Enum.Common.bandCap);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<BandedBowDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<BandedBowDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const graphId = useGraphId();
    const previewCenterpoint = Project.useCachedOutput(graphId, node, "centerpoint");
    const previewRadius = Project.useCachedOutput(graphId, node, "radius");

    const startConnected = node.in.startPoint !== null;
    const endConnected = node.in.endPoint !== null;

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

            <SocketIn node={node} socketId={"startPoint"} label={"Start"}>
                <PointInput value={node.payload.start} onChange={(v) => handleUpdate({ start: { ...node.payload.start, ...v } })} disabled={startConnected} />
            </SocketIn>
            <SocketIn node={node} socketId={"endPoint"} label={"End"}>
                <PointInput value={node.payload.end} onChange={(v) => handleUpdate({ end: { ...node.payload.end, ...v } })} disabled={endConnected} />
            </SocketIn>
            <SocketIn node={node} socketId={"rise"} label={"Rise"}>
                <LengthInput value={node.payload.rise} onCommit={(rise) => handleUpdate({ rise })} disabled={node.in.rise !== null} min={"0px"} />
            </SocketIn>
            <SocketIn node={node} socketId={"invert"}>
                <CheckBox checked={node.payload.invert} onToggle={(invert) => handleUpdate({ invert })} disabled={node.in.invert !== null}>
                    Invert
                </CheckBox>
            </SocketIn>

            <hr />
            <SocketIn node={node} socketId={"thickness"} label={"Thickness"}>
                <LengthInput value={node.payload.thickness} onCommit={(thickness) => handleUpdate({ thickness })} disabled={node.in.thickness !== null} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"thicknessAlign"} label={"Thickness Align"}>
                <RadioButton.Group
                    options={THICKNESS_ALIGN_OPTIONS}
                    value={`${node.payload.thicknessAlign}`}
                    onValue={(v) => handleUpdate({ thicknessAlign: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.thicknessAlign !== null}
                />
            </SocketIn>

            <hr />
            <NodeAccordion label={"Caps"} nodeId={node.id} socketsIn="startCap|endCap">
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
            </NodeAccordion>

            <StylingPrefab.Controls node={node} handleUpdate={handleUpdate} fill join accordion />
            <TransformPrefab.Controls node={node} handleUpdate={handleUpdate} accordion />
            <NodeAccordion nodeId={node.id} label={"Additional Options"} socketsOut={"centerpoint|radius"}>
                <SocketOut node={node} socketId={"centerpoint"} label={"Centerpoint"}>
                    <ValuePreview value={previewCenterpoint} />
                </SocketOut>
                <SocketOut node={node} socketId={"radius"} label={"Radius"}>
                    <ValuePreview value={previewRadius} />
                </SocketOut>
            </NodeAccordion>
        </TypicalNode>
    );
};

const CENTER_INPUTS: (keyof BandedBowDefinition["inputs"])[] = ["startPoint", "endPoint", "rise", "invert"];
const CENTERLINE_INPUTS: (keyof BandedBowDefinition["inputs"])[] = [...CENTER_INPUTS, "thickness", "thicknessAlign", "position", "rotation"];
const CAP_INPUTS: (keyof BandedBowDefinition["inputs"])[] = ["startCap", "endCap"];
const GEOMETRY_INPUTS: (keyof BandedBowDefinition["inputs"])[] = [...CENTERLINE_INPUTS, ...CAP_INPUTS];
const STYLING_INPUTS: (keyof BandedBowDefinition["inputs"])[] = ["strokeWidth", "strokeColor", "strokeCap", "strokeJoin", "strokeDash", "strokeDashOffset", "fillColor", "paintOrder", "opacity"];

const dependsOn = (_node: NodeDefinitions.NodeFor<BandedBowDefinition>, outSocket: keyof BandedBowDefinition["outputs"], _deps: AllDeps): (keyof BandedBowDefinition["inputs"])[] => {
    if (outSocket === "centerpoint" || outSocket === "radius") {
        return CENTER_INPUTS;
    }
    if (outSocket === "centerline") {
        return CENTERLINE_INPUTS;
    }
    if (outSocket === "path") {
        return GEOMETRY_INPUTS;
    }
    return [...GEOMETRY_INPUTS, ...STYLING_INPUTS];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<BandedBowDefinition>, inSocket: keyof BandedBowDefinition["inputs"], _deps: AllDeps): (keyof BandedBowDefinition["outputs"])[] => {
    if (STYLING_INPUTS.includes(inSocket)) {
        return ["output"];
    }
    if (CAP_INPUTS.includes(inSocket)) {
        return ["output", "path"];
    }
    if (inSocket === "position" || inSocket === "rotation") {
        return ["output", "path", "centerline"];
    }
    return ["output", "path", "centerline", "centerpoint", "radius"];
};

// Resolve the common arc geometry shared by all output sockets.
const resolveGeometry = (
    node: NodeDefinitions.NodeFor<BandedBowDefinition>,
    context: Resolver.Context,
): {
    sx: number; sy: number; ex: number; ey: number;
    R: number; Cx: number; Cy: number;
    rise: number; halfChord: number;
    largeArc: number; sweepFlag: number;
} | null => {
    const startPt = context.resolve<DataTypes.Point>(node.id, "startPoint")?.data ?? PointHelper.fromAuthoring(node.payload.start);
    const endPt = context.resolve<DataTypes.Point>(node.id, "endPoint")?.data ?? PointHelper.fromAuthoring(node.payload.end);

    const sx = startPt.x, sy = startPt.y;
    const ex = endPt.x, ey = endPt.y;
    const dx = ex - sx, dy = ey - sy;
    const L = Math.hypot(dx, dy);

    if (L < EPS) return null;

    const rise = Length.Emptyable.asNumber(context.resolve<DataTypes.Length>(node.id, "rise")?.data ?? node.payload.rise) ?? 0;
    if (Math.abs(rise) < EPS) return null;

    const invert = context.resolve<DataTypes.Boolean>(node.id, "invert")?.data ?? node.payload.invert ?? false;

    const halfChord = L / 2;
    const R = (halfChord * halfChord + rise * rise) / (2 * rise);

    const mx = (sx + ex) / 2, my = (sy + ey) / 2;
    const nx = -dy / L, ny = dx / L;

    const offset = invert ? (R - rise) : (rise - R);
    const Cx = mx + offset * nx;
    const Cy = my + offset * ny;

    const largeArc = rise > halfChord ? 1 : 0;
    const sweepFlag = (rise <= halfChord) !== invert ? 1 : 0;

    return { sx, sy, ex, ey, R, Cx, Cy, rise, halfChord, largeArc, sweepFlag };
};

const evaluate = (node: NodeDefinitions.NodeFor<BandedBowDefinition>, socket: keyof BandedBowDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const geo = resolveGeometry(node, context);
    if (!geo) return null;

    const { sx, sy, ex, ey, R, Cx, Cy, largeArc, sweepFlag } = geo;

    if (socket === "centerpoint") {
        return { kind: "point", data: { x: Cx, y: Cy } };
    }
    if (socket === "radius") {
        return { kind: "length", data: `${BandHelper.f(R)}px` };
    }

    const [transforms] = TransformPrefab.evaluate(node, context);

    const thickness = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "thickness")?.data ?? node.payload.thickness, "0px")) ?? 0;
    if (thickness < EPS) return null;

    const thicknessAlign = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "thicknessAlign")?.data, Enum.Common.spreadAlign) ?? node.payload.thicknessAlign ?? 0;

    let rI: number, rO: number;
    if (thicknessAlign === Enum.Common.spreadAlign.INWARD.value) {
        rO = R;
        rI = R - thickness;
    } else if (thicknessAlign === Enum.Common.spreadAlign.OUTWARD.value) {
        rI = R;
        rO = R + thickness;
    } else {
        rO = R + thickness / 2;
        rI = R - thickness / 2;
    }
    rI = Math.max(0, rI);

    if (rO - rI < EPS) return null;

    const rM = (rI + rO) / 2;

    if (socket === "centerline") {
        const scaleM = rM / R;
        const mid0: BandHelper.Vec = { x: Cx + scaleM * (sx - Cx), y: Cy + scaleM * (sy - Cy) };
        const mid1: BandHelper.Vec = { x: Cx + scaleM * (ex - Cx), y: Cy + scaleM * (ey - Cy) };
        const d = `M ${BandHelper.pt(mid0)} A ${BandHelper.f(rM)} ${BandHelper.f(rM)} 0 ${largeArc} ${sweepFlag} ${BandHelper.pt(mid1)}`;
        return { kind: "path", data: { d, transform: transforms.join(" ") } };
    }

    const startCap = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "startCap")?.data, Enum.Common.bandCap) ?? node.payload.startCap ?? 0;
    const endCap = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "endCap")?.data, Enum.Common.bandCap) ?? node.payload.endCap ?? 0;

    const scaleO = rO / R, scaleI = rI / R;
    const oStart: BandHelper.Vec = { x: Cx + scaleO * (sx - Cx), y: Cy + scaleO * (sy - Cy) };
    const iStart: BandHelper.Vec = { x: Cx + scaleI * (sx - Cx), y: Cy + scaleI * (sy - Cy) };
    const oEnd: BandHelper.Vec = { x: Cx + scaleO * (ex - Cx), y: Cy + scaleO * (ey - Cy) };
    const iEnd: BandHelper.Vec = { x: Cx + scaleI * (ex - Cx), y: Cy + scaleI * (ey - Cy) };

    const scaleM = rM / R;
    const mid0: BandHelper.Vec = { x: Cx + scaleM * (sx - Cx), y: Cy + scaleM * (sy - Cy) };
    const mid1: BandHelper.Vec = { x: Cx + scaleM * (ex - Cx), y: Cy + scaleM * (ey - Cy) };

    const capR = (rO - rI) / 2;
    // Unit tangent at P along the arc: perpendicular to the radius (P-C), in the sweep direction.
    // sign=1 for CW sweep (sweepFlag=1), sign=-1 for CCW.
    const sign = sweepFlag === 1 ? 1 : -1;
    const uEnd: BandHelper.Vec = { x: -(ey - Cy) / R * sign, y: (ex - Cx) / R * sign };
    const uStart: BandHelper.Vec = { x: (sy - Cy) / R * sign, y: -(sx - Cx) / R * sign };

    const endCapCmds = BandHelper.capCommands(endCap, mid1, capR, uEnd, oEnd, iEnd, uEnd, uEnd);
    const startCapCmds = BandHelper.capCommands(startCap, mid0, capR, uStart, iStart, oStart, uStart, uStart);

    const d =
        `M ${BandHelper.pt(oStart)} A ${BandHelper.f(rO)} ${BandHelper.f(rO)} 0 ${largeArc} ${sweepFlag} ${BandHelper.pt(oEnd)} ` +
        `${endCapCmds} A ${BandHelper.f(rI)} ${BandHelper.f(rI)} 0 ${largeArc} ${1 - sweepFlag} ${BandHelper.pt(iStart)} ` +
        `${startCapCmds} Z`;

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

export const BandedBowNodeType: NodeTypes.Type<"bandedBow", BandedBowDefinition> = {
    type: "bandedBow",
    displayName: "Bow (Banded)",
    defaultLabel: "Bow (Banded)",
    iconNode: <NodeIcon shape={NODE_ICONS.shapeBandedArc} />,
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
