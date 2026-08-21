import { useMemo, CSSProperties, useRef, useCallback, KeyboardEvent, useState, DragEvent, useContext, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { Project } from "../../state/project";
import { GraphViewConnectionCTX } from "./socket";
import { useResizeObserver } from "../../util/hooks/useResizeObserver";
import { ActionButton } from "../../components/buttons/ActionButton";
import { Icon, ICONS } from "../../components/Icon";
import { NodeTypes } from "../../definitions/nodeTypes";
import { NODE_DRAG_MIME, NODE_TYPE_MIME_PREFIX } from "../nodedrawer";
import { useGraphId } from "../../state/graphId";
import { useDragPaneInternal } from "../../components/wrappers/DragPane";

// Grab-to-reconnect: length (screen px, along the wire) of each socket end's dashed grab handle.
const GRAB_RADIUS = 45;
// How far the pointer must travel (screen px) before an armed grab commits, so a plain click still focuses.
const GRAB_DRAG_THRESHOLD = 4;

const keyframesMarch = keyframes`
to {
    stroke-dashoffset: var(--animMarch);
}
`;

const keyframesThrum = keyframes`

    0%, 100% {
    filter: drop-shadow(0 0 2px #f00) drop-shadow(0 0 4px #f00);
  }
  50% {
    filter: drop-shadow(0 0 6px #f00) drop-shadow(0 0 16px #f00);
  }
`;

export const GraphLink = styled(({ className, linkId }: { linkId: string; className?: string }) => {
    const link = Project.useLink(linkId);
    const { removeLinks, interjectNode } = Project.useMethods();
    const graphId = useGraphId();
    const mc = Project.useMC();
    const linkType = Project.useLinkType(graphId, link);
    const [, paneControls] = useDragPaneInternal();
    const connectionContext = useContext(GraphViewConnectionCTX);

    const style = useMemo(() => {
        if (!link) {
            return {};
        }
        // socket -> accordion fallback -> node-edge fallback. One --socketFB tier covers any nesting
        // depth: nested accordions share the name, anchor() picks the last (innermost mounted) one.
        return {
            "--fromTarget": `anchor(--socket_${link.fromNode}_${link.fromSocket}_out center, anchor(--socketFB_${link.fromNode}_${link.fromSocket}_out center, anchor(--nodeFB_${link.fromNode}_out center, 0px)))`,
            "--toTarget": `anchor(--socket_${link.toNode}_${link.toSocket}_in center, anchor(--socketFB_${link.toNode}_${link.toSocket}_in center, anchor(--nodeFB_${link.toNode}_in center, 0px)))`,
            "--fromNode": `--node_${link.fromNode}`,
            "--toNode": `--node_${link.toNode}`,
        } as CSSProperties;
    }, [link]);

    const ref = useRef<HTMLDivElement>(null);
    const fromMarkerRef = useRef<HTMLDivElement>(null);
    const toMarkerRef = useRef<HTMLDivElement>(null);
    const pathContainer = useRef<SVGPathElement>(null);
    const targetPathRef = useRef<SVGPathElement>(null);
    const leadingPathRef = useRef<SVGPathElement>(null);
    const trailingPathRef = useRef<SVGPathElement>(null);

    const onResize = useCallback(
        (entry: ResizeObserverEntry) => {
            const basis = entry.target.getBoundingClientRect();
            if (fromMarkerRef.current && toMarkerRef.current && pathContainer.current) {
                const fromPoint = fromMarkerRef.current.getBoundingClientRect();
                const toPoint = toMarkerRef.current.getBoundingClientRect();
                const zoom = paneControls.get().z;

                const x1 = (fromPoint.left - basis.left) / zoom;
                const y1 = (fromPoint.top - basis.top) / zoom;
                const x2 = (toPoint.left - basis.left) / zoom;
                const y2 = (toPoint.top - basis.top) / zoom;

                const dx = Math.max(150, Math.abs(x2 - x1) * 0.5);
                pathContainer.current.style.setProperty("--theD", `path("M ${x1},${y1} C ${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}")`);
                pathContainer.current.style.setProperty("--theDR", `path("M ${x2},${y2} C ${x2 - dx},${y2} ${x1 + dx},${y1} ${x1},${y1}")`);
            }
        },
        [paneControls],
    );

    useResizeObserver(ref, onResize);

    const deleteMe = useCallback(() => {
        removeLinks(linkId);
    }, [removeLinks, linkId]);

    // Grab-to-reconnect: each socket end has a short dashed "handle" whose invisible, wider target-* twin
    // (GRAB_RADIUS px long, hit-tested by the browser via pointer-events:stroke on the dash) is the grab
    // region. Pressing a handle and dragging detaches THAT end and starts a pending connection from the
    // OTHER socket, which then follows the cursor. A press without a drag focuses the link (delete button).
    useEffect(() => {
        const fromHandle = leadingPathRef.current; // hugs the FROM socket (--theD)
        const toHandle = trailingPathRef.current; // hugs the TO socket (--theDR)
        if (!fromHandle || !toHandle || !link) {
            return;
        }
        // The grabbed handle detaches its own end; the pending connection anchors at the FAR socket.
        const arm = (anchor: { node: string; socket: string; side: "in" | "out" }) => (evt: globalThis.PointerEvent) => {
            if (evt.button !== 0 || evt.handled) {
                return;
            }
            evt.handled = "active"; // suppress the pane's marquee/pan on this press
            evt.preventDefault();
            const startX = evt.clientX;
            const startY = evt.clientY;
            let grabbed = false;

            const cleanup = () => {
                document.removeEventListener("pointermove", onMove);
                document.removeEventListener("pointerup", onUp);
            };
            const onMove = (e: globalThis.PointerEvent) => {
                if (grabbed || Math.hypot(e.clientX - startX, e.clientY - startY) < GRAB_DRAG_THRESHOLD) {
                    return;
                }
                grabbed = true;
                cleanup();
                // Remove first so cycle-detection recomputes without the stale link (the store is synchronous).
                removeLinks(linkId);
                connectionContext.start(anchor.node, anchor.socket, anchor.side);
            };
            const onUp = () => {
                cleanup();
                if (!grabbed) {
                    ref.current?.focus(); // press-without-drag still exposes the delete button
                }
            };
            document.addEventListener("pointermove", onMove);
            document.addEventListener("pointerup", onUp);
        };

        const onFromDown = arm({ node: link.toNode, socket: link.toSocket, side: "in" });
        const onToDown = arm({ node: link.fromNode, socket: link.fromSocket, side: "out" });
        fromHandle.addEventListener("pointerdown", onFromDown);
        toHandle.addEventListener("pointerdown", onToDown);
        return () => {
            fromHandle.removeEventListener("pointerdown", onFromDown);
            toHandle.removeEventListener("pointerdown", onToDown);
        };
    }, [link, linkId, removeLinks, connectionContext]);

    // Mid-wire press (past both grab handles) selects the link so its delete button shows.
    useEffect(() => {
        const target = targetPathRef.current;
        if (!target || !link) {
            return;
        }
        const onPointerDown = (evt: globalThis.PointerEvent) => {
            if (evt.button !== 0 || evt.handled) {
                return;
            }
            evt.handled = "active";
            ref.current?.focus();
        };
        target.addEventListener("pointerdown", onPointerDown);
        return () => target.removeEventListener("pointerdown", onPointerDown);
    }, [link]);

    const handleKeyDown = useCallback(
        (evt: KeyboardEvent<unknown>) => {
            if (evt.nativeEvent.handled) {
                return;
            }
            if (evt.key === "Delete" || evt.key === "Backspace") {
                evt.nativeEvent.handled = "active";
                deleteMe();
            }
        },
        [deleteMe],
    );

    const [isDropping, setIsDropping] = useState(false);

    const handleDragEnter = useCallback(
        (e: DragEvent) => {
            if (!e.dataTransfer.types.includes(NODE_DRAG_MIME)) return;
            if (!link) return;
            const typeKey = e.dataTransfer.types.find((t) => t.startsWith(NODE_TYPE_MIME_PREFIX));
            if (!typeKey) return;
            const rawKey = typeKey.slice((NODE_TYPE_MIME_PREFIX as string).length);
            const nodeTypeKey = NodeTypes.list().find((nt) => nt.type.toLowerCase() === rawKey)?.type;
            if (!nodeTypeKey) return;
            const nodeType = NodeTypes.get(nodeTypeKey);
            if (!nodeType.canInterject?.(link, graphId, mc)) return;
            setIsDropping(true);
        },
        [link, graphId, mc],
    );

    const handleDragLeave = useCallback(() => {
        setIsDropping(false);
    }, []);

    const handleDrop = useCallback(
        (e: DragEvent) => {
            setIsDropping(false);
            const raw = e.dataTransfer.getData(NODE_DRAG_MIME);
            if (!raw) return;

            const paneEl = ref.current?.closest<HTMLElement>("[data-graph]");
            let position: { x: number; y: number } | undefined;
            if (paneEl) {
                const rect = paneEl.getBoundingClientRect();
                const { x: panX, y: panY, z: zoom } = paneControls.get();
                position = {
                    x: (e.clientX - rect.left - rect.width / 2) / zoom - panX,
                    y: (e.clientY - rect.top - rect.height / 2) / zoom - panY,
                };
            }

            let did = false;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const data = JSON.parse(raw);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (data.kind === "node") {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
                did = interjectNode(linkId, NodeTypes.get(data.type), {}, position);
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            } else if (data.kind === "subgraph") {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                did = interjectNode(linkId, NodeTypes.get("custom"), { graphId: data.id, label: data.name }, position);
            }

            if (did) {
                e.preventDefault();
                e.nativeEvent.handled = "active";
            }
        },
        [interjectNode, linkId, paneControls],
    );

    if (!link) {
        return null;
    }

    return (
        <>
            <div
                className={className}
                style={style}
                ref={ref}
                tabIndex={-1}
                data-linktype={linkType}
                onKeyDown={handleKeyDown}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                data-state={isDropping ? "dropping" : undefined}
            >
                <svg preserveAspectRatio="none">
                    <g ref={pathContainer}>
                        <path data-part={"target-wire"} d="" ref={targetPathRef} />
                        <path data-part={"target-leading"} d="" ref={leadingPathRef} />
                        <path data-part={"target-trailing"} d="" ref={trailingPathRef} />
                        <path data-part={"display-wire"} d="" />
                        <path data-part={"display-leading"} d="" />
                        <path data-part={"display-trailing"} d="" />
                        <path data-part={"effect"} d="" />
                    </g>
                </svg>
                <div data-part={"markerFrom"} ref={fromMarkerRef} />
                <div data-part={"markerTo"} ref={toMarkerRef} />
                <ActionButton onClick={deleteMe} data-part="deleteButton" flavour={"inherit"}>
                    <Icon shape={ICONS.Close} />
                </ActionButton>
            </div>
        </>
    );
})`
    position: absolute;
    width: fit-contents;
    height: fit-contents;
    z-index: -1;

    & > [data-part="markerFrom"],
    & > [data-part="markerTo"] {
        position: fixed;
        width: 1px;
        height: 1px;
        pointer-events: none;
    }

    & > [data-part="markerFrom"] {
        top: var(--fromTarget);
        left: var(--fromTarget);
    }

    & > [data-part="markerTo"] {
        top: var(--toTarget);
        left: var(--toTarget);
    }

    inset: calc(min(var(--fromTarget), var(--toTarget))) calc(min(var(--toTarget), var(--fromTarget))) calc(min(var(--toTarget), var(--fromTarget))) calc(min(var(--fromTarget), var(--toTarget)));

    min-width: 1px;
    min-height: 1px;
    pointer-events: none;

    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
    place-items: center;

    & > [data-part="deleteButton"] {
        z-index: 1;
        pointer-events: auto;
        font-size: 1.25em;
        border-radius: 100%;
    }

    &:not(:focus-within) > [data-part="deleteButton"] {
        display: none;
    }

    overflow: visible;
    --width: 3px;
    & > svg {
        z-index: 0;
        position: absolute;
        width: 100%;
        height: 100%;
        overflow: visible;
        pointer-events: none;
        & > g > path {
            d: var(--theD);
            vector-effect: non-scaling-stroke;
            fill: none;
            stroke: none;
            pointer-events: none;

            /* trailing halves run end -> start so their dash hugs the TO socket */
            &[data-part$="-trailing"] {
                d: var(--theDR);
            }

            /* display-* are the visible strokes; target-* are their invisible, wider, grabbable twins */
            &[data-part^="display-"] {
                stroke: oklch(from var(--flavour) calc(l + 0.2) c h);
            }
            &[data-part^="target-"] {
                stroke: transparent;
                pointer-events: stroke;
            }

            &[data-part="display-wire"] {
                stroke-width: var(--width);
            }
            &[data-part="target-wire"] {
                stroke-width: calc(var(--width) + 6px);
                cursor: pointer;
            }

            /* end handles: a single GRAB_RADIUS-long dash hugging each socket */
            &[data-part$="-leading"],
            &[data-part$="-trailing"] {
                stroke-dasharray: ${GRAB_RADIUS}px calc(infinity * 1px);
                stroke-linecap: round;
                cursor: col-resize;
            }
            &[data-part="display-leading"],
            &[data-part="display-trailing"] {
                stroke-width: calc((var(--width) + 3px));
            }
            &[data-part="target-leading"],
            &[data-part="target-trailing"] {
                stroke-width: calc((var(--width) + 9px));
            }

            &[data-part="effect"] {
                stroke-width: calc(var(--width) - 4px);
            }
        }
    }

    &[data-linktype*=" array<"] {
        --width: 6px;
    }

    &[data-linktype*=" loopFor<"] {
        --width: 8px;
    }

    &[data-linktype*=" loopFor<"] > svg > g > path[data-part="effect"] {
        --animMarch: 12px;
        animation: ${keyframesMarch} 0.2s linear infinite reverse;
        stroke: black;
        stroke-linecap: round;
        stroke-dasharray: 4px 8px;
        stroke-dashoffset: 0px;
    }

    &[data-state~="dropping"] > svg > g > path[data-part^="display-"],
    &:focus-within > svg > g > path[data-part^="display-"] {
        stroke: #fff;
    }

    --flavour: var(--flavour-base);

    &[data-linktype~="float"],
    &[data-linktype~="integer"],
    &[data-linktype~="string"],
    &[data-linktype~="length"],
    &[data-linktype~="color"],
    &[data-linktype~="enum"],
    &[data-linktype~="angle"],
    &[data-linktype~="boolean"],
    &[data-linktype~="point"],
    &[data-linktype~="gradient"],
    &[data-linktype~="tokens:length"] {
        --flavour: var(--flavour-accent);
    }
    &[data-linktype~="path"],
    &[data-linktype~="pathOp"] {
        --flavour: var(--flavour-emphasis);
    }
    &[data-linktype~="stop:float"],
    &[data-linktype~="stop:color"],
    &[data-linktype~="stop:angle"],
    &[data-linktype~="stop:integer"],
    &[data-linktype~="stop:length"] {
        --flavour: var(--flavour-info);
    }
    &[data-linktype~="sequence"] {
        --flavour: var(--flavour-danger);
    }
    &[data-linktype~="distribution"] {
        --flavour: var(--flavour-help);
    }
    &[data-linktype~="shape"],
    &[data-linktype~="layer"] {
        --flavour: var(--flavour-confirm);
    }

    &[data-linktype~="invalid"] {
        --flavour: #c00;
    }
    &[data-linktype~="invalid"] > svg > g > path {
        &[data-part="display-wire"] {
            stroke: #f00;
            animation: ${keyframesThrum} 1.6s ease-in-out infinite;
        }
        &[data-part="effect"] {
            stroke: #fcc;
        }
    }
`;
