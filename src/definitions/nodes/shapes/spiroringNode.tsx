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
import { PaperHelper } from "../../../util/paperHelper";

import { Spirograph } from "./spirographHelper";

export type SpiroringDefinition = {
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
        spread: DataTypes.Use<"length">;
        spreadAlign: DataTypes.Use<"enum">;
        removeCrossings: DataTypes.Use<"boolean">;
    } & Stylings.Definition["inputs"] &
        Transforms.Definition["inputs"];
    outputs: {
        output: DataTypes.Use<"shape">;
        path: DataTypes.Use<"path">;
        eOuterCircumradius: DataTypes.Use<"length">;
        eOuterApothem: DataTypes.Use<"length">;
        eInnerCircumradius: DataTypes.Use<"length">;
        eInnerApothem: DataTypes.Use<"length">;
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
        spread: DataTypes.TypeOf<DataTypes.Use<"length">>;
        spreadAlign: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        removeCrossings: DataTypes.TypeOf<DataTypes.Use<"boolean">>;
    } & Stylings.Definition["payload"] &
        Transforms.Definition["payload"];
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<SpiroringDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"spiroring", SpiroringDefinition> => {
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
            spread: null,
            spreadAlign: null,
            removeCrossings: null,

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
            eOuterCircumradius: [],
            eOuterApothem: [],
            eInnerCircumradius: [],
            eInnerApothem: [],
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
            spread: "16px",
            spreadAlign: Enum.Common.spreadAlign.CENTER.value,
            removeCrossings: false,
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
        type: "spiroring",
    };
};

const SPIRO_MODE_OPTIONS = Enum.options(Enum.Common.spiroMode);
const PARAM_MODE_OPTIONS = Enum.options(Enum.Common.spiroParam);
const RADIUS_MODE_OPTIONS = Enum.options(Enum.Common.spiroRadiusMode);
const SPREAD_ALIGN_OPTIONS = Enum.options(Enum.Common.spreadAlign);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<SpiroringDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<SpiroringDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const graphId = useGraphId();
    const previewOuterCircumradius = Project.useCachedOutput(graphId, node, "eOuterCircumradius");
    const previewOuterApothem = Project.useCachedOutput(graphId, node, "eOuterApothem");
    const previewInnerCircumradius = Project.useCachedOutput(graphId, node, "eInnerCircumradius");
    const previewInnerApothem = Project.useCachedOutput(graphId, node, "eInnerApothem");

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
            <hr />
            <SocketIn node={node} socketId={"spread"} label={"Spread"}>
                <LengthInput value={node.payload.spread} onCommit={(spread) => handleUpdate({ spread })} disabled={node.in.spread !== null} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"spreadAlign"} label={"Spread Align"}>
                <RadioButton.Group
                    options={SPREAD_ALIGN_OPTIONS}
                    value={`${node.payload.spreadAlign}`}
                    onValue={(v) => handleUpdate({ spreadAlign: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.spreadAlign !== null}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"removeCrossings"}>
                <CheckBox checked={node.payload.removeCrossings} onToggle={(removeCrossings) => handleUpdate({ removeCrossings })} disabled={node.in.removeCrossings !== null}>
                    Remove Crossings
                </CheckBox>
            </SocketIn>

            <Stylings.Controls node={node} handleUpdate={handleUpdate} fill accordion />
            <Transforms.Controls node={node} handleUpdate={handleUpdate} accordion />

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

// Inputs that set the band's size/shape (and therefore its inner/outer circumradius/apothem).
const RADIUS_INPUTS: (keyof SpiroringDefinition["inputs"])[] = [
    "spiroMode",
    "paramMode",
    "ringTeeth",
    "wheelTeeth",
    "penOffset",
    "radius",
    "radiusMode",
    "ringRadius",
    "wheelRadius",
    "penRadius",
    "spread",
    "spreadAlign",
];
const RADIUS_OUTPUTS: (keyof SpiroringDefinition["outputs"])[] = ["eOuterCircumradius", "eOuterApothem", "eInnerCircumradius", "eInnerApothem"];
const GEOMETRY_INPUTS: (keyof SpiroringDefinition["inputs"])[] = [
    ...RADIUS_INPUTS,
    "turns",
    "removeCrossings",
    "positionMode",
    "positionX",
    "positionY",
    "positionRadius",
    "positionTheta",
    "rotation",
];
const STYLING_INPUTS: (keyof SpiroringDefinition["inputs"])[] = ["strokeWidth", "strokeColor", "strokeCap", "strokeDash", "strokeDashOffset", "fillColor", "paintOrder"];

const dependsOn = (_node: NodeDefinitions.NodeFor<SpiroringDefinition>, outSocket: keyof SpiroringDefinition["outputs"], _deps: AllDeps): (keyof SpiroringDefinition["inputs"])[] => {
    if (RADIUS_OUTPUTS.includes(outSocket)) {
        return RADIUS_INPUTS;
    }
    if (outSocket === "path") {
        return GEOMETRY_INPUTS;
    }
    return [...GEOMETRY_INPUTS, ...STYLING_INPUTS];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<SpiroringDefinition>, inSocket: keyof SpiroringDefinition["inputs"], _deps: AllDeps): (keyof SpiroringDefinition["outputs"])[] => {
    if (STYLING_INPUTS.includes(inSocket)) {
        return ["output"];
    }
    if (RADIUS_INPUTS.includes(inSocket)) {
        return ["output", "path", ...RADIUS_OUTPUTS];
    }
    return ["output", "path"];
};

const SAMPLES_PER_TURN = 120;
const MAX_SAMPLES = 4000;

const evaluate = (node: NodeDefinitions.NodeFor<SpiroringDefinition>, socket: keyof SpiroringDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const spiroMode = Enum.resolve(context.resolve<"enum">(node.id, "spiroMode")?.data, Enum.Common.spiroMode) ?? node.payload.spiroMode ?? 0;
    const paramMode = Enum.resolve(context.resolve<"enum">(node.id, "paramMode")?.data, Enum.Common.spiroParam) ?? node.payload.paramMode ?? 0;
    const spreadAlign = Enum.resolve(context.resolve<"enum">(node.id, "spreadAlign")?.data, Enum.Common.spreadAlign) ?? node.payload.spreadAlign ?? 0;
    const spread = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "spread")?.data ?? node.payload.spread, "0px")) ?? 0;

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

    if (R <= 0 || r <= 0 || turns <= 0 || spread <= 0) {
        return null;
    }

    // Split the spread across the two boundaries per alignment. The −normal side reads as
    // "outward" for the default winding, so outward offsets negative and inward positive.
    let outerDelta: number;
    let innerDelta: number;
    switch (spreadAlign) {
        case Enum.Common.spreadAlign.INWARD.value:
            outerDelta = spread;
            innerDelta = 0;
            break;
        case Enum.Common.spreadAlign.OUTWARD.value:
            outerDelta = 0;
            innerDelta = -spread;
            break;
        default:
            outerDelta = spread / 2;
            innerDelta = -spread / 2;
            break;
    }

    if (socket === "eOuterCircumradius" || socket === "eOuterApothem" || socket === "eInnerCircumradius" || socket === "eInnerApothem") {
        const { circum, apothem } = Spirograph.figureMetrics({ ringRadius: R, wheelRadius: r, penDistance: d, inside });
        // Radial approximation: the offset is along the normal, but near the extremes the normal is
        // roughly radial. Most-outward boundary = −min(delta); most-inward = +max(delta).
        const outward = Math.max(0, -Math.min(outerDelta, innerDelta));
        const inward = Math.max(0, Math.max(outerDelta, innerDelta));
        const value =
            socket === "eOuterCircumradius"
                ? circum + outward
                : socket === "eOuterApothem"
                  ? apothem + outward
                  : socket === "eInnerCircumradius"
                    ? Math.max(0, circum - inward)
                    : Math.max(0, apothem - inward);
        return { kind: "length", data: `${value}px` };
    }

    const samples = Math.min(MAX_SAMPLES, Math.max(32, Math.ceil(turns * SAMPLES_PER_TURN)));
    const points = Spirograph.sample({ ringRadius: R, wheelRadius: r, penDistance: d, inside, turns, samples, closed });

    const outerPts = Spirograph.offsetSide(points, outerDelta);
    const innerPts = Spirograph.offsetSide(points, innerDelta);

    // Offsets can pinch on tight concave stretches; we leave that for the user to resolve
    // downstream rather than mangling the band here.
    let dPath: string;
    if (closed) {
        // Annulus: outer loop forward, inner loop reversed so the winding cuts a hole.
        dPath = `${Spirograph.toPath(outerPts, true)} ${Spirograph.toPath([...innerPts].reverse(), true)}`;
    } else {
        // Open ribbon: outer forward into inner reversed, closed into one outline.
        dPath = Spirograph.toPath([...outerPts, ...[...innerPts].reverse()], true);
    }

    const removeCrossings = context.resolve<"boolean">(node.id, "removeCrossings")?.data ?? node.payload.removeCrossings ?? false;
    if (removeCrossings) {
        dPath = PaperHelper.healD(dPath) ?? dPath;
    }

    const maxR = Spirograph.maxRadius({ ringRadius: R, wheelRadius: r, penDistance: d, inside }) + Math.max(Math.abs(outerDelta), Math.abs(innerDelta));

    const [transforms, { translateX, translateY }] = Transforms.evaluate(node, context);
    const preview = { x: -maxR + translateX, y: -maxR + translateY, w: 2 * maxR, h: 2 * maxR };

    if (socket === "path") {
        return {
            kind: "path",
            data: { d: dPath, transform: transforms.join(" "), preview },
        };
    }

    if (socket === "output") {
        return {
            kind: "shape",
            data: {
                type: "path",
                d: dPath,
                paint: Stylings.evaluate(node, context),
                transform: transforms.join(" "),
                preview,
            },
        };
    }

    return null;
};

const SOCKETTYPES_IN: { [key in keyof Required<SpiroringDefinition["inputs"]>]: SocketTypes.SocketRule } = {
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
    spread: { types: ["length"], mode: "or" },
    spreadAlign: { types: ["enum"], mode: "or" },
    removeCrossings: { types: ["boolean"], mode: "or" },
    ...Stylings.IN_SOCKET_TYPES,
    ...Transforms.IN_SOCKET_TYPES,
};

const SOCKETTYPES_OUT: { [key in keyof Required<SpiroringDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["shape"], mode: "and" },
    path: { types: ["path"], mode: "and" },
    eOuterCircumradius: { types: ["length"], mode: "and" },
    eOuterApothem: { types: ["length"], mode: "and" },
    eInnerCircumradius: { types: ["length"], mode: "and" },
    eInnerApothem: { types: ["length"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<SpiroringDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const SpiroringNodeType: NodeTypes.Type<"spiroring", SpiroringDefinition> = {
    type: "spiroring",
    displayName: "Spiroring",
    defaultLabel: "Spiroring",
    iconNode: <NodeIcon shape={NODE_ICONS.shapeSpiroring} />,
    flavour: "confirm",
    category: "Shapes",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
