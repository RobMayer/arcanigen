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
import { deg2rad, delerp, distroInterpolator, getTrueRadius, lerp } from "../../../util/misc";
import { StylingPrefab } from "../../helpers/stylingPrefab";
import { TransformPrefab } from "../../helpers/transformPrefab";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: {
        pointCount: "integer",
        radius: "length",
        spread: "length",
        innerRadius: "length",
        outerRadius: "length",
        spanMode: "enum",
        spreadAlign: "enum",
        rScribe: "enum",
        iScribe: "enum",
        oScribe: "enum",
        pointDistro: "distribution",
        outerCornerRadius: "length",
        outerCornerShape: "enum",
        innerCornerRadius: "length",
        innerCornerShape: "enum",
        markerShape: "shape",
        markerAlign: "boolean",
        ...TransformPrefab.SIG_IN,
        ...StylingPrefab.SIG_IN,
        ...StylingPrefab.SIG_FILL,
        ...StylingPrefab.SIG_JOIN,
    },
    out: { output: "shape", path: "path" },
});

export type StarDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        pointCount: DataTypes.TypeOf<DataTypes.Integer>;
        rScribe: DataTypes.TypeOf<DataTypes.Enum>;
        iScribe: DataTypes.TypeOf<DataTypes.Enum>;
        oScribe: DataTypes.TypeOf<DataTypes.Enum>;
        radius: DataTypes.TypeOf<DataTypes.Length>;
        spread: DataTypes.TypeOf<DataTypes.Length>;
        innerRadius: DataTypes.TypeOf<DataTypes.Length>;
        outerRadius: DataTypes.TypeOf<DataTypes.Length>;
        spanMode: DataTypes.TypeOf<DataTypes.Enum>;
        spreadAlign: DataTypes.TypeOf<DataTypes.Enum>;
        outerCornerRadius: DataTypes.TypeOf<DataTypes.Length>;
        outerCornerShape: DataTypes.TypeOf<DataTypes.Enum>;
        innerCornerRadius: DataTypes.TypeOf<DataTypes.Length>;
        innerCornerShape: DataTypes.TypeOf<DataTypes.Enum>;
        markerAlign: DataTypes.TypeOf<DataTypes.Boolean>;
    } & StylingPrefab.Definition["payload"] &
        TransformPrefab.Definition["payload"]
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<StarDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"star", StarDefinition> => {
    return {
        id,
        in: {
            pointCount: null,
            pointDistro: null,
            rScribe: null,
            iScribe: null,
            oScribe: null,
            radius: null,
            spread: null,
            innerRadius: null,
            outerRadius: null,
            spanMode: null,
            spreadAlign: null,
            outerCornerRadius: null,
            outerCornerShape: null,
            innerCornerRadius: null,
            innerCornerShape: null,

            markerShape: null,
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
            pointCount: "5",
            rScribe: Enum.Common.scribeMode.INSCRIBE.value,
            iScribe: Enum.Common.scribeMode.INSCRIBE.value,
            oScribe: Enum.Common.scribeMode.INSCRIBE.value,
            radius: "100px",

            spread: "50px",
            innerRadius: "50px",
            outerRadius: "100px",
            spanMode: 0,
            spreadAlign: 0,
            outerCornerRadius: "0px",
            outerCornerShape: 0,
            innerCornerRadius: "0px",
            innerCornerShape: 0,

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
            positionMode: Enum.Common.positionMode.CARTESIAN.value,
            positionX: "0px",
            positionY: "0px",
            positionRadius: "0px",
            positionTheta: "0deg",
            rotation: "0deg",
        },
        type: "star",
    };
};

const SPAN_MODE_OPTIONS = Enum.options(Enum.Common.spanMode);
const SCRIBE_MODE_OPTIONS = Enum.options(Enum.Common.scribeMode);
const CORNER_SHAPE_OPTIONS = Enum.options(Enum.Common.cornerShape);
const SPREAD_ALIGN_OPTIONS = Enum.options(Enum.Common.spreadAlign);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<StarDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<StarDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const isInOut = node.payload.spanMode === 0 && node.in.spanMode === null;
    const isSpread = node.payload.spanMode === 1 && node.in.spanMode === null;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketOut node={node} socketId={"path"}>
                Path
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

            <SocketIn node={node} socketId={"spanMode"} label={"Span Mode"}>
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
            <SocketIn node={node} socketId={"oScribe"} label={"Outer Scribe Mode"}>
                <RadioButton.Group
                    orientation={"horizontal"}
                    value={`${node.payload.oScribe}`}
                    onValue={(v) => handleUpdate({ oScribe: Number(v) })}
                    disabled={node.in.oScribe !== null || isSpread}
                    options={SCRIBE_MODE_OPTIONS}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"innerRadius"} label={"Inner Radius"}>
                <LengthInput value={node.payload.innerRadius} onCommit={(innerRadius) => handleUpdate({ innerRadius })} disabled={node.in.innerRadius !== null || isSpread} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"iScribe"} label={"Inner Scribe Mode"}>
                <RadioButton.Group
                    orientation={"horizontal"}
                    value={`${node.payload.iScribe}`}
                    onValue={(v) => handleUpdate({ iScribe: Number(v) })}
                    disabled={node.in.iScribe !== null || isSpread}
                    options={SCRIBE_MODE_OPTIONS}
                />
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"radius"} label={"Radius"}>
                <LengthInput value={node.payload.radius} onCommit={(radius) => handleUpdate({ radius })} disabled={node.in.radius !== null || isInOut} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"rScribe"} label={"Scribe Mode"}>
                <RadioButton.Group
                    orientation={"horizontal"}
                    value={`${node.payload.rScribe}`}
                    onValue={(v) => handleUpdate({ rScribe: Number(v) })}
                    disabled={node.in.rScribe !== null || isInOut}
                    options={SCRIBE_MODE_OPTIONS}
                />
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

            <NodeAccordion label={"More"} socketsIn={"outerCornerRadius|outerCornerShape|innerCornerRadius|innerCornerShape|pointDistro|markerShape|markerAlign"} nodeId={node.id}>
                <SocketIn node={node} socketId={"pointDistro"}>
                    Angular Distribution
                </SocketIn>
                <SocketIn node={node} socketId={"outerCornerRadius"} label={"Outer Corner Radius"}>
                    <LengthInput
                        value={node.payload.outerCornerRadius}
                        onCommit={(outerCornerRadius) => handleUpdate({ outerCornerRadius })}
                        disabled={node.in.outerCornerRadius !== null}
                        min={"0px"}
                        required
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"outerCornerShape"} label={"Outer Corner Shape"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.outerCornerShape}`}
                        options={CORNER_SHAPE_OPTIONS}
                        onValue={(v) => handleUpdate({ outerCornerShape: Number(v) })}
                        disabled={node.in.outerCornerShape !== null}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"innerCornerRadius"} label={"Inner Corner Radius"}>
                    <LengthInput
                        value={node.payload.innerCornerRadius}
                        onCommit={(innerCornerRadius) => handleUpdate({ innerCornerRadius })}
                        disabled={node.in.innerCornerRadius !== null}
                        min={"0px"}
                        required
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"innerCornerShape"} label={"Inner Corner Shape"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.innerCornerShape}`}
                        options={CORNER_SHAPE_OPTIONS}
                        onValue={(v) => handleUpdate({ innerCornerShape: Number(v) })}
                        disabled={node.in.innerCornerShape !== null}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"markerShape"}>
                    Markers
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

const GEOMETRY_INPUTS: (keyof StarDefinition["inputs"])[] = [
    "pointCount",
    "pointDistro",
    "radius",
    "spread",
    "innerRadius",
    "outerRadius",
    "spanMode",
    "spreadAlign",
    "rScribe",
    "iScribe",
    "oScribe",
    "outerCornerRadius",
    "outerCornerShape",
    "innerCornerRadius",
    "innerCornerShape",
    "markerShape",
    "markerAlign",
    "positionMode",
    "positionX",
    "positionY",
    "positionRadius",
    "positionTheta",
    "rotation",
];
const STYLING_INPUTS: (keyof StarDefinition["inputs"])[] = ["strokeWidth", "strokeColor", "strokeCap", "strokeJoin", "strokeDash", "strokeDashOffset", "fillColor", "paintOrder"];

const dependsOn = (_node: NodeDefinitions.NodeFor<StarDefinition>, outSocket: keyof StarDefinition["outputs"], _deps: AllDeps): (keyof StarDefinition["inputs"])[] => {
    if (outSocket === "path") {
        return GEOMETRY_INPUTS;
    }
    return [...GEOMETRY_INPUTS, ...STYLING_INPUTS];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<StarDefinition>, inSocket: keyof StarDefinition["inputs"], _deps: AllDeps): (keyof StarDefinition["outputs"])[] => {
    if (STYLING_INPUTS.includes(inSocket)) {
        return ["output"];
    }
    return ["output", "path"];
};

/** Build a star path with per-vertex corner params (alternating outer tips and inner valleys) */
const buildStarPath = (vertices: (readonly [number, number])[], outerCornerR: number, outerCornerShape: number, innerCornerR: number, innerCornerShape: number): [string, boolean] => {
    const N = vertices.length; // 2 * pointCount

    if (outerCornerR <= 0 && innerCornerR <= 0) {
        return [
            `M ${vertices[0][0]},${vertices[0][1]} ${vertices
                .slice(1)
                .map(([x, y]) => `L ${x},${y}`)
                .join(" ")} Z`,
            false,
        ];
    }

    const edgeLengths = vertices.map((v, i) => {
        const next = vertices[(i + 1) % N];
        return Math.hypot(next[0] - v[0], next[1] - v[1]);
    });

    const vertexData = vertices.map((curr, i) => {
        const prev = vertices[(i - 1 + N) % N];
        const next = vertices[(i + 1) % N];
        const ax = prev[0] - curr[0],
            ay = prev[1] - curr[1];
        const bx = next[0] - curr[0],
            by = next[1] - curr[1];
        const lenA = edgeLengths[(i - 1 + N) % N];
        const lenB = edgeLengths[i];
        const cosAlpha = Math.max(-1, Math.min(1, (ax * bx + ay * by) / (lenA * lenB)));
        const halfAlpha = Math.acos(cosAlpha) / 2;
        return { ax, ay, bx, by, lenA, lenB, halfAlpha };
    });

    // Per-vertex clamped radius: clamp each to half adjacent edge lengths
    const clampedR = vertices.map((_, i) => {
        const r = i % 2 === 0 ? outerCornerR : innerCornerR;
        if (r <= 0) return 0;
        const { halfAlpha } = vertexData[i];
        const tanHalf = Math.tan(halfAlpha);
        if (tanHalf <= 1e-10) return 0;
        const halfPrev = edgeLengths[(i - 1 + N) % N] / 2;
        const halfNext = edgeLengths[i] / 2;
        return Math.min(r, Math.min(halfPrev, halfNext) * tanHalf);
    });

    const parts: string[] = [];
    let hasCut = false;
    let firstApX = 0,
        firstApY = 0;
    let firstSet = false;
    for (let i = 0; i < N; i++) {
        const r = clampedR[i];
        const cornerShape = i % 2 === 0 ? outerCornerShape : innerCornerShape;

        if (r <= 0) {
            if (!firstSet) {
                firstApX = vertices[i][0];
                firstApY = vertices[i][1];
                firstSet = true;
            }
            parts.push(i === 0 ? `M ${vertices[i][0]},${vertices[i][1]}` : `L ${vertices[i][0]},${vertices[i][1]}`);
            continue;
        }

        const { ax, ay, bx, by, lenA, lenB, halfAlpha } = vertexData[i];
        const curr = vertices[i];
        const t = r / Math.tan(halfAlpha);

        const apX = curr[0] + (ax / lenA) * t;
        const apY = curr[1] + (ay / lenA) * t;
        const lpX = curr[0] + (bx / lenB) * t;
        const lpY = curr[1] + (by / lenB) * t;

        if (!firstSet) {
            firstApX = apX;
            firstApY = apY;
            firstSet = true;
        }
        parts.push(i === 0 ? `M ${apX},${apY}` : `L ${apX},${apY}`);

        switch (cornerShape) {
            case 0: // Round
                parts.push(`A ${r},${r} 0 0,1 ${lpX},${lpY}`);
                break;
            case 2: // Scoop
                parts.push(`A ${r},${r} 0 0,0 ${lpX},${lpY}`);
                break;
            case 3: {
                // Notch
                const nX = apX + (bx / lenB) * t;
                const nY = apY + (by / lenB) * t;
                parts.push(`L ${nX},${nY} L ${lpX},${lpY}`);
                break;
            }
            case 4: // Cut
                parts.push(`M ${lpX},${lpY}`);
                hasCut = true;
                break;
            default: // Bevel
                parts.push(`L ${lpX},${lpY}`);
                break;
        }
    }
    if (hasCut) {
        parts.push(`L ${firstApX},${firstApY}`);
    } else {
        parts.push("Z");
    }
    return [parts.join(" "), hasCut];
};

const evaluate = (node: NodeDefinitions.NodeFor<StarDefinition>, socket: keyof StarDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output" || socket === "path") {
        const pointCount = Math.round(Math.max(3, Math.min(64, NumericString.Emptyable.asNumber(context.resolve<DataTypes.Integer>(node.id, "pointCount")?.data ?? node.payload.pointCount) ?? NaN)));
        if (!isFinite(pointCount)) return null;

        const N = pointCount;
        const spanMode = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "spanMode")?.data, Enum.Common.spanMode) ?? node.payload.spanMode ?? 0;

        let tI: number;
        let tO: number;

        if (spanMode === Enum.Common.spanMode.INNER_OUTER.value) {
            const innerRadius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "innerRadius")?.data ?? node.payload.innerRadius, "0px")) ?? 0;
            const outerRadius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "outerRadius")?.data ?? node.payload.outerRadius, "0px")) ?? 0;
            if (!outerRadius) return null;

            const iScribeMode = Enum.keyOf(Enum.Common.scribeMode, context.resolve<DataTypes.Enum>(node.id, "iScribe")?.data ?? node.payload.iScribe ?? Enum.Common.scribeMode.INSCRIBE.value);
            const oScribeMode = Enum.keyOf(Enum.Common.scribeMode, context.resolve<DataTypes.Enum>(node.id, "oScribe")?.data ?? node.payload.oScribe ?? Enum.Common.scribeMode.INSCRIBE.value);

            tI = getTrueRadius(innerRadius, iScribeMode, N);
            tO = getTrueRadius(outerRadius, oScribeMode, N);
        } else {
            // Spread mode
            const radius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "radius")?.data ?? node.payload.radius, "0px")) ?? 0;
            const spread = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "spread")?.data ?? node.payload.spread, "0px")) ?? 0;
            if (!radius || !spread) return null;

            const rScribeMode = Enum.keyOf(Enum.Common.scribeMode, context.resolve<DataTypes.Enum>(node.id, "rScribe")?.data ?? node.payload.rScribe ?? Enum.Common.scribeMode.INSCRIBE.value);
            const spreadAlign = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "spreadAlign")?.data, Enum.Common.spreadAlign) ?? node.payload.spreadAlign ?? 0;

            const base = getTrueRadius(radius, rScribeMode, N);

            const tIMod = spreadAlign === Enum.Common.spreadAlign.CENTER.value ? spread / 2 : spreadAlign === Enum.Common.spreadAlign.INWARD.value ? spread : 0;
            const tOMod = spreadAlign === Enum.Common.spreadAlign.CENTER.value ? spread / 2 : spreadAlign === Enum.Common.spreadAlign.OUTWARD.value ? spread : 0;

            tI = base - tIMod;
            tO = base + tOMod;
        }

        if (tO <= 0) return null;
        tI = Math.max(0, tI);

        // Corner parameters
        const outerCornerR = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "outerCornerRadius")?.data ?? node.payload.outerCornerRadius, "0px")) ?? 0;
        const outerCornerShape = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "outerCornerShape")?.data, Enum.Common.cornerShape) ?? node.payload.outerCornerShape ?? 0;
        const innerCornerR = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "innerCornerRadius")?.data ?? node.payload.innerCornerRadius, "0px")) ?? 0;
        const innerCornerShape = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "innerCornerShape")?.data, Enum.Common.cornerShape) ?? node.payload.innerCornerShape ?? 0;

        // Markers
        const markerShape = context.resolve<DataTypes.Shape>(node.id, "markerShape")?.data;
        const markerAlign = context.resolve<DataTypes.Boolean>(node.id, "markerAlign")?.data ?? node.payload.markerAlign ?? false;

        // Distribution
        const distro = context.resolve<DataTypes.Distribution>(node.id, "pointDistro")?.data ?? { func: Enum.Common.distroFunctions.LINEAR.value, easing: Enum.Common.distroEasing.IN.value, intensity: "1" };
        const distroLerper = distroInterpolator(
            Enum.keyOf(Enum.Common.distroFunctions, distro.func),
            Enum.keyOf(Enum.Common.distroEasing, distro.easing),
            NumericString.Emptyable.asNumber(distro.intensity) ?? 1,
        );

        // Generate interleaved outer/inner vertices
        // Outer at i/N, inner at (i+0.5)/N
        const vertices: (readonly [number, number])[] = [];
        for (let i = 0; i < N; i++) {
            const outerCoeff = lerp(delerp(i, 0, N), 0, 360, distroLerper);
            const outerAngle = deg2rad(outerCoeff - 90);
            vertices.push([tO * Math.cos(outerAngle), tO * Math.sin(outerAngle)] as const);

            const innerCoeff = lerp(delerp(i + 0.5, 0, N), 0, 360, distroLerper);
            const innerAngle = deg2rad(innerCoeff - 90);
            vertices.push([tI * Math.cos(innerAngle), tI * Math.sin(innerAngle)] as const);
        }

        const [d, hasCut] = buildStarPath(vertices, outerCornerR, outerCornerShape, innerCornerR, innerCornerShape);
        const [transforms, { translateX, translateY }] = TransformPrefab.evaluate(node, context);

        if (socket === "path") {
            return {
                kind: "path",
                data: { d, transform: transforms.join(" "), preview: { x: -tO + translateX, y: -tO + translateY, w: 2 * tO, h: 2 * tO } },
            };
        }

        const paint = StylingPrefab.evaluate(node, context);
        if (hasCut) paint.fill = null;

        return {
            kind: "shape",
            data: {
                type: "path",
                d,
                paint,
                signals: hasCut ? ["noFill"] : undefined,
                markers: markerShape
                    ? {
                          mid: { shape: markerShape, orient: markerAlign ? "auto-start-reverse" : undefined },
                          end: { shape: markerShape, orient: markerAlign ? "auto-start-reverse" : undefined },
                      }
                    : undefined,
                transform: transforms.join(" "),
                preview: { x: -tO + translateX, y: -tO + translateY, w: 2 * tO, h: 2 * tO },
            },
        };
    }

    return null;
};

export const StarNodeType: NodeTypes.Type<"star", StarDefinition> = {
    type: "star",
    displayName: "Star",
    defaultLabel: "Star",
    iconNode: <NodeIcon shape={NODE_ICONS.shapeStar} />,
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
