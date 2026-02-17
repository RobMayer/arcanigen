import { ReactNode } from "react";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { ColorHexInput } from "../../../components/inputs/ColorHexInput";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { TextInput } from "../../../components/inputs/TextInput";
import { NodeAccordion, SocketIn } from "../../../features/nodeview/slots";
import { DataTypes, NodeDefinitions } from "../../betterTypes";
import { Enum } from "../../datatypes/enum";
import { Length } from "../../datatypes/length";
import { Resolver } from "../../../util/resolver";
import { Color } from "../../datatypes/color";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { NumericString } from "../../datatypes/numericString";

const STROKE_CAP_OPTIONS = Enum.options(Enum.Common.strokeCap);
const POSITION_MODE_OPTIONS = Enum.options(Enum.Common.positionMode);

export namespace Stylings {
    export type Definition = {
        inputs: {
            // stroke
            strokeWidth: DataTypes.Use<"length">;
            strokeColor: DataTypes.Use<"color">;
            strokeCap: DataTypes.Use<"enum">;
            strokeDash: DataTypes.Use<"tokens<length>">;
            strokeDashOffset: DataTypes.Use<"length">;
            // fill
            fillColor?: DataTypes.Use<"color">;
        };
        outputs: NodeDefinitions.Generic["outputs"];
        payload: {
            // stroke
            strokeWidth: DataTypes.TypeOf<DataTypes.Use<"length">>;
            strokeColor: DataTypes.TypeOf<DataTypes.Use<"color">>;
            strokeCap: DataTypes.TypeOf<DataTypes.Use<"enum">>;
            strokeDash: DataTypes.TypeOf<DataTypes.Use<"tokens<length>">>;
            strokeDashOffset: DataTypes.TypeOf<DataTypes.Use<"length">>;
            // fill
            fillColor?: DataTypes.TypeOf<DataTypes.Use<"color">>;
        };
    };

    export const Controls = ({
        node,
        handleUpdate,
        fill = false,
        accordion = false,
    }: {
        handleUpdate: (v: Partial<Definition["payload"]>) => void;
        node: NodeDefinitions.NodeFor<Definition>;
        fill?: boolean;
        accordion?: boolean;
    }) => {
        return (
            <AccordionMaybe label={"Stylings"} has={accordion} nodeId={node.id} socketsIn={"strokeColor|strokeWidth|strokeCap|strokeDash|strokeDashOffset|fillColor"}>
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
                    <TextInput value={node.payload.strokeDash} onCommit={(strokeDash) => handleUpdate({ strokeDash })} disabled={node.in.strokeDash !== null} pattern={Length.TOKENS_REGEX} />
                </SocketIn>
                <SocketIn node={node} socketId={"strokeDashOffset"} type={"length"} label={"Stroke Dash Offset"}>
                    <LengthInput value={node.payload.strokeDashOffset} onCommit={(strokeDashOffset) => handleUpdate({ strokeDashOffset })} disabled={node.in.strokeDashOffset !== null} required />
                </SocketIn>
                {fill && "fillColor" in node.payload ? (
                    <SocketIn node={node} socketId={"fillColor"} type={"color"} label={"Fill Color"}>
                        <ColorHexInput value={node.payload.fillColor!} onCommit={(fillColor) => handleUpdate({ fillColor: fillColor! })} disabled={node.in.fillColor !== null} nullable alpha />
                    </SocketIn>
                ) : null}
            </AccordionMaybe>
        );
    };

    export const evaluate = (node: NodeDefinitions.NodeFor<Definition>, context: Resolver.Context) => {
        const attributes: Record<string, string> = {};

        // Resolve stroke attributes
        const strokeColor = context.resolve<"color">(node.id, "strokeColor")?.data ?? node.payload.strokeColor;
        const strokeWidth = context.resolve<"length">(node.id, "strokeWidth")?.data ?? node.payload.strokeWidth;
        const strokeCap = context.resolve<"enum">(node.id, "strokeCap")?.data ?? node.payload.strokeCap;
        const strokeDash = context.resolve<"tokens<length>">(node.id, "strokeDash")?.data ?? node.payload.strokeDash;
        const strokeDashOffset = context.resolve<"length">(node.id, "strokeDashOffset")?.data ?? node.payload.strokeDashOffset;

        // Resolve fill attributes
        const fillColor = context.resolve<"color">(node.id, "fillColor")?.data ?? node.payload.fillColor;

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
        attributes.fill = (fillColor ?? null) === null ? "none" : Color.toHex(fillColor!);

        return attributes;
    };
}

export namespace Transforms {
    export type Definition = {
        inputs: {
            // stroke
            positionMode: DataTypes.Use<"enum">;
            positionX: DataTypes.Use<"length">;
            positionY: DataTypes.Use<"length">;
            positionRadius: DataTypes.Use<"length">;
            positionTheta: DataTypes.Use<"angle">;
            rotation: DataTypes.Use<"angle">;
        };
        outputs: NodeDefinitions.Generic["outputs"];
        payload: {
            positionMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
            positionX: DataTypes.TypeOf<DataTypes.Use<"length">>;
            positionY: DataTypes.TypeOf<DataTypes.Use<"length">>;
            positionRadius: DataTypes.TypeOf<DataTypes.Use<"length">>;
            positionTheta: DataTypes.TypeOf<DataTypes.Use<"angle">>;
            rotation: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        };
    };

    export const Controls = ({
        node,
        handleUpdate,
        accordion = false,
    }: {
        handleUpdate: (v: Partial<Definition["payload"]>) => void;
        node: NodeDefinitions.NodeFor<Definition>;
        accordion?: boolean;
    }) => {
        const isCartesian = node.payload.positionMode === Enum.Common.positionMode.Cartesian;
        const isPolar = node.payload.positionMode === Enum.Common.positionMode.Polar;

        return (
            <AccordionMaybe has={accordion} socketsIn={"positionMode|positionX|positionY|positionRadius|positionTheta|rotation"} label={"Transforms"} nodeId={node.id}>
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
            </AccordionMaybe>
        );
    };

    export const evaluate = (node: NodeDefinitions.NodeFor<Definition>, context: Resolver.Context) => {
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

        const css: string[] = [];
        const transforms = { translateX, translateY, rotation };
        if (translateX !== 0 || translateY !== 0) {
            css.push(`translate(${translateX}, ${translateY})`);
        }
        if (rotation !== 0) {
            css.push(`rotate(${rotation})`);
        }

        return [css, transforms] as const;
    };
}

const AccordionMaybe = ({ has, label, children, socketsOut, socketsIn, nodeId }: { children?: ReactNode; has: boolean; socketsIn?: string; socketsOut?: string; nodeId: string; label: string }) => {
    return has ? (
        <NodeAccordion label={label} socketsIn={socketsIn} socketsOut={socketsOut} nodeId={nodeId}>
            {children}
        </NodeAccordion>
    ) : (
        <>{children}</>
    );
};
