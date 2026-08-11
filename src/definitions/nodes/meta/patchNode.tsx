import { nanoid } from "nanoid";
import { queryUpstreamOutType, commitSocketTypes } from "../../helpers/nodeHelper";
import { NodeIcon, Icon, ICONS, NODE_ICONS } from "../../../components/Icon";
import { CSSProperties, DragEvent, MouseEvent, ReactNode, useCallback, useMemo, useRef, useState } from "react";
import styled from "styled-components";

import { DragMove } from "../../../components/wrappers/DragMove";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { SocketTypes } from "../../socketTypes";
import { ContextPopup } from "../../../components/popups/ContextPopup";
import { Project } from "../../../state/project";
import { Session } from "../../../state/session";
import { Resolver } from "../../../util/resolver";
import { useGraphId } from "../../../state/graphId";
import { useDragPaneInternal } from "../../../components/wrappers/DragPane";
import { SocketPair } from "../../../features/nodeview/slots";
import { ArcaneGraph } from "../../../util/structs/arcaneGraph";

type Pair = {
    id: `pair_${string}`;
};

export type PatchDefinition = {
    // A pair's two halves get DISTINCT socket keys derived from its id: `in_<pairId>` and
    // `out_<pairId>`. They must differ — the socket anchor name is keyed by nodeId+socketId
    // (with no side), so reusing one key for both halves would make wires snap to the wrong end.
    inputs: {
        [inSocket: `in_${string}`]: DataTypes.Kind;
    };
    outputs: {
        [outSocket: `out_${string}`]: DataTypes.Kind;
    };
    payload: {
        label: string;
        pairs: Pair[];
    };
};

type PatchNode = NodeDefinitions.BuiltNodeOf<"patch", PatchDefinition>;

const freshPair = (): Pair => ({ id: `pair_${nanoid()}` });

// Socket-key <-> pair-id mapping. `base` is the pair id (`pair_...`).
const inKey = (base: string): `in_${string}` => `in_${base}`;
const outKey = (base: string): `out_${string}` => `out_${base}`;
const pairBase = (socketKey: string): string => socketKey.replace(/^(in_|out_)/, "");

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<PatchDefinition>>, id: string = nanoid()): PatchNode => {
    const pairs = input.pairs ?? [freshPair()];
    const inn: { [k: string]: null } = {};
    const out: { [k: string]: string[] } = {};
    for (const p of pairs) {
        inn[inKey(p.id)] = null;
        out[outKey(p.id)] = [];
    }
    return {
        id,
        in: inn,
        out,
        payload: { label: "", pairs },
        type: "patch",
    };
};

// ─── Type inference (per pair — see absNode for the single-pair version) ─────

/** Intersect the accept-rule of every consumer wired to this pair's `out` socket. Null when nothing is downstream. */
const queryDownstreamTypes = (node: PatchNode, outSocket: string, graphId: string, ctx: NodeTypes.MethodContext): SocketTypes.Term | null => {
    const linkIds = (node.out as Record<string, string[]>)[outSocket] ?? [];
    if (linkIds.length === 0) return null;
    let result: SocketTypes.Term | null = null;
    for (const linkId of linkIds) {
        const link = ctx.getLink(graphId, linkId);
        if (!link) continue;
        const neighbor = ctx.getNode(graphId, link.toNode);
        if (!neighbor) continue;
        const st = NodeTypes.getSocketType(neighbor, link.toSocket, "in", graphId, ctx);
        result = result === null ? st : SocketTypes.intersect(result, st);
    }
    return result;
};

// Resolve both halves of every pair from the live graph. Once an upstream drives a pair, both halves
// report that concrete type; otherwise the IN accepts whatever downstream allows (ANY unconstrained)
// and the OUT presents that same constraint (NONE when unconstrained — so it can flow anywhere, yet a
// second, incompatible consumer can't jam the pair). Recomputed on every hook, stashed per-socket.
const resolvePatch = (node: PatchNode, graphId: string, ctx: NodeTypes.MethodContext): { in: Record<string, SocketTypes.Term>; out: Record<string, SocketTypes.Term> } => {
    const inMap: Record<string, SocketTypes.Term> = {};
    const outMap: Record<string, SocketTypes.Term> = {};
    for (const pair of node.payload.pairs) {
        const connectedType = queryUpstreamOutType(node, inKey(pair.id), graphId, ctx);
        const resolvedInTypes = queryDownstreamTypes(node, outKey(pair.id), graphId, ctx) ?? SocketTypes.ANY;
        if (SocketTypes.project(connectedType).length > 0) {
            inMap[inKey(pair.id)] = connectedType;
            outMap[outKey(pair.id)] = connectedType;
        } else {
            inMap[inKey(pair.id)] = resolvedInTypes;
            outMap[outKey(pair.id)] = SocketTypes.equals(resolvedInTypes, SocketTypes.ANY) ? SocketTypes.NONE : resolvedInTypes;
        }
    }
    return { in: inMap, out: outMap };
};

const recompute = (node: PatchNode, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const current = ctx.getNode(graphId, node.id) as PatchNode | undefined;
    if (!current) return;
    commitSocketTypes(current, graphId, ctx, resolvePatch(current, graphId, ctx));
};

const onConnect = (node: PatchNode, _linkId: string, _direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => recompute(node, graphId, ctx);
const onDisconnect = (node: PatchNode, _link: ArcaneGraph.Link, _direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => recompute(node, graphId, ctx);
const onRefreshRequest = (node: PatchNode, _socketId: string, _side: "in" | "out", _reason: NodeTypes.RefreshReason, graphId: string, ctx: NodeTypes.MethodContext): void => recompute(node, graphId, ctx);

const getSocketType = (node: NodeDefinitions.NodeFor<PatchDefinition>, socketId: string, side: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): SocketTypes.Term => {
    const stored = ctx.readSocketType(graphId, node.id, socketId, side);
    if (stored) return stored;
    // Unsolved (fresh pair / post-load, before any hook fired): an undriven, unconstrained pair
    // accepts anything on its `in` and offers nothing on its `out`.
    return side === "in" ? SocketTypes.ANY : SocketTypes.NONE;
};

// ─── Graph plumbing ──────────────────────────────────────────────────────────

const dependsOn = (_node: NodeDefinitions.NodeFor<PatchDefinition>, outSocket: keyof PatchDefinition["outputs"], _deps: AllDeps): (keyof PatchDefinition["inputs"])[] => {
    // Each output is fed only by the input half of the same pair.
    return [inKey(pairBase(outSocket))];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PatchDefinition>, inSocket: keyof PatchDefinition["inputs"], _deps: AllDeps): (keyof PatchDefinition["outputs"])[] => {
    return [outKey(pairBase(inSocket))];
};

const evaluate = (node: NodeDefinitions.NodeFor<PatchDefinition>, socket: keyof PatchDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    // Pure passthrough: the out value is whatever arrived on the in half of the same pair.
    return context.resolve(node.id, inKey(pairBase(socket)));
};

// ─── UI ────────────────────────────────────────────────────────────────────

const PAIR_MIME = "application/x-patch-pair";

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PatchDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const nodeId = node.id;
    const { remove: removeNode } = methods;
    const { cloneNode, alterNode, removeLinks } = Project.useMethods();
    const graphId = useGraphId();
    const [storedPosition, setPosition] = Project.usePositionOf(graphId, nodeId);
    const handleRef = useRef<HTMLDivElement>(null);
    const [, paneControls] = useDragPaneInternal();
    const selectionRef = Session.useSelectionRef();
    const positionsRef = Project.usePositionsRef();
    const positionMethods = Project.usePositionMethods();
    const selectMethods = Session.useSelectionMethods();

    const [isSelected] = Session.useIsSelected(`node_${nodeId}`);

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

    const handleAddPair = useCallback(() => {
        const pair = freshPair();
        alterNode(nodeId, (n) => ({
            ...n,
            in: { ...n.in, [inKey(pair.id)]: null },
            out: { ...n.out, [outKey(pair.id)]: [] },
            payload: {
                ...n.payload,
                pairs: [...(n.payload as PatchDefinition["payload"]).pairs, pair],
            },
        }));
    }, [alterNode, nodeId]);

    const handleRemovePair = useCallback(
        (pairId: string) => {
            const toRemove = [node.in[inKey(pairId)], ...(node.out[outKey(pairId)] ?? [])].filter((l): l is string => Boolean(l));
            if (toRemove.length > 0) {
                removeLinks(...toRemove);
            }
            alterNode(nodeId, (n) => {
                const { [inKey(pairId)]: _i, ...restIn } = n.in;
                const { [outKey(pairId)]: _o, ...restOut } = n.out;
                return {
                    ...n,
                    in: restIn,
                    out: restOut,
                    payload: {
                        ...n.payload,
                        pairs: (n.payload as PatchDefinition["payload"]).pairs.filter((p) => p.id !== pairId),
                    },
                };
            });
        },
        [alterNode, removeLinks, nodeId, node.in, node.out],
    );

    const handleReorderPair = useCallback(
        (pairId: string, toIndex: number) => {
            alterNode(nodeId, (n) => {
                const pairs = [...(n.payload as PatchDefinition["payload"]).pairs];
                const fromIndex = pairs.findIndex((p) => p.id === pairId);
                if (fromIndex === -1 || fromIndex === toIndex) return n;
                const [entry] = pairs.splice(fromIndex, 1);
                pairs.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, entry);
                return { ...n, payload: { ...n.payload, pairs } };
            });
        },
        [alterNode, nodeId],
    );

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

    const handleClone = useCallback(() => {
        cloneNode(nodeId);
        contextControls.close();
    }, [cloneNode, nodeId, contextControls]);

    const handleDeleteAndClose = useCallback(() => {
        removeNode();
        contextControls.close();
    }, [removeNode, contextControls]);

    const style = useMemo(() => {
        return { "--node": `--node_${nodeId}` } as CSSProperties;
    }, [nodeId]);

    return (
        <PatchWrapper position={localPosition} data-moveable={`node_${nodeId}`} onFocus={handleFocus}>
            <div data-part={"body"} style={style} data-node={`--node_${nodeId}`} data-state={isSelected ? "selected" : undefined} data-selectable={`node_${nodeId}`}>
                <PatchTitle>
                    <div data-part={"handle"} ref={handleRef} onContextMenu={handleContextMenu}>
                        <Icon shape={NODE_ICONS.patch} />
                    </div>
                    <ActionButton.Lite onClick={removeNode}>
                        <Icon shape={ICONS.Close} />
                    </ActionButton.Lite>
                </PatchTitle>
                <ActionButton onClick={handleAddPair} flavour={"accent"}>
                    <Icon shape={ICONS.Plus} />
                </ActionButton>
                <PatchBody>
                    {node.payload.pairs.map((pair, idx) => (
                        <PatchPairRow key={pair.id} node={node} pairId={pair.id} index={idx} onRemove={handleRemovePair} onReorder={handleReorderPair} />
                    ))}
                </PatchBody>
                <ContextPopup controls={contextControls}>
                    <ActionButton.Option onClick={handleClone}>Clone</ActionButton.Option>
                    <ActionButton.Option flavour={"danger"} onClick={handleDeleteAndClose}>
                        Delete
                    </ActionButton.Option>
                </ContextPopup>
            </div>
        </PatchWrapper>
    );
};

const PatchPairRow = ({
    node,
    pairId,
    index,
    onRemove,
    onReorder,
}: {
    node: NodeDefinitions.NodeFor<PatchDefinition>;
    pairId: `pair_${string}`;
    index: number;
    onRemove: (pairId: string) => void;
    onReorder: (pairId: string, toIndex: number) => void;
}) => {
    const [dropSide, setDropSide] = useState<"above" | "below" | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    const handleDragStart = useCallback(
        (e: DragEvent) => {
            e.dataTransfer.setDragImage(ref.current as Element, 0, 0);
            e.dataTransfer.setData(PAIR_MIME, pairId);
            e.dataTransfer.effectAllowed = "move";
        },
        [pairId],
    );

    const handleDragOver = useCallback((e: DragEvent) => {
        if (!e.dataTransfer.types.includes(PAIR_MIME)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const rect = ref.current?.getBoundingClientRect();
        if (rect) {
            setDropSide(e.clientY < rect.top + rect.height / 2 ? "above" : "below");
        }
    }, []);

    const handleDragLeave = useCallback(() => setDropSide(null), []);

    const handleDrop = useCallback(
        (e: DragEvent) => {
            const dragged = e.dataTransfer.getData(PAIR_MIME);
            if (dragged) {
                e.preventDefault();
                onReorder(dragged, dropSide === "below" ? index + 1 : index);
            }
            setDropSide(null);
        },
        [onReorder, index, dropSide],
    );

    return (
        <PairRowWrapper ref={ref} data-state={dropSide ? `drop-${dropSide}` : undefined} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onDragEnd={handleDragLeave}>
            <SocketPair node={node} socketInId={inKey(pairId)} socketOutId={outKey(pairId)}>
                <DragGrip draggable onDragStart={handleDragStart}>
                    <Icon shape={ICONS.Caret.Vertical} />
                </DragGrip>
                <ActionButton.Lite onClick={() => onRemove(pairId)} flavour={"danger"}>
                    <Icon shape={ICONS.Close} />
                </ActionButton.Lite>
            </SocketPair>
        </PairRowWrapper>
    );
};

// A patch is a universal reroute: any wire can pass through a pair, and the pair adopts the
// wire's type once connected. So any link may be interjected; splice through the first pair.
const canInterject = (_link: ArcaneGraph.Link, _graphId: string, _ctx: NodeTypes.MethodContext): boolean => true;

const onInterject = (node: PatchNode, link: ArcaneGraph.Link, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const firstPair = node.payload.pairs[0]?.id;
    if (!firstPair) return;

    ctx.removeLinks(graphId, link.id);
    ctx.connect(graphId, link.fromNode, node.id, link.fromSocket, inKey(firstPair));
    ctx.connect(graphId, node.id, link.toNode, outKey(firstPair), link.toSocket);
};

export const PatchNodeType: NodeTypes.Type<"patch", PatchDefinition> = {
    type: "patch",
    displayName: "Patch",
    defaultLabel: "Patch",
    iconNode: <NodeIcon shape={NODE_ICONS.patch} />,
    flavour: "emphasis",
    category: "Meta",
    create,
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    getSocketType,
    onConnect,
    onDisconnect,
    onRefreshRequest,
    canInterject,
    onInterject,
};

// ─── Styled components ───────────────────────────────────────────────────────

const PatchWrapper = styled(DragMove.Item)`
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
        gap: 8px;
        min-width: 90px;
        border: 1px solid #666;
        width: max-content;
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

const PatchTitle = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.125em;
    gap: 0.25em;
    margin: 2px;
    background: #222;
    border: 1px solid #444;

    & > div[data-part="handle"] {
        cursor: move;
        flex: 1 1 0;
        display: flex;
        align-items: center;
        align-self: stretch;
        & > svg {
            color: oklch(from var(--flavour) calc(l + 0.1) c h);
        }
    }
    & > button {
        color: oklch(from var(--flavour) 0.8 calc(c + 0.01) h);
    }
`;

const PatchBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 4px;
`;

const PairRowWrapper = styled.div`
    position: relative;

    &[data-state="drop-above"]::before,
    &[data-state="drop-below"]::after {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        height: 2px;
        background: var(--flavour, #88f);
        pointer-events: none;
        z-index: 1;
    }
    &[data-state="drop-above"]::before {
        top: -1px;
    }
    &[data-state="drop-below"]::after {
        bottom: -1px;
    }
`;

const DragGrip = styled.div`
    cursor: grab;
    opacity: 0.4;
    display: grid;
    place-items: center;

    &:active {
        cursor: grabbing;
    }
    &:hover {
        opacity: 0.8;
    }
`;
