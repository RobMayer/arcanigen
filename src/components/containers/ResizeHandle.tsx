import { RefObject, useCallback, useEffect, useRef } from "react";
import styled from "styled-components";
import { useStable } from "../../util/hooks/useStable";

export const ResizeHandle = styled(
    ({
        value,
        containerRef,
        onValue,
        onCommit,
        orientation = "horizontal",
        min = 0.2,
        max = 0.8,
        defaultValue = 0.5,
        disabled,
        className,
    }: {
        value: number;
        containerRef: RefObject<HTMLElement | null>;
        onValue?: (ratio: number) => void;
        onCommit?: (ratio: number) => void;
        orientation?: "horizontal" | "vertical";
        min?: number;
        max?: number;
        defaultValue?: number;
        disabled?: boolean;
        className?: string;
    }) => {
        const onValueRef = useStable(onValue);
        const onCommitRef = useStable(onCommit);
        const valueRef = useStable(value);
        const disabledRef = useStable(disabled);
        const handleRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            const el = handleRef.current;
            const container = containerRef.current;
            if (el && container) {
                const horizontal = orientation === "horizontal";
                let startPos = 0;
                let startRatio = 0;

                const getRatio = (evt: MouseEvent) => {
                    const rect = container.getBoundingClientRect();
                    const delta = horizontal ? (evt.clientX - startPos) / rect.width : (evt.clientY - startPos) / rect.height;
                    return Math.max(min, Math.min(max, startRatio + delta));
                };

                const mouseMove = (evt: MouseEvent) => {
                    onValueRef.current?.(getRatio(evt));
                };

                const mouseUp = (evt: MouseEvent) => {
                    onCommitRef.current?.(getRatio(evt));
                    document.removeEventListener("mousemove", mouseMove);
                    document.removeEventListener("mouseup", mouseUp);
                };

                const mouseDown = (evt: MouseEvent) => {
                    if (evt.detail > 1 || disabledRef.current) return;
                    startPos = horizontal ? evt.clientX : evt.clientY;
                    startRatio = valueRef.current;
                    document.addEventListener("mousemove", mouseMove);
                    document.addEventListener("mouseup", mouseUp);
                };

                el.addEventListener("mousedown", mouseDown);
                return () => {
                    el.removeEventListener("mousedown", mouseDown);
                    document.removeEventListener("mouseup", mouseUp);
                    document.removeEventListener("mousemove", mouseMove);
                };
            }
        }, [containerRef, orientation, min, max]);

        const reset = useCallback(() => {
            onCommitRef.current?.(defaultValue);
        }, [defaultValue]);

        return (
            <div className={className} ref={handleRef} data-flavour={"accent"} data-orientation={orientation} data-state={disabled ? "disabled" : undefined} onDoubleClick={reset}>
                <div />
            </div>
        );
    },
)`
    position: absolute;
    border-radius: 100vw;
    corner-shape: bevel;
    display: grid;
    place-items: center;

    &[data-orientation="horizontal"] {
        height: 25%;
        align-self: center;
        left: -6px;
        right: -6px;
        cursor: col-resize;

        & > div {
            width: 2px;
            height: 100%;
        }
    }

    &[data-orientation="vertical"] {
        width: 25%;
        justify-self: center;
        top: -6px;
        bottom: -6px;
        left: 0;
        right: 0;
        cursor: row-resize;

        & > div {
            height: 2px;
            width: 100%;
        }
    }

    &[data-state~="disabled"] {
        pointer-events: none;
        opacity: 0.4;
        filter: saturate(0);
    }

    & > div {
        background: oklch(from var(--flavour) calc(l + 0.1) c h);
        align-self: center;
        justify-self: center;
    }
`;
