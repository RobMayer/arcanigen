import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
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

export type LineDefinition = {
    inputs: {
        startMode: DataTypes.Use<"enum">;
        startX: DataTypes.Use<"length">;
        startY: DataTypes.Use<"length">;
        startRadius: DataTypes.Use<"length">;
        startTheta: DataTypes.Use<"angle">;
        endMode: DataTypes.Use<"enum">;
        endX: DataTypes.Use<"length">;
        endY: DataTypes.Use<"length">;
        endRadius: DataTypes.Use<"length">;
        endTheta: DataTypes.Use<"angle">;
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
        startMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        startX: DataTypes.TypeOf<DataTypes.Use<"length">>;
        startY: DataTypes.TypeOf<DataTypes.Use<"length">>;
        startRadius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        startTheta: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        endMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        endX: DataTypes.TypeOf<DataTypes.Use<"length">>;
        endY: DataTypes.TypeOf<DataTypes.Use<"length">>;
        endRadius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        endTheta: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        markerAlign: DataTypes.TypeOf<DataTypes.Use<"boolean">>;
    } & Stylings.Definition["payload"] &
        Transforms.Definition["payload"];
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<LineDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"line", LineDefinition> => {
    return {
        id,
        in: {
            startMode: null,
            startX: null,
            startY: null,
            startRadius: null,
            startTheta: null,
            endMode: null,
            endX: null,
            endY: null,
            endRadius: null,
            endTheta: null,
            markerStartShape: null,
            markerEndShape: null,
            markerAlign: null,

            strokeWidth: null,
            strokeColor: null,
            strokeDash: null,
            strokeDashOffset: null,
            strokeCap: null,
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
            startMode: Enum.Common.positionMode.CARTESIAN.value,
            startX: "0px",
            startY: "0px",
            startRadius: "0px",
            startTheta: "0",
            endMode: Enum.Common.positionMode.CARTESIAN.value,
            endX: "100px",
            endY: "0px",
            endRadius: "100px",
            endTheta: "90",
            markerAlign: true,
            // stroke
            strokeWidth: "1px",
            strokeDash: "",
            strokeColor: { r: 0, g: 0, b: 0, a: 1 },
            strokeDashOffset: "0px",
            strokeCap: Enum.Common.strokeCap.BUTT.value,
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
        type: "line",
    };
};

const POSITION_MODE_OPTIONS = Enum.options(Enum.Common.positionMode);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<LineDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<LineDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const startIsCartesian = node.payload.startMode === Enum.Common.positionMode.CARTESIAN.value && node.in.startMode === null;
    const startIsPolar = node.payload.startMode === Enum.Common.positionMode.POLAR.value && node.in.startMode === null;
    const endIsCartesian = node.payload.endMode === Enum.Common.positionMode.CARTESIAN.value && node.in.endMode === null;
    const endIsPolar = node.payload.endMode === Enum.Common.positionMode.POLAR.value && node.in.endMode === null;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketOut node={node} socketId={"path"}>
                Path
            </SocketOut>

            <NodeAccordion label={"Start Point"} socketsIn={"startMode|startX|startY|startRadius|startTheta"} nodeId={node.id}>
                <SocketIn node={node} socketId={"startMode"} label={"Mode"}>
                    <RadioButton.Group
                        options={POSITION_MODE_OPTIONS}
                        value={`${node.payload.startMode}`}
                        onValue={(v) => handleUpdate({ startMode: Number(v) })}
                        orientation={"horizontal"}
                        disabled={node.in.startMode !== null}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"startX"} label={"X"}>
                    <LengthInput value={node.payload.startX} onCommit={(startX) => handleUpdate({ startX })} disabled={node.in.startX !== null || startIsPolar} required />
                </SocketIn>
                <SocketIn node={node} socketId={"startY"} label={"Y"}>
                    <LengthInput value={node.payload.startY} onCommit={(startY) => handleUpdate({ startY })} disabled={node.in.startY !== null || startIsPolar} required />
                </SocketIn>
                <SocketIn node={node} socketId={"startRadius"} label={"Radius"}>
                    <LengthInput value={node.payload.startRadius} onCommit={(startRadius) => handleUpdate({ startRadius })} disabled={node.in.startRadius !== null || startIsCartesian} required />
                </SocketIn>
                <SocketIn node={node} socketId={"startTheta"} label={"Theta"}>
                    <AngleInput.SliderInput value={node.payload.startTheta} onCommit={(startTheta) => handleUpdate({ startTheta })} disabled={node.in.startTheta !== null || startIsCartesian} />
                </SocketIn>
            </NodeAccordion>

            <NodeAccordion label={"End Point"} socketsIn={"endMode|endX|endY|endRadius|endTheta"} nodeId={node.id}>
                <SocketIn node={node} socketId={"endMode"} label={"Mode"}>
                    <RadioButton.Group
                        options={POSITION_MODE_OPTIONS}
                        value={`${node.payload.endMode}`}
                        onValue={(v) => handleUpdate({ endMode: Number(v) })}
                        orientation={"horizontal"}
                        disabled={node.in.endMode !== null}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"endX"} label={"X"}>
                    <LengthInput value={node.payload.endX} onCommit={(endX) => handleUpdate({ endX })} disabled={node.in.endX !== null || endIsPolar} required />
                </SocketIn>
                <SocketIn node={node} socketId={"endY"} label={"Y"}>
                    <LengthInput value={node.payload.endY} onCommit={(endY) => handleUpdate({ endY })} disabled={node.in.endY !== null || endIsPolar} required />
                </SocketIn>
                <SocketIn node={node} socketId={"endRadius"} label={"Radius"}>
                    <LengthInput value={node.payload.endRadius} onCommit={(endRadius) => handleUpdate({ endRadius })} disabled={node.in.endRadius !== null || endIsCartesian} required />
                </SocketIn>
                <SocketIn node={node} socketId={"endTheta"} label={"Theta"}>
                    <AngleInput.SliderInput value={node.payload.endTheta} onCommit={(endTheta) => handleUpdate({ endTheta })} disabled={node.in.endTheta !== null || endIsCartesian} />
                </SocketIn>
            </NodeAccordion>

            <NodeAccordion label={"Markers"} socketsIn={"markerStartShape|markerEndShape|markerAlign"} nodeId={node.id}>
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

            <Stylings.Controls node={node} handleUpdate={handleUpdate} accordion />
            <Transforms.Controls node={node} handleUpdate={handleUpdate} accordion />
        </TypicalNode>
    );
};

const GEOMETRY_INPUTS: (keyof LineDefinition["inputs"])[] = [
    "startMode",
    "startX",
    "startY",
    "startRadius",
    "startTheta",
    "endMode",
    "endX",
    "endY",
    "endRadius",
    "endTheta",
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
const STYLING_INPUTS: (keyof LineDefinition["inputs"])[] = ["strokeWidth", "strokeColor", "strokeCap", "strokeDash", "strokeDashOffset", "paintOrder"];

const dependsOn = (_node: NodeDefinitions.NodeFor<LineDefinition>, outSocket: keyof LineDefinition["outputs"], _deps: AllDeps): (keyof LineDefinition["inputs"])[] => {
    if (outSocket === "path") {
        return GEOMETRY_INPUTS;
    }
    return [...GEOMETRY_INPUTS, ...STYLING_INPUTS];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<LineDefinition>, inSocket: keyof LineDefinition["inputs"], _deps: AllDeps): (keyof LineDefinition["outputs"])[] => {
    if (STYLING_INPUTS.includes(inSocket)) {
        return ["output"];
    }
    return ["output", "path"];
};

/** Convert angle convention (0deg = top, CW positive) to radians for Math.cos/sin */
const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;

const resolvePoint = (mode: number, x: number, y: number, radius: number, theta: number): [number, number] => {
    if (mode === Enum.Common.positionMode.POLAR.value) {
        const thetaRad = toRad(theta);
        return [radius * Math.cos(thetaRad), radius * Math.sin(thetaRad)];
    }
    return [x, y];
};

const evaluate = (node: NodeDefinitions.NodeFor<LineDefinition>, socket: keyof LineDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const startMode = Enum.resolve(context.resolve<"enum">(node.id, "startMode")?.data, Enum.Common.positionMode) ?? node.payload.startMode;
    const startX = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "startX")?.data ?? node.payload.startX) ?? 0;
    const startY = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "startY")?.data ?? node.payload.startY) ?? 0;
    const startRadius = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "startRadius")?.data ?? node.payload.startRadius) ?? 0;
    const startTheta = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "startTheta")?.data ?? node.payload.startTheta) ?? 0;

    const endMode = Enum.resolve(context.resolve<"enum">(node.id, "endMode")?.data, Enum.Common.positionMode) ?? node.payload.endMode;
    const endX = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "endX")?.data ?? node.payload.endX) ?? 0;
    const endY = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "endY")?.data ?? node.payload.endY) ?? 0;
    const endRadius = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "endRadius")?.data ?? node.payload.endRadius) ?? 0;
    const endTheta = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "endTheta")?.data ?? node.payload.endTheta) ?? 0;

    const [sx, sy] = resolvePoint(startMode, startX, startY, startRadius, startTheta);
    const [ex, ey] = resolvePoint(endMode, endX, endY, endRadius, endTheta);

    if (sx === ex && sy === ey) {
        return null;
    }

    const d = `M ${sx},${sy} L ${ex},${ey}`;
    const [transforms, { translateX, translateY }] = Transforms.evaluate(node, context);

    if (socket === "path") {
        const minX = Math.min(sx, ex);
        const minY = Math.min(sy, ey);
        const maxX = Math.max(sx, ex);
        const maxY = Math.max(sy, ey);
        return {
            kind: "path",
            data: { d, transform: transforms.join(" "), preview: { x: minX + translateX, y: minY + translateY, w: maxX - minX, h: maxY - minY } },
        };
    }

    if (socket === "output") {
        const paint = Stylings.evaluate(node, context);
        paint.fill = null;

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

        const minX = Math.min(sx, ex);
        const minY = Math.min(sy, ey);
        const maxX = Math.max(sx, ex);
        const maxY = Math.max(sy, ey);

        return {
            kind: "shape",
            data: {
                type: "path",
                d,
                paint,
                markers,
                transform: transforms.join(" "),
                preview: { x: minX + translateX, y: minY + translateY, w: maxX - minX, h: maxY - minY },
            },
        };
    }

    return null;
};

const SOCKETTYPES_IN: { [key in keyof Required<LineDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    startMode: { types: ["enum"], mode: "or" },
    startX: { types: ["length"], mode: "or" },
    startY: { types: ["length"], mode: "or" },
    startRadius: { types: ["length"], mode: "or" },
    startTheta: { types: ["angle"], mode: "or" },
    endMode: { types: ["enum"], mode: "or" },
    endX: { types: ["length"], mode: "or" },
    endY: { types: ["length"], mode: "or" },
    endRadius: { types: ["length"], mode: "or" },
    endTheta: { types: ["angle"], mode: "or" },
    markerStartShape: { types: ["shape"], mode: "or" },
    markerEndShape: { types: ["shape"], mode: "or" },
    markerAlign: { types: ["boolean"], mode: "or" },
    ...Stylings.IN_SOCKET_TYPES,
    ...Transforms.IN_SOCKET_TYPES,
};

const SOCKETTYPES_OUT: { [key in keyof Required<LineDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["shape"], mode: "and" },
    path: { types: ["path"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<LineDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const LineNodeType: NodeTypes.Type<"line", LineDefinition> = {
    type: "line",
    displayName: "Line",
    defaultLabel: "Line",
    iconNode: <NodeIcon shape={NODE_ICONS.shapeLine} />,
    flavour: "confirm",
    category: "Shapes",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
