import { nanoid } from "nanoid";
import { NodeIcon, Icon, ICONS, NODE_ICONS } from "../../../components/Icon";
import { CSSProperties, FocusEvent, KeyboardEvent, MouseEvent, ReactNode, RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";

import { DragMove } from "../../../components/wrappers/DragMove";
import { TextInput } from "../../../components/inputs/TextInput";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { ContextPopup } from "../../../components/popups/ContextPopup";
import { useStable } from "../../../util/hooks/useStable";
import { Project } from "../../../state/project";
import { Session } from "../../../state/session";
import { Resolver } from "../../../util/resolver";
import { useGraphId } from "../../../state/graphId";
import { Flavour, FLAVOUR_LABELS } from "../../../components/types";
import { useDragPaneInternal } from "../../../components/wrappers/DragPane";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: {},
    out: {},
});

export type ContainerDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        width: number;
        height: number;
        flavour: Exclude<Flavour, "accent" | "inherit">;
    }
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<ContainerDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"container", ContainerDefinition> => {
    return {
        id,
        in: {},
        out: {},
        payload: {
            label: input.label ?? "",
            width: MIN_WIDTH,
            height: MIN_HEIGHT,
            flavour: "base",
        },
        type: "container",
    };
};

// ─── Resize ─────────────────────────────────────────────────────────────────

const MIN_WIDTH = 360;
const MIN_HEIGHT = 360;

const RESIZE_DIRS: Record<string, { sx: number; sy: number }> = {
    tl: { sx: -1, sy: -1 },
    tc: { sx: 0, sy: -1 },
    tr: { sx: 1, sy: -1 },
    cl: { sx: -1, sy: 0 },
    cr: { sx: 1, sy: 0 },
    bl: { sx: -1, sy: 1 },
    bc: { sx: 0, sy: 1 },
    br: { sx: 1, sy: 1 },
};

const useResizeHandles = (bodyRef: RefObject<HTMLElement | null>, onFinish: (size: { width: number; height: number }, pos: { x: number; y: number }) => void, zoomGetter: () => number) => {
    const onFinishRef = useStable(onFinish);
    const zoomGetterRef = useStable(zoomGetter);

    useEffect(() => {
        const body = bodyRef.current;
        if (!body) return;

        const pointerDown = (evt: PointerEvent) => {
            const target = (evt.target as HTMLElement).closest<HTMLElement>("[data-resize]");
            if (!target || evt.button !== 0) return;
            const dir = target.dataset.resize!;
            const dirs = RESIZE_DIRS[dir];
            if (!dirs) return;
            const { sx, sy } = dirs;

            evt.stopPropagation();
            target.setPointerCapture(evt.pointerId);

            const wrapper = body.closest<HTMLElement>("[data-trhmarker]");

            const initialW = parseFloat(body.style.getPropertyValue("--w")) || body.offsetWidth;
            const initialH = parseFloat(body.style.getPropertyValue("--h")) || body.offsetHeight;
            const initialPX = parseFloat(wrapper?.style.getPropertyValue("--x") ?? "0");
            const initialPY = parseFloat(wrapper?.style.getPropertyValue("--y") ?? "0");
            const startClientX = evt.clientX;
            const startClientY = evt.clientY;

            // Anchor = the edge opposite the handle, stays fixed
            const anchorX = initialPX - (sx * initialW) / 2;
            const anchorY = initialPY - (sy * initialH) / 2;

            let w = initialW;
            let h = initialH;
            let px = initialPX;
            let py = initialPY;

            const pointerMove = (moveEvt: PointerEvent) => {
                const zoom = zoomGetterRef.current();
                const dx = (moveEvt.clientX - startClientX) / zoom;
                const dy = (moveEvt.clientY - startClientY) / zoom;

                if (sx !== 0) {
                    w = Math.max(MIN_WIDTH, initialW + dx * sx);
                    px = anchorX + (sx * w) / 2;
                    body.style.setProperty("--w", `${w}px`);
                    wrapper?.style.setProperty("--x", `${px}px`);
                }
                if (sy !== 0) {
                    h = Math.max(MIN_HEIGHT, initialH + dy * sy);
                    py = anchorY + (sy * h) / 2;
                    body.style.setProperty("--h", `${h}px`);
                    wrapper?.style.setProperty("--y", `${py}px`);
                }
            };

            const pointerUp = (upEvt: PointerEvent) => {
                onFinishRef.current({ width: w, height: h }, { x: px, y: py });
                target.removeEventListener("pointermove", pointerMove);
                target.removeEventListener("pointerup", pointerUp);
                target.releasePointerCapture(upEvt.pointerId);
            };

            target.addEventListener("pointermove", pointerMove);
            target.addEventListener("pointerup", pointerUp);
        };

        body.addEventListener("pointerdown", pointerDown);
        return () => {
            body.removeEventListener("pointerdown", pointerDown);
        };
    }, [bodyRef]);
};

// ─── Controls ───────────────────────────────────────────────────────────────

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ContainerDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const nodeId = node.id;
    const { update: updateNode, remove: removeNode } = methods;
    const graphId = useGraphId();
    const [storedPosition, setPosition] = Project.usePositionOf(graphId, nodeId);
    const handleRef = useRef<HTMLDivElement>(null);
    const selectionRef = Session.useSelectionRef();
    const positionsRef = Project.usePositionsRef();
    const positionMethods = Project.usePositionMethods();
    const selectMethods = Session.useSelectionMethods();

    const bodyRef = useRef<HTMLDivElement>(null);
    const containedNodesRef = useRef<Set<string> | null>(null);

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
                    if (positionsRef.current[graphId]?.[nId]) {
                        compiled[nId] = { x: positionsRef.current[graphId][nId].x + delta.x, y: positionsRef.current[graphId][nId].y + delta.y };
                    }
                }
            }

            // Snapshot contained nodes on first drag frame using DOM bounding rects
            if (!containedNodesRef.current) {
                containedNodesRef.current = new Set();
                const containerRect = bodyRef.current?.getBoundingClientRect();
                if (containerRect) {
                    const candidates = document.querySelectorAll<HTMLElement>('[data-selectable^="node_"]');
                    for (const el of candidates) {
                        const id = el.dataset.selectable!.substring(5);
                        if (compiled[id]) continue;
                        const rect = el.getBoundingClientRect();
                        if (rect.left >= containerRect.left && rect.top >= containerRect.top && rect.right <= containerRect.right && rect.bottom <= containerRect.bottom) {
                            containedNodesRef.current.add(id);
                        }
                    }
                }
            }

            for (const candidateId of containedNodesRef.current) {
                if (compiled[candidateId]) continue;
                const candidatePos = positionsRef.current[graphId]?.[candidateId];
                if (candidatePos) {
                    compiled[candidateId] = { x: candidatePos.x + delta.x, y: candidatePos.y + delta.y };
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
            containedNodesRef.current = null;
            if (!selectionRef.current.has(`node_${nodeId}`)) {
                setPosition(pos);
                return;
            }
            positionMethods.setMany.commit();
        },
        [nodeId, positionMethods.setMany, selectionRef, setPosition],
    );

    const [, paneControls] = useDragPaneInternal();
    const localPosition = DragMove.useHandle(handleRef, storedPosition, { onFinish: handleFinish, onDelta: handleDragDelta, zoom: () => paneControls.get().z });

    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ContainerDefinition>>) => {
            updateNode(v);
        },
        [updateNode],
    );

    const handleResizeFinish = useCallback(
        (size: { width: number; height: number }, pos: { x: number; y: number }) => {
            handleUpdate({ width: size.width, height: size.height });
            setPosition(pos);
        },
        [handleUpdate, setPosition],
    );

    useResizeHandles(bodyRef, handleResizeFinish, () => paneControls.get().z);

    const contextControls = ContextPopup.useControls();

    const handleContextMenu = useCallback(
        (evt: MouseEvent<HTMLDivElement>) => {
            const paneElement = paneControls.paneRef().current;
            if (paneElement) {
                evt.preventDefault();
                const rect = paneElement.getBoundingClientRect();
                const { x: panX, y: panY, z } = paneControls.get();
                const offsetX = rect.left + rect.width / 2 + panX * z;
                const offsetY = rect.top + rect.height / 2 + panY * z;
                contextControls.openAt((evt.clientX - offsetX) / z, (evt.clientY - offsetY) / z);
            }
        },
        [contextControls, paneControls],
    );

    const handleSetFlavour = useCallback(
        (flavour: ContainerDefinition["payload"]["flavour"]) => {
            handleUpdate({ flavour });
            contextControls.close();
        },
        [handleUpdate, contextControls],
    );

    const handleDeleteAndClose = useCallback(() => {
        removeNode();
        contextControls.close();
    }, [removeNode, contextControls]);

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
        return { "--node": `--node_${nodeId}`, "--w": `${node.payload.width}px`, "--h": `${node.payload.height}px` } as CSSProperties;
    }, [nodeId, node.payload.width, node.payload.height]);

    const displayLabel = node.payload.label === "" ? "Container" : node.payload.label;

    return (
        <ContainerWrapper position={localPosition} noStack data-moveable={`node_${nodeId}`} onFocus={handleFocus} data-flavour={node.payload.flavour}>
            <div ref={bodyRef} data-part={"body"} style={style} data-node={`--node_${nodeId}`} data-state={isSelected ? "selected" : undefined} data-selectable={`node_${nodeId}`}>
                <ContainerBody>
                    <EdgeHandle data-resize="tl" />
                    <EdgeHandle data-resize="tc" />
                    <EdgeHandle data-resize="tr" />
                    <EdgeHandle data-resize="cl" />
                    <ContainerContent>
                        <ContainerTitle>
                            <div data-part={"handle"} ref={handleRef} onDoubleClick={startEdit} onContextMenu={handleContextMenu}>
                                <div data-part={"icon"}>
                                    <Icon shape={NODE_ICONS.group} />
                                </div>
                                <div data-part={"title"}>
                                    {isEditing ? (
                                        <TextInput value={node.payload.label} onCommit={finishEdit} onKeyDown={onKeyPress} onBlur={onBlur} autoFocus placeholder={"Container"} />
                                    ) : (
                                        <span>{displayLabel}</span>
                                    )}
                                </div>
                            </div>
                            <div data-part={"remove"}>
                                <ActionButton.Lite onClick={removeNode}>
                                    <Icon shape={ICONS.Close} />
                                </ActionButton.Lite>
                            </div>
                        </ContainerTitle>
                        <ContextPopup controls={contextControls}>
                            {(Object.entries(FLAVOUR_LABELS) as [ContainerDefinition["payload"]["flavour"], string][]).map(([key, name]) => (
                                <ActionButton.Option key={key} flavour={key === "base" ? undefined : key} onClick={() => handleSetFlavour(key)}>
                                    {name}
                                </ActionButton.Option>
                            ))}
                            <hr />
                            <ActionButton.Option flavour={"danger"} onClick={handleDeleteAndClose}>
                                Delete
                            </ActionButton.Option>
                        </ContextPopup>
                    </ContainerContent>
                    <EdgeHandle data-resize="cr" />
                    <EdgeHandle data-resize="bl" />
                    <EdgeHandle data-resize="bc" />
                    <EdgeHandle data-resize="br" />
                </ContainerBody>
            </div>
        </ContainerWrapper>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<ContainerDefinition>, _outSocket: never, _deps: AllDeps): never[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ContainerDefinition>, _inSocket: never, _deps: AllDeps): never[] => {
    return [];
};

const evaluate = (_node: NodeDefinitions.NodeFor<ContainerDefinition>, _socket: never, _context: Resolver.Context): DataTypes.AnyEval | null => {
    return null;
};

export const ContainerNodeType: NodeTypes.Type<"container", ContainerDefinition> = {
    type: "container",
    displayName: "Container",
    defaultLabel: "Container",
    iconNode: <NodeIcon shape={NODE_ICONS.group} />,
    flavour: "info",
    category: "Meta",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    signature: def.instance,
    ...SignatureEngine.hooks,
};

// ─── Styled Components ──────────────────────────────────────────────────────

const ContainerWrapper = styled(DragMove.Item)`
    display: grid;
    place-content: center;
    place-items: center;
    width: 0px;
    height: 0px;
    pointer-events: none;

    & > [data-part="body"][data-state~="selected"] {
        outline-color: white;
    }

    & > [data-part="body"] {
        display: grid;
        background: oklch(from var(--flavour) calc(l * 0.5) c h / 20%);
        border: 1px solid var(--flavour);
        width: var(--w);
        height: var(--h);
        outline: 1px solid transparent;
        anchor-name: var(--node);
        outline-offset: 4px;
        border-radius: 2px;
        corner-shape: bevel;
        padding: 2px;
        transition: outline-color 0.25s;
        box-shadow: 0px 4px 8px black;
    }
`;

const ContainerTitle = styled.div`
    display: grid;
    align-items: center;
    grid-template-columns: 1fr auto;

    & > button {
        color: oklch(from var(--flavour) 0.8 calc(c + 0.01) h);
    }

    & > div[data-part="handle"] {
        display: flex;
        gap: 0.25em;
        padding: 0.125em;
        align-items: center;
        & > div[data-part="title"] {
            pointer-events: auto;
            justify-self: start;
            cursor: move;
            & > input {
                text-align: inherit;
                font-weight: bold;
            }
            & > span {
                justify-self: start;
                font-size: 16pt;
                font-variant: small-caps;
                flex: 1 1 0;
                border: 1px solid transparent;
                color: white;
            }
        }

        & > div[data-part="icon"] {
            pointer-events: auto;
            & > svg {
                color: oklch(from var(--flavour) calc(l + 0.1) c h);
            }
            cursor: move;
        }
    }

    & > div[data-part="remove"] {
        pointer-events: auto;
        & > svg {
            color: oklch(from var(--flavour) calc(l + 0.1) c h);
        }
    }
`;

const ContainerBody = styled.div`
    display: grid;
    grid-template-columns: auto 1fr auto;
    grid-template-rows: auto 1fr auto;
    grid-template-areas:
        "tl tc tr"
        "cl content cr"
        "bl bc br";
`;

const EdgeHandle = styled.div`
    min-width: 12px;
    min-height: 12px;
    position: relative;
    pointer-events: auto;

    &::after {
        position: absolute;
        content: "";
        inset: 0px;
        corner-shape: bevel;
    }

    &[data-resize="tl"] {
        grid-area: tl;
        cursor: nwse-resize;
        &::after {
            background: var(--flavour);
            border-radius: 0 0 100% 0;
        }
    }
    &[data-resize="tc"] {
        grid-area: tc;
        cursor: ns-resize;
    }
    &[data-resize="tr"] {
        grid-area: tr;
        cursor: nesw-resize;
        &::after {
            background: var(--flavour);
            border-radius: 0 0 0 100%;
        }
    }
    &[data-resize="cl"] {
        grid-area: cl;
        cursor: ew-resize;
    }
    &[data-resize="cr"] {
        grid-area: cr;
        cursor: ew-resize;
    }
    &[data-resize="bl"] {
        grid-area: bl;
        cursor: nesw-resize;
        &::after {
            background: var(--flavour);
            border-radius: 0 100% 0 0;
        }
    }
    &[data-resize="bc"] {
        grid-area: bc;
        cursor: ns-resize;
    }
    &[data-resize="br"] {
        grid-area: br;
        cursor: nwse-resize;
        &::after {
            background: var(--flavour);
            border-radius: 100% 0 0 0;
        }
    }
`;

const ContainerContent = styled.div`
    grid-area: content;
    align-self: start;
`;
