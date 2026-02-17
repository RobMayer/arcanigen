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
import { RadioButton } from "../../../components/buttons/RadioButton";

export type RectangleDefinition = {
    inputs: {
        width: DataTypes.Use<"length">;
        height: DataTypes.Use<"length">;
        cornerRadius: DataTypes.Use<"length">;
        cornerShape: DataTypes.Use<"enum">;
    } & Stylings.Definition["inputs"] &
        Transforms.Definition["inputs"];
    outputs: {
        output: DataTypes.Use<"shape">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        width: DataTypes.TypeOf<DataTypes.Use<"length">>;
        height: DataTypes.TypeOf<DataTypes.Use<"length">>;
        cornerRadius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        cornerShape: DataTypes.TypeOf<DataTypes.Use<"enum">>;
    } & Stylings.Definition["payload"] &
        Transforms.Definition["payload"];
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<RectangleDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"rectangle", RectangleDefinition> => {
    return {
        id,
        in: {
            width: null,
            height: null,
            cornerRadius: null,
            cornerShape: null,
            strokeWidth: null,
            strokeColor: null,
            strokeDash: null,
            strokeDashOffset: null,
            strokeCap: null,
            fillColor: null,
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
            width: "100px",
            height: "100px",
            cornerRadius: "0px",
            cornerShape: 0,
            // stroke
            strokeWidth: "1px",
            strokeDash: "",
            strokeColor: { r: 0, g: 0, b: 0, a: 1 },
            strokeDashOffset: "0px",
            strokeCap: Enum.Common.strokeCap.Butt,
            // fill
            fillColor: null,
            // transforms
            positionMode: Enum.Common.positionMode.Cartesian,
            positionX: "0px",
            positionY: "0px",
            positionRadius: "0px",
            positionTheta: "0",
            rotation: "0",
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
            <SocketOut node={node} socketId={"output"} type={"shape"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"width"} type={"length"} label={"Width"}>
                <LengthInput value={node.payload.width} onCommit={(width) => handleUpdate({ width })} disabled={node.in.width !== null} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"height"} type={"length"} label={"Height"}>
                <LengthInput value={node.payload.height} onCommit={(height) => handleUpdate({ height })} disabled={node.in.height !== null} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"cornerRadius"} type={"length"} label={"Corner Radius"}>
                <LengthInput value={node.payload.cornerRadius} onCommit={(cornerRadius) => handleUpdate({ cornerRadius })} disabled={node.in.cornerRadius !== null} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"cornerShape"} type={"enum"} label={"Corner Shape"}>
                <RadioButton.Group
                    value={`${node.payload.cornerShape}`}
                    options={CORNER_SHAPE_OPTIONS}
                    onValue={(v) => handleUpdate({ cornerShape: Number(v) })}
                    disabled={node.in.cornerShape !== null}
                />
            </SocketIn>

            <Stylings.Controls node={node} handleUpdate={handleUpdate} fill accordion />
            <Transforms.Controls node={node} handleUpdate={handleUpdate} accordion />
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<RectangleDefinition>, _outSocket: keyof RectangleDefinition["outputs"], _deps: AllDeps): (keyof RectangleDefinition["inputs"])[] => {
    // output depends on all inputs
    return [
        "width",
        "height",
        "cornerRadius",
        "cornerShape",
        "strokeWidth",
        "strokeColor",
        "strokeCap",
        "strokeDash",
        "strokeDashOffset",
        "fillColor",
        "positionMode",
        "positionX",
        "positionY",
        "positionRadius",
        "positionTheta",
        "rotation",
    ];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<RectangleDefinition>, _inSocket: keyof RectangleDefinition["inputs"], _deps: AllDeps): (keyof RectangleDefinition["outputs"])[] => {
    // all inputs contribute to output
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<RectangleDefinition>, socket: keyof RectangleDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const width = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "width")?.data ?? node.payload.width, "0px")) ?? 0;
        const height = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "height")?.data ?? node.payload.height, "0px")) ?? 0;
        const cornerRadius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "cornerRadius")?.data ?? node.payload.cornerRadius, "0px")) ?? 0;
        const cornerShape = context.resolve<"enum">(node.id, "cornerShape")?.data ?? node.payload.cornerShape ?? 0;
        if (!width || !height) {
            return null;
        }

        const hw = width / 2;
        const hh = height / 2;
        const r = Math.min(cornerRadius, hw, hh);

        let d: string;
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
                default: // Bevel (1)
                    trCorner = `L ${hw},${-hh + r}`;
                    brCorner = `L ${hw - r},${hh}`;
                    blCorner = `L ${-hw},${hh - r}`;
                    tlCorner = `L ${-hw + r},${-hh}`;
                    break;
            }
            d = `M ${-hw + r},${-hh} L ${hw - r},${-hh} ${trCorner} L ${hw},${hh - r} ${brCorner} L ${-hw + r},${hh} ${blCorner} L ${-hw},${-hh + r} ${tlCorner} z`;
        }

        const attributes: Record<string, string> = {
            d,
            ...Stylings.evaluate(node, context),
        };

        // Build transform string
        const [transforms, { translateX, translateY }] = Transforms.evaluate(node, context);

        const pathPreview = { x: -hw, y: -hh, w: width, h: height };

        const pathElement = {
            tag: "path" as const,
            attributes,
            children: [],
            preview: pathPreview,
        };

        // If we have transforms, wrap in a <g> element
        if (transforms.length > 0) {
            const diag = Math.sqrt(width * width + height * height);

            return {
                kind: "shape",
                data: {
                    tag: "g",
                    attributes: {
                        transform: transforms.join(" "),
                    },
                    children: [pathElement],
                    preview: { x: -diag / 2 + translateX, y: -diag / 2 + translateY, w: diag, h: diag },
                },
            };
        }

        return {
            kind: "shape",
            data: pathElement,
        };
    }

    return null;
};

const RECTANGLE_SOCKET_TYPES: Record<string, string> = {
    width: "length",
    height: "length",
    cornerRadius: "length",
    cornerShape: "enum",
    strokeWidth: "length",
    strokeColor: "color",
    strokeCap: "enum",
    strokeDash: "tokens<length>",
    strokeDashOffset: "length",
    fillColor: "color",
    positionMode: "enum",
    positionX: "length",
    positionY: "length",
    positionRadius: "length",
    positionTheta: "angle",
    rotation: "angle",
    output: "shape",
};

const getSocketType = (_node: NodeDefinitions.NodeFor<RectangleDefinition>, socketId: string, _side: "in" | "out"): string => RECTANGLE_SOCKET_TYPES[socketId] ?? "float";

export const RectangleNodeType: NodeTypes.Type<"rectangle", RectangleDefinition> = {
    type: "rectangle",
    displayName: "Rectangle",
    defaultLabel: "Rectangle",
    iconNode: <Icon shape={NODE_ICONS.rectangleShape.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.rectangleShape.Card} color={"var(--icon-flavour)"} />,
    category: "Shapes",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
