import { nanoid } from "nanoid";
import { Icon, ICONS, NODE_ICONS } from "../../../components/Icon";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { NumericString } from "../../datatypes/numericString";
import { Enum } from "../../datatypes/enum";
import { Angle } from "../../datatypes/angle";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { Dropdown } from "../../../components/inputs/Dropdown";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { Iteration } from "../abstract";
import { EmptyOr } from "../../../util/misc";
import { lerpAngle } from "../../../util/colorSpaces";
import styled from "styled-components";

const ANGLE_TRAVERSAL_OPTIONS = Enum.options(Enum.Common.angleTraversal);
const MODE_OPTIONS = Enum.options(Enum.Common.sequencerMode);

export type AngleIteratorDefinition = {
    inputs: {
        [value: `value_${string}`]: DataTypes.Use<"angle">;
        [pos: `pos_${string}`]: DataTypes.Use<"float">;
        angleTraversal: DataTypes.Use<"enum">;
    } & Iteration.Definition["inputs"];
    outputs: {
        output: DataTypes.Use<"angle">;
    };
    payload: {
        label: string;
        angleTraversal: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        stops: { id: string; value: EmptyOr<Angle.Type>; position: EmptyOr<NumericString.Type> }[];
    } & Iteration.Definition["payload"];
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<AngleIteratorDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"angleIterator", AngleIteratorDefinition> => {
    const s0 = nanoid();
    const s1 = nanoid();
    return {
        id,
        in: {
            sequence: null,
            angleTraversal: null,
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
            angleTraversal: input.angleTraversal ?? Enum.Common.angleTraversal.CLOCKWISE.value,
            mode: input.mode ?? Enum.Common.sequencerMode.CLAMP.value,
            reverseSequence: input.reverseSequence ?? false,
            startOffset: input.startOffset ?? "0",
            endOffset: input.endOffset ?? "0",
            stops: [
                { id: s0, value: "0", position: "0" },
                { id: s1, value: "360", position: "100" },
            ],
        },
        type: "angleIterator",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<AngleIteratorDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const { alterNode, removeLinks } = Project.useMethods();

    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<AngleIteratorDefinition>>) => {
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
                stops: [...(n.payload as AngleIteratorDefinition["payload"]).stops, { id: stopId, value: "180", position: "50" }],
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
                        stops: (n.payload as AngleIteratorDefinition["payload"]).stops.filter((s) => s.id !== stopId),
                    },
                };
            });
        },
        [alterNode, removeLinks, node.id, node.in],
    );

    const handleStopValue = useCallback(
        (stopId: string, value: EmptyOr<Angle.Type>) => {
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
                        <AngleInput.SliderInput value={stop.value} onCommit={(value) => handleStopValue(stop.id, value)} disabled={node.in[`value_${stop.id}`] !== null} unbound />
                    </SocketIn>
                    <SocketIn node={node} socketId={`pos_${stop.id}`} data-part="position">
                        <DecimalInput value={stop.position} onCommit={(position) => handleStopPosition(stop.id, position)} disabled={node.in[`pos_${stop.id}`] !== null} min={"0"} max={"100"} />
                    </SocketIn>
                    <ActionButton.Lite onClick={() => handleRemoveStop(stop.id)} flavour={"danger"} data-part="remove">
                        <Icon shape={ICONS.Close} />
                    </ActionButton.Lite>
                </StopEntry>
            ))}
            <NodeAccordion label={"Options"} nodeId={node.id} socketsIn="angleTraversal|mode|reverseSequence|startOffset|endOffset">
                <SocketIn node={node} socketId={"angleTraversal"} label={"Traversal"}>
                    <Dropdown value={`${node.payload.angleTraversal}`} onValue={(v) => handleUpdate({ angleTraversal: Number(v) })} disabled={node.in.angleTraversal !== null}>
                        {ANGLE_TRAVERSAL_OPTIONS.map((each) => (
                            <option value={each.value} key={each.value}>
                                {each.label}
                            </option>
                        ))}
                    </Dropdown>
                </SocketIn>
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
            </NodeAccordion>
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

const dependsOn = (node: NodeDefinitions.NodeFor<AngleIteratorDefinition>, outSocket: keyof AngleIteratorDefinition["outputs"], _deps: AllDeps): (keyof AngleIteratorDefinition["inputs"])[] => {
    if (outSocket === "output") {
        const stopSockets = node.payload.stops.flatMap((s) => [`value_${s.id}`, `pos_${s.id}`]) as (keyof AngleIteratorDefinition["inputs"])[];
        return ["sequence", "angleTraversal", "mode", "reverseSequence", "startOffset", "endOffset", ...stopSockets];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<AngleIteratorDefinition>, _inSocket: keyof AngleIteratorDefinition["inputs"], _deps: AllDeps): (keyof AngleIteratorDefinition["outputs"])[] => {
    return ["output"];
};

/** Circular piecewise-linear interpolation between sorted angle stops */
const sampleAngleStops = (resolved: { value: number; position: number }[], position: number, traversal: number): number => {
    if (resolved.length === 0) return 0;
    if (resolved.length === 1) return resolved[0].value;

    // Clamp to range
    if (position <= resolved[0].position) return resolved[0].value;
    if (position >= resolved[resolved.length - 1].position) return resolved[resolved.length - 1].value;

    // Find bracketing stops
    let lo = 0;
    for (let i = 1; i < resolved.length; i++) {
        if (resolved[i].position >= position) {
            lo = i - 1;
            break;
        }
    }
    const hi = lo + 1;

    const range = resolved[hi].position - resolved[lo].position;
    const localT = range === 0 ? 0 : (position - resolved[lo].position) / range;

    return lerpAngle(resolved[lo].value, resolved[hi].value, localT, traversal);
};

const evaluate = (node: NodeDefinitions.NodeFor<AngleIteratorDefinition>, socket: keyof AngleIteratorDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const result = Iteration.evaluate(node, context);
    if (result === null) return null;

    const stops = node.payload.stops;
    if (stops.length === 0) return null;

    const traversal = Enum.resolve(context.resolve<"enum">(node.id, "angleTraversal")?.data, Enum.Common.angleTraversal) ?? node.payload.angleTraversal ?? Enum.Common.angleTraversal.CLOCKWISE.value;

    // Resolve all stops
    const resolved: { value: number; position: number }[] = [];
    for (const stop of stops) {
        const valStr = context.resolve<"angle">(node.id, `value_${stop.id}`)?.data ?? stop.value;
        const posStr = context.resolve<"float">(node.id, `pos_${stop.id}`)?.data ?? stop.position;
        const value = NumericString.Emptyable.asNumber(valStr) ?? 0;
        const position = NumericString.Emptyable.asNumber(posStr) ?? 0;
        resolved.push({ value, position });
    }

    // Sort by position
    resolved.sort((a, b) => a.position - b.position);

    const value = sampleAngleStops(resolved, result.t * 100, traversal);
    return { kind: "angle", data: `${value}` };
};

const SOCKETTYPES_IN: {
    [key in keyof Required<Pick<AngleIteratorDefinition["inputs"], "sequence" | "angleTraversal" | "mode" | "reverseSequence" | "startOffset" | "endOffset">>]: SocketTypes.SocketRule;
} = {
    ...Iteration.IN_SOCKET_TYPES,
    angleTraversal: { types: ["enum"], mode: "and" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<AngleIteratorDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["angle"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<AngleIteratorDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    if (side === "out") {
        return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
    if (socketId.startsWith("value_")) {
        return { types: ["angle"], mode: "and" };
    }
    if (socketId.startsWith("pos_")) {
        return { types: ["float"], mode: "and" };
    }
    return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
};

export const AngleIteratorNodeType: NodeTypes.Type<"angleIterator", AngleIteratorDefinition> = {
    type: "angleIterator",
    displayName: "Angle Iterator",
    defaultLabel: "Angle Iterator",
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
