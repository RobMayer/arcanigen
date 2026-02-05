import styled, { keyframes } from "styled-components";
import { Project } from "../state/project";
import { CSSProperties, Ref, RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useResizeObserver } from "../util/hooks/useResizeObserver";
import { DragPane, DragPaneControls } from "../components/wrappers/DragPane";
import { DragMove } from "../components/wrappers/DragMove";
import { Session } from "../state/session";
import { useStable } from "../util/hooks/useStable";
import { GraphConnectionProvider } from "./nodeview/socket";
import { GraphNode } from "./nodeview/node";
import { DATATYPE_FLAVOURS } from "../util/misc";
import { GraphIdContext } from "../state/graphId";

export const GraphView = ({ graphId, paneControls }: { graphId: string; paneControls?: DragPaneControls }) => {
    return (
        <GraphIdContext value={graphId}>
            <GraphMain paneControls={paneControls} />
        </GraphIdContext>
    );
};

const GraphMain = ({ paneControls }: { paneControls?: DragPaneControls }) => {
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

    return (
        <GraphViewPane ref={paneRef} boundsRef={boundsRef} minZoom={0.1} maxZoom={2} data-state={`select_${selectionAction}`} controls={paneControls}>
            <GraphConnectionProvider>
                <MarqueeSelection scopeRef={paneRef} selectionAction={selectionAction} />
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
            if (evt.target !== evt.currentTarget) {
                return;
            }

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

const keyframesMarch = keyframes`
to {
    stroke-dashoffset: var(--animMarch);
}
`;

const GraphLink = styled(({ className, linkId }: { linkId: string; className?: string }) => {
    const link = Project.useLink(linkId);

    const style = useMemo(() => {
        return {
            "--fromTarget": `anchor(--socket_${link.fromNode}_${link.fromSocket} center, anchor(--socketFB_${link.fromNode}_${link.fromSocket} center, anchor(--nodeFB_${link.fromNode}_out center, 0)))`,
            "--toTarget": `anchor(--socket_${link.toNode}_${link.toSocket} center, anchor(--socketFB_${link.toNode}_${link.toSocket} center, anchor(--nodeFB_${link.toNode}_in center, 0)))`,
            "--fromNode": `--node_${link.fromNode}`,
            "--toNode": `--node_${link.toNode}`,
        } as CSSProperties;
    }, [link.fromNode, link.toNode, link.fromSocket, link.toSocket]);

    const ref = useRef<HTMLDivElement>(null);
    const fromMarkerRef = useRef<HTMLDivElement>(null);
    const toMarkerRef = useRef<HTMLDivElement>(null);
    const pathContainer = useRef<SVGPathElement>(null);

    useResizeObserver(ref, (entry) => {
        const basis = entry.target.getBoundingClientRect();
        if (fromMarkerRef.current && toMarkerRef.current && pathContainer.current) {
            const fromPoint = fromMarkerRef.current.getBoundingClientRect();
            const toPoint = toMarkerRef.current.getBoundingClientRect();
            const zoom = entry.target.currentCSSZoom;

            const x1 = (fromPoint.left - basis.left) / zoom;
            const y1 = (fromPoint.top - basis.top) / zoom;
            const x2 = (toPoint.left - basis.left) / zoom;
            const y2 = (toPoint.top - basis.top) / zoom;

            const dx = Math.max(200, Math.abs(x2 - x1) * 0.5);
            pathContainer.current.style.setProperty("--theD", `path("M ${x1},${y1} C ${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}")`);
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
            <div
                className={className}
                style={style}
                ref={ref}
                tabIndex={-1}
                onFocus={handleFocus}
                onBlur={handleBlur}
                data-state={isSelected ? "selected" : undefined}
                data-flavour={DATATYPE_FLAVOURS[link.type]}
                data-linktype={link.type}
            >
                <svg preserveAspectRatio="none">
                    <g ref={pathContainer}>
                        <path data-part={"target"} d="" />
                        <path data-part={"display"} d="" />
                        <path data-part={"effect"} d="" />
                        <path data-part={"select"} d="" />
                    </g>
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

    --anchorT: var(--fromTarget);
    --anchorR: var(--toTarget);
    --anchorB: var(--toTarget);
    --anchorL: var(--fromTarget);

    & > [data-part="markerFrom"],
    & > [data-part="markerTo"] {
        position: fixed;
        width: 1px;
        height: 1px;
        background: red;
    }

    & > [data-part="markerFrom"] {
        top: var(--fromTarget);
        left: var(--fromTarget);
    }

    & > [data-part="markerTo"] {
        top: var(--toTarget);
        left: var(--toTarget);
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
        & > g > path {
            d: var(--theD);
            vector-effect: non-scaling-stroke;
            fill: none;
            pointer-events: none;

            &[data-part="display"] {
                stroke: oklch(from var(--flavour) calc(l + 0.2) c h);
                stroke-width: 1.5px;
            }
            &[data-part="effect"] {
                stroke: none;
                stroke-width: 0;
            }
            &[data-part="target"] {
                stroke: transparent;
                stroke-width: 9px;
                pointer-events: stroke;
                cursor: pointer;
            }
            &[data-part="select"] {
                stroke: transparent;
                stroke-width: 2.5px;
            }
        }
    }

    &[data-linktype="shape"] > svg > g > path {
        &[data-part="display"] {
            stroke: oklch(from var(--flavour) calc(l + 0.2) c h);
            stroke-width: 6px;
        }
        &[data-part="effect"] {
            --animMarch: 12px;
            animation: ${keyframesMarch} 0.2s linear infinite reverse;
            stroke: black;
            stroke-linecap: round;
            stroke-dasharray: 4px 8px;
            stroke-dashoffset: 0px;
            stroke-width: 4px;
        }
        &[data-part="select"] {
            stroke-width: 7px;
        }
    }

    &[data-state~="selected"] > svg > g > path[data-part="select"] {
        stroke: #fff6;
    }
`;
