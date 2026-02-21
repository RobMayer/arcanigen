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
import { deg2rad, delerp, distroInterpolator, getTrueRadius, lerp } from "../../../util/misc";
import { Stylings, Transforms } from "../abstract";
import { CheckBox } from "../../../components/buttons/CheckBox";

export type StarDefinition = {
    inputs: {
        pointCount: DataTypes.Use<"integer">;
        radius: DataTypes.Use<"length">;
        spread: DataTypes.Use<"length">;
        innerRadius: DataTypes.Use<"length">;
        outerRadius: DataTypes.Use<"length">;
        spanMode: DataTypes.Use<"enum">;
        spreadAlign: DataTypes.Use<"enum">;
        rScribe: DataTypes.Use<"enum">;
        iScribe: DataTypes.Use<"enum">;
        oScribe: DataTypes.Use<"enum">;
        pointDistro: DataTypes.Use<"distribution">;
        outerCornerRadius: DataTypes.Use<"length">;
        outerCornerShape: DataTypes.Use<"enum">;
        innerCornerRadius: DataTypes.Use<"length">;
        innerCornerShape: DataTypes.Use<"enum">;
        markerShape: DataTypes.Use<"shape">;
        markerAlign: DataTypes.Use<"boolean">;
    } & Stylings.Definition["inputs"] &
        Transforms.Definition["inputs"];
    outputs: {
        output: DataTypes.Use<"shape">;
        path: DataTypes.Use<"path">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        pointCount: DataTypes.TypeOf<DataTypes.Use<"integer">>;
        rScribe: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        iScribe: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        oScribe: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        radius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        spread: DataTypes.TypeOf<DataTypes.Use<"length">>;
        innerRadius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        outerRadius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        spanMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        spreadAlign: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        outerCornerRadius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        outerCornerShape: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        innerCornerRadius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        innerCornerShape: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        markerAlign: DataTypes.TypeOf<DataTypes.Use<"boolean">>;
    } & Stylings.Definition["payload"] &
        Transforms.Definition["payload"];
};

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
            <SocketOut node={node} socketId={"output"} type={"shape"}>
                Output
            </SocketOut>
            <SocketOut node={node} socketId={"path"} type={"path"}>
                Path
            </SocketOut>
            <SocketIn node={node} socketId={"pointCount"} type={"integer"} label={"Points"}>
                <IntegerInput.SliderInput
                    value={node.payload.pointCount}
                    onCommit={(pointCount) => handleUpdate({ pointCount })}
                    disabled={node.in.pointCount !== null}
                    min={"3"}
                    max={"64"}
                    required
                />
            </SocketIn>

            <SocketIn node={node} socketId={"spanMode"} type={"enum"} label={"Span Mode"}>
                <RadioButton.Group
                    options={SPAN_MODE_OPTIONS}
                    value={`${node.payload.spanMode}`}
                    onValue={(v) => handleUpdate({ spanMode: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.spanMode !== null}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"innerRadius"} type={"length"} label={"Inner Radius"}>
                <LengthInput value={node.payload.innerRadius} onCommit={(innerRadius) => handleUpdate({ innerRadius })} disabled={node.in.innerRadius !== null || isSpread} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"iScribe"} type={"enum"} label={"Inner Scribe Mode"}>
                <RadioButton.Group
                    orientation={"horizontal"}
                    value={`${node.payload.iScribe}`}
                    onValue={(v) => handleUpdate({ iScribe: Number(v) })}
                    disabled={node.in.iScribe !== null || isSpread}
                    options={SCRIBE_MODE_OPTIONS}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"outerRadius"} type={"length"} label={"Outer Radius"}>
                <LengthInput value={node.payload.outerRadius} onCommit={(outerRadius) => handleUpdate({ outerRadius })} disabled={node.in.outerRadius !== null || isSpread} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"oScribe"} type={"enum"} label={"Outer Scribe Mode"}>
                <RadioButton.Group
                    orientation={"horizontal"}
                    value={`${node.payload.oScribe}`}
                    onValue={(v) => handleUpdate({ oScribe: Number(v) })}
                    disabled={node.in.oScribe !== null || isSpread}
                    options={SCRIBE_MODE_OPTIONS}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"radius"} type={"length"} label={"Radius"}>
                <LengthInput value={node.payload.radius} onCommit={(radius) => handleUpdate({ radius })} disabled={node.in.radius !== null || isInOut} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"rScribe"} type={"enum"} label={"Scribe Mode"}>
                <RadioButton.Group
                    orientation={"horizontal"}
                    value={`${node.payload.rScribe}`}
                    onValue={(v) => handleUpdate({ rScribe: Number(v) })}
                    disabled={node.in.rScribe !== null || isInOut}
                    options={SCRIBE_MODE_OPTIONS}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"spread"} type={"length"} label={"Spread"}>
                <LengthInput value={node.payload.spread} onCommit={(spread) => handleUpdate({ spread })} disabled={node.in.spread !== null || isInOut} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"spreadAlign"} type={"enum"} label={"Spread Align"}>
                <RadioButton.Group
                    options={SPREAD_ALIGN_OPTIONS}
                    value={`${node.payload.spreadAlign}`}
                    onValue={(v) => handleUpdate({ spreadAlign: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.spreadAlign !== null || isInOut}
                />
            </SocketIn>

            <NodeAccordion label={"More"} socketsIn={"outerCornerRadius|outerCornerShape|innerCornerRadius|innerCornerShape|pointDistro|markerShape|markerAlign"} nodeId={node.id}>
                <SocketIn node={node} socketId={"pointDistro"} type={"distribution"}>
                    Angular Distribution
                </SocketIn>
                <SocketIn node={node} socketId={"outerCornerRadius"} type={"length"} label={"Outer Corner Radius"}>
                    <LengthInput
                        value={node.payload.outerCornerRadius}
                        onCommit={(outerCornerRadius) => handleUpdate({ outerCornerRadius })}
                        disabled={node.in.outerCornerRadius !== null}
                        min={"0px"}
                        required
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"outerCornerShape"} type={"enum"} label={"Outer Corner Shape"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.outerCornerShape}`}
                        options={CORNER_SHAPE_OPTIONS}
                        onValue={(v) => handleUpdate({ outerCornerShape: Number(v) })}
                        disabled={node.in.outerCornerShape !== null}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"innerCornerRadius"} type={"length"} label={"Inner Corner Radius"}>
                    <LengthInput
                        value={node.payload.innerCornerRadius}
                        onCommit={(innerCornerRadius) => handleUpdate({ innerCornerRadius })}
                        disabled={node.in.innerCornerRadius !== null}
                        min={"0px"}
                        required
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"innerCornerShape"} type={"enum"} label={"Inner Corner Shape"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.innerCornerShape}`}
                        options={CORNER_SHAPE_OPTIONS}
                        onValue={(v) => handleUpdate({ innerCornerShape: Number(v) })}
                        disabled={node.in.innerCornerShape !== null}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"markerShape"} type={"shape"}>
                    Markers
                </SocketIn>
                <SocketIn node={node} socketId={"markerAlign"} type={"boolean"}>
                    <CheckBox checked={node.payload.markerAlign} onToggle={(markerAlign) => handleUpdate({ markerAlign })} disabled={node.in.markerAlign !== null}>
                        Align Markers
                    </CheckBox>
                </SocketIn>
            </NodeAccordion>
            <Stylings.Controls node={node} handleUpdate={handleUpdate} fill join accordion />
            <Transforms.Controls node={node} handleUpdate={handleUpdate} accordion />
        </TypicalNode>
    );
};

const GEOMETRY_INPUTS: (keyof StarDefinition["inputs"])[] = [
    "pointCount", "pointDistro", "radius", "spread", "innerRadius", "outerRadius", "spanMode", "spreadAlign",
    "rScribe", "iScribe", "oScribe",
    "outerCornerRadius", "outerCornerShape", "innerCornerRadius", "innerCornerShape",
    "markerShape", "markerAlign",
    "positionMode", "positionX", "positionY", "positionRadius", "positionTheta", "rotation",
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
const buildStarPath = (vertices: (readonly [number, number])[], outerCornerR: number, outerCornerShape: number, innerCornerR: number, innerCornerShape: number): string => {
    const N = vertices.length; // 2 * pointCount

    if (outerCornerR <= 0 && innerCornerR <= 0) {
        return `M ${vertices[0][0]},${vertices[0][1]} ${vertices
            .slice(1)
            .map(([x, y]) => `L ${x},${y}`)
            .join(" ")} Z`;
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
    for (let i = 0; i < N; i++) {
        const r = clampedR[i];
        const cornerShape = i % 2 === 0 ? outerCornerShape : innerCornerShape;

        if (r <= 0) {
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
            default: // Bevel
                parts.push(`L ${lpX},${lpY}`);
                break;
        }
    }
    parts.push("Z");
    return parts.join(" ");
};

const evaluate = (node: NodeDefinitions.NodeFor<StarDefinition>, socket: keyof StarDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output" || socket === "path") {
        const pointCount = NumericString.Emptyable.asNumber(context.resolve<"integer">(node.id, "pointCount")?.data ?? node.payload.pointCount) ?? null;
        if (pointCount === null) return null;

        const N = pointCount;
        const spanMode = Enum.resolve(context.resolve<"enum">(node.id, "spanMode")?.data, Enum.Common.spanMode) ?? node.payload.spanMode ?? 0;

        let tI: number;
        let tO: number;

        if (spanMode === Enum.Common.spanMode.INNER_OUTER.value) {
            const innerRadius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "innerRadius")?.data ?? node.payload.innerRadius, "0px")) ?? 0;
            const outerRadius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "outerRadius")?.data ?? node.payload.outerRadius, "0px")) ?? 0;
            if (!outerRadius) return null;

            const iScribeMode = Enum.keyOf(Enum.Common.scribeMode, context.resolve<"enum">(node.id, "iScribe")?.data ?? node.payload.iScribe ?? Enum.Common.scribeMode.INSCRIBE.value);
            const oScribeMode = Enum.keyOf(Enum.Common.scribeMode, context.resolve<"enum">(node.id, "oScribe")?.data ?? node.payload.oScribe ?? Enum.Common.scribeMode.INSCRIBE.value);

            tI = getTrueRadius(innerRadius, iScribeMode, N);
            tO = getTrueRadius(outerRadius, oScribeMode, N);
        } else {
            // Spread mode
            const radius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "radius")?.data ?? node.payload.radius, "0px")) ?? 0;
            const spread = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "spread")?.data ?? node.payload.spread, "0px")) ?? 0;
            if (!radius || !spread) return null;

            const rScribeMode = Enum.keyOf(Enum.Common.scribeMode, context.resolve<"enum">(node.id, "rScribe")?.data ?? node.payload.rScribe ?? Enum.Common.scribeMode.INSCRIBE.value);
            const spreadAlign = Enum.resolve(context.resolve<"enum">(node.id, "spreadAlign")?.data, Enum.Common.spreadAlign) ?? node.payload.spreadAlign ?? 0;

            const base = getTrueRadius(radius, rScribeMode, N);

            const tIMod = spreadAlign === Enum.Common.spreadAlign.CENTER.value ? spread / 2 : spreadAlign === Enum.Common.spreadAlign.INWARD.value ? spread : 0;
            const tOMod = spreadAlign === Enum.Common.spreadAlign.CENTER.value ? spread / 2 : spreadAlign === Enum.Common.spreadAlign.OUTWARD.value ? spread : 0;

            tI = base - tIMod;
            tO = base + tOMod;
        }

        if (tO <= 0) return null;
        tI = Math.max(0, tI);

        // Corner parameters
        const outerCornerR = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "outerCornerRadius")?.data ?? node.payload.outerCornerRadius, "0px")) ?? 0;
        const outerCornerShape = Enum.resolve(context.resolve<"enum">(node.id, "outerCornerShape")?.data, Enum.Common.cornerShape) ?? node.payload.outerCornerShape ?? 0;
        const innerCornerR = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "innerCornerRadius")?.data ?? node.payload.innerCornerRadius, "0px")) ?? 0;
        const innerCornerShape = Enum.resolve(context.resolve<"enum">(node.id, "innerCornerShape")?.data, Enum.Common.cornerShape) ?? node.payload.innerCornerShape ?? 0;

        // Markers
        const markerShape = context.resolve<"shape">(node.id, "markerShape")?.data;
        const markerAlign = context.resolve<"boolean">(node.id, "markerAlign")?.data ?? node.payload.markerAlign ?? false;

        // Distribution
        const distro = context.resolve<"distribution">(node.id, "pointDistro")?.data ?? { func: Enum.Common.distroFunctions.LINEAR.value, easing: Enum.Common.distroEasing.IN.value, intensity: "1" };
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

        const d = buildStarPath(vertices, outerCornerR, outerCornerShape, innerCornerR, innerCornerShape);
        const [transforms, { translateX, translateY }] = Transforms.evaluate(node, context);

        if (socket === "path") {
            return {
                kind: "path",
                data: { d, transform: transforms.join(" "), preview: { x: -tO + translateX, y: -tO + translateY, w: 2 * tO, h: 2 * tO } },
            };
        }

        return {
            kind: "shape",
            data: {
                type: "path",
                d,
                paint: Stylings.evaluate(node, context),
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

const SOCKETTYPES_IN: { [key in keyof Required<StarDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    pointCount: { types: ["integer"], mode: "or" },
    radius: { types: ["length"], mode: "or" },
    spread: { types: ["length"], mode: "or" },
    innerRadius: { types: ["length"], mode: "or" },
    outerRadius: { types: ["length"], mode: "or" },
    spanMode: { types: ["enum"], mode: "or" },
    spreadAlign: { types: ["enum"], mode: "or" },
    rScribe: { types: ["enum"], mode: "or" },
    iScribe: { types: ["enum"], mode: "or" },
    oScribe: { types: ["enum"], mode: "or" },
    pointDistro: { types: ["distribution"], mode: "or" },
    outerCornerRadius: { types: ["length"], mode: "or" },
    outerCornerShape: { types: ["enum"], mode: "or" },
    innerCornerRadius: { types: ["length"], mode: "or" },
    innerCornerShape: { types: ["enum"], mode: "or" },
    markerShape: { types: ["shape"], mode: "or" },
    markerAlign: { types: ["boolean"], mode: "or" },
    ...Stylings.IN_SOCKET_TYPES,
    ...Transforms.IN_SOCKET_TYPES,
};

const SOCKETTYPES_OUT: { [key in keyof Required<StarDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["shape"], mode: "and" },
    path: { types: ["path"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<StarDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const StarNodeType: NodeTypes.Type<"star", StarDefinition> = {
    type: "star",
    displayName: "Star",
    defaultLabel: "Star",
    iconNode: <Icon shape={NODE_ICONS.starShape.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.starShape.Card} color={"var(--icon-flavour)"} />,
    category: "Shapes",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
