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

type ContextControls = ReturnType<typeof ContextPopup.useControls>;
type ContainerFlavour = Exclude<Flavour, "accent" | "inherit">;

// Shared LOGIC only (not layout) for the selection-wide context-menu actions. Each returned handler is a ready
// onClick that: snapshots the selection, closes the popup, then runs -- capturing BEFORE close matters because
// closing restores focus to whatever was focused when the menu opened, which can self-select a node and shrink
// the selection out from under the action. The action's own final selection change then wins that race.
export const useSelectionActions = (close: () => void) => {
    const { cloneManyNodes, removeManyNodes, makeSubgraphFromSelection, copySelection, cutSelection } = Project.useMethods();
    const selectionRef = Session.useSelectionRef();
    const selectMethods = Session.useSelectionMethods();
    const subgraphEditor = useSubgraphEditor();

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
        };
    }, [close, cloneManyNodes, removeManyNodes, makeSubgraphFromSelection, copySelection, cutSelection, selectionRef, selectMethods, subgraphEditor]);
};

// The per-node menu. Author its options freely here -- order and formatting are entirely local to this component.
export const NodeContextMenu = ({ controls, onClone, onDelete }: { controls: ContextControls; onClone: () => void; onDelete: () => void }) => {
    const sel = useSelectionActions(controls.close);
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
                <ActionButton.Option onClick={sel.cloneSelected} tooltip={"Clone"}>
                    <Icon shape={ICONS.Clone} />
                </ActionButton.Option>
                <ActionButton.Option onClick={sel.cut} tooltip={"Cut"}>
                    <Icon shape={ICONS.Cut} />
                </ActionButton.Option>
                <ActionButton.Option onClick={sel.copy} tooltip={"Copy"}>
                    <Icon shape={ICONS.Copy} />
                </ActionButton.Option>
                <ActionButton.Option flavour={"danger"} onClick={sel.deleteSelected} tooltip={"Delete"}>
                    <Icon shape={ICONS.Trash} />
                </ActionButton.Option>
            </Row>
            <ActionButton.Option onClick={sel.moveToSubgraph}>Move to New Custom Node</ActionButton.Option>
            <ActionButton.Option onClick={sel.copyToSubgraph}>Clone to New Custom Node</ActionButton.Option>
        </ContextPopup>
    );
};

// The pane (empty-space) menu. Always shown; options disable when not applicable. Author freely here.
export const PaneContextMenu = ({ controls, hasSelection, hasClipboard, onPaste }: { controls: ContextControls; hasSelection: boolean; hasClipboard: boolean; onPaste: () => void }) => {
    const sel = useSelectionActions(controls.close);

    return (
        <ContextPopup controls={controls}>
            <Row>
                <ActionButton.Option disabled={!hasClipboard} onClick={onPaste} tooltip={"Paste"}>
                    <Icon shape={ICONS.Paste} />
                </ActionButton.Option>
            </Row>
            <Titlebar data-flavour={"accent"}>Selected Nodes</Titlebar>
            <Row>
                <ActionButton.Option disabled={!hasSelection} onClick={sel.cloneSelected} tooltip={"Clone"}>
                    <Icon shape={ICONS.Clone} />
                </ActionButton.Option>
                <ActionButton.Option disabled={!hasSelection} onClick={sel.cut} tooltip={"Cut"}>
                    <Icon shape={ICONS.Cut} />
                </ActionButton.Option>
                <ActionButton.Option disabled={!hasSelection} onClick={sel.copy} tooltip={"Copy"}>
                    <Icon shape={ICONS.Copy} />
                </ActionButton.Option>
                <ActionButton.Option disabled={!hasSelection} flavour={"danger"} onClick={sel.deleteSelected} tooltip={"Delete"}>
                    <Icon shape={ICONS.Trash} />
                </ActionButton.Option>
            </Row>
            <ActionButton.Option disabled={!hasSelection} onClick={sel.moveToSubgraph}>
                Move to new Custom Node
            </ActionButton.Option>
            <ActionButton.Option disabled={!hasSelection} onClick={sel.copyToSubgraph}>
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
                <ActionButton.Option onClick={sel.cloneSelected} tooltip={"Clone"}>
                    <Icon shape={ICONS.Clone} />
                </ActionButton.Option>
                <ActionButton.Option onClick={sel.cut} tooltip={"Cut"}>
                    <Icon shape={ICONS.Cut} />
                </ActionButton.Option>
                <ActionButton.Option onClick={sel.copy} tooltip={"Copy"}>
                    <Icon shape={ICONS.Copy} />
                </ActionButton.Option>
                <ActionButton.Option flavour={"danger"} onClick={sel.deleteSelected} tooltip={"Delete"}>
                    <Icon shape={ICONS.Trash} />
                </ActionButton.Option>
            </Row>
            <ActionButton.Option onClick={sel.moveToSubgraph}>Move to New Custom Node</ActionButton.Option>
            <ActionButton.Option onClick={sel.copyToSubgraph}>Clone to New Custom Node</ActionButton.Option>
        </ContextPopup>
    );
};

// The per-node menu. Author its options freely here -- order and formatting are entirely local to this component.
export const ResultNodeContextMenu = ({ controls }: { controls: ContextControls }) => {
    const sel = useSelectionActions(controls.close);

    return (
        <ContextPopup controls={controls}>
            <Titlebar data-flavour={"accent"}>Selected Nodes</Titlebar>
            <Row>
                <ActionButton.Option onClick={sel.cloneSelected} tooltip={"Clone"}>
                    <Icon shape={ICONS.Clone} />
                </ActionButton.Option>
                <ActionButton.Option onClick={sel.cut} tooltip={"Cut"}>
                    <Icon shape={ICONS.Cut} />
                </ActionButton.Option>
                <ActionButton.Option onClick={sel.copy} tooltip={"Copy"}>
                    <Icon shape={ICONS.Copy} />
                </ActionButton.Option>
                <ActionButton.Option flavour={"danger"} onClick={sel.deleteSelected} tooltip={"Delete"}>
                    <Icon shape={ICONS.Trash} />
                </ActionButton.Option>
            </Row>
            <ActionButton.Option onClick={sel.moveToSubgraph}>Move to New Custom Node</ActionButton.Option>
            <ActionButton.Option onClick={sel.copyToSubgraph}>Clone to New Custom Node</ActionButton.Option>
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
