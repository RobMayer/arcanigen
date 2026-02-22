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
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { Iteration } from "../abstract";
import { EmptyOr } from "../../../util/misc";
import styled from "styled-components";

export type IntegerIteratorDefinition = {
    inputs: {
        [value: `value_${string}`]: DataTypes.Use<"integer">;
        [pos: `pos_${string}`]: DataTypes.Use<"float">;
    } & Iteration.Definition["inputs"];
    outputs: {
        output: DataTypes.Use<"integer">;
    };
    payload: {
        label: string;
        stops: { id: string; value: EmptyOr<NumericString.Type>; position: EmptyOr<NumericString.Type> }[];
    } & Iteration.Definition["payload"];
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<IntegerIteratorDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"integerIterator", IntegerIteratorDefinition> => {
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
            [`value_${s0}`]: null,
            [`pos_${s0}`]: null,
            [`value_${s1}`]: null,
            [`pos_${s1}`]: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            mode: input.mode ?? Enum.Common.sequencerMode.CLAMP.value,
            reverseSequence: input.reverseSequence ?? false,
            startOffset: input.startOffset ?? "0",
            endOffset: input.endOffset ?? "0",
            stops: [
                { id: s0, value: "0", position: "0" },
                { id: s1, value: "10", position: "100" },
            ],
        },
        type: "integerIterator",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<IntegerIteratorDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const { alterNode, removeLinks } = Project.useMethods();

    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<IntegerIteratorDefinition>>) => {
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
                stops: [...(n.payload as IntegerIteratorDefinition["payload"]).stops, { id: stopId, value: "5", position: "50" }],
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
                        stops: (n.payload as IntegerIteratorDefinition["payload"]).stops.filter((s) => s.id !== stopId),
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
            <SocketOut node={node} socketId={"output"}>
                Output
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
                        <IntegerInput value={stop.value} onCommit={(value) => handleStopValue(stop.id, value)} disabled={node.in[`value_${stop.id}`] !== null} />
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
    gap: 0px 4px;
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

const dependsOn = (node: NodeDefinitions.NodeFor<IntegerIteratorDefinition>, outSocket: keyof IntegerIteratorDefinition["outputs"], _deps: AllDeps): (keyof IntegerIteratorDefinition["inputs"])[] => {
    if (outSocket === "output") {
        const stopSockets = node.payload.stops.flatMap((s) => [`value_${s.id}`, `pos_${s.id}`]) as (keyof IntegerIteratorDefinition["inputs"])[];
        return ["sequence", "mode", "reverseSequence", "startOffset", "endOffset", ...stopSockets];
    }
    return [];
};

const contributesTo = (
    _node: NodeDefinitions.NodeFor<IntegerIteratorDefinition>,
    _inSocket: keyof IntegerIteratorDefinition["inputs"],
    _deps: AllDeps,
): (keyof IntegerIteratorDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<IntegerIteratorDefinition>, socket: keyof IntegerIteratorDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const result = Iteration.evaluate(node, context);
    if (result === null) return null;

    const stops = node.payload.stops;
    if (stops.length === 0) return null;

    // Resolve all stops
    const resolved: { value: number; position: number }[] = [];
    for (const stop of stops) {
        const valStr = context.resolve<"integer">(node.id, `value_${stop.id}`)?.data ?? stop.value;
        const posStr = context.resolve<"float">(node.id, `pos_${stop.id}`)?.data ?? stop.position;
        const value = NumericString.Emptyable.asNumber(valStr) ?? 0;
        const position = NumericString.Emptyable.asNumber(posStr) ?? 0;
        resolved.push({ value, position });
    }

    // Sort by position
    resolved.sort((a, b) => a.position - b.position);

    const value = Math.round(Iteration.sampleStops(resolved, result.t * 100));
    return { kind: "integer", data: `${value}` };
};

const SOCKETTYPES_IN: {
    [key in keyof Required<Pick<IntegerIteratorDefinition["inputs"], "sequence" | "mode" | "reverseSequence" | "startOffset" | "endOffset">>]: SocketTypes.SocketRule;
} = {
    ...Iteration.IN_SOCKET_TYPES,
};

const SOCKETTYPES_OUT: { [key in keyof Required<IntegerIteratorDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["integer"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<IntegerIteratorDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    if (side === "out") {
        return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
    if (socketId.startsWith("value_")) {
        return { types: ["integer"], mode: "and" };
    }
    if (socketId.startsWith("pos_")) {
        return { types: ["float"], mode: "and" };
    }
    return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
};

export const IntegerIteratorNodeType: NodeTypes.Type<"integerIterator", IntegerIteratorDefinition> = {
    type: "integerIterator",
    displayName: "Integer Iterator",
    defaultLabel: "Integer Iterator",
    iconNode: <Icon shape={NODE_ICONS.spreadValue.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.spreadValue.Card} color={"var(--icon-flavour)"} />,
    category: "Collections",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
