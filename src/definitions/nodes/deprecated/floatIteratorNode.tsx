import { nanoid } from "nanoid";
import { Icon, ICONS, NODE_ICONS } from "../../../components/Icon";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { NumericString } from "../../datatypes/numericString";
import { Enum } from "../../datatypes/enum";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { Iteration } from "../abstract";
import { EmptyOr } from "../../../util/misc";
import styled from "styled-components";

export type FloatIteratorDefinition = {
    inputs: {
        [value: `value_${string}`]: DataTypes.Use<"float">;
        [pos: `pos_${string}`]: DataTypes.Use<"float">;
    } & Iteration.Definition["inputs"];
    outputs: {
        sequencedOutput: DataTypes.Use<"float">;
        sampledOutput: DataTypes.Use<"float">;
    };
    payload: {
        label: string;
        stops: { id: string; value: EmptyOr<NumericString.Type>; position: EmptyOr<NumericString.Type> }[];
    } & Iteration.Definition["payload"];
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<FloatIteratorDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"floatIterator", FloatIteratorDefinition> => {
    const s0 = nanoid();
    const s1 = nanoid();
    return {
        id,
        in: {
            sequence: null,
            mode: null,
            reverseSequence: null,
            startOffset: null,
            endOffset: null,
            samplePosition: null,
            [`value_${s0}`]: null,
            [`pos_${s0}`]: null,
            [`value_${s1}`]: null,
            [`pos_${s1}`]: null,
        },
        out: {
            sequencedOutput: [],
            sampledOutput: [],
        },
        payload: {
            label: "",
            mode: input.mode ?? Enum.Common.sequencerMode.CLAMP.value,
            reverseSequence: input.reverseSequence ?? false,
            startOffset: input.startOffset ?? "0",
            endOffset: input.endOffset ?? "0",
            samplePosition: input.samplePosition ?? "50",
            stops: [
                { id: s0, value: "0", position: "0" },
                { id: s1, value: "1", position: "100" },
            ],
        },
        type: "floatIterator",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<FloatIteratorDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const { alterNode, removeLinks } = Project.useMethods();

    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<FloatIteratorDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const handleAddStop = useCallback(() => {
        const stopId = nanoid();
        alterNode(node.id, (n) => ({
            ...n,
            in: { ...n.in, [`value_${stopId}`]: null, [`pos_${stopId}`]: null },
            payload: {
                ...n.payload,
                stops: [...(n.payload as FloatIteratorDefinition["payload"]).stops, { id: stopId, value: "0.5", position: "50" }],
            },
        }));
    }, [alterNode, node.id]);

    const handleRemoveStop = useCallback(
        (stopId: string) => {
            const valueLinkId = node.in[`value_${stopId}`];
            const posLinkId = node.in[`pos_${stopId}`];
            const linksToRemove = [valueLinkId, posLinkId].filter((id): id is string => id !== null);
            if (linksToRemove.length > 0) {
                removeLinks(...linksToRemove);
            }
            alterNode(node.id, (n) => {
                const { [`value_${stopId}`]: _v, [`pos_${stopId}`]: _p, ...restIn } = n.in;
                return {
                    ...n,
                    in: restIn,
                    payload: {
                        ...n.payload,
                        stops: (n.payload as FloatIteratorDefinition["payload"]).stops.filter((s) => s.id !== stopId),
                    },
                };
            });
        },
        [alterNode, removeLinks, node.id, node.in],
    );

    const handleStopValue = useCallback(
        (stopId: string, value: EmptyOr<NumericString.Type>) => {
            handleUpdate({
                stops: node.payload.stops.map((s) => (s.id === stopId ? { ...s, value } : s)),
            });
        },
        [handleUpdate, node.payload.stops],
    );

    const handleStopPosition = useCallback(
        (stopId: string, position: EmptyOr<NumericString.Type>) => {
            handleUpdate({
                stops: node.payload.stops.map((s) => (s.id === stopId ? { ...s, position } : s)),
            });
        },
        [handleUpdate, node.payload.stops],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"sampledOutput"}>
                Sampled Output
            </SocketOut>
            <SocketIn node={node} socketId={"samplePosition"} label={"Sample Position"}>
                <DecimalInput.SliderInput
                    value={node.payload.samplePosition}
                    onCommit={(samplePosition) => handleUpdate({ samplePosition })}
                    disabled={node.in.samplePosition !== null}
                    min={0}
                    max={100}
                />
            </SocketIn>
            <hr />
            <SocketOut node={node} socketId={"sequencedOutput"}>
                Sequenced Output
            </SocketOut>
            <SocketIn node={node} socketId={"sequence"}>
                Sequence
            </SocketIn>

            <hr />
            <ActionButton onClick={handleAddStop} flavour={"accent"}>
                Add Stop
            </ActionButton>
            {node.payload.stops.map((stop, idx) => (
                <StopEntry key={stop.id}>
                    <SocketIn node={node} socketId={`value_${stop.id}`} label={`Stop ${idx}`} data-part="value">
                        <DecimalInput value={stop.value} onCommit={(value) => handleStopValue(stop.id, value)} disabled={node.in[`value_${stop.id}`] !== null} />
                    </SocketIn>
                    <SocketIn node={node} socketId={`pos_${stop.id}`} data-part="position">
                        <DecimalInput value={stop.position} onCommit={(position) => handleStopPosition(stop.id, position)} disabled={node.in[`pos_${stop.id}`] !== null} min={"0"} max={"100"} />
                    </SocketIn>
                    <ActionButton.Lite onClick={() => handleRemoveStop(stop.id)} flavour={"danger"} data-part="remove">
                        <Icon shape={ICONS.Close} />
                    </ActionButton.Lite>
                </StopEntry>
            ))}
            <Iteration.Controls node={node} handleUpdate={handleUpdate} accordion />
        </TypicalNode>
    );
};

const StopEntry = styled.div`
    display: grid;
    gap: 2px 4px;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    grid-template-areas:
        "value remove"
        "position remove";
    align-items: center;
    & > [data-part="value"] {
        grid-area: value;
    }
    & > [data-part="position"] {
        grid-area: position;
    }
    & > [data-part="remove"] {
        grid-area: remove;
    }
`;

const dependsOn = (node: NodeDefinitions.NodeFor<FloatIteratorDefinition>, outSocket: keyof FloatIteratorDefinition["outputs"], _deps: AllDeps): (keyof FloatIteratorDefinition["inputs"])[] => {
    const stopSockets = node.payload.stops.flatMap((s) => [`value_${s.id}`, `pos_${s.id}`]) as (keyof FloatIteratorDefinition["inputs"])[];
    if (outSocket === "sequencedOutput") {
        return [...Iteration.SEQUENCED_DEPS, ...stopSockets];
    }
    if (outSocket === "sampledOutput") {
        return [...Iteration.SAMPLED_DEPS, ...stopSockets];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<FloatIteratorDefinition>, inSocket: keyof FloatIteratorDefinition["inputs"], _deps: AllDeps): (keyof FloatIteratorDefinition["outputs"])[] => {
    if ((Iteration.SEQUENCED_DEPS as string[]).includes(inSocket)) return ["sequencedOutput"];
    if ((Iteration.SAMPLED_DEPS as string[]).includes(inSocket)) return ["sampledOutput"];
    return ["sequencedOutput", "sampledOutput"];
};

const evaluate = (node: NodeDefinitions.NodeFor<FloatIteratorDefinition>, socket: keyof FloatIteratorDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    let position: number;
    if (socket === "sequencedOutput") {
        const result = Iteration.evaluate(node, context);
        if (result === null) return null;
        position = result.t * 100;
    } else if (socket === "sampledOutput") {
        position = Iteration.resolveSamplePosition(node, context);
    } else {
        return null;
    }

    const stops = node.payload.stops;
    if (stops.length === 0) return null;

    // Resolve all stops
    const resolved: { value: number; position: number }[] = [];
    for (const stop of stops) {
        const valStr = context.resolve<"float">(node.id, `value_${stop.id}`)?.data ?? stop.value;
        const posStr = context.resolve<"float">(node.id, `pos_${stop.id}`)?.data ?? stop.position;
        const value = NumericString.Emptyable.asNumber(valStr) ?? 0;
        const pos = NumericString.Emptyable.asNumber(posStr) ?? 0;
        resolved.push({ value, position: pos });
    }

    // Sort by position
    resolved.sort((a, b) => a.position - b.position);

    const value = Iteration.sampleStops(resolved, position);
    return { kind: "float", data: `${value}` };
};

const SOCKETTYPES_IN: {
    [key in keyof Required<Pick<FloatIteratorDefinition["inputs"], "sequence" | "mode" | "reverseSequence" | "startOffset" | "endOffset" | "samplePosition">>]: SocketTypes.SocketRule;
} = {
    ...Iteration.IN_SOCKET_TYPES,
};

const SOCKETTYPES_OUT: { [key in keyof Required<FloatIteratorDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    sequencedOutput: { types: ["float"], mode: "and" },
    sampledOutput: { types: ["float"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<FloatIteratorDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    if (side === "out") {
        return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
    if (socketId.startsWith("value_")) {
        return { types: ["float"], mode: "and" };
    }
    if (socketId.startsWith("pos_")) {
        return { types: ["float"], mode: "and" };
    }
    return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
};

export const FloatIteratorNodeType: NodeTypes.Type<"floatIterator", FloatIteratorDefinition> = {
    type: "floatIterator",
    displayName: "Float Iterator",
    defaultLabel: "Float Iterator",
    iconNode: <Icon shape={NODE_ICONS.num} color={"var(--icon-flavour)"} cutout={"scoop"} layer={NODE_ICONS.loop} layerColor="#fff" />,
    category: "Collections",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
