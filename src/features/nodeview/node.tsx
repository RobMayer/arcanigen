import { useRef, useCallback, Ref, useState, Dispatch, SetStateAction, KeyboardEvent, KeyboardEventHandler, FocusEvent, useMemo } from "react";
import styled from "styled-components";
import { DragMove } from "../../components/wrappers/DragMove";
import { Project } from "../../state/project";
import { Session } from "../../state/session";
import { GraphSlots } from "./slots";
import { DataTypes } from "../../definitions/datatypes";
import { AnyDefinition, BaseDefinition } from "../../definitions/nodes/abstractNode";
import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { Icon, ICONS } from "../../components/Icon";
import TextInput from "../../components/inputs/TextInput";
import { NodeTypeRegistry } from "../../definitions";

export const GraphNode = styled(({ className, nodeId }: { nodeId: string; className?: string }) => {
    const [storedPosition, setPosition] = Project.usePositionOf(nodeId);
    const [node, { update: updateNode }] = Project.useNode(nodeId);
    const handleRef = useRef<HTMLDivElement>(null);

    const selectionRef = Session.useSelectionRef();
    const positionsRef = Project.usePositionsRef();
    const positionMethods = Project.usePositionMethods();

    const [isSelected] = Session.useIsSelected(`node_${nodeId}`);

    const handleDragDelta = useCallback(
        (delta: { x: number; y: number }) => {
            if (!selectionRef.current.has(`node_${nodeId}`)) {
                return;
            }
            const compiled = applyMoveDelta("root", delta, selectionRef, positionsRef);
            positionMethods.setMany.passive(compiled);
        },
        [selectionRef, nodeId, positionMethods.setMany, positionsRef],
    );

    const handleFinish = useCallback(
        (pos: { x: number; y: number }) => {
            if (!selectionRef.current.has(`node_${nodeId}`)) {
                setPosition(pos);
                return;
            }
            positionMethods.setMany.commit();
        },
        [nodeId, positionMethods.setMany, selectionRef, setPosition],
    );

    const localPosition = DragMove.useHandle(handleRef, storedPosition, { onFinish: handleFinish, onDelta: handleDragDelta });

    const [isOpen, setIsOpen] = useState<boolean>(true);
    const toggleOpen = useCallback(() => {
        setIsOpen((p) => !p);
    }, []);

    const setLabel = useCallback(
        (newLabel: string) => {
            updateNode({ label: newLabel });
        },
        [updateNode],
    );

    return (
        <DragMove.Item position={localPosition} className={className} title={nodeId} data-node={`--node_${nodeId}`} data-selectable={`node_${nodeId}`} data-state={isSelected ? "selected" : undefined}>
            <NodeTitle handleRef={handleRef} node={node as ArcaneGraph.NodeOf<DataTypes.PayloadFor<BaseDefinition>>} isOpen={isOpen} toggleOpen={toggleOpen} setLabel={setLabel} />
            {isOpen ? <GraphSlots nodeId={nodeId} /> : null}
        </DragMove.Item>
    );
})`
    display: grid;
    background: #363636;
    border: 1px solid #666;
    width: max-content;
    min-width: 280px;
    outline: 1px solid transparent;
    transform: translate(-50%, 0);
    anchor-name: attr(data-node type(<custom-ident>));
    outline-offset: 4px;
    border-radius: 2px;
    corner-shape: bevel;
    padding: 2px;
    transition: outline-color 0.25s;

    &[data-state~="selected"] {
        outline-color: white;
    }
`;

/*

    // we'll need this for layter
    const [inSockets, outSockets] = useMemo(() => {
    const slots = nodeType.getSlots(node);

    const doRecursion = (acc: [string[], string[]], slot: DataTypes.AnySlot) => {
        if ("socketIn" in slot && slot.socketIn !== undefined) {
            acc[0].push(`--socketFB2_${node.id}_${slot.socketIn}`);
        }
        if ("socketOut" in slot && slot.socketOut !== undefined) {
            acc[1].push(`--socketFB2_${node.id}_${slot.socketOut}`);
        }
        if ("children" in slot) {
            acc = slot.children.reduce(doRecursion, acc);
        }
        return acc;
    };

    return slots.reduce<[string[], string[]]>(doRecursion, [[], []]);
}, [node, nodeType]);

*/

const NodeTitle = styled(
    ({
        className,
        handleRef,
        node,
        isOpen,
        toggleOpen,
        setLabel,
    }: {
        className?: string;
        handleRef: Ref<HTMLDivElement>;
        node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<BaseDefinition>>;
        isOpen: boolean;
        toggleOpen: () => void;
        setLabel: (v: string) => void;
    }) => {
        const [isEditing, setIsEditing] = useState<boolean>(false);

        const nodeType = useMemo(() => {
            return NodeTypeRegistry.get(node.type);
        }, [node.type]);

        const startEdit = useCallback(() => {
            setIsEditing(true);
        }, []);

        const finishEdit = useCallback(
            (value: string) => {
                setLabel(value);
            },
            [setLabel],
        );

        const onKeyPress = useCallback((evt: KeyboardEvent<HTMLInputElement>) => {
            if (evt.nativeEvent.handled) {
                return;
            }
            if (evt.key === "Escape" || evt.key === "Enter") {
                setIsEditing(false);
            }
        }, []);

        const onBlur = useCallback((evt: FocusEvent<HTMLInputElement>) => {
            if (evt.nativeEvent.handled) {
                return;
            }
            setIsEditing(false);
        }, []);

        return (
            <div className={className} data-nodecategory={nodeType.category}>
                <NodeFallback nodeId={node.id} side={"in"} />
                <button onClick={toggleOpen}>
                    <Icon shape={isOpen ? ICONS.Caret.Down : ICONS.Caret.Right} />
                </button>

                <div data-part={"handle"} ref={handleRef} onDoubleClick={startEdit}>
                    <Icon shape={nodeType.icon} />
                    {isEditing ? (
                        <TextInput value={node.payload.label} onCommit={finishEdit} onKeyDown={onKeyPress} onBlur={onBlur} autoFocus placeholder={nodeType.defaultLabel} />
                    ) : (
                        <span>{node.payload.label === "" ? nodeType.defaultLabel : node.payload.label}</span>
                    )}
                    <Icon shape={ICONS.Blank} />
                </div>
                {node.type === "result" ? (
                    <Icon shape={ICONS.Blank} />
                ) : (
                    <button>
                        <Icon shape={ICONS.Trash} />
                    </button>
                )}
                <NodeFallback nodeId={node.id} side={"out"} />
            </div>
        );
    },
)`
    display: flex;
    align-items: center;
    padding: 0.125em;
    gap: 0.25em;
    background: #444;
    border: 1px solid #666;
    margin: 2px;

    & > button {
        color: oklch(from var(--flavour) 0.8 calc(c + 0.01) h);
    }

    & > div[data-part="handle"] {
        & > svg {
            color: oklch(from var(--flavour) calc(l + 0.1) c h);
        }
        cursor: move;
        display: flex;
        align-self: stretch;
        flex: 1 1 0;
        align-items: center;
        text-align: center;
        & > input {
            flex: 1 1 0;
            width: 0;
            min-width: 0;
            text-align: inherit;
            font-weight: bold;
        }
        & > span {
            font-size: 16pt;
            font-variant: small-caps;
            flex: 1 1 0;
            border: 1px solid transparent;
            color: white;
        }
    }

    --flavour: var(--flavour-accent);

    background-color: oklch(from var(--flavour) calc(l - 0.15) calc(c - 0.02) h);
    border-color: oklch(from var(--flavour) calc(l - 0.05) c h);

    &[data-nodecategory="shape"] {
        --flavour: var(--flavour-emphasis);
    }

    &[data-nodecategory="interface"] {
        --flavour: var(--flavour-confirm);
    }
`;

const NodeFallback = styled(({ nodeId, className, side }: { nodeId: string; className?: string; side: "in" | "out" }) => {
    const style = useMemo(() => {
        return { anchorName: `--nodeFB_${nodeId}_${side}` };
    }, [nodeId, side]);

    return <div className={className} style={style} />;
})`
    background: blue;
`;

const applyMoveDelta = (
    graph: string,
    delta: { x: number; y: number },
    selectionRef: { current: Set<string> },
    positionsRef: { current: { [graph: string]: { [node: string]: { x: number; y: number } } } },
) => {
    const compiled: { [key: string]: { x: number; y: number } } = {};

    // start with selected nodes
    for (const id of selectionRef.current) {
        if (id.startsWith("node_")) {
            const nId = id.substring(5);
            if (positionsRef.current[nId]) {
                compiled[nId] = { x: positionsRef.current[graph][nId].x + delta.x, y: positionsRef.current[graph][nId].y + delta.y };
            }
        }
    }

    // expand: for any container in the move set, add nodes within its bounds
    // for (const nId of Object.keys(compiled)) {
    /*
        const node = nodesRef.current[nId];
        if (node?.payload.type === "container") {
            const containerPos = positionsRef.current[nId];
            const { w, h } = node.payload;
            const cx = containerPos.x;
            const cy = containerPos.y;

            for (const [candidateId, candidatePos] of Object.entries(positionsRef.current)) {
                if (candidateId === nId || compiled[candidateId]) continue;
                if (candidatePos.x >= cx && candidatePos.x <= cx + w && candidatePos.y >= cy && candidatePos.y <= cy + h) {
                    compiled[candidateId] = { x: candidatePos.x + delta.x, y: candidatePos.y + delta.y };
                }
            }
        }
        */
    // }

    // apply DOM updates for visual feedback
    for (const [nId, toSet] of Object.entries(compiled)) {
        const element = document.querySelector(`div[data-selectable="node_${nId}"]`);
        element?.setAttribute("data-x", `${toSet.x}`);
        element?.setAttribute("data-y", `${toSet.y}`);
    }

    return compiled;
};
