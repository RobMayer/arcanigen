import { useMemo, CSSProperties, useRef, useState, useCallback } from "react";
import styled, { keyframes } from "styled-components";
import { SocketTypes } from "../../definitions/betterTypes";
import { Project } from "../../state/project";
import { useResizeObserver } from "../../util/hooks/useResizeObserver";

const keyframesMarch = keyframes`
to {
    stroke-dashoffset: var(--animMarch);
}
`;

export const GraphLink = styled(({ className, linkId }: { linkId: string; className?: string }) => {
    const link = Project.useLink(linkId);

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

            const dx = Math.max(200, Math.abs(x2 - x1) * 0.1);
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
                onFocus={handleFocus}
                onBlur={handleBlur}
                data-state={isSelected ? "selected" : undefined}
                data-flavour={SocketTypes.FLAVOURS[link.type]}
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
