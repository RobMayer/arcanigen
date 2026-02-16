import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { ColorHexInput } from "../../../components/inputs/ColorHexInput";
import { TextInput } from "../../../components/inputs/TextInput";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Color } from "../../datatypes/color";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { NumericString } from "../../datatypes/numericString";

export type CircleDefinition = {
    inputs: {
        radius: DataTypes.Use<"length">;

        // stroke
        strokeWidth: DataTypes.Use<"length">;
        strokeColor: DataTypes.Use<"color">;
        strokeCap: DataTypes.Use<"enum">;
        strokeDash: DataTypes.Use<"tokens<length>">;
        strokeDashOffset: DataTypes.Use<"length">;
        // fill
        fillColor: DataTypes.Use<"color">;

        // transforms
        positionMode: DataTypes.Use<"enum">;
        positionX: DataTypes.Use<"length">;
        positionY: DataTypes.Use<"length">;
        positionRadius: DataTypes.Use<"length">;
        positionTheta: DataTypes.Use<"angle">;
        rotation: DataTypes.Use<"angle">;
    };
    outputs: {
        output: DataTypes.Use<"shape">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        radius: DataTypes.TypeOf<DataTypes.Use<"length">>;

        // stroke
        strokeWidth: DataTypes.TypeOf<DataTypes.Use<"length">>;
        strokeColor: DataTypes.TypeOf<DataTypes.Use<"color">>;
        strokeCap: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        strokeDash: DataTypes.TypeOf<DataTypes.Use<"tokens<length>">>;
        strokeDashOffset: DataTypes.TypeOf<DataTypes.Use<"length">>;
        // fill
        fillColor: DataTypes.TypeOf<DataTypes.Use<"color">>;

        //transforms
        positionMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        positionX: DataTypes.TypeOf<DataTypes.Use<"length">>;
        positionY: DataTypes.TypeOf<DataTypes.Use<"length">>;
        positionRadius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        positionTheta: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        rotation: DataTypes.TypeOf<DataTypes.Use<"angle">>;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<CircleDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"circle", CircleDefinition> => {
    return {
        id,
        in: {
            radius: null,
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
            radius: "100px",
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
        type: "circle",
    };
};

const STROKE_CAP_OPTIONS = Enum.options(Enum.Common.strokeCap);
const POSITION_MODE_OPTIONS = Enum.options(Enum.Common.positionMode);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<CircleDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<CircleDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const isCartesian = node.payload.positionMode === Enum.Common.positionMode.Cartesian;
    const isPolar = node.payload.positionMode === Enum.Common.positionMode.Polar;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"shape"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"radius"} type={"length"} label={"Radius"}>
                <LengthInput value={node.payload.radius} onCommit={(radius) => handleUpdate({ radius })} disabled={node.in.radius !== null} min={"0px"} required />
            </SocketIn>

            <NodeAccordion socketsIn={"strokeColor|strokeWidth|strokeCap|strokeDash|strokeDashOffset|fillColor"} label={"Styling"} nodeId={node.id}>
                <SocketIn node={node} socketId={"strokeColor"} type={"color"} label={"Stroke Color"}>
                    <ColorHexInput value={node.payload.strokeColor} onCommit={(strokeColor) => handleUpdate({ strokeColor })} disabled={node.in.strokeColor !== null} nullable alpha />
                </SocketIn>
                <SocketIn node={node} socketId={"strokeWidth"} type={"length"} label={"Stroke Width"}>
                    <LengthInput value={node.payload.strokeWidth} onCommit={(strokeWidth) => handleUpdate({ strokeWidth })} disabled={node.in.strokeWidth !== null} required />
                </SocketIn>
                <SocketIn node={node} socketId={"strokeCap"} type={"enum"} label={"Stroke Cap"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.strokeCap}`}
                        onValue={(v) => handleUpdate({ strokeCap: Number(v) })}
                        disabled={node.in.strokeCap !== null}
                        options={STROKE_CAP_OPTIONS}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"strokeDash"} type={"tokens<length>"} label={"Stroke Dash"}>
                    <TextInput value={node.payload.strokeDash} onCommit={(strokeDash) => handleUpdate({ strokeDash })} disabled={node.in.strokeDash !== null} />
                </SocketIn>
                <SocketIn node={node} socketId={"strokeDashOffset"} type={"length"} label={"Stroke Dash Offset"}>
                    <LengthInput value={node.payload.strokeDashOffset} onCommit={(strokeDashOffset) => handleUpdate({ strokeDashOffset })} disabled={node.in.strokeDashOffset !== null} required />
                </SocketIn>
                <SocketIn node={node} socketId={"fillColor"} type={"color"} label={"Fill Color"}>
                    <ColorHexInput value={node.payload.fillColor} onCommit={(fillColor) => handleUpdate({ fillColor })} disabled={node.in.fillColor !== null} nullable alpha />
                </SocketIn>
            </NodeAccordion>

            <NodeAccordion socketsIn={"positionMode|positionX|positionY|positionRadius|positionTheta|rotation"} label={"Transforms"} nodeId={node.id}>
                <SocketIn node={node} socketId={"positionMode"} type={"enum"} label={"Position Mode"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.positionMode}`}
                        onValue={(v) => handleUpdate({ positionMode: Number(v) })}
                        disabled={node.in.positionMode !== null}
                        options={POSITION_MODE_OPTIONS}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"positionX"} type={"length"} label={"Position X"}>
                    <LengthInput value={node.payload.positionX} onCommit={(positionX) => handleUpdate({ positionX })} disabled={node.in.positionX !== null || isPolar} required />
                </SocketIn>
                <SocketIn node={node} socketId={"positionY"} type={"length"} label={"Position Y"}>
                    <LengthInput value={node.payload.positionY} onCommit={(positionY) => handleUpdate({ positionY })} disabled={node.in.positionY !== null || isPolar} required />
                </SocketIn>
                <SocketIn node={node} socketId={"positionRadius"} type={"length"} label={"Position Radius"}>
                    <LengthInput
                        value={node.payload.positionRadius}
                        onCommit={(positionRadius) => handleUpdate({ positionRadius })}
                        disabled={node.in.positionRadius !== null || isCartesian}
                        required
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"positionTheta"} type={"angle"} label={"Position Theta"}>
                    <AngleInput.SliderInput value={node.payload.positionTheta} onCommit={(positionTheta) => handleUpdate({ positionTheta })} disabled={node.in.positionTheta !== null || isCartesian} />
                </SocketIn>
                <SocketIn node={node} socketId={"rotation"} type={"angle"} label={"Rotation"}>
                    <AngleInput.SliderInput value={node.payload.rotation} onCommit={(rotation) => handleUpdate({ rotation })} disabled={node.in.rotation !== null} />
                </SocketIn>
            </NodeAccordion>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<CircleDefinition>, _outSocket: keyof CircleDefinition["outputs"], _deps: AllDeps): (keyof CircleDefinition["inputs"])[] => {
    // output depends on all inputs
    return [
        "radius",
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

const contributesTo = (_node: NodeDefinitions.NodeFor<CircleDefinition>, _inSocket: keyof CircleDefinition["inputs"], _deps: AllDeps): (keyof CircleDefinition["outputs"])[] => {
    // all inputs contribute to output
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<CircleDefinition>, socket: keyof CircleDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const radius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "radius")?.data ?? node.payload.radius, "0px"));
        if (!radius) {
            return null;
        }

        // Resolve stroke attributes
        const strokeColor = context.resolve<"color">(node.id, "strokeColor")?.data ?? node.payload.strokeColor;
        const strokeWidth = context.resolve<"length">(node.id, "strokeWidth")?.data ?? node.payload.strokeWidth;
        const strokeCap = context.resolve<"enum">(node.id, "strokeCap")?.data ?? node.payload.strokeCap;
        const strokeDash = context.resolve<"tokens<length>">(node.id, "strokeDash")?.data ?? node.payload.strokeDash;
        const strokeDashOffset = context.resolve<"length">(node.id, "strokeDashOffset")?.data ?? node.payload.strokeDashOffset;

        // Resolve fill attributes
        const fillColor = context.resolve<"color">(node.id, "fillColor")?.data ?? node.payload.fillColor;

        // Resolve transform attributes
        const positionMode = context.resolve<"enum">(node.id, "positionMode")?.data ?? node.payload.positionMode;
        const positionX = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "positionX")?.data ?? node.payload.positionX) ?? 0;
        const positionY = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "positionY")?.data ?? node.payload.positionY) ?? 0;
        const positionRadius = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "positionRadius")?.data ?? node.payload.positionRadius) ?? 0;
        const positionTheta = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "positionTheta")?.data ?? node.payload.positionTheta) ?? 0;
        const rotation = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "rotation")?.data ?? node.payload.rotation) ?? 0;

        // Calculate translation based on position mode
        let translateX: number;
        let translateY: number;
        if (positionMode === Enum.Common.positionMode.Polar) {
            // Convert polar (radius, theta) to cartesian
            // theta is in degrees, convert to radians
            // 0° is at the top (12 o'clock), so we offset by -90°
            const thetaRad = ((positionTheta - 90) * Math.PI) / 180;
            translateX = positionRadius * Math.cos(thetaRad);
            translateY = positionRadius * Math.sin(thetaRad);
        } else {
            // Cartesian mode
            translateX = positionX;
            translateY = positionY;
        }

        // Map strokeCap enum to SVG linecap value
        const strokeLinecap = Resolver.EnumMappings.strokeCap[strokeCap] ?? "butt";

        // Convert stroke dash to pixel values
        const strokeDasharray = strokeDash
            ? strokeDash
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((token) => Length.Emptyable.asNumber(token as Length.Type) ?? 0)
                  .join(" ")
            : undefined;

        const attributes: Record<string, string> = {
            d: `M 0,${-1 * radius} A ${radius},${radius} 0 0 1 0,${radius} A ${radius},${radius} 0 0 1 0,${radius * -1}`,
        };

        // Add stroke attributes
        if (strokeColor !== null) {
            attributes.stroke = Color.toHex(strokeColor);
            attributes["strokeWidth"] = String(Length.Emptyable.asNumber(strokeWidth) ?? 0);
            attributes["strokeLinecap"] = strokeLinecap;
            if (strokeDasharray) {
                attributes["strokeDasharray"] = strokeDasharray;
                attributes["strokeDashoffset"] = String(Length.Emptyable.asNumber(strokeDashOffset) ?? 0);
            }
        }

        // Add fill attribute
        attributes.fill = fillColor === null ? "none" : Color.toHex(fillColor);

        // Build transform string
        const transforms: string[] = [];
        if (translateX !== 0 || translateY !== 0) {
            transforms.push(`translate(${translateX}, ${translateY})`);
        }
        if (rotation !== 0) {
            transforms.push(`rotate(${rotation})`);
        }

        const pathPreview = { x: -radius, y: -radius, w: 2 * radius, h: 2 * radius };

        const pathElement = {
            tag: "path" as const,
            attributes,
            children: [],
            preview: pathPreview,
        };

        // If we have transforms, wrap in a <g> element
        if (transforms.length > 0) {
            return {
                kind: "shape",
                data: {
                    tag: "g",
                    attributes: {
                        transform: transforms.join(" "),
                    },
                    children: [pathElement],
                    preview: { x: -radius + translateX, y: -radius + translateY, w: 2 * radius, h: 2 * radius },
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

const CIRCLE_SOCKET_TYPES: Record<string, SocketTypes.Kind> = {
    radius: "length",
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

const getSocketType = (_node: NodeDefinitions.NodeFor<CircleDefinition>, socketId: string, _side: "in" | "out"): SocketTypes.Kind => CIRCLE_SOCKET_TYPES[socketId] ?? "float";

export const CircleNodeType: NodeTypes.Type<"circle", CircleDefinition> = {
    type: "circle",
    displayName: "Circle",
    defaultLabel: "Circle",
    iconNode: <Icon shape={NODE_ICONS.circleShape.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.circleShape.Card} color={"var(--icon-flavour)"} />,
    category: "Shapes",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
