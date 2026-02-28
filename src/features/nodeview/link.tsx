import { useMemo, CSSProperties, useRef, useCallback, KeyboardEvent, useState, DragEvent } from "react";
import styled, { keyframes } from "styled-components";
import { Project } from "../../state/project";
import { useResizeObserver } from "../../util/hooks/useResizeObserver";
import { ActionButton } from "../../components/buttons/ActionButton";
import { Icon, ICONS } from "../../components/Icon";
import { NodeTypes, SocketTypes } from "../../definitions/betterTypes";
import { NODE_DRAG_MIME, NODE_TYPE_MIME_PREFIX } from "../nodedrawer";
import { useGraphId } from "../../state/graphId";
import { useDragPaneInternal } from "../../components/wrappers/DragPane";

const keyframesMarch = keyframes`
to {
    stroke-dashoffset: var(--animMarch);
}
`;

export const GraphLink = styled(({ className, linkId }: { linkId: string; className?: string }) => {
    const link = Project.useLink(linkId);
    const { removeLinks, interjectNode } = Project.useMethods();
    const graphId = useGraphId();
    const mc = Project.useMC();
    const [, paneControls] = useDragPaneInternal();

    const style = useMemo(() => {
        if (!link) {
            return {};
        }
        return {
            "--fromTarget": `anchor(--socket_${link.fromNode}_${link.fromSocket} center, anchor(--socketFB_${link.fromNode}_${link.fromSocket} center, anchor(--nodeFB_${link.fromNode}_out center, 0)))`,
            "--toTarget": `anchor(--socket_${link.toNode}_${link.toSocket} center, anchor(--socketFB_${link.toNode}_${link.toSocket} center, anchor(--nodeFB_${link.toNode}_in center, 0)))`,
            "--fromNode": `--node_${link.fromNode}`,
            "--toNode": `--node_${link.toNode}`,
        } as CSSProperties;
    }, [link]);

    const ref = useRef<HTMLDivElement>(null);
    const fromMarkerRef = useRef<HTMLDivElement>(null);
    const toMarkerRef = useRef<HTMLDivElement>(null);
    const pathContainer = useRef<SVGPathElement>(null);

    const onResize = useCallback((entry: ResizeObserverEntry) => {
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
        }
    }, [paneControls]);

    useResizeObserver(ref, onResize);

    const deleteMe = useCallback(() => {
        removeLinks(linkId);
    }, [removeLinks, linkId]);

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
            const nodeTypeKey = NodeTypes.list().find((nt) => nt.type.toLowerCase() === rawKey)?.type as NodeTypes.Key | undefined;
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
                data-linktype={link.type}
                data-typeany={link.type === SocketTypes.toCSS(SocketTypes.ANY) ? "" : undefined}
                onKeyDown={handleKeyDown}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                data-state={isDropping ? "dropping" : undefined}
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
                <ActionButton onClick={deleteMe} data-part="deleteButton" flavour={"inherit"}>
                    <Icon shape={ICONS.Close} />
                </ActionButton>
            </div>
        </>
    );
})`
    position: absolute;
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

    inset: min(var(--anchorT), var(--anchorB)) min(var(--anchorR), var(--anchorL)) min(var(--anchorB), var(--anchorT)) min(var(--anchorL), var(--anchorR));

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

    &[data-linktype="shape"] > svg > g > path,
    &[data-linktype="layer"] > svg > g > path,
    &[data-linktype="shape layer"] > svg > g > path,
    &[data-linktype="layer shape"] > svg > g > path {
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

    &[data-state~="dropping"] > svg > g > path[data-part="select"],
    &:focus-within > svg > g > path[data-part="select"] {
        stroke: #fff6;
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
    &[data-linktype~="tokens<length>"] {
        --flavour: var(--flavour-accent);
    }
    &[data-linktype~="path"] {
        --flavour: var(--flavour-emphasis);
    }
    &[data-linktype~="distribution"] {
        --flavour: var(--flavour-info);
    }
    &[data-linktype~="sequence"],
    &[data-linktype~="array<layer>"] {
        --flavour: var(--flavour-danger);
    }
    &[data-linktype~="shape"],
    &[data-linktype~="layer"] {
        --flavour: var(--flavour-confirm);
    }

    &[data-typeany] {
        --flavour: var(--flavour-base);
    }
`;
