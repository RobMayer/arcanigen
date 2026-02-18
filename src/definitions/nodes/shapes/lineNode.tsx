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
import { SVGDefinition, SVGShape } from "../../../types";

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
            startMode: Enum.Common.positionMode.Cartesian,
            startX: "0px",
            startY: "0px",
            startRadius: "0px",
            startTheta: "0",
            endMode: Enum.Common.positionMode.Cartesian,
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
            strokeCap: Enum.Common.strokeCap.Butt,
            paintOrder: 0,
            // transforms
            positionMode: Enum.Common.positionMode.Cartesian,
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

    const startIsCartesian = node.payload.startMode === Enum.Common.positionMode.Cartesian && node.in.startMode === null;
    const startIsPolar = node.payload.startMode === Enum.Common.positionMode.Polar && node.in.startMode === null;
    const endIsCartesian = node.payload.endMode === Enum.Common.positionMode.Cartesian && node.in.endMode === null;
    const endIsPolar = node.payload.endMode === Enum.Common.positionMode.Polar && node.in.endMode === null;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"shape"}>
                Output
            </SocketOut>

            <NodeAccordion label={"Start Point"} socketsIn={"startMode|startX|startY|startRadius|startTheta"} nodeId={node.id}>
                <SocketIn node={node} socketId={"startMode"} type={"enum"} label={"Mode"}>
                    <RadioButton.Group
                        options={POSITION_MODE_OPTIONS}
                        value={`${node.payload.startMode}`}
                        onValue={(v) => handleUpdate({ startMode: Number(v) })}
                        orientation={"horizontal"}
                        disabled={node.in.startMode !== null}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"startX"} type={"length"} label={"X"}>
                    <LengthInput value={node.payload.startX} onCommit={(startX) => handleUpdate({ startX })} disabled={node.in.startX !== null || startIsPolar} required />
                </SocketIn>
                <SocketIn node={node} socketId={"startY"} type={"length"} label={"Y"}>
                    <LengthInput value={node.payload.startY} onCommit={(startY) => handleUpdate({ startY })} disabled={node.in.startY !== null || startIsPolar} required />
                </SocketIn>
                <SocketIn node={node} socketId={"startRadius"} type={"length"} label={"Radius"}>
                    <LengthInput value={node.payload.startRadius} onCommit={(startRadius) => handleUpdate({ startRadius })} disabled={node.in.startRadius !== null || startIsCartesian} required />
                </SocketIn>
                <SocketIn node={node} socketId={"startTheta"} type={"angle"} label={"Theta"}>
                    <AngleInput.SliderInput value={node.payload.startTheta} onCommit={(startTheta) => handleUpdate({ startTheta })} disabled={node.in.startTheta !== null || startIsCartesian} />
                </SocketIn>
            </NodeAccordion>

            <NodeAccordion label={"End Point"} socketsIn={"endMode|endX|endY|endRadius|endTheta"} nodeId={node.id}>
                <SocketIn node={node} socketId={"endMode"} type={"enum"} label={"Mode"}>
                    <RadioButton.Group
                        options={POSITION_MODE_OPTIONS}
                        value={`${node.payload.endMode}`}
                        onValue={(v) => handleUpdate({ endMode: Number(v) })}
                        orientation={"horizontal"}
                        disabled={node.in.endMode !== null}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"endX"} type={"length"} label={"X"}>
                    <LengthInput value={node.payload.endX} onCommit={(endX) => handleUpdate({ endX })} disabled={node.in.endX !== null || endIsPolar} required />
                </SocketIn>
                <SocketIn node={node} socketId={"endY"} type={"length"} label={"Y"}>
                    <LengthInput value={node.payload.endY} onCommit={(endY) => handleUpdate({ endY })} disabled={node.in.endY !== null || endIsPolar} required />
                </SocketIn>
                <SocketIn node={node} socketId={"endRadius"} type={"length"} label={"Radius"}>
                    <LengthInput value={node.payload.endRadius} onCommit={(endRadius) => handleUpdate({ endRadius })} disabled={node.in.endRadius !== null || endIsCartesian} required />
                </SocketIn>
                <SocketIn node={node} socketId={"endTheta"} type={"angle"} label={"Theta"}>
                    <AngleInput.SliderInput value={node.payload.endTheta} onCommit={(endTheta) => handleUpdate({ endTheta })} disabled={node.in.endTheta !== null || endIsCartesian} />
                </SocketIn>
            </NodeAccordion>

            <NodeAccordion label={"Markers"} socketsIn={"markerStartShape|markerEndShape|markerAlign"} nodeId={node.id}>
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

            <Stylings.Controls node={node} handleUpdate={handleUpdate} accordion />
            <Transforms.Controls node={node} handleUpdate={handleUpdate} accordion />
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<LineDefinition>, _outSocket: keyof LineDefinition["outputs"], _deps: AllDeps): (keyof LineDefinition["inputs"])[] => {
    return [
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
        "strokeWidth",
        "strokeColor",
        "strokeCap",
        "strokeDash",
        "strokeDashOffset",
        "paintOrder",
        "positionMode",
        "positionX",
        "positionY",
        "positionRadius",
        "positionTheta",
        "rotation",
    ];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<LineDefinition>, _inSocket: keyof LineDefinition["inputs"], _deps: AllDeps): (keyof LineDefinition["outputs"])[] => {
    return ["output"];
};

/** Convert angle convention (0deg = top, CW positive) to radians for Math.cos/sin */
const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;

const resolvePoint = (mode: number, x: number, y: number, radius: number, theta: number): [number, number] => {
    if (mode === Enum.Common.positionMode.Polar) {
        const thetaRad = toRad(theta);
        return [radius * Math.cos(thetaRad), radius * Math.sin(thetaRad)];
    }
    return [x, y];
};

const evaluate = (node: NodeDefinitions.NodeFor<LineDefinition>, socket: keyof LineDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        // Resolve start point
        const startMode = context.resolve<"enum">(node.id, "startMode")?.data ?? node.payload.startMode;
        const startX = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "startX")?.data ?? node.payload.startX) ?? 0;
        const startY = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "startY")?.data ?? node.payload.startY) ?? 0;
        const startRadius = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "startRadius")?.data ?? node.payload.startRadius) ?? 0;
        const startTheta = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "startTheta")?.data ?? node.payload.startTheta) ?? 0;

        // Resolve end point
        const endMode = context.resolve<"enum">(node.id, "endMode")?.data ?? node.payload.endMode;
        const endX = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "endX")?.data ?? node.payload.endX) ?? 0;
        const endY = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "endY")?.data ?? node.payload.endY) ?? 0;
        const endRadius = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "endRadius")?.data ?? node.payload.endRadius) ?? 0;
        const endTheta = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "endTheta")?.data ?? node.payload.endTheta) ?? 0;

        const [sx, sy] = resolvePoint(startMode, startX, startY, startRadius, startTheta);
        const [ex, ey] = resolvePoint(endMode, endX, endY, endRadius, endTheta);

        // Degenerate line (zero length)
        if (sx === ex && sy === ey) {
            return null;
        }

        const d = `M ${sx},${sy} L ${ex},${ey}`;

        const stylingAttrs = Stylings.evaluate(node, context);
        stylingAttrs.fill = "none";

        const markerStartShape = context.resolve<"shape">(node.id, "markerStartShape")?.data;
        const markerEndShape = context.resolve<"shape">(node.id, "markerEndShape")?.data;
        const markerAlign = context.resolve<"boolean">(node.id, "markerAlign")?.data ?? node.payload.markerAlign ?? false;

        const attributes: Record<string, string | undefined> = {
            d,
            ...stylingAttrs,
            markerStart: markerStartShape ? `url('#markerStart_${node.id}')` : undefined,
            markerEnd: markerEndShape ? `url('#markerEnd_${node.id}')` : undefined,
        };

        const [transforms, { translateX, translateY }] = Transforms.evaluate(node, context);

        const markerDefs: SVGDefinition[] = [];
        if (markerStartShape) {
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
        if (markerEndShape) {
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

        const minX = Math.min(sx, ex);
        const minY = Math.min(sy, ey);
        const maxX = Math.max(sx, ex);
        const maxY = Math.max(sy, ey);

        const pathElement: SVGShape = {
            tag: "path",
            attributes,
            children: [],
            transform: transforms.join(" "),
            definitions: markerDefs,
            preview: { x: minX + translateX, y: minY + translateY, w: maxX - minX, h: maxY - minY },
        };

        return {
            kind: "shape",
            data: pathElement,
        };
    }

    return null;
};

const LINE_SOCKET_TYPES: Record<string, string> = {
    startMode: "enum",
    startX: "length",
    startY: "length",
    startRadius: "length",
    startTheta: "angle",
    endMode: "enum",
    endX: "length",
    endY: "length",
    endRadius: "length",
    endTheta: "angle",
    markerStartShape: "shape",
    markerEndShape: "shape",
    markerAlign: "boolean",
    strokeWidth: "length",
    strokeColor: "color",
    strokeCap: "enum",
    strokeDash: "tokens<length>",
    strokeDashOffset: "length",
    paintOrder: "enum",
    positionMode: "enum",
    positionX: "length",
    positionY: "length",
    positionRadius: "length",
    positionTheta: "angle",
    rotation: "angle",
    output: "shape",
};

const getSocketType = (_node: NodeDefinitions.NodeFor<LineDefinition>, socketId: string, _side: "in" | "out"): string => LINE_SOCKET_TYPES[socketId] ?? "float";

export const LineNodeType: NodeTypes.Type<"line", LineDefinition> = {
    type: "line",
    displayName: "Line",
    defaultLabel: "Line",
    iconNode: <Icon shape={NODE_ICONS.segmentShape.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.segmentShape.Card} color={"var(--icon-flavour)"} />,
    category: "Shapes",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
