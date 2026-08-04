import { ReactNode } from "react";
import { RadioButton } from "../../components/buttons/RadioButton";
import { CheckBox } from "../../components/buttons/CheckBox";
import { ColorHexInput } from "../../components/inputs/ColorHexInput";
import { IntegerInput } from "../../components/inputs/IntegerInput";
import { LengthInput } from "../../components/inputs/LengthInput";
import { TextInput } from "../../components/inputs/TextInput";
import { AngleInput } from "../../components/inputs/AngleInput";
import { NodeAccordion, SocketIn } from "../../features/nodeview/slots";
import { DataTypes, NodeDefinitions, SocketTypes } from "../betterTypes";
import { Enum } from "../datatypes/enum";
import { Length } from "../datatypes/length";
import { NumericString } from "../datatypes/numericString";
import { Color } from "../datatypes/color";
import { Resolver } from "../../util/resolver";
import { EmptyOr } from "../../util/misc";
import { Dropdown } from "../../components/inputs/Dropdown";
import { DecimalInput } from "../../components/inputs/DecimalInput";
import { Paint } from "../shapeTypes";

const STROKE_CAP_OPTIONS = Enum.options(Enum.Common.strokeCap);
const STROKE_JOIN_OPTIONS = Enum.options(Enum.Common.strokeJoin);
const POSITION_MODE_OPTIONS = Enum.options(Enum.Common.positionMode);
const PAINT_ORDER_OPTIONS = Enum.options(Enum.Common.paintOrder);
const MODE_OPTIONS = Enum.options(Enum.Common.sequencerMode);

export namespace Stylings {
    export const IN_SOCKET_TYPES: { [key in keyof Required<Definition["inputs"]>]: SocketTypes.SocketRule } = {
        strokeWidth: { types: ["length"], mode: "and" },
        strokeColor: { types: ["color"], mode: "and" },
        strokeJoin: { types: ["enum"], mode: "and" },
        strokeCap: { types: ["enum"], mode: "and" },
        strokeDash: { types: ["tokens<length>"], mode: "and" },
        strokeDashOffset: { types: ["length"], mode: "and" },
        fillColor: { types: ["color"], mode: "and" },
        paintOrder: { types: ["enum"], mode: "and" },
        opacity: { types: ["float", "integer"], mode: "or" },
    };

    export type Definition = {
        inputs: {
            // stroke
            strokeWidth: DataTypes.Use<"length">;
            strokeColor: DataTypes.Use<"color">;
            strokeCap: DataTypes.Use<"enum">;
            strokeJoin?: DataTypes.Use<"enum">;
            strokeDash: DataTypes.Use<"tokens<length>">;
            strokeDashOffset: DataTypes.Use<"length">;
            // fill
            fillColor?: DataTypes.Use<"color">;
            paintOrder: DataTypes.Use<"enum">;
            opacity: DataTypes.Use<"float" | "integer">;
        };
        outputs: NodeDefinitions.Generic["outputs"];
        payload: {
            // stroke
            strokeWidth: DataTypes.TypeOf<DataTypes.Use<"length">>;
            strokeColor: DataTypes.TypeOf<DataTypes.Use<"color">>;
            strokeCap: DataTypes.TypeOf<DataTypes.Use<"enum">>;
            strokeDash: DataTypes.TypeOf<DataTypes.Use<"tokens<length>">>;
            strokeDashOffset: DataTypes.TypeOf<DataTypes.Use<"length">>;
            strokeJoin?: DataTypes.TypeOf<DataTypes.Use<"enum">>;
            // fill
            fillColor?: DataTypes.TypeOf<DataTypes.Use<"color">>;
            paintOrder: DataTypes.TypeOf<DataTypes.Use<"enum">>;
            opacity: DataTypes.TypeOf<DataTypes.Use<"float">>;
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

    export const evaluate = (node: NodeDefinitions.NodeFor<Definition>, context: Resolver.Context): Paint => {
        const strokeColor = context.resolve<"color">(node.id, "strokeColor")?.data ?? node.payload.strokeColor;
        const strokeWidth = context.resolve<"length">(node.id, "strokeWidth")?.data ?? node.payload.strokeWidth;
        const strokeCap = Enum.resolve(context.resolve<"enum">(node.id, "strokeCap")?.data, Enum.Common.strokeCap) ?? node.payload.strokeCap;
        const strokeJoin = Enum.resolve(context.resolve<"enum">(node.id, "strokeJoin")?.data, Enum.Common.strokeJoin) ?? node.payload.strokeJoin ?? 0;
        const strokeDash = context.resolve<"tokens<length>">(node.id, "strokeDash")?.data ?? node.payload.strokeDash;
        const strokeDashOffset = context.resolve<"length">(node.id, "strokeDashOffset")?.data ?? node.payload.strokeDashOffset;

        const fillColor = context.resolve<"color">(node.id, "fillColor")?.data ?? node.payload.fillColor;

        const cap = Resolver.EnumMappings.strokeCap[strokeCap] ?? "butt";
        const join = Resolver.EnumMappings.strokeJoin[strokeJoin] ?? "butt";
        const paintOrder =
            Resolver.EnumMappings.paintOrder[Enum.resolve(context.resolve<"enum">(node.id, "paintOrder")?.data, Enum.Common.paintOrder) ?? node.payload.paintOrder ?? 0] ?? "fill stroke markers";

        // Convert stroke dash to pixel values
        const dashArray = strokeDash
            ? strokeDash
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((token) => Length.Emptyable.asNumber(token as Length.Type) ?? 0)
                  .join(" ")
            : undefined;

        const opacityRaw = NumericString.Emptyable.asNumber(context.resolve<"float" | "integer">(node.id, "opacity")?.data ?? node.payload.opacity) ?? 100;
        const opacity = Math.max(0, Math.min(100, opacityRaw)) / 100;

        const paint: Paint = {
            paintOrder,
            fill: (fillColor ?? null) === null ? null : Color.toHex(fillColor!),
            opacity: opacity < 1 ? opacity : undefined,
        };

        if (strokeColor !== null) {
            paint.stroke = {
                color: Color.toHex(strokeColor),
                width: Length.Emptyable.asNumber(strokeWidth) ?? 0,
                cap,
                join,
                dash: dashArray ? { array: dashArray, offset: Length.Emptyable.asNumber(strokeDashOffset) ?? 0 } : undefined,
            };
        }

        return paint;
    };
}

export namespace Transforms {
    export const IN_SOCKET_TYPES: { [key in keyof Required<Definition["inputs"]>]: SocketTypes.SocketRule } = {
        positionMode: { types: ["enum"], mode: "and" },
        positionX: { types: ["length"], mode: "and" },
        positionY: { types: ["length"], mode: "and" },
        positionRadius: { types: ["length"], mode: "and" },
        positionTheta: { types: ["angle"], mode: "and" },
        rotation: { types: ["angle"], mode: "and" },
    };

    export type Definition = {
        inputs: {
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
        const isCartesian = node.payload.positionMode === Enum.Common.positionMode.CARTESIAN.value;
        const isPolar = node.payload.positionMode === Enum.Common.positionMode.POLAR.value;

        return (
            <AccordionMaybe has={accordion} socketsIn={"positionMode|positionX|positionY|positionRadius|positionTheta|rotation"} label={"Transforms"} nodeId={node.id}>
                <SocketIn node={node} socketId={"rotation"} label={"Rotation"}>
                    <AngleInput.SliderInput value={node.payload.rotation} onCommit={(rotation) => handleUpdate({ rotation })} disabled={node.in.rotation !== null} />
                </SocketIn>
                <SocketIn node={node} socketId={"positionMode"} label={"Position Mode"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.positionMode}`}
                        onValue={(v) => handleUpdate({ positionMode: Number(v) })}
                        disabled={node.in.positionMode !== null}
                        options={POSITION_MODE_OPTIONS}
                    />
                </SocketIn>
                <hr />
                <SocketIn node={node} socketId={"positionX"} label={"Position X"}>
                    <LengthInput value={node.payload.positionX} onCommit={(positionX) => handleUpdate({ positionX })} disabled={node.in.positionX !== null || isPolar} required />
                </SocketIn>
                <SocketIn node={node} socketId={"positionY"} label={"Position Y"}>
                    <LengthInput value={node.payload.positionY} onCommit={(positionY) => handleUpdate({ positionY })} disabled={node.in.positionY !== null || isPolar} required />
                </SocketIn>
                <hr />
                <SocketIn node={node} socketId={"positionRadius"} label={"Position Radius"}>
                    <LengthInput
                        value={node.payload.positionRadius}
                        onCommit={(positionRadius) => handleUpdate({ positionRadius })}
                        disabled={node.in.positionRadius !== null || isCartesian}
                        required
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"positionTheta"} label={"Position Theta"}>
                    <AngleInput.SliderInput value={node.payload.positionTheta} onCommit={(positionTheta) => handleUpdate({ positionTheta })} disabled={node.in.positionTheta !== null || isCartesian} />
                </SocketIn>
            </AccordionMaybe>
        );
    };

    export const evaluate = (node: NodeDefinitions.NodeFor<Definition>, context: Resolver.Context) => {
        const positionMode = Enum.resolve(context.resolve<"enum">(node.id, "positionMode")?.data, Enum.Common.positionMode) ?? node.payload.positionMode;
        const positionX = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "positionX")?.data ?? node.payload.positionX) ?? 0;
        const positionY = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "positionY")?.data ?? node.payload.positionY) ?? 0;
        const positionRadius = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "positionRadius")?.data ?? node.payload.positionRadius) ?? 0;
        const positionTheta = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "positionTheta")?.data ?? node.payload.positionTheta) ?? 0;
        const rotation = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "rotation")?.data ?? node.payload.rotation) ?? 0;

        let translateX: number;
        let translateY: number;
        if (positionMode === Enum.Common.positionMode.POLAR.value) {
            // Convert polar (radius, theta) to cartesian
            // theta is in degrees, convert to radians
            // 0° is at the top (12 o'clock), so we offset by -90°
            const thetaRad = ((positionTheta - 90) * Math.PI) / 180;
            translateX = positionRadius * Math.cos(thetaRad);
            translateY = positionRadius * Math.sin(thetaRad);
        } else {
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

export namespace Iteration {
    export type Definition = {
        inputs: {
            sequence: DataTypes.Use<"sequence">;
            mode: DataTypes.Use<"enum">;
            reverseSequence: DataTypes.Use<"boolean">;
            startOffset: DataTypes.Use<"integer">;
            endOffset: DataTypes.Use<"integer">;
            samplePosition: DataTypes.Use<"float" | "integer">;
        };
        outputs: NodeDefinitions.Generic["outputs"];
        payload: {
            mode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
            reverseSequence: boolean;
            startOffset: EmptyOr<NumericString.Type>;
            endOffset: EmptyOr<NumericString.Type>;
            samplePosition: EmptyOr<NumericString.Type>;
        };
    };

    export const SEQUENCED_DEPS: (keyof Definition["inputs"])[] = ["sequence", "mode", "reverseSequence", "startOffset", "endOffset"];
    export const SAMPLED_DEPS: (keyof Definition["inputs"])[] = ["samplePosition"];

    export const IN_SOCKET_TYPES: { [key in keyof Required<Definition["inputs"]>]: SocketTypes.SocketRule } = {
        sequence: { types: ["sequence"], mode: "and" },
        mode: { types: ["enum"], mode: "and" },
        reverseSequence: { types: ["boolean"], mode: "and" },
        startOffset: { types: ["integer"], mode: "and" },
        endOffset: { types: ["integer"], mode: "and" },
        samplePosition: { types: ["float", "integer"], mode: "and" },
    };

    /**
     * Compute `t` (0..1) from the sequence, applying mode, offsets, and reverse.
     * Returns `null` when TRUNCATE mode discards out-of-range iterations.
     */
    export const evaluate = (node: NodeDefinitions.NodeFor<Definition>, context: Resolver.Context): { t: number } | null => {
        const sequenceEval = context.resolve<"sequence">(node.id, "sequence");
        if (!sequenceEval) return null;

        const { senderId, count } = sequenceEval.data;
        if (count <= 0) return null;

        const reverseSequence = context.resolve<"boolean">(node.id, "reverseSequence")?.data ?? node.payload.reverseSequence;
        const startOffsetStr = context.resolve<"integer">(node.id, "startOffset")?.data ?? node.payload.startOffset;
        const endOffsetStr = context.resolve<"integer">(node.id, "endOffset")?.data ?? node.payload.endOffset;
        const startOffset = startOffsetStr === "" ? 0 : parseInt(startOffsetStr, 10) || 0;
        const endOffset = endOffsetStr === "" ? 0 : parseInt(endOffsetStr, 10) || 0;
        const modeEnum = context.resolve<"enum">(node.id, "mode")?.data ?? node.payload.mode;
        const modeKey = Enum.keyOf(Enum.Common.sequencerMode, modeEnum);

        let iter = context.sequenceData[senderId] ?? 0;

        if (reverseSequence) {
            iter = count - 1 - iter;
        }

        const effectiveStart = startOffset;
        const effectiveEnd = count - 1 + endOffset;
        const effectiveCount = effectiveEnd - effectiveStart + 1;
        if (effectiveCount <= 0) return null;

        // Mode handling for out-of-range
        let effectiveIdx = iter - effectiveStart;
        if (effectiveIdx < 0 || effectiveIdx >= effectiveCount) {
            switch (modeKey) {
                case "CLAMP":
                    effectiveIdx = Math.max(0, Math.min(effectiveIdx, effectiveCount - 1));
                    break;
                case "WRAP":
                    effectiveIdx = ((effectiveIdx % effectiveCount) + effectiveCount) % effectiveCount;
                    break;
                case "BOUNCE": {
                    const cycle = effectiveCount > 1 ? 2 * (effectiveCount - 1) : 1;
                    const pos = ((effectiveIdx % cycle) + cycle) % cycle;
                    effectiveIdx = pos < effectiveCount ? pos : cycle - pos;
                    break;
                }
                case "TRUNCATE":
                    return null;
                default:
                    effectiveIdx = Math.max(0, Math.min(effectiveIdx, effectiveCount - 1));
            }
        }

        const t = effectiveCount <= 1 ? 0 : effectiveIdx / (effectiveCount - 1);
        return { t };
    };

    /**
     * Resolve the sample position input, clamped to 0..100.
     */
    export const resolveSamplePosition = (node: NodeDefinitions.NodeFor<Definition>, context: Resolver.Context): number => {
        const raw = context.resolve<"float" | "integer">(node.id, "samplePosition")?.data ?? node.payload.samplePosition;
        const val = NumericString.Emptyable.asNumber(raw) ?? 0;
        return Math.max(0, Math.min(100, val));
    };

    /**
     * Sample a piecewise-linear function defined by sorted stops at a given position.
     * Stops should be sorted by position (0..100 scale).
     * Clamps to the nearest stop value outside the range.
     */
    export const sampleStops = (stops: { value: number; position: number }[], position: number): number => {
        if (stops.length === 0) return 0;
        if (stops.length === 1) return stops[0].value;

        if (position <= stops[0].position) return stops[0].value;
        if (position >= stops[stops.length - 1].position) return stops[stops.length - 1].value;

        let lo = 0;
        for (let i = 1; i < stops.length; i++) {
            if (stops[i].position >= position) {
                lo = i - 1;
                break;
            }
        }
        const hi = lo + 1;

        const range = stops[hi].position - stops[lo].position;
        const localT = range === 0 ? 0 : (position - stops[lo].position) / range;

        return stops[lo].value + localT * (stops[hi].value - stops[lo].value);
    };

    export const Controls = ({
        node,
        handleUpdate,
        accordion = false,
    }: {
        handleUpdate: (v: Partial<Definition["payload"]>) => void;
        node: NodeDefinitions.NodeFor<Definition>;
        accordion?: boolean;
    }): ReactNode => {
        return (
            <AccordionMaybe has={accordion} socketsIn={"mode|reverseSequence|startOffset|endOffset"} label={"Options"} nodeId={node.id}>
                <SocketIn node={node} socketId={"mode"} label={"Mode"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.mode}`}
                        onValue={(v) => handleUpdate({ mode: Number(v) })}
                        disabled={node.in.mode !== null}
                        options={MODE_OPTIONS}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"reverseSequence"}>
                    <CheckBox checked={node.payload.reverseSequence} onToggle={(reverseSequence) => handleUpdate({ reverseSequence })} disabled={node.in.reverseSequence !== null}>
                        Reverse Sequence
                    </CheckBox>
                </SocketIn>
                <SocketIn node={node} socketId={"startOffset"} label={"Start Offset"}>
                    <IntegerInput value={node.payload.startOffset} onCommit={(startOffset) => handleUpdate({ startOffset })} disabled={node.in.startOffset !== null} />
                </SocketIn>
                <SocketIn node={node} socketId={"endOffset"} label={"End Offset"}>
                    <IntegerInput value={node.payload.endOffset} onCommit={(endOffset) => handleUpdate({ endOffset })} disabled={node.in.endOffset !== null} />
                </SocketIn>
            </AccordionMaybe>
        );
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
