import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
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
import { RadioButton } from "../../../components/buttons/RadioButton";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: {
        width: "length",
        height: "length",
        cornerRadius: "length",
        cornerShape: "enum",
        markerShape: "shape",
        markerAlign: "boolean",
        ...TransformPrefab.SIG_IN,
        ...StylingPrefab.SIG_IN,
        ...StylingPrefab.SIG_FILL,
        ...StylingPrefab.SIG_JOIN,
    },
    out: { output: "shape", path: "path" },
});

export type RectangleDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        width: DataTypes.TypeOf<DataTypes.Length>;
        height: DataTypes.TypeOf<DataTypes.Length>;
        cornerRadius: DataTypes.TypeOf<DataTypes.Length>;
        cornerShape: DataTypes.TypeOf<DataTypes.Enum>;
        markerAlign: DataTypes.TypeOf<DataTypes.Boolean>;
    } & StylingPrefab.Definition["payload"] &
        TransformPrefab.Definition["payload"]
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<RectangleDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"rectangle", RectangleDefinition> => {
    return {
        id,
        in: {
            width: null,
            height: null,
            cornerRadius: null,
            cornerShape: null,

            markerShape: null,
            markerAlign: null,

            strokeWidth: null,
            strokeColor: null,
            strokeDash: null,
            strokeDashOffset: null,
            strokeCap: null,
            strokeJoin: null,
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
        },
        payload: {
            label: "",
            width: "100px",
            height: "100px",
            cornerRadius: "0px",
            cornerShape: 0,
            markerAlign: false,
            // stroke
            strokeWidth: "1px",
            strokeDash: "",
            strokeColor: { r: 0, g: 0, b: 0, a: 1 },
            strokeDashOffset: "0px",
            strokeCap: Enum.Common.strokeCap.BUTT.value,
            strokeJoin: Enum.Common.strokeJoin.MITER.value,
            // fill
            fillColor: { r: 0, g: 0, b: 0, a: 0 },
            paintOrder: 0,
            opacity: "100",
            // transforms
            position: { ...TransformPrefab.POSITION_DEFAULT },
            rotation: "0deg",
        },
        type: "rectangle",
    };
};

const CORNER_SHAPE_OPTIONS = Enum.options(Enum.Common.cornerShape);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<RectangleDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<RectangleDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketOut node={node} socketId={"path"}>
                Path
            </SocketOut>
            <SocketIn node={node} socketId={"width"} label={"Width"}>
                <LengthInput value={node.payload.width} onCommit={(width) => handleUpdate({ width })} disabled={node.in.width !== null} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"height"} label={"Height"}>
                <LengthInput value={node.payload.height} onCommit={(height) => handleUpdate({ height })} disabled={node.in.height !== null} min={"0px"} required />
            </SocketIn>

            <NodeAccordion label={"More"} socketsIn={"rScribe|cornerRadius|cornerShape|pointDistro|markerShape|markerAlign"} nodeId={node.id}>
                <SocketIn node={node} socketId={"cornerRadius"} label={"Corner Radius"}>
                    <LengthInput value={node.payload.cornerRadius} onCommit={(cornerRadius) => handleUpdate({ cornerRadius })} disabled={node.in.cornerRadius !== null} min={"0px"} required />
                </SocketIn>
                <SocketIn node={node} socketId={"cornerShape"} label={"Corner Shape"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.cornerShape}`}
                        options={CORNER_SHAPE_OPTIONS}
                        onValue={(v) => handleUpdate({ cornerShape: Number(v) })}
                        disabled={node.in.cornerShape !== null}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"markerShape"}>
                    Markers
                </SocketIn>
                <SocketIn node={node} socketId={"markerAlign"}>
                    <CheckBox checked={node.payload.markerAlign} onToggle={(markerAlign) => handleUpdate({ markerAlign })} disabled={node.in.markerAlign !== null}>
                        Align Markers
                    </CheckBox>
                </SocketIn>
            </NodeAccordion>

            <StylingPrefab.Controls node={node} handleUpdate={handleUpdate} fill join accordion />
            <TransformPrefab.Controls node={node} handleUpdate={handleUpdate} accordion />
        </TypicalNode>
    );
};

const GEOMETRY_INPUTS: (keyof RectangleDefinition["inputs"])[] = [
    "width",
    "height",
    "cornerRadius",
    "cornerShape",
    "markerShape",
    "markerAlign",
    "position",
    "rotation",
];
const STYLING_INPUTS: (keyof RectangleDefinition["inputs"])[] = ["strokeWidth", "strokeColor", "strokeCap", "strokeJoin", "strokeDash", "strokeDashOffset", "fillColor", "paintOrder", "opacity"];

const dependsOn = (_node: NodeDefinitions.NodeFor<RectangleDefinition>, outSocket: keyof RectangleDefinition["outputs"], _deps: AllDeps): (keyof RectangleDefinition["inputs"])[] => {
    if (outSocket === "path") {
        return GEOMETRY_INPUTS;
    }
    return [...GEOMETRY_INPUTS, ...STYLING_INPUTS];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<RectangleDefinition>, inSocket: keyof RectangleDefinition["inputs"], _deps: AllDeps): (keyof RectangleDefinition["outputs"])[] => {
    if (STYLING_INPUTS.includes(inSocket)) {
        return ["output"];
    }
    return ["output", "path"];
};

const evaluate = (node: NodeDefinitions.NodeFor<RectangleDefinition>, socket: keyof RectangleDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const width = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "width")?.data ?? node.payload.width, "0px")) ?? 0;
    const height = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "height")?.data ?? node.payload.height, "0px")) ?? 0;
    const cornerRadius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "cornerRadius")?.data ?? node.payload.cornerRadius, "0px")) ?? 0;
    const cornerShape = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "cornerShape")?.data, Enum.Common.cornerShape) ?? node.payload.cornerShape ?? 0;
    if (!width || !height) {
        return null;
    }

    const hw = width / 2;
    const hh = height / 2;
    const r = Math.min(cornerRadius, hw, hh);

    let d: string;
    const hasCut = cornerShape === 4 && r > 0;
    if (r === 0) {
        d = `M ${-hw},${-hh} H ${hw} V ${hh} H ${-hw} z`;
    } else {
        let trCorner, brCorner, blCorner, tlCorner;
        switch (cornerShape) {
            case 0: // Round
                trCorner = `A ${r},${r} 0 0,1 ${hw},${-hh + r}`;
                brCorner = `A ${r},${r} 0 0,1 ${hw - r},${hh}`;
                blCorner = `A ${r},${r} 0 0,1 ${-hw},${hh - r}`;
                tlCorner = `A ${r},${r} 0 0,1 ${-hw + r},${-hh}`;
                break;
            case 2: // Scoop
                trCorner = `A ${r},${r} 0 0,0 ${hw},${-hh + r}`;
                brCorner = `A ${r},${r} 0 0,0 ${hw - r},${hh}`;
                blCorner = `A ${r},${r} 0 0,0 ${-hw},${hh - r}`;
                tlCorner = `A ${r},${r} 0 0,0 ${-hw + r},${-hh}`;
                break;
            case 3: // Notch
                trCorner = `L ${hw - r},${-hh + r} L ${hw},${-hh + r}`;
                brCorner = `L ${hw - r},${hh - r} L ${hw - r},${hh}`;
                blCorner = `L ${-hw + r},${hh - r} L ${-hw},${hh - r}`;
                tlCorner = `L ${-hw + r},${-hh + r} L ${-hw + r},${-hh}`;
                break;
            case 4: // Cut
                trCorner = `M ${hw},${-hh + r}`;
                brCorner = `M ${hw - r},${hh}`;
                blCorner = `M ${-hw},${hh - r}`;
                tlCorner = `M ${-hw + r},${-hh}`;
                break;
            default: // Bevel (1)
                trCorner = `L ${hw},${-hh + r}`;
                brCorner = `L ${hw - r},${hh}`;
                blCorner = `L ${-hw},${hh - r}`;
                tlCorner = `L ${-hw + r},${-hh}`;
                break;
        }
        const close = hasCut ? `L ${-hw},${-hh + r}` : "Z";
        d = `M ${-hw},${-hh + r} ${tlCorner} L ${hw - r},${-hh} ${trCorner} L ${hw},${hh - r} ${brCorner} L ${-hw + r},${hh} ${blCorner} ${close}`;
    }

    const [transforms, { translateX, translateY }] = TransformPrefab.evaluate(node, context);

    if (socket === "path") {
        const diag = Math.sqrt(width * width + height * height);
        return {
            kind: "path",
            data: { d, transform: transforms.join(" "), preview: { x: -diag / 2 + translateX, y: -diag / 2 + translateY, w: diag, h: diag } },
        };
    }

    if (socket === "output") {
        const markerShape = context.resolve<DataTypes.Shape>(node.id, "markerShape")?.data;
        const markerAlign = context.resolve<DataTypes.Boolean>(node.id, "markerAlign")?.data ?? node.payload.markerAlign ?? false;

        const diag = Math.sqrt(width * width + height * height);
        const pathPreview = { x: -diag / 2 + translateX, y: -diag / 2 + translateY, w: diag, h: diag };

        const paint = StylingPrefab.evaluate(node, context);
        if (hasCut) paint.fill = null;

        return {
            kind: "shape",
            data: {
                type: "path",
                d,
                paint,
                signals: hasCut ? ["noFill"] : undefined,
                markers: markerShape
                    ? {
                          mid: { shape: markerShape, orient: markerAlign ? "auto-start-reverse" : undefined },
                          end: { shape: markerShape, orient: markerAlign ? "auto-start-reverse" : undefined },
                      }
                    : undefined,
                transform: transforms.join(" "),
                preview: pathPreview,
            },
        };
    }

    return null;
};

export const RectangleNodeType: NodeTypes.Type<"rectangle", RectangleDefinition> = {
    type: "rectangle",
    displayName: "Rectangle",
    defaultLabel: "Rectangle",
    iconNode: <NodeIcon shape={NODE_ICONS.shapeRect} />,
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
