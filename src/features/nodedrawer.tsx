import styled from "styled-components";
import { Accordion } from "../components/containers/Accordion";
import { GraphIdContext } from "../state/graphId";
import { Icon, ICONS } from "../components/Icon";
import { Dispatch, MouseEvent, SetStateAction, useCallback, useMemo, useState } from "react";
import { Project } from "../state/project";
import { DragPaneControls } from "../components/wrappers/DragPane";
import { NodeDefinitions, NodeTypes } from "../definitions/betterTypes";
import { TextInput } from "../components/inputs/TextInput";
import { CheckBox } from "../components/buttons/CheckBox";
import { UsersType } from "../state/project/types";
import { nanoid } from "nanoid";
import { useSubgraphEditor } from "./subgraph";
import { ContextPopup } from "../components/popups/ContextPopup";
import { ActionButton } from "../components/buttons/ActionButton";
import { RadioButton } from "../components/buttons/RadioButton";

const LocalAccordion = styled(Accordion)`
    padding: 0.25em;
    justify-content: center;
    font-variant: small-caps;
`;

type DrawerItem = { kind: "node"; nodeType: NodeTypes.Any } | { kind: "subgraph"; id: string; name: string } | { kind: "newCustom" };

const VISIBLE_CATEGORIES_ROOT: NodeTypes.Category[] = ["Shapes", "Primitives", "Collections", "Logic", "Meta", "Math", "Custom"];
const VISIBLE_CATEGORIES_SUBGRAPH: NodeTypes.Category[] = ["Shapes", "Primitives", "Collections", "Logic", "Meta", "Math", "Inputs", "Outputs", "Custom"];

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

    const visibleCategories = graphId === "root" ? VISIBLE_CATEGORIES_ROOT : VISIBLE_CATEGORIES_SUBGRAPH;

    const allNodeTypes = useMemo(() => {
        return NodeTypes.list().filter((each) => {
            if (each.type === "result" || (each.type as string) === "custom") {
                return false;
            }
            if (graphId === "root" && (each.category === "Inputs" || each.category === "Outputs")) {
                return false;
            }
            return true;
        });
    }, [graphId]);

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

    const showCustomCategory = categoryFilter.size === 0 || categoryFilter.has("Custom");

    const forbidden = useMemo(() => getForbiddenSubgraphs(graphId, users), [graphId, users]);

    const subgraphs = useMemo(() => {
        if (!showCustomCategory) return [];
        return Object.entries(meta)
            .filter(([id]) => id !== "root")
            .filter(([, { name }]) => !searchFilter || name.toLowerCase().includes(searchFilter.toLowerCase()));
    }, [meta, searchFilter, showCustomCategory]);

    const showNewCustom = showCustomCategory && (!searchFilter || "new custom".includes(searchFilter.toLowerCase()));

    const [sort, setSort] = useState<string>("groupAscending");

    const sortedItems = useMemo(() => {
        const items: DrawerItem[] = [];

        for (const nt of filteredNodeTypes) {
            items.push({ kind: "node", nodeType: nt });
        }
        for (const [id, { name }] of subgraphs) {
            items.push({ kind: "subgraph", id, name });
        }

        const getName = (item: DrawerItem): string => {
            if (item.kind === "node") return item.nodeType.displayName;
            if (item.kind === "subgraph") return item.name;
            return "";
        };

        const getCategoryIndex = (item: DrawerItem): number => {
            const cat = item.kind === "node" ? item.nodeType.category : "Custom";
            const idx = visibleCategories.indexOf(cat);
            return idx === -1 ? visibleCategories.length : idx;
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

        if (showNewCustom) {
            items.unshift({ kind: "newCustom" });
        }

        return items;
    }, [filteredNodeTypes, subgraphs, showNewCustom, sort, visibleCategories]);

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
                    <Sidebar>
                        <CheckBox checked={categoryFilter.size === 0} onToggle={clearCategoryFilter}>
                            All
                        </CheckBox>
                        {visibleCategories.map((cat) => (
                            <CheckBox key={cat} checked={categoryFilter.has(cat)} onToggle={() => toggleCategory(cat)} flavour={NodeTypes.CATEGORY_FLAVOURS[cat]}>
                                {cat}
                            </CheckBox>
                        ))}
                    </Sidebar>
                    <ContentPane>
                        <CardGrid items={sortedItems} paneControls={paneControls} forbidden={forbidden} />
                    </ContentPane>
                </Pane>
            </LocalAccordion>
        </GraphIdContext>
    );
};

const Pane = styled.div`
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-rows: auto 1fr;
    gap: 6px;
    padding: 6px;
    grid-template-areas:
        "filter filter sort"
        "sidebar contents contents";
    position: relative;
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

const CardGrid = styled(({ className, items, paneControls, forbidden }: { className?: string; items: DrawerItem[]; paneControls: DragPaneControls; forbidden: Set<string> }) => {
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

    const createSubgraph = useCallback(() => {
        const graphId = nanoid();
        subgraphMethods.create(graphId, "Untitled");
        subgraphEditor.open(graphId);
    }, [subgraphMethods, subgraphEditor]);

    const users = Project.useUsers();

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

    const hasUsers = menuTarget?.kind === "subgraph" && (users[menuTarget.id] ?? []).length > 0;

    return (
        <>
            <ContextPopup controls={contextControls}>
                <ActionButton.Option onClick={handleMenuAdd}>Add Node</ActionButton.Option>
                {menuTarget?.kind === "subgraph" && <ActionButton.Option onClick={handleMenuEdit}>Edit Custom Node</ActionButton.Option>}
                {menuTarget?.kind === "subgraph" && (
                    <ActionButton.Option flavour={"danger"} onClick={handleMenuDelete} disabled={hasUsers}>
                        Delete Custom Node
                    </ActionButton.Option>
                )}
            </ContextPopup>
            <div className={className}>
                {items.map((item) => {
                    switch (item.kind) {
                        case "newCustom":
                            return (
                                <NewCustomCard key={"__newCustom"} data-flavour={"info"} onClick={createSubgraph}>
                                    <div data-part={"title"} title={"New Custom"}>
                                        Custom...
                                    </div>
                                    <div data-part={"icon"}>
                                        <Icon shape={ICONS.User} />
                                    </div>
                                </NewCustomCard>
                            );
                        case "node":
                            return (
                                <NodeCard key={item.nodeType.type} nodeType={item.nodeType} handleAdd={addNode} onContextMenu={(e) => openContextMenu(e, { kind: "node", nodeType: item.nodeType })} />
                            );
                        case "subgraph":
                            return (
                                <SubgraphCard
                                    key={item.id}
                                    disabled={forbidden.has(item.id)}
                                    onClick={() => addSubgraph(item.id, item.name)}
                                    onContextMenu={(e) => openContextMenu(e, { kind: "subgraph", id: item.id, name: item.name })}
                                    data-flavour={NodeTypes.CATEGORY_FLAVOURS.Custom}
                                >
                                    <div data-part={"title"} title={item.name || item.id}>
                                        {item.name || item.id}
                                    </div>
                                    <div data-part={"icon"}>
                                        <Icon shape={ICONS.Cascade} />
                                    </div>
                                </SubgraphCard>
                            );
                    }
                })}
            </div>
        </>
    );
})`
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
        handleAdd,
        onContextMenu,
    }: {
        nodeType: NodeTypes.Any;
        className?: string;
        disabled?: boolean;
        handleAdd: (nodeType: NodeTypes.Any, params: Partial<NodeDefinitions.PayloadTypeOf<NodeDefinitions.Any>>) => void;
        onContextMenu?: (e: MouseEvent<HTMLElement>) => void;
    }) => {
        const doAdd = useCallback(() => {
            handleAdd(nodeType, {});
        }, [nodeType, handleAdd]);
        return (
            <button className={className} data-flavour={NodeTypes.CATEGORY_FLAVOURS[nodeType.category]} disabled={disabled} onClick={doAdd} onContextMenu={onContextMenu}>
                <div data-part={"title"} title={nodeType.displayName}>
                    {nodeType.displayName}
                </div>
                <div data-part={"icon"}>{nodeType.iconCard ?? nodeType.iconNode}</div>
            </button>
        );
    },
)`
    ${CARD_STYLES}
`;

const SubgraphCard = styled.button`
    ${CARD_STYLES}
`;

const NewCustomCard = styled.button`
    ${CARD_STYLES}
    border-style: dashed;
    opacity: 0.8;
    &:hover {
        opacity: 1;
        border-color: #888;
    }
`;
