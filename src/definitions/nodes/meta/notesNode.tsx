import { nanoid } from "nanoid";
import { Icon, ICONS, NODE_ICONS } from "../../../components/Icon";
import { CSSProperties, FocusEvent, KeyboardEvent, ReactNode, useCallback, useMemo, useRef, useState } from "react";
import styled from "styled-components";

import { DragMove } from "../../../components/wrappers/DragMove";
import { TextInput } from "../../../components/inputs/TextInput";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { AbstractInput } from "../../../components/abstract/Inputs";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Session } from "../../../state/session";
import { Resolver } from "../../../util/resolver";
import { useGraphId } from "../../../state/graphId";

export type NotesDefinition = {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    inputs: {};
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    outputs: {};
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        text: string;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<NotesDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"notes", NotesDefinition> => {
    return {
        id,
        in: {},
        out: {},
        payload: {
            label: input.label ?? "",
            text: input.text ?? "",
        },
        type: "notes",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<NotesDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const nodeId = node.id;
    const { update: updateNode, remove: removeNode } = methods;
    const graphId = useGraphId();
    const [storedPosition, setPosition] = Project.usePositionOf(graphId, nodeId);
    const handleRef = useRef<HTMLDivElement>(null);
    const selectionRef = Session.useSelectionRef();
    const positionsRef = Project.usePositionsRef();
    const positionMethods = Project.usePositionMethods();
    const selectMethods = Session.useSelectionMethods();

    const [isSelected] = Session.useIsSelected(`node_${nodeId}`);
    const [isEditing, setIsEditing] = useState(false);

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
                    if (positionsRef.current["root"]?.[nId]) {
                        compiled[nId] = { x: positionsRef.current["root"][nId].x + delta.x, y: positionsRef.current["root"][nId].y + delta.y };
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
        [selectionRef, nodeId, positionMethods.setMany, positionsRef],
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

    const localPosition = DragMove.useHandle(handleRef, storedPosition, { onFinish: handleFinish, onDelta: handleDragDelta });

    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<NotesDefinition>>) => {
            updateNode(v);
        },
        [updateNode],
    );

    // Double-click to edit label
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

    const style = useMemo(() => {
        return { "--node": `--node_${nodeId}` } as CSSProperties;
    }, [nodeId]);

    const displayLabel = node.payload.label === "" ? "Note" : node.payload.label;

    return (
        <NoteWrapper position={localPosition} data-moveable={`node_${nodeId}`} onFocus={handleFocus}>
            <div data-part={"body"} style={style} data-node={`--node_${nodeId}`} data-state={isSelected ? "selected" : undefined} data-selectable={`node_${nodeId}`}>
                <NoteTitle>
                    <Icon shape={NODE_ICONS.note} />
                    <div data-part={"handle"} ref={handleRef} onDoubleClick={startEdit}>
                        {isEditing ? <TextInput value={node.payload.label} onCommit={finishEdit} onKeyDown={onKeyPress} onBlur={onBlur} autoFocus placeholder={"Note"} /> : <span>{displayLabel}</span>}
                    </div>
                    <ActionButton.Lite onClick={removeNode}>
                        <Icon shape={ICONS.Close} />
                    </ActionButton.Lite>
                </NoteTitle>
                <NoteBody>
                    <NoteTextArea value={node.payload.text} onCommit={(text) => handleUpdate({ text })} />
                </NoteBody>
            </div>
        </NoteWrapper>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<NotesDefinition>, _outSocket: never, _deps: AllDeps): never[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<NotesDefinition>, _inSocket: never, _deps: AllDeps): never[] => {
    return [];
};

const evaluate = (_node: NodeDefinitions.NodeFor<NotesDefinition>, _socket: never, _context: Resolver.Context): DataTypes.AnyEval | null => {
    return null;
};

const getSocketType = (_node: NodeDefinitions.NodeFor<NotesDefinition>, _socketId: string, _side: "in" | "out"): SocketTypes.SocketRule => {
    return { types: [], mode: "and" };
};

export const NotesNodeType: NodeTypes.Type<"notes", NotesDefinition> = {
    type: "notes",
    displayName: "Note",
    defaultLabel: "Note",
    iconNode: <Icon shape={NODE_ICONS.note} color={"var(--icon-flavour)"} />,
    category: "Meta",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    getSocketType,
};

// ─── Styled Components ──────────────────────────────────────────────────────

const NoteWrapper = styled(DragMove.Item)`
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
        background: #000c;
        border: 1px solid #666;
        width: max-content;
        min-width: 280px;
        outline: 1px solid transparent;
        transform: translate(-50%, 0);
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

const NoteTitle = styled.div`
    display: flex;
    align-items: center;
    padding: 0.125em;
    gap: 0.25em;
    background: #222;
    border: 1px solid #444;
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
`;

const NoteBody = styled.div`
    margin: 4px;
`;

const NoteTextArea = styled(AbstractInput.Block)`
    width: 480px;
    height: 240px;
    background: transparent;
    border-color: transparent;
    color: #ccc;
    font-family: inherit;
    font-size: 0.9em;
    resize: none;
    padding: 0.25em 0.5em;

    &::placeholder {
        color: #ccc;
    }
`;
