import { nanoid } from "nanoid";
import { Icon, ICONS, NODE_ICONS, NodeIcon } from "../../../components/Icon";
import { DragEvent, ReactNode, useCallback, useRef, useState } from "react";
import styled from "styled-components";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut, SocketPair, Slot } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { Dropdown } from "../../../components/inputs/Dropdown";
import { TextInput } from "../../../components/inputs/TextInput";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { Enum } from "../../datatypes/enum";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

type EnumEntryData = { socket: string; value: number };

const def = signature({
    in: { values: $.arrayOf("enum"), "value_*": "enum" },
    out: { output: $.arrayOf("enum"), count: "integer" },
});

export type EnumArrayDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        options: string[];
        values: EnumEntryData[];
    }
>;

const newEntry = (socket: `value_${string}`, value: number): EnumEntryData => ({ socket, value });

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<EnumArrayDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"enumArray", EnumArrayDefinition> => {
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
            options: ["Option A", "Option B"],
            values: input.values ?? [newEntry(s0, 0), newEntry(s1, 0)],
        },
        type: "enumArray",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<EnumArrayDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const { alterNode, removeLinks } = Project.useMethods();

    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<EnumArrayDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const handleAddValue = useCallback(() => {
        const entry = newEntry(`value_${nanoid()}`, 0);
        alterNode(node.id, (n) => ({
            ...n,
            in: { ...n.in, [entry.socket]: null },
            payload: {
                ...n.payload,
                values: [...(n.payload as EnumArrayDefinition["payload"]).values, entry],
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
                        values: (n.payload as EnumArrayDefinition["payload"]).values.filter((p) => p.socket !== socket),
                    },
                };
            });
        },
        [alterNode, removeLinks, node.id, node.in],
    );

    const handleValueUpdate = useCallback(
        (socket: string, update: Partial<EnumEntryData>) => {
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

    const handleOptionChange = useCallback(
        (index: number, label: string) => {
            const options = [...node.payload.options];
            options[index] = label;
            handleUpdate({ options });
        },
        [handleUpdate, node.payload.options],
    );

    const handleAddOption = useCallback(() => {
        handleUpdate({ options: [...node.payload.options, `Option ${String.fromCharCode(65 + node.payload.options.length)}`] });
    }, [handleUpdate, node.payload.options]);

    const handleRemoveOption = useCallback(
        (index: number) => {
            const options = node.payload.options.filter((_, i) => i !== index);
            const maxIdx = Math.max(0, options.length - 1);
            const values = node.payload.values.map((entry) => ({
                ...entry,
                value: entry.value >= options.length ? maxIdx : entry.value,
            }));
            handleUpdate({ options, values });
        },
        [handleUpdate, node.payload.options, node.payload.values],
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
                        Add Enum
                    </ActionButton>
                    {node.payload.values.map((entry, idx) => (
                        <ValueEntry
                            key={entry.socket}
                            entry={entry}
                            node={node}
                            index={idx}
                            options={node.payload.options}
                            handleValueUpdate={handleValueUpdate}
                            handleRemoveValue={handleRemoveValue}
                            handleReorderValue={handleReorderValue}
                        />
                    ))}
                </>
            )}
            <NodeAccordion label={"Options"} nodeId={node.id}>
                <ActionButton onClick={handleAddOption} flavour={"accent"}>
                    Add Option
                </ActionButton>
                {node.payload.options.map((opt, i) => (
                    <Slot key={i}>
                        <TextInput value={opt} onCommit={(v) => handleOptionChange(i, v)} />
                        <ActionButton.Lite onClick={() => handleRemoveOption(i)} flavour={"danger"}>
                            <Icon shape={ICONS.Close} />
                        </ActionButton.Lite>
                    </Slot>
                ))}
                <NodeAccordion label={"Presets"} nodeId={node.id}>
                    {Enum.PRESETS.map(({ label, options }) => (
                        <ActionButton key={label} onClick={() => handleUpdate({ options: Enum.labels(options) })}>
                            {label}
                        </ActionButton>
                    ))}
                </NodeAccordion>
            </NodeAccordion>
            <NodeAccordion label="Additional Options" nodeId={node.id} socketsOut="count">
                <SocketOut node={node} socketId={"count"}>
                    Count
                </SocketOut>
            </NodeAccordion>
        </TypicalNode>
    );
};

const VALUE_MIME = "application/x-enum-array-socket";

const ValueEntry = ({
    entry,
    node,
    index,
    options,
    handleValueUpdate,
    handleRemoveValue,
    handleReorderValue,
}: {
    entry: EnumEntryData;
    node: NodeDefinitions.NodeFor<EnumArrayDefinition>;
    index: number;
    options: string[];
    handleValueUpdate: (socket: string, update: Partial<EnumEntryData>) => void;
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
                    <Dropdown className={"valueField"} value={String(entry.value)} onValue={(v) => handleValueUpdate(entry.socket, { value: Number(v) })} disabled={connected}>
                        {options.map((opt, i) => (
                            <option value={i} key={i}>
                                {opt}
                            </option>
                        ))}
                    </Dropdown>
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

const resolveValues = (node: NodeDefinitions.NodeFor<EnumArrayDefinition>, context: Resolver.Context): number[] => {
    const supersocketEval = context.resolve<DataTypes.ArrayOf<DataTypes.Enum>>(node.id, "values");
    if (supersocketEval) {
        return supersocketEval.data;
    }

    const resolved: number[] = [];
    for (const entry of node.payload.values) {
        const connected = context.resolve<DataTypes.Enum>(node.id, entry.socket);
        resolved.push(connected ? connected.data : entry.value);
    }
    return resolved;
};

const dependsOn = (node: NodeDefinitions.NodeFor<EnumArrayDefinition>, outSocket: keyof EnumArrayDefinition["outputs"], _deps: AllDeps): (keyof EnumArrayDefinition["inputs"])[] => {
    const valueSockets = node.payload.values.map((p) => p.socket) as `value_${string}`[];
    if (outSocket === "output" || outSocket === "count") {
        return ["values", ...valueSockets];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<EnumArrayDefinition>, _inSocket: keyof EnumArrayDefinition["inputs"], _deps: AllDeps): (keyof EnumArrayDefinition["outputs"])[] => {
    return ["output", "count"];
};

const evaluate = (node: NodeDefinitions.NodeFor<EnumArrayDefinition>, socket: keyof EnumArrayDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "count") {
        return { kind: "integer", data: `${resolveValues(node, context).length}` };
    }
    if (socket === "output") {
        return { kind: "array<enum>", data: resolveValues(node, context) };
    }
    return null;
};

const onConnect = (node: NodeDefinitions.BuiltNodeOf<"enumArray", EnumArrayDefinition>, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
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

export const EnumArrayNodeType: NodeTypes.Type<"enumArray", EnumArrayDefinition> = {
    type: "enumArray",
    displayName: "Enum Array",
    defaultLabel: "Enum Array",
    iconNode: <NodeIcon shape={NODE_ICONS.list} modifierIcon={NODE_ICONS.modifiers.arrayOf} />,
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
