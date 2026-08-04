import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Stylings, Transforms } from "../abstract";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { NumericString } from "../../datatypes/numericString";

export type ArcDefinition = {
    inputs: {
        radius: DataTypes.Use<"length">;
        arcMode: DataTypes.Use<"enum">;
        thetaStart: DataTypes.Use<"angle">;
        sweep: DataTypes.Use<"angle">;
        thetaFrom: DataTypes.Use<"angle">;
        thetaTo: DataTypes.Use<"angle">;
        pieSlice: DataTypes.Use<"boolean">;
        markerStartShape: DataTypes.Use<"shape">;
        markerEndShape: DataTypes.Use<"shape">;
        markerAlign: DataTypes.Use<"boolean">;
    } & Stylings.Definition["inputs"] &
        Transforms.Definition["inputs"];
    outputs: {
        output: DataTypes.Use<"shape">;
        path: DataTypes.Use<"path">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        radius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        arcMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        thetaStart: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        sweep: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        thetaFrom: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        thetaTo: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        pieSlice: DataTypes.TypeOf<DataTypes.Use<"boolean">>;
        markerAlign: DataTypes.TypeOf<DataTypes.Use<"boolean">>;
    } & Stylings.Definition["payload"] &
        Transforms.Definition["payload"];
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<ArcDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"arc", ArcDefinition> => {
    return {
        id,
        in: {
            radius: null,
            arcMode: null,
            thetaStart: null,
            sweep: null,
            thetaFrom: null,
            thetaTo: null,
            pieSlice: null,
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
        },
        payload: {
            label: "",
            radius: "150px",
            arcMode: Enum.Common.arcMode.START_SWEEP.value,
            thetaStart: "0",
            sweep: "90",
            thetaFrom: "0",
            thetaTo: "90",
            pieSlice: false,
            markerAlign: true,
            // stroke
            strokeWidth: "1px",
            strokeDash: "",
            strokeColor: { r: 0, g: 0, b: 0, a: 1 },
            strokeDashOffset: "0px",
            strokeCap: Enum.Common.strokeCap.BUTT.value,
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
        type: "arc",
    };
};

const ARC_MODE_OPTIONS = Enum.options(Enum.Common.arcMode);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ArcDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ArcDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const isStartSweep = node.payload.arcMode === Enum.Common.arcMode.START_SWEEP.value && node.in.arcMode === null;
    const isFromTo = node.payload.arcMode === Enum.Common.arcMode.FROM_TO.value && node.in.arcMode === null;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketOut node={node} socketId={"path"}>
                Path
            </SocketOut>
            <SocketIn node={node} socketId={"radius"} label={"Radius"}>
                <LengthInput value={node.payload.radius} onCommit={(radius) => handleUpdate({ radius })} disabled={node.in.radius !== null} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"pieSlice"}>
                <CheckBox checked={node.payload.pieSlice} onToggle={(pieSlice) => handleUpdate({ pieSlice })} disabled={node.in.pieSlice !== null}>
                    Pie Slice
                </CheckBox>
            </SocketIn>

            <SocketIn node={node} socketId={"arcMode"} label={"Arc Mode"}>
                <RadioButton.Group
                    options={ARC_MODE_OPTIONS}
                    value={`${node.payload.arcMode}`}
                    onValue={(v) => handleUpdate({ arcMode: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.arcMode !== null}
                />
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"thetaStart"} label={"Start"}>
                <AngleInput.SliderInput value={node.payload.thetaStart} onCommit={(thetaStart) => handleUpdate({ thetaStart })} disabled={node.in.thetaStart !== null || isFromTo} />
            </SocketIn>
            <SocketIn node={node} socketId={"sweep"} label={"Sweep"}>
                <AngleInput.SliderInput value={node.payload.sweep} onCommit={(sweep) => handleUpdate({ sweep })} disabled={node.in.sweep !== null || isFromTo} unbound min={-360} max={360} />
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"thetaFrom"} label={"From"}>
                <AngleInput.SliderInput value={node.payload.thetaFrom} onCommit={(thetaFrom) => handleUpdate({ thetaFrom })} disabled={node.in.thetaFrom !== null || isStartSweep} unbound />
            </SocketIn>
            <SocketIn node={node} socketId={"thetaTo"} label={"To"}>
                <AngleInput.SliderInput value={node.payload.thetaTo} onCommit={(thetaTo) => handleUpdate({ thetaTo })} disabled={node.in.thetaTo !== null || isStartSweep} unbound />
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
        </TypicalNode>
    );
};

const GEOMETRY_INPUTS: (keyof ArcDefinition["inputs"])[] = [
    "radius",
    "arcMode",
    "thetaStart",
    "sweep",
    "thetaFrom",
    "thetaTo",
    "pieSlice",
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
const STYLING_INPUTS: (keyof ArcDefinition["inputs"])[] = ["strokeWidth", "strokeColor", "strokeCap", "strokeDash", "strokeDashOffset", "fillColor", "paintOrder"];

const dependsOn = (_node: NodeDefinitions.NodeFor<ArcDefinition>, outSocket: keyof ArcDefinition["outputs"], _deps: AllDeps): (keyof ArcDefinition["inputs"])[] => {
    if (outSocket === "path") {
        return GEOMETRY_INPUTS;
    }
    return [...GEOMETRY_INPUTS, ...STYLING_INPUTS];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ArcDefinition>, inSocket: keyof ArcDefinition["inputs"], _deps: AllDeps): (keyof ArcDefinition["outputs"])[] => {
    if (STYLING_INPUTS.includes(inSocket)) {
        return ["output"];
    }
    return ["output", "path"];
};

/** Convert our angle convention (0° = top, CW positive) to radians for Math.cos/sin */
const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;

const evaluate = (node: NodeDefinitions.NodeFor<ArcDefinition>, socket: keyof ArcDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const radius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "radius")?.data ?? node.payload.radius, "0px"));
    if (!radius) {
        return null;
    }

    const arcMode = Enum.resolve(context.resolve<"enum">(node.id, "arcMode")?.data, Enum.Common.arcMode) ?? node.payload.arcMode ?? 0;
    const pieSlice = context.resolve<"boolean">(node.id, "pieSlice")?.data ?? node.payload.pieSlice ?? false;

    let effectiveStart: number;
    let effectiveSweep: number;

    if (arcMode === Enum.Common.arcMode.FROM_TO.value) {
        const from = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "thetaFrom")?.data ?? node.payload.thetaFrom) ?? 0;
        const to = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "thetaTo")?.data ?? node.payload.thetaTo) ?? 0;
        effectiveStart = from;
        effectiveSweep = to - from;
    } else {
        effectiveStart = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "thetaStart")?.data ?? node.payload.thetaStart) ?? 0;
        effectiveSweep = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "sweep")?.data ?? node.payload.sweep) ?? 0;
    }

    effectiveSweep = Math.max(-360, Math.min(360, effectiveSweep));

    if (effectiveSweep === 0) {
        return null;
    }

    const absSweep = Math.abs(effectiveSweep);
    const sweepFlag = effectiveSweep > 0 ? 1 : 0;

    let d: string;

    if (absSweep >= 360) {
        const midAngle = effectiveStart + effectiveSweep / 2;
        const sx = radius * Math.cos(toRad(effectiveStart));
        const sy = radius * Math.sin(toRad(effectiveStart));
        const mx = radius * Math.cos(toRad(midAngle));
        const my = radius * Math.sin(toRad(midAngle));

        if (pieSlice) {
            d = `M 0,0 L ${sx},${sy} A ${radius},${radius} 0 0 ${sweepFlag} ${mx},${my} A ${radius},${radius} 0 0 ${sweepFlag} ${sx},${sy} Z`;
        } else {
            d = `M ${sx},${sy} A ${radius},${radius} 0 0 ${sweepFlag} ${mx},${my} A ${radius},${radius} 0 0 ${sweepFlag} ${sx},${sy}`;
        }
    } else {
        const endAngle = effectiveStart + effectiveSweep;
        const sx = radius * Math.cos(toRad(effectiveStart));
        const sy = radius * Math.sin(toRad(effectiveStart));
        const ex = radius * Math.cos(toRad(endAngle));
        const ey = radius * Math.sin(toRad(endAngle));
        const largeArc = absSweep > 180 ? 1 : 0;

        if (pieSlice) {
            d = `M 0,0 L ${sx},${sy} A ${radius},${radius} 0 ${largeArc} ${sweepFlag} ${ex},${ey} Z`;
        } else {
            d = `M ${sx},${sy} A ${radius},${radius} 0 ${largeArc} ${sweepFlag} ${ex},${ey}`;
        }
    }

    const [transforms, { translateX, translateY }] = Transforms.evaluate(node, context);

    if (socket === "path") {
        return {
            kind: "path",
            data: { d, transform: transforms.join(" "), preview: { x: -radius + translateX, y: -radius + translateY, w: 2 * radius, h: 2 * radius } },
        };
    }

    if (socket === "output") {
        const paint = Stylings.evaluate(node, context);

        if (!pieSlice) {
            paint.fill = null;
        }

        const markerStartShape = context.resolve<"shape">(node.id, "markerStartShape")?.data;
        const markerEndShape = context.resolve<"shape">(node.id, "markerEndShape")?.data;
        const markerAlign = context.resolve<"boolean">(node.id, "markerAlign")?.data ?? node.payload.markerAlign ?? false;
        const useStartMarker = !pieSlice && !!markerStartShape;
        const useEndMarker = !pieSlice && !!markerEndShape;

        const markers =
            useStartMarker || useEndMarker
                ? {
                      start: useStartMarker ? { shape: markerStartShape, orient: markerAlign ? "auto-start-reverse" : undefined } : undefined,
                      end: useEndMarker ? { shape: markerEndShape, orient: markerAlign ? "auto-start-reverse" : undefined } : undefined,
                  }
                : undefined;

        return {
            kind: "shape",
            data: {
                type: "path",
                d,
                paint,
                markers,
                transform: transforms.join(" "),
                preview: { x: -radius + translateX, y: -radius + translateY, w: 2 * radius, h: 2 * radius },
            },
        };
    }

    return null;
};

const SOCKETTYPES_IN: { [key in keyof Required<ArcDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    radius: { types: ["length"], mode: "or" },
    arcMode: { types: ["enum"], mode: "or" },
    thetaStart: { types: ["angle"], mode: "or" },
    sweep: { types: ["angle"], mode: "or" },
    thetaFrom: { types: ["angle"], mode: "or" },
    thetaTo: { types: ["angle"], mode: "or" },
    pieSlice: { types: ["boolean"], mode: "or" },
    markerStartShape: { types: ["shape"], mode: "or" },
    markerEndShape: { types: ["shape"], mode: "or" },
    markerAlign: { types: ["boolean"], mode: "or" },
    ...Stylings.IN_SOCKET_TYPES,
    ...Transforms.IN_SOCKET_TYPES,
};

const SOCKETTYPES_OUT: { [key in keyof Required<ArcDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["shape"], mode: "and" },
    path: { types: ["path"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<ArcDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const ArcNodeType: NodeTypes.Type<"arc", ArcDefinition> = {
    type: "arc",
    displayName: "Arc",
    defaultLabel: "Arc",
    iconNode: <Icon shape={NODE_ICONS.shapeArc} color={"var(--icon-flavour)"} />,
    category: "Shapes",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
