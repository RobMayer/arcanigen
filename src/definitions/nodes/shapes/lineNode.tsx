import { nanoid } from "nanoid";
import styled from "styled-components";
import { Icon, ICONS, NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { StylingPrefab } from "../../helpers/stylingPrefab";
import { TransformPrefab } from "../../helpers/transformPrefab";
import { PointHelper } from "../../helpers/pointHelper";
import { LoopButton } from "../../../components/buttons/LoopButton";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { NumericString } from "../../datatypes/numericString";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: {
        startPoint: "point",
        endPoint: "point",
        markerStartShape: "shape",
        markerEndShape: "shape",
        markerAlign: "boolean",
        ...TransformPrefab.SIG_IN,
        ...StylingPrefab.SIG_IN,
    },
    out: { output: "shape", path: "path" },
});

export type LineDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        startMode: DataTypes.TypeOf<DataTypes.Enum>;
        startX: DataTypes.TypeOf<DataTypes.Length>;
        startY: DataTypes.TypeOf<DataTypes.Length>;
        startRadius: DataTypes.TypeOf<DataTypes.Length>;
        startTheta: DataTypes.TypeOf<DataTypes.Angle>;
        endMode: DataTypes.TypeOf<DataTypes.Enum>;
        endX: DataTypes.TypeOf<DataTypes.Length>;
        endY: DataTypes.TypeOf<DataTypes.Length>;
        endRadius: DataTypes.TypeOf<DataTypes.Length>;
        endTheta: DataTypes.TypeOf<DataTypes.Angle>;
        markerAlign: DataTypes.TypeOf<DataTypes.Boolean>;
    } & StylingPrefab.Definition["payload"] &
        TransformPrefab.Definition["payload"]
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<LineDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"line", LineDefinition> => {
    return {
        id,
        in: {
            startPoint: null,
            endPoint: null,
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
            position: null,
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
            startTheta: "0deg",
            endMode: Enum.Common.positionMode.CARTESIAN.value,
            endX: "100px",
            endY: "0px",
            endRadius: "100px",
            endTheta: "90deg",
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
            positionTheta: "0deg",
            rotation: "0deg",
        },
        type: "line",
    };
};

const MODE_OPTIONS = [
    { value: `${Enum.Common.positionMode.CARTESIAN.value}`, label: <Icon shape={ICONS.Coordinates.Cartesian} /> },
    { value: `${Enum.Common.positionMode.POLAR.value}`, label: <Icon shape={ICONS.Coordinates.Polar} /> },
];

const PointRow = styled.div`
    display: flex;
    align-items: center;
    gap: 3px;
    width: 100%;

    & > .pointField {
        flex: 1 1 0;
        width: 0;
        min-width: 0;
    }
`;

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<LineDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<LineDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const startIsPolar = node.payload.startMode === Enum.Common.positionMode.POLAR.value;
    const startConnected = node.in.startPoint !== null;
    const endIsPolar = node.payload.endMode === Enum.Common.positionMode.POLAR.value;
    const endConnected = node.in.endPoint !== null;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketOut node={node} socketId={"path"}>
                Path
            </SocketOut>

            <NodeAccordion label={"Start Point"} socketsIn={"startPoint"} nodeId={node.id}>
                <SocketIn node={node} socketId={"startPoint"} label={"Point"}>
                    <PointRow>
                        <LoopButton.Lite value={`${node.payload.startMode}`} options={MODE_OPTIONS} onValue={(v) => handleUpdate({ startMode: Number(v) })} disabled={startConnected} />
                        {startIsPolar ? (
                            <>
                                <LengthInput className={"pointField"} value={node.payload.startRadius} onCommit={(startRadius) => handleUpdate({ startRadius })} disabled={startConnected} required />
                                <AngleInput className={"pointField"} value={node.payload.startTheta} onCommit={(startTheta) => handleUpdate({ startTheta })} disabled={startConnected} />
                            </>
                        ) : (
                            <>
                                <LengthInput className={"pointField"} value={node.payload.startX} onCommit={(startX) => handleUpdate({ startX })} disabled={startConnected} required />
                                <LengthInput className={"pointField"} value={node.payload.startY} onCommit={(startY) => handleUpdate({ startY })} disabled={startConnected} required />
                            </>
                        )}
                    </PointRow>
                </SocketIn>
            </NodeAccordion>

            <NodeAccordion label={"End Point"} socketsIn={"endPoint"} nodeId={node.id}>
                <SocketIn node={node} socketId={"endPoint"} label={"Point"}>
                    <PointRow>
                        <LoopButton.Lite value={`${node.payload.endMode}`} options={MODE_OPTIONS} onValue={(v) => handleUpdate({ endMode: Number(v) })} disabled={endConnected} />
                        {endIsPolar ? (
                            <>
                                <LengthInput className={"pointField"} value={node.payload.endRadius} onCommit={(endRadius) => handleUpdate({ endRadius })} disabled={endConnected} required />
                                <AngleInput className={"pointField"} value={node.payload.endTheta} onCommit={(endTheta) => handleUpdate({ endTheta })} disabled={endConnected} />
                            </>
                        ) : (
                            <>
                                <LengthInput className={"pointField"} value={node.payload.endX} onCommit={(endX) => handleUpdate({ endX })} disabled={endConnected} required />
                                <LengthInput className={"pointField"} value={node.payload.endY} onCommit={(endY) => handleUpdate({ endY })} disabled={endConnected} required />
                            </>
                        )}
                    </PointRow>
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

            <StylingPrefab.Controls node={node} handleUpdate={handleUpdate} accordion />
            <TransformPrefab.Controls node={node} handleUpdate={handleUpdate} accordion />
        </TypicalNode>
    );
};

const GEOMETRY_INPUTS: (keyof LineDefinition["inputs"])[] = [
    "startPoint",
    "endPoint",
    "markerStartShape",
    "markerEndShape",
    "markerAlign",
    "position",
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

const evaluate = (node: NodeDefinitions.NodeFor<LineDefinition>, socket: keyof LineDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const start =
        context.resolve<DataTypes.Point>(node.id, "startPoint")?.data ??
        PointHelper.resolve(node.payload.startMode, node.payload.startX, node.payload.startY, node.payload.startRadius, node.payload.startTheta);
    const end =
        context.resolve<DataTypes.Point>(node.id, "endPoint")?.data ??
        PointHelper.resolve(node.payload.endMode, node.payload.endX, node.payload.endY, node.payload.endRadius, node.payload.endTheta);

    const { x: sx, y: sy } = start;
    const { x: ex, y: ey } = end;

    if (sx === ex && sy === ey) {
        return null;
    }

    const d = `M ${sx},${sy} L ${ex},${ey}`;
    const [transforms, { translateX, translateY }] = TransformPrefab.evaluate(node, context);

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
        const paint = StylingPrefab.evaluate(node, context);
        paint.fill = null;

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
    signature: def.instance,
    ...SignatureEngine.hooks,
};
