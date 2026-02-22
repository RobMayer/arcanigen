import { createContext, CSSProperties, ReactNode, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { Project } from "../../state/project";
import styled from "styled-components";
import { useResizeObserver } from "../../util/hooks/useResizeObserver";
import { useStable } from "../../util/hooks/useStable";
import { NodeDefinitions, NodeTypes, SocketTypes } from "../../definitions/betterTypes";
// useGraphId removed — Socket now receives node directly

type GraphConnectionControls = {
    start: (nodeId: string, socketId: string, side: "in" | "out") => void;
    finish: (nodeId: string, socketId: string, side: "in" | "out") => void;
    clear: () => void;
};

const GraphViewConnectionCTX = createContext<GraphConnectionControls>({ start: () => {}, finish: () => {}, clear: () => {} });

export const GraphConnectionProvider = ({ children, graphId }: { children?: ReactNode; graphId: string }) => {
    const [pendingConnection, setPendingConnection] = Project.usePendingConnection();
    const graphMethods = Project.useMethods();
    const mc = Project.useMC();

    const connectionContextValue = useMemo(() => {
        let pending: null | Project.PendingConnection;
        return {
            start: (nodeId: string, socketId: string, side: "in" | "out") => {
                const node = mc.getNode(graphId, nodeId);
                const socketType = node ? NodeTypes.getSocketType(node, socketId, side, mc) : SocketTypes.NONE;
                const p = { node: nodeId, socket: socketId, side, type: socketType, scope: graphId };
                pending = setPendingConnection(p);
            },
            finish: (nodeId: string, socketId: string, side: "in" | "out") => {
                if (pending !== null && pending.side !== side) {
                    const node = mc.getNode(graphId, nodeId);
                    const socketType = node ? NodeTypes.getSocketType(node, socketId, side, mc) : SocketTypes.NONE;
                    // normalize: out -> in
                    const [fromNode, toNode, fromSocket, toSocket, outType, inType] =
                        pending.side === "out"
                            ? [pending.node, nodeId, pending.socket, socketId, pending.type, socketType]
                            : [nodeId, pending.node, socketId, pending.socket, socketType, pending.type];
                    if (SocketTypes.canFlow(outType, inType)) {
                        graphMethods.connect(fromNode, toNode, fromSocket, toSocket, SocketTypes.representativeKind(outType, inType));
                    }
                }
            },
            clear: () => {
                setPendingConnection(null);
                pending = null;
            },
        };
    }, [setPendingConnection, graphMethods, graphId, mc]);

    useEffect(() => {
        document.addEventListener("mouseup", connectionContextValue.clear);
        return () => {
            document.removeEventListener("mouseup", connectionContextValue.clear);
        };
    }, [connectionContextValue]);

    return (
        <GraphViewConnectionCTX value={connectionContextValue}>
            {children}
            {pendingConnection && pendingConnection.scope === graphId ? (
                <PendingConnection nodeId={pendingConnection.node} socketId={pendingConnection.socket} type={SocketTypes.toCSS(pendingConnection.type)} />
            ) : null}
        </GraphViewConnectionCTX>
    );
};

export const Socket = styled(
    ({
        side,
        socketId,
        nodeId,
        node,
        className,
        connected = false,
    }: {
        side: "in" | "out";
        socketId: string;
        nodeId: string;
        node: NodeDefinitions.NodeFor<NodeDefinitions.Any>;
        className?: string;
        connected?: boolean;
    }) => {
        const socketRef = useRef<HTMLDivElement>(null);

        const [pendingConnection] = Project.usePendingConnection();
        const mc = Project.useMC();

        const rule = useMemo(() => NodeTypes.getSocketType(node, socketId, side, mc), [node, socketId, side, mc]);
        const [type, title] = useMemo(() => {
            const tp = SocketTypes.toCSS(rule);
            const anyCSS = SocketTypes.toCSS(SocketTypes.ANY);

            const sep = rule.mode === "and" ? " & " : " | ";
            let ti = tp.split(" ").join(sep);
            if (tp === "") {
                ti = "« unknown »";
            }
            if (tp === anyCSS) {
                ti = "« any »";
            }

            return [tp, ti];
        }, [rule]);

        const canConnect = useMemo(() => {
            if (pendingConnection === null) {
                return false;
            }
            if (pendingConnection.side === side) {
                return false;
            }
            const [outType, inType] = pendingConnection.side === "out" ? [pendingConnection.type, rule] : [rule, pendingConnection.type];
            if (!SocketTypes.canFlow(outType, inType)) {
                return false;
            }
            if (pendingConnection.forbidden.has(`${nodeId}:${socketId}`)) {
                return false;
            }
            return true;
        }, [nodeId, pendingConnection, side, socketId, rule]);

        const canConnectRef = useStable(canConnect);

        const connectionContext = useContext(GraphViewConnectionCTX);

        useEffect(() => {
            const socket = socketRef.current;
            if (socket) {
                const connectStart = (evt: globalThis.MouseEvent) => {
                    if (evt.button === 0) {
                        evt.handled = "active";
                        connectionContext.start(nodeId, socketId, side);
                    }
                };
                const finishConnection = () => {
                    if (canConnectRef.current) {
                        connectionContext.finish(nodeId, socketId, side);
                    }
                };

                socket.addEventListener("mousedown", connectStart);
                socket.addEventListener("mouseup", finishConnection);
                return () => {
                    socket.removeEventListener("mousedown", connectStart);
                    socket.removeEventListener("mouseup", finishConnection);
                };
            }
        }, [nodeId, socketId, connectionContext, side]);

        const state = useMemo(() => {
            const r: string[] = [
                connected ? "connected" : "",
                pendingConnection?.node === nodeId && pendingConnection?.socket === socketId ? "active" : "",
                pendingConnection && !canConnect ? "invalid" : "",
            ].filter(Boolean);
            return r.length > 0 ? r.join(" ") : undefined;
        }, [pendingConnection, canConnect, nodeId, socketId, connected]);

        return (
            <div
                ref={socketRef}
                className={className}
                data-socketid={`--socket_${nodeId}_${socketId}`}
                data-socketside={side}
                data-sockettype={type}
                data-typeany={title === "« any »"}
                data-state={state}
                title={title}
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

    --flavour: var(--flavour-base);

    &[data-sockettype~="float"],
    &[data-sockettype~="integer"],
    &[data-sockettype~="string"],
    &[data-sockettype~="length"],
    &[data-sockettype~="color"],
    &[data-sockettype~="enum"],
    &[data-sockettype~="angle"],
    &[data-sockettype~="boolean"],
    &[data-sockettype~="tokens<length>"] {
        --flavour: var(--flavour-accent);
    }
    &[data-sockettype~="distribution"] {
        --flavour: var(--flavour-info);
    }
    &[data-sockettype~="path"] {
        --flavour: var(--flavour-emphasis);
    }
    &[data-sockettype~="sequence"],
    &[data-sockettype~="array<layer>"] {
        --flavour: var(--flavour-danger);
    }
    &[data-sockettype~="shape"],
    &[data-sockettype~="layer"] {
        --flavour: var(--flavour-confirm);
    }

    &[data-typeany] {
        --flavour: var(--flavour-base);
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
                <path ref={pathRef} data-sockettype={type} data-typeany={type === SocketTypes.toCSS(SocketTypes.ANY) ? "" : undefined} />
            </svg>
            <div className="markerFrom" ref={fromMarkerRef} />
        </div>
    );
})`
    position: fixed;
    width: auto;
    height: auto;
    z-index: 0;
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
            stroke-width: 3px;
            stroke-dasharray: 8 8;
            pointer-events: none;
            --flavour: var(--flavour-base);

            stroke: oklch(from var(--flavour) calc(l + 0.3) c h);

            &[data-sockettype~="float"],
            &[data-sockettype~="integer"],
            &[data-sockettype~="string"],
            &[data-sockettype~="length"],
            &[data-sockettype~="color"],
            &[data-sockettype~="enum"],
            &[data-sockettype~="angle"],
            &[data-sockettype~="boolean"],
            &[data-sockettype~="tokens<length>"] {
                --flavour: var(--flavour-accent);
            }
            &[data-sockettype~="distribution"] {
                --flavour: var(--flavour-info);
            }

            &[data-sockettype~="path"] {
                --flavour: var(--flavour-emphasis);
            }
            &[data-sockettype~="sequence"],
            &[data-sockettype~="array<layer>"] {
                --flavour: var(--flavour-danger);
            }
            &[data-sockettype~="shape"],
            &[data-sockettype~="layer"] {
                --flavour: var(--flavour-confirm);
            }

            &[data-typeany] {
                --flavour: var(--flavour-base);
            }
        }
    }
`;

// // todo: use this to check for possible cylicals...
// const _validateConnection = <N extends DefinitionOf<BaseDefinition>["payload"]>(graph: ArcaneGraph.GraphOf<N>, node: ArcaneGraph.NodeOf<N>, outSocket: string): boolean => {
//     const nt = NodeTypeRegistry.get(node.type);
//     const _affected = nt.dependsOn(node, outSocket);
//     return true;
// };
