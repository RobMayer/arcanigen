import { RadioButton } from "../../components/buttons/RadioButton";
import { ColorHexInput } from "../../components/inputs/ColorHexInput";
import { LengthInput } from "../../components/inputs/LengthInput";
import { TextInput } from "../../components/inputs/TextInput";
import { Dropdown } from "../../components/inputs/Dropdown";
import { DecimalInput } from "../../components/inputs/DecimalInput";
import { NodeAccordion, SocketIn } from "../../features/nodeview/slots";
import { NodeDefinitions } from "../nodeTypes";
import { DataTypes } from "../dataTypes";
import { $ } from "./signatureBuilder";
import { Enum } from "../datatypes/enum";
import { Length } from "../datatypes/length";
import { NumericString } from "../datatypes/numericString";
import { Color } from "../datatypes/color";
import { Resolver } from "../../util/resolver";
import { Fill, Paint } from "../shapeTypes";
import { ReactNode } from "react";

const STROKE_CAP_OPTIONS = Enum.options(Enum.Common.strokeCap);
const STROKE_JOIN_OPTIONS = Enum.options(Enum.Common.strokeJoin);
const PAINT_ORDER_OPTIONS = Enum.options(Enum.Common.paintOrder);

export namespace StylingPrefab {
    export const SIG_IN = {
        strokeWidth: "length",
        strokeColor: $.COLOR_OR_GRADIENT,
        strokeCap: "enum",
        strokeDash: "tokens:length",
        strokeDashOffset: "length",
        paintOrder: "enum",
        opacity: $.oneOf("float", "integer"),
    } as const;
    export const SIG_FILL = { fillColor: $.COLOR_OR_GRADIENT } as const;
    export const SIG_JOIN = { strokeJoin: "enum" } as const;

    export type Definition = {
        inputs: {
            // stroke
            strokeWidth: DataTypes.Length;
            strokeColor: DataTypes.Color;
            strokeCap: DataTypes.Enum;
            strokeJoin?: DataTypes.Enum;
            strokeDash: DataTypes.TokensLength;
            strokeDashOffset: DataTypes.Length;
            // fill
            fillColor?: DataTypes.Color;
            paintOrder: DataTypes.Enum;
            opacity: DataTypes.Float | DataTypes.Integer;
        };
        outputs: NodeDefinitions.Generic["outputs"];
        payload: {
            // stroke
            strokeWidth: DataTypes.TypeOf<DataTypes.Length>;
            strokeColor: DataTypes.TypeOf<DataTypes.Color>;
            strokeCap: DataTypes.TypeOf<DataTypes.Enum>;
            strokeDash: DataTypes.TypeOf<DataTypes.TokensLength>;
            strokeDashOffset: DataTypes.TypeOf<DataTypes.Length>;
            strokeJoin?: DataTypes.TypeOf<DataTypes.Enum>;
            // fill
            fillColor?: DataTypes.TypeOf<DataTypes.Color>;
            paintOrder: DataTypes.TypeOf<DataTypes.Enum>;
            opacity: DataTypes.TypeOf<DataTypes.Float>;
        };
    };

    export const Controls = ({
        node,
        handleUpdate,
        fill = false,
        join = false,
        accordion = false,
    }: {
        handleUpdate: (v: Partial<Definition["payload"]>) => void;
        node: NodeDefinitions.NodeFor<Definition>;
        fill?: boolean;
        join?: boolean;
        accordion?: boolean;
    }) => {
        return (
            <AccordionMaybe label={"Appearance"} has={accordion} nodeId={node.id} socketsIn={"strokeColor|strokeWidth|strokeCap|strokeDash|strokeDashOffset|fillColor|strokeJoin|paintOrder|opacity"}>
                <SocketIn node={node} socketId={"strokeColor"} label={"Stroke Color"}>
                    <ColorHexInput value={node.payload.strokeColor} onCommit={(strokeColor) => handleUpdate({ strokeColor })} disabled={node.in.strokeColor !== null} required alpha />
                </SocketIn>
                <SocketIn node={node} socketId={"strokeWidth"} label={"Stroke Width"}>
                    <LengthInput value={node.payload.strokeWidth} onCommit={(strokeWidth) => handleUpdate({ strokeWidth })} disabled={node.in.strokeWidth !== null} required />
                </SocketIn>
                <SocketIn node={node} socketId={"strokeCap"} label={"Stroke Cap"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.strokeCap}`}
                        onValue={(v) => handleUpdate({ strokeCap: Number(v) })}
                        disabled={node.in.strokeCap !== null}
                        options={STROKE_CAP_OPTIONS}
                    />
                </SocketIn>
                {join && "strokeJoin" in node.payload ? (
                    <SocketIn node={node} socketId={"strokeJoin"} label={"Stroke Join"}>
                        <RadioButton.Group
                            orientation={"horizontal"}
                            value={`${node.payload.strokeJoin}`}
                            onValue={(v) => handleUpdate({ strokeJoin: Number(v) })}
                            disabled={node.in.strokeJoin !== null}
                            options={STROKE_JOIN_OPTIONS}
                        />
                    </SocketIn>
                ) : null}
                <SocketIn node={node} socketId={"strokeDash"} label={"Stroke Dash"}>
                    <TextInput value={node.payload.strokeDash} onCommit={(strokeDash) => handleUpdate({ strokeDash })} disabled={node.in.strokeDash !== null} pattern={Length.TOKENS_REGEX} />
                </SocketIn>
                <SocketIn node={node} socketId={"strokeDashOffset"} label={"Stroke Dash Offset"}>
                    <LengthInput value={node.payload.strokeDashOffset} onCommit={(strokeDashOffset) => handleUpdate({ strokeDashOffset })} disabled={node.in.strokeDashOffset !== null} required />
                </SocketIn>
                {fill && "fillColor" in node.payload ? (
                    <>
                        <hr />
                        <SocketIn node={node} socketId={"fillColor"} label={"Fill Color"}>
                            <ColorHexInput value={node.payload.fillColor!} onCommit={(fillColor) => handleUpdate({ fillColor: fillColor! })} disabled={node.in.fillColor !== null} required alpha />
                        </SocketIn>
                    </>
                ) : null}
                <hr />
                <SocketIn node={node} socketId={"paintOrder"} label={"Paint Order"}>
                    <Dropdown value={`${node.payload.paintOrder}`} onValue={(v) => handleUpdate({ paintOrder: Number(v) })}>
                        {PAINT_ORDER_OPTIONS.map((each) => {
                            return (
                                <option value={`${each.value}`} key={`${each.value}`}>
                                    {each.label}
                                </option>
                            );
                        })}
                    </Dropdown>
                </SocketIn>
                <SocketIn node={node} socketId={"opacity"} label={"Opacity"}>
                    <DecimalInput value={node.payload.opacity} onCommit={(opacity) => handleUpdate({ opacity })} disabled={node.in.opacity !== null} required />
                </SocketIn>
            </AccordionMaybe>
        );
    };

    const resolvePaintValue = (node: NodeDefinitions.NodeFor<Definition>, context: Resolver.Context, socket: "fillColor" | "strokeColor", fallback: Color.Type | undefined): Fill => {
        const ev = context.resolve<DataTypes.Color | DataTypes.Gradient>(node.id, socket);
        if (ev?.kind === "gradient") return ev.data;
        const color = (ev?.kind === "color" ? ev.data : undefined) ?? fallback ?? null;
        return color === null ? null : Color.toHex(color);
    };

    export const evaluate = (node: NodeDefinitions.NodeFor<Definition>, context: Resolver.Context): Paint => {
        const strokeColor = resolvePaintValue(node, context, "strokeColor", node.payload.strokeColor);
        const strokeWidth = context.resolve<DataTypes.Length>(node.id, "strokeWidth")?.data ?? node.payload.strokeWidth;
        const strokeCap = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "strokeCap")?.data, Enum.Common.strokeCap) ?? node.payload.strokeCap;
        const strokeJoin = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "strokeJoin")?.data, Enum.Common.strokeJoin) ?? node.payload.strokeJoin ?? 0;
        const strokeDash = context.resolve<DataTypes.TokensLength>(node.id, "strokeDash")?.data ?? node.payload.strokeDash;
        const strokeDashOffset = context.resolve<DataTypes.Length>(node.id, "strokeDashOffset")?.data ?? node.payload.strokeDashOffset;

        const fill = resolvePaintValue(node, context, "fillColor", node.payload.fillColor);

        const cap = Resolver.EnumMappings.strokeCap[strokeCap] ?? "butt";
        const join = Resolver.EnumMappings.strokeJoin[strokeJoin] ?? "butt";
        const paintOrder =
            Resolver.EnumMappings.paintOrder[Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "paintOrder")?.data, Enum.Common.paintOrder) ?? node.payload.paintOrder ?? 0] ?? "fill stroke markers";

        // Convert stroke dash to pixel values
        const dashArray = strokeDash
            ? strokeDash
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((token) => Length.Emptyable.asNumber(token as Length.Type) ?? 0)
                  .join(" ")
            : undefined;

        const opacityRaw = NumericString.Emptyable.asNumber(context.resolve<DataTypes.Float | DataTypes.Integer>(node.id, "opacity")?.data ?? node.payload.opacity) ?? 100;
        const opacity = Math.max(0, Math.min(100, opacityRaw)) / 100;

        const paint: Paint = {
            paintOrder,
            fill,
            opacity: opacity < 1 ? opacity : undefined,
        };

        if (strokeColor !== null) {
            paint.stroke = {
                color: strokeColor,
                width: Length.Emptyable.asNumber(strokeWidth) ?? 0,
                cap,
                join,
                dash: dashArray ? { array: dashArray, offset: Length.Emptyable.asNumber(strokeDashOffset) ?? 0 } : undefined,
            };
        }

        return paint;
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
