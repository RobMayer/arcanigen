import styled from "styled-components";
import { MainGraph } from "../state/maingraph";
import { createContext, CSSProperties, Ref, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useResizeObserver } from "../util/hooks/useResizeObserver";
import { useStable } from "../util/hooks/useStable";

type EventContext = {
    start: (nodeId: string) => void;
    finish: (nodeId: string) => void;
    cancel: () => void;
};

const GraphViewEventCTX = createContext<EventContext>({ start: () => {}, finish: () => {}, cancel: () => {} });

const useGraphEventBus = () => useContext(GraphViewEventCTX);

export const GraphView = () => {
    const nodes = MainGraph.useNodeList();

    const [{ x, y, z }, setPosition] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 1 });
    const viewportRef = useRef<HTMLDivElement>(null);
    const offsetRef = useRef<HTMLDivElement>(null);
    const boundsRef = useRef<HTMLDivElement>(null);

    const [crossed, setCrossed] = useState({ top: false, bottom: false, left: false, right: false });
    const crossedRef = useRef(crossed);

    const checkBounds = useCallback(() => {
        const boundsEl = boundsRef.current;
        const viewportEl = viewportRef.current;
        if (!boundsEl || !viewportEl) return;
        const b = boundsEl.getBoundingClientRect();
        const v = viewportEl.getBoundingClientRect();
        const top = b.bottom < v.top;
        const bottom = b.top > v.bottom;
        const left = b.right < v.left;
        const right = b.left > v.right;
        const prev = crossedRef.current;
        if (prev.top !== top || prev.bottom !== bottom || prev.left !== left || prev.right !== right) {
            const next = { top, bottom, left, right };
            crossedRef.current = next;
            setCrossed(next);
        }
    }, []);

    useResizeObserver(boundsRef, checkBounds);

    useEffect(() => {
        checkBounds();
    }, [x, y, z, checkBounds]);

    const { pos, bg } = useMemo<{ pos: CSSProperties; bg: CSSProperties }>(() => {
        return {
            pos: {
                top: y,
                left: x,
                zoom: z,
            },
            bg: {
                borderTopColor: crossed.top ? "red" : "transparent",
                borderLeftColor: crossed.left ? "red" : "transparent",
                borderRightColor: crossed.right ? "red" : "transparent",
                borderBottomColor: crossed.bottom ? "red" : "transparent",
                backgroundPosition: `calc(50% + ${x * z}px) calc(50% + ${y * z}px)`,
                backgroundSize: `${83.14 * z}px ${48 * z}px`,
            },
        };
    }, [x, y, z, crossed.top, crossed.bottom, crossed.left, crossed.right]);

    useEffect(() => {
        const element = viewportRef.current;

        if (element) {
            const wheel = (evt: WheelEvent) => {
                evt.preventDefault();
                const rect = element.getBoundingClientRect();
                // cursor position relative to viewport center (the Origin point)
                const cx = evt.clientX - (rect.left + rect.width / 2);
                const cy = evt.clientY - (rect.top + rect.height / 2);

                setPosition(({ x, y, z }) => {
                    const factor = evt.deltaY > 0 ? 1 / 1.1 : 1.1;
                    const nz = Math.min(2, Math.max(0.1, z * factor));
                    // adjust pan so the point under the cursor stays fixed
                    const nx = cx / nz - (cx / z - x);
                    const ny = cy / nz - (cy / z - y);
                    return { x: nx, y: ny, z: nz };
                });
            };

            const mouseMove = (evt: MouseEvent) => {
                const zoom = offsetRef.current?.currentCSSZoom ?? 1;
                const dX = evt.movementX / zoom;
                const dY = evt.movementY / zoom;
                setPosition(({ x, y, z }) => {
                    return { x: x + dX, y: y + dY, z };
                });
            };

            const mouseUp = () => {
                document.removeEventListener("mousemove", mouseMove);
                document.removeEventListener("mouseup", mouseUp);
            };

            const mouseDown = (evt: MouseEvent) => {
                if (evt.button === 1) {
                    evt.preventDefault();
                    document.addEventListener("mousemove", mouseMove);
                    document.addEventListener("mouseup", mouseUp);
                }
            };

            element.addEventListener("mousedown", mouseDown);
            element.addEventListener("wheel", wheel);
            return () => {
                element.removeEventListener("mousedown", mouseDown);
                element.removeEventListener("wheel", wheel);
                document.removeEventListener("mousemove", mouseMove);
                document.removeEventListener("mouseup", mouseUp);
            };
        }
    }, [setPosition]);

    const [pendingConnection] = MainGraph.usePendingConnection();

    const contextValue = useMemo(() => {
        let pendingNode: string | null = null;

        return {
            start: (nodeId: string) => {
                console.log("start triggered", nodeId);
                pendingNode = nodeId;
                viewportRef.current?.dispatchEvent(new CustomEvent<string>("nodegraph:connectStart", { detail: nodeId, bubbles: true }));
            },
            finish: (nodeId: string) => {
                if (pendingNode !== null) {
                    viewportRef.current?.dispatchEvent(new CustomEvent<{ start: string; end: string }>("nodegraph:connectFinish", { detail: { start: pendingNode, end: nodeId }, bubbles: true }));
                }
                pendingNode = null;
            },
            cancel: () => {
                viewportRef.current?.dispatchEvent(new CustomEvent<void>("nodegraph:connectCancel"));
                pendingNode = null;
            },
        };
    }, []);

    return (
        <Viewport ref={viewportRef} style={bg}>
            <GraphViewEventCTX value={contextValue}>
                <Origin>
                    <Offset style={pos} ref={offsetRef}>
                        <NodeWrapper>
                            {nodes.map((nodeId) => {
                                return <GraphNode key={nodeId} nodeId={nodeId} />;
                            })}
                        </NodeWrapper>
                        <Links />
                        {pendingConnection ? <PendingConnection value={pendingConnection} /> : null}
                        <Bounds ref={boundsRef} nodeList={nodes} />
                    </Offset>
                </Origin>
            </GraphViewEventCTX>
        </Viewport>
    );
};

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
    return <div className={className}>{/* svg just like the GraphLine but one end is anchored to the starting node as determined by value, the other follows the mouse */}</div>;
})``;

const Offset = styled.div`
    position: relative;
`;

const Origin = styled.div`
    width: 0;
    height: 0;
    place-self: center;
    position: absolute;
    overflow: visible;
    isolation: isolate;
    display: grid;
`;

const Viewport = styled.div`
    position: absolute;
    inset: 0;
    display: grid;
    overflow: hidden;
    background: #111;
    background-image: url("hexgrid.svg");
    background-blend-mode: overlay;
    border: 3px solid transparent;
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

const GraphNode = styled(({ className, nodeId }: { nodeId: string; className?: string }) => {
    const [{ x, y }, setPosition] = MainGraph.usePositionOf(nodeId);

    const node = MainGraph.useNode(nodeId);

    const [pendingConnection, setPendingConnection] = MainGraph.usePendingConnection();

    const style = useMemo(() => {
        return {
            left: x,
            top: y,
            anchorName: `--node_${nodeId}`,
        };
    }, [nodeId, x, y]);

    const handleRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handle = handleRef.current;

        if (handle) {
            const mouseMove = (evt: MouseEvent) => {
                const zoom = handle.currentCSSZoom * devicePixelRatio;
                const dX = evt.movementX / zoom;
                const dY = evt.movementY / zoom;
                setPosition(({ x, y }) => {
                    return { x: x + dX, y: y + dY };
                });
            };

            const mouseUp = () => {
                document.removeEventListener("mousemove", mouseMove);
                document.removeEventListener("mouseup", mouseUp);
            };

            const mouseDown = (evt: MouseEvent) => {
                if (evt.button === 0) {
                    document.addEventListener("mousemove", mouseMove);
                    document.addEventListener("mouseup", mouseUp);
                }
            };

            handle.addEventListener("mousedown", mouseDown);
            return () => {
                handle.removeEventListener("mousedown", mouseDown);
                document.removeEventListener("mousemove", mouseMove);
                document.removeEventListener("mouseup", mouseUp);
            };
        }
    }, [setPosition]);

    const socketRef = useRef<HTMLDivElement>(null);

    const graphEventBus = useGraphEventBus();

    useEffect(() => {
        const socket = socketRef.current;
        if (socket) {
            const onStart = (evt: CustomEvent<string>) => {
                console.log(evt.detail, nodeId);
            };

            socket.addEventListener("nodegraph:connectStart" as any, onStart);
            return () => {
                socket.removeEventListener("nodegraph:connectStart" as any, onStart);
            };
        }
    }, [nodeId]);

    useEffect(() => {
        const socket = socketRef.current;
        if (socket) {
            const connectStart = (evt: MouseEvent) => {
                graphEventBus.start(nodeId);
            };

            const connectEnd = (evt: MouseEvent) => {
                graphEventBus.finish(nodeId);
            };

            socket.addEventListener("mousedown", connectStart);
            socket.addEventListener("mouseup", connectEnd);
            return () => {
                socket.removeEventListener("mousedown", connectStart);
                socket.removeEventListener("mouseup", connectEnd);
            };
        }
    }, [nodeId, graphEventBus]);

    return (
        <div className={className} style={style} title={nodeId}>
            <div data-part="handle" ref={handleRef}>
                Handle
            </div>
            <div data-part="other" ref={socketRef}>
                Some Other Stuff
            </div>
            <div data-part="other">{node.payload}</div>
        </div>
    );
})`
    position: absolute;
    display: grid;
    background: #333;
    border: 1px solid #666;
    width: max-content;
    outline: 1px solid transparent;
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

    useResizeObserver(ref, (entry) => {
        const basis = entry.target.getBoundingClientRect();
        if (fromMarkerRef.current && toMarkerRef.current && pathRef.current) {
            const fromPoint = fromMarkerRef.current.getBoundingClientRect();
            const toPoint = toMarkerRef.current.getBoundingClientRect();
            const zoom = entry.target.currentCSSZoom;

            const x1 = (fromPoint.left - basis.left) / zoom;
            const y1 = (fromPoint.top - basis.top) / zoom;
            const x2 = (toPoint.left - basis.left) / zoom;
            const y2 = (toPoint.top - basis.top) / zoom;

            const dx = Math.max(200, Math.abs(x2 - x1) * 0.5);
            pathRef.current.setAttribute("d", `M ${x1},${y1} C ${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`);
        }
    });

    return (
        <>
            <div className={className} style={style} ref={ref}>
                <svg preserveAspectRatio="none">
                    <path ref={pathRef} />
                </svg>
                <div className={"markerFrom"} ref={fromMarkerRef} />
                <div className={"markerTo"} ref={toMarkerRef} />
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

    & > .markerFrom,
    & > .markerTo {
        position: fixed;
        width: 1px;
        height: 1px;
        background: red;
    }

    & > .markerFrom {
        top: anchor(var(--fromNode) center);
        left: anchor(var(--fromNode) center);
    }

    & > .markerTo {
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
        & > path {
            vector-effect: non-scaling-stroke;
            fill: none;
            stroke: #fc3;
            stroke-width: 1.5px;
            pointer-events: none;
        }
    }
`;
