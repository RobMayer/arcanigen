import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { NumericString } from "../../datatypes/numericString";
import { deg2rad, delerp, distroInterpolator, getDerivedRadius, getTrueRadius, lerp, range } from "../../../util/misc";
import { Stylings, Transforms } from "../abstract";
import { CheckBox } from "../../../components/buttons/CheckBox";

export type PolygonDefinition = {
    inputs: {
        pointCount: DataTypes.Use<"integer">;
        radius: DataTypes.Use<"length">;
        rScribe: DataTypes.Use<"enum">;
        pointDistro: DataTypes.Use<"distribution">;
        cornerRadius: DataTypes.Use<"length">;
        cornerShape: DataTypes.Use<"enum">;
        markerShape: DataTypes.Use<"shape">;
        markerAlign: DataTypes.Use<"boolean">;
    } & Stylings.Definition["inputs"] &
        Transforms.Definition["inputs"];
    outputs: {
        output: DataTypes.Use<"shape">;
        path: DataTypes.Use<"path">;
        eCircumradius: DataTypes.Use<"length">;
        eApothem: DataTypes.Use<"length">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        pointCount: DataTypes.TypeOf<DataTypes.Use<"integer">>;
        rScribe: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        radius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        cornerRadius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        cornerShape: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        markerAlign: DataTypes.TypeOf<DataTypes.Use<"boolean">>;
    } & Stylings.Definition["payload"] &
        Transforms.Definition["payload"];
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<PolygonDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"polygon", PolygonDefinition> => {
    return {
        id,
        in: {
            pointCount: null,
            pointDistro: null,
            rScribe: null,
            radius: null,
            cornerRadius: null,
            cornerShape: null,

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
            eCircumradius: [],
            eApothem: [],
        },
        payload: {
            label: "",
            pointCount: "3",
            rScribe: Enum.Common.scribeMode.INSCRIBE.value,
            radius: "100px",
            cornerRadius: "0px",
            cornerShape: 0,

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
            positionTheta: "0",
            rotation: "0",
        },
        type: "polygon",
    };
};

const SCRIBE_MODE_OPTIONS = Enum.options(Enum.Common.scribeMode);
const CORNER_SHAPE_OPTIONS = Enum.options(Enum.Common.cornerShape);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PolygonDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PolygonDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const graphId = useGraphId();
    const previewCircumradius = Project.useCachedOutput(graphId, node, "eCircumradius");
    const previewApothem = Project.useCachedOutput(graphId, node, "eApothem");
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
            <SocketIn node={node} socketId={"radius"} label={"Radius"}>
                <LengthInput value={node.payload.radius} onCommit={(radius) => handleUpdate({ radius })} disabled={node.in.radius !== null} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"rScribe"} label={"Scribe Mode"}>
                <RadioButton.Group
                    orientation={"horizontal"}
                    value={`${node.payload.rScribe}`}
                    onValue={(v) => handleUpdate({ rScribe: Number(v) })}
                    disabled={node.in.rScribe !== null}
                    options={SCRIBE_MODE_OPTIONS}
                />
            </SocketIn>
            <NodeAccordion label={"More"} socketsIn={"cornerRadius|cornerShape|pointDistro|markerShape|markerAlign"} nodeId={node.id}>
                <SocketIn node={node} socketId={"pointDistro"}>
                    Angular Distribution
                </SocketIn>
                <SocketIn node={node} socketId={"cornerRadius"} label={"Corner Radius"}>
                    <LengthInput value={node.payload.cornerRadius} onCommit={(cornerRadius) => handleUpdate({ cornerRadius })} disabled={node.in.cornerRadius !== null} min={"0px"} required />
                </SocketIn>
                <SocketIn node={node} socketId={"cornerShape"} label={"Corner Shape"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.cornerShape}`}
                        options={CORNER_SHAPE_OPTIONS}
                        onValue={(v) => handleUpdate({ cornerShape: Number(v) })}
                        disabled={node.in.cornerShape !== null}
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
            <Stylings.Controls node={node} handleUpdate={handleUpdate} fill join accordion />
            <Transforms.Controls node={node} handleUpdate={handleUpdate} accordion />
            <NodeAccordion nodeId={node.id} label={"Additional Options"} socketsOut={"eCircumradius|eApothem"}>
                <SocketOut node={node} socketId={"eCircumradius"} label={"Circumradius"}>
                    <ValuePreview value={previewCircumradius} />
                </SocketOut>
                <SocketOut node={node} socketId={"eApothem"} label={"Apothem"}>
                    <ValuePreview value={previewApothem} />
                </SocketOut>
            </NodeAccordion>
        </TypicalNode>
    );
};

const GEOMETRY_INPUTS: (keyof PolygonDefinition["inputs"])[] = [
    "pointCount",
    "pointDistro",
    "radius",
    "rScribe",
    "cornerRadius",
    "cornerShape",
    "markerShape",
    "markerAlign",
    "positionMode",
    "positionX",
    "positionY",
    "positionRadius",
    "positionTheta",
    "rotation",
];
const STYLING_INPUTS: (keyof PolygonDefinition["inputs"])[] = ["strokeWidth", "strokeColor", "strokeCap", "strokeJoin", "strokeDash", "strokeDashOffset", "fillColor", "paintOrder"];

const dependsOn = (_node: NodeDefinitions.NodeFor<PolygonDefinition>, outSocket: keyof PolygonDefinition["outputs"], _deps: AllDeps): (keyof PolygonDefinition["inputs"])[] => {
    if (outSocket === "output") {
        return [...GEOMETRY_INPUTS, ...STYLING_INPUTS];
    }
    if (outSocket === "path") {
        return GEOMETRY_INPUTS;
    }
    if (outSocket === "eCircumradius" || outSocket === "eApothem") {
        return ["pointCount", "radius", "rScribe"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PolygonDefinition>, inSocket: keyof PolygonDefinition["inputs"], _deps: AllDeps): (keyof PolygonDefinition["outputs"])[] => {
    if (inSocket === "pointCount" || inSocket === "radius" || inSocket === "rScribe") {
        return ["output", "path", "eCircumradius", "eApothem"];
    }
    if (STYLING_INPUTS.includes(inSocket)) {
        return ["output"];
    }
    return ["output", "path"];
};

const evaluate = (node: NodeDefinitions.NodeFor<PolygonDefinition>, socket: keyof PolygonDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output" || socket === "path") {
        const radius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "radius")?.data ?? node.payload.radius, "0px")) ?? null;
        const pointCount = Math.round(Math.max(3, Math.min(64, NumericString.Emptyable.asNumber(context.resolve<"integer">(node.id, "pointCount")?.data ?? node.payload.pointCount) ?? NaN)));
        if (radius === null || !isFinite(pointCount)) {
            return null;
        }

        const distro = context.resolve<"distribution">(node.id, "pointDistro")?.data ?? { func: Enum.Common.distroFunctions.LINEAR.value, easing: Enum.Common.distroEasing.IN.value, intensity: "1" };

        const distroLerper = distroInterpolator(
            Enum.keyOf(Enum.Common.distroFunctions, distro.func),
            Enum.keyOf(Enum.Common.distroEasing, distro.easing),
            NumericString.Emptyable.asNumber(distro.intensity) ?? 1,
        );

        const scribeMode = Enum.keyOf(Enum.Common.scribeMode, context.resolve<"enum">(node.id, "rScribe")?.data ?? node.payload.rScribe ?? Enum.Common.scribeMode.INSCRIBE.value);

        const trueRadius = getTrueRadius(radius, scribeMode, pointCount);
        const N = pointCount;
        const vertices = range(N).map((_, i) => {
            const coeff = lerp(delerp(i, 0, N), 0, 360, distroLerper);
            const angle = deg2rad(coeff - 90);
            return [trueRadius * Math.cos(angle), trueRadius * Math.sin(angle)] as const;
        });

        const cornerR = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "cornerRadius")?.data ?? node.payload.cornerRadius, "0px")) ?? 0;
        const cornerShape = Enum.resolve(context.resolve<"enum">(node.id, "cornerShape")?.data, Enum.Common.cornerShape) ?? node.payload.cornerShape ?? 0;

        let d: string;
        let hasCut = false;
        if (cornerR <= 0) {
            d = `M ${vertices[0][0]},${vertices[0][1]} ${vertices
                .slice(1)
                .map(([x, y]) => `L ${x},${y}`)
                .join(" ")} Z`;
        } else {
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

            let r = cornerR;
            for (let i = 0; i < N; i++) {
                const { halfAlpha } = vertexData[i];
                const tanHalf = Math.tan(halfAlpha);
                if (tanHalf > 1e-10) {
                    const halfPrev = edgeLengths[(i - 1 + N) % N] / 2;
                    const halfNext = edgeLengths[i] / 2;
                    r = Math.min(r, Math.min(halfPrev, halfNext) * tanHalf);
                } else {
                    r = 0;
                }
            }

            if (r <= 0) {
                d = `M ${vertices[0][0]},${vertices[0][1]} ${vertices
                    .slice(1)
                    .map(([x, y]) => `L ${x},${y}`)
                    .join(" ")} Z`;
            } else {
                const parts: string[] = [];
                let firstApX = 0,
                    firstApY = 0;
                for (let i = 0; i < N; i++) {
                    const { ax, ay, bx, by, lenA, lenB, halfAlpha } = vertexData[i];
                    const curr = vertices[i];
                    const t = r / Math.tan(halfAlpha);

                    const apX = curr[0] + (ax / lenA) * t;
                    const apY = curr[1] + (ay / lenA) * t;
                    const lpX = curr[0] + (bx / lenB) * t;
                    const lpY = curr[1] + (by / lenB) * t;

                    if (i === 0) {
                        firstApX = apX;
                        firstApY = apY;
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
                d = parts.join(" ");
            }
        }

        const [transforms, { translateX, translateY }] = Transforms.evaluate(node, context);

        if (socket === "path") {
            return {
                kind: "path",
                data: { d, transform: transforms.join(" "), preview: { x: -trueRadius + translateX, y: -trueRadius + translateY, w: 2 * trueRadius, h: 2 * trueRadius } },
            };
        }

        const markerShape = context.resolve<"shape">(node.id, "markerShape")?.data;
        const markerAlign = context.resolve<"boolean">(node.id, "markerAlign")?.data ?? node.payload.markerAlign ?? false;

        const paint = Stylings.evaluate(node, context);
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
                preview: { x: -trueRadius + translateX, y: -trueRadius + translateY, w: 2 * trueRadius, h: 2 * trueRadius },
            },
        };
    }

    const [radius, unit] = Length.Emptyable.parse(Length.Emptyable.max(context.resolve<"length">(node.id, "radius")?.data ?? node.payload.radius, "0px")) ?? [null, null];
    const pointCount = NumericString.Emptyable.asNumber(context.resolve<"integer">(node.id, "pointCount")?.data ?? node.payload.pointCount);
    if (radius === null || unit == null || pointCount === null) {
        return null;
    }

    const scribeMode = Enum.keyOf(Enum.Common.scribeMode, context.resolve<"enum">(node.id, "rScribe")?.data ?? node.payload.rScribe ?? Enum.Common.scribeMode.INSCRIBE.value);
    const currentRadius = getTrueRadius(radius, scribeMode, pointCount);

    if (socket === "eCircumradius") {
        const outputRadius = getDerivedRadius(currentRadius, "CIRCUMSCRIBE", pointCount);
        return { kind: "length", data: `${outputRadius}${unit}` };
    }
    if (socket === "eApothem") {
        const outputRadius = getDerivedRadius(currentRadius, "INSCRIBE", pointCount);
        return { kind: "length", data: `${outputRadius}${unit}` };
    }

    return null;
};

const SOCKETTYPES_IN: { [key in keyof Required<PolygonDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    pointCount: { types: ["integer"], mode: "or" },
    radius: { types: ["length"], mode: "or" },
    rScribe: { types: ["enum"], mode: "or" },
    pointDistro: { types: ["distribution"], mode: "or" },
    cornerRadius: { types: ["length"], mode: "or" },
    cornerShape: { types: ["enum"], mode: "or" },
    markerShape: { types: ["shape"], mode: "or" },
    markerAlign: { types: ["boolean"], mode: "or" },
    ...Stylings.IN_SOCKET_TYPES,
    ...Transforms.IN_SOCKET_TYPES,
};

const SOCKETTYPES_OUT: { [key in keyof Required<PolygonDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["shape"], mode: "and" },
    path: { types: ["path"], mode: "and" },
    eCircumradius: { types: ["length"], mode: "and" },
    eApothem: { types: ["length"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<PolygonDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const PolygonNodeType: NodeTypes.Type<"polygon", PolygonDefinition> = {
    type: "polygon",
    displayName: "Polygon",
    defaultLabel: "Polygon",
    iconNode: <NodeIcon shape={NODE_ICONS.shapePolygon} />,
    flavour: "confirm",
    category: "Shapes",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
