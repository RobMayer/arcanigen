import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { StylingPrefab } from "../../helpers/stylingPrefab";
import { TransformPrefab } from "../../helpers/transformPrefab";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { NumericString } from "../../datatypes/numericString";

import { SpirographHelper } from "../../helpers/spirographHelper";
import { $, signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: {
        spiroMode: "enum",
        paramMode: "enum",
        ringTeeth: "integer",
        wheelTeeth: "integer",
        penOffset: $.oneOf("float", "integer"),
        radius: "length",
        radiusMode: "enum",
        ringRadius: "length",
        wheelRadius: "length",
        penRadius: "length",
        turns: $.oneOf("float", "integer"),
        markerStartShape: "shape",
        markerEndShape: "shape",
        markerAlign: "boolean",
        ...TransformPrefab.SIG_IN,
        ...StylingPrefab.SIG_IN,
        ...StylingPrefab.SIG_FILL,
    },
    out: { output: "shape", path: "path", eCircumradius: "length", eApothem: "length" },
});

export type SpirographDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        spiroMode: DataTypes.TypeOf<DataTypes.Enum>;
        paramMode: DataTypes.TypeOf<DataTypes.Enum>;
        ringTeeth: DataTypes.TypeOf<DataTypes.Integer>;
        wheelTeeth: DataTypes.TypeOf<DataTypes.Integer>;
        penOffset: DataTypes.TypeOf<DataTypes.Float>;
        radius: DataTypes.TypeOf<DataTypes.Length>;
        radiusMode: DataTypes.TypeOf<DataTypes.Enum>;
        ringRadius: DataTypes.TypeOf<DataTypes.Length>;
        wheelRadius: DataTypes.TypeOf<DataTypes.Length>;
        penRadius: DataTypes.TypeOf<DataTypes.Length>;
        turns: DataTypes.TypeOf<DataTypes.Float>;
        markerAlign: DataTypes.TypeOf<DataTypes.Boolean>;
    } & StylingPrefab.Definition["payload"] &
        TransformPrefab.Definition["payload"]
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<SpirographDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"spirograph", SpirographDefinition> => {
    return {
        id,
        in: {
            spiroMode: null,
            paramMode: null,
            ringTeeth: null,
            wheelTeeth: null,
            penOffset: null,
            radius: null,
            radiusMode: null,
            ringRadius: null,
            wheelRadius: null,
            penRadius: null,
            turns: null,
            markerStartShape: null,
            markerEndShape: null,
            markerAlign: null,

            strokeWidth: null,
            strokeColor: null,
            strokeDash: null,
            strokeDashOffset: null,
            strokeCap: null,
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
            spiroMode: Enum.Common.spiroMode.INSIDE.value,
            paramMode: Enum.Common.spiroParam.GEARED.value,
            ringTeeth: "8",
            wheelTeeth: "3",
            penOffset: "0.75",
            radius: "150px",
            radiusMode: Enum.Common.spiroRadiusMode.MAJOR.value,
            ringRadius: "150px",
            wheelRadius: "56px",
            penRadius: "42px",
            turns: "24",
            markerAlign: true,
            // stroke
            strokeWidth: "1px",
            strokeDash: "",
            strokeColor: { r: 0, g: 0, b: 0, a: 1 },
            strokeDashOffset: "0px",
            strokeCap: Enum.Common.strokeCap.BUTT.value,
            // fill
            fillColor: null,
            paintOrder: 0,
            opacity: "100",
            // transforms
            position: { ...TransformPrefab.POSITION_DEFAULT },
            rotation: "0deg",
        },
        type: "spirograph",
    };
};

const SPIRO_MODE_OPTIONS = Enum.options(Enum.Common.spiroMode);
const PARAM_MODE_OPTIONS = Enum.options(Enum.Common.spiroParam);
const RADIUS_MODE_OPTIONS = Enum.options(Enum.Common.spiroRadiusMode);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<SpirographDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<SpirographDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const graphId = useGraphId();
    const previewCircumradius = Project.useCachedOutput(graphId, node, "eCircumradius");
    const previewApothem = Project.useCachedOutput(graphId, node, "eApothem");

    const isGeared = node.payload.paramMode === Enum.Common.spiroParam.GEARED.value && node.in.paramMode === null;
    const isRadii = node.payload.paramMode === Enum.Common.spiroParam.RADII.value && node.in.paramMode === null;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketOut node={node} socketId={"path"}>
                Path
            </SocketOut>

            <SocketIn node={node} socketId={"spiroMode"} label={"Roll Side"}>
                <RadioButton.Group
                    options={SPIRO_MODE_OPTIONS}
                    value={`${node.payload.spiroMode}`}
                    onValue={(v) => handleUpdate({ spiroMode: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.spiroMode !== null}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"paramMode"} label={"Gear Mode"}>
                <RadioButton.Group
                    options={PARAM_MODE_OPTIONS}
                    value={`${node.payload.paramMode}`}
                    onValue={(v) => handleUpdate({ paramMode: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.paramMode !== null}
                />
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"ringTeeth"} label={"Ring Teeth"}>
                <IntegerInput.SliderInput
                    value={node.payload.ringTeeth}
                    onCommit={(ringTeeth) => handleUpdate({ ringTeeth })}
                    disabled={node.in.ringTeeth !== null || isRadii}
                    min={"1"}
                    max={"200"}
                    required
                />
            </SocketIn>
            <SocketIn node={node} socketId={"wheelTeeth"} label={"Wheel Teeth"}>
                <IntegerInput.SliderInput
                    value={node.payload.wheelTeeth}
                    onCommit={(wheelTeeth) => handleUpdate({ wheelTeeth })}
                    disabled={node.in.wheelTeeth !== null || isRadii}
                    min={"1"}
                    max={"200"}
                    required
                />
            </SocketIn>
            <SocketIn node={node} socketId={"penOffset"} label={"Pen Offset"}>
                <DecimalInput.SliderInput value={node.payload.penOffset} onCommit={(penOffset) => handleUpdate({ penOffset })} disabled={node.in.penOffset !== null || isRadii} min={0} max={1} />
            </SocketIn>
            <SocketIn node={node} socketId={"radius"} label={"Radius"}>
                <LengthInput value={node.payload.radius} onCommit={(radius) => handleUpdate({ radius })} disabled={node.in.radius !== null || isRadii} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"radiusMode"} label={"Radius Mode"}>
                <RadioButton.Group
                    options={RADIUS_MODE_OPTIONS}
                    value={`${node.payload.radiusMode}`}
                    onValue={(v) => handleUpdate({ radiusMode: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.radiusMode !== null || isRadii}
                />
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"ringRadius"} label={"Ring Radius"}>
                <LengthInput value={node.payload.ringRadius} onCommit={(ringRadius) => handleUpdate({ ringRadius })} disabled={node.in.ringRadius !== null || isGeared} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"wheelRadius"} label={"Wheel Radius"}>
                <LengthInput value={node.payload.wheelRadius} onCommit={(wheelRadius) => handleUpdate({ wheelRadius })} disabled={node.in.wheelRadius !== null || isGeared} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"penRadius"} label={"Pen Radius"}>
                <LengthInput value={node.payload.penRadius} onCommit={(penRadius) => handleUpdate({ penRadius })} disabled={node.in.penRadius !== null || isGeared} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"turns"} label={"Turns"}>
                <DecimalInput.SliderInput value={node.payload.turns} onCommit={(turns) => handleUpdate({ turns })} disabled={node.in.turns !== null || isGeared} min={1} max={200} />
            </SocketIn>

            <NodeAccordion label={"More"} socketsIn={"markerStartShape|markerEndShape|markerAlign"} nodeId={node.id}>
                <SocketIn node={node} socketId={"markerStartShape"}>
                    Start Marker
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

            <StylingPrefab.Controls node={node} handleUpdate={handleUpdate} fill accordion />
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

// Inputs that set the figure's size/shape (and therefore its circumradius/apothem).
const RADIUS_INPUTS: (keyof SpirographDefinition["inputs"])[] = ["spiroMode", "paramMode", "ringTeeth", "wheelTeeth", "penOffset", "radius", "radiusMode", "ringRadius", "wheelRadius", "penRadius"];
const GEOMETRY_INPUTS: (keyof SpirographDefinition["inputs"])[] = [
    ...RADIUS_INPUTS,
    "turns",
    "markerStartShape",
    "markerEndShape",
    "markerAlign",
    "position",
    "rotation",
];
const STYLING_INPUTS: (keyof SpirographDefinition["inputs"])[] = ["strokeWidth", "strokeColor", "strokeCap", "strokeDash", "strokeDashOffset", "fillColor", "paintOrder"];

const dependsOn = (_node: NodeDefinitions.NodeFor<SpirographDefinition>, outSocket: keyof SpirographDefinition["outputs"], _deps: AllDeps): (keyof SpirographDefinition["inputs"])[] => {
    if (outSocket === "eCircumradius" || outSocket === "eApothem") {
        return RADIUS_INPUTS;
    }
    if (outSocket === "path") {
        return GEOMETRY_INPUTS;
    }
    return [...GEOMETRY_INPUTS, ...STYLING_INPUTS];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<SpirographDefinition>, inSocket: keyof SpirographDefinition["inputs"], _deps: AllDeps): (keyof SpirographDefinition["outputs"])[] => {
    if (STYLING_INPUTS.includes(inSocket)) {
        return ["output"];
    }
    if (RADIUS_INPUTS.includes(inSocket)) {
        return ["output", "path", "eCircumradius", "eApothem"];
    }
    return ["output", "path"];
};

const SAMPLES_PER_TURN = 120;
const MAX_SAMPLES = 4000;

const evaluate = (node: NodeDefinitions.NodeFor<SpirographDefinition>, socket: keyof SpirographDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const spiroMode = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "spiroMode")?.data, Enum.Common.spiroMode) ?? node.payload.spiroMode ?? 0;
    const paramMode = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "paramMode")?.data, Enum.Common.spiroParam) ?? node.payload.paramMode ?? 0;

    const inside = spiroMode === Enum.Common.spiroMode.INSIDE.value;

    let R: number;
    let r: number;
    let d: number;
    let turns: number;
    let closed: boolean;

    if (paramMode === Enum.Common.spiroParam.RADII.value) {
        R = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "ringRadius")?.data ?? node.payload.ringRadius, "0px")) ?? 0;
        r = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "wheelRadius")?.data ?? node.payload.wheelRadius, "0px")) ?? 0;
        d = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "penRadius")?.data ?? node.payload.penRadius, "0px")) ?? 0;
        turns = Math.max(0, NumericString.Emptyable.asNumber(context.resolve<DataTypes.Float | DataTypes.Integer>(node.id, "turns")?.data ?? node.payload.turns) ?? 0);
        closed = false;
    } else {
        const ringTeeth = Math.max(1, Math.round(NumericString.Emptyable.asNumber(context.resolve<DataTypes.Integer>(node.id, "ringTeeth")?.data ?? node.payload.ringTeeth) ?? 1));
        const wheelTeeth = Math.max(1, Math.round(NumericString.Emptyable.asNumber(context.resolve<DataTypes.Integer>(node.id, "wheelTeeth")?.data ?? node.payload.wheelTeeth) ?? 1));
        const penOffset = Math.min(1, Math.max(0, NumericString.Emptyable.asNumber(context.resolve<DataTypes.Float | DataTypes.Integer>(node.id, "penOffset")?.data ?? node.payload.penOffset) ?? 0));
        const radius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "radius")?.data ?? node.payload.radius, "0px")) ?? 0;
        const radiusMode = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "radiusMode")?.data, Enum.Common.spiroRadiusMode) ?? node.payload.radiusMode ?? 0;

        const ratio = wheelTeeth / ringTeeth;
        const mode = radiusMode === Enum.Common.spiroRadiusMode.MAJOR.value ? "major" : radiusMode === Enum.Common.spiroRadiusMode.MINOR.value ? "minor" : "mechanical";
        R = SpirographHelper.gearedRingRadius(radius, mode, ratio, penOffset, inside);
        r = R * ratio;
        d = r * penOffset;
        turns = SpirographHelper.closingTurns(ringTeeth, wheelTeeth);
        closed = true;
    }

    if (R <= 0 || r <= 0 || turns <= 0) {
        return null;
    }

    if (socket === "eCircumradius" || socket === "eApothem") {
        const { circum, apothem } = SpirographHelper.figureMetrics({ ringRadius: R, wheelRadius: r, penDistance: d, inside });
        return { kind: "length", data: `${socket === "eCircumradius" ? circum : apothem}px` };
    }

    const samples = Math.min(MAX_SAMPLES, Math.max(32, Math.ceil(turns * SAMPLES_PER_TURN)));

    const points = SpirographHelper.sample({ ringRadius: R, wheelRadius: r, penDistance: d, inside, turns, samples, closed });
    const dPath = SpirographHelper.toPath(points, closed);
    const maxR = SpirographHelper.maxRadius({ ringRadius: R, wheelRadius: r, penDistance: d, inside });

    const [transforms, { translateX, translateY }] = TransformPrefab.evaluate(node, context);
    const preview = { x: -maxR + translateX, y: -maxR + translateY, w: 2 * maxR, h: 2 * maxR };

    if (socket === "path") {
        return {
            kind: "path",
            data: { d: dPath, transform: transforms.join(" "), preview },
        };
    }

    if (socket === "output") {
        const paint = StylingPrefab.evaluate(node, context);

        const markerStartShape = context.resolve<DataTypes.Shape>(node.id, "markerStartShape")?.data;
        const markerEndShape = context.resolve<DataTypes.Shape>(node.id, "markerEndShape")?.data;
        const markerAlign = context.resolve<DataTypes.Boolean>(node.id, "markerAlign")?.data ?? node.payload.markerAlign ?? false;

        const markers =
            markerStartShape || markerEndShape
                ? {
                      start: markerStartShape ? { shape: markerStartShape, orient: markerAlign ? "auto-start-reverse" : undefined } : undefined,
                      end: markerEndShape ? { shape: markerEndShape, orient: markerAlign ? "auto-start-reverse" : undefined } : undefined,
                  }
                : undefined;

        return {
            kind: "shape",
            data: {
                type: "path",
                d: dPath,
                paint,
                markers,
                transform: transforms.join(" "),
                preview,
            },
        };
    }

    return null;
};

export const SpirographNodeType: NodeTypes.Type<"spirograph", SpirographDefinition> = {
    type: "spirograph",
    displayName: "Spirograph",
    defaultLabel: "Spirograph",
    iconNode: <NodeIcon shape={NODE_ICONS.shapeSpirograph} />,
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
