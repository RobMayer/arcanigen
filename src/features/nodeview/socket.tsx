import { createContext, CSSProperties, ReactNode, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { MainGraph } from "../../state/maingraph";
import styled from "styled-components";
import { useResizeObserver } from "../../util/hooks/useResizeObserver";
import { useStable } from "../../util/hooks/useStable";

type GraphConnectionControls = {
    start: (nodeId: string, socketId: string, side: "in" | "out", type: string) => void;
    finish: (nodeId: string, socketId: string, side: "in" | "out", type: string) => void;
    clear: () => void;
};

const GraphViewConnectionCTX = createContext<GraphConnectionControls>({ start: () => {}, finish: () => {}, clear: () => {} });

export const GraphConnectionProvider = ({ children }: { children?: ReactNode }) => {
    const [pendingConnection, setPendingConnection] = MainGraph.usePendingConnection();
    const graphMethods = MainGraph.useMethods();

    const connectionContextValue = useMemo(() => {
        let pending: null | MainGraph.PendingConnection;
        return {
            start: (nodeId: string, socketId: string, side: "in" | "out", type: string) => {
                console.log("graph is starting a connection");
                const p = { node: nodeId, socket: socketId, side, type };
                setPendingConnection(p);
                pending = p;
            },
            finish: (nodeId: string, socketId: string, side: "in" | "out", type: string) => {
                if (pending !== null) {
                    // todo: make sure you connect the right end to the right end.
                    // todo: maybe some validation?
                    graphMethods.connect(pending.node, nodeId, pending.socket, socketId);
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
        <GraphViewConnectionCTX value={connectionContextValue}>
            {children}
            {pendingConnection ? <PendingConnection nodeId={pendingConnection.node} socketId={pendingConnection.socket} /> : null}
        </GraphViewConnectionCTX>
    );
};

export const Socket = styled(({ side, socketId, nodeId, className, type }: { side: "in" | "out"; socketId: string; nodeId: string; className?: string; type: string }) => {
    const socketRef = useRef<HTMLDivElement>(null);

    const [pendingConnection] = MainGraph.usePendingConnection();

    const canConnect = useMemo(() => {
        return pendingConnection !== null;
    }, [pendingConnection]);

    const canConnectRef = useStable(canConnect);

    const connectionContext = useContext(GraphViewConnectionCTX);

    useEffect(() => {
        const socket = socketRef.current;
        if (socket) {
            const connectStart = (evt: globalThis.MouseEvent) => {
                evt.handled = "active";
                connectionContext.start(nodeId, socketId, side, type);
            };
            const finishConnection = () => {
                if (canConnectRef.current) {
                    connectionContext.finish(nodeId, socketId, side, type);
                }
            };

            socket.addEventListener("mousedown", connectStart);
            socket.addEventListener("mouseup", finishConnection);
            return () => {
                socket.removeEventListener("mousedown", connectStart);
                socket.removeEventListener("mouseup", finishConnection);
            };
        }
    }, [nodeId, socketId, connectionContext, side, type]);

    return <div ref={socketRef} className={className} data-socketid={`socket_${nodeId}_${socketId}`} data-socketside={side} />;
})`
    height: 1lh;
    aspect-ratio: 1;
    background: red;
    border-radius: 100%;
    anchor-name: attr(data-socket type(<custom-ident>));
`;

const PendingConnection = styled(({ nodeId, socketId, className }: { nodeId: string; socketId: string; className?: string }) => {
    const style = useMemo(
        () =>
            ({
                "--source": `--socket_${nodeId}_${socketId}`,
            }) as CSSProperties,
        [nodeId, socketId],
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

    --anchorFrom: anchor(var(--source) center);

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
