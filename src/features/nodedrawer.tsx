import styled from "styled-components";
import { Accordion } from "../components/containers/Accordion";
import { GraphIdContext } from "../state/graphId";
import { Icon, ICONS, NodeIcon, CUSTOM_ICONS, CustomIconKey } from "../components/Icon";
import { Flavour } from "../components/types";
import { Dispatch, DragEvent, MouseEvent, SetStateAction, useCallback, useMemo, useState } from "react";
import { Project } from "../state/project";
import { DragPaneControls } from "../components/wrappers/DragPane";
import { NodeDefinitions, NodeTypes } from "../definitions/nodeTypes";
import { TextInput } from "../components/inputs/TextInput";
import { CheckBox } from "../components/buttons/CheckBox";
import { UsersType } from "../state/project/types";
import { nanoid } from "nanoid";
import { useSubgraphEditor } from "./subgraph";
import { ContextPopup } from "../components/popups/ContextPopup";
import { ActionButton } from "../components/buttons/ActionButton";
import { RadioButton } from "../components/buttons/RadioButton";
import { downloadBlob } from "../util/fileIO";

export const NODE_DRAG_MIME = "application/x-nodegraph-drawer-item";
export const NODE_TYPE_MIME_PREFIX = "application/x-nodegraph-type:";

const LocalAccordion = styled(Accordion)`
    padding: 0.25em;
    justify-content: center;
    font-variant: small-caps;
`;

type DrawerItem = { kind: "node"; nodeType: NodeTypes.Any } | { kind: "subgraph"; id: string; name: string; flavour: Flavour; category: NodeTypes.Category; icon: CustomIconKey };

const VISIBLE_CATEGORIES: NodeTypes.Category[] = ["Custom", "Shapes", "Values", "Modifiers", "Logic", "Collection Ops", "Meta", "Math", "Inputs", "Outputs"];

const getForbiddenSubgraphs = (currentGraphId: string, users: UsersType): Set<string> => {
    const forbidden = new Set([currentGraphId]);
    const queue = [currentGraphId];
    while (queue.length > 0) {
        const id = queue.pop()!;
        for (const entry of users[id] ?? []) {
            if (!forbidden.has(entry.scope)) {
                forbidden.add(entry.scope);
                queue.push(entry.scope);
            }
        }
    }
    return forbidden;
};

export const NodeDrawer = ({ graphId, paneControls, isOpen, onOpenToggle }: { graphId: string; paneControls: DragPaneControls; isOpen: boolean; onOpenToggle: Dispatch<SetStateAction<boolean>> }) => {
    const [searchFilter, setSearchFilter] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<Set<NodeTypes.Category>>(new Set());

    const meta = Project.useMeta();
    const users = Project.useUsers();
    const subgraphMethods = Project.useSubgraphMethods();
    const subgraphEditor = useSubgraphEditor();

    const isRoot = graphId === "root";

    const allNodeTypes = useMemo(() => {
        return NodeTypes.list().filter((each) => {
            if (each.type === "result" || (each.type as string) === "custom") {
                return false;
            }
            if (each.hidden) {
                return false;
            }
            return true;
        });
    }, []);

    const handleCreateCustom = useCallback(() => {
        const id = nanoid();
        subgraphMethods.create(id, "Untitled");
        subgraphEditor.open(id);
    }, [subgraphMethods, subgraphEditor]);

    const filteredNodeTypes = useMemo(() => {
        return allNodeTypes.filter((each) => {
            if (categoryFilter.size > 0 && !categoryFilter.has(each.category)) {
                return false;
            }
            if (searchFilter && !each.displayName.toLowerCase().includes(searchFilter.toLowerCase())) {
                return false;
            }
            return true;
        });
    }, [allNodeTypes, categoryFilter, searchFilter]);

    const forbidden = useMemo(() => getForbiddenSubgraphs(graphId, users), [graphId, users]);

    const subgraphs = useMemo(() => {
        return Object.entries(meta)
            .filter(([id]) => id !== "root")
            .map(([id, m]) => ({ id, name: m.name, flavour: m.flavour, category: m.category, icon: m.icon }))
            .filter((s) => categoryFilter.size === 0 || categoryFilter.has(s.category))
            .filter((s) => !searchFilter || s.name.toLowerCase().includes(searchFilter.toLowerCase()));
    }, [meta, searchFilter, categoryFilter]);

    const [sort, setSort] = useState<string>("groupAscending");

    const sortedItems = useMemo(() => {
        const items: DrawerItem[] = [];

        for (const nt of filteredNodeTypes) {
            items.push({ kind: "node", nodeType: nt });
        }
        for (const s of subgraphs) {
            items.push({ kind: "subgraph", ...s });
        }

        const getName = (item: DrawerItem): string => {
            if (item.kind === "node") return item.nodeType.displayName;
            return item.name;
        };

        const getCategoryIndex = (item: DrawerItem): number => {
            const cat = item.kind === "node" ? item.nodeType.category : item.category;
            const idx = VISIBLE_CATEGORIES.indexOf(cat);
            return idx === -1 ? VISIBLE_CATEGORIES.length : idx;
        };

        items.sort((a, b) => {
            switch (sort) {
                case "AtoZ":
                    return getName(a).localeCompare(getName(b));
                case "ZtoA":
                    return getName(b).localeCompare(getName(a));
                case "groupAscending": {
                    const catCmp = getCategoryIndex(a) - getCategoryIndex(b);
                    return catCmp !== 0 ? catCmp : getName(a).localeCompare(getName(b));
                }
                case "groupDescending": {
                    const catCmp = getCategoryIndex(b) - getCategoryIndex(a);
                    return catCmp !== 0 ? catCmp : getName(a).localeCompare(getName(b));
                }
                default:
                    return 0;
            }
        });

        return items;
    }, [filteredNodeTypes, subgraphs, sort]);

    const toggleCategory = useCallback((cat: NodeTypes.Category) => {
        setCategoryFilter((prev) => {
            const next = new Set(prev);
            if (next.has(cat)) {
                next.delete(cat);
            } else {
                next.add(cat);
            }
            return next;
        });
    }, []);

    const clearCategoryFilter = useCallback(() => {
        setCategoryFilter(new Set());
    }, []);

    // Category chips behave as radio on a plain click (select only this one) and as checkbox on
    // ctrl/cmd+click (additively toggle). We intercept CheckBox's onClick and mark the event handled so
    // its default toggle doesn't also run. ("All" keeps its plain onToggle -> always clears, ctrl or not.)
    const handleCategoryClick = useCallback(
        (cat: NodeTypes.Category, evt: MouseEvent<HTMLButtonElement>) => {
            evt.nativeEvent.handled = "active";
            if (evt.ctrlKey || evt.metaKey) {
                toggleCategory(cat);
            } else {
                setCategoryFilter(new Set([cat]));
            }
        },
        [toggleCategory],
    );

    return (
        <GraphIdContext value={graphId}>
            <LocalAccordion title={"Add Nodes"} isOpen={isOpen} onOpenChange={onOpenToggle} iconClosed={ICONS.Caret.Up}>
                <Pane>
                    <SearchBar>
                        <TextInput value={searchFilter} onValue={setSearchFilter} placeholder="Search..." />
                    </SearchBar>
                    <SortOptions>
                        <RadioButton target={"groupAscending"} value={sort} onValue={setSort} tooltip={"by Category (Ascending)"}>
                            <Icon shape={ICONS.Sort.GroupAscending} />
                        </RadioButton>
                        <RadioButton target={"groupDescending"} value={sort} onValue={setSort} tooltip={"By Category (Descending)"}>
                            <Icon shape={ICONS.Sort.GroupDescending} />
                        </RadioButton>
                        <RadioButton target={"AtoZ"} value={sort} onValue={setSort} tooltip={"by Name (A-Z)"}>
                            <Icon shape={ICONS.Sort.AtoZ} />
                        </RadioButton>
                        <RadioButton target={"ZtoA"} value={sort} onValue={setSort} tooltip={"by Name (Z-A)"}>
                            <Icon shape={ICONS.Sort.ZtoA} />
                        </RadioButton>
                    </SortOptions>
                    <CreateRow>
                        <ActionButton onClick={handleCreateCustom} flavour={"info"} tooltip={isRoot ? "Create a new custom node" : "Create a nested custom node"}>
                            <Icon shape={ICONS.Plus} /> Create Custom Node
                        </ActionButton>
                    </CreateRow>
                    <Sidebar>
                        <CheckBox checked={categoryFilter.size === 0} onToggle={clearCategoryFilter} iconChecked={ICONS.RadioBox.Checked} iconUnchecked={ICONS.RadioBox.Unchecked}>
                            All
                        </CheckBox>
                        {VISIBLE_CATEGORIES.map((cat) => (
                            <CheckBox
                                key={cat}
                                checked={categoryFilter.has(cat)}
                                onClick={(evt) => handleCategoryClick(cat, evt)}
                                iconChecked={ICONS.RadioBox.Checked}
                                iconUnchecked={ICONS.RadioBox.Unchecked}
                            >
                                {cat}
                            </CheckBox>
                        ))}
                    </Sidebar>
                    <ContentPane>
                        <CardGrid items={sortedItems} paneControls={paneControls} forbidden={forbidden} isRoot={isRoot} />
                    </ContentPane>
                </Pane>
            </LocalAccordion>
        </GraphIdContext>
    );
};

const Pane = styled.div`
    display: grid;
    grid-template-columns: auto 1fr auto;
    grid-template-rows: auto auto 1fr;
    gap: 6px;
    padding: 6px;
    grid-template-areas:
        "filter filter sort"
        "create create create"
        "sidebar contents contents";
    position: relative;
`;

const CreateRow = styled.div`
    grid-area: create;
    display: flex;
    justify-content: end;
`;

const SearchBar = styled.div`
    grid-area: filter;
    display: flex;
`;

const SortOptions = styled.div`
    grid-area: sort;
    display: flex;
    gap: 4px;
    & > button {
        aspect-ratio: 1;
    }
`;

const Sidebar = styled.div`
    grid-area: sidebar;
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-variant: small-caps;
`;

const ContentPane = styled.div`
    grid-area: contents;
    min-height: 0;
    overflow-y: scroll;
    position: absolute;
    inset: 0;
`;

const CardGrid = styled(
    ({ className, items, paneControls, forbidden, isRoot }: { className?: string; items: DrawerItem[]; paneControls: DragPaneControls; forbidden: Set<string>; isRoot: boolean }) => {
        const { addNodeByType } = Project.useMethods();
        const subgraphMethods = Project.useSubgraphMethods();
        const subgraphEditor = useSubgraphEditor();

        const addNode = useCallback(
            (nodeType: NodeTypes.Any) => {
                const { x, y } = paneControls.get();
                addNodeByType(nodeType, {}, { x: -x, y: -y });
            },
            [addNodeByType, paneControls],
        );

        const addSubgraph = useCallback(
            (subgraphId: string, name: string) => {
                const { x, y } = paneControls.get();
                addNodeByType(NodeTypes.get("custom"), { graphId: subgraphId, label: name }, { x: -x, y: -y });
            },
            [addNodeByType, paneControls],
        );

        const users = Project.useUsers();
        const io = Project.useProjectIO();

        const contextControls = ContextPopup.useControls();
        const [menuTarget, setMenuTarget] = useState<{ kind: "node"; nodeType: NodeTypes.Any } | { kind: "subgraph"; id: string; name: string } | null>(null);

        const openContextMenu = useCallback(
            (evt: MouseEvent<HTMLElement>, target: NonNullable<typeof menuTarget>) => {
                evt.preventDefault();
                setMenuTarget(target);
                contextControls.openOn(evt);
            },
            [contextControls],
        );

        const handleMenuAdd = useCallback(() => {
            if (!menuTarget) return;
            if (menuTarget.kind === "node") {
                addNode(menuTarget.nodeType);
            } else {
                addSubgraph(menuTarget.id, menuTarget.name);
            }
            contextControls.close();
        }, [menuTarget, addNode, addSubgraph, contextControls]);

        const handleMenuEdit = useCallback(() => {
            if (menuTarget?.kind === "subgraph") {
                subgraphEditor.open(menuTarget.id);
            }
            contextControls.close();
        }, [menuTarget, subgraphEditor, contextControls]);

        const handleMenuDelete = useCallback(() => {
            if (menuTarget?.kind === "subgraph") {
                subgraphMethods.remove(menuTarget.id);
            }
            contextControls.close();
        }, [menuTarget, subgraphMethods, contextControls]);

        const handleMenuSave = useCallback(() => {
            if (menuTarget?.kind === "subgraph") {
                const data = io.saveSubgraph(menuTarget.id);
                const json = JSON.stringify(data);
                const name = menuTarget.name || "custom-node";
                downloadBlob(new Blob([json], { type: "application/json" }), `${name}.json`);
            }
            contextControls.close();
        }, [menuTarget, io, contextControls]);

        const handleDragStart = useCallback((e: DragEvent<HTMLElement>, item: DrawerItem) => {
            e.dataTransfer.effectAllowed = "copy";
            e.dataTransfer.setData(NODE_DRAG_MIME, JSON.stringify(item.kind === "node" ? { kind: "node", type: item.nodeType.type } : { kind: "subgraph", id: item.id, name: item.name }));
            e.dataTransfer.setData(`${NODE_TYPE_MIME_PREFIX}${item.kind === "node" ? item.nodeType.type : "custom"}`, "");
        }, []);

        const hasUsers = menuTarget?.kind === "subgraph" && (users[menuTarget.id] ?? []).length > 0;

        return (
            <>
                <ContextPopup controls={contextControls}>
                    <ActionButton.Option onClick={handleMenuAdd}>Add Node</ActionButton.Option>
                    {menuTarget?.kind === "subgraph" && <ActionButton.Option onClick={handleMenuEdit}>Edit Custom Node</ActionButton.Option>}
                    {menuTarget?.kind === "subgraph" && <ActionButton.Option onClick={handleMenuSave}>Save Custom Node</ActionButton.Option>}
                    {menuTarget?.kind === "subgraph" && (
                        <ActionButton.Option flavour={"danger"} onClick={handleMenuDelete} disabled={hasUsers}>
                            Delete Custom Node
                        </ActionButton.Option>
                    )}
                </ContextPopup>
                <div className={className}>
                    {items.map((item) => {
                        switch (item.kind) {
                            case "node": {
                                const restricted = isRoot && !!item.nodeType.rootRestricted;
                                return (
                                    <NodeCard
                                        key={item.nodeType.type}
                                        nodeType={item.nodeType}
                                        disabled={restricted}
                                        tooltip={restricted ? "Only available inside a custom node" : undefined}
                                        handleAdd={addNode}
                                        onContextMenu={(e) => openContextMenu(e, { kind: "node", nodeType: item.nodeType })}
                                        onDragStart={(e) => handleDragStart(e, item)}
                                    />
                                );
                            }
                            case "subgraph": {
                                const isForbidden = forbidden.has(item.id);
                                return (
                                    <SubgraphCard
                                        key={item.id}
                                        disabled={isForbidden}
                                        onClick={() => addSubgraph(item.id, item.name)}
                                        onContextMenu={(e) => openContextMenu(e, { kind: "subgraph", id: item.id, name: item.name })}
                                        data-flavour={item.flavour}
                                        draggable={!isForbidden}
                                        onDragStart={(e) => handleDragStart(e, item)}
                                    >
                                        <div data-part={"title"} title={item.name || item.id}>
                                            {item.name || item.id}
                                        </div>
                                        <div data-part={"icon"}>
                                            <NodeIcon shape={CUSTOM_ICONS[item.icon]} modifierIcon={ICONS.User} />
                                        </div>
                                    </SubgraphCard>
                                );
                            }
                        }
                    })}
                </div>
            </>
        );
    },
)`
    display: grid;
    grid-template-columns: repeat(auto-fill, 148px);
    gap: 4px;
    padding: 4px;
    justify-content: center;
`;

const CARD_STYLES = `
    background: #222;
    border: 1px solid #444;
    padding: 2px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    aspect-ratio: 1;
    cursor: pointer;
    &:disabled {
        opacity: 0.6;
        cursor: auto;
    }

    &:not(:disabled):hover,
    &:focus-visible {
        border-color: #888;
    }

    & > div[data-part="title"] {
        text-align: center;
        font-variant: small-caps;
        font-size: 1em;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
        background: oklch(from var(--flavour) calc(l - 0.15) calc(c - 0.02) h);
        border: 1px solid oklch(from var(--flavour) calc(l - 0.05) c h);
    }
    & > div[data-part="icon"] {
        flex: 1 1 auto;
        display: flex;
        font-size: 36pt;
        align-self: center;
        align-items: center;
    }
`;

const NodeCard = styled(
    ({
        nodeType,
        className,
        disabled,
        tooltip,
        handleAdd,
        onContextMenu,
        onDragStart,
    }: {
        nodeType: NodeTypes.Any;
        className?: string;
        disabled?: boolean;
        tooltip?: string;
        handleAdd: (nodeType: NodeTypes.Any, params: Partial<NodeDefinitions.PayloadTypeOf<NodeDefinitions.Any>>) => void;
        onContextMenu?: (e: MouseEvent<HTMLElement>) => void;
        onDragStart?: (e: DragEvent<HTMLElement>) => void;
    }) => {
        const doAdd = useCallback(() => {
            handleAdd(nodeType, {});
        }, [nodeType, handleAdd]);
        return (
            <button
                className={className}
                data-flavour={nodeType.flavour}
                disabled={disabled}
                title={tooltip}
                onClick={doAdd}
                onContextMenu={onContextMenu}
                draggable={!disabled}
                onDragStart={onDragStart}
            >
                <div data-part={"title"} title={nodeType.displayName}>
                    {nodeType.displayName}
                </div>
                <div data-part={"icon"}>{nodeType.iconNode}</div>
            </button>
        );
    },
)`
    ${CARD_STYLES}
`;

const SubgraphCard = styled.button`
    ${CARD_STYLES}
`;
