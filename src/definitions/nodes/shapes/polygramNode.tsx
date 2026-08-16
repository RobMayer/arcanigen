import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback, useEffect } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { NumericString } from "../../datatypes/numericString";
import { deg2rad, delerp, distroInterpolator, gcd, getDerivedRadius, getTrueRadius, lerp, range } from "../../../util/misc";
import { StylingPrefab } from "../../helpers/stylingPrefab";
import { TransformPrefab } from "../../helpers/transformPrefab";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { PaperHelper } from "../../../util/paperHelper";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: {
        pointCount: "integer",
        skipCount: "integer",
        radius: "length",
        rScribe: "enum",
        pointDistro: "distribution",
        cornerRadius: "length",
        cornerShape: "enum",
        markerShape: "shape",
        markerAlign: "boolean",
        removeCrossings: "boolean",
        ...TransformPrefab.SIG_IN,
        ...StylingPrefab.SIG_IN,
        ...StylingPrefab.SIG_FILL,
        ...StylingPrefab.SIG_JOIN,
    },
    out: { output: "shape", path: "path", eCircumradius: "length", eApothem: "length" },
});

export type PolygramDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        pointCount: DataTypes.TypeOf<DataTypes.Integer>;
        skipCount: DataTypes.TypeOf<DataTypes.Integer>;
        rScribe: DataTypes.TypeOf<DataTypes.Enum>;
        radius: DataTypes.TypeOf<DataTypes.Length>;
        cornerRadius: DataTypes.TypeOf<DataTypes.Length>;
        cornerShape: DataTypes.TypeOf<DataTypes.Enum>;
        markerAlign: DataTypes.TypeOf<DataTypes.Boolean>;
        removeCrossings: DataTypes.TypeOf<DataTypes.Boolean>;
    } & StylingPrefab.Definition["payload"] &
        TransformPrefab.Definition["payload"]
>;

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
            removeCrossings: null,

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
            eCircumradius: [],
            eApothem: [],
        },
        payload: {
            label: "",
            pointCount: "3",
            skipCount: "1",
            rScribe: Enum.Common.scribeMode.INSCRIBE.value,
            radius: "100px",
            cornerRadius: "0px",
            cornerShape: 0,

            markerAlign: false,
            removeCrossings: false,
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
            <SocketIn node={node} socketId={"skipCount"} label={"Skip"}>
                <IntegerInput.SliderInput
                    value={node.payload.skipCount}
                    onCommit={(skipCount) => handleUpdate({ skipCount })}
                    disabled={node.in.skipCount !== null || theMax === "0"}
                    min={"0"}
                    max={theMax}
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
            <NodeAccordion label={"More"} socketsIn={"cornerRadius|cornerShape|pointDistro|markerShape|markerAlign|removeCrossings"} nodeId={node.id}>
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
                <SocketIn node={node} socketId={"removeCrossings"}>
                    <CheckBox checked={node.payload.removeCrossings} onToggle={(removeCrossings) => handleUpdate({ removeCrossings })} disabled={node.in.removeCrossings !== null}>
                        Remove Crossings
                    </CheckBox>
                </SocketIn>
            </NodeAccordion>
            <StylingPrefab.Controls node={node} handleUpdate={handleUpdate} fill join accordion />
            <TransformPrefab.Controls node={node} handleUpdate={handleUpdate} accordion />
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

const GEOMETRY_INPUTS: (keyof PolygramDefinition["inputs"])[] = [
    "pointCount",
    "skipCount",
    "pointDistro",
    "radius",
    "rScribe",
    "cornerRadius",
    "cornerShape",
    "markerShape",
    "markerAlign",
    "removeCrossings",
    "position",
    "rotation",
];
const STYLING_INPUTS: (keyof PolygramDefinition["inputs"])[] = ["strokeWidth", "strokeColor", "strokeCap", "strokeJoin", "strokeDash", "strokeDashOffset", "fillColor", "paintOrder", "opacity"];

const dependsOn = (_node: NodeDefinitions.NodeFor<PolygramDefinition>, outSocket: keyof PolygramDefinition["outputs"], _deps: AllDeps): (keyof PolygramDefinition["inputs"])[] => {
    if (outSocket === "output") {
        return [...GEOMETRY_INPUTS, ...STYLING_INPUTS];
    }
    if (outSocket === "path") {
        return GEOMETRY_INPUTS;
    }
    if (outSocket === "eCircumradius" || outSocket === "eApothem") {
        return ["pointCount", "skipCount", "radius", "rScribe"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PolygramDefinition>, inSocket: keyof PolygramDefinition["inputs"], _deps: AllDeps): (keyof PolygramDefinition["outputs"])[] => {
    if (inSocket === "pointCount" || inSocket === "skipCount" || inSocket === "radius" || inSocket === "rScribe") {
        return ["output", "path", "eCircumradius", "eApothem"];
    }
    if (STYLING_INPUTS.includes(inSocket)) {
        return ["output"];
    }
    return ["output", "path"];
};

const evaluate = (node: NodeDefinitions.NodeFor<PolygramDefinition>, socket: keyof PolygramDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output" || socket === "path") {
        const radius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "radius")?.data ?? node.payload.radius, "0px")) ?? null;
        const pointCount = Math.round(Math.max(3, Math.min(64, NumericString.Emptyable.asNumber(context.resolve<DataTypes.Integer>(node.id, "pointCount")?.data ?? node.payload.pointCount) ?? NaN)));
        if (radius === null || !isFinite(pointCount)) {
            return null;
        }

        const markerShape = context.resolve<DataTypes.Shape>(node.id, "markerShape")?.data;
        const markerAlign = context.resolve<DataTypes.Boolean>(node.id, "markerAlign")?.data ?? node.payload.markerAlign ?? false;

        const distro = context.resolve<DataTypes.Distribution>(node.id, "pointDistro")?.data ?? { func: Enum.Common.distroFunctions.LINEAR.value, easing: Enum.Common.distroEasing.IN.value, intensity: "1" };

        const distroLerper = distroInterpolator(
            Enum.keyOf(Enum.Common.distroFunctions, distro.func),
            Enum.keyOf(Enum.Common.distroEasing, distro.easing),
            NumericString.Emptyable.asNumber(distro.intensity) ?? 1,
        );

        const scribeMode = Enum.keyOf(Enum.Common.scribeMode, context.resolve<DataTypes.Enum>(node.id, "rScribe")?.data ?? node.payload.rScribe ?? Enum.Common.scribeMode.INSCRIBE.value);

        const trueRadius = getTrueRadius(radius, scribeMode, pointCount);
        const N = pointCount;
        const vertices = range(N).map((_, i) => {
            const coeff = lerp(delerp(i, 0, N), 0, 360, distroLerper);
            const angle = deg2rad(coeff - 90);
            return [trueRadius * Math.cos(angle), trueRadius * Math.sin(angle)] as const;
        });

        const cornerR = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "cornerRadius")?.data ?? node.payload.cornerRadius, "0px")) ?? 0;
        const cornerShape = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "cornerShape")?.data, Enum.Common.cornerShape) ?? node.payload.cornerShape ?? 0;

        const tempSkipCount = Math.round(Math.max(0, NumericString.Emptyable.asNumber(context.resolve<DataTypes.Integer>(node.id, "skipCount")?.data ?? node.payload.skipCount) ?? 0));
        const skipCount = Math.min(tempSkipCount, Math.ceil(pointCount / 2) - 2);
        const step = skipCount + 1;

        // GCD determines number of separate cycles
        const g = gcd(N, step);
        const cycleLen = N / g;

        const subpaths: string[] = [];
        let hasCut = false;

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
                    let firstApX = 0,
                        firstApY = 0;
                    let cycleCut = false;
                    for (let i = 0; i < cN; i++) {
                        const { ax, ay, bx, by, lenA, lenB, halfAlpha } = vertexData[i];
                        const curr = cycleVerts[i];
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
                                // Notch
                                const nX = apX + (bx / lenB) * t;
                                const nY = apY + (by / lenB) * t;
                                parts.push(`L ${nX},${nY} L ${lpX},${lpY}`);
                                break;
                            }
                            case 4: // Cut
                                parts.push(`M ${lpX},${lpY}`);
                                cycleCut = true;
                                break;
                            default: // Bevel
                                parts.push(`L ${lpX},${lpY}`);
                                break;
                        }
                    }
                    if (cycleCut) {
                        parts.push(`L ${firstApX},${firstApY}`);
                        hasCut = true;
                    } else {
                        parts.push("Z");
                    }
                    subpaths.push(parts.join(" "));
                }
            }
        }

        let d = subpaths.join(" ");
        const removeCrossings = context.resolve<DataTypes.Boolean>(node.id, "removeCrossings")?.data ?? node.payload.removeCrossings;
        if (removeCrossings) {
            d = PaperHelper.healD(d) ?? d;
        }
        const [transforms] = TransformPrefab.evaluate(node, context);

        if (socket === "path") {
            return {
                kind: "path",
                data: { d, transform: transforms.join(" ") },
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
            },
        };
    }

    const [radius, unit] = Length.Emptyable.parse(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "radius")?.data ?? node.payload.radius, "0px")) ?? [null, null];
    const pointCount = NumericString.Emptyable.asNumber(context.resolve<DataTypes.Integer>(node.id, "pointCount")?.data ?? node.payload.pointCount);
    if (radius === null || unit == null || pointCount === null) {
        return null;
    }

    const scribeMode = Enum.keyOf(Enum.Common.scribeMode, context.resolve<DataTypes.Enum>(node.id, "rScribe")?.data ?? node.payload.rScribe ?? Enum.Common.scribeMode.INSCRIBE.value);
    const currentRadius = getTrueRadius(radius, scribeMode, pointCount);
    const tempSkipCount = Math.round(Math.max(0, NumericString.Emptyable.asNumber(context.resolve<DataTypes.Integer>(node.id, "skipCount")?.data ?? node.payload.skipCount) ?? 0));
    const step = Math.min(tempSkipCount, Math.ceil(pointCount / 2) - 2) + 1;

    if (socket === "eCircumradius") {
        const outputRadius = getDerivedRadius(currentRadius, "CIRCUMSCRIBE", pointCount);
        return { kind: "length", data: `${outputRadius}${unit}` };
    }
    if (socket === "eApothem") {
        const outputRadius = currentRadius * Math.cos((Math.PI * step) / pointCount);
        return { kind: "length", data: `${outputRadius}${unit}` };
    }

    return null;
};

export const PolygramNodeType: NodeTypes.Type<"polygram", PolygramDefinition> = {
    type: "polygram",
    displayName: "Polygram",
    defaultLabel: "Polygram",
    iconNode: <NodeIcon shape={NODE_ICONS.shapePolygram} />,
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
