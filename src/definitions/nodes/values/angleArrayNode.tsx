import { nanoid } from "nanoid";
import { Icon, ICONS, NODE_ICONS, NodeIcon } from "../../../components/Icon";
import { DragEvent, ReactNode, useCallback, useRef, useState } from "react";
import styled from "styled-components";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut, SocketPair } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { Angle } from "../../datatypes/angle";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { EmptyOr } from "../../../util/misc";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

type AngleEntryData = { socket: string; value: EmptyOr<Angle.Type> };

const def = signature({
    in: { values: $.arrayOf("angle"), "value_*": "angle" },
    out: { output: $.arrayOf("angle"), count: "integer" },
});

export type AngleArrayDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        values: AngleEntryData[];
    }
>;

const newEntry = (socket: `value_${string}`, value: EmptyOr<Angle.Type>): AngleEntryData => ({ socket, value });

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<AngleArrayDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"angleArray", AngleArrayDefinition> => {
    const s0: `value_${string}` = `value_${nanoid()}`;
    const s1: `value_${string}` = `value_${nanoid()}`;
    return {
        id,
        in: {
            values: null,
            [s0]: null,
            [s1]: null,
        },
        out: {
            output: [],
            count: [],
        },
        payload: {
            label: "",
            values: input.values ?? [newEntry(s0, "0deg"), newEntry(s1, "90deg")],
        },
        type: "angleArray",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<AngleArrayDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const { alterNode, removeLinks } = Project.useMethods();

    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<AngleArrayDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const handleAddValue = useCallback(() => {
        const entry = newEntry(`value_${nanoid()}`, "0deg");
        alterNode(node.id, (n) => ({
            ...n,
            in: { ...n.in, [entry.socket]: null },
            payload: {
                ...n.payload,
                values: [...(n.payload as AngleArrayDefinition["payload"]).values, entry],
            },
        }));
    }, [alterNode, node.id]);

    const handleRemoveValue = useCallback(
        (socket: string) => {
            const linkId = node.in[socket];
            if (linkId) {
                removeLinks(linkId);
            }
            alterNode(node.id, (n) => {
                const { [socket]: _, ...restIn } = n.in;
                return {
                    ...n,
                    in: restIn,
                    payload: {
                        ...n.payload,
                        values: (n.payload as AngleArrayDefinition["payload"]).values.filter((p) => p.socket !== socket),
                    },
                };
            });
        },
        [alterNode, removeLinks, node.id, node.in],
    );

    const handleValueUpdate = useCallback(
        (socket: string, update: Partial<AngleEntryData>) => {
            handleUpdate({
                values: node.payload.values.map((p) => (p.socket === socket ? { ...p, ...update } : p)),
            });
        },
        [handleUpdate, node.payload.values],
    );

    const handleReorderValue = useCallback(
        (socket: string, toIndex: number) => {
            handleUpdate({
                values: (() => {
                    const values = [...node.payload.values];
                    const fromIndex = values.findIndex((p) => p.socket === socket);
                    if (fromIndex === -1 || fromIndex === toIndex) return values;
                    const [entry] = values.splice(fromIndex, 1);
                    values.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, entry);
                    return values;
                })(),
            });
        },
        [handleUpdate, node.payload.values],
    );

    const supersocketConnected = node.in.values !== null;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketPair node={node} socketInId={"values"} socketOutId={"output"}>
                <span>Input</span>
                <span>Output</span>
            </SocketPair>
            {supersocketConnected ? null : (
                <>
                    <ActionButton onClick={handleAddValue} flavour={"accent"}>
                        Add Angle
                    </ActionButton>
                    {node.payload.values.map((entry, idx) => (
                        <ValueEntry
                            key={entry.socket}
                            entry={entry}
                            node={node}
                            index={idx}
                            handleValueUpdate={handleValueUpdate}
                            handleRemoveValue={handleRemoveValue}
                            handleReorderValue={handleReorderValue}
                        />
                    ))}
                </>
            )}
            <NodeAccordion label="Additional Options" nodeId={node.id} socketsOut="count">
                <SocketOut node={node} socketId={"count"}>
                    Count
                </SocketOut>
            </NodeAccordion>
        </TypicalNode>
    );
};

const VALUE_MIME = "application/x-angle-array-socket";

const ValueEntry = ({
    entry,
    node,
    index,
    handleValueUpdate,
    handleRemoveValue,
    handleReorderValue,
}: {
    entry: AngleEntryData;
    node: NodeDefinitions.NodeFor<AngleArrayDefinition>;
    index: number;
    handleValueUpdate: (socket: string, update: Partial<AngleEntryData>) => void;
    handleRemoveValue: (socket: string) => void;
    handleReorderValue: (socket: string, toIndex: number) => void;
}) => {
    const [dropSide, setDropSide] = useState<"above" | "below" | null>(null);
    const ref = useRef<HTMLDivElement>(null);
    const connected = node.in[entry.socket] !== null;

    const handleDragStart = useCallback(
        (e: DragEvent) => {
            e.dataTransfer.setDragImage(ref.current as Element, 0, 0);
            e.dataTransfer.setData(VALUE_MIME, entry.socket);
            e.dataTransfer.effectAllowed = "move";
        },
        [entry.socket],
    );

    const handleDragOver = useCallback((e: DragEvent) => {
        if (!e.dataTransfer.types.includes(VALUE_MIME)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const rect = ref.current?.getBoundingClientRect();
        if (rect) {
            setDropSide(e.clientY < rect.top + rect.height / 2 ? "above" : "below");
        }
    }, []);

    const handleDragLeave = useCallback(() => setDropSide(null), []);

    const handleDrop = useCallback(
        (e: DragEvent) => {
            const socket = e.dataTransfer.getData(VALUE_MIME);
            if (socket) {
                e.preventDefault();
                handleReorderValue(socket, dropSide === "below" ? index + 1 : index);
            }
            setDropSide(null);
        },
        [handleReorderValue, index, dropSide],
    );

    const handleDragEnd = useCallback(() => setDropSide(null), []);

    return (
        <ValueEntryWrapper ref={ref} data-state={dropSide ? `drop-${dropSide}` : undefined} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onDragEnd={handleDragEnd}>
            <SocketIn node={node} socketId={entry.socket as `value_${string}`}>
                <ValueRow>
                    <AngleInput className={"valueField"} value={entry.value} onCommit={(value) => handleValueUpdate(entry.socket, { value })} disabled={connected} />
                    <DragGrip draggable onDragStart={handleDragStart}>
                        <Icon shape={ICONS.Caret.Vertical} />
                    </DragGrip>
                    <ActionButton.Lite onClick={() => handleRemoveValue(entry.socket)} flavour={"danger"}>
                        <Icon shape={ICONS.Close} />
                    </ActionButton.Lite>
                </ValueRow>
            </SocketIn>
        </ValueEntryWrapper>
    );
};

const ValueRow = styled.div`
    display: flex;
    align-items: center;
    gap: 3px;
    width: 100%;

    & > .valueField {
        flex: 1 1 0;
        width: 0;
        min-width: 0;
    }
`;

const ValueEntryWrapper = styled.div`
    position: relative;

    &[data-state="drop-above"]::before,
    &[data-state="drop-below"]::after {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        height: 2px;
        background: var(--flavour, #88f);
        pointer-events: none;
        z-index: 1;
    }
    &[data-state="drop-above"]::before {
        top: -1px;
    }
    &[data-state="drop-below"]::after {
        bottom: -1px;
    }
`;

const DragGrip = styled.div`
    cursor: grab;
    opacity: 0.4;
    display: grid;
    place-items: center;

    &:active {
        cursor: grabbing;
    }
    &:hover {
        opacity: 0.8;
    }
`;

// Resolve the effective values: the supersocket (an array<angle>) overrides everything; otherwise
// fold each per-value socket (a connected angle) over its inline authoring field.
const resolveValues = (node: NodeDefinitions.NodeFor<AngleArrayDefinition>, context: Resolver.Context): EmptyOr<Angle.Type>[] => {
    const supersocketEval = context.resolve<DataTypes.ArrayOf<DataTypes.Angle>>(node.id, "values");
    if (supersocketEval) {
        return supersocketEval.data;
    }

    const resolved: EmptyOr<Angle.Type>[] = [];
    for (const entry of node.payload.values) {
        const connected = context.resolve<DataTypes.Angle>(node.id, entry.socket);
        resolved.push(connected ? connected.data : entry.value);
    }
    return resolved;
};

const dependsOn = (node: NodeDefinitions.NodeFor<AngleArrayDefinition>, outSocket: keyof AngleArrayDefinition["outputs"], _deps: AllDeps): (keyof AngleArrayDefinition["inputs"])[] => {
    const valueSockets = node.payload.values.map((p) => p.socket) as `value_${string}`[];
    if (outSocket === "output" || outSocket === "count") {
        return ["values", ...valueSockets];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<AngleArrayDefinition>, _inSocket: keyof AngleArrayDefinition["inputs"], _deps: AllDeps): (keyof AngleArrayDefinition["outputs"])[] => {
    return ["output", "count"];
};

const evaluate = (node: NodeDefinitions.NodeFor<AngleArrayDefinition>, socket: keyof AngleArrayDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "count") {
        return { kind: "integer", data: `${resolveValues(node, context).length}` };
    }
    if (socket === "output") {
        return { kind: "array<angle>", data: resolveValues(node, context) };
    }
    return null;
};

// Supersocket override: connecting the whole `array<angle>` clears the now-hidden element family,
// then hands off to the engine (a no-op for this var-free def, kept for uniform wiring).
const onConnect = (node: NodeDefinitions.BuiltNodeOf<"angleArray", AngleArrayDefinition>, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    if (direction === "in") {
        const link = ctx.getLink(graphId, linkId);
        if (link && link.toSocket === "values") {
            const currentNode = ctx.getNode(graphId, node.id);
            if (currentNode) {
                const linkIdsToRemove: string[] = [];
                for (const [socketKey, socketLinkId] of Object.entries(currentNode.in)) {
                    if (socketKey.startsWith("value_") && socketLinkId !== null) {
                        linkIdsToRemove.push(socketLinkId);
                    }
                }
                if (linkIdsToRemove.length > 0) ctx.removeLinks(graphId, ...linkIdsToRemove);
            }
        }
    }
    SignatureEngine.onConnect(node, linkId, direction, graphId, ctx);
};

export const AngleArrayNodeType: NodeTypes.Type<"angleArray", AngleArrayDefinition> = {
    type: "angleArray",
    displayName: "Angle Array",
    defaultLabel: "Angle Array",
    iconNode: <NodeIcon shape={NODE_ICONS.angle} modifierIcon={NODE_ICONS.modifiers.arrayOf} />,
    flavour: "danger",
    category: "Values",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
    onConnect,
};
