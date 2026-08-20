import { useRef, useCallback, Ref, useState, KeyboardEvent, FocusEvent, useMemo, ReactNode, MouseEvent, CSSProperties } from "react";
import styled from "styled-components";
import { DragMove } from "../../components/wrappers/DragMove";
import { Project } from "../../state/project";
import { Session } from "../../state/session";
import { Icon, ICONS } from "../../components/Icon";
import { Flavour } from "../../components/types";
import { TextInput } from "../../components/inputs/TextInput";
import { ActionButton } from "../../components/buttons/ActionButton";
import { useGraphId } from "../../state/graphId";
import { NodeDefinitions, NodeTypes } from "../../definitions/nodeTypes";
import { ContextPopup } from "../../components/popups/ContextPopup";
import { useDragPaneInternal } from "../../components/wrappers/DragPane";
import { useSubgraphEditor } from "../subgraph";
import { nanoid } from "nanoid";

export const GraphNode = ({ nodeId }: { nodeId: string }) => {
    const graphId = useGraphId();
    const [node, nodeMethods] = Project.useNode(graphId, nodeId);
    const Controls = useMemo(() => NodeTypes.getControls(node.type), [node.type]);
    if (!Controls) return null;

    return <Controls node={node} methods={nodeMethods} />;
};

export const TypicalNode = styled(
    ({
        className,
        node,
        methods,
        children,
        flavour,
        iconNode,
    }: {
        methods: ReturnType<typeof Project.useNode>[1];
        node: NodeDefinitions.NodeFor<NodeDefinitions.Any>;
        className?: string;
        children?: ReactNode;
        flavour?: Flavour;
        iconNode?: ReactNode;
    }) => {
        const nodeId = node.id;
        const { update: updateNode, remove: removeNode } = methods;
        const { cloneNode, cloneManyNodes, removeManyNodes, makeSubgraphFromSelection } = Project.useMethods();
        const subgraphEditor = useSubgraphEditor();
        const graphId = useGraphId();
        const [storedPosition, setPosition] = Project.usePositionOf(graphId, nodeId);
        const handleRef = useRef<HTMLDivElement>(null);
        const [, paneControls] = useDragPaneInternal();

        const selectionRef = Session.useSelectionRef();
        const positionsRef = Project.usePositionsRef();
        const selectMethods = Session.useSelectionMethods();
        const positionMethods = Project.usePositionMethods();

        const [isSelected] = Session.useIsSelected(`node_${nodeId}`);

        const handleFocus = useCallback(() => {
            if (!selectionRef.current.has(`node_${nodeId}`)) {
                selectMethods.set(`node_${nodeId}`);
            }
        }, [selectionRef, nodeId, selectMethods]);

        const handleDragDelta = useCallback(
            (delta: { x: number; y: number }) => {
                if (!selectionRef.current.has(`node_${nodeId}`)) {
                    return;
                }
                const compiled = applyMoveDelta(graphId, delta, selectionRef, positionsRef);
                positionMethods.setMany.passive(compiled);
            },
            [selectionRef, nodeId, positionMethods.setMany, positionsRef, graphId],
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

        const localPosition = DragMove.useHandle(handleRef, storedPosition, { onFinish: handleFinish, onDelta: handleDragDelta, zoom: () => paneControls.get().z });

        const [isClosed, setIsClosed] = Project.useUiState<boolean>(`node_accordion[${graphId}][${node.id}]`);
        const toggle = useCallback(() => {
            setIsClosed((p) => (p ? undefined : true));
        }, [setIsClosed]);

        const setLabel = useCallback(
            (newLabel: string) => {
                updateNode({ label: newLabel });
            },
            [updateNode],
        );

        const handleClone = useCallback(() => {
            cloneNode(nodeId);
        }, [cloneNode, nodeId]);

        const handleCloneSelected = useCallback(() => {
            const selectedIds = [...selectionRef.current].filter((key) => key.startsWith("node_")).map((key) => key.substring(5));
            const mapping = cloneManyNodes(selectedIds);
            if (mapping.length > 0) {
                selectMethods.set(mapping.map(({ clone }) => `node_${clone}`));
            }
        }, [selectionRef, cloneManyNodes, selectMethods]);

        const handleDeleteSelected = useCallback(() => {
            const selectedIds = [...selectionRef.current].filter((key) => key.startsWith("node_")).map((key) => key.substring(5));
            removeManyNodes(...selectedIds);
            selectMethods.clear();
        }, [selectionRef, removeManyNodes, selectMethods]);

        const extractToSubgraph = useCallback(
            (copy: boolean) => {
                const selectedIds = [...selectionRef.current].filter((key) => key.startsWith("node_")).map((key) => key.substring(5));
                const subgraphId = nanoid();
                if (makeSubgraphFromSelection(subgraphId, "Untitled", selectedIds, copy)) {
                    selectMethods.clear();
                    subgraphEditor.open(subgraphId);
                }
            },
            [selectionRef, makeSubgraphFromSelection, selectMethods, subgraphEditor],
        );

        const handleMoveToSubgraph = useCallback(() => extractToSubgraph(false), [extractToSubgraph]);
        const handleCopyToSubgraph = useCallback(() => extractToSubgraph(true), [extractToSubgraph]);

        const style = useMemo(() => {
            return { "--node": `--node_${nodeId}` } as CSSProperties;
        }, [nodeId]);

        return (
            <DragMove.Item position={localPosition} className={className} data-moveable={`node_${nodeId}`} onFocus={handleFocus}>
                <div data-part={"body"} style={style} data-node={`--node_${nodeId}`} data-state={isSelected ? "selected" : undefined} data-selectable={`node_${nodeId}`}>
                    <NodeTitle
                        handleRef={handleRef}
                        node={node}
                        isOpen={!isClosed}
                        toggleOpen={toggle}
                        setLabel={setLabel}
                        onDelete={removeNode}
                        onClone={handleClone}
                        onCloneSelected={handleCloneSelected}
                        onDeleteSelected={handleDeleteSelected}
                        onMoveToSubgraph={handleMoveToSubgraph}
                        onCopyToSubgraph={handleCopyToSubgraph}
                        flavour={flavour}
                        iconNode={iconNode}
                    />
                    {isClosed ? null : <NodeSlots>{children}</NodeSlots>}
                </div>
            </DragMove.Item>
        );
    },
)`
    display: grid;
    place-content: start center;
    place-items: start center;
    width: 0px;
    height: 0px;

    & > [data-part="body"][data-state~="selected"] {
        outline-color: white;
    }

    & > [data-part="body"] {
        display: grid;
        background: #333;
        border: 1px solid #666;
        width: max-content;
        min-width: 280px;
        outline: 1px solid transparent;
        anchor-name: var(--node);
        outline-offset: 4px;
        border-radius: 2px;
        corner-shape: bevel;
        padding: 2px;
        transition: outline-color 0.25s;
        box-shadow: 0px 4px 8px black;

        & hr {
            border-color: #666;
            margin-block: 0.5em;
        }
    }
`;

const NodeSlots = styled.div`
    display: grid;
    gap: 8px;
    margin: 8px;
`;

const NodeTitle = styled(
    ({
        className,
        handleRef,
        node,
        isOpen,
        toggleOpen,
        setLabel,
        onDelete,
        onClone,
        onCloneSelected,
        onDeleteSelected,
        onMoveToSubgraph,
        onCopyToSubgraph,
        flavour: flavourOverride,
        iconNode: iconNodeOverride,
    }: {
        className?: string;
        handleRef: Ref<HTMLDivElement>;
        node: NodeDefinitions.NodeFor<NodeDefinitions.Base>;
        isOpen: boolean;
        toggleOpen: () => void;
        setLabel: (v: string) => void;
        onDelete: () => void;
        onClone: () => void;
        onCloneSelected: () => void;
        onDeleteSelected: () => void;
        onMoveToSubgraph: () => void;
        onCopyToSubgraph: () => void;
        flavour?: Flavour;
        iconNode?: ReactNode;
    }) => {
        const [isEditing, setIsEditing] = useState<boolean>(false);
        const contextControls = ContextPopup.useControls();

        const nodeType = useMemo(() => {
            return NodeTypes.get(node.type);
        }, [node.type]);

        const flavour = flavourOverride ?? nodeType.flavour;
        const iconNode = iconNodeOverride ?? nodeType.iconNode;

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

        const [, nodePaneControls] = useDragPaneInternal();
        const handleContextMenu = useCallback(
            (evt: MouseEvent<HTMLDivElement>) => {
                const paneElement = nodePaneControls.paneRef().current;
                if (paneElement) {
                    evt.preventDefault();
                    const rect = paneElement.getBoundingClientRect();
                    const { x: panX, y: panY, z } = nodePaneControls.get();
                    const offsetX = rect.left + rect.width / 2 + panX * z;
                    const offsetY = rect.top + rect.height / 2 + panY * z;
                    contextControls.openAt((evt.clientX - offsetX) / z, (evt.clientY - offsetY) / z);
                }
            },
            [contextControls, nodePaneControls],
        );

        const handleCloneAndClose = useCallback(() => {
            onClone();
            contextControls.close();
        }, [onClone, contextControls]);

        const handleDeleteAndClose = useCallback(() => {
            onDelete();
            contextControls.close();
        }, [onDelete, contextControls]);

        // Close BEFORE mutating selection: closing the popup restores focus to the right-clicked node, which
        // fires its onFocus -> self-select. Doing our selection change afterwards lets it win that race.
        const handleCloneSelectedAndClose = useCallback(() => {
            contextControls.close();
            onCloneSelected();
        }, [onCloneSelected, contextControls]);

        const handleDeleteSelectedAndClose = useCallback(() => {
            contextControls.close();
            onDeleteSelected();
        }, [onDeleteSelected, contextControls]);

        const handleMoveToSubgraphAndClose = useCallback(() => {
            contextControls.close();
            onMoveToSubgraph();
        }, [onMoveToSubgraph, contextControls]);

        const handleCopyToSubgraphAndClose = useCallback(() => {
            contextControls.close();
            onCopyToSubgraph();
        }, [onCopyToSubgraph, contextControls]);

        return (
            <div className={className} data-nodecategory={nodeType.category} data-flavour={flavour}>
                <NodeFallback nodeId={node.id} side={"in"} />
                <ActionButton.Lite onClick={toggleOpen} flavour={flavour}>
                    <Icon shape={isOpen ? ICONS.Caret.Down : ICONS.Caret.Right} />
                </ActionButton.Lite>

                <div data-part={"handle"} ref={handleRef} onDoubleClick={startEdit} onContextMenu={handleContextMenu}>
                    {iconNode}
                    {isEditing ? (
                        <TextInput value={node.payload.label} onCommit={finishEdit} onKeyDown={onKeyPress} onBlur={onBlur} autoFocus placeholder={nodeType.defaultLabel} />
                    ) : (
                        <span>{node.payload.label === "" ? nodeType.defaultLabel : node.payload.label}</span>
                    )}
                    <Icon shape={ICONS.Blank} />
                </div>
                <ActionButton.Lite onClick={onDelete} flavour={flavour}>
                    <Icon shape={ICONS.Close} />
                </ActionButton.Lite>
                <NodeFallback nodeId={node.id} side={"out"} />
                <ContextPopup controls={contextControls}>
                    <ActionButton.Option onClick={handleCloneAndClose}>Clone</ActionButton.Option>
                    <ActionButton.Option onClick={handleCloneSelectedAndClose}>Clone Selected</ActionButton.Option>
                    <ActionButton.Option onClick={handleMoveToSubgraphAndClose}>Move Selection to new Subgraph</ActionButton.Option>
                    <ActionButton.Option onClick={handleCopyToSubgraphAndClose}>Copy Selection to new Subgraph</ActionButton.Option>
                    <ActionButton.Option flavour={"danger"} onClick={handleDeleteAndClose}>
                        Delete
                    </ActionButton.Option>
                    <ActionButton.Option flavour={"danger"} onClick={handleDeleteSelectedAndClose}>
                        Delete Selected
                    </ActionButton.Option>
                </ContextPopup>
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

    background-color: oklch(from var(--flavour) calc(l - 0.15) calc(c - 0.02) h);
    border-color: oklch(from var(--flavour) calc(l - 0.05) c h);
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
            if (positionsRef.current[graph]?.[nId]) {
                compiled[nId] = { x: positionsRef.current[graph][nId].x + delta.x, y: positionsRef.current[graph][nId].y + delta.y };
            }
        }
    }

    // expand: for any container in the move set, add nodes within its bounds
    /*
    for (const nId of Object.keys(compiled)) {
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
    }
        */

    // apply DOM updates for visual feedback
    for (const [nId, toSet] of Object.entries(compiled)) {
        const element = document.querySelector(`div[data-moveable="node_${nId}"]`);
        (element as HTMLElement)?.style.setProperty("--x", `${toSet.x}px`);
        (element as HTMLElement)?.style.setProperty("--y", `${toSet.y}px`);
        element?.setAttribute("data-x", `${toSet.x}`);
        element?.setAttribute("data-y", `${toSet.y}`);
    }

    return compiled;
};
