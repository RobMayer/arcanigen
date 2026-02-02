import styled from "styled-components";
import { MainGraph } from "../state/maingraph";
import { createContext, CSSProperties, Ref, RefObject, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useResizeObserver } from "../util/hooks/useResizeObserver";
import { DragPane } from "../components/wrappers/DragPane";
import { DragMove } from "../components/wrappers/DragMove";
import { Session } from "../state/session";
import { useStable } from "../util/hooks/useStable";
import { Graph } from "../util/structs/graph";

type GraphConnectionControls = {
    start: (nodeId: string) => void;
    finish: (nodeId: string) => void;
    clear: () => void;
};

const GraphViewConnectionCTX = createContext<GraphConnectionControls>({ start: () => {}, finish: () => {}, clear: () => {} });

export const GraphView = () => {
    const nodes = MainGraph.useNodeList();

    const boundsRef = useRef<HTMLDivElement>(null);
    const paneRef = useRef<HTMLDivElement>(null);

    const [pendingConnection, setPendingConnection] = MainGraph.usePendingConnection();

    const graphMethods = MainGraph.useMethods();

    const connectionContextValue = useMemo(() => {
        let pending: null | string;
        return {
            start: (nodeId: string) => {
                console.log("graph is starting a connection");
                setPendingConnection(nodeId);
                pending = nodeId;
            },
            finish: (nodeId: string) => {
                if (pending !== null) {
                    console.log("graph should finish connection");
                    graphMethods.connect(pending, nodeId);
                }
                // validate and build connection here
            },
            clear: () => {
                setPendingConnection(null);
                pending = null;
            },
        };
    }, [setPendingConnection, graphMethods]);

    const modKeys = useRef<{ ctrl: boolean; alt: boolean; shift: boolean }>({ ctrl: false, alt: false, shift: false });

    useEffect(() => {
        const onKey = (evt: KeyboardEvent) => {
            if (evt.type === "keydown" && (evt.key === "Alt" || evt.key === "Control" || evt.key === "Shift")) {
                evt.preventDefault();
            }
            modKeys.current = { ctrl: evt.ctrlKey || evt.metaKey, alt: evt.altKey, shift: evt.shiftKey };
            setSelectionAction(modKeysToAction(modKeys.current));
        };

        const resetMods = () => {
            modKeys.current = { ctrl: false, alt: false, shift: false };
            setSelectionAction(modKeysToAction(modKeys.current));
        };

        document.addEventListener("keydown", onKey);
        document.addEventListener("keyup", onKey);
        document.addEventListener("mouseup", connectionContextValue.clear);
        document.addEventListener("trh:pagefocus", resetMods);

        return () => {
            document.removeEventListener("keydown", onKey);
            document.removeEventListener("keyup", onKey);
            document.removeEventListener("mouseup", connectionContextValue.clear);
            document.removeEventListener("trh:pagefocus", resetMods);
        };
    }, [connectionContextValue]);

    const [selectionAction, setSelectionAction] = useState<SelectionAction>("set");

    return (
        <GraphViewPane ref={paneRef} boundsRef={boundsRef} minZoom={0.1} maxZoom={2} data-state={`select_${selectionAction}`}>
            <GraphViewConnectionCTX value={connectionContextValue}>
                <MarqueeSelection scopeRef={paneRef} selectionAction={selectionAction} />
                <NodeWrapper>
                    <DragMove.Provider>
                        {nodes.map((nodeId) => {
                            return <GraphNode key={nodeId} nodeId={nodeId} />;
                        })}
                    </DragMove.Provider>
                </NodeWrapper>
                <Links />
                {pendingConnection ? <PendingConnection value={pendingConnection} /> : null}
                <Bounds ref={boundsRef} nodeList={nodes} />
            </GraphViewConnectionCTX>
        </GraphViewPane>
    );
};

const GraphViewPane = styled(DragPane)`
    background: #111;
    background-image: url("hexgrid.svg");
    background-blend-mode: overlay;
    border: 3px solid transparent;
    background-position: calc(50% + attr(data-x px) * attr(data-z number)) calc(50% + attr(data-y px) * attr(data-z number));
    background-size: calc(attr(data-z number) * 83.14px) calc(attr(data-z number) * 48px);
    &[data-state~="breach_top"] {
        border-top-color: red;
    }
    &[data-state~="breach_bottom"] {
        border-bottom-color: red;
    }
    &[data-state~="breach_left"] {
        border-left-color: red;
    }
    &[data-state~="breach_right"] {
        border-right-color: red;
    }
    &[data-state~="panning"] {
        cursor:
            url("/viewportPan.svg") 16 16,
            crosshair;
    }

    &[data-state~="select_add"] {
        cursor:
            url("/viewportCursorAdd.svg") 16 16,
            crosshair;
    }
    &[data-state~="select_coerce"] {
        cursor:
            url("/viewportCursorCoerce.svg") 16 16,
            crosshair;
    }
    &[data-state~="select_intersect"] {
        cursor:
            url("/viewportCursorIntersect.svg") 16 16,
            crosshair;
    }
    &[data-state~="select_toggle"] {
        cursor:
            url("/viewportCursorExclude.svg") 16 16,
            crosshair;
    }
    &[data-state~="select_remove"] {
        cursor:
            url("/viewportCursorSubtract.svg") 16 16,
            crosshair;
    }

    cursor:
        url("/viewportCursor.svg") 16 16,
        crosshair;

    & > * {
        cursor: auto;
    }
`;

const Links = () => {
    const links = MainGraph.useLinkList();
    return (
        <>
            {links.map((linkId) => {
                return <GraphLink key={linkId} linkId={linkId} />;
            })}
        </>
    );
};

const PendingConnection = styled(({ value, className }: { value: string; className?: string }) => {
    const style = useMemo(
        () =>
            ({
                "--fromNode": `--node_${value}`,
            }) as CSSProperties,
        [value],
    );

    const ref = useRef<HTMLDivElement>(null);
    const fromMarkerRef = useRef<HTMLDivElement>(null);
    const pathRef = useRef<SVGPathElement>(null);

    const updatePath = useCallback(() => {
        const container = ref.current;
        const fromMarker = fromMarkerRef.current;
        const path = pathRef.current;
        const mouse = mousePos.current;
        if (!container || !fromMarker || !path || !mouse) return;

        const basis = container.getBoundingClientRect();
        const fromPoint = fromMarker.getBoundingClientRect();
        const zoom = container.currentCSSZoom;

        const x1 = (fromPoint.left - basis.left) / zoom;
        const y1 = (fromPoint.top - basis.top) / zoom;
        const x2 = (mouse.x - basis.left) / zoom;
        const y2 = (mouse.y - basis.top) / zoom;

        path.setAttribute("d", `M ${x1},${y1} L ${x2},${y2}`);
    }, []);

    const mousePos = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        const onMouseMove = (evt: MouseEvent) => {
            mousePos.current = { x: evt.clientX, y: evt.clientY };
            updatePath();
        };

        document.addEventListener("mousemove", onMouseMove);
        return () => {
            document.removeEventListener("mousemove", onMouseMove);
        };
    }, [updatePath]);

    useResizeObserver(ref, updatePath);

    return (
        <div className={className} style={style} ref={ref}>
            <svg preserveAspectRatio="none">
                <path ref={pathRef} />
            </svg>
            <div className="markerFrom" ref={fromMarkerRef} />
        </div>
    );
})`
    position: fixed;
    width: auto;
    height: auto;
    z-index: -1;
    pointer-events: none;

    --anchorFrom: anchor(var(--fromNode) center);

    inset: 0;

    min-width: 1px;
    min-height: 1px;

    & > .markerFrom {
        position: fixed;
        width: 1px;
        height: 1px;
        top: var(--anchorFrom);
        left: var(--anchorFrom);
    }

    overflow: visible;
    & > svg {
        position: absolute;
        width: 100%;
        height: 100%;
        overflow: visible;
        pointer-events: none;
        & > path {
            vector-effect: non-scaling-stroke;
            fill: none;
            stroke: #fff;
            stroke-width: 1.5px;
            stroke-dasharray: 6 4;
            pointer-events: none;
        }
    }
`;

const rectsOverlap = (a: DOMRect, b: DOMRect) => {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
};

const rectContains = (outer: DOMRect, inner: DOMRect) => {
    return inner.left >= outer.left && inner.right <= outer.right && inner.top >= outer.top && inner.bottom <= outer.bottom;
};

type SelectionAction = "set" | "add" | "remove" | "intersect" | "toggle" | "coerce";

const modKeysToAction = (mods: { ctrl: boolean; alt: boolean; shift: boolean }): SelectionAction => {
    if (mods.ctrl && mods.shift) return "intersect";
    if (mods.alt && mods.shift) return "toggle";
    if (mods.alt) return "remove";
    if (mods.shift) return "add";
    if (mods.ctrl) return "coerce";
    return "set";
};

const MarqueeSelection = styled(({ className, scopeRef, selectionAction }: { className?: string; scopeRef: RefObject<HTMLElement | null>; selectionAction: SelectionAction }) => {
    const rectRef = useRef<SVGSVGElement>(null);
    const startPos = useRef<{ x: number; y: number } | null>(null);

    const selectionMethods = Session.useSelectionMethods();
    const [marqueeMode] = Session.useMarqueeMode();
    const [isActive, setIsActive] = useState(false);

    const selectionActionRef = useStable(selectionAction);

    useEffect(() => {
        const container = scopeRef.current;
        if (!container) return;

        const onMouseMove = (moveEvt: MouseEvent) => {
            const start = startPos.current;
            if (!start) {
                return;
            }
            const rect = rectRef.current;
            if (!rect) {
                setIsActive(true);
                return;
            }

            const zoom = rect.currentCSSZoom;
            const x = Math.min(start.x, moveEvt.clientX) / zoom;
            const y = Math.min(start.y, moveEvt.clientY) / zoom;
            const w = Math.abs(moveEvt.clientX - start.x) / zoom;
            const h = Math.abs(moveEvt.clientY - start.y) / zoom;

            rect.style.left = `${x}px`;
            rect.style.top = `${y}px`;
            rect.style.width = `${w}px`;
            rect.style.height = `${h}px`;
        };

        const cleanup = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);

            startPos.current = null;
            setIsActive(false);
        };

        const onMouseUp = (upEvt: MouseEvent) => {
            const start = startPos.current;
            if (!start) {
                cleanup();
                return;
            }

            const mx1 = Math.min(start.x, upEvt.clientX);
            const my1 = Math.min(start.y, upEvt.clientY);
            const mx2 = Math.max(start.x, upEvt.clientX);
            const my2 = Math.max(start.y, upEvt.clientY);

            // Too small — treat as a click on empty space
            if (mx2 - mx1 < 4 && my2 - my1 < 4) {
                selectionMethods.clear();
                cleanup();
                return;
            }

            const marqueeRect = new DOMRect(mx1, my1, mx2 - mx1, my2 - my1);
            const scope = scopeRef.current;
            const matched: string[] = [];

            if (scope) {
                const selectables = scope.querySelectorAll<HTMLElement>("[data-selectable]");
                const test = marqueeMode === "contain" ? rectContains : rectsOverlap;
                for (const el of selectables) {
                    const elRect = el.getBoundingClientRect();
                    if (test(marqueeRect, elRect)) {
                        const id = el.getAttribute("data-selectable");
                        if (id) matched.push(id);
                    }
                }
            }

            selectionMethods[selectionActionRef.current](matched);
            cleanup();
        };

        const onMouseDown = (evt: MouseEvent) => {
            if (evt.button !== 0 || evt.handled) return;
            evt.handled = "active";

            startPos.current = { x: evt.clientX, y: evt.clientY };

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        };

        container.addEventListener("mousedown", onMouseDown);
        return () => {
            container.removeEventListener("mousedown", onMouseDown);
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };
    }, [selectionMethods, marqueeMode, scopeRef]);

    if (!isActive) return null;

    return (
        <svg className={className} ref={rectRef} style={{ left: startPos.current?.x, top: startPos.current?.y, width: 0, height: 0 }} data-part="marquee" data-state={`action_${selectionAction}`}>
            <rect x="0" y="0" width="100%" height="100%" />
        </svg>
    );
})`
    position: fixed;
    pointer-events: none;
    z-index: 1;
    overflow: visible;
    zoom: calc(1 / var(--dragpane_zoom, 1));
    outline: 1px solid #000;
    outline-offset: 1px;

    @keyframes march {
        to {
            stroke-dashoffset: -7;
        }
    }

    & > rect {
        fill: #d8d8d811;
        stroke: #d8d8d8cc;
        stroke-width: 1.5;
        vector-effect: non-scaling-stroke;
        stroke-dasharray: 4 3;
        animation: march 0.3s linear infinite;
    }

    &[data-state="action_remove"] > rect {
        stroke: #e38c86aa;
        fill: #e38c8611;
    }
    &[data-state="action_add"] > rect {
        stroke: #86ddb0aa;
        fill: #86ddb011;
    }
    &[data-state="action_intersect"] > rect {
        stroke: #f3d39aaa;
        fill: #f3d39a11;
    }
    &[data-state="action_toggle"] > rect {
        stroke: #c9a0e6aa;
        fill: #c9a0e611;
    }
    &[data-state="action_coerce"] > rect {
        stroke: #86b8ddaa;
        fill: #86b8dd11;
    }
`;

const NodeWrapper = styled.div`
    inset: 0;
    overflow: visible;
    position: absolute;
    isolation: isolate;
`;

const Bounds = styled(({ className, nodeList, ref }: { className?: string; nodeList: string[]; ref?: Ref<HTMLDivElement> }) => {
    const style = useMemo(() => {
        const { t, b, r, l } = nodeList.reduce<{ t: string[]; b: string[]; r: string[]; l: string[] }>(
            (acc, id) => {
                acc.t.push(`anchor(--node_${id} top)`);
                acc.b.push(`anchor(--node_${id} bottom)`);
                acc.l.push(`anchor(--node_${id} left)`);
                acc.r.push(`anchor(--node_${id} right)`);
                return acc;
            },
            { t: [], l: [], b: [], r: [] },
        );
        return {
            top: `calc(min(${t.join(", ")}) - 16px)`,
            left: `calc(min(${l.join(", ")}) - 16px)`,
            bottom: `calc(min(${b.join(", ")}) - 16px)`,
            right: `calc(min(${r.join(", ")}) - 16px)`,
        };
    }, [nodeList]);

    return <div className={className} style={style} ref={ref} />;
})`
    position: absolute;
    pointer-events: none;
    background: #2224;
    z-index: -2;
    border: 1px solid #222;
    outline: 1px solid transparent;
`;

//nested SVG for new coordinate system

const applyMoveDelta = (
    delta: { x: number; y: number },
    selectionRef: { current: Set<string> },
    positionsRef: { current: { [key: string]: { x: number; y: number } } },
    nodesRef: { current: { [key: string]: Graph.Node<{ label: string } & ({ type: "test" } | { type: "container"; w: number; h: number })> } },
) => {
    const compiled: { [key: string]: { x: number; y: number } } = {};

    // start with selected nodes
    for (const id of selectionRef.current) {
        if (id.startsWith("node_")) {
            const nId = id.substring(5);
            if (positionsRef.current[nId]) {
                compiled[nId] = { x: positionsRef.current[nId].x + delta.x, y: positionsRef.current[nId].y + delta.y };
            }
        }
    }

    // expand: for any container in the move set, add nodes within its bounds
    for (const nId of Object.keys(compiled)) {
        const node = nodesRef.current[nId];
        if (node?.payload.type === "container") {
            const containerPos = positionsRef.current[nId];
            const { w, h } = node.payload;
            const cx = containerPos.x;
            const cy = containerPos.y;

            for (const [candidateId, candidatePos] of Object.entries(positionsRef.current)) {
                if (candidateId === nId || compiled[candidateId]) continue;
                if (candidatePos.x >= cx && candidatePos.x <= cx + w && candidatePos.y >= cy && candidatePos.y <= cy + h) {
                    compiled[candidateId] = { x: candidatePos.x + delta.x, y: candidatePos.y + delta.y };
                }
            }
        }
    }

    // apply DOM updates for visual feedback
    for (const [nId, toSet] of Object.entries(compiled)) {
        const element = document.querySelector(`div[data-selectable="node_${nId}"]`);
        element?.setAttribute("data-x", `${toSet.x}`);
        element?.setAttribute("data-y", `${toSet.y}`);
    }

    return compiled;
};

const GraphNode = styled(({ className, nodeId }: { nodeId: string; className?: string }) => {
    const [storedPosition, setPosition] = MainGraph.usePositionOf(nodeId);
    const node = MainGraph.useNode(nodeId);
    const handleRef = useRef<HTMLDivElement>(null);

    const selectionRef = Session.useSelectionRef();
    const positionsRef = MainGraph.usePositionsRef();
    const nodesRef = MainGraph.useNodesRef();
    const positionMethods = MainGraph.usePositionMethods();

    const [isSelected] = Session.useIsSelected(`node_${nodeId}`);

    const handleDragDelta = useCallback(
        (delta: { x: number; y: number }) => {
            if (!selectionRef.current.has(`node_${nodeId}`)) {
                return;
            }
            const compiled = applyMoveDelta(delta, selectionRef, positionsRef, nodesRef);
            positionMethods.setMany.passive(compiled);
        },
        [selectionRef, nodeId, positionMethods.setMany, positionsRef, nodesRef],
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

    const socketRef = useRef<HTMLDivElement>(null);
    const connectionContext = useContext(GraphViewConnectionCTX);

    useEffect(() => {
        const socket = socketRef.current;
        if (socket) {
            const connectStart = (evt: globalThis.MouseEvent) => {
                evt.handled = "active";
                console.log("starting connection");
                connectionContext.start(nodeId);
            };
            const finishConnection = () => {
                console.log("requesting the finishing of a connection");
                connectionContext.finish(nodeId);
            };

            socket.addEventListener("mousedown", connectStart);
            socket.addEventListener("mouseup", finishConnection);
            return () => {
                socket.removeEventListener("mousedown", connectStart);
                socket.removeEventListener("mouseup", finishConnection);
            };
        }
    }, [nodeId, connectionContext]);

    return (
        <DragMove.Item position={localPosition} className={className} title={nodeId} data-node={`--node_${nodeId}`} data-selectable={`node_${nodeId}`} data-state={isSelected ? "selected" : undefined}>
            <div data-part="handle" ref={handleRef}>
                Node {node.payload.label}
            </div>
            <div data-part="socket" ref={socketRef}>
                Connection
            </div>
            {node.payload.type === "container" ? <div style={{ border: "1px solid red", width: `${node.payload.w}px`, height: `${node.payload.h}px` }}>Container!</div> : null}
        </DragMove.Item>
    );
})`
    display: grid;
    background: #333;
    border: 1px solid #666;
    width: max-content;
    outline: 1px solid transparent;
    transform: translate(-50%, -50%);
    anchor-name: attr(data-node type(<custom-ident>));

    &[data-state~="selected"] {
        border-color: white;
    }
`;

const GraphLink = styled(({ className, linkId }: { linkId: string; className?: string }) => {
    const link = MainGraph.useLink(linkId);

    const style = useMemo(() => {
        return {
            "--fromNode": `--node_${link.from}`,
            "--toNode": `--node_${link.to}`,
        } as CSSProperties;
    }, [link.from, link.to]);

    const ref = useRef<HTMLDivElement>(null);
    const fromMarkerRef = useRef<HTMLDivElement>(null);
    const toMarkerRef = useRef<HTMLDivElement>(null);
    const pathRef = useRef<SVGPathElement>(null);
    const selRef = useRef<SVGPathElement>(null);

    useResizeObserver(ref, (entry) => {
        const basis = entry.target.getBoundingClientRect();
        if (fromMarkerRef.current && toMarkerRef.current && pathRef.current && selRef.current) {
            const fromPoint = fromMarkerRef.current.getBoundingClientRect();
            const toPoint = toMarkerRef.current.getBoundingClientRect();
            const zoom = entry.target.currentCSSZoom;

            const x1 = (fromPoint.left - basis.left) / zoom;
            const y1 = (fromPoint.top - basis.top) / zoom;
            const x2 = (toPoint.left - basis.left) / zoom;
            const y2 = (toPoint.top - basis.top) / zoom;

            const dx = Math.max(200, Math.abs(x2 - x1) * 0.5);
            pathRef.current.setAttribute("d", `M ${x1},${y1} C ${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`);
            selRef.current.setAttribute("d", `M ${x1},${y1} C ${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`);
        }
    });

    const [isSelected, setIsSelected] = useState<boolean>(false);

    const handleFocus = useCallback(() => {
        setIsSelected(true);
    }, []);

    const handleBlur = useCallback(() => {
        setIsSelected(false);
    }, []);

    return (
        <>
            <div className={className} style={style} ref={ref} tabIndex={-1} onFocus={handleFocus} onBlur={handleBlur} data-state={isSelected ? "selected" : undefined}>
                <svg preserveAspectRatio="none">
                    <path data-part={"display"} ref={pathRef} />
                    <path data-part={"selector"} ref={selRef} />
                </svg>
                <div data-part={"markerFrom"} ref={fromMarkerRef} />
                <div data-part={"markerTo"} ref={toMarkerRef} />
            </div>
        </>
    );
})`
    position: fixed;
    width: auto;
    height: auto;
    z-index: -1;

    --anchorT: anchor(var(--fromNode) center);
    --anchorR: anchor(var(--toNode) center);
    --anchorB: anchor(var(--toNode) center);
    --anchorL: anchor(var(--fromNode) center);

    & > [data-part="markerFrom"],
    & > [data-part="markerTo"] {
        position: fixed;
        width: 1px;
        height: 1px;
        background: red;
    }

    & > [data-part="markerFrom"] {
        top: anchor(var(--fromNode) center);
        left: anchor(var(--fromNode) center);
    }

    & > [data-part="markerTo"] {
        top: anchor(var(--toNode) center);
        left: anchor(var(--toNode) center);
    }

    inset: min(var(--anchorT), var(--anchorB)) min(var(--anchorR), var(--anchorL)) min(var(--anchorB), var(--anchorT)) min(var(--anchorL), var(--anchorR));

    min-width: 1px;
    min-height: 1px;
    pointer-events: none;

    overflow: visible;
    & > svg {
        position: absolute;
        width: 100%;
        height: 100%;
        overflow: visible;
        pointer-events: none;
        & > path[data-part="display"] {
            vector-effect: non-scaling-stroke;
            fill: none;
            stroke: #fc3;
            stroke-width: 1.5px;
            pointer-events: none;
        }
        & > path[data-part="selector"] {
            vector-effect: non-scaling-stroke;
            fill: none;
            stroke: transparent;
            stroke-width: 8px;
            pointer-events: stroke;
            cursor: pointer;
        }
    }

    &[data-state~="selected"] > svg > path[data-part="display"] {
        stroke: #fff;
        stroke-width: 3px;
    }
`;
