import styled from "styled-components";
import { Accordion } from "../components/containers/Accordion";
import { GraphIdContext } from "../state/graphId";
import { Icon, ICONS } from "../components/Icon";
import { useCallback, useMemo } from "react";
import { Project } from "../state/project";
import { DragPaneControls } from "../components/wrappers/DragPane";
import { NodeDefinitions, NodeTypes } from "../definitions/betterTypes";

const LocalAccordion = styled(Accordion)`
    padding: 0.25em;
    justify-content: center;
    font-variant: small-caps;
`;

export const NodeDrawer = ({ graphId, paneControls }: { graphId: string; paneControls: DragPaneControls }) => {
    const nodeTypes = useMemo(() => {
        return NodeTypes.list().filter((each) => {
            if (each.type === "result" || (each.type as string) === "custom") {
                return false;
            }
            if (graphId === "root" && each.category === "interface") {
                return false;
            }
            return true;
        });
    }, [graphId]);

    return (
        <GraphIdContext value={graphId}>
            <LocalAccordion title={"Add Nodes"} isOpen iconClosed={ICONS.Caret.Up}>
                <Pane>
                    <CardGrid nodeTypes={nodeTypes} paneControls={paneControls} />
                </Pane>
            </LocalAccordion>
        </GraphIdContext>
    );
};

const Pane = styled.div`
    height: 300px;
    max-height: 20vh;
    min-height: 0;
    overflow-y: scroll;
`;

const CardGrid = styled(({ className, nodeTypes, paneControls }: { className?: string; nodeTypes: NodeTypes.Any[]; paneControls: DragPaneControls }) => {
    const { addNodeByType } = Project.useMethods();

    const addNode = useCallback(
        (nodeType: NodeTypes.Any) => {
            const { x, y } = paneControls.get();
            addNodeByType(nodeType, {}, { x: -x, y: -y });
        },
        [addNodeByType, paneControls],
    );

    return (
        <div className={className}>
            {nodeTypes.map((each) => {
                return <NodeCard nodeType={each} key={each.defaultLabel} handleAdd={addNode} />;
            })}
        </div>
    );
})`
    display: grid;
    grid-template-columns: repeat(auto-fill, 128px);
    gap: 4px;
    padding: 4px;
    justify-content: center;
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
