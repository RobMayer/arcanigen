import { nanoid } from "nanoid";
import { Icon, ICONS, NODE_ICONS } from "../../components/Icon";
import { Resolver } from "../../util/resolver";
import { CSSProperties, FocusEvent, KeyboardEvent, ReactNode, useCallback, useMemo, useRef, useState } from "react";
import styled from "styled-components";

import { DragMove } from "../../components/wrappers/DragMove";
import { NodeAccordion, SocketIn } from "../../features/nodeview/slots";
import { LengthInput } from "../../components/inputs/LengthInput";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../betterTypes";
import { Project } from "../../state/project";
import { Session } from "../../state/session";
import { useGraphId } from "../../state/graphId";
import { useDragPaneInternal } from "../../components/wrappers/DragPane";
import { ColorHexInput } from "../../components/inputs/ColorHexInput";
import { TextInput } from "../../components/inputs/TextInput";
import { ActionButton } from "../../components/buttons/ActionButton";

export type ResultDefinition = {
    outputs: never;
    inputs: {
        input: DataTypes.Use<"shape">;
        w: DataTypes.Use<"length">;
        h: DataTypes.Use<"length">;
        x: DataTypes.Use<"length">;
        y: DataTypes.Use<"length">;
        color: DataTypes.Use<"color">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        w: DataTypes.TypeOf<DataTypes.Use<"length">>;
        h: DataTypes.TypeOf<DataTypes.Use<"length">>;
        x: DataTypes.TypeOf<DataTypes.Use<"length">>;
        y: DataTypes.TypeOf<DataTypes.Use<"length">>;
        color: DataTypes.TypeOf<DataTypes.Use<"color">>;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<ResultDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"result", ResultDefinition> => {
    return {
        in: {
            input: null,
            w: null,
            h: null,
            x: null,
            y: null,
            color: null,
        },
        out: {},
        payload: {
            w: `800px`,
            h: `800px`,
            x: `0px`,
            y: `0px`,
            color: { r: 1, g: 1, b: 1, a: 1 },
            label: "",
            ...input,
        },
        type: "result",
        id,
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ResultDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const nodeId = node.id;
    const { update: updateNode } = methods;
    const graphId = useGraphId();
    const [storedPosition, setPosition] = Project.usePositionOf(graphId, nodeId);
    const handleRef = useRef<HTMLDivElement>(null);
    const [, paneControls] = useDragPaneInternal();
    const selectionRef = Session.useSelectionRef();
    const positionsRef = Project.usePositionsRef();
    const positionMethods = Project.usePositionMethods();

    const [isSelected] = Session.useIsSelected(`node_${nodeId}`);
    const [isClosed, setIsClosed] = Project.useUiState<boolean>(`node_accordion[${graphId}][${nodeId}]`);
    const [isEditing, setIsEditing] = useState(false);
    const selectMethods = Session.useSelectionMethods();

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
            const compiled: { [key: string]: { x: number; y: number } } = {};
            for (const id of selectionRef.current) {
                if (id.startsWith("node_")) {
                    const nId = id.substring(5);
                    if (positionsRef.current[graphId]?.[nId]) {
                        compiled[nId] = { x: positionsRef.current[graphId][nId].x + delta.x, y: positionsRef.current[graphId][nId].y + delta.y };
                    }
                }
            }
            for (const [nId, toSet] of Object.entries(compiled)) {
                const element = document.querySelector(`div[data-moveable="node_${nId}"]`);
                (element as HTMLElement)?.style.setProperty("--x", `${toSet.x}px`);
                (element as HTMLElement)?.style.setProperty("--y", `${toSet.y}px`);
                element?.setAttribute("data-x", `${toSet.x}`);
                element?.setAttribute("data-y", `${toSet.y}`);
            }
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

    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ResultDefinition>>) => {
            updateNode(v);
        },
        [updateNode],
    );

    const toggle = useCallback(() => {
        setIsClosed((p) => (p ? undefined : true));
    }, [setIsClosed]);

    const startEdit = useCallback(() => {
        setIsEditing(true);
    }, []);

    const finishEdit = useCallback(
        (value: string) => {
            handleUpdate({ label: value });
        },
        [handleUpdate],
    );

    const onKeyPress = useCallback((evt: KeyboardEvent<HTMLInputElement>) => {
        if (evt.key === "Escape" || evt.key === "Enter") {
            setIsEditing(false);
        }
    }, []);

    const onBlur = useCallback((_evt: FocusEvent<HTMLInputElement>) => {
        setIsEditing(false);
    }, []);

    const displayLabel = node.payload.label === "" ? "Result" : node.payload.label;

    const style = useMemo(() => {
        return { "--node": `--node_${nodeId}` } as CSSProperties;
    }, [nodeId]);

    return (
        <ResultWrapper position={localPosition} data-moveable={`node_${nodeId}`} onFocus={handleFocus}>
            <div data-part={"body"} style={style} data-state={isSelected ? "selected" : undefined} data-selectable={`node_${nodeId}`}>
                <ResultTitle data-flavour="emphasis">
                    <ResultFallback nodeId={nodeId} side={"in"} />
                    <ActionButton.Lite onClick={toggle} flavour={"inherit"}>
                        <Icon shape={isClosed ? ICONS.Caret.Right : ICONS.Caret.Down} />
                    </ActionButton.Lite>
                    <div data-part={"handle"} ref={handleRef} onDoubleClick={startEdit}>
                        <Icon shape={NODE_ICONS.result} color={"var(--icon-flavour)"} />
                        {isEditing ? (
                            <TextInput value={node.payload.label} onCommit={finishEdit} onKeyDown={onKeyPress} onBlur={onBlur} autoFocus placeholder={"Result"} />
                        ) : (
                            <span>{displayLabel}</span>
                        )}
                        <Icon shape={ICONS.Blank} />
                    </div>
                    <Icon shape={ICONS.Blank} />
                    <ResultFallback nodeId={nodeId} side={"out"} />
                </ResultTitle>
                {isClosed ? null : (
                    <ResultSlots>
                        <SocketIn node={node} socketId={"input"}>
                            Input
                        </SocketIn>
                        <NodeAccordion socketsIn={"w|h|x|y|color"} label={"Canvas"} nodeId={node.id}>
                            <SocketIn node={node} socketId={"w"} label={"Canvas Width"}>
                                <LengthInput value={node.payload.w} onCommit={(w) => handleUpdate({ w })} disabled={node.in.w !== null} required min={"0px"} />
                            </SocketIn>
                            <SocketIn node={node} socketId={"h"} label={"Canvas Height"}>
                                <LengthInput value={node.payload.h} onCommit={(h) => handleUpdate({ h })} disabled={node.in.h !== null} required min={"0px"} />
                            </SocketIn>
                            <SocketIn node={node} socketId={"x"} label={"Origin X"}>
                                <LengthInput value={node.payload.x} onCommit={(x) => handleUpdate({ x })} disabled={node.in.x !== null} required min={"0px"} />
                            </SocketIn>
                            <SocketIn node={node} socketId={"y"} label={"Origin Y"}>
                                <LengthInput value={node.payload.y} onCommit={(y) => handleUpdate({ y })} disabled={node.in.y !== null} required min={"0px"} />
                            </SocketIn>
                            <SocketIn node={node} socketId={"color"} label={"Color"}>
                                <ColorHexInput value={node.payload.color} onCommit={(color) => handleUpdate({ color })} required alpha disabled={node.in.color !== null} />
                            </SocketIn>
                        </NodeAccordion>
                    </ResultSlots>
                )}
            </div>
        </ResultWrapper>
    );
};

const dependsOn = <K extends string | number | symbol>(_node: NodeDefinitions.NodeFor<ResultDefinition>, _outSocket: K, _deps: AllDeps): (keyof ResultDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ResultDefinition>, _inSocket: keyof ResultDefinition["inputs"], _deps: AllDeps): (keyof ResultDefinition["outputs"])[] => {
    return [];
};
const evaluate = (node: NodeDefinitions.NodeFor<ResultDefinition>, socket: string | number | symbol, context: Resolver.Context): DataTypes.AnyEval | null => {
    // this should never be reached.
    return null;
};

const SOCKETTYPES_IN: { [key in keyof Required<ResultDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    input: { types: ["shape"], mode: "or" },
    w: { types: ["length"], mode: "or" },
    h: { types: ["length"], mode: "or" },
    x: { types: ["length"], mode: "or" },
    y: { types: ["length"], mode: "or" },
    color: { types: ["color"], mode: "or" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<ResultDefinition>, socketId: string, _side: "in" | "out"): SocketTypes.SocketRule => {
    return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
};

export const ResultNodeType: NodeTypes.Type<"result", ResultDefinition> = {
    type: "result",
    displayName: "Result",
    defaultLabel: "Result",
    iconNode: <Icon shape={NODE_ICONS.result} color={"var(--icon-flavour)"} />,
    category: "Result",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};

// ─── Styled Components ──────────────────────────────────────────────────────

const ResultWrapper = styled(DragMove.Item)`
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

const ResultTitle = styled.div`
    display: flex;
    align-items: center;
    padding: 0.125em;
    gap: 0.25em;
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

const ResultSlots = styled.div`
    display: grid;
    gap: 4px;
    margin: 8px;
`;

const ResultFallback = styled(({ nodeId, className, side }: { nodeId: string; className?: string; side: "in" | "out" }) => {
    const style = useMemo(() => {
        return { anchorName: `--nodeFB_${nodeId}_${side}` };
    }, [nodeId, side]);

    return <div className={className} style={style} />;
})`
    background: blue;
`;
