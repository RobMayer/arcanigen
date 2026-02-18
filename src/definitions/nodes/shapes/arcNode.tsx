import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Stylings, Transforms } from "./abstract";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { NumericString } from "../../datatypes/numericString";
import { SVGDefinition } from "../../../types";

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
        },
        payload: {
            label: "",
            radius: "150px",
            arcMode: Enum.Common.arcMode.StartSweep,
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
            strokeCap: Enum.Common.strokeCap.Butt,
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

    const isStartSweep = node.payload.arcMode === Enum.Common.arcMode.StartSweep && node.in.arcMode === null;
    const isFromTo = node.payload.arcMode === Enum.Common.arcMode.FromTo && node.in.arcMode === null;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"shape"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"radius"} type={"length"} label={"Radius"}>
                <LengthInput value={node.payload.radius} onCommit={(radius) => handleUpdate({ radius })} disabled={node.in.radius !== null} min={"0px"} required />
            </SocketIn>

            <SocketIn node={node} socketId={"arcMode"} type={"enum"} label={"Arc Mode"}>
                <RadioButton.Group
                    options={ARC_MODE_OPTIONS}
                    value={`${node.payload.arcMode}`}
                    onValue={(v) => handleUpdate({ arcMode: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.arcMode !== null}
                />
            </SocketIn>

            <SocketIn node={node} socketId={"thetaStart"} type={"angle"} label={"Start"}>
                <AngleInput.SliderInput value={node.payload.thetaStart} onCommit={(thetaStart) => handleUpdate({ thetaStart })} disabled={node.in.thetaStart !== null || isFromTo} />
            </SocketIn>
            <SocketIn node={node} socketId={"sweep"} type={"angle"} label={"Sweep"}>
                <AngleInput.SliderInput value={node.payload.sweep} onCommit={(sweep) => handleUpdate({ sweep })} disabled={node.in.sweep !== null || isFromTo} unbound min={-360} max={360} />
            </SocketIn>

            <SocketIn node={node} socketId={"thetaFrom"} type={"angle"} label={"From"}>
                <AngleInput.SliderInput value={node.payload.thetaFrom} onCommit={(thetaFrom) => handleUpdate({ thetaFrom })} disabled={node.in.thetaFrom !== null || isStartSweep} unbound />
            </SocketIn>
            <SocketIn node={node} socketId={"thetaTo"} type={"angle"} label={"To"}>
                <AngleInput.SliderInput value={node.payload.thetaTo} onCommit={(thetaTo) => handleUpdate({ thetaTo })} disabled={node.in.thetaTo !== null || isStartSweep} unbound />
            </SocketIn>

            <SocketIn node={node} socketId={"pieSlice"} type={"boolean"}>
                <CheckBox checked={node.payload.pieSlice} onToggle={(pieSlice) => handleUpdate({ pieSlice })} disabled={node.in.pieSlice !== null}>
                    Pie Slice
                </CheckBox>
            </SocketIn>

            <NodeAccordion label={"More"} socketsIn={"markerStartShape|markerEndShape|markerAlign"} nodeId={node.id}>
                <SocketIn node={node} socketId={"markerStartShape"} type={"shape"}>
                    Start Marker
                </SocketIn>
                <SocketIn node={node} socketId={"markerEndShape"} type={"shape"}>
                    End Marker
                </SocketIn>
                <SocketIn node={node} socketId={"markerAlign"} type={"boolean"}>
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

const dependsOn = (_node: NodeDefinitions.NodeFor<ArcDefinition>, _outSocket: keyof ArcDefinition["outputs"], _deps: AllDeps): (keyof ArcDefinition["inputs"])[] => {
    return [
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
        "strokeWidth",
        "strokeColor",
        "strokeCap",
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
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ArcDefinition>, _inSocket: keyof ArcDefinition["inputs"], _deps: AllDeps): (keyof ArcDefinition["outputs"])[] => {
    return ["output"];
};

/** Convert our angle convention (0° = top, CW positive) to radians for Math.cos/sin */
const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;

const evaluate = (node: NodeDefinitions.NodeFor<ArcDefinition>, socket: keyof ArcDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const radius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "radius")?.data ?? node.payload.radius, "0px"));
        if (!radius) {
            return null;
        }

        const arcMode = context.resolve<"enum">(node.id, "arcMode")?.data ?? node.payload.arcMode ?? 0;
        const pieSlice = context.resolve<"boolean">(node.id, "pieSlice")?.data ?? node.payload.pieSlice ?? false;

        let effectiveStart: number;
        let effectiveSweep: number;

        if (arcMode === Enum.Common.arcMode.FromTo) {
            const from = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "thetaFrom")?.data ?? node.payload.thetaFrom) ?? 0;
            const to = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "thetaTo")?.data ?? node.payload.thetaTo) ?? 0;
            effectiveStart = from;
            effectiveSweep = to - from;
        } else {
            effectiveStart = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "thetaStart")?.data ?? node.payload.thetaStart) ?? 0;
            effectiveSweep = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "sweep")?.data ?? node.payload.sweep) ?? 0;
        }

        // Clamp sweep to [-360, 360]
        effectiveSweep = Math.max(-360, Math.min(360, effectiveSweep));

        if (effectiveSweep === 0) {
            return null;
        }

        const absSweep = Math.abs(effectiveSweep);
        const sweepFlag = effectiveSweep > 0 ? 1 : 0;

        let d: string;

        if (absSweep >= 360) {
            // Full circle — two semicircular arcs (SVG can't draw a 360° arc with one A command)
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

        const stylingAttrs = Stylings.evaluate(node, context);

        // When pie slice is disabled, fill is always "none"
        if (!pieSlice) {
            stylingAttrs.fill = "none";
        }

        const markerStartShape = context.resolve<"shape">(node.id, "markerStartShape")?.data;
        const markerEndShape = context.resolve<"shape">(node.id, "markerEndShape")?.data;
        const markerAlign = context.resolve<"boolean">(node.id, "markerAlign")?.data ?? node.payload.markerAlign ?? false;
        const useStartMarker = !pieSlice && !!markerStartShape;
        const useEndMarker = !pieSlice && !!markerEndShape;

        const attributes: Record<string, string | undefined> = {
            d,
            ...stylingAttrs,
            markerStart: useStartMarker ? `url('#markerStart_${node.id}')` : undefined,
            markerEnd: useEndMarker ? `url('#markerEnd_${node.id}')` : undefined,
        };

        const [transforms, { translateX, translateY }] = Transforms.evaluate(node, context);

        const markerDefs: SVGDefinition[] = [];
        if (useStartMarker) {
            markerDefs.push({
                tag: "marker",
                attributes: {
                    id: `markerStart_${node.id}`,
                    markerUnits: "userSpaceOnUse",
                    markerWidth: "100%",
                    markerHeight: "100%",
                    overflow: "visible",
                    orient: markerAlign ? "auto-start-reverse" : undefined,
                },
                children: [markerStartShape],
            });
        }
        if (useEndMarker) {
            markerDefs.push({
                tag: "marker",
                attributes: {
                    id: `markerEnd_${node.id}`,
                    markerUnits: "userSpaceOnUse",
                    markerWidth: "100%",
                    markerHeight: "100%",
                    overflow: "visible",
                    orient: markerAlign ? "auto-start-reverse" : undefined,
                },
                children: [markerEndShape],
            });
        }

        return {
            kind: "shape",
            data: {
                tag: "path",
                transform: transforms.join(" "),
                attributes,
                definitions: markerDefs,
                preview: { x: -radius + translateX, y: -radius + translateY, w: 2 * radius, h: 2 * radius },
            },
        };
    }

    return null;
};

const ARC_SOCKET_TYPES: Record<string, string> = {
    radius: "length",
    arcMode: "enum",
    thetaStart: "angle",
    sweep: "angle",
    thetaFrom: "angle",
    thetaTo: "angle",
    pieSlice: "boolean",
    markerStartShape: "shape",
    markerEndShape: "shape",
    markerAlign: "boolean",
    strokeWidth: "length",
    strokeColor: "color",
    strokeCap: "enum",
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
};

const getSocketType = (_node: NodeDefinitions.NodeFor<ArcDefinition>, socketId: string, _side: "in" | "out"): string => ARC_SOCKET_TYPES[socketId] ?? "float";

export const ArcNodeType: NodeTypes.Type<"arc", ArcDefinition> = {
    type: "arc",
    displayName: "Arc",
    defaultLabel: "Arc",
    iconNode: <Icon shape={NODE_ICONS.arcShape.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.arcShape.Card} color={"var(--icon-flavour)"} />,
    category: "Shapes",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
