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
import { PointInput } from "../../../components/inputs/PointInput";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { StylingPrefab } from "../../helpers/stylingPrefab";
import { TransformPrefab } from "../../helpers/transformPrefab";
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
        chord: "boolean",
        ...TransformPrefab.SIG_IN,
        ...StylingPrefab.SIG_IN,
        ...StylingPrefab.SIG_FILL,
    },
    out: { output: "shape", path: "path", centerpoint: "point", radius: "length" },
});

export type BowDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        start: PointInput.Value;
        end: PointInput.Value;
        rise: DataTypes.TypeOf<DataTypes.Length>;
        invert: DataTypes.TypeOf<DataTypes.Boolean>;
        chord: DataTypes.TypeOf<DataTypes.Boolean>;
    } & StylingPrefab.Definition["payload"] &
        TransformPrefab.Definition["payload"]
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<BowDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"bow", BowDefinition> => {
    return {
        id,
        in: {
            startPoint: null,
            endPoint: null,
            rise: null,
            invert: null,
            chord: null,
            strokeWidth: null,
            strokeColor: null,
            strokeDash: null,
            strokeDashOffset: null,
            strokeCap: null,
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
        },
        payload: {
            label: "",
            start: { ...PointInput.DEFAULT },
            end: { mode: Enum.Common.positionMode.CARTESIAN.value, x: "100px", y: "0px", radius: "100px", theta: "90deg" },
            rise: "20px",
            invert: false,
            chord: false,
            strokeWidth: "1px",
            strokeDash: "",
            strokeColor: { r: 0, g: 0, b: 0, a: 1 },
            strokeDashOffset: "0px",
            strokeCap: Enum.Common.strokeCap.BUTT.value,
            fillColor: { r: 0, g: 0, b: 0, a: 0 },
            paintOrder: 0,
            opacity: "100",
            position: { ...TransformPrefab.POSITION_DEFAULT },
            rotation: "0deg",
        },
        type: "bow",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<BowDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<BowDefinition>>) => {
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
            <SocketIn node={node} socketId={"chord"}>
                <CheckBox checked={node.payload.chord ?? false} onToggle={(chord) => handleUpdate({ chord })} disabled={node.in.chord !== null}>
                    Chord
                </CheckBox>
            </SocketIn>

            <StylingPrefab.Controls node={node} handleUpdate={handleUpdate} fill accordion />
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

const CENTER_INPUTS: (keyof BowDefinition["inputs"])[] = ["startPoint", "endPoint", "rise", "invert"];
const GEOMETRY_INPUTS: (keyof BowDefinition["inputs"])[] = [...CENTER_INPUTS, "chord", "position", "rotation"];
const STYLING_INPUTS: (keyof BowDefinition["inputs"])[] = ["strokeWidth", "strokeColor", "strokeCap", "strokeDash", "strokeDashOffset", "fillColor", "paintOrder", "opacity"];

const dependsOn = (_node: NodeDefinitions.NodeFor<BowDefinition>, outSocket: keyof BowDefinition["outputs"], _deps: AllDeps): (keyof BowDefinition["inputs"])[] => {
    if (outSocket === "centerpoint" || outSocket === "radius") {
        return CENTER_INPUTS;
    }
    if (outSocket === "path") {
        return GEOMETRY_INPUTS;
    }
    return [...GEOMETRY_INPUTS, ...STYLING_INPUTS];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<BowDefinition>, inSocket: keyof BowDefinition["inputs"], _deps: AllDeps): (keyof BowDefinition["outputs"])[] => {
    if (STYLING_INPUTS.includes(inSocket)) {
        return ["output"];
    }
    if (inSocket === "position" || inSocket === "rotation" || inSocket === "chord") {
        return ["output", "path"];
    }
    return ["output", "path", "centerpoint", "radius"];
};

const f = (v: number): string => Number(v.toFixed(4)).toString();

const evaluate = (node: NodeDefinitions.NodeFor<BowDefinition>, socket: keyof BowDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const startPt = context.resolve<DataTypes.Point>(node.id, "startPoint")?.data ?? PointHelper.fromAuthoring(node.payload.start);
    const endPt = context.resolve<DataTypes.Point>(node.id, "endPoint")?.data ?? PointHelper.fromAuthoring(node.payload.end);

    const sx = startPt.x, sy = startPt.y;
    const ex = endPt.x, ey = endPt.y;
    const dx = ex - sx, dy = ey - sy;
    const L = Math.hypot(dx, dy);

    if (L < EPS) return null;

    const rise = Length.Emptyable.asNumber(context.resolve<DataTypes.Length>(node.id, "rise")?.data ?? node.payload.rise) ?? 0;
    const invert = context.resolve<DataTypes.Boolean>(node.id, "invert")?.data ?? node.payload.invert ?? false;
    const chord = context.resolve<DataTypes.Boolean>(node.id, "chord")?.data ?? node.payload.chord ?? false;
    const [transforms] = TransformPrefab.evaluate(node, context);

    if (Math.abs(rise) < EPS) {
        // Degenerate: straight line from start to end.
        const d = `M ${f(sx)},${f(sy)} L ${f(ex)},${f(ey)}`;
        if (socket === "path") {
            return { kind: "path", data: { d, transform: transforms.join(" ") } };
        }
        if (socket === "output") {
            const paint = StylingPrefab.evaluate(node, context);
            paint.fill = null;
            return { kind: "shape", data: { type: "path", d, paint, transform: transforms.join(" ") } };
        }
        return null;
    }

    const halfChord = L / 2;
    const R = (halfChord * halfChord + rise * rise) / (2 * rise);

    const mx = (sx + ex) / 2, my = (sy + ey) / 2;
    // Perpendicular unit vector (rotate chord 90° CCW in SVG).
    const nx = -dy / L, ny = dx / L;

    // Center offset: for not-inverted the arc is on the +n side, center on the -n side.
    // For inverted, arc is on the -n side, center on the +n side.
    const offset = invert ? (R - rise) : (rise - R);
    const Cx = mx + offset * nx;
    const Cy = my + offset * ny;

    if (socket === "centerpoint") {
        return { kind: "point", data: { x: Cx, y: Cy } };
    }
    if (socket === "radius") {
        return { kind: "length", data: `${f(R)}px` };
    }

    const largeArc = rise > halfChord ? 1 : 0;
    const sweepFlag = invert ? 0 : 1;

    const arcCmd = `A ${f(R)} ${f(R)} 0 ${largeArc} ${sweepFlag} ${f(ex)},${f(ey)}`;

    const d = chord ? `M ${f(sx)},${f(sy)} ${arcCmd} Z` : `M ${f(sx)},${f(sy)} ${arcCmd}`;

    if (socket === "path") {
        return { kind: "path", data: { d, transform: transforms.join(" ") } };
    }

    if (socket === "output") {
        const paint = StylingPrefab.evaluate(node, context);
        return { kind: "shape", data: { type: "path", d, paint, transform: transforms.join(" ") } };
    }

    return null;
};

export const BowNodeType: NodeTypes.Type<"bow", BowDefinition> = {
    type: "bow",
    displayName: "Bow",
    defaultLabel: "Bow",
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
