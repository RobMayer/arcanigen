import { useMemo } from "react";
import { nanoid } from "nanoid";
import { Project } from "../../state/project";
import { Session } from "../../state/session";
import { ActionButton } from "../../components/buttons/ActionButton";
import { ContextPopup } from "../../components/popups/ContextPopup";
import { useSubgraphEditor } from "../subgraph";
import styled from "styled-components";
import { Icon, ICONS } from "../../components/Icon";
import { Flavour, FLAVOUR_LABELS } from "../../components/types";
import { useGraphId } from "../../state/graphId";

type ContextControls = ReturnType<typeof ContextPopup.useControls>;
type ContainerFlavour = Exclude<Flavour, "accent" | "inherit">;

// The "Selected" actions all skip the Result node, so they are no-ops when Result is the only selection. Read
// (don't subscribe to) the current selection to decide whether to disable them. A menu re-renders when it opens
// (its node self-selects on right-click), so the read is fresh at that point.
const useHasSelectableSelection = () => {
    const selectionRef = Session.useSelectionRef();
    const nodesRef = Project.useNodesRef();
    const graphId = useGraphId();
    const nodes = nodesRef.current[graphId];
    return [...selectionRef.current].some((key) => {
        if (!key.startsWith("node_")) return false;
        const node = nodes?.[key.substring(5)];
        return !!node && node.type !== "result";
    });
};

// Collapse/expand accept ANY selected node (Result included), so they only need something -- anything -- selected.
const useHasSelection = () => {
    const selectionRef = Session.useSelectionRef();
    return [...selectionRef.current].some((key) => key.startsWith("node_"));
};

// Shared LOGIC only (not layout) for the selection-wide context-menu actions. Each returned handler is a ready
// onClick that: snapshots the selection, closes the popup, then runs -- capturing BEFORE close matters because
// closing restores focus to whatever was focused when the menu opened, which can self-select a node and shrink
// the selection out from under the action. The action's own final selection change then wins that race.
export const useSelectionActions = (close: () => void) => {
    const { cloneManyNodes, removeManyNodes, makeSubgraphFromSelection, copySelection, cutSelection } = Project.useMethods();
    const selectionRef = Session.useSelectionRef();
    const selectMethods = Session.useSelectionMethods();
    const subgraphEditor = useSubgraphEditor();
    const { setMany } = Project.useUiStateMethods();
    const graphId = useGraphId();

    return useMemo(() => {
        const getSelectedIds = () => [...selectionRef.current].filter((key) => key.startsWith("node_")).map((key) => key.substring(5));
        const make = (fn: (ids: string[]) => void) => () => {
            const ids = getSelectedIds();
            close();
            fn(ids);
        };
        const extractToSubgraph = (ids: string[], copyMode: boolean) => {
            const subgraphId = nanoid();
            if (makeSubgraphFromSelection(subgraphId, "Untitled", ids, copyMode)) {
                selectMethods.clear();
                subgraphEditor.open(subgraphId);
            }
        };
        return {
            cloneSelected: make((ids) => {
                const mapping = cloneManyNodes(ids);
                if (mapping.length > 0) selectMethods.set(mapping.map(({ clone }) => `node_${clone}`));
            }),
            deleteSelected: make((ids) => {
                removeManyNodes(...ids);
                selectMethods.clear();
            }),
            cut: make((ids) => {
                cutSelection(ids);
                selectMethods.clear();
            }),
            copy: make((ids) => {
                copySelection(ids);
                // Copy doesn't change the selection, but the focus-restore might have; re-assert it so it sticks.
                selectMethods.set(ids.map((id) => `node_${id}`));
            }),
            moveToSubgraph: make((ids) => extractToSubgraph(ids, false)),
            copyToSubgraph: make((ids) => extractToSubgraph(ids, true)),
            collapseSelected: make((ids) =>
                setMany(
                    ids.map((id) => `node_accordion[${graphId}][${id}]`),
                    true,
                ),
            ),
            expandSelected: make((ids) =>
                setMany(
                    ids.map((id) => `node_accordion[${graphId}][${id}]`),
                    undefined,
                ),
            ),
        };
    }, [close, cloneManyNodes, removeManyNodes, makeSubgraphFromSelection, copySelection, cutSelection, selectionRef, selectMethods, subgraphEditor, setMany, graphId]);
};

// The per-node menu. Author its options freely here -- order and formatting are entirely local to this component.
export const NodeContextMenu = ({ controls, onClone, onDelete }: { controls: ContextControls; onClone: () => void; onDelete: () => void }) => {
    const sel = useSelectionActions(controls.close);
    const hasSelectable = useHasSelectableSelection();
    const hasSelection = useHasSelection();
    const cloneAndClose = () => {
        onClone();
        controls.close();
    };
    const deleteAndClose = () => {
        onDelete();
        controls.close();
    };

    return (
        <ContextPopup controls={controls}>
            <Titlebar data-flavour={"accent"}>This Node</Titlebar>
            <Row>
                <ActionButton.Option onClick={cloneAndClose} tooltip={"Clone"}>
                    <Icon shape={ICONS.Clone} />
                </ActionButton.Option>
                <ActionButton.Option flavour={"danger"} onClick={deleteAndClose} tooltip={"Delete"}>
                    <Icon shape={ICONS.Trash} />
                </ActionButton.Option>
            </Row>
            <Titlebar data-flavour={"accent"}>Selected Nodes</Titlebar>
            <Row>
                <ActionButton.Option disabled={!hasSelection} onClick={sel.collapseSelected} tooltip={"Collapse"}>
                    <Icon shape={ICONS.Collapse} />
                </ActionButton.Option>
                <ActionButton.Option disabled={!hasSelection} onClick={sel.expandSelected} tooltip={"Expand"}>
                    <Icon shape={ICONS.Expand} />
                </ActionButton.Option>
                <ActionButton.Option disabled={!hasSelectable} onClick={sel.cloneSelected} tooltip={"Clone"}>
                    <Icon shape={ICONS.Clone} />
                </ActionButton.Option>
                <ActionButton.Option disabled={!hasSelectable} onClick={sel.cut} tooltip={"Cut"}>
                    <Icon shape={ICONS.Cut} />
                </ActionButton.Option>
                <ActionButton.Option disabled={!hasSelectable} onClick={sel.copy} tooltip={"Copy"}>
                    <Icon shape={ICONS.Copy} />
                </ActionButton.Option>
                <ActionButton.Option disabled={!hasSelectable} flavour={"danger"} onClick={sel.deleteSelected} tooltip={"Delete"}>
                    <Icon shape={ICONS.Trash} />
                </ActionButton.Option>
            </Row>
            <ActionButton.Option disabled={!hasSelectable} onClick={sel.moveToSubgraph}>
                Move to New Custom Node
            </ActionButton.Option>
            <ActionButton.Option disabled={!hasSelectable} onClick={sel.copyToSubgraph}>
                Clone to New Custom Node
            </ActionButton.Option>
        </ContextPopup>
    );
};

// The pane (empty-space) menu. Always shown; options disable when not applicable. Author freely here.
export const PaneContextMenu = ({ controls, hasClipboard, onPaste }: { controls: ContextControls; hasClipboard: boolean; onPaste: () => void }) => {
    const sel = useSelectionActions(controls.close);
    const hasSelectable = useHasSelectableSelection();
    const hasSelection = useHasSelection();

    return (
        <ContextPopup controls={controls}>
            <Row>
                <ActionButton.Option disabled={!hasClipboard} onClick={onPaste} tooltip={"Paste"}>
                    <Icon shape={ICONS.Paste} />
                </ActionButton.Option>
            </Row>
            <Titlebar data-flavour={"accent"}>Selected Nodes</Titlebar>
            <Row>
                <ActionButton.Option disabled={!hasSelection} onClick={sel.collapseSelected} tooltip={"Collapse"}>
                    <Icon shape={ICONS.Collapse} />
                </ActionButton.Option>
                <ActionButton.Option disabled={!hasSelection} onClick={sel.expandSelected} tooltip={"Expand"}>
                    <Icon shape={ICONS.Expand} />
                </ActionButton.Option>
                <ActionButton.Option disabled={!hasSelectable} onClick={sel.cloneSelected} tooltip={"Clone"}>
                    <Icon shape={ICONS.Clone} />
                </ActionButton.Option>
                <ActionButton.Option disabled={!hasSelectable} onClick={sel.cut} tooltip={"Cut"}>
                    <Icon shape={ICONS.Cut} />
                </ActionButton.Option>
                <ActionButton.Option disabled={!hasSelectable} onClick={sel.copy} tooltip={"Copy"}>
                    <Icon shape={ICONS.Copy} />
                </ActionButton.Option>
                <ActionButton.Option disabled={!hasSelectable} flavour={"danger"} onClick={sel.deleteSelected} tooltip={"Delete"}>
                    <Icon shape={ICONS.Trash} />
                </ActionButton.Option>
            </Row>
            <ActionButton.Option disabled={!hasSelectable} onClick={sel.moveToSubgraph}>
                Move to new Custom Node
            </ActionButton.Option>
            <ActionButton.Option disabled={!hasSelectable} onClick={sel.copyToSubgraph}>
                Clone to new Custom Node
            </ActionButton.Option>
        </ContextPopup>
    );
};

// The Container node's menu -- flavour swatches plus Delete. Same shape as the menus above.
export const ContainerContextMenu = ({
    controls,
    onSetFlavour,
    onDelete,
    onClone,
}: {
    controls: ContextControls;
    onSetFlavour: (flavour: ContainerFlavour) => void;
    onDelete: () => void;
    onClone: () => void;
}) => {
    const setFlavourAndClose = (flavour: ContainerFlavour) => {
        onSetFlavour(flavour);
        controls.close();
    };

    const sel = useSelectionActions(controls.close);
    const hasSelectable = useHasSelectableSelection();
    const hasSelection = useHasSelection();
    const cloneAndClose = () => {
        onClone();
        controls.close();
    };
    const deleteAndClose = () => {
        onDelete();
        controls.close();
    };

    return (
        <ContextPopup controls={controls}>
            <Titlebar data-flavour={"accent"}>This Node</Titlebar>
            <Row>
                {(Object.entries(FLAVOUR_LABELS) as [ContainerFlavour, string][]).map(([key, name]) => (
                    <ActionButton.Option key={key} flavour={key === "base" ? undefined : key} onClick={() => setFlavourAndClose(key)} tooltip={name}>
                        <Icon shape={ICONS.Circle} />
                    </ActionButton.Option>
                ))}
            </Row>
            <hr />
            <Row>
                <ActionButton.Option onClick={cloneAndClose} tooltip={"Clone"}>
                    <Icon shape={ICONS.Clone} />
                </ActionButton.Option>
                <ActionButton.Option flavour={"danger"} onClick={deleteAndClose} tooltip={"Delete"}>
                    <Icon shape={ICONS.Trash} />
                </ActionButton.Option>
            </Row>
            <Titlebar data-flavour={"accent"}>Selected Nodes</Titlebar>
            <Row>
                <ActionButton.Option disabled={!hasSelection} onClick={sel.collapseSelected} tooltip={"Collapse"}>
                    <Icon shape={ICONS.Collapse} />
                </ActionButton.Option>
                <ActionButton.Option disabled={!hasSelection} onClick={sel.expandSelected} tooltip={"Expand"}>
                    <Icon shape={ICONS.Expand} />
                </ActionButton.Option>
                <ActionButton.Option disabled={!hasSelectable} onClick={sel.cloneSelected} tooltip={"Clone"}>
                    <Icon shape={ICONS.Clone} />
                </ActionButton.Option>
                <ActionButton.Option disabled={!hasSelectable} onClick={sel.cut} tooltip={"Cut"}>
                    <Icon shape={ICONS.Cut} />
                </ActionButton.Option>
                <ActionButton.Option disabled={!hasSelectable} onClick={sel.copy} tooltip={"Copy"}>
                    <Icon shape={ICONS.Copy} />
                </ActionButton.Option>
                <ActionButton.Option disabled={!hasSelectable} flavour={"danger"} onClick={sel.deleteSelected} tooltip={"Delete"}>
                    <Icon shape={ICONS.Trash} />
                </ActionButton.Option>
            </Row>
            <ActionButton.Option disabled={!hasSelectable} onClick={sel.moveToSubgraph}>
                Move to New Custom Node
            </ActionButton.Option>
            <ActionButton.Option disabled={!hasSelectable} onClick={sel.copyToSubgraph}>
                Clone to New Custom Node
            </ActionButton.Option>
        </ContextPopup>
    );
};

// The per-node menu. Author its options freely here -- order and formatting are entirely local to this component.
export const ResultNodeContextMenu = ({ controls }: { controls: ContextControls }) => {
    const sel = useSelectionActions(controls.close);
    const hasSelectable = useHasSelectableSelection();
    const hasSelection = useHasSelection();

    return (
        <ContextPopup controls={controls}>
            <Titlebar data-flavour={"accent"}>Selected Nodes</Titlebar>
            <Row>
                <ActionButton.Option disabled={!hasSelection} onClick={sel.collapseSelected} tooltip={"Collapse"}>
                    <Icon shape={ICONS.Collapse} />
                </ActionButton.Option>
                <ActionButton.Option disabled={!hasSelection} onClick={sel.expandSelected} tooltip={"Expand"}>
                    <Icon shape={ICONS.Expand} />
                </ActionButton.Option>
                <ActionButton.Option disabled={!hasSelectable} onClick={sel.cloneSelected} tooltip={"Clone"}>
                    <Icon shape={ICONS.Clone} />
                </ActionButton.Option>
                <ActionButton.Option disabled={!hasSelectable} onClick={sel.cut} tooltip={"Cut"}>
                    <Icon shape={ICONS.Cut} />
                </ActionButton.Option>
                <ActionButton.Option disabled={!hasSelectable} onClick={sel.copy} tooltip={"Copy"}>
                    <Icon shape={ICONS.Copy} />
                </ActionButton.Option>
                <ActionButton.Option disabled={!hasSelectable} flavour={"danger"} onClick={sel.deleteSelected} tooltip={"Delete"}>
                    <Icon shape={ICONS.Trash} />
                </ActionButton.Option>
            </Row>
            <ActionButton.Option disabled={!hasSelectable} onClick={sel.moveToSubgraph}>
                Move to New Custom Node
            </ActionButton.Option>
            <ActionButton.Option disabled={!hasSelectable} onClick={sel.copyToSubgraph}>
                Clone to New Custom Node
            </ActionButton.Option>
        </ContextPopup>
    );
};

const Titlebar = styled.div`
    background: var(--flavour);
    font-variant: small-caps;
    color: white;
    font-size: 11pt;
    padding-inline: 1em;
`;

const Row = styled.div`
    display: grid;
    grid-auto-column: 1fr;
    grid-auto-flow: column;
    padding-block: 0.25em;
    & > button {
        text-align: center;
    }
`;
