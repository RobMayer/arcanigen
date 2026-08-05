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
import { Length } from "../../datatypes/length";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { Iteration } from "../abstract";
import { EmptyOr } from "../../../util/misc";
import styled from "styled-components";

export type LengthIteratorDefinition = {
    inputs: {
        [value: `value_${string}`]: DataTypes.Use<"length">;
        [pos: `pos_${string}`]: DataTypes.Use<"float">;
    } & Iteration.Definition["inputs"];
    outputs: {
        sequencedOutput: DataTypes.Use<"length">;
        sampledOutput: DataTypes.Use<"length">;
    };
    payload: {
        label: string;
        stops: { id: string; value: DataTypes.TypeOf<DataTypes.Use<"length">>; position: EmptyOr<NumericString.Type> }[];
    } & Iteration.Definition["payload"];
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<LengthIteratorDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"lengthIterator", LengthIteratorDefinition> => {
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
                { id: s0, value: "0px", position: "0" },
                { id: s1, value: "100px", position: "100" },
            ],
        },
        type: "lengthIterator",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<LengthIteratorDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const { alterNode, removeLinks } = Project.useMethods();

    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<LengthIteratorDefinition>>) => {
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
                stops: [...(n.payload as LengthIteratorDefinition["payload"]).stops, { id: stopId, value: "50px", position: "50" }],
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
                        stops: (n.payload as LengthIteratorDefinition["payload"]).stops.filter((s) => s.id !== stopId),
                    },
                };
            });
        },
        [alterNode, removeLinks, node.id, node.in],
    );

    const handleStopValue = useCallback(
        (stopId: string, value: DataTypes.TypeOf<DataTypes.Use<"length">>) => {
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
                        <LengthInput value={stop.value} onCommit={(value) => handleStopValue(stop.id, value)} disabled={node.in[`value_${stop.id}`] !== null} required />
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

const dependsOn = (node: NodeDefinitions.NodeFor<LengthIteratorDefinition>, outSocket: keyof LengthIteratorDefinition["outputs"], _deps: AllDeps): (keyof LengthIteratorDefinition["inputs"])[] => {
    const stopSockets = node.payload.stops.flatMap((s) => [`value_${s.id}`, `pos_${s.id}`]) as (keyof LengthIteratorDefinition["inputs"])[];
    if (outSocket === "sequencedOutput") {
        return [...Iteration.SEQUENCED_DEPS, ...stopSockets];
    }
    if (outSocket === "sampledOutput") {
        return [...Iteration.SAMPLED_DEPS, ...stopSockets];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<LengthIteratorDefinition>, inSocket: keyof LengthIteratorDefinition["inputs"], _deps: AllDeps): (keyof LengthIteratorDefinition["outputs"])[] => {
    if ((Iteration.SEQUENCED_DEPS as string[]).includes(inSocket)) return ["sequencedOutput"];
    if ((Iteration.SAMPLED_DEPS as string[]).includes(inSocket)) return ["sampledOutput"];
    return ["sequencedOutput", "sampledOutput"];
};

const evaluate = (node: NodeDefinitions.NodeFor<LengthIteratorDefinition>, socket: keyof LengthIteratorDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
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

    // Resolve all stops — parse lengths and convert to the first stop's unit
    const rawStops: { lengthStr: string; position: number }[] = [];
    for (const stop of stops) {
        const valStr = context.resolve<"length">(node.id, `value_${stop.id}`)?.data ?? stop.value;
        const posStr = context.resolve<"float">(node.id, `pos_${stop.id}`)?.data ?? stop.position;
        const pos = NumericString.Emptyable.asNumber(posStr) ?? 0;
        rawStops.push({ lengthStr: valStr, position: pos });
    }

    // Sort by position
    rawStops.sort((a, b) => a.position - b.position);

    // Determine reference unit from first stop
    const firstParsed = Length.parse(rawStops[0].lengthStr);
    const unit = firstParsed ? firstParsed[1] : "px";

    // Convert all to numeric values in reference unit
    const resolved: { value: number; position: number }[] = [];
    for (const rs of rawStops) {
        const parsed = Length.parse(rs.lengthStr);
        if (!parsed) {
            resolved.push({ value: 0, position: rs.position });
            continue;
        }
        if (parsed[1] === unit) {
            resolved.push({ value: parsed[0], position: rs.position });
        } else {
            const converted = Length.parse(Length.convert(rs.lengthStr as Length.Type, unit));
            resolved.push({ value: converted ? converted[0] : 0, position: rs.position });
        }
    }

    const value = Iteration.sampleStops(resolved, position);
    return { kind: "length", data: `${value}${unit}` };
};

const SOCKETTYPES_IN: {
    [key in keyof Required<Pick<LengthIteratorDefinition["inputs"], "sequence" | "mode" | "reverseSequence" | "startOffset" | "endOffset" | "samplePosition">>]: SocketTypes.SocketRule;
} = {
    ...Iteration.IN_SOCKET_TYPES,
};

const SOCKETTYPES_OUT: { [key in keyof Required<LengthIteratorDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    sequencedOutput: { types: ["length"], mode: "and" },
    sampledOutput: { types: ["length"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<LengthIteratorDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    if (side === "out") {
        return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
    if (socketId.startsWith("value_")) {
        return { types: ["length"], mode: "and" };
    }
    if (socketId.startsWith("pos_")) {
        return { types: ["float"], mode: "and" };
    }
    return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
};

export const LengthIteratorNodeType: NodeTypes.Type<"lengthIterator", LengthIteratorDefinition> = {
    type: "lengthIterator",
    displayName: "Length Iterator",
    defaultLabel: "Length Iterator",
    deprecated: true,
    iconNode: <Icon shape={NODE_ICONS.length} color={"var(--icon-flavour)"} cutout={"scoop"} layer={NODE_ICONS.loop} layerColor="#fff" />,
    flavour: "danger",
    category: "Logic",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
