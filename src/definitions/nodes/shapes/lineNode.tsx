import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { PointInput } from "../../../components/inputs/PointInput";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { StylingPrefab } from "../../helpers/stylingPrefab";
import { TransformPrefab } from "../../helpers/transformPrefab";
import { PointHelper } from "../../helpers/pointHelper";
import { CheckBox } from "../../../components/buttons/CheckBox";
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
        start: PointInput.Value;
        end: PointInput.Value;
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
            start: { ...PointInput.DEFAULT },
            end: { mode: Enum.Common.positionMode.CARTESIAN.value, x: "100px", y: "0px", radius: "100px", theta: "90deg" },
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
            position: { ...TransformPrefab.POSITION_DEFAULT },
            rotation: "0deg",
        },
        type: "line",
    };
};

const Controls =({ node, methods }: { node: NodeDefinitions.NodeFor<LineDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<LineDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const startConnected = node.in.startPoint !== null;
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
                    <PointInput value={node.payload.start} onChange={(v) => handleUpdate({ start: { ...node.payload.start, ...v } })} disabled={startConnected} />
                </SocketIn>
            </NodeAccordion>

            <NodeAccordion label={"End Point"} socketsIn={"endPoint"} nodeId={node.id}>
                <SocketIn node={node} socketId={"endPoint"} label={"Point"}>
                    <PointInput value={node.payload.end} onChange={(v) => handleUpdate({ end: { ...node.payload.end, ...v } })} disabled={endConnected} />
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
    const start = context.resolve<DataTypes.Point>(node.id, "startPoint")?.data ?? PointHelper.fromAuthoring(node.payload.start);
    const end = context.resolve<DataTypes.Point>(node.id, "endPoint")?.data ?? PointHelper.fromAuthoring(node.payload.end);

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
