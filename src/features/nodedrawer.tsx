import styled from "styled-components";
import { Accordion } from "../components/containers/Accordion";
import { GraphIdContext } from "../state/graphId";
import { Icon, ICONS } from "../components/Icon";
import { Dispatch, SetStateAction, useCallback, useMemo, useState } from "react";
import { Project } from "../state/project";
import { DragPaneControls } from "../components/wrappers/DragPane";
import { NodeDefinitions, NodeTypes } from "../definitions/betterTypes";
import { TextInput } from "../components/inputs/TextInput";
import { CheckBox } from "../components/buttons/CheckBox";
import { UsersType } from "../state/project/types";
import { nanoid } from "nanoid";
import { useSubgraphEditor } from "./subgraph";

const LocalAccordion = styled(Accordion)`
    padding: 0.25em;
    justify-content: center;
    font-variant: small-caps;
`;

const VISIBLE_CATEGORIES_ROOT: NodeTypes.Category[] = ["Shapes", "Primitives", "Collections", "Meta", "Math", "Custom"];
const VISIBLE_CATEGORIES_SUBGRAPH: NodeTypes.Category[] = ["Shapes", "Primitives", "Collections", "Meta", "Math", "Inputs", "Outputs", "Custom"];

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
                        <CardGrid nodeTypes={filteredNodeTypes} paneControls={paneControls} subgraphs={subgraphs} forbidden={forbidden} showNewCustom={showNewCustom} />
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
        "filter filter"
        "sidebar contents";
    position: relative;
`;

const SearchBar = styled.div`
    grid-area: filter;
    display: flex;
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
    ({
        className,
        nodeTypes,
        paneControls,
        subgraphs,
        forbidden,
        showNewCustom,
    }: {
        className?: string;
        nodeTypes: NodeTypes.Any[];
        paneControls: DragPaneControls;
        subgraphs: [string, { name: string }][];
        forbidden: Set<string>;
        showNewCustom: boolean;
    }) => {
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

        const editSubgraph = useCallback(
            (e: { stopPropagation: () => void }, id: string) => {
                e.stopPropagation();
                subgraphEditor.open(id);
            },
            [subgraphEditor],
        );

        return (
            <div className={className}>
                {nodeTypes.map((each) => {
                    return <NodeCard nodeType={each} key={each.type} handleAdd={addNode} />;
                })}
                {showNewCustom && (
                    <NewCustomCard data-flavour={"info"} onClick={createSubgraph}>
                        <div data-part={"title"}>New Custom</div>
                        <div data-part={"icon"}>
                            <Icon shape={ICONS.Plus} />
                        </div>
                    </NewCustomCard>
                )}
                {subgraphs.map(([id, { name }]) => (
                    <SubgraphCard key={id} disabled={forbidden.has(id)} onClick={() => addSubgraph(id, name)} data-flavour={NodeTypes.CATEGORY_FLAVOURS.Custom}>
                        <div data-part={"title"}>{name || id}</div>
                        <div data-part={"icon"}>
                            <Icon shape={ICONS.Cascade} />
                        </div>
                        <EditButton onClick={(e) => editSubgraph(e, id)}>
                            <Icon shape={ICONS.Wrench} />
                        </EditButton>
                    </SubgraphCard>
                ))}
            </div>
        );
    },
)`
    display: grid;
    grid-template-columns: repeat(auto-fill, 128px);
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
    }: {
        nodeType: NodeTypes.Any;
        className?: string;
        disabled?: boolean;
        handleAdd: (nodeType: NodeTypes.Any, params: Partial<NodeDefinitions.PayloadTypeOf<NodeDefinitions.Any>>) => void;
    }) => {
        const doAdd = useCallback(() => {
            handleAdd(nodeType, {});
        }, [nodeType, handleAdd]);
        return (
            <button className={className} data-flavour={NodeTypes.CATEGORY_FLAVOURS[nodeType.category]} disabled={disabled} onClick={doAdd}>
                <div data-part={"title"}>{nodeType.displayName}</div>
                <div data-part={"icon"}>
                    <Icon shape={nodeType.iconCard} />
                </div>
            </button>
        );
    },
)`
    ${CARD_STYLES}
`;

const SubgraphCard = styled.button`
    ${CARD_STYLES}
    position: relative;
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

const EditButton = styled.div`
    position: absolute;
    top: 2px;
    right: 2px;
    background: #333;
    border: 1px solid #555;
    color: #aaa;
    cursor: pointer;
    padding: 2px;
    font-size: 10pt;
    line-height: 1;
    &:hover {
        color: #fff;
        border-color: #888;
    }
`;
