import { createContext, CSSProperties, ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { Modal } from "../components/popups/Modal";
import { GraphView } from "./primary";
import { NodeDrawer } from "./nodedrawer";
import { GraphIdContext } from "../state/graphId";
import { Project } from "../state/project";
import { TextInput } from "../components/inputs/TextInput";
import { useDragPane } from "../components/wrappers/DragPane";
import { ResizeHandle } from "../components/containers/ResizeHandle";
import { flattenSockets } from "../state/project/types";
import { Session } from "../state/session";
import { CheckBox } from "../components/buttons/CheckBox";

type SubgraphEditorContextValue = {
    open: (graphId: string) => void;
};

const SubgraphEditorContext = createContext<SubgraphEditorContextValue>({ open: () => {} });

export const useSubgraphEditor = () => useContext(SubgraphEditorContext);

export const SubgraphEditorProvider = ({ children }: { children: ReactNode }) => {
    const [editingGraphId, setEditingGraphId] = useState<string | null>(null);
    const modalControls = Modal.useControls();

    const open = useCallback(
        (graphId: string) => {
            setEditingGraphId(graphId);
            modalControls.open();
        },
        [modalControls],
    );

    const handleClose = useCallback(() => {
        setEditingGraphId(null);
    }, []);

    const ctx = useMemo<SubgraphEditorContextValue>(() => ({ open }), [open]);

    return (
        <SubgraphEditorContext value={ctx}>
            {children}
            <Modal controls={modalControls} onClose={handleClose} onCancel={handleClose} size={"90vw 90vh"}>
                {editingGraphId && <SubgraphEditorInner graphId={editingGraphId} />}
            </Modal>
        </SubgraphEditorContext>
    );
};

const SubgraphEditorInner = ({ graphId }: { graphId: string }) => {
    const subgraphMethods = Project.useSubgraphMethods();
    const [, modalControls] = Modal.useInternal();
    const paneControls = useDragPane();

    const [isDrawerOpen, setIsDrawerOpen] = useState(true);

    const meta = Project.useMeta();
    const name = meta[graphId]?.name ?? "";

    const handleRename = useCallback(
        (newName: string) => {
            subgraphMethods.rename(graphId, newName);
        },
        [subgraphMethods, graphId],
    );

    const handleClose = useCallback(() => {
        modalControls.close();
    }, [modalControls]);

    const layoutRef = useRef<HTMLDivElement>(null);
    const [rowRatio, setRowRatio] = useState(0.7);

    const style = useMemo(
        () =>
            ({
                "--ratio_T": `${rowRatio}fr`,
                "--ratio_B": `${1 - rowRatio}fr`,
            }) as CSSProperties,
        [rowRatio],
    );

    const handleRowDrag = useCallback((r: number) => {
        const layout = layoutRef.current;
        if (layout) {
            layout.style.setProperty("--ratio_T", `${r}fr`);
            layout.style.setProperty("--ratio_B", `${1 - r}fr`);
        }
    }, []);

    return (
        <GraphIdContext value={graphId}>
            <Modal.Title options={<CloseButton onClick={handleClose}>&times;</CloseButton>}>
                <TitleInput value={name} onCommit={handleRename} placeholder="Subgraph name" />
            </Modal.Title>
            <EditorLayout ref={layoutRef} style={style} data-state={isDrawerOpen ? "drawer-open" : undefined}>
                <div data-area={"toolbar"}>
                    <Toolbar />
                </div>
                <div data-area={"inputlist"}>
                    <InterfaceList graphId={graphId} direction="in" />
                </div>
                <div data-area={"graphview"}>
                    <GraphView graphId={graphId} paneControls={paneControls} />
                </div>
                <div data-area={"outputlist"}>
                    <InterfaceList graphId={graphId} direction="out" />
                </div>
                <div data-area={"rowResize"}>
                    <ResizeHandle value={rowRatio} containerRef={layoutRef} onValue={handleRowDrag} onCommit={setRowRatio} orientation={"vertical"} defaultValue={0.7} min={0.1} max={0.9} />
                </div>
                <div data-area={"drawer"}>
                    <NodeDrawer graphId={graphId} paneControls={paneControls} isOpen={isDrawerOpen} onOpenToggle={setIsDrawerOpen} />
                </div>
            </EditorLayout>
        </GraphIdContext>
    );
};

const Toolbar = () => {
    const [marqueeMode, setMarqueeMode] = Session.useMarqueeMode();

    return (
        <ToolbarWrapper>
            <CheckBox checked={marqueeMode === "contain"} onToggle={() => setMarqueeMode(marqueeMode === "contain" ? "intersect" : "contain")}>
                {marqueeMode === "contain" ? "Contain" : "Intersect"}
            </CheckBox>
        </ToolbarWrapper>
    );
};

const InterfaceList = ({ graphId, direction }: { graphId: string; direction: "in" | "out" }) => {
    const interfaces = Project.useGraphInterfaces(graphId);
    const prefix = direction === "in" ? "in:" : "out:";
    const sockets = flattenSockets(interfaces ?? []).filter((e) => e.startsWith(prefix));

    return (
        <InterfaceListWrapper>
            <InterfaceListTitle>{direction === "in" ? "Inputs" : "Outputs"}</InterfaceListTitle>
            {sockets.map((entry) => {
                const nodeId = entry.slice(prefix.length);
                return <InterfaceEntry key={nodeId} graphId={graphId} nodeId={nodeId} />;
            })}
            {sockets.length === 0 && <EmptyLabel>None</EmptyLabel>}
        </InterfaceListWrapper>
    );
};

const InterfaceEntry = ({ graphId, nodeId }: { graphId: string; nodeId: string }) => {
    const [node] = Project.useNode(graphId, nodeId);
    const label = (node.payload as { label?: string }).label;
    return <InterfaceItem>{label || node.type}</InterfaceItem>;
};

const TitleInput = styled(TextInput)`
    background: transparent;
    border: none;
    color: inherit;
    font: inherit;
`;

const CloseButton = styled.button`
    background: none;
    border: none;
    color: inherit;
    font-size: 18px;
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;
    &:hover {
        color: #fff;
    }
`;

const ToolbarWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 8px;
    font-variant: small-caps;
`;

const EditorLayout = styled.div`
    flex: 1 1 auto;
    min-height: 0;
    display: grid;
    padding: 4px;
    gap: 2px;
    grid-template-columns: auto 1fr auto;
    grid-template-rows: min-content 1fr 2px auto;
    grid-template-areas:
        "toolbar toolbar toolbar"
        "inputlist graphview outputlist"
        "rowResize rowResize rowResize"
        "drawer drawer drawer";
    &[data-state~="drawer-open"] {
        grid-template-rows: min-content auto 2px minmax(min-content, var(--ratio_B));
    }

    & > div {
        grid-area: attr(data-area type(<custom-ident>));
    }

    & > div[data-area="inputlist"],
    & > div[data-area="outputlist"] {
        background: #222;
        border: 1px solid var(--flavour);
    }

    & > div[data-area="graphview"] {
        contain: paint;
        border: 1px solid var(--flavour);
    }

    & > div[data-area="drawer"] {
        display: grid;
        grid-template-rows: auto;
        grid-auto-rows: 1fr;
        gap: 2px;
    }

    & > div[data-area="rowResize"] {
        display: flex;
        overflow: visible;
        z-index: 1;
        position: relative;
    }
`;

const InterfaceListWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 4px;
    min-width: 120px;

    &:last-of-type {
        border-right: none;
        border-left: 1px solid #333;
    }
`;

const InterfaceListTitle = styled.div`
    font-variant: small-caps;
    color: #888;
    padding: 2px 4px;
    border-bottom: 1px solid #333;
    margin-bottom: 2px;
`;

const InterfaceItem = styled.div`
    padding: 2px 4px;
    font-size: 0.9em;
    color: #ccc;
`;

const EmptyLabel = styled.div`
    padding: 2px 4px;
    font-size: 0.85em;
    color: #555;
    font-style: italic;
`;
