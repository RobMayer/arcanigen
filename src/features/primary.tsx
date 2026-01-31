import styled from "styled-components";
import { MainGraph } from "../state/maingraph";
import { createContext, CSSProperties, Ref, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { useResizeObserver } from "../util/hooks/useResizeObserver";
import { DragPane } from "../components/wrappers/DragPane";
import { DragMove } from "../components/wrappers/DragMove";

type GraphConnectionControls = {
    start: (nodeId: string) => void;
    finish: (nodeId: string) => void;
    clear: () => void;
};

const GraphViewConnectionCTX = createContext<GraphConnectionControls>({ start: () => {}, finish: () => {}, clear: () => {} });

export const GraphView = () => {
    const nodes = MainGraph.useNodeList();

    const boundsRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        document.addEventListener("mouseup", connectionContextValue.clear);
        return () => {
            document.removeEventListener("mouseup", connectionContextValue.clear);
        };
    }, [connectionContextValue]);

    return (
        <GraphViewPane boundsRef={boundsRef} minZoom={0.1} maxZoom={2}>
            <GraphViewConnectionCTX value={connectionContextValue}>
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
    &[data-breach~="top"] {
        border-top-color: red;
    }
    &[data-breach~="bottom"] {
        border-bottom-color: red;
    }
    &[data-breach~="left"] {
        border-left-color: red;
    }
    &[data-breach~="right"] {
        border-right-color: red;
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
    const [storedPosition, setPosition] = MainGraph.usePositionOf(nodeId);

    const node = MainGraph.useNode(nodeId);

    const handleRef = useRef<HTMLDivElement>(null);
    const localPosition = DragMove.useHandle(handleRef, storedPosition, { onFinish: setPosition });

    const socketRef = useRef<HTMLDivElement>(null);
    const connectionContext = useContext(GraphViewConnectionCTX);

    useEffect(() => {
        const socket = socketRef.current;
        if (socket) {
            const connectStart = () => {
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
        <DragMove.Item position={localPosition} className={className} title={nodeId} data-node={`--node_${nodeId}`}>
            <div data-part="handle" ref={handleRef}>
                Node {node.payload}
            </div>
            <div data-part="socket" ref={socketRef}>
                Connection
            </div>
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
