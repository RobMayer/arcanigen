import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { StylingPrefab } from "../../helpers/stylingPrefab";
import { TransformPrefab } from "../../helpers/transformPrefab";
import { BlockInput } from "../../../components/inputs/BlockInput";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { NumericString } from "../../datatypes/numericString";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: {
        width: "length",
        height: "length",
        viewX: $.oneOf("float", "integer"),
        viewY: $.oneOf("float", "integer"),
        viewW: $.oneOf("float", "integer"),
        viewH: $.oneOf("float", "integer"),
        pathData: "string",
        ...TransformPrefab.SIG_IN,
        ...StylingPrefab.SIG_IN,
        ...StylingPrefab.SIG_FILL,
    },
    out: { output: "shape", path: "path" },
});

export type GlyphDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<"string">;
        pathData: DataTypes.TypeOf<"string">;
        width: DataTypes.TypeOf<"length">;
        height: DataTypes.TypeOf<"length">;
        viewX: DataTypes.TypeOf<"float">;
        viewY: DataTypes.TypeOf<"float">;
        viewW: DataTypes.TypeOf<"float">;
        viewH: DataTypes.TypeOf<"float">;
    } & StylingPrefab.Definition["payload"] &
        TransformPrefab.Definition["payload"]
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<GlyphDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"glyph", GlyphDefinition> => {
    return {
        id,
        in: {
            width: null,
            height: null,
            viewX: null,
            viewY: null,
            viewW: null,
            viewH: null,
            pathData: null,
            // styling
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
            pathData: "",
            width: "100px",
            height: "100px",
            viewX: "0",
            viewY: "0",
            viewW: "512",
            viewH: "512",
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
            ...input,
        },
        type: "glyph",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<GlyphDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<GlyphDefinition>>) => {
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
            <SocketIn node={node} socketId={"pathData"} label={"Path Data"}>
                <BlockInput.Modal value={node.payload.pathData} onCommit={(pathData) => handleUpdate({ pathData })} title={"Edit Path Data"} buttonLabel={"Edit Path Data…"} />
            </SocketIn>
            <SocketIn node={node} socketId={"width"} label={"Width"}>
                <LengthInput value={node.payload.width} onCommit={(width) => handleUpdate({ width })} disabled={node.in.width !== null} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"height"} label={"Height"}>
                <LengthInput value={node.payload.height} onCommit={(height) => handleUpdate({ height })} disabled={node.in.height !== null} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"viewX"} label={"ViewBox X"}>
                <DecimalInput value={node.payload.viewX} onCommit={(viewX) => handleUpdate({ viewX })} disabled={node.in.viewX !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"viewY"} label={"ViewBox Y"}>
                <DecimalInput value={node.payload.viewY} onCommit={(viewY) => handleUpdate({ viewY })} disabled={node.in.viewY !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"viewW"} label={"ViewBox W"}>
                <DecimalInput value={node.payload.viewW} onCommit={(viewW) => handleUpdate({ viewW })} disabled={node.in.viewW !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"viewH"} label={"ViewBox H"}>
                <DecimalInput value={node.payload.viewH} onCommit={(viewH) => handleUpdate({ viewH })} disabled={node.in.viewH !== null} />
            </SocketIn>
            <StylingPrefab.Controls node={node} handleUpdate={handleUpdate} fill accordion />
            <TransformPrefab.Controls node={node} handleUpdate={handleUpdate} accordion />
        </TypicalNode>
    );
};

const GEOMETRY_INPUTS: (keyof GlyphDefinition["inputs"])[] = [
    "width",
    "height",
    "viewX",
    "viewY",
    "viewW",
    "viewH",
    "positionMode",
    "positionX",
    "positionY",
    "positionRadius",
    "positionTheta",
    "rotation",
];
const STYLING_INPUTS: (keyof GlyphDefinition["inputs"])[] = ["strokeWidth", "strokeColor", "strokeCap", "strokeDash", "strokeDashOffset", "fillColor", "paintOrder"];

const dependsOn = (_node: NodeDefinitions.NodeFor<GlyphDefinition>, outSocket: keyof GlyphDefinition["outputs"], _deps: AllDeps): (keyof GlyphDefinition["inputs"])[] => {
    if (outSocket === "path") {
        return GEOMETRY_INPUTS;
    }
    return [...GEOMETRY_INPUTS, ...STYLING_INPUTS];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<GlyphDefinition>, inSocket: keyof GlyphDefinition["inputs"], _deps: AllDeps): (keyof GlyphDefinition["outputs"])[] => {
    if (STYLING_INPUTS.includes(inSocket)) {
        return ["output"];
    }
    return ["output", "path"];
};

const evaluate = (node: NodeDefinitions.NodeFor<GlyphDefinition>, socket: keyof GlyphDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const pathD = node.payload.pathData;
    if (!pathD) return null;

    const width = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "width")?.data ?? node.payload.width, "0px"));
    const height = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "height")?.data ?? node.payload.height, "0px"));
    if (!width || !height) return null;

    const viewX = NumericString.Emptyable.asNumber(context.resolve<"float" | "integer">(node.id, "viewX")?.data ?? node.payload.viewX) ?? 0;
    const viewY = NumericString.Emptyable.asNumber(context.resolve<"float" | "integer">(node.id, "viewY")?.data ?? node.payload.viewY) ?? 0;
    const viewW = NumericString.Emptyable.asNumber(context.resolve<"float" | "integer">(node.id, "viewW")?.data ?? node.payload.viewW) ?? 512;
    const viewH = NumericString.Emptyable.asNumber(context.resolve<"float" | "integer">(node.id, "viewH")?.data ?? node.payload.viewH) ?? 512;
    if (viewW === 0 || viewH === 0) return null;

    const [transforms, { translateX, translateY }] = TransformPrefab.evaluate(node, context);

    // The old <symbol> did a viewBox->width/height fit (xMidYMid meet) inside a <use> box centered on
    // the origin. That fit is affine — a uniform scale plus a translate — so we bake it as a matrix
    // here instead, which lets a raw <path> stand in for the symbol (and carry a `path` output). The
    // only thing lost vs. the symbol is clipping to the viewBox rect, which glyphs don't rely on.
    const scale = Math.min(width / viewW, height / viewH);
    const fitX = (width - scale * viewW) / 2 - viewX * scale - width / 2;
    const fitY = (height - scale * viewH) / 2 - viewY * scale - height / 2;
    const transform = [...transforms, `matrix(${scale}, 0, 0, ${scale}, ${fitX}, ${fitY})`].join(" ");
    const preview = { x: -width / 2 + translateX, y: -height / 2 + translateY, w: width, h: height };

    if (socket === "path") {
        return { kind: "path", data: { d: pathD, transform, preview } };
    }

    if (socket === "output") {
        return {
            kind: "shape",
            data: {
                type: "path",
                d: pathD,
                paint: StylingPrefab.evaluate(node, context),
                vectorEffect: "non-scaling-stroke",
                transform,
                preview,
            },
        };
    }

    return null;
};

export const GlyphNodeType: NodeTypes.Type<"glyph", GlyphDefinition> = {
    type: "glyph",
    displayName: "Glyph",
    defaultLabel: "Glyph",
    iconNode: <NodeIcon shape={NODE_ICONS.questionMark} />,
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
