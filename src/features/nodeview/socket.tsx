import { createContext, CSSProperties, ReactNode, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { Project } from "../../state/project";
import styled from "styled-components";
import { useResizeObserver } from "../../util/hooks/useResizeObserver";
import { useStable } from "../../util/hooks/useStable";
import { NodeDefinitions, NodeTypes } from "../../definitions/nodeTypes";
import { SocketTypes } from "../../definitions/socketTypes";
import { useDragPaneInternal } from "../../components/wrappers/DragPane";
import { useGraphId } from "../../state/graphId";

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
                const socketType = node ? NodeTypes.getSocketType(node, socketId, side, graphId, mc) : SocketTypes.NONE;
                const p = { node: nodeId, socket: socketId, side, type: socketType, scope: graphId };
                pending = setPendingConnection(p);
            },
            finish: (nodeId: string, socketId: string, side: "in" | "out") => {
                if (pending !== null && pending.side !== side) {
                    const node = mc.getNode(graphId, nodeId);
                    const socketType = node ? NodeTypes.getSocketType(node, socketId, side, graphId, mc) : SocketTypes.NONE;
                    // normalize: out -> in
                    const [fromNode, toNode, fromSocket, toSocket, outType, inType] =
                        pending.side === "out"
                            ? [pending.node, nodeId, pending.socket, socketId, pending.type, socketType]
                            : [nodeId, pending.node, socketId, pending.socket, socketType, pending.type];
                    if (SocketTypes.canFlow(outType, inType)) {
                        graphMethods.connect(fromNode, toNode, fromSocket, toSocket);
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
        document.addEventListener("pointerup", connectionContextValue.clear);
        return () => {
            document.removeEventListener("pointerup", connectionContextValue.clear);
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
        const graphId = useGraphId();

        const rule = Project.useSocketType(graphId, node, socketId, side);
        const [type, title] = useMemo(() => {
            const tp = SocketTypes.toCSS(rule);
            const anyCSS = SocketTypes.toCSS(SocketTypes.ANY);

            // conjunctive display ("&") is only meaningful on an output; an input always accepts any of
            // its kinds, so it always reads as "|".
            const sep = side === "out" && SocketTypes.projectMode(rule) === "and" ? " & " : " | ";
            let ti = tp.split(" ").join(sep);
            if (tp === "") {
                ti = "« unknown »";
            }
            if (tp === anyCSS) {
                ti = "« any »";
            }

            return [tp, ti];
        }, [rule, side]);

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
                const connectStart = (evt: globalThis.PointerEvent) => {
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

                socket.addEventListener("pointerdown", connectStart);
                socket.addEventListener("pointerup", finishConnection);
                return () => {
                    socket.removeEventListener("pointerdown", connectStart);
                    socket.removeEventListener("pointerup", finishConnection);
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

        const style = useMemo(() => {
            return { "--socket": `--socket_${nodeId}_${socketId}` } as CSSProperties;
        }, [nodeId, socketId]);

        return (
            <div
                ref={socketRef}
                className={className}
                style={style}
                data-socketside={side}
                data-sockettype={type}
                data-socketmod={title === "« any »" ? "any" : title === "« unknown »" ? "unknown" : undefined}
                data-state={state}
                title={title}
            />
        );
    },
)`
    height: calc(1lh - (1lh - 1em) / 2);
    align-self: center;
    aspect-ratio: 1;
    border-radius: 100%;
    border-style: solid;
    border-width: 2px;
    anchor-name: var(--socket);
    transition:
        outline-color 0.1s,
        background 0.25s,
        border-color 0.25s;
    outline: 1px solid black;
    outline-offset: 0px;
    z-index: 1;

    &[data-socketside="in"] {
        margin-left: calc(-1lh + 6px);
    }
    &[data-socketside="out"] {
        margin-right: calc(-1lh + 6px);
    }

    corner-shape: round;
    &[data-sockettype*="array<"] {
        corner-shape: bevel;
    }
    /* Future: Bus<T> -> corner-shape: square; LoopFor<T> -> shape TBD. */

    /* "any"/"unknown" sockets stay circular even though their accept-set includes array kinds. */
    &[data-socketmod="any"],
    &[data-socketmod="unknown"] {
        corner-shape: round;
    }

    --tl: var(--flavour-base);
    --br: var(--flavour-base);

    &[data-sockettype~="float"],
    &[data-sockettype~="integer"],
    &[data-sockettype~="string"],
    &[data-sockettype~="length"],
    &[data-sockettype~="color"],
    &[data-sockettype~="enum"],
    &[data-sockettype~="angle"],
    &[data-sockettype~="boolean"],
    &[data-sockettype~="point"],
    &[data-sockettype~="array<point>"],
    &[data-sockettype~="tokens:length"] {
        --tl: var(--flavour-accent);
        --br: var(--flavour-accent);
    }
    &[data-sockettype~="gradient"],
    &[data-sockettype~="stop:float"],
    &[data-sockettype~="stop:color"],
    &[data-sockettype~="stop:angle"],
    &[data-sockettype~="stop:integer"],
    &[data-sockettype~="stop:length"],
    &[data-sockettype~="array<stop:float>"],
    &[data-sockettype~="array<stop:color>"],
    &[data-sockettype~="array<stop:angle>"],
    &[data-sockettype~="array<stop:integer>"],
    &[data-sockettype~="array<stop:length>"] {
        --tl: var(--flavour-info);
        --br: var(--flavour-info);
    }
    &[data-sockettype~="path"],
    &[data-sockettype~="pathOp"],
    &[data-sockettype~="array<pathOp>"] {
        --tl: var(--flavour-emphasis);
        --br: var(--flavour-emphasis);
    }
    &[data-sockettype~="sequence"] {
        --tl: var(--flavour-danger);
        --br: var(--flavour-danger);
    }
    &[data-sockettype~="distribution"] {
        --tl: var(--flavour-help);
        --br: var(--flavour-help);
    }
    &[data-sockettype~="shape"],
    &[data-sockettype~="layer"],
    &[data-sockettype~="array<layer>"] {
        --tl: var(--flavour-confirm);
        --br: var(--flavour-confirm);
    }

    &[data-socketmod="any"] {
        --tl: var(--flavour-base);
        --br: var(--flavour-base);
    }

    &[data-sockettype~="color"][data-sockettype~="gradient"] {
        --tl: var(--flavour-base);
        --tr: var(--flavour-info);
    }

    background: linear-gradient(135deg, oklch(from var(--tl) calc(l * 0.5) calc(c * 0.5) h) 0 50%, oklch(from var(--br) calc(l * 0.5) calc(c * 0.5) h) 50% 100%);
    border-top-color: var(--tl);
    border-left-color: var(--tl);
    border-bottom-color: var(--br);
    border-right-color: var(--br);

    &[data-state~="connected"] {
        background: linear-gradient(135deg, var(--tl) 0 50%, var(--br) 50% 100%);
        border-top-color: var(--tl);
        border-left-color: var(--tl);
        border-bottom-color: var(--br);
        border-right-color: var(--br);
    }

    &[data-state~="invalid"] {
        border-color: #333;
        background: linear-gradient(135deg, #000 0 50%, #000 50% 100%);

        &[data-state~="connected"] {
            background: linear-gradient(135deg, #333 0 50%, #333 50% 100%);
            border-color: #333;
        }
    }

    &:hover:not([data-state~="invalid"]),
    &[data-state~="active"] {
        outline-color: #fff;

        border-top-color: oklch(from var(--tl) calc(l * 1.2) c h);
        border-left-color: oklch(from var(--tl) calc(l * 1.2) c h);
        border-bottom-color: oklch(from var(--br) calc(l * 1.2) c h);
        border-right-color: oklch(from var(--br) calc(l * 1.2) c h);

        background: linear-gradient(135deg, oklch(from var(--tl) calc(l * 0.65) calc(c * 0.65) h) 0 50%, oklch(from var(--br) calc(l * 0.65) calc(c * 0.65) h) 50% 100%);

        &[data-state~="connected"] {
            background: linear-gradient(135deg, oklch(from var(--tl) calc(l * 1.2) c h) 0 50%, oklch(from var(--br) calc(l * 1.2) c h) 50% 100%);
            border-top-color: oklch(from var(--tl) calc(l * 1.2) c h);
            border-left-color: oklch(from var(--tl) calc(l * 1.2) c h);
            border-bottom-color: oklch(from var(--br) calc(l * 1.2) c h);
            border-right-color: oklch(from var(--br) calc(l * 1.2) c h);
        }
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

    const [, paneControls] = useDragPaneInternal();
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
        const zoom = paneControls.get().z;

        const x1 = (fromPoint.left - basis.left) / zoom;
        const y1 = (fromPoint.top - basis.top) / zoom;
        const x2 = (mouse.x - basis.left) / zoom;
        const y2 = (mouse.y - basis.top) / zoom;

        path.setAttribute("d", `M ${x1},${y1} L ${x2},${y2}`);
    }, [paneControls]);

    const mousePos = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        const onPointerMove = (evt: PointerEvent) => {
            mousePos.current = { x: evt.clientX, y: evt.clientY };
            updatePath();
        };

        document.addEventListener("pointermove", onPointerMove);
        return () => {
            document.removeEventListener("pointermove", onPointerMove);
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
    width: auto;
    height: auto;
    z-index: 0;
    pointer-events: none;

    --anchorFrom: anchor(var(--source) center);

    inset: 0;

    min-width: 1px;
    min-height: 1px;

    & > .markerFrom {
        position: absolute;
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
            &[data-sockettype~="tokens:length"] {
                --flavour: var(--flavour-accent);
            }
            &[data-sockettype~="gradient"],
            &[data-sockettype~="stop:float"],
            &[data-sockettype~="stop:color"],
            &[data-sockettype~="stop:angle"],
            &[data-sockettype~="stop:integer"],
            &[data-sockettype~="stop:length"],
            &[data-sockettype~="array<stop:float>"],
            &[data-sockettype~="array<stop:color>"],
            &[data-sockettype~="array<stop:angle>"],
            &[data-sockettype~="array<stop:integer>"],
            &[data-sockettype~="array<stop:length>"] {
                --flavour: var(--flavour-info);
            }

            &[data-sockettype~="path"],
            &[data-sockettype~="pathOp"],
            &[data-sockettype~="array<pathOp>"] {
                --flavour: var(--flavour-emphasis);
            }
            &[data-sockettype~="sequence"] {
                --flavour: var(--flavour-danger);
            }
            &[data-sockettype~="distribution"] {
                --flavour: var(--flavour-help);
            }
            &[data-sockettype~="shape"],
            &[data-sockettype~="layer"],
            &[data-sockettype~="array<layer>"] {
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
