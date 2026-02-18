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
import { deg2rad, delerp, distroInterpolator, lerp } from "../../../util/misc";
import { Stylings, Transforms } from "./abstract";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { SVGDefinition, SVGMember } from "../../../types";

export type BurstDefinition = {
    inputs: {
        spurCount: DataTypes.Use<"integer">;
        radius: DataTypes.Use<"length">;
        spread: DataTypes.Use<"length">;
        innerRadius: DataTypes.Use<"length">;
        outerRadius: DataTypes.Use<"length">;
        spanMode: DataTypes.Use<"enum">;
        spreadAlign: DataTypes.Use<"enum">;
        thetaMode: DataTypes.Use<"enum">;
        thetaStart: DataTypes.Use<"angle">;
        thetaEnd: DataTypes.Use<"angle">;
        thetaSteps: DataTypes.Use<"angle">;
        thetaInclusive: DataTypes.Use<"boolean">;
        thetaCurve: DataTypes.Use<"distribution">;
        markerStart: DataTypes.Use<"shape">;
        markerEnd: DataTypes.Use<"shape">;
        markerAlign: DataTypes.Use<"boolean">;
    } & Stylings.Definition["inputs"] &
        Transforms.Definition["inputs"];
    outputs: {
        output: DataTypes.Use<"shape">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        spurCount: DataTypes.TypeOf<DataTypes.Use<"integer">>;
        spanMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        spreadAlign: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        radius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        spread: DataTypes.TypeOf<DataTypes.Use<"length">>;
        innerRadius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        outerRadius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        thetaMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        thetaStart: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        thetaEnd: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        thetaSteps: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        thetaInclusive: DataTypes.TypeOf<DataTypes.Use<"boolean">>;
        markerAlign: DataTypes.TypeOf<DataTypes.Use<"boolean">>;
    } & Stylings.Definition["payload"] &
        Transforms.Definition["payload"];
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<BurstDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"burst", BurstDefinition> => {
    return {
        id,
        in: {
            spurCount: null,
            radius: null,
            spread: null,
            innerRadius: null,
            outerRadius: null,
            spanMode: null,
            spreadAlign: null,
            thetaMode: null,
            thetaStart: null,
            thetaEnd: null,
            thetaSteps: null,
            thetaInclusive: null,
            thetaCurve: null,

            markerStart: null,
            markerEnd: null,
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
            spurCount: "5",
            spanMode: Enum.Common.spanMode.InnerOuter,
            spreadAlign: 0,
            radius: "150px",
            spread: "20px",
            innerRadius: "140px",
            outerRadius: "160px",
            thetaMode: Enum.Common.thetaMode.Incremental,
            thetaStart: "0",
            thetaEnd: "90",
            thetaSteps: "30",
            thetaInclusive: false,
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
        type: "burst",
    };
};

const SPAN_MODE_OPTIONS = Enum.options(Enum.Common.spanMode);
const THETA_MODE_OPTIONS = Enum.options(Enum.Common.thetaMode);
const SPREAD_ALIGN_OPTIONS = Enum.options(Enum.Common.spreadAlign);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<BurstDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<BurstDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const isInOut = node.payload.spanMode === 0 && node.in.spanMode === null;
    const isSpread = node.payload.spanMode === 1 && node.in.spanMode === null;
    const isStartStop = node.payload.thetaMode === 0 && node.in.thetaMode === null;
    const isIncremental = node.payload.thetaMode === 1 && node.in.thetaMode === null;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"shape"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"spurCount"} type={"integer"} label={"Spurs"}>
                <IntegerInput value={node.payload.spurCount} onCommit={(spurCount) => handleUpdate({ spurCount })} disabled={node.in.spurCount !== null} min={"0"} required />
            </SocketIn>

            <SocketIn node={node} socketId={"spanMode"} type={"enum"} label={"Radial Mode"}>
                <RadioButton.Group
                    options={SPAN_MODE_OPTIONS}
                    value={`${node.payload.spanMode}`}
                    onValue={(v) => handleUpdate({ spanMode: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.spanMode !== null}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"innerRadius"} type={"length"} label={"Inner Radius"}>
                <LengthInput value={node.payload.innerRadius} onCommit={(innerRadius) => handleUpdate({ innerRadius })} disabled={node.in.innerRadius !== null || isSpread} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"outerRadius"} type={"length"} label={"Outer Radius"}>
                <LengthInput value={node.payload.outerRadius} onCommit={(outerRadius) => handleUpdate({ outerRadius })} disabled={node.in.outerRadius !== null || isSpread} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"radius"} type={"length"} label={"Radius"}>
                <LengthInput value={node.payload.radius} onCommit={(radius) => handleUpdate({ radius })} disabled={node.in.radius !== null || isInOut} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"spread"} type={"length"} label={"Spread"}>
                <LengthInput value={node.payload.spread} onCommit={(spread) => handleUpdate({ spread })} disabled={node.in.spread !== null || isInOut} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"spreadAlign"} type={"enum"} label={"Spread Align"}>
                <RadioButton.Group
                    options={SPREAD_ALIGN_OPTIONS}
                    value={`${node.payload.spreadAlign}`}
                    onValue={(v) => handleUpdate({ spreadAlign: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.spreadAlign !== null || isInOut}
                />
            </SocketIn>

            <hr />
            <SocketIn node={node} socketId={"thetaMode"} type={"enum"} label={"Theta Mode"}>
                <RadioButton.Group
                    options={THETA_MODE_OPTIONS}
                    value={`${node.payload.thetaMode}`}
                    onValue={(v) => handleUpdate({ thetaMode: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.thetaMode !== null}
                />
            </SocketIn>

            <SocketIn node={node} socketId={"thetaStart"} type={"angle"} label={"Start Theta"}>
                <AngleInput.SliderInput value={node.payload.thetaStart} onCommit={(thetaStart) => handleUpdate({ thetaStart })} disabled={node.in.thetaStart !== null || isIncremental} unbound />
            </SocketIn>
            <SocketIn node={node} socketId={"thetaEnd"} type={"angle"} label={"End Theta"}>
                <AngleInput.SliderInput value={node.payload.thetaEnd} onCommit={(thetaEnd) => handleUpdate({ thetaEnd })} disabled={node.in.thetaEnd !== null || isIncremental} unbound />
            </SocketIn>
            <SocketIn node={node} socketId={"thetaInclusive"} type={"boolean"}>
                <CheckBox checked={node.payload.thetaInclusive} onToggle={(thetaInclusive) => handleUpdate({ thetaInclusive })} disabled={node.in.thetaInclusive !== null || isIncremental}>
                    Inclusive End
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"thetaSteps"} type={"angle"} label={"Step Theta"}>
                <AngleInput.SliderInput value={node.payload.thetaSteps} onCommit={(thetaSteps) => handleUpdate({ thetaSteps })} disabled={node.in.thetaSteps !== null || isStartStop} unbound />
            </SocketIn>
            <SocketIn node={node} socketId={"thetaCurve"} type={"distribution"}>
                Angular Distribution
            </SocketIn>

            <NodeAccordion label={"More"} socketsIn={"markerStart|markerEnd|markerAlign"} nodeId={node.id}>
                <SocketIn node={node} socketId={"markerStart"} type={"shape"}>
                    Marker Start
                </SocketIn>
                <SocketIn node={node} socketId={"markerEnd"} type={"shape"}>
                    Marker End
                </SocketIn>
                <SocketIn node={node} socketId={"markerAlign"} type={"boolean"}>
                    <CheckBox checked={node.payload.markerAlign} onToggle={(markerAlign) => handleUpdate({ markerAlign })} disabled={node.in.markerAlign !== null}>
                        Align Markers
                    </CheckBox>
                </SocketIn>
            </NodeAccordion>
            <Stylings.Controls node={node} handleUpdate={handleUpdate} accordion />
            <Transforms.Controls node={node} handleUpdate={handleUpdate} accordion />
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<BurstDefinition>, _outSocket: keyof BurstDefinition["outputs"], _deps: AllDeps): (keyof BurstDefinition["inputs"])[] => {
    return [
        "spurCount",
        "radius",
        "spread",
        "innerRadius",
        "outerRadius",
        "spanMode",
        "spreadAlign",
        "thetaMode",
        "thetaStart",
        "thetaEnd",
        "thetaSteps",
        "thetaInclusive",
        "thetaCurve",
        "markerStart",
        "markerEnd",
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

const contributesTo = (_node: NodeDefinitions.NodeFor<BurstDefinition>, _inSocket: keyof BurstDefinition["inputs"], _deps: AllDeps): (keyof BurstDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<BurstDefinition>, socket: keyof BurstDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const spurCount = NumericString.Emptyable.asNumber(context.resolve<"integer">(node.id, "spurCount")?.data ?? node.payload.spurCount) ?? null;
        if (spurCount === null || spurCount <= 0) return null;

        const N = spurCount;
        const spanMode = context.resolve<"enum">(node.id, "spanMode")?.data ?? node.payload.spanMode ?? 0;

        let rI: number;
        let rO: number;

        if (spanMode === Enum.Common.spanMode.InnerOuter) {
            rI = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "innerRadius")?.data ?? node.payload.innerRadius, "0px")) ?? 0;
            rO = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "outerRadius")?.data ?? node.payload.outerRadius, "0px")) ?? 0;
        } else {
            const radius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "radius")?.data ?? node.payload.radius, "0px")) ?? 0;
            const spread = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "spread")?.data ?? node.payload.spread, "0px")) ?? 0;
            if (!radius) return null;

            const spreadAlign = context.resolve<"enum">(node.id, "spreadAlign")?.data ?? node.payload.spreadAlign ?? 0;

            const tIMod = spreadAlign === Enum.Common.spreadAlign.Center ? spread / 2 : spreadAlign === Enum.Common.spreadAlign.Inward ? spread : 0;
            const tOMod = spreadAlign === Enum.Common.spreadAlign.Center ? spread / 2 : spreadAlign === Enum.Common.spreadAlign.Outward ? spread : 0;

            rI = radius - tIMod;
            rO = radius + tOMod;
        }

        if (rO <= 0) return null;
        rI = Math.max(0, rI);

        // Theta parameters
        const thetaMode = context.resolve<"enum">(node.id, "thetaMode")?.data ?? node.payload.thetaMode ?? 0;
        const thetaStart = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "thetaStart")?.data ?? node.payload.thetaStart) ?? 0;
        const thetaEnd = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "thetaEnd")?.data ?? node.payload.thetaEnd) ?? 0;
        const thetaSteps = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "thetaSteps")?.data ?? node.payload.thetaSteps) ?? 0;
        const thetaInclusive = context.resolve<"boolean">(node.id, "thetaInclusive")?.data ?? node.payload.thetaInclusive ?? false;

        // Distribution curve
        const distro = context.resolve<"distribution">(node.id, "thetaCurve")?.data ?? { func: Enum.Common.distroFunctions.Linear, easing: Enum.Common.distroEasing.In, intensity: "1" };
        const distroLerper = distroInterpolator(
            Enum.keyOf(Enum.Common.distroFunctions, distro.func),
            Enum.keyOf(Enum.Common.distroEasing, distro.easing),
            NumericString.Emptyable.asNumber(distro.intensity) ?? 1,
        );

        // Markers
        const markerStartShape = context.resolve<"shape">(node.id, "markerStart")?.data;
        const markerEndShape = context.resolve<"shape">(node.id, "markerEnd")?.data;
        const markerAlign = context.resolve<"boolean">(node.id, "markerAlign")?.data ?? node.payload.markerAlign ?? false;

        // Generate line elements
        const denominator = thetaInclusive ? Math.max(1, N - 1) : N;
        const lines: SVGMember[] = [];
        for (let i = 0; i < N; i++) {
            const coeff = delerp(i, 0, denominator);
            const angle = thetaMode === Enum.Common.thetaMode.StartStop ? lerp(coeff, thetaStart, thetaEnd, distroLerper) : lerp(coeff, 0, N * thetaSteps, distroLerper);
            const c = Math.cos(deg2rad(angle - 90));
            const s = Math.sin(deg2rad(angle - 90));
            lines.push({
                tag: "line",
                attributes: {
                    x1: `${rI * c}`,
                    y1: `${rI * s}`,
                    x2: `${rO * c}`,
                    y2: `${rO * s}`,
                },
            });
        }

        // Stroke + marker attributes go on the parent <g>, inherited by each <line>
        const attributes: Record<string, string | undefined> = {
            ...Stylings.evaluate(node, context),
            markerStart: markerStartShape ? `url('#marker_start_${node.id}')` : undefined,
            markerEnd: markerEndShape ? `url('#marker_end_${node.id}')` : undefined,
        };

        const [transforms, { translateX, translateY }] = Transforms.evaluate(node, context);

        const markerDefs: (SVGDefinition | null)[] = [
            markerStartShape
                ? {
                      tag: "marker" as const,
                      attributes: {
                          id: `marker_start_${node.id}`,
                          markerUnits: "userSpaceOnUse",
                          markerWidth: "100%",
                          markerHeight: "100%",
                          overflow: "visible",
                          orient: markerAlign ? "auto-start-reverse" : undefined,
                      },
                      children: [markerStartShape],
                  }
                : null,
            markerEndShape
                ? {
                      tag: "marker" as const,
                      attributes: {
                          id: `marker_end_${node.id}`,
                          markerUnits: "userSpaceOnUse",
                          markerWidth: "100%",
                          markerHeight: "100%",
                          overflow: "visible",
                          orient: markerAlign ? "auto-start-reverse" : undefined,
                      },
                      children: [markerEndShape],
                  }
                : null,
        ];

        return {
            kind: "shape",
            data: {
                tag: "g",
                transform: transforms.join(" "),
                attributes,
                definitions: markerDefs,
                children: lines,
                preview: { x: -rO + translateX, y: -rO + translateY, w: 2 * rO, h: 2 * rO },
            },
        };
    }

    return null;
};

const BURST_SOCKET_TYPES: Record<string, string> = {
    spurCount: "integer",
    radius: "length",
    spread: "length",
    innerRadius: "length",
    outerRadius: "length",
    spanMode: "enum",
    spreadAlign: "enum",
    thetaMode: "enum",
    thetaStart: "angle",
    thetaEnd: "angle",
    thetaSteps: "angle",
    thetaInclusive: "boolean",
    thetaCurve: "distribution",
    markerStart: "shape",
    markerEnd: "shape",
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

const getSocketType = (_node: NodeDefinitions.NodeFor<BurstDefinition>, socketId: string, _side: "in" | "out"): string => BURST_SOCKET_TYPES[socketId] ?? "float";

export const BurstNodeType: NodeTypes.Type<"burst", BurstDefinition> = {
    type: "burst",
    displayName: "Burst",
    defaultLabel: "Burst",
    iconNode: <Icon shape={NODE_ICONS.burstShape.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.burstShape.Card} color={"var(--icon-flavour)"} />,
    category: "Shapes",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
