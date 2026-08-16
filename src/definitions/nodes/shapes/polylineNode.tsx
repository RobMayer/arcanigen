import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { StylingPrefab } from "../../helpers/stylingPrefab";
import { TransformPrefab } from "../../helpers/transformPrefab";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { NumericString } from "../../datatypes/numericString";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

// Straight-line path through an array of points: "M x,y L x,y ...", optionally closed with a Z. The
// counterpart to Line for a variable-length vertex list (feed it Points on Path, From Crossings, a
// Point Array, etc.). Fill is kept (an open path still fills its implied-closed region in SVG).
const def = signature({
    in: {
        points: $.arrayOf("point"),
        closed: "boolean",
        smoothness: $.oneOf("float", "integer"),
        markerStartShape: "shape",
        markerMidShape: "shape",
        markerEndShape: "shape",
        markerAlign: "boolean",
        ...TransformPrefab.SIG_IN,
        ...StylingPrefab.SIG_IN,
        ...StylingPrefab.SIG_FILL,
        ...StylingPrefab.SIG_JOIN,
    },
    out: { output: "shape", path: "path" },
});

export type PolylineDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        closed: DataTypes.TypeOf<DataTypes.Boolean>;
        smoothness: DataTypes.TypeOf<DataTypes.Float>;
        markerAlign: DataTypes.TypeOf<DataTypes.Boolean>;
    } & StylingPrefab.Definition["payload"] &
        TransformPrefab.Definition["payload"]
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<PolylineDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"polyline", PolylineDefinition> => {
    return {
        id,
        in: {
            points: null,
            closed: null,
            smoothness: null,

            markerStartShape: null,
            markerMidShape: null,
            markerEndShape: null,
            markerAlign: null,

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
        },
        payload: {
            label: "",
            closed: false,
            smoothness: "0",
            markerAlign: false,
            // stroke
            strokeWidth: "1px",
            strokeDash: "",
            strokeColor: { r: 0, g: 0, b: 0, a: 1 },
            strokeDashOffset: "0px",
            strokeCap: Enum.Common.strokeCap.BUTT.value,
            strokeJoin: Enum.Common.strokeJoin.MITER.value,
            // fill
            fillColor: { r: 0, g: 0, b: 0, a: 0 },
            paintOrder: 0,
            opacity: "100",
            // transforms
            position: { ...TransformPrefab.POSITION_DEFAULT },
            rotation: "0deg",
        },
        type: "polyline",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PolylineDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PolylineDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketOut node={node} socketId={"path"}>
                Path
            </SocketOut>
            <SocketIn node={node} socketId={"points"}>
                Points
            </SocketIn>
            <SocketIn node={node} socketId={"closed"}>
                <CheckBox checked={node.payload.closed} onToggle={(closed) => handleUpdate({ closed })} disabled={node.in.closed !== null}>
                    Close Path
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"smoothness"} label={"Smoothness"}>
                <DecimalInput.SliderInput
                    value={node.payload.smoothness}
                    onCommit={(smoothness) => handleUpdate({ smoothness })}
                    disabled={node.in.smoothness !== null}
                    min={"0"}
                    max={"100"}
                    step={"0.1"}
                    snap={"0.1"}
                    required
                />
            </SocketIn>
            <NodeAccordion label={"Markers"} socketsIn={"markerStartShape|markerMidShape|markerEndShape|markerAlign"} nodeId={node.id}>
                <SocketIn node={node} socketId={"markerStartShape"}>
                    Start Marker
                </SocketIn>
                <SocketIn node={node} socketId={"markerMidShape"}>
                    Mid Marker
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
            <StylingPrefab.Controls node={node} handleUpdate={handleUpdate} fill join accordion />
            <TransformPrefab.Controls node={node} handleUpdate={handleUpdate} accordion />
        </TypicalNode>
    );
};

// Geometry drives both outputs; markers and styling only appear on the rendered shape, not the path.
const GEOMETRY_INPUTS: (keyof PolylineDefinition["inputs"])[] = ["points", "closed", "smoothness", "position", "rotation"];
const MARKER_INPUTS: (keyof PolylineDefinition["inputs"])[] = ["markerStartShape", "markerMidShape", "markerEndShape", "markerAlign"];
const STYLING_INPUTS: (keyof PolylineDefinition["inputs"])[] = ["strokeWidth", "strokeColor", "strokeCap", "strokeJoin", "strokeDash", "strokeDashOffset", "fillColor", "paintOrder", "opacity"];

const dependsOn = (_node: NodeDefinitions.NodeFor<PolylineDefinition>, outSocket: keyof PolylineDefinition["outputs"], _deps: AllDeps): (keyof PolylineDefinition["inputs"])[] => {
    if (outSocket === "path") {
        return GEOMETRY_INPUTS;
    }
    return [...GEOMETRY_INPUTS, ...MARKER_INPUTS, ...STYLING_INPUTS];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PolylineDefinition>, inSocket: keyof PolylineDefinition["inputs"], _deps: AllDeps): (keyof PolylineDefinition["outputs"])[] => {
    if (STYLING_INPUTS.includes(inSocket) || MARKER_INPUTS.includes(inSocket)) {
        return ["output"];
    }
    return ["output", "path"];
};

type Vertex = { x: number; y: number };

// Straight polyline: "M x,y L x,y ... [Z]". The smoothness=0 baseline, kept byte-identical to the original.
const buildStraightPath = (points: Vertex[], closed: boolean): string => {
    const [first, ...rest] = points;
    return `M ${first.x},${first.y} ${rest.map((p) => `L ${p.x},${p.y}`).join(" ")}${closed ? " Z" : ""}`;
};

// Centripetal Catmull-Rom (alpha=0.5), emitted as cubic beziers so the curve passes THROUGH every input
// point. `tension` (0..1) scales the tangents: 0 collapses each segment to a straight line (== the polyline
// baseline), 1 is full Catmull-Rom. Centripetal parameterization avoids cusps/self-intersection on sharp
// turns and stays finite through coincident points (knot deltas are floored to EPS).
const buildSmoothPath = (points: Vertex[], closed: boolean, tension: number): string => {
    const ALPHA = 0.5;
    const EPS = 1e-4;
    const n = points.length;
    const at = (i: number): Vertex => (closed ? points[((i % n) + n) % n] : points[Math.max(0, Math.min(n - 1, i))]);
    const knot = (a: Vertex, b: Vertex): number => Math.max(EPS, Math.pow(Math.hypot(b.x - a.x, b.y - a.y), ALPHA));

    let d = `M ${points[0].x},${points[0].y}`;
    const segments = closed ? n : n - 1;
    for (let i = 0; i < segments; i++) {
        const p0 = at(i - 1),
            p1 = at(i),
            p2 = at(i + 1),
            p3 = at(i + 2);
        const t01 = knot(p0, p1),
            t12 = knot(p1, p2),
            t23 = knot(p2, p3);

        // Non-uniform Catmull-Rom tangents at p1 and p2, scaled by tension.
        const m1x = tension * (p2.x - p1.x + t12 * ((p1.x - p0.x) / t01 - (p2.x - p0.x) / (t01 + t12)));
        const m1y = tension * (p2.y - p1.y + t12 * ((p1.y - p0.y) / t01 - (p2.y - p0.y) / (t01 + t12)));
        const m2x = tension * (p2.x - p1.x + t12 * ((p3.x - p2.x) / t23 - (p3.x - p1.x) / (t12 + t23)));
        const m2y = tension * (p2.y - p1.y + t12 * ((p3.y - p2.y) / t23 - (p3.y - p1.y) / (t12 + t23)));

        const c1x = p1.x + m1x / 3,
            c1y = p1.y + m1y / 3,
            c2x = p2.x - m2x / 3,
            c2y = p2.y - m2y / 3;
        d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
    }
    return `${d}${closed ? " Z" : ""}`;
};

const evaluate = (node: NodeDefinitions.NodeFor<PolylineDefinition>, socket: keyof PolylineDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const points = context.resolve<DataTypes.ArrayOf<DataTypes.Point>>(node.id, "points")?.data ?? null;
    if (!points || points.length < 2) {
        return null;
    }

    const closed = context.resolve<DataTypes.Boolean>(node.id, "closed")?.data ?? node.payload.closed ?? false;

    const smoothnessRaw = NumericString.Emptyable.asNumber(context.resolve<DataTypes.Float | DataTypes.Integer>(node.id, "smoothness")?.data ?? node.payload.smoothness) ?? 0;
    const tension = Math.max(0, Math.min(100, smoothnessRaw)) / 100;
    const d = tension <= 0 ? buildStraightPath(points, closed) : buildSmoothPath(points, closed, tension);

    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
    for (const p of points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    }

    const [transforms, { translateX, translateY }] = TransformPrefab.evaluate(node, context);
    const preview = { x: minX + translateX, y: minY + translateY, w: maxX - minX, h: maxY - minY };

    if (socket === "path") {
        return { kind: "path", data: { d, transform: transforms.join(" "), preview } };
    }

    if (socket === "output") {
        const paint = StylingPrefab.evaluate(node, context);

        const markerStartShape = context.resolve<DataTypes.Shape>(node.id, "markerStartShape")?.data;
        const markerMidShape = context.resolve<DataTypes.Shape>(node.id, "markerMidShape")?.data;
        const markerEndShape = context.resolve<DataTypes.Shape>(node.id, "markerEndShape")?.data;
        const markerAlign = context.resolve<DataTypes.Boolean>(node.id, "markerAlign")?.data ?? node.payload.markerAlign ?? false;
        const orient = markerAlign ? "auto-start-reverse" : undefined;

        const markers =
            markerStartShape || markerMidShape || markerEndShape
                ? {
                      start: markerStartShape ? { shape: markerStartShape, orient } : undefined,
                      mid: markerMidShape ? { shape: markerMidShape, orient } : undefined,
                      end: markerEndShape ? { shape: markerEndShape, orient } : undefined,
                  }
                : undefined;

        return {
            kind: "shape",
            data: {
                type: "path",
                d,
                paint,
                markers,
                transform: transforms.join(" "),
                preview,
            },
        };
    }

    return null;
};

export const PolylineNodeType: NodeTypes.Type<"polyline", PolylineDefinition> = {
    type: "polyline",
    displayName: "Polyline",
    defaultLabel: "Polyline",
    iconNode: <NodeIcon shape={NODE_ICONS.shapePolyline} />,
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
