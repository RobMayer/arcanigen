import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback, useEffect } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { NumericString } from "../../datatypes/numericString";
import { deg2rad, delerp, distroInterpolator, gcd, getDerivedRadius, getTrueRadius, lerp, range } from "../../../util/misc";
import { Stylings, Transforms } from "./abstract";
import { CheckBox } from "../../../components/buttons/CheckBox";

export type PolygramDefinition = {
    inputs: {
        pointCount: DataTypes.Use<"integer">;
        skipCount: DataTypes.Use<"integer">;
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
        rInscribe: DataTypes.Use<"length">;
        rCircumscribe: DataTypes.Use<"length">;
        rMiddle: DataTypes.Use<"length">;

        ePoints: DataTypes.Use<"length">;
        eMiddle: DataTypes.Use<"length">;
        eApothem: DataTypes.Use<"length">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        pointCount: DataTypes.TypeOf<DataTypes.Use<"integer">>;
        skipCount: DataTypes.TypeOf<DataTypes.Use<"integer">>;
        rScribe: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        radius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        cornerRadius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        cornerShape: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        markerAlign: DataTypes.TypeOf<DataTypes.Use<"boolean">>;
    } & Stylings.Definition["payload"] &
        Transforms.Definition["payload"];
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<PolygramDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"polygram", PolygramDefinition> => {
    return {
        id,
        in: {
            pointCount: null,
            skipCount: null,
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
            rInscribe: [],
            rCircumscribe: [],
            rMiddle: [],
            eApothem: [],
            ePoints: [],
            eMiddle: [],
        },
        payload: {
            label: "",
            pointCount: "3",
            skipCount: "1",
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
        type: "polygram",
    };
};

const SCRIBE_MODE_OPTIONS = Enum.options(Enum.Common.scribeMode);
const CORNER_SHAPE_OPTIONS = Enum.options(Enum.Common.cornerShape);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PolygramDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PolygramDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const theMax: NumericString.Type = `${Math.ceil((NumericString.Emptyable.asNumber(node.payload.pointCount) ?? 3) / 2) - 2}`;

    useEffect(() => {
        const p = NumericString.Emptyable.asNumber(node.payload.skipCount) ?? 0;
        const n = Math.ceil((NumericString.Emptyable.asNumber(node.payload.pointCount) ?? 3) / 2) - 2;
        if (n <= 0) {
            handleUpdate({ skipCount: "0" });
        }
        if (p > n) {
            handleUpdate({ skipCount: `${n}` });
        }
    }, [node.payload.pointCount, handleUpdate, node.payload.skipCount]);

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
            <SocketIn node={node} socketId={"skipCount"} type={"integer"} label={"Skip"}>
                <IntegerInput.SliderInput
                    value={node.payload.skipCount}
                    onCommit={(skipCount) => handleUpdate({ skipCount })}
                    disabled={node.in.skipCount !== null || theMax === "0"}
                    min={"0"}
                    max={theMax}
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
            <NodeAccordion nodeId={node.id} label={"Additional Outputs"} socketsOut={"rInscribe|rCircumscribe|rMiddle|ePoints|eMiddle|eApothem"}>
                <SocketOut node={node} socketId={"rInscribe"} type={"length"}>
                    Inscribe Radius
                </SocketOut>
                <SocketOut node={node} socketId={"rMiddle"} type={"length"}>
                    Middle Radius
                </SocketOut>
                <SocketOut node={node} socketId={"rCircumscribe"} type={"length"}>
                    Circumscribe Radius
                </SocketOut>
                <hr />
                <SocketOut node={node} socketId={"ePoints"} type={"length"}>
                    Point Radius
                </SocketOut>
                <SocketOut node={node} socketId={"eMiddle"} type={"length"}>
                    Middle Effective
                </SocketOut>
                <SocketOut node={node} socketId={"eApothem"} type={"length"}>
                    Apothem
                </SocketOut>
            </NodeAccordion>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<PolygramDefinition>, outSocket: keyof PolygramDefinition["outputs"], _deps: AllDeps): (keyof PolygramDefinition["inputs"])[] => {
    if (outSocket === "output") {
        // output shape depends on all inputs
        return [
            "pointCount",
            "skipCount",
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
    if (outSocket === "rInscribe" || outSocket === "rCircumscribe" || outSocket === "rMiddle") {
        // radius outputs depend on pointCount and radius only
        return ["pointCount", "radius"];
    }
    if (outSocket === "ePoints" || outSocket === "eApothem" || outSocket === "eMiddle") {
        // effective radius outputs depend on pointCount, skipCount, radius, and rScribe
        return ["pointCount", "skipCount", "radius", "rScribe"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PolygramDefinition>, inSocket: keyof PolygramDefinition["inputs"], _deps: AllDeps): (keyof PolygramDefinition["outputs"])[] => {
    if (inSocket === "pointCount") {
        return ["output", "rInscribe", "rCircumscribe", "rMiddle", "eApothem", "ePoints", "eMiddle"];
    }
    if (inSocket === "radius") {
        return ["output", "rInscribe", "rCircumscribe", "rMiddle", "eApothem", "ePoints", "eMiddle"];
    }
    if (inSocket === "rScribe") {
        return ["output", "ePoints", "eApothem", "eMiddle"];
    }
    if (inSocket === "skipCount") {
        return ["output", "ePoints", "eApothem", "eMiddle"];
    }
    if (inSocket === "cornerRadius" || inSocket === "cornerShape") {
        return ["output"];
    }
    // all other inputs only affect the shape output
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<PolygramDefinition>, socket: keyof PolygramDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
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

        const tempSkipCount = NumericString.Emptyable.asNumber(context.resolve<"integer">(node.id, "skipCount")?.data ?? node.payload.skipCount) ?? 0;
        const skipCount = Math.min(tempSkipCount, Math.ceil(pointCount / 2) - 2);
        const step = skipCount + 1;

        // GCD determines number of separate cycles
        const g = gcd(N, step);
        const cycleLen = N / g;

        const subpaths: string[] = [];

        for (let c = 0; c < g; c++) {
            const cycleVerts: (readonly [number, number])[] = [];
            for (let j = 0; j < cycleLen; j++) {
                cycleVerts.push(vertices[(c + j * step) % N]);
            }

            if (cornerR <= 0) {
                subpaths.push(
                    `M ${cycleVerts[0][0]},${cycleVerts[0][1]} ${cycleVerts
                        .slice(1)
                        .map(([x, y]) => `L ${x},${y}`)
                        .join(" ")} Z`,
                );
            } else {
                const cN = cycleVerts.length;

                const edgeLengths = cycleVerts.map((v, i) => {
                    const next = cycleVerts[(i + 1) % cN];
                    return Math.hypot(next[0] - v[0], next[1] - v[1]);
                });

                const vertexData = cycleVerts.map((curr, i) => {
                    const prev = cycleVerts[(i - 1 + cN) % cN];
                    const next = cycleVerts[(i + 1) % cN];
                    const ax = prev[0] - curr[0],
                        ay = prev[1] - curr[1];
                    const bx = next[0] - curr[0],
                        by = next[1] - curr[1];
                    const lenA = edgeLengths[(i - 1 + cN) % cN];
                    const lenB = edgeLengths[i];
                    const cosAlpha = Math.max(-1, Math.min(1, (ax * bx + ay * by) / (lenA * lenB)));
                    const halfAlpha = Math.acos(cosAlpha) / 2;
                    return { ax, ay, bx, by, lenA, lenB, halfAlpha };
                });

                let r = cornerR;
                for (let i = 0; i < cN; i++) {
                    const tanHalf = Math.tan(vertexData[i].halfAlpha);
                    if (tanHalf > 1e-10) {
                        const halfPrev = edgeLengths[(i - 1 + cN) % cN] / 2;
                        const halfNext = edgeLengths[i] / 2;
                        r = Math.min(r, Math.min(halfPrev, halfNext) * tanHalf);
                    } else {
                        r = 0;
                    }
                }

                if (r <= 0) {
                    subpaths.push(
                        `M ${cycleVerts[0][0]},${cycleVerts[0][1]} ${cycleVerts
                            .slice(1)
                            .map(([x, y]) => `L ${x},${y}`)
                            .join(" ")} Z`,
                    );
                } else {
                    const parts: string[] = [];
                    for (let i = 0; i < cN; i++) {
                        const { ax, ay, bx, by, lenA, lenB, halfAlpha } = vertexData[i];
                        const curr = cycleVerts[i];
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
                    subpaths.push(parts.join(" "));
                }
            }
        }

        const d = subpaths.join(" ");

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
                tag: "g",
                attributes: {
                    transform: transforms.join(" "),
                },
                children: [
                    !markerShape
                        ? null
                        : {
                              tag: "defs",
                              attributes: {},
                              children: [
                                  {
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
                                  },
                              ],
                          },
                    {
                        tag: "path",
                        attributes,
                        children: [],
                    },
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
    if (socket === "rInscribe") {
        const outputRadius = getTrueRadius(radius, "Inscribe", pointCount);
        return { kind: "length", data: `${outputRadius}${unit}` };
    }
    if (socket === "rCircumscribe") {
        const outputRadius = getTrueRadius(radius, "Circumscribe", pointCount);
        return { kind: "length", data: `${outputRadius}${unit}` };
    }
    if (socket === "rMiddle") {
        const outputRadius = getTrueRadius(radius, "Middle", pointCount);
        return { kind: "length", data: `${outputRadius}${unit}` };
    }

    const scribeMode = Enum.keyOf(Enum.Common.scribeMode, context.resolve<"enum">(node.id, "rScribe")?.data ?? node.payload.rScribe ?? Enum.Common.scribeMode.Inscribe);
    const currentRadius = getTrueRadius(radius, scribeMode, pointCount);
    const tempSkipCount = NumericString.Emptyable.asNumber(context.resolve<"integer">(node.id, "skipCount")?.data ?? node.payload.skipCount) ?? 0;
    const step = Math.min(tempSkipCount, Math.ceil(pointCount / 2) - 2) + 1;

    if (socket === "ePoints") {
        const outputRadius = getDerivedRadius(currentRadius, "Circumscribe", pointCount);
        return { kind: "length", data: `${outputRadius}${unit}` };
    }
    if (socket === "eApothem") {
        const outputRadius = currentRadius * Math.cos((Math.PI * step) / pointCount);
        return { kind: "length", data: `${outputRadius}${unit}` };
    }
    if (socket === "eMiddle") {
        const ePoints = getDerivedRadius(currentRadius, "Circumscribe", pointCount);
        const eApothem = currentRadius * Math.cos((Math.PI * step) / pointCount);
        const outputRadius = (ePoints + eApothem) / 2;
        return { kind: "length", data: `${outputRadius}${unit}` };
    }

    return null;
};

const POLYGON_SOCKET_TYPES: Record<string, string> = {
    pointCount: "integer",
    skipCount: "integer",
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
    rInscribe: "length",
    rCircumscribe: "length",
    rMiddle: "length",
    ePoints: "length",
    eApothem: "length",
    eMiddle: "length",
};

const getSocketType = (_node: NodeDefinitions.NodeFor<PolygramDefinition>, socketId: string, _side: "in" | "out"): string => POLYGON_SOCKET_TYPES[socketId] ?? "float";

export const PolygramNodeType: NodeTypes.Type<"polygram", PolygramDefinition> = {
    type: "polygram",
    displayName: "Polygram",
    defaultLabel: "Polygram",
    iconNode: <Icon shape={NODE_ICONS.polygramShape.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.polygramShape.Card} color={"var(--icon-flavour)"} />,
    category: "Shapes",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
