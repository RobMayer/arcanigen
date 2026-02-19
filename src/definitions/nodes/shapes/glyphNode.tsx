import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Stylings, Transforms } from "./abstract";
import { BlockInput } from "../../../components/inputs/BlockInput";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { NumericString } from "../../datatypes/numericString";
import { SVGDefinition, SVGMember } from "../../../types";

export type GlyphDefinition = {
    inputs: {
        width: DataTypes.Use<"length">;
        height: DataTypes.Use<"length">;
        viewX: DataTypes.Use<"float">;
        viewY: DataTypes.Use<"float">;
        viewW: DataTypes.Use<"float">;
        viewH: DataTypes.Use<"float">;
    } & Stylings.Definition["inputs"] &
        Transforms.Definition["inputs"];
    outputs: {
        output: DataTypes.Use<"shape">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        path: DataTypes.TypeOf<DataTypes.Use<"string">>;
        width: DataTypes.TypeOf<DataTypes.Use<"length">>;
        height: DataTypes.TypeOf<DataTypes.Use<"length">>;
        viewX: DataTypes.TypeOf<DataTypes.Use<"float">>;
        viewY: DataTypes.TypeOf<DataTypes.Use<"float">>;
        viewW: DataTypes.TypeOf<DataTypes.Use<"float">>;
        viewH: DataTypes.TypeOf<DataTypes.Use<"float">>;
        dpi: DataTypes.TypeOf<DataTypes.Use<"float">>;
    } & Stylings.Definition["payload"] &
        Transforms.Definition["payload"];
};

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
            // styling
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
            path: "",
            width: "100px",
            height: "100px",
            viewX: "0",
            viewY: "0",
            viewW: "512",
            viewH: "512",
            dpi: "96",
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
            <SocketOut node={node} socketId={"output"} type={"shape"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"path" as never} type={"string"} label={"Path Data"}>
                <BlockInput value={node.payload.path} onCommit={(path) => handleUpdate({ path })} />
            </SocketIn>
            <SocketIn node={node} socketId={"width"} type={"length"} label={"Width"}>
                <LengthInput value={node.payload.width} onCommit={(width) => handleUpdate({ width })} disabled={node.in.width !== null} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"height"} type={"length"} label={"Height"}>
                <LengthInput value={node.payload.height} onCommit={(height) => handleUpdate({ height })} disabled={node.in.height !== null} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"viewX"} type={"float"} label={"ViewBox X"}>
                <DecimalInput value={node.payload.viewX} onCommit={(viewX) => handleUpdate({ viewX })} disabled={node.in.viewX !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"viewY"} type={"float"} label={"ViewBox Y"}>
                <DecimalInput value={node.payload.viewY} onCommit={(viewY) => handleUpdate({ viewY })} disabled={node.in.viewY !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"viewW"} type={"float"} label={"ViewBox W"}>
                <DecimalInput value={node.payload.viewW} onCommit={(viewW) => handleUpdate({ viewW })} disabled={node.in.viewW !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"viewH"} type={"float"} label={"ViewBox H"}>
                <DecimalInput value={node.payload.viewH} onCommit={(viewH) => handleUpdate({ viewH })} disabled={node.in.viewH !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"dpi" as never} type={"float"} label={"DPI"}>
                <DecimalInput value={node.payload.dpi} onCommit={(dpi) => handleUpdate({ dpi })} min={1} required />
            </SocketIn>
            <Stylings.Controls node={node} handleUpdate={handleUpdate} fill accordion />
            <Transforms.Controls node={node} handleUpdate={handleUpdate} accordion />
        </TypicalNode>
    );
};

const GEOMETRY_INPUTS: (keyof GlyphDefinition["inputs"])[] = ["width", "height", "viewX", "viewY", "viewW", "viewH", "positionMode", "positionX", "positionY", "positionRadius", "positionTheta", "rotation"];
const STYLING_INPUTS: (keyof GlyphDefinition["inputs"])[] = ["strokeWidth", "strokeColor", "strokeCap", "strokeDash", "strokeDashOffset", "fillColor", "paintOrder"];

const dependsOn = (_node: NodeDefinitions.NodeFor<GlyphDefinition>, _outSocket: keyof GlyphDefinition["outputs"], _deps: AllDeps): (keyof GlyphDefinition["inputs"])[] => {
    return [...GEOMETRY_INPUTS, ...STYLING_INPUTS];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<GlyphDefinition>, _inSocket: keyof GlyphDefinition["inputs"], _deps: AllDeps): (keyof GlyphDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<GlyphDefinition>, socket: keyof GlyphDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const pathD = node.payload.path;
    if (!pathD) return null;

    const width = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "width")?.data ?? node.payload.width, "0px"));
    const height = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "height")?.data ?? node.payload.height, "0px"));
    if (!width || !height) return null;

    const viewX = NumericString.Emptyable.asNumber(context.resolve<"float">(node.id, "viewX")?.data ?? node.payload.viewX) ?? 0;
    const viewY = NumericString.Emptyable.asNumber(context.resolve<"float">(node.id, "viewY")?.data ?? node.payload.viewY) ?? 0;
    const viewW = NumericString.Emptyable.asNumber(context.resolve<"float">(node.id, "viewW")?.data ?? node.payload.viewW) ?? 512;
    const viewH = NumericString.Emptyable.asNumber(context.resolve<"float">(node.id, "viewH")?.data ?? node.payload.viewH) ?? 512;
    if (viewW === 0 || viewH === 0) return null;

    const dpi = NumericString.Emptyable.asNumber(node.payload.dpi) ?? 96;
    const dpiScale = 72 / dpi;

    // Scale viewbox by DPI conversion
    const scaledViewX = viewX * dpiScale;
    const scaledViewY = viewY * dpiScale;
    const scaledViewW = viewW * dpiScale;
    const scaledViewH = viewH * dpiScale;

    const stylingAttrs = Stylings.evaluate(node, context);
    const [transforms, { translateX, translateY }] = Transforms.evaluate(node, context);

    const symbolId = `glyph_${node.id}`;

    // <symbol> definition with viewBox, containing the path with non-scaling-stroke
    const pathMember: SVGMember = {
        tag: "path",
        attributes: {
            d: pathD,
            vectorEffect: "non-scaling-stroke",
            ...stylingAttrs,
        },
    };

    const symbolDef: SVGDefinition = {
        tag: "symbol",
        attributes: {
            id: symbolId,
            viewBox: `${scaledViewX} ${scaledViewY} ${scaledViewW} ${scaledViewH}`,
        },
        children: [pathMember],
    };

    // <use> element referencing the symbol, centered
    const useMember: SVGMember = {
        tag: "use",
        attributes: {
            href: `#${symbolId}`,
            width: `${width}`,
            height: `${height}`,
            x: `${-width / 2}`,
            y: `${-height / 2}`,
        },
    };

    return {
        kind: "shape",
        data: {
            tag: "g",
            transform: transforms.join(" "),
            attributes: {},
            children: [useMember],
            definitions: [symbolDef],
            preview: { x: -width / 2 + translateX, y: -height / 2 + translateY, w: width, h: height },
        },
    };
};

const GLYPH_SOCKET_TYPES: Record<string, string> = {
    width: "length",
    height: "length",
    viewX: "float",
    viewY: "float",
    viewW: "float",
    viewH: "float",
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

const getSocketType = (_node: NodeDefinitions.NodeFor<GlyphDefinition>, socketId: string, _side: "in" | "out"): string => GLYPH_SOCKET_TYPES[socketId] ?? "float";

export const GlyphNodeType: NodeTypes.Type<"glyph", GlyphDefinition> = {
    type: "glyph",
    displayName: "Glyph",
    defaultLabel: "Glyph",
    iconNode: <Icon shape={NODE_ICONS.glyphShape.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.glyphShape.Card} color={"var(--icon-flavour)"} />,
    category: "Shapes",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
