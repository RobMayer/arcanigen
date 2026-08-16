import { nanoid } from "nanoid";
import { Icon, ICONS, NODE_ICONS, NodeIcon } from "../../../components/Icon";
import { DragEvent, ReactNode, useCallback, useRef, useState } from "react";
import styled from "styled-components";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

// Array constructs an `array<T>` from a dynamic list of individual `T` elements (in socket order). Unlike the
// typed array constructors (Integer Array, etc.) there is no inline widget per row -- `T` is an arbitrary
// subtype known only from what connects. `value_*` is a plain (shared) var, so every live element socket
// COLLAPSES to the same type: connect an `integer` and the remaining rows only accept `integer`. Disconnected
// rows contribute nothing.
const def = signature({
    args: { T: $.ANY },
    in: ({ T }) => ({ "value_*": T }),
    out: ({ T }) => ({ output: $.arrayOf(T), count: "integer" }),
});

export type ArrayDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        values: string[];
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<ArrayDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"array", ArrayDefinition> => {
    const s0: `value_${string}` = `value_${nanoid()}`;
    const s1: `value_${string}` = `value_${nanoid()}`;
    return {
        id,
        in: { [s0]: null, [s1]: null },
        out: { output: [], count: [] },
        payload: { label: "", values: [s0, s1] },
        type: "array",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ArrayDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const { alterNode, removeLinks } = Project.useMethods();

    const handleAddValue = useCallback(() => {
        const socket: `value_${string}` = `value_${nanoid()}`;
        alterNode(node.id, (n) => ({
            ...n,
            in: { ...n.in, [socket]: null },
            payload: {
                ...n.payload,
                values: [...(n.payload as ArrayDefinition["payload"]).values, socket],
            },
        }));
    }, [alterNode, node.id]);

    const handleRemoveValue = useCallback(
        (socket: string) => {
            const linkId = node.in[socket];
            if (linkId) removeLinks(linkId);
            alterNode(node.id, (n) => {
                const { [socket]: _, ...restIn } = n.in;
                return {
                    ...n,
                    in: restIn,
                    payload: {
                        ...n.payload,
                        values: (n.payload as ArrayDefinition["payload"]).values.filter((s) => s !== socket),
                    },
                };
            });
        },
        [alterNode, removeLinks, node.id, node.in],
    );

    const handleReorderValue = useCallback(
        (socket: string, toIndex: number) => {
            methods.update<NodeDefinitions.PayloadTypeOf<ArrayDefinition>>({
                values: (() => {
                    const values = [...node.payload.values];
                    const fromIndex = values.indexOf(socket);
                    if (fromIndex === -1 || fromIndex === toIndex) return values;
                    const [entry] = values.splice(fromIndex, 1);
                    values.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, entry);
                    return values;
                })(),
            });
        },
        [methods, node.payload.values],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Array
            </SocketOut>
            <ActionButton onClick={handleAddValue} flavour={"accent"}>
                Add Element
            </ActionButton>
            {node.payload.values.map((socket, idx) => (
                <ValueEntry key={socket} socket={socket} node={node} index={idx} handleRemoveValue={handleRemoveValue} handleReorderValue={handleReorderValue} />
            ))}
            <NodeAccordion label="Additional Options" nodeId={node.id} socketsOut="count">
                <SocketOut node={node} socketId={"count"}>
                    Count
                </SocketOut>
            </NodeAccordion>
        </TypicalNode>
    );
};

const VALUE_MIME = "application/x-array-socket";

const ValueEntry = ({
    socket,
    node,
    index,
    handleRemoveValue,
    handleReorderValue,
}: {
    socket: string;
    node: NodeDefinitions.NodeFor<ArrayDefinition>;
    index: number;
    handleRemoveValue: (socket: string) => void;
    handleReorderValue: (socket: string, toIndex: number) => void;
}) => {
    const [dropSide, setDropSide] = useState<"above" | "below" | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    const handleDragStart = useCallback(
        (e: DragEvent) => {
            e.dataTransfer.setDragImage(ref.current as Element, 0, 0);
            e.dataTransfer.setData(VALUE_MIME, socket);
            e.dataTransfer.effectAllowed = "move";
        },
        [socket],
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
            const dragged = e.dataTransfer.getData(VALUE_MIME);
            if (dragged) {
                e.preventDefault();
                handleReorderValue(dragged, dropSide === "below" ? index + 1 : index);
            }
            setDropSide(null);
        },
        [handleReorderValue, index, dropSide],
    );

    const handleDragEnd = useCallback(() => setDropSide(null), []);

    return (
        <ValueEntryWrapper ref={ref} data-state={dropSide ? `drop-${dropSide}` : undefined} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onDragEnd={handleDragEnd}>
            <SocketIn node={node} socketId={socket as `value_${string}`}>
                <ValueRow>
                    <span className={"valueLabel"}>Element {index + 1}</span>
                    <DragGrip draggable onDragStart={handleDragStart}>
                        <Icon shape={ICONS.Caret.Vertical} />
                    </DragGrip>
                    <ActionButton.Lite onClick={() => handleRemoveValue(socket)} flavour={"danger"}>
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

    & > .valueLabel {
        flex: 1 1 0;
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

const dependsOn = (node: NodeDefinitions.NodeFor<ArrayDefinition>, outSocket: keyof ArrayDefinition["outputs"], _deps: AllDeps): (keyof ArrayDefinition["inputs"])[] => {
    if (outSocket === "output" || outSocket === "count") {
        return node.payload.values as `value_${string}`[];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ArrayDefinition>, inSocket: keyof ArrayDefinition["inputs"], _deps: AllDeps): (keyof ArrayDefinition["outputs"])[] => {
    if (typeof inSocket === "string" && inSocket.startsWith("value_")) return ["output", "count"];
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<ArrayDefinition>, socket: keyof ArrayDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output" && socket !== "count") return null;

    const out: unknown[] = [];
    let elementKind: string | null = null;
    for (const value of node.payload.values) {
        const element = context.resolve<DataTypes.AnyKind>(node.id, value);
        if (!element) continue; // disconnected row -> contributes nothing
        if (elementKind === null) elementKind = element.kind;
        out.push(element.data);
    }
    if (elementKind === null) return null; // nothing connected -> no element type to emit

    if (socket === "count") return { kind: "integer", data: `${out.length}` };
    return { kind: `array<${elementKind}>`, data: out };
};

export const ArrayNodeType: NodeTypes.Type<"array", ArrayDefinition> = {
    type: "array",
    displayName: "Array",
    defaultLabel: "Array",
    iconNode: <NodeIcon shape={NODE_ICONS.questionMark} modifierIcon={NODE_ICONS.modifiers.arrayOf} />,
    flavour: "danger",
    category: "Values",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
