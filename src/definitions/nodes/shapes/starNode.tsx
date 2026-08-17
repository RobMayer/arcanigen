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
import { distroInterpolator, getTrueRadius } from "../../../util/misc";
import { StylingPrefab } from "../../helpers/stylingPrefab";
import { TransformPrefab } from "../../helpers/transformPrefab";
import { StarHelper } from "../../helpers/starHelper";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: {
        pointCount: "integer",
        radius: "length",
        amplitude: "length",
        minorRadius: "length",
        majorRadius: "length",
        radiusMode: "enum",
        amplitudeAlign: "enum",
        rScribe: "enum",
        minorScribe: "enum",
        majorScribe: "enum",
        pointDistro: "distribution",
        majorCornerRadius: "length",
        majorCornerShape: "enum",
        minorCornerRadius: "length",
        minorCornerShape: "enum",
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
        minorScribe: DataTypes.TypeOf<DataTypes.Enum>;
        majorScribe: DataTypes.TypeOf<DataTypes.Enum>;
        radius: DataTypes.TypeOf<DataTypes.Length>;
        amplitude: DataTypes.TypeOf<DataTypes.Length>;
        minorRadius: DataTypes.TypeOf<DataTypes.Length>;
        majorRadius: DataTypes.TypeOf<DataTypes.Length>;
        radiusMode: DataTypes.TypeOf<DataTypes.Enum>;
        amplitudeAlign: DataTypes.TypeOf<DataTypes.Enum>;
        majorCornerRadius: DataTypes.TypeOf<DataTypes.Length>;
        majorCornerShape: DataTypes.TypeOf<DataTypes.Enum>;
        minorCornerRadius: DataTypes.TypeOf<DataTypes.Length>;
        minorCornerShape: DataTypes.TypeOf<DataTypes.Enum>;
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
            minorScribe: null,
            majorScribe: null,
            radius: null,
            amplitude: null,
            minorRadius: null,
            majorRadius: null,
            radiusMode: null,
            amplitudeAlign: null,
            majorCornerRadius: null,
            majorCornerShape: null,
            minorCornerRadius: null,
            minorCornerShape: null,

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
            position: null,
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
            minorScribe: Enum.Common.scribeMode.INSCRIBE.value,
            majorScribe: Enum.Common.scribeMode.INSCRIBE.value,
            radius: "100px",

            amplitude: "50px",
            minorRadius: "50px",
            majorRadius: "100px",
            radiusMode: Enum.Common.starRadiusMode.MAJOR_MINOR.value,
            amplitudeAlign: 0,
            majorCornerRadius: "0px",
            majorCornerShape: 0,
            minorCornerRadius: "0px",
            minorCornerShape: 0,

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
        type: "star",
    };
};

const RADIUS_MODE_OPTIONS = Enum.options(Enum.Common.starRadiusMode);
const SCRIBE_MODE_OPTIONS = Enum.options(Enum.Common.scribeMode);
const CORNER_SHAPE_OPTIONS = Enum.options(Enum.Common.cornerShape);
const AMPLITUDE_ALIGN_OPTIONS = Enum.options(Enum.Common.spreadAlign);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<StarDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<StarDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const isMajorMinor = node.payload.radiusMode === Enum.Common.starRadiusMode.MAJOR_MINOR.value && node.in.radiusMode === null;
    const isAmplitude = node.payload.radiusMode === Enum.Common.starRadiusMode.AMPLITUDE.value && node.in.radiusMode === null;

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

            <SocketIn node={node} socketId={"radiusMode"} label={"Radius Mode"}>
                <RadioButton.Group
                    options={RADIUS_MODE_OPTIONS}
                    value={`${node.payload.radiusMode}`}
                    onValue={(v) => handleUpdate({ radiusMode: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.radiusMode !== null}
                />
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"majorRadius"} label={"Major Radius"}>
                <LengthInput value={node.payload.majorRadius} onCommit={(majorRadius) => handleUpdate({ majorRadius })} disabled={node.in.majorRadius !== null || isAmplitude} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"majorScribe"} label={"Major Scribe Mode"}>
                <RadioButton.Group
                    orientation={"horizontal"}
                    value={`${node.payload.majorScribe}`}
                    onValue={(v) => handleUpdate({ majorScribe: Number(v) })}
                    disabled={node.in.majorScribe !== null || isAmplitude}
                    options={SCRIBE_MODE_OPTIONS}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"minorRadius"} label={"Minor Radius"}>
                <LengthInput value={node.payload.minorRadius} onCommit={(minorRadius) => handleUpdate({ minorRadius })} disabled={node.in.minorRadius !== null || isAmplitude} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"minorScribe"} label={"Minor Scribe Mode"}>
                <RadioButton.Group
                    orientation={"horizontal"}
                    value={`${node.payload.minorScribe}`}
                    onValue={(v) => handleUpdate({ minorScribe: Number(v) })}
                    disabled={node.in.minorScribe !== null || isAmplitude}
                    options={SCRIBE_MODE_OPTIONS}
                />
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"radius"} label={"Radius"}>
                <LengthInput value={node.payload.radius} onCommit={(radius) => handleUpdate({ radius })} disabled={node.in.radius !== null || isMajorMinor} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"rScribe"} label={"Scribe Mode"}>
                <RadioButton.Group
                    orientation={"horizontal"}
                    value={`${node.payload.rScribe}`}
                    onValue={(v) => handleUpdate({ rScribe: Number(v) })}
                    disabled={node.in.rScribe !== null || isMajorMinor}
                    options={SCRIBE_MODE_OPTIONS}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"amplitude"} label={"Amplitude"}>
                <LengthInput value={node.payload.amplitude} onCommit={(amplitude) => handleUpdate({ amplitude })} disabled={node.in.amplitude !== null || isMajorMinor} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"amplitudeAlign"} label={"Amplitude Align"}>
                <RadioButton.Group
                    options={AMPLITUDE_ALIGN_OPTIONS}
                    value={`${node.payload.amplitudeAlign}`}
                    onValue={(v) => handleUpdate({ amplitudeAlign: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.amplitudeAlign !== null || isMajorMinor}
                />
            </SocketIn>

            <NodeAccordion label={"More"} socketsIn={"majorCornerRadius|majorCornerShape|minorCornerRadius|minorCornerShape|pointDistro|markerShape|markerAlign"} nodeId={node.id}>
                <SocketIn node={node} socketId={"pointDistro"}>
                    Angular Distribution
                </SocketIn>
                <SocketIn node={node} socketId={"majorCornerRadius"} label={"Major Corner Radius"}>
                    <LengthInput
                        value={node.payload.majorCornerRadius}
                        onCommit={(majorCornerRadius) => handleUpdate({ majorCornerRadius })}
                        disabled={node.in.majorCornerRadius !== null}
                        min={"0px"}
                        required
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"majorCornerShape"} label={"Major Corner Shape"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.majorCornerShape}`}
                        options={CORNER_SHAPE_OPTIONS}
                        onValue={(v) => handleUpdate({ majorCornerShape: Number(v) })}
                        disabled={node.in.majorCornerShape !== null}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"minorCornerRadius"} label={"Minor Corner Radius"}>
                    <LengthInput
                        value={node.payload.minorCornerRadius}
                        onCommit={(minorCornerRadius) => handleUpdate({ minorCornerRadius })}
                        disabled={node.in.minorCornerRadius !== null}
                        min={"0px"}
                        required
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"minorCornerShape"} label={"Minor Corner Shape"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.minorCornerShape}`}
                        options={CORNER_SHAPE_OPTIONS}
                        onValue={(v) => handleUpdate({ minorCornerShape: Number(v) })}
                        disabled={node.in.minorCornerShape !== null}
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
    "amplitude",
    "minorRadius",
    "majorRadius",
    "radiusMode",
    "amplitudeAlign",
    "rScribe",
    "minorScribe",
    "majorScribe",
    "majorCornerRadius",
    "majorCornerShape",
    "minorCornerRadius",
    "minorCornerShape",
    "markerShape",
    "markerAlign",
    "position",
    "rotation",
];
const STYLING_INPUTS: (keyof StarDefinition["inputs"])[] = ["strokeWidth", "strokeColor", "strokeCap", "strokeJoin", "strokeDash", "strokeDashOffset", "fillColor", "paintOrder", "opacity"];

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

const evaluate = (node: NodeDefinitions.NodeFor<StarDefinition>, socket: keyof StarDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output" || socket === "path") {
        const pointCount = Math.round(Math.max(3, Math.min(64, NumericString.Emptyable.asNumber(context.resolve<DataTypes.Integer>(node.id, "pointCount")?.data ?? node.payload.pointCount) ?? NaN)));
        if (!isFinite(pointCount)) return null;

        const N = pointCount;
        const radiusMode = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "radiusMode")?.data, Enum.Common.starRadiusMode) ?? node.payload.radiusMode ?? 0;

        let tI: number;
        let tO: number;

        if (radiusMode === Enum.Common.starRadiusMode.MAJOR_MINOR.value) {
            const minorRadius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "minorRadius")?.data ?? node.payload.minorRadius, "0px")) ?? 0;
            const majorRadius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "majorRadius")?.data ?? node.payload.majorRadius, "0px")) ?? 0;
            if (!majorRadius) return null;

            const minorScribeMode = Enum.keyOf(Enum.Common.scribeMode, context.resolve<DataTypes.Enum>(node.id, "minorScribe")?.data ?? node.payload.minorScribe ?? Enum.Common.scribeMode.INSCRIBE.value);
            const majorScribeMode = Enum.keyOf(Enum.Common.scribeMode, context.resolve<DataTypes.Enum>(node.id, "majorScribe")?.data ?? node.payload.majorScribe ?? Enum.Common.scribeMode.INSCRIBE.value);

            tI = getTrueRadius(minorRadius, minorScribeMode, N);
            tO = getTrueRadius(majorRadius, majorScribeMode, N);
        } else {
            // Amplitude mode
            const radius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "radius")?.data ?? node.payload.radius, "0px")) ?? 0;
            const amplitude = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "amplitude")?.data ?? node.payload.amplitude, "0px")) ?? 0;
            if (!radius || !amplitude) return null;

            const rScribeMode = Enum.keyOf(Enum.Common.scribeMode, context.resolve<DataTypes.Enum>(node.id, "rScribe")?.data ?? node.payload.rScribe ?? Enum.Common.scribeMode.INSCRIBE.value);
            const amplitudeAlign = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "amplitudeAlign")?.data, Enum.Common.spreadAlign) ?? node.payload.amplitudeAlign ?? 0;

            const base = getTrueRadius(radius, rScribeMode, N);

            const tIMod = amplitudeAlign === Enum.Common.spreadAlign.CENTER.value ? amplitude / 2 : amplitudeAlign === Enum.Common.spreadAlign.INWARD.value ? amplitude : 0;
            const tOMod = amplitudeAlign === Enum.Common.spreadAlign.CENTER.value ? amplitude / 2 : amplitudeAlign === Enum.Common.spreadAlign.OUTWARD.value ? amplitude : 0;

            tI = base - tIMod;
            tO = base + tOMod;
        }

        if (tO <= 0) return null;
        tI = Math.max(0, tI);

        // Corner parameters
        const outerCornerR = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "majorCornerRadius")?.data ?? node.payload.majorCornerRadius, "0px")) ?? 0;
        const outerCornerShape = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "majorCornerShape")?.data, Enum.Common.cornerShape) ?? node.payload.majorCornerShape ?? 0;
        const innerCornerR = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "minorCornerRadius")?.data ?? node.payload.minorCornerRadius, "0px")) ?? 0;
        const innerCornerShape = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "minorCornerShape")?.data, Enum.Common.cornerShape) ?? node.payload.minorCornerShape ?? 0;

        const markerShape = context.resolve<DataTypes.Shape>(node.id, "markerShape")?.data;
        const markerAlign = context.resolve<DataTypes.Boolean>(node.id, "markerAlign")?.data ?? node.payload.markerAlign ?? false;

        const distro = context.resolve<DataTypes.Distribution>(node.id, "pointDistro")?.data ?? { func: Enum.Common.distroFunctions.LINEAR.value, easing: Enum.Common.distroEasing.IN.value, intensity: "1" };
        const distroLerper = distroInterpolator(
            Enum.keyOf(Enum.Common.distroFunctions, distro.func),
            Enum.keyOf(Enum.Common.distroEasing, distro.easing),
            NumericString.Emptyable.asNumber(distro.intensity) ?? 1,
        );

        const vertices = StarHelper.outlineVertices(N, tO, tI, outerCornerR, outerCornerShape, innerCornerR, innerCornerShape, distroLerper);
        const [d, hasCut] = StarHelper.buildOutline(vertices);
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
