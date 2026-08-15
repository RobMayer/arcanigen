import { nanoid } from "nanoid";
import { Icon, ICONS, NODE_ICONS, NodeIcon } from "../../../components/Icon";
import { DragEvent, ReactNode, useCallback, useRef, useState } from "react";
import styled from "styled-components";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { NumericString } from "../../datatypes/numericString";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { EmptyOr } from "../../../util/misc";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

type FloatEntryData = { socket: string; value: EmptyOr<NumericString.Type> };

const def = signature({
    in: { values: $.arrayOf("float"), "value_*": "float" },
    out: { output: $.arrayOf("float"), count: "integer" },
});

export type FloatArrayDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        values: FloatEntryData[];
    }
>;

const newEntry = (socket: `value_${string}`, value: EmptyOr<NumericString.Type>): FloatEntryData => ({ socket, value });

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<FloatArrayDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"floatArray", FloatArrayDefinition> => {
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
            values: input.values ?? [newEntry(s0, "0"), newEntry(s1, "1")],
        },
        type: "floatArray",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<FloatArrayDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const { alterNode, removeLinks } = Project.useMethods();

    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<FloatArrayDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const handleAddValue = useCallback(() => {
        const entry = newEntry(`value_${nanoid()}`, "0");
        alterNode(node.id, (n) => ({
            ...n,
            in: { ...n.in, [entry.socket]: null },
            payload: {
                ...n.payload,
                values: [...(n.payload as FloatArrayDefinition["payload"]).values, entry],
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
                        values: (n.payload as FloatArrayDefinition["payload"]).values.filter((p) => p.socket !== socket),
                    },
                };
            });
        },
        [alterNode, removeLinks, node.id, node.in],
    );

    const handleValueUpdate = useCallback(
        (socket: string, update: Partial<FloatEntryData>) => {
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
            <SocketOut node={node} socketId={"output"}>
                Floats
            </SocketOut>
            <SocketIn node={node} socketId={"values"}>
                Floats Input
            </SocketIn>
            {supersocketConnected ? null : (
                <>
                    <ActionButton onClick={handleAddValue} flavour={"accent"}>
                        Add Float
                    </ActionButton>
                    {node.payload.values.map((entry, idx) => (
                        <ValueEntry key={entry.socket} entry={entry} node={node} index={idx} handleValueUpdate={handleValueUpdate} handleRemoveValue={handleRemoveValue} handleReorderValue={handleReorderValue} />
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

const VALUE_MIME = "application/x-float-array-socket";

const ValueEntry = ({
    entry,
    node,
    index,
    handleValueUpdate,
    handleRemoveValue,
    handleReorderValue,
}: {
    entry: FloatEntryData;
    node: NodeDefinitions.NodeFor<FloatArrayDefinition>;
    index: number;
    handleValueUpdate: (socket: string, update: Partial<FloatEntryData>) => void;
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
                    <DecimalInput className={"valueField"} value={entry.value} onCommit={(value) => handleValueUpdate(entry.socket, { value })} disabled={connected} />
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

// Resolve the effective values: the supersocket (an array<float>) overrides everything; otherwise
// fold each per-value socket (a connected float) over its inline authoring field.
const resolveValues = (node: NodeDefinitions.NodeFor<FloatArrayDefinition>, context: Resolver.Context): EmptyOr<NumericString.Type>[] => {
    const supersocketEval = context.resolve<DataTypes.ArrayOf<DataTypes.Float>>(node.id, "values");
    if (supersocketEval) {
        return supersocketEval.data;
    }

    const resolved: EmptyOr<NumericString.Type>[] = [];
    for (const entry of node.payload.values) {
        const connected = context.resolve<DataTypes.Float>(node.id, entry.socket);
        resolved.push(connected ? connected.data : entry.value);
    }
    return resolved;
};

const dependsOn = (node: NodeDefinitions.NodeFor<FloatArrayDefinition>, outSocket: keyof FloatArrayDefinition["outputs"], _deps: AllDeps): (keyof FloatArrayDefinition["inputs"])[] => {
    const valueSockets = node.payload.values.map((p) => p.socket) as `value_${string}`[];
    if (outSocket === "output" || outSocket === "count") {
        return ["values", ...valueSockets];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<FloatArrayDefinition>, _inSocket: keyof FloatArrayDefinition["inputs"], _deps: AllDeps): (keyof FloatArrayDefinition["outputs"])[] => {
    return ["output", "count"];
};

const evaluate = (node: NodeDefinitions.NodeFor<FloatArrayDefinition>, socket: keyof FloatArrayDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "count") {
        return { kind: "integer", data: `${resolveValues(node, context).length}` };
    }
    if (socket === "output") {
        return { kind: "array<float>", data: resolveValues(node, context) };
    }
    return null;
};

// Supersocket override: connecting the whole `array<float>` clears the now-hidden element family,
// then hands off to the engine (a no-op for this var-free def, kept for uniform wiring).
const onConnect = (node: NodeDefinitions.BuiltNodeOf<"floatArray", FloatArrayDefinition>, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
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

export const FloatArrayNodeType: NodeTypes.Type<"floatArray", FloatArrayDefinition> = {
    type: "floatArray",
    displayName: "Float Array",
    defaultLabel: "Float Array",
    iconNode: <NodeIcon shape={NODE_ICONS.num} modifierIcon={NODE_ICONS.modifiers.arrayOf} />,
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
