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
        spread: "length",
        innerRadius: "length",
        outerRadius: "length",
        spanMode: "enum",
        spreadAlign: "enum",
        rScribe: "enum",
        iScribe: "enum",
        oScribe: "enum",
        expandMode: "enum",
        pointDistro: "distribution",
        outerCornerRadius: "length",
        outerCornerShape: "enum",
        innerCornerRadius: "length",
        innerCornerShape: "enum",
        markerShape: "shape",
        markerAlign: "boolean",
        removeCrossings: "boolean",
        ...TransformPrefab.SIG_IN,
        ...StylingPrefab.SIG_IN,
        ...StylingPrefab.SIG_FILL,
        ...StylingPrefab.SIG_JOIN,
    },
    out: {
        output: "shape",
        path: "path",
        eOuterCircumradius: "length",
        eOuterApothem: "length",
        eInnerCircumradius: "length",
        eInnerApothem: "length",
    },
});

export type KnotDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        pointCount: DataTypes.TypeOf<DataTypes.Integer>;
        skipCount: DataTypes.TypeOf<DataTypes.Integer>;
        rScribe: DataTypes.TypeOf<DataTypes.Enum>;
        iScribe: DataTypes.TypeOf<DataTypes.Enum>;
        oScribe: DataTypes.TypeOf<DataTypes.Enum>;
        radius: DataTypes.TypeOf<DataTypes.Length>;
        spread: DataTypes.TypeOf<DataTypes.Length>;
        expandMode: DataTypes.TypeOf<DataTypes.Enum>;
        innerRadius: DataTypes.TypeOf<DataTypes.Length>;
        outerRadius: DataTypes.TypeOf<DataTypes.Length>;
        spanMode: DataTypes.TypeOf<DataTypes.Enum>;
        spreadAlign: DataTypes.TypeOf<DataTypes.Enum>;
        outerCornerRadius: DataTypes.TypeOf<DataTypes.Length>;
        outerCornerShape: DataTypes.TypeOf<DataTypes.Enum>;
        innerCornerRadius: DataTypes.TypeOf<DataTypes.Length>;
        innerCornerShape: DataTypes.TypeOf<DataTypes.Enum>;
        markerAlign: DataTypes.TypeOf<DataTypes.Boolean>;
        removeCrossings: DataTypes.TypeOf<DataTypes.Boolean>;
    } & StylingPrefab.Definition["payload"] &
        TransformPrefab.Definition["payload"]
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<KnotDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"knot", KnotDefinition> => {
    return {
        id,
        in: {
            pointCount: null,
            skipCount: null,
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
            expandMode: null,

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
            eOuterCircumradius: [],
            eOuterApothem: [],
            eInnerCircumradius: [],
            eInnerApothem: [],
        },
        payload: {
            label: "",
            pointCount: "3",
            skipCount: "1",
            rScribe: Enum.Common.scribeMode.INSCRIBE.value,
            iScribe: Enum.Common.scribeMode.INSCRIBE.value,
            oScribe: Enum.Common.scribeMode.INSCRIBE.value,
            radius: "100px",

            spread: "20px",
            innerRadius: "90px",
            outerRadius: "110px",
            spanMode: 0,
            spreadAlign: 0,
            outerCornerRadius: "0px",
            outerCornerShape: 0,
            innerCornerRadius: "0px",
            innerCornerShape: 0,
            expandMode: 0,

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
            positionMode: Enum.Common.positionMode.CARTESIAN.value,
            positionX: "0px",
            positionY: "0px",
            positionRadius: "0px",
            positionTheta: "0deg",
            rotation: "0deg",
        },
        type: "knot",
    };
};

const SPAN_MODE_OPTIONS = Enum.options(Enum.Common.spanMode);
const SCRIBE_MODE_OPTIONS = Enum.options(Enum.Common.scribeMode);
const CORNER_SHAPE_OPTIONS = Enum.options(Enum.Common.cornerShape);
const EXPAND_MODE_OPTIONS = Enum.options(Enum.Common.expandMode);
const SPREAD_ALIGN_OPTIONS = Enum.options(Enum.Common.spreadAlign);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<KnotDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<KnotDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const isInOut = node.payload.spanMode === 0 && node.in.spanMode === null;
    const isSpread = node.payload.spanMode === 1 && node.in.spanMode === null;

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
    const previewOuterCircumradius = Project.useCachedOutput(graphId, node, "eOuterCircumradius");
    const previewOuterApothem = Project.useCachedOutput(graphId, node, "eOuterApothem");
    const previewInnerCircumradius = Project.useCachedOutput(graphId, node, "eInnerCircumradius");
    const previewInnerApothem = Project.useCachedOutput(graphId, node, "eInnerApothem");
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
            <hr />
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
            <hr />
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
            <SocketIn node={node} socketId={"expandMode"} label={"Expand Mode"}>
                <RadioButton.Group
                    orientation={"horizontal"}
                    value={`${node.payload.expandMode}`}
                    onValue={(v) => handleUpdate({ expandMode: Number(v) })}
                    disabled={node.in.expandMode !== null || isInOut}
                    options={EXPAND_MODE_OPTIONS}
                />
            </SocketIn>

            <NodeAccordion label={"More"} socketsIn={"outerCornerRadius|outerCornerShape|innerCornerRadius|innerCornerShape|pointDistro|markerShape|markerAlign|removeCrossings"} nodeId={node.id}>
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
                <SocketIn node={node} socketId={"removeCrossings"}>
                    <CheckBox checked={node.payload.removeCrossings} onToggle={(removeCrossings) => handleUpdate({ removeCrossings })} disabled={node.in.removeCrossings !== null}>
                        Remove Crossings
                    </CheckBox>
                </SocketIn>
            </NodeAccordion>
            <StylingPrefab.Controls node={node} handleUpdate={handleUpdate} fill join accordion />
            <TransformPrefab.Controls node={node} handleUpdate={handleUpdate} accordion />
            <NodeAccordion nodeId={node.id} label={"Additional Options"} socketsOut={"eOuterCircumradius|eOuterApothem|eInnerCircumradius|eInnerApothem"}>
                <SocketOut node={node} socketId={"eOuterCircumradius"} label={"Outer Circumradius"}>
                    <ValuePreview value={previewOuterCircumradius} />
                </SocketOut>
                <SocketOut node={node} socketId={"eOuterApothem"} label={"Outer Apothem"}>
                    <ValuePreview value={previewOuterApothem} />
                </SocketOut>
                <SocketOut node={node} socketId={"eInnerCircumradius"} label={"Inner Circumradius"}>
                    <ValuePreview value={previewInnerCircumradius} />
                </SocketOut>
                <SocketOut node={node} socketId={"eInnerApothem"} label={"Inner Apothem"}>
                    <ValuePreview value={previewInnerApothem} />
                </SocketOut>
            </NodeAccordion>
        </TypicalNode>
    );
};

const GEOMETRY_INPUTS: (keyof KnotDefinition["inputs"])[] = [
    "pointCount",
    "skipCount",
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
    "expandMode",
    "outerCornerRadius",
    "outerCornerShape",
    "innerCornerRadius",
    "innerCornerShape",
    "markerShape",
    "markerAlign",
    "removeCrossings",
    "positionMode",
    "positionX",
    "positionY",
    "positionRadius",
    "positionTheta",
    "rotation",
];
const STYLING_INPUTS: (keyof KnotDefinition["inputs"])[] = ["strokeWidth", "strokeColor", "strokeCap", "strokeJoin", "strokeDash", "strokeDashOffset", "fillColor", "paintOrder"];

const dependsOn = (_node: NodeDefinitions.NodeFor<KnotDefinition>, outSocket: keyof KnotDefinition["outputs"], _deps: AllDeps): (keyof KnotDefinition["inputs"])[] => {
    if (outSocket === "output") {
        return [...GEOMETRY_INPUTS, ...STYLING_INPUTS];
    }
    if (outSocket === "path") {
        return GEOMETRY_INPUTS;
    }
    if (outSocket === "eOuterCircumradius" || outSocket === "eOuterApothem" || outSocket === "eInnerCircumradius" || outSocket === "eInnerApothem") {
        return ["pointCount", "skipCount", "radius", "spread", "innerRadius", "outerRadius", "spanMode", "spreadAlign", "rScribe", "iScribe", "oScribe", "expandMode"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<KnotDefinition>, inSocket: keyof KnotDefinition["inputs"], _deps: AllDeps): (keyof KnotDefinition["outputs"])[] => {
    const extras: (keyof KnotDefinition["outputs"])[] = ["eOuterCircumradius", "eOuterApothem", "eInnerCircumradius", "eInnerApothem"];
    if (
        inSocket === "pointCount" ||
        inSocket === "skipCount" ||
        inSocket === "radius" ||
        inSocket === "spread" ||
        inSocket === "innerRadius" ||
        inSocket === "outerRadius" ||
        inSocket === "spanMode" ||
        inSocket === "spreadAlign" ||
        inSocket === "rScribe" ||
        inSocket === "iScribe" ||
        inSocket === "oScribe" ||
        inSocket === "expandMode"
    ) {
        return ["output", "path", ...extras];
    }
    if (STYLING_INPUTS.includes(inSocket)) {
        return ["output"];
    }
    return ["output", "path"];
};

const buildSubpath = (vertices: (readonly [number, number])[], cornerR: number, cornerShape: number, reversed: boolean): [string, boolean] => {
    const N = vertices.length;

    if (cornerR <= 0) {
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

    let r = cornerR;
    for (let i = 0; i < N; i++) {
        const tanHalf = Math.tan(vertexData[i].halfAlpha);
        if (tanHalf > 1e-10) {
            const halfPrev = edgeLengths[(i - 1 + N) % N] / 2;
            const halfNext = edgeLengths[i] / 2;
            r = Math.min(r, Math.min(halfPrev, halfNext) * tanHalf);
        } else {
            r = 0;
        }
    }

    if (r <= 0) {
        return [
            `M ${vertices[0][0]},${vertices[0][1]} ${vertices
                .slice(1)
                .map(([x, y]) => `L ${x},${y}`)
                .join(" ")} Z`,
            false,
        ];
    }

    const parts: string[] = [];
    let hasCut = false;
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
                parts.push(`A ${r},${r} 0 ${reversed ? "0,0" : "0,1"} ${lpX},${lpY}`);
                break;
            case 2: // Scoop
                parts.push(`A ${r},${r} 0 ${reversed ? "0,1" : "0,0"} ${lpX},${lpY}`);
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

/** Collect star-pattern vertices for a given radius using GCD-based cycles */
const collectStarVertices = (allVertices: (readonly [number, number])[], N: number, step: number): (readonly [number, number])[][] => {
    const g = gcd(N, step);
    const cycleLen = N / g;
    const cycles: (readonly [number, number])[][] = [];
    for (let c = 0; c < g; c++) {
        const cycleVerts: (readonly [number, number])[] = [];
        for (let j = 0; j < cycleLen; j++) {
            cycleVerts.push(allVertices[(c + j * step) % N]);
        }
        cycles.push(cycleVerts);
    }
    return cycles;
};

const evaluate = (node: NodeDefinitions.NodeFor<KnotDefinition>, socket: keyof KnotDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output" || socket === "path") {
        const pointCount = Math.round(Math.max(3, Math.min(64, NumericString.Emptyable.asNumber(context.resolve<DataTypes.Integer>(node.id, "pointCount")?.data ?? node.payload.pointCount) ?? NaN)));
        if (!isFinite(pointCount)) return null;

        const N = pointCount;
        const spanMode = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "spanMode")?.data, Enum.Common.spanMode) ?? node.payload.spanMode ?? 0;
        const expandMode = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "expandMode")?.data, Enum.Common.expandMode) ?? node.payload.expandMode ?? 0;

        let tI: number;
        let tO: number;

        if (spanMode === Enum.Common.spanMode.INNER_OUTER.value) {
            const innerRadius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "innerRadius")?.data ?? node.payload.innerRadius, "0px")) ?? 0;
            const outerRadius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "outerRadius")?.data ?? node.payload.outerRadius, "0px")) ?? 0;
            if (!innerRadius || !outerRadius) return null;

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
            const theSpread = expandMode === Enum.Common.expandMode.POINT.value ? spread : spread / Math.cos(Math.PI / N);

            const tIMod = spreadAlign === Enum.Common.spreadAlign.CENTER.value ? theSpread / 2 : spreadAlign === Enum.Common.spreadAlign.INWARD.value ? theSpread : 0;
            const tOMod = spreadAlign === Enum.Common.spreadAlign.CENTER.value ? theSpread / 2 : spreadAlign === Enum.Common.spreadAlign.OUTWARD.value ? theSpread : 0;

            tI = base - tIMod;
            tO = base + tOMod;
        }

        if (tO <= 0) return null;
        tI = Math.max(0, tI);

        const tempSkipCount = Math.round(Math.max(0, NumericString.Emptyable.asNumber(context.resolve<DataTypes.Integer>(node.id, "skipCount")?.data ?? node.payload.skipCount) ?? 0));
        const skipCount = Math.min(tempSkipCount, Math.ceil(N / 2) - 2);
        const step = skipCount + 1;

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

        const angles = range(N).map((_, i) => {
            const coeff = lerp(delerp(i, 0, N), 0, 360, distroLerper);
            return deg2rad(coeff - 90);
        });

        // Outer vertices at tO, inner vertices at tI — both at same angles
        const outerAll = angles.map((a) => [tO * Math.cos(a), tO * Math.sin(a)] as const);
        const innerAll = angles.map((a) => [tI * Math.cos(a), tI * Math.sin(a)] as const);

        // Collect star-pattern cycles for outer and inner
        const outerCycles = collectStarVertices(outerAll, N, step);
        const innerCycles = collectStarVertices(innerAll, N, step);

        // Build outer subpaths (forward winding)
        const outerResults = outerCycles.map((cycle) => buildSubpath(cycle, outerCornerR, outerCornerShape, false));

        // Build inner subpaths (reversed winding for hole cutting)
        const innerResults = tI > 0 ? innerCycles.map((cycle) => buildSubpath([...cycle].reverse(), innerCornerR, innerCornerShape, true)) : [];

        const hasCut = outerResults.some(([, cut]) => cut) || innerResults.some(([, cut]) => cut);
        let d = [...outerResults.map(([s]) => s), ...innerResults.map(([s]) => s)].join(" ");
        const removeCrossings = context.resolve<DataTypes.Boolean>(node.id, "removeCrossings")?.data ?? node.payload.removeCrossings;
        if (removeCrossings) {
            d = PaperHelper.healD(d) ?? d;
        }
        const [transforms, { translateX, translateY }] = TransformPrefab.evaluate(node, context);

        if (socket === "path") {
            return {
                kind: "path",
                data: { d, transform: transforms.join(" "), preview: { x: -tO + translateX, y: -tO + translateY, w: 2 * tO, h: 2 * tO } },
            };
        }

        const hasInner = innerResults.length > 0;
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
                          end: !hasInner ? { shape: markerShape, orient: markerAlign ? "auto-start-reverse" : undefined } : undefined,
                      }
                    : undefined,
                transform: transforms.join(" "),
                preview: { x: -tO + translateX, y: -tO + translateY, w: 2 * tO, h: 2 * tO },
            },
        };
    }

    const pointCount = NumericString.Emptyable.asNumber(context.resolve<DataTypes.Integer>(node.id, "pointCount")?.data ?? node.payload.pointCount);
    if (pointCount === null) return null;

    const N = pointCount;
    const spanMode = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "spanMode")?.data, Enum.Common.spanMode) ?? node.payload.spanMode ?? 0;
    const expandMode = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "expandMode")?.data, Enum.Common.expandMode) ?? node.payload.expandMode ?? 0;

    let tI: number;
    let tO: number;

    if (spanMode === Enum.Common.spanMode.INNER_OUTER.value) {
        const innerRadius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "innerRadius")?.data ?? node.payload.innerRadius, "0px")) ?? 0;
        const outerRadius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "outerRadius")?.data ?? node.payload.outerRadius, "0px")) ?? 0;
        const iScribeMode = Enum.keyOf(Enum.Common.scribeMode, context.resolve<DataTypes.Enum>(node.id, "iScribe")?.data ?? node.payload.iScribe ?? Enum.Common.scribeMode.INSCRIBE.value);
        const oScribeMode = Enum.keyOf(Enum.Common.scribeMode, context.resolve<DataTypes.Enum>(node.id, "oScribe")?.data ?? node.payload.oScribe ?? Enum.Common.scribeMode.INSCRIBE.value);
        tI = getTrueRadius(innerRadius, iScribeMode, N);
        tO = getTrueRadius(outerRadius, oScribeMode, N);
    } else {
        const radius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "radius")?.data ?? node.payload.radius, "0px")) ?? 0;
        const spread = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "spread")?.data ?? node.payload.spread, "0px")) ?? 0;
        const rScribeMode = Enum.keyOf(Enum.Common.scribeMode, context.resolve<DataTypes.Enum>(node.id, "rScribe")?.data ?? node.payload.rScribe ?? Enum.Common.scribeMode.INSCRIBE.value);
        const spreadAlign = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "spreadAlign")?.data, Enum.Common.spreadAlign) ?? node.payload.spreadAlign ?? 0;
        const base = getTrueRadius(radius, rScribeMode, N);
        const theSpread = expandMode === Enum.Common.expandMode.POINT.value ? spread : spread / Math.cos(Math.PI / N);
        const tIMod = spreadAlign === Enum.Common.spreadAlign.CENTER.value ? theSpread / 2 : spreadAlign === Enum.Common.spreadAlign.INWARD.value ? theSpread : 0;
        const tOMod = spreadAlign === Enum.Common.spreadAlign.CENTER.value ? theSpread / 2 : spreadAlign === Enum.Common.spreadAlign.OUTWARD.value ? theSpread : 0;
        tI = base - tIMod;
        tO = base + tOMod;
    }

    tI = Math.max(0, tI);
    tO = Math.max(0, tO);

    const tempSkipCount = Math.round(Math.max(0, NumericString.Emptyable.asNumber(context.resolve<DataTypes.Integer>(node.id, "skipCount")?.data ?? node.payload.skipCount) ?? 0));
    const step = Math.min(tempSkipCount, Math.ceil(N / 2) - 2) + 1;

    if (socket === "eOuterCircumradius") {
        return { kind: "length", data: `${getDerivedRadius(tO, "CIRCUMSCRIBE", N)}px` };
    }
    if (socket === "eOuterApothem") {
        return { kind: "length", data: `${tO * Math.cos((Math.PI * step) / N)}px` };
    }
    if (socket === "eInnerCircumradius") {
        return { kind: "length", data: `${getDerivedRadius(tI, "CIRCUMSCRIBE", N)}px` };
    }
    if (socket === "eInnerApothem") {
        return { kind: "length", data: `${tI * Math.cos((Math.PI * step) / N)}px` };
    }

    return null;
};

export const KnotNodeType: NodeTypes.Type<"knot", KnotDefinition> = {
    type: "knot",
    displayName: "Knot",
    defaultLabel: "Knot",
    iconNode: <NodeIcon shape={NODE_ICONS.shapeKnot} />,
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
