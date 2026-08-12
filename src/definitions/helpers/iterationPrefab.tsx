import { ReactNode } from "react";
import { RadioButton } from "../../components/buttons/RadioButton";
import { CheckBox } from "../../components/buttons/CheckBox";
import { IntegerInput } from "../../components/inputs/IntegerInput";
import { NodeAccordion, SocketIn } from "../../features/nodeview/slots";
import { NodeDefinitions } from "../nodeTypes";
import { DataTypes } from "../dataTypes";
import { Enum } from "../datatypes/enum";
import { NumericString } from "../datatypes/numericString";
import { Resolver } from "../../util/resolver";
import { EmptyOr } from "../../util/misc";

const MODE_OPTIONS = Enum.options(Enum.Common.sequencerMode);

export namespace IterationPrefab {
    export type Definition = {
        inputs: {
            sequence: DataTypes.Sequence;
            mode: DataTypes.Enum;
            reverseSequence: DataTypes.Boolean;
            startOffset: DataTypes.Integer;
            endOffset: DataTypes.Integer;
            samplePosition: DataTypes.Float | DataTypes.Integer;
        };
        outputs: NodeDefinitions.Generic["outputs"];
        payload: {
            mode: DataTypes.TypeOf<DataTypes.Enum>;
            reverseSequence: boolean;
            startOffset: EmptyOr<NumericString.Type>;
            endOffset: EmptyOr<NumericString.Type>;
            samplePosition: EmptyOr<NumericString.Type>;
        };
    };

    export const SEQUENCED_DEPS: (keyof Definition["inputs"])[] = ["sequence", "mode", "reverseSequence", "startOffset", "endOffset"];
    export const SAMPLED_DEPS: (keyof Definition["inputs"])[] = ["samplePosition"];

    export const evaluate = (node: NodeDefinitions.NodeFor<Definition>, context: Resolver.Context): { t: number } | null => {
        const sequenceEval = context.resolve<DataTypes.Sequence>(node.id, "sequence");
        if (!sequenceEval) return null;

        const { senderId, count } = sequenceEval.data;
        if (count <= 0) return null;

        const reverseSequence = context.resolve<DataTypes.Boolean>(node.id, "reverseSequence")?.data ?? node.payload.reverseSequence;
        const startOffsetStr = context.resolve<DataTypes.Integer>(node.id, "startOffset")?.data ?? node.payload.startOffset;
        const endOffsetStr = context.resolve<DataTypes.Integer>(node.id, "endOffset")?.data ?? node.payload.endOffset;
        const startOffset = startOffsetStr === "" ? 0 : parseInt(startOffsetStr, 10) || 0;
        const endOffset = endOffsetStr === "" ? 0 : parseInt(endOffsetStr, 10) || 0;
        const modeEnum = context.resolve<DataTypes.Enum>(node.id, "mode")?.data ?? node.payload.mode;
        const modeKey = Enum.keyOf(Enum.Common.sequencerMode, modeEnum);

        let iter = context.cursorData[senderId] ?? 0;

        if (reverseSequence) {
            iter = count - 1 - iter;
        }

        const effectiveStart = startOffset;
        const effectiveEnd = count - 1 + endOffset;
        const effectiveCount = effectiveEnd - effectiveStart + 1;
        if (effectiveCount <= 0) return null;

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

    export const resolveSamplePosition = (node: NodeDefinitions.NodeFor<Definition>, context: Resolver.Context): number => {
        const raw = context.resolve<DataTypes.Float | DataTypes.Integer>(node.id, "samplePosition")?.data ?? node.payload.samplePosition;
        const val = NumericString.Emptyable.asNumber(raw) ?? 0;
        return Math.max(0, Math.min(100, val));
    };

    export const sampleStopsWith = <T,>(stops: { value: T; position: number }[], position: number, lerp: (a: T, b: T, t: number) => T): T => {
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

        return lerp(stops[lo].value, stops[hi].value, localT);
    };

    export const sampleStops = (stops: { value: number; position: number }[], position: number): number => {
        if (stops.length === 0) return 0;
        return sampleStopsWith(stops, position, (a, b, t) => a + t * (b - a));
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
            <AccordionMaybe has={accordion} socketsIn={"mode|reverseSequence|startOffset|endOffset"} label={"Iteration Options"} nodeId={node.id}>
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
