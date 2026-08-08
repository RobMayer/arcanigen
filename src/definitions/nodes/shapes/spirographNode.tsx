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
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { Stylings, Transforms } from "../abstract";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { NumericString } from "../../datatypes/numericString";

import { Spirograph } from "./spirographHelper";

export type SpirographDefinition = {
    inputs: {
        spiroMode: DataTypes.Use<"enum">;
        paramMode: DataTypes.Use<"enum">;
        ringTeeth: DataTypes.Use<"integer">;
        wheelTeeth: DataTypes.Use<"integer">;
        penOffset: DataTypes.Use<"float" | "integer">;
        radius: DataTypes.Use<"length">;
        radiusMode: DataTypes.Use<"enum">;
        ringRadius: DataTypes.Use<"length">;
        wheelRadius: DataTypes.Use<"length">;
        penRadius: DataTypes.Use<"length">;
        turns: DataTypes.Use<"float" | "integer">;
        markerStartShape: DataTypes.Use<"shape">;
        markerEndShape: DataTypes.Use<"shape">;
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
        spiroMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        paramMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        ringTeeth: DataTypes.TypeOf<DataTypes.Use<"integer">>;
        wheelTeeth: DataTypes.TypeOf<DataTypes.Use<"integer">>;
        penOffset: DataTypes.TypeOf<DataTypes.Use<"float">>;
        radius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        radiusMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        ringRadius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        wheelRadius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        penRadius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        turns: DataTypes.TypeOf<DataTypes.Use<"float">>;
        markerAlign: DataTypes.TypeOf<DataTypes.Use<"boolean">>;
    } & Stylings.Definition["payload"] &
        Transforms.Definition["payload"];
};

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
            positionMode: Enum.Common.positionMode.CARTESIAN.value,
            positionX: "0px",
            positionY: "0px",
            positionRadius: "0px",
            positionTheta: "0",
            rotation: "0",
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

            <Stylings.Controls node={node} handleUpdate={handleUpdate} fill accordion />
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

// Inputs that set the figure's size/shape (and therefore its circumradius/apothem).
const RADIUS_INPUTS: (keyof SpirographDefinition["inputs"])[] = ["spiroMode", "paramMode", "ringTeeth", "wheelTeeth", "penOffset", "radius", "radiusMode", "ringRadius", "wheelRadius", "penRadius"];
const GEOMETRY_INPUTS: (keyof SpirographDefinition["inputs"])[] = [
    ...RADIUS_INPUTS,
    "turns",
    "markerStartShape",
    "markerEndShape",
    "markerAlign",
    "positionMode",
    "positionX",
    "positionY",
    "positionRadius",
    "positionTheta",
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
    const spiroMode = Enum.resolve(context.resolve<"enum">(node.id, "spiroMode")?.data, Enum.Common.spiroMode) ?? node.payload.spiroMode ?? 0;
    const paramMode = Enum.resolve(context.resolve<"enum">(node.id, "paramMode")?.data, Enum.Common.spiroParam) ?? node.payload.paramMode ?? 0;

    const inside = spiroMode === Enum.Common.spiroMode.INSIDE.value;

    let R: number;
    let r: number;
    let d: number;
    let turns: number;
    let closed: boolean;

    if (paramMode === Enum.Common.spiroParam.RADII.value) {
        R = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "ringRadius")?.data ?? node.payload.ringRadius, "0px")) ?? 0;
        r = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "wheelRadius")?.data ?? node.payload.wheelRadius, "0px")) ?? 0;
        d = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "penRadius")?.data ?? node.payload.penRadius, "0px")) ?? 0;
        turns = Math.max(0, NumericString.Emptyable.asNumber(context.resolve<"float" | "integer">(node.id, "turns")?.data ?? node.payload.turns) ?? 0);
        closed = false;
    } else {
        const ringTeeth = Math.max(1, Math.round(NumericString.Emptyable.asNumber(context.resolve<"integer">(node.id, "ringTeeth")?.data ?? node.payload.ringTeeth) ?? 1));
        const wheelTeeth = Math.max(1, Math.round(NumericString.Emptyable.asNumber(context.resolve<"integer">(node.id, "wheelTeeth")?.data ?? node.payload.wheelTeeth) ?? 1));
        const penOffset = Math.min(1, Math.max(0, NumericString.Emptyable.asNumber(context.resolve<"float" | "integer">(node.id, "penOffset")?.data ?? node.payload.penOffset) ?? 0));
        const radius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "radius")?.data ?? node.payload.radius, "0px")) ?? 0;
        const radiusMode = Enum.resolve(context.resolve<"enum">(node.id, "radiusMode")?.data, Enum.Common.spiroRadiusMode) ?? node.payload.radiusMode ?? 0;

        const ratio = wheelTeeth / ringTeeth;
        const mode = radiusMode === Enum.Common.spiroRadiusMode.MAJOR.value ? "major" : radiusMode === Enum.Common.spiroRadiusMode.MINOR.value ? "minor" : "mechanical";
        R = Spirograph.gearedRingRadius(radius, mode, ratio, penOffset, inside);
        r = R * ratio;
        d = r * penOffset;
        turns = Spirograph.closingTurns(ringTeeth, wheelTeeth);
        closed = true;
    }

    if (R <= 0 || r <= 0 || turns <= 0) {
        return null;
    }

    if (socket === "eCircumradius" || socket === "eApothem") {
        const { circum, apothem } = Spirograph.figureMetrics({ ringRadius: R, wheelRadius: r, penDistance: d, inside });
        return { kind: "length", data: `${socket === "eCircumradius" ? circum : apothem}px` };
    }

    const samples = Math.min(MAX_SAMPLES, Math.max(32, Math.ceil(turns * SAMPLES_PER_TURN)));

    const points = Spirograph.sample({ ringRadius: R, wheelRadius: r, penDistance: d, inside, turns, samples, closed });
    const dPath = Spirograph.toPath(points, closed);
    const maxR = Spirograph.maxRadius({ ringRadius: R, wheelRadius: r, penDistance: d, inside });

    const [transforms, { translateX, translateY }] = Transforms.evaluate(node, context);
    const preview = { x: -maxR + translateX, y: -maxR + translateY, w: 2 * maxR, h: 2 * maxR };

    if (socket === "path") {
        return {
            kind: "path",
            data: { d: dPath, transform: transforms.join(" "), preview },
        };
    }

    if (socket === "output") {
        const paint = Stylings.evaluate(node, context);

        const markerStartShape = context.resolve<"shape">(node.id, "markerStartShape")?.data;
        const markerEndShape = context.resolve<"shape">(node.id, "markerEndShape")?.data;
        const markerAlign = context.resolve<"boolean">(node.id, "markerAlign")?.data ?? node.payload.markerAlign ?? false;

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

const SOCKETTYPES_IN: { [key in keyof Required<SpirographDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    spiroMode: { types: ["enum"], mode: "or" },
    paramMode: { types: ["enum"], mode: "or" },
    ringTeeth: { types: ["integer"], mode: "or" },
    wheelTeeth: { types: ["integer"], mode: "or" },
    penOffset: { types: ["float", "integer"], mode: "or" },
    radius: { types: ["length"], mode: "or" },
    radiusMode: { types: ["enum"], mode: "or" },
    ringRadius: { types: ["length"], mode: "or" },
    wheelRadius: { types: ["length"], mode: "or" },
    penRadius: { types: ["length"], mode: "or" },
    turns: { types: ["float", "integer"], mode: "or" },
    markerStartShape: { types: ["shape"], mode: "or" },
    markerEndShape: { types: ["shape"], mode: "or" },
    markerAlign: { types: ["boolean"], mode: "or" },
    ...Stylings.IN_SOCKET_TYPES,
    ...Transforms.IN_SOCKET_TYPES,
};

const SOCKETTYPES_OUT: { [key in keyof Required<SpirographDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["shape"], mode: "and" },
    path: { types: ["path"], mode: "and" },
    eCircumradius: { types: ["length"], mode: "and" },
    eApothem: { types: ["length"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<SpirographDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
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
    getSocketType,
};
