import { createContext, CSSProperties, DragEvent, Fragment, ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { Modal } from "../components/popups/Modal";
import { GraphView } from "./primary";
import { NodeDrawer } from "./nodedrawer";
import { GraphIdContext } from "../state/graphId";
import { Project } from "../state/project";
import { TextInput } from "../components/inputs/TextInput";
import { Dropdown } from "../components/inputs/Dropdown";
import { Flavour, FLAVOUR_LABELS } from "../components/types";
import { NodeTypes } from "../definitions/nodeTypes";
import { useDragPane } from "../components/wrappers/DragPane";
import { ResizeHandle } from "../components/containers/ResizeHandle";
import { parseInterface, interfaceMemberLabel, InterfaceMember, InterfaceAccordion } from "../state/project/types";
import { Session } from "../state/session";
import { Icon, ICONS } from "../components/Icon";
import { ActionButton } from "../components/buttons/ActionButton";
import { nanoid } from "nanoid";
import { downloadBlob } from "../util/fileIO";

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
            <Modal controls={modalControls} onClose={handleClose} onCancel={handleClose} size={"90vw 90vh"} force>
                {editingGraphId && <SubgraphEditorInner graphId={editingGraphId} />}
            </Modal>
        </SubgraphEditorContext>
    );
};

/** Categories a custom node may be filed under (the hidden Result bucket is excluded). */
const ASSIGNABLE_CATEGORIES: NodeTypes.Category[] = ["Custom", "Shapes", "Values", "Modifiers", "Logic", "Collection Ops", "Meta", "Math", "Inputs", "Outputs"];

const SubgraphEditorInner = ({ graphId }: { graphId: string }) => {
    const subgraphMethods = Project.useSubgraphMethods();
    const [, modalControls] = Modal.useInternal();
    const paneControls = useDragPane();

    const [isDrawerOpen, setIsDrawerOpen] = useState(true);

    const meta = Project.useMeta();
    const metaEntry = meta[graphId];
    const name = metaEntry?.name ?? "";
    const category = metaEntry?.category ?? "Custom";
    const flavour = metaEntry?.flavour ?? NodeTypes.DEFAULT_CUSTOM_FLAVOUR;

    const handleRename = useCallback(
        (newName: string) => {
            subgraphMethods.rename(graphId, newName);
        },
        [subgraphMethods, graphId],
    );

    const handleSetCategory = useCallback(
        (c: string) => {
            subgraphMethods.setMeta(graphId, { category: c as NodeTypes.Category });
        },
        [subgraphMethods, graphId],
    );

    const handleSetFlavour = useCallback(
        (f: string) => {
            subgraphMethods.setMeta(graphId, { flavour: f as Flavour });
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
            <Modal.Title
                flavour={"base"}
                options={
                    <ActionButton.Lite onClick={handleClose} flavour={"danger"}>
                        <Icon shape={ICONS.Close} />
                    </ActionButton.Lite>
                }
            >
                Editing Subgraph
            </Modal.Title>
            <EditorLayout ref={layoutRef} style={style} data-state={isDrawerOpen ? "drawer-open" : undefined}>
                <div data-area={"toolbar"}>
                    <Toolbar graphId={graphId} />
                </div>
                <div data-area={"graphview"}>
                    <GraphView graphId={graphId} paneControls={paneControls} />
                </div>
                <div data-area={"interfacelist"}>
                    <TextInput value={name} onCommit={handleRename} placeholder="Subgraph name" />
                    <MetaRow>
                        <label>
                            <span>Category</span>
                            <Dropdown value={category} onValue={handleSetCategory}>
                                {ASSIGNABLE_CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </Dropdown>
                        </label>
                        <label>
                            <span>Colour</span>
                            <Dropdown value={flavour} onValue={handleSetFlavour}>
                                {(Object.entries(FLAVOUR_LABELS) as [Flavour, string][]).map(([key, label]) => (
                                    <option key={key} value={key}>
                                        {label}
                                    </option>
                                ))}
                            </Dropdown>
                        </label>
                    </MetaRow>
                    <InterfaceMemberList graphId={graphId} />
                </div>
                <div data-area={"rowResize"}>
                    <ResizeHandle
                        value={rowRatio}
                        containerRef={layoutRef}
                        onValue={handleRowDrag}
                        onCommit={setRowRatio}
                        orientation={"vertical"}
                        defaultValue={0.7}
                        min={0.1}
                        max={0.9}
                        mode={"single"}
                    />
                </div>
                <div data-area={"drawer"}>
                    <NodeDrawer graphId={graphId} paneControls={paneControls} isOpen={isDrawerOpen} onOpenToggle={setIsDrawerOpen} />
                </div>
            </EditorLayout>
        </GraphIdContext>
    );
};

const Toolbar = ({ graphId }: { graphId: string }) => {
    const [marqueeMode, setMarqueeMode] = Session.useMarqueeMode();
    const io = Project.useProjectIO();
    const meta = Project.useMeta();

    const handleSave = useCallback(() => {
        const data = io.saveSubgraph(graphId);
        const json = JSON.stringify(data);
        const name = meta[graphId]?.name || "custom-node";
        downloadBlob(new Blob([json], { type: "application/json" }), `${name}.json`);
    }, [io, graphId, meta]);

    return (
        <ToolbarWrapper>
            <ActionButton onClick={handleSave}>Export Custom Node</ActionButton>
            <Sep />
            <ActionButton onClick={() => setMarqueeMode((p) => (p === "contain" ? "intersect" : "contain"))} tooltip={`Selection Mode: ${marqueeMode === "contain" ? "Contain" : "Intersect"}`}>
                <Icon shape={marqueeMode === "contain" ? ICONS.SelectBounds.Contain : ICONS.SelectBounds.Intersect} />
            </ActionButton>
        </ToolbarWrapper>
    );
};

const MetaRow = styled.div`
    display: flex;
    gap: 6px;
    & > label {
        flex: 1 1 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-variant: small-caps;
        font-size: 0.85em;
        min-width: 0;
    }
    & select {
        width: 100%;
    }
`;

const Sep = styled.div`
    align-self: stretch;
    width: 1px;
    border-left: 1px solid #666;
    margin-inline: 6px;
`;

/* ==================== Unified Interface List ==================== */

const INTERFACE_MIME = "application/x-interface-member";
const ACCORDION_MIME = "application/x-interface-accordion";

/** Path into the InterfaceMember[] tree: top-level index, or "accordionIndex:itemIndex" */
type MemberPath = number | `${number}:${number}`;

const encodePath = (path: MemberPath): string => String(path);
const parsePath = (data: string): MemberPath | null => {
    if (data.includes(":")) {
        const [a, b] = data.split(":");
        const ai = parseInt(a, 10);
        const bi = parseInt(b, 10);
        return isNaN(ai) || isNaN(bi) ? null : `${ai}:${bi}`;
    }
    const n = parseInt(data, 10);
    return isNaN(n) ? null : n;
};

/** Extract an item from the tree at the given path, returning [item, newTree] */
const extractAt = (members: InterfaceMember[], path: MemberPath): [InterfaceMember | null, InterfaceMember[]] => {
    const next = [...members];
    if (typeof path === "number") {
        if (path < 0 || path >= next.length) return [null, members];
        const [item] = next.splice(path, 1);
        return [item, next];
    }
    const [ai, bi] = path.split(":").map(Number) as [number, number];
    const acc = next[ai];
    if (typeof acc === "string" || acc.type !== "accordion") return [null, members];
    const items = [...acc.items];
    if (bi < 0 || bi >= items.length) return [null, members];
    const [item] = items.splice(bi, 1);
    next[ai] = { ...acc, items };
    return [item, next];
};

/** Insert an item into the tree at the given path */
const insertAt = (members: InterfaceMember[], path: MemberPath, item: InterfaceMember): InterfaceMember[] => {
    const next = [...members];
    if (typeof path === "number") {
        next.splice(path, 0, item);
        return next;
    }
    const [ai, bi] = path.split(":").map(Number) as [number, number];
    const acc = next[ai];
    if (typeof acc === "string" || acc.type !== "accordion") return members;
    const items = [...acc.items];
    items.splice(bi, 0, item as Exclude<InterfaceMember, InterfaceAccordion>);
    next[ai] = { ...acc, items };
    return next;
};

/** Move an item from one path to another, handling index adjustments */
const moveItem = (members: InterfaceMember[], from: MemberPath, to: MemberPath): InterfaceMember[] => {
    const [item, afterExtract] = extractAt(members, from);
    if (!item) return members;

    // Adjust the target index to account for the extraction
    let adjTo = to;
    if (typeof from === "number" && typeof to === "number") {
        // Both top-level: standard splice adjustment
        if (from < to) adjTo = to - 1;
    } else if (typeof from === "number" && typeof to === "string") {
        // Top-level -> accordion: if extracted before the accordion, accordion index shifted -1
        const [ai, bi] = to.split(":").map(Number) as [number, number];
        adjTo = from < ai ? `${ai - 1}:${bi}` : to;
    } else if (typeof from === "string" && typeof to === "number") {
        // Accordion -> top-level: extraction doesn't change top-level indices (item was inside accordion)
        // No adjustment needed
    } else if (typeof from === "string" && typeof to === "string") {
        // Both inside accordions
        const [fromAi, fromBi] = from.split(":").map(Number) as [number, number];
        const [toAi, toBi] = to.split(":").map(Number) as [number, number];
        if (fromAi === toAi) {
            // Same accordion: standard splice adjustment
            adjTo = fromBi < toBi ? `${toAi}:${toBi - 1}` : to;
        }
        // Different accordions: no adjustment (extraction from one accordion doesn't affect indices in another)
    }

    return insertAt(afterExtract, adjTo, item);
};

const useDragSource = (encoded: string, isAccordion?: boolean) => {
    const ref = useRef<HTMLDivElement>(null);
    const handleDragStart = useCallback(
        (e: DragEvent) => {
            e.dataTransfer.setDragImage(ref.current as Element, 0, 0);
            e.dataTransfer.setData(INTERFACE_MIME, encoded);
            if (isAccordion) e.dataTransfer.setData(ACCORDION_MIME, "");
            e.dataTransfer.effectAllowed = "move";
        },
        [encoded, isAccordion],
    );
    return { ref, handleDragStart };
};

const memberKey = (entry: InterfaceMember, index: number): string => {
    if (typeof entry === "string") return entry;
    if (entry.type === "separator") return `sep-${index}`;
    return `acc-${entry.label}-${index}`;
};

/* ---- Main List ---- */

type DropHandler = (source: MemberPath, target: MemberPath) => void;

const InterfaceMemberList = ({ graphId }: { graphId: string }) => {
    const members = Project.useGraphInterfaces(graphId) ?? [];
    const methods = Project.useSubgraphMethods();
    const [dragging, setDragging] = useState(false);

    const handleAddSeparator = useCallback(() => methods.alterInterface(graphId, (m) => [...m, { type: "separator" } as const]), [methods, graphId]);
    const handleAddAccordion = useCallback(() => methods.alterInterface(graphId, (m) => [...m, { type: "accordion" as const, id: nanoid(), label: "Group", items: [] }]), [methods, graphId]);

    const handleDrop: DropHandler = useCallback(
        (source, target) => {
            methods.alterInterface(graphId, (m) => moveItem(m, source, target));
        },
        [methods, graphId],
    );

    const handleRemove = useCallback(
        (index: number) => {
            methods.alterInterface(graphId, (m) => {
                const entry = m[index];
                const next = [...m];
                next.splice(index, 1);
                if (typeof entry !== "string" && entry.type === "accordion") {
                    next.splice(index, 0, ...entry.items);
                }
                return next;
            });
        },
        [methods, graphId],
    );

    const handleRemoveInner = useCallback(
        (accordionIndex: number, itemIndex: number) => {
            methods.alterInterface(graphId, (m) => {
                const acc = m[accordionIndex];
                if (typeof acc === "string" || acc.type !== "accordion") return m;
                const items = [...acc.items];
                items.splice(itemIndex, 1);
                const next = [...m];
                next[accordionIndex] = { ...acc, items };
                return next;
            });
        },
        [methods, graphId],
    );

    const handleRename = useCallback(
        (index: number, label: string) => {
            methods.alterInterface(graphId, (m) => {
                const entry = m[index];
                if (typeof entry === "string" || entry.type !== "accordion") return m;
                const next = [...m];
                next[index] = { ...entry, label };
                return next;
            });
        },
        [methods, graphId],
    );

    return (
        <>
            <ListWrapper data-state={dragging ? "dragging" : undefined} onDragStart={() => setDragging(true)} onDragEnd={() => setDragging(false)}>
                <ListHeader>Interfaces</ListHeader>
                <DropZone targetPath={0} onDrop={handleDrop} />
                {members.map((entry, i) => (
                    <Fragment key={memberKey(entry, i)}>
                        <TopLevelItem
                            entry={entry}
                            index={i}
                            graphId={graphId}
                            onDrop={handleDrop}
                            onRemove={() => handleRemove(i)}
                            onRemoveInner={handleRemoveInner}
                            onRename={(label) => handleRename(i, label)}
                        />
                        <DropZone targetPath={i + 1} onDrop={handleDrop} />
                    </Fragment>
                ))}
                {members.length === 0 && <EmptyLabel>No interface members</EmptyLabel>}
            </ListWrapper>
            <ActionButton onClick={handleAddSeparator} flavour={"accent"} tooltip="Add separator">
                <Icon shape={ICONS.Plus} /> Separator
            </ActionButton>
            <ActionButton onClick={handleAddAccordion} flavour={"accent"} tooltip="Add accordion group">
                <Icon shape={ICONS.Plus} /> Group
            </ActionButton>
        </>
    );
};

/* ---- Drop Zone ---- */

const DropZone = ({ targetPath, onDrop, rejectAccordion, children }: { targetPath: MemberPath; onDrop: DropHandler; rejectAccordion?: boolean; children?: ReactNode }) => {
    const [active, setActive] = useState(false);

    const handleDragOver = useCallback(
        (e: DragEvent) => {
            if (!e.dataTransfer.types.includes(INTERFACE_MIME)) return;
            if (rejectAccordion && e.dataTransfer.types.includes(ACCORDION_MIME)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setActive(true);
        },
        [rejectAccordion],
    );

    const handleDragLeave = useCallback(() => setActive(false), []);

    const handleDrop = useCallback(
        (e: DragEvent) => {
            const data = e.dataTransfer.getData(INTERFACE_MIME);
            const source = data ? parsePath(data) : null;
            if (source != null) {
                e.preventDefault();
                onDrop(source, targetPath);
            }
            setActive(false);
        },
        [onDrop, targetPath],
    );

    return (
        <DropZoneLine data-state={active ? "active" : undefined} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
            {children}
        </DropZoneLine>
    );
};

/* ---- Top-Level Item ---- */

const TopLevelItem = ({
    entry,
    index,
    graphId,
    onDrop,
    onRemove,
    onRemoveInner,
    onRename,
}: {
    entry: InterfaceMember;
    index: number;
    graphId: string;
    onDrop: DropHandler;
    onRemove: () => void;
    onRemoveInner: (accordionIndex: number, itemIndex: number) => void;
    onRename: (label: string) => void;
}) => {
    const isAccordion = typeof entry !== "string" && entry.type === "accordion";
    const { ref, handleDragStart } = useDragSource(encodePath(index), isAccordion);

    if (typeof entry === "string") {
        return <SocketEntry ref={ref} entry={entry} graphId={graphId} onDragStart={handleDragStart} />;
    }
    if (entry.type === "separator") {
        return <SeparatorEntry ref={ref} onRemove={onRemove} onDragStart={handleDragStart} />;
    }
    if (entry.type === "accordion") {
        return (
            <AccordionEntry
                ref={ref}
                entry={entry}
                index={index}
                graphId={graphId}
                onDrop={onDrop}
                onRemove={onRemove}
                onRemoveInner={onRemoveInner}
                onRename={onRename}
                onDragStart={handleDragStart}
            />
        );
    }
    return null;
};

/* ---- Item Views ---- */

const SocketEntry = ({ ref, entry, graphId, onDragStart }: { ref: React.Ref<HTMLDivElement>; entry: `in:${string}` | `out:${string}`; graphId: string; onDragStart: (e: DragEvent) => void }) => {
    const parsed = parseInterface(entry);
    const [node] = Project.useNode(graphId, parsed.nodeId);
    const label = interfaceMemberLabel(node);

    return (
        <ItemRow ref={ref}>
            <div data-part={"label"}>{label}</div>
            <div data-part={"badge"} data-direction={parsed.direction}>
                {parsed.direction === "in" ? "IN" : "OUT"}
            </div>
            <DragGrip draggable onDragStart={onDragStart}>
                <Icon shape={ICONS.Caret.Vertical} />
            </DragGrip>
        </ItemRow>
    );
};

const SeparatorEntry = ({ ref, onRemove, onDragStart }: { ref: React.Ref<HTMLDivElement>; onRemove: () => void; onDragStart: (e: DragEvent) => void }) => (
    <ItemRow ref={ref}>
        <hr />
        <ActionButton.Lite onClick={onRemove} tooltip="Remove separator">
            <Icon shape={ICONS.Close} />
        </ActionButton.Lite>
        <DragGrip draggable onDragStart={onDragStart}>
            <Icon shape={ICONS.Caret.Vertical} />
        </DragGrip>
    </ItemRow>
);

const AccordionEntry = ({
    ref,
    entry,
    index,
    graphId,
    onDrop,
    onRemove,
    onRemoveInner,
    onRename,
    onDragStart,
}: {
    ref: React.Ref<HTMLDivElement>;
    entry: InterfaceAccordion;
    index: number;
    graphId: string;
    onDrop: DropHandler;
    onRemove: () => void;
    onRemoveInner: (accordionIndex: number, itemIndex: number) => void;
    onRename: (label: string) => void;
    onDragStart: (e: DragEvent) => void;
}) => {
    return (
        <AccordionItem>
            <ItemRow ref={ref} data-kind="accordion">
                <AccordionLabelInput value={entry.label} onCommit={onRename} placeholder="Group name" />
                <ActionButton.Lite onClick={onRemove} tooltip="Remove group (items promoted)">
                    <Icon shape={ICONS.Close} />
                </ActionButton.Lite>
                <DragGrip draggable onDragStart={onDragStart}>
                    <Icon shape={ICONS.Caret.Vertical} />
                </DragGrip>
            </ItemRow>
            <AccordionBody>
                <DropZone targetPath={`${index}:0`} onDrop={onDrop} rejectAccordion>
                    {entry.items.length === 0 ? <EmptyLabel>Drag Items to Add</EmptyLabel> : null}
                </DropZone>
                {entry.items.map((item, j) => (
                    <Fragment key={memberKey(item as InterfaceMember, j)}>
                        <AccordionItemEntry item={item} accordionIndex={index} itemIndex={j} graphId={graphId} onRemove={() => onRemoveInner(index, j)} />
                        <DropZone targetPath={`${index}:${j + 1}`} onDrop={onDrop} rejectAccordion />
                    </Fragment>
                ))}
            </AccordionBody>
        </AccordionItem>
    );
};

const AccordionItemEntry = ({
    item,
    accordionIndex,
    itemIndex,
    graphId,
    onRemove,
}: {
    item: Exclude<InterfaceMember, InterfaceAccordion>;
    accordionIndex: number;
    itemIndex: number;
    graphId: string;
    onRemove: () => void;
}) => {
    const { ref, handleDragStart } = useDragSource(encodePath(`${accordionIndex}:${itemIndex}`));

    if (typeof item === "string") {
        return <SocketEntry ref={ref} entry={item} graphId={graphId} onDragStart={handleDragStart} />;
    }
    if (item.type === "separator") {
        return <SeparatorEntry ref={ref} onRemove={onRemove} onDragStart={handleDragStart} />;
    }
    return null;
};

/* ==================== Styled Components ==================== */

const ToolbarWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px;
    & > button {
        padding: 0.25em;
    }
`;

const EditorLayout = styled.div`
    flex: 1 1 auto;
    min-height: 0;
    display: grid;
    padding: 4px;
    gap: 2px;
    grid-template-columns: 300px 1fr;
    grid-template-rows: min-content 1fr 2px auto;
    grid-template-areas:
        "toolbar toolbar"
        "interfacelist graphview"
        "rowResize rowResize"
        "drawer drawer";
    &[data-state~="drawer-open"] {
        grid-template-rows: min-content 1fr 2px minmax(min-content, var(--ratio_B));
    }

    & > div[data-area="interfacelist"] {
        grid-area: interfacelist;
    }
    & > div[data-area="toolbar"] {
        grid-area: toolbar;
    }
    & > div[data-area="graphview"] {
        grid-area: graphview;
    }
    & > div[data-area="rowResize"] {
        grid-area: rowResize;
    }
    & > div[data-area="drawer"] {
        grid-area: drawer;
    }

    & > div[data-area="interfacelist"] {
        background: #222;
        border: 1px solid var(--flavour);
        display: grid;
        grid-template-rows: auto auto 1fr;
        grid-auto-rows: auto;
        gap: 4px;
        padding: 4px;
        min-height: 0;
    }

    & > div[data-area="graphview"] {
        position: relative;
        border: 1px solid var(--flavour);
        overflow: clip;
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

const ListWrapper = styled.div`
    display: flex;
    flex-direction: column;
    padding: 4px;
    overflow-y: auto;
`;

const ListHeader = styled.div`
    display: flex;
    align-items: center;
    padding: 2px 4px;
    border-bottom: 1px solid #333;
    margin-bottom: 2px;
    font-variant: small-caps;
`;

const AccordionItem = styled.div`
    display: flex;
    flex-direction: column;
    border: 1px solid #333;
`;

const ItemRow = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 4px;

    &[data-kind="accordion"] {
        background: #333;
        border-radius: 3px;
    }
    & > hr {
        border-top: 1px solid #555;
        flex: 1 1 auto;
    }
    & > div[data-part="badge"] {
        font-size: 0.7em;
        font-weight: bold;
        padding: 1px 4px;
        border-radius: 3px;
        flex: 0 0 auto;
        min-width: 28px;
        text-align: center;

        &[data-direction="in"] {
            background: #2a5a2a;
            color: #8f8;
        }
        &[data-direction="out"] {
            background: #5a2a2a;
            color: #f88;
        }
    }
    & > div[data-part="label"] {
        flex: 1 1 auto;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
`;

const DropZoneLine = styled.div`
    min-height: 2px;
    margin-block: 2px;
    border-radius: 1px;
    position: relative;
    transition: background 0.15s;

    &::after {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        top: -8px;
        bottom: -8px;
        pointer-events: none;
    }

    [data-state~="dragging"] > &::after,
    [data-state~="dragging"] &::after {
        pointer-events: auto;
    }

    &[data-state="active"] {
        background: var(--flavour);
    }
`;

const DragGrip = styled.div`
    cursor: grab;
    opacity: 0.4;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    &:active {
        cursor: grabbing;
    }
    &:hover {
        opacity: 0.8;
    }
`;

const AccordionLabelInput = styled(TextInput)`
    font-size: 0.9em;
    flex: 1 1 auto;
    min-width: 0;
`;

const AccordionBody = styled.div`
    padding-left: 6px;
    display: flex;
    flex-direction: column;
    padding-block: 2px;
`;

const EmptyLabel = styled.div`
    padding: 2px 4px;
    font-size: 0.85em;
    color: #999;
    font-style: italic;
`;
