import { createContext, CSSProperties, ReactNode, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { Project } from "../../state/project";
import styled from "styled-components";
import { useResizeObserver } from "../../util/hooks/useResizeObserver";
import { useStable } from "../../util/hooks/useStable";
import { SocketTypes } from "../../definitions/betterTypes";

type GraphConnectionControls = {
    start: (nodeId: string, socketId: string, side: "in" | "out", type: string) => void;
    finish: (nodeId: string, socketId: string, side: "in" | "out", type: string) => void;
    clear: () => void;
};

const GraphViewConnectionCTX = createContext<GraphConnectionControls>({ start: () => {}, finish: () => {}, clear: () => {} });

export const GraphConnectionProvider = ({ children, graphId }: { children?: ReactNode; graphId: string }) => {
    const [pendingConnection, setPendingConnection] = Project.usePendingConnection();
    const graphMethods = Project.useMethods();

    const connectionContextValue = useMemo(() => {
        let pending: null | Project.PendingConnection;
        return {
            start: (nodeId: string, socketId: string, side: "in" | "out", type: string) => {
                // todo: parametize scope properly...
                const p = { node: nodeId, socket: socketId, side, type, scope: graphId };
                pending = setPendingConnection(p);
            },
            finish: (nodeId: string, socketId: string, side: "in" | "out", type: string) => {
                if (pending !== null && pending.side !== side) {
                    // normalize: out -> in
                    const [fromNode, toNode, fromSocket, toSocket, outType, inType] =
                        pending.side === "out" ? [pending.node, nodeId, pending.socket, socketId, pending.type, type] : [nodeId, pending.node, socketId, pending.socket, type, pending.type];
                    if (SocketTypes.canFlow(outType, inType)) {
                        const theType = SocketTypes.representativeType(outType, inType);
                        if (theType !== null) {
                            graphMethods.connect(fromNode, toNode, fromSocket, toSocket, theType);
                        }
                    }
                }
            },
            clear: () => {
                setPendingConnection(null);
                pending = null;
            },
        };
    }, [setPendingConnection, graphMethods, graphId]);

    useEffect(() => {
        document.addEventListener("mouseup", connectionContextValue.clear);
        return () => {
            document.removeEventListener("mouseup", connectionContextValue.clear);
        };
    }, [connectionContextValue]);

    return (
        <GraphViewConnectionCTX value={connectionContextValue}>
            {children}
            {pendingConnection && pendingConnection.scope === graphId ? <PendingConnection nodeId={pendingConnection.node} socketId={pendingConnection.socket} type={pendingConnection.type} /> : null}
        </GraphViewConnectionCTX>
    );
};

export const Socket = styled(
    ({ side, socketId, nodeId, className, type, connected = false }: { side: "in" | "out"; socketId: string; nodeId: string; className?: string; type: string; connected?: boolean }) => {
        const socketRef = useRef<HTMLDivElement>(null);

        const [pendingConnection] = Project.usePendingConnection();

        const canConnect = useMemo(() => {
            if (pendingConnection === null) {
                return false;
            }
            if (pendingConnection.side === side) {
                return false;
            }
            const [outType, inType] = pendingConnection.side === "out" ? [pendingConnection.type, type] : [type, pendingConnection.type];
            if (!SocketTypes.canFlow(outType, inType)) {
                return false;
            }
            if (pendingConnection.forbidden.has(`${nodeId}:${socketId}`)) {
                return false;
            }
            return true;
        }, [nodeId, pendingConnection, side, socketId, type]);

        const canConnectRef = useStable(canConnect);

        const connectionContext = useContext(GraphViewConnectionCTX);

        useEffect(() => {
            const socket = socketRef.current;
            if (socket) {
                const connectStart = (evt: globalThis.MouseEvent) => {
                    if (evt.button === 0) {
                        evt.handled = "active";
                        connectionContext.start(nodeId, socketId, side, type);
                    }
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

        const state = useMemo(() => {
            const r: string[] = [
                connected ? "connected" : "",
                pendingConnection?.node === nodeId && pendingConnection?.socket === socketId ? "active" : "",
                pendingConnection && !canConnect ? "invalid" : "",
            ].filter(Boolean);
            return r.length > 0 ? r.join(" ") : undefined;
        }, [pendingConnection, canConnect, nodeId, socketId, connected]);

        const titleType = useMemo(() => (type === "" ? "« none »" : type === SocketTypes.ANY ? "« any »" : type.split(" ").join(" | ")), [type]);

        return (
            <div
                ref={socketRef}
                className={className}
                data-socketid={`--socket_${nodeId}_${socketId}`}
                data-socketside={side}
                data-sockettype={type}
                data-state={state}
                data-flavour={SocketTypes.flavourOf(type)}
                title={titleType}
            />
        );
    },
)`
    height: calc(1lh - (1lh - 1em) / 2);
    align-self: center;
    aspect-ratio: 1;
    background: oklch(from var(--flavour) l c h);
    border-radius: 100%;
    anchor-name: attr(data-socketid type(<custom-ident>));
    transition:
        background-color 0.25s,
        outline-color 0.25s;
    outline: 1px solid #fff4;
    outline-offset: -2px;
    border: 1px solid black;
    z-index: 1;

    &[data-socketside="in"] {
        margin-left: calc(-1lh + 6px);
    }
    &[data-socketside="out"] {
        margin-right: calc(-1lh + 6px);
    }

    &[data-state~="invalid"] {
        background: #222;
        outline-color: #fff1;
    }
    &:hover:not([data-state~="invalid"]),
    &[data-state~="active"] {
        background: oklch(from var(--flavour) calc(l * 1.2) c h);
    }
    &[data-state~="active"] {
        outline-color: #fff;
    }
`;

const PendingConnection = styled(({ nodeId, socketId, className, type }: { nodeId: string; socketId: string; className?: string; type: string }) => {
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
                <path ref={pathRef} data-flavour={SocketTypes.flavourOf(type)} />
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
            stroke: oklch(from var(--flavour) calc(l + 0.3) c h);
        }
    }
`;

// // todo: use this to check for possible cylicals...
// const _validateConnection = <N extends DefinitionOf<BaseDefinition>["payload"]>(graph: ArcaneGraph.GraphOf<N>, node: ArcaneGraph.NodeOf<N>, outSocket: string): boolean => {
//     const nt = NodeTypeRegistry.get(node.type);
//     const _affected = nt.dependsOn(node, outSocket);
//     return true;
// };
