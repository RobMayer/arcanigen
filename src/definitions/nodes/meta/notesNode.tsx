import { nanoid } from "nanoid";
import { Icon, ICONS, NODE_ICONS } from "../../../components/Icon";
import { FocusEvent, KeyboardEvent, ReactNode, useCallback, useRef, useState } from "react";
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

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<NotesDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"notes", NotesDefinition> => {
    return {
        id,
        in: {},
        out: {},
        payload: {
            label: "",
            text: "",
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

    const [isSelected] = Session.useIsSelected(`node_${nodeId}`);
    const [isEditing, setIsEditing] = useState(false);

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
                const element = document.querySelector(`div[data-selectable="node_${nId}"]`);
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

    const displayLabel = node.payload.label === "" ? "Note" : node.payload.label;

    return (
        <NoteWrapper position={localPosition} data-node={`--node_${nodeId}`} data-selectable={`node_${nodeId}`} data-state={isSelected ? "selected" : undefined}>
            <NoteTitle ref={handleRef} onDoubleClick={startEdit}>
                <Icon shape={NODE_ICONS.note} />
                {isEditing ? (
                    <TitleInput value={node.payload.label} onCommit={finishEdit} onKeyDown={onKeyPress} onBlur={onBlur} autoFocus placeholder={"Note"} />
                ) : (
                    <TitleSpan>{displayLabel}</TitleSpan>
                )}
                <ActionButton.Lite onClick={removeNode}>
                    <Icon shape={ICONS.Close} />
                </ActionButton.Lite>
            </NoteTitle>
            <NoteBody>
                <NoteTextArea value={node.payload.text} onCommit={(text) => handleUpdate({ text })} />
            </NoteBody>
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
    background: #000c;
    border: 1px solid #444;
    width: max-content;
    min-width: 240px;
    outline: 1px solid transparent;
    transform: translate(-50%, 0);
    anchor-name: attr(data-node type(<custom-ident>));
    outline-offset: 4px;
    border-radius: 2px;
    padding: 2px;
    transition: outline-color 0.25s;
    box-shadow: 0px 4px 8px black;

    &:focus-within,
    &[data-state~="selected"] {
        outline-color: white;
        opacity: 1;
    }
`;

const NoteTitle = styled.div`
    display: flex;
    align-items: center;
    padding: 0.125em;
    gap: 0.25em;
    background: #111;
    border: 1px solid #444;
    margin: 2px;
    cursor: move;

    & > svg {
        color: #ccc;
    }

    & > button {
        color: #ccc;
    }
`;

const TitleSpan = styled.span`
    flex: 1 1 0;
    text-align: center;
    font-weight: bold;
    font-variant: small-caps;
    font-size: 1.1em;
    color: #ccc;
    border: 1px solid transparent;
`;

const TitleInput = styled(TextInput)`
    flex: 1 1 0;
    width: 0;
    min-width: 0;
    text-align: center;
    font-weight: bold;
    font-variant: small-caps;
    font-size: 1.1em;
    background: transparent;
    border-color: transparent;
    color: #ccc;
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
