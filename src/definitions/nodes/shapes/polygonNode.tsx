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
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { NumericString } from "../../datatypes/numericString";
import { deg2rad, delerp, distroInterpolator, getDerivedRadius, getTrueRadius, lerp, range } from "../../../util/misc";
import { Stylings, Transforms } from "./abstract";
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
            eCircumradius: [],
            eApothem: [],
        },
        payload: {
            label: "",
            pointCount: "3",
            rScribe: Enum.Common.scribeMode.Inscribe,
            radius: "100px",
            cornerRadius: "0px",
            cornerShape: 0,

            markerAlign: false,
            // stroke
            strokeWidth: "1px",
            strokeDash: "",
            strokeColor: { r: 0, g: 0, b: 0, a: 1 },
            strokeDashOffset: "0px",
            strokeCap: Enum.Common.strokeCap.Butt,
            strokeJoin: Enum.Common.strokeJoin.Miter,
            // fill
            fillColor: null,
            paintOrder: 0,
            // transforms
            positionMode: Enum.Common.positionMode.Cartesian,
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

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"shape"}>
                Output
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
            <SocketIn node={node} socketId={"radius"} type={"length"} label={"Radius"}>
                <LengthInput value={node.payload.radius} onCommit={(radius) => handleUpdate({ radius })} disabled={node.in.radius !== null} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"rScribe"} type={"enum"} label={"Scribe Mode"}>
                <RadioButton.Group
                    orientation={"vertical"}
                    value={`${node.payload.rScribe}`}
                    onValue={(v) => handleUpdate({ rScribe: Number(v) })}
                    disabled={node.in.rScribe !== null}
                    options={SCRIBE_MODE_OPTIONS}
                />
            </SocketIn>
            <NodeAccordion label={"More"} socketsIn={"cornerRadius|cornerShape|pointDistro|markerShape|markerAlign"} nodeId={node.id}>
                <SocketIn node={node} socketId={"pointDistro"} type={"distribution"}>
                    Angular Distribution
                </SocketIn>
                <SocketIn node={node} socketId={"cornerRadius"} type={"length"} label={"Corner Radius"}>
                    <LengthInput value={node.payload.cornerRadius} onCommit={(cornerRadius) => handleUpdate({ cornerRadius })} disabled={node.in.cornerRadius !== null} min={"0px"} required />
                </SocketIn>
                <SocketIn node={node} socketId={"cornerShape"} type={"enum"} label={"Corner Shape"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.cornerShape}`}
                        options={CORNER_SHAPE_OPTIONS}
                        onValue={(v) => handleUpdate({ cornerShape: Number(v) })}
                        disabled={node.in.cornerShape !== null}
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
            <NodeAccordion nodeId={node.id} label={"Additional Outputs"} socketsOut={"eCircumradius|eApothem"}>
                <SocketOut node={node} socketId={"eCircumradius"} type={"length"}>
                    Circumradius
                </SocketOut>
                <SocketOut node={node} socketId={"eApothem"} type={"length"}>
                    Apothem
                </SocketOut>
            </NodeAccordion>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<PolygonDefinition>, outSocket: keyof PolygonDefinition["outputs"], _deps: AllDeps): (keyof PolygonDefinition["inputs"])[] => {
    if (outSocket === "output") {
        // output shape depends on all inputs
        return [
            "pointCount",
            "pointDistro",
            "radius",
            "rScribe",
            "cornerRadius",
            "cornerShape",
            "markerShape",
            "markerAlign",
            "strokeWidth",
            "strokeColor",
            "strokeCap",
            "strokeJoin",
            "strokeDash",
            "strokeDashOffset",
            "fillColor",
            "paintOrder",
            "positionMode",
            "positionX",
            "positionY",
            "positionRadius",
            "positionTheta",
            "rotation",
        ];
    }
    if (outSocket === "eCircumradius" || outSocket === "eApothem") {
        return ["pointCount", "radius", "rScribe"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PolygonDefinition>, inSocket: keyof PolygonDefinition["inputs"], _deps: AllDeps): (keyof PolygonDefinition["outputs"])[] => {
    if (inSocket === "pointCount") {
        return ["output", "eCircumradius", "eApothem"];
    }
    if (inSocket === "radius") {
        return ["output", "eCircumradius", "eApothem"];
    }
    if (inSocket === "rScribe") {
        return ["output", "eCircumradius", "eApothem"];
    }
    if (inSocket === "cornerRadius" || inSocket === "cornerShape") {
        return ["output"];
    }
    // all other inputs only affect the shape output
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<PolygonDefinition>, socket: keyof PolygonDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const radius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "radius")?.data ?? node.payload.radius, "0px")) ?? null;
        const pointCount = NumericString.Emptyable.asNumber(context.resolve<"integer">(node.id, "pointCount")?.data ?? node.payload.pointCount) ?? null;
        if (radius === null || pointCount === null) {
            return null;
        }

        const markerShape = context.resolve<"shape">(node.id, "markerShape")?.data;
        const markerAlign = context.resolve<"boolean">(node.id, "markerAlign")?.data ?? node.payload.markerAlign ?? false;

        const distro = context.resolve<"distribution">(node.id, "pointDistro")?.data ?? { func: Enum.Common.distroFunctions.Linear, easing: Enum.Common.distroEasing.In, intensity: "1" };

        const distroLerper = distroInterpolator(
            Enum.keyOf(Enum.Common.distroFunctions, distro.func),
            Enum.keyOf(Enum.Common.distroEasing, distro.easing),
            NumericString.Emptyable.asNumber(distro.intensity) ?? 1,
        );

        const scribeMode = Enum.keyOf(Enum.Common.scribeMode, context.resolve<"enum">(node.id, "rScribe")?.data ?? node.payload.rScribe ?? Enum.Common.scribeMode.Inscribe);

        const trueRadius = getTrueRadius(radius, scribeMode, pointCount);
        const N = pointCount;
        const vertices = range(N).map((_, i) => {
            const coeff = lerp(delerp(i, 0, N), 0, 360, distroLerper);
            const angle = deg2rad(coeff - 90);
            return [trueRadius * Math.cos(angle), trueRadius * Math.sin(angle)] as const;
        });

        const cornerR = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "cornerRadius")?.data ?? node.payload.cornerRadius, "0px")) ?? 0;
        const cornerShape = context.resolve<"enum">(node.id, "cornerShape")?.data ?? node.payload.cornerShape ?? 0;

        let d: string;
        if (cornerR <= 0) {
            d = `M ${vertices[0][0]},${vertices[0][1]} ${vertices
                .slice(1)
                .map(([x, y]) => `L ${x},${y}`)
                .join(" ")} Z`;
        } else {
            // Compute edge lengths
            const edgeLengths = vertices.map((v, i) => {
                const next = vertices[(i + 1) % N];
                return Math.hypot(next[0] - v[0], next[1] - v[1]);
            });

            // Per-vertex: vectors to prev/next, half interior angle
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

            // Global clamp: find max R such that all tangent distances fit within half-edges
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
                for (let i = 0; i < N; i++) {
                    const { ax, ay, bx, by, lenA, lenB, halfAlpha } = vertexData[i];
                    const curr = vertices[i];
                    const t = r / Math.tan(halfAlpha);

                    // Approach point (r back along incoming edge)
                    const apX = curr[0] + (ax / lenA) * t;
                    const apY = curr[1] + (ay / lenA) * t;
                    // Leave point (r forward along outgoing edge)
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
                d = parts.join(" ");
            }
        }

        const attributes: Record<string, string | undefined> = {
            d,
            ...Stylings.evaluate(node, context),
            markerMid: markerShape ? `url('#marker_${node.id}')` : undefined,
            markerEnd: markerShape ? `url('#marker_${node.id}')` : undefined,
        };

        const [transforms, { translateX, translateY }] = Transforms.evaluate(node, context);

        return {
            kind: "shape",
            data: {
                tag: "path",
                attributes,
                transform: transforms.join(" "),
                children: [],
                definitions: [
                    markerShape
                        ? {
                              tag: "marker",
                              attributes: {
                                  id: `marker_${node.id}`,
                                  markerUnits: "userSpaceOnUse",
                                  markerWidth: "100%",
                                  markerHeight: "100%",
                                  overflow: "visible",
                                  orient: markerAlign ? "auto-start-reverse" : undefined,
                              },
                              children: [markerShape],
                          }
                        : null,
                ],
                preview: { x: -trueRadius + translateX, y: -trueRadius + translateY, w: 2 * trueRadius, h: 2 * trueRadius },
            },
        };
    }

    const [radius, unit] = Length.Emptyable.parse(Length.Emptyable.max(context.resolve<"length">(node.id, "radius")?.data ?? node.payload.radius, "0px")) ?? [null, null];
    const pointCount = NumericString.Emptyable.asNumber(context.resolve<"integer">(node.id, "pointCount")?.data ?? node.payload.pointCount);
    if (radius === null || unit == null || pointCount === null) {
        return null;
    }

    const scribeMode = Enum.keyOf(Enum.Common.scribeMode, context.resolve<"enum">(node.id, "rScribe")?.data ?? node.payload.rScribe ?? Enum.Common.scribeMode.Inscribe);
    const currentRadius = getTrueRadius(radius, scribeMode, pointCount);

    if (socket === "eCircumradius") {
        const outputRadius = getDerivedRadius(currentRadius, "Circumscribe", pointCount);
        return { kind: "length", data: `${outputRadius}${unit}` };
    }
    if (socket === "eApothem") {
        const outputRadius = getDerivedRadius(currentRadius, "Inscribe", pointCount);
        return { kind: "length", data: `${outputRadius}${unit}` };
    }

    return null;
};

const POLYGON_SOCKET_TYPES: Record<string, string> = {
    pointCount: "integer",
    radius: "length",
    rScribe: "enum",
    pointDistro: "distribution",
    cornerRadius: "length",
    cornerShape: "enum",
    markerShape: "shape",
    markerAlign: "boolean",
    strokeWidth: "length",
    strokeColor: "color",
    strokeCap: "enum",
    strokeJoin: "enum",
    strokeDash: "tokens<length>",
    strokeDashOffset: "length",
    fillColor: "color",
    paintOrder: "enum",
    positionMode: "enum",
    positionX: "length",
    positionY: "length",
    positionRadius: "length",
    positionTheta: "angle",
    rotation: "angle",
    output: "shape",
    eCircumradius: "length",
    eApothem: "length",
};

const getSocketType = (_node: NodeDefinitions.NodeFor<PolygonDefinition>, socketId: string, _side: "in" | "out"): string => POLYGON_SOCKET_TYPES[socketId] ?? "float";

export const PolygonNodeType: NodeTypes.Type<"polygon", PolygonDefinition> = {
    type: "polygon",
    displayName: "Polygon",
    defaultLabel: "Polygon",
    iconNode: <Icon shape={NODE_ICONS.polygonShape.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.polygonShape.Card} color={"var(--icon-flavour)"} />,
    category: "Shapes",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
