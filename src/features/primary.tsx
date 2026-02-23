import styled from "styled-components";
import { Project } from "../state/project";
import { DragEvent as ReactDragEvent, Ref, RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DragPane, DragPaneControls } from "../components/wrappers/DragPane";
import { DragMove } from "../components/wrappers/DragMove";
import { Session } from "../state/session";
import { useStable } from "../util/hooks/useStable";
import { GraphConnectionProvider } from "./nodeview/socket";
import { GraphNode } from "./nodeview/node";
import { GraphIdContext } from "../state/graphId";
import { GraphLink } from "./nodeview/link";
import { NODE_DRAG_MIME } from "./nodedrawer";
import { NodeTypes } from "../definitions/betterTypes";

export const GraphView = ({ graphId, paneControls }: { graphId: string; paneControls?: DragPaneControls }) => {
    return (
        <GraphIdContext value={graphId}>
            <GraphMain paneControls={paneControls} graphId={graphId} />
        </GraphIdContext>
    );
};

const GraphMain = ({ paneControls, graphId }: { paneControls?: DragPaneControls; graphId: string }) => {
    const nodes = Project.useNodeList();

    const boundsRef = useRef<HTMLDivElement>(null);
    const paneRef = useRef<HTMLDivElement>(null);

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
        document.addEventListener("trh:pagefocus", resetMods);

        return () => {
            document.removeEventListener("keydown", onKey);
            document.removeEventListener("keyup", onKey);
            document.removeEventListener("trh:pagefocus", resetMods);
        };
    }, []);

    const [selectionAction, setSelectionAction] = useState<SelectionAction>("set");

    const { addNodeByType, removeNode } = Project.useMethods();
    const selectionRef = Session.useSelectionRef();
    const nodesRef = Project.useNodesRef();

    useEffect(() => {
        const onDeleteKey = (evt: KeyboardEvent) => {
            if (evt.key !== "Delete") return;
            const active = document.activeElement;
            if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || (active as HTMLElement).isContentEditable)) return;

            const toDelete: string[] = [];
            for (const id of selectionRef.current) {
                if (!id.startsWith("node_")) continue;
                const nodeId = id.substring(5);
                const node = nodesRef.current[graphId]?.[nodeId];
                if (node && node.type !== "result") {
                    toDelete.push(nodeId);
                }
            }
            if (toDelete.length === 0) return;
            evt.preventDefault();
            for (const nodeId of toDelete) {
                removeNode(nodeId);
            }
        };

        document.addEventListener("keydown", onDeleteKey);
        return () => document.removeEventListener("keydown", onDeleteKey);
    }, [removeNode, selectionRef, nodesRef, graphId]);

    const handleDragOver = useCallback((e: ReactDragEvent) => {
        if (!e.dataTransfer.types.includes(NODE_DRAG_MIME)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    }, []);

    const handleDrop = useCallback(
        (e: ReactDragEvent) => {
            const raw = e.dataTransfer.getData(NODE_DRAG_MIME);
            if (!raw) return;
            e.preventDefault();
            const paneEl = paneRef.current;
            if (!paneEl || !paneControls) return;
            const rect = paneEl.getBoundingClientRect();
            const { x: panX, y: panY, z: zoom } = paneControls.get();
            const graphX = (e.clientX - rect.left - rect.width / 2) / zoom - panX;
            const graphY = (e.clientY - rect.top - rect.height / 2) / zoom - panY;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const data = JSON.parse(raw);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (data.kind === "node") {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
                addNodeByType(NodeTypes.get(data.type), {}, { x: graphX, y: graphY });
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            } else if (data.kind === "subgraph") {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                addNodeByType(NodeTypes.get("custom"), { graphId: data.id, label: data.name }, { x: graphX, y: graphY });
            }
        },
        [addNodeByType, paneControls],
    );

    return (
        <>
            <GraphViewPane
                ref={paneRef}
                boundsRef={boundsRef}
                minZoom={0.1}
                maxZoom={2}
                data-state={`select_${selectionAction}`}
                data-graph={graphId}
                controls={paneControls}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <GraphConnectionProvider graphId={graphId}>
                    <NodeWrapper>
                        <DragMove.Provider>
                            {nodes.map((nodeId) => {
                                return <GraphNode key={nodeId} nodeId={nodeId} />;
                            })}
                        </DragMove.Provider>
                    </NodeWrapper>
                    <Links />
                </GraphConnectionProvider>
                <Bounds ref={boundsRef} nodeList={nodes} />
            </GraphViewPane>
            <MarqueeSelection scopeRef={paneRef} selectionAction={selectionAction} />
        </>
    );
};

const GraphViewPane = styled(DragPane)`
    background: #111;
    background-image: url("hexgrid.svg");
    background-blend-mode: overlay;
    border: 3px solid transparent;
    background-position: calc(50% + attr(data-x px) * attr(data-z number)) calc(50% + attr(data-y px) * attr(data-z number));
    background-size: calc(attr(data-z number) * 83.14px) calc(attr(data-z number) * 48px);
    &:not([data-graph="root"]) {
        background-color: #090e13;
        background-image: url("boxgrid.svg");
        background-blend-mode: soft-light;
        background-size: calc(attr(data-z number) * 48px) calc(attr(data-z number) * 48px);
    }
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
    const links = Project.useLinkList();
    return (
        <>
            {links.map((linkId) => {
                return <GraphLink key={linkId} linkId={linkId} />;
            })}
        </>
    );
};

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

        const onPointerMove = (moveEvt: PointerEvent) => {
            const start = startPos.current;
            if (!start) {
                return;
            }
            const rect = rectRef.current;
            if (!rect) {
                setIsActive(true);
                return;
            }

            const paneRect = container.getBoundingClientRect();
            const zoom = rect.currentCSSZoom;

            const x = (Math.min(start.x, moveEvt.clientX) - paneRect.left) / zoom;
            const y = (Math.min(start.y, moveEvt.clientY) - paneRect.top) / zoom;
            const w = Math.abs(moveEvt.clientX - start.x) / zoom;
            const h = Math.abs(moveEvt.clientY - start.y) / zoom;

            rect.style.left = `${x}px`;
            rect.style.top = `${y}px`;
            rect.style.width = `${w}px`;
            rect.style.height = `${h}px`;
        };

        const cleanup = (evt?: PointerEvent) => {
            container.removeEventListener("pointermove", onPointerMove);
            container.removeEventListener("pointerup", onPointerUp);
            if (evt) container.releasePointerCapture(evt.pointerId);

            startPos.current = null;
            setIsActive(false);
        };

        const onPointerUp = (upEvt: PointerEvent) => {
            const start = startPos.current;
            if (!start) {
                cleanup(upEvt);
                return;
            }

            const mx1 = Math.min(start.x, upEvt.clientX);
            const my1 = Math.min(start.y, upEvt.clientY);
            const mx2 = Math.max(start.x, upEvt.clientX);
            const my2 = Math.max(start.y, upEvt.clientY);

            // Too small — treat as a click on empty space
            if (mx2 - mx1 < 4 && my2 - my1 < 4) {
                selectionMethods.clear();
                cleanup(upEvt);
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
            cleanup(upEvt);
        };

        const onPointerDown = (evt: PointerEvent) => {
            if (evt.button !== 0 || evt.handled) return;
            if (evt.target !== evt.currentTarget) {
                return;
            }

            startPos.current = { x: evt.clientX, y: evt.clientY };

            container.setPointerCapture(evt.pointerId);
            container.addEventListener("pointermove", onPointerMove);
            container.addEventListener("pointerup", onPointerUp);
        };

        container.addEventListener("pointerdown", onPointerDown);
        return () => {
            container.removeEventListener("pointerdown", onPointerDown);
            container.removeEventListener("pointermove", onPointerMove);
            container.removeEventListener("pointerup", onPointerUp);
        };
    }, [selectionMethods, marqueeMode, scopeRef]);

    if (!isActive) return null;

    return (
        <svg className={className} ref={rectRef} style={{ left: startPos.current?.x, top: startPos.current?.y, width: 0, height: 0 }} data-part="marquee" data-state={`action_${selectionAction}`}>
            <rect x="0" y="0" width="100%" height="100%" />
        </svg>
    );
})`
    position: absolute;
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
