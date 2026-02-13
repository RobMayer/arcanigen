import { createContext, DetailedHTMLProps, FocusEvent, HTMLAttributes, ReactNode, RefObject, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import styled from "styled-components";
import { useStable } from "../../util/hooks/useStable";
import { FastContextMember, useFastContextMember } from "../../util/hooks/useFastContext";

export namespace DragMove {
    type XY = { x: number; y: number };
    type UseHandleOptions = {
        onChange?: (coordinates: XY) => void;
        onFinish?: (coordinates: XY) => void;
        onDelta?: (delta: XY) => void;
        button?: number | "any";
    };

    const CTX = createContext<FastContextMember<string[]> | undefined>(undefined);

    export const Provider = ({ children }: { children?: ReactNode }) => {
        const value = useFastContextMember<string[]>([]);
        return <CTX value={value}>{children}</CTX>;
    };

    const NOCONTEXTSUB = () => () => {};

    const useDragMoveContext = (id: string) => {
        const ctx = useContext(CTX);

        const selector = useCallback(() => {
            return Math.max(ctx?.get()?.indexOf(id) ?? 0, 0);
        }, [ctx, id]);

        const value = useSyncExternalStore(ctx?.subscribe ?? NOCONTEXTSUB, selector);

        const setToTop = useCallback(() => {
            if (ctx) {
                ctx.ref.current = ctx.ref.current.filter((each) => each !== id);
                ctx.ref.current.push(id);
                ctx.notify();
            }
        }, [ctx, id]);

        // register and unregister patterns
        useEffect(() => {
            if (ctx) {
                ctx.ref.current.push(id);
                ctx.notify();
            }

            return () => {
                if (ctx) {
                    ctx.ref.current = ctx.ref.current.filter((each) => each !== id);
                    ctx.notify();
                }
            };
        }, [id, ctx]);

        return [value, setToTop] as const;
    };

    type DragMoveProps = {
        position: XY;
    } & DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

    const TheDiv = styled.div`
        position: absolute;
        top: attr(data-y px, 0px);
        left: attr(data-x px, 0px);
    `;

    export const Item = ({ position, onFocus, style, ...props }: DragMoveProps) => {
        const onFocusRef = useStable(onFocus);
        const id = useId();
        const [zIndex, setToTop] = useDragMoveContext(id);

        const mergedStyle = useMemo(() => {
            return { ...style, zIndex };
        }, [style, zIndex]);

        const handleFocus = useCallback(
            (event: FocusEvent<HTMLDivElement>) => {
                setToTop();
                onFocusRef.current?.(event);
            },
            [setToTop],
        );

        return <TheDiv {...props} style={mergedStyle} data-x={position.x} data-y={position.y} data-trhmarker={"dragmove"} onFocus={handleFocus} tabIndex={-1} />;
    };

    export const useHandle = (handleRef: RefObject<HTMLElement | null>, value: XY, { onChange, onFinish, onDelta, button = 0 }: UseHandleOptions) => {
        const [local, setLocal] = useState<XY>(value);
        const internalRef = useRef<XY>(value);

        const handleChange = useCallback(({ x, y }: XY) => {
            setLocal((prev) => {
                if (prev.x !== x || prev.y !== y) {
                    return { x, y };
                }
                return prev;
            });
            const { x: oldX, y: oldY } = internalRef.current;
            if (x !== oldX || y !== oldY) {
                internalRef.current = { x, y };
            }
        }, []);

        useEffect(() => {
            handleChange(value);
        }, [value, handleChange]);

        const onChangeRef = useStable(onChange);
        const onFinishRef = useStable(onFinish);
        const onDeltaRef = useStable(onDelta);

        useEffect(() => {
            const handle = handleRef.current;

            if (handle) {
                const mouseMove = (evt: globalThis.MouseEvent) => {
                    const zoom = handle.currentCSSZoom * devicePixelRatio;
                    const dX = evt.movementX / zoom;
                    const dY = evt.movementY / zoom;
                    const { x, y } = { x: internalRef.current.x + dX, y: internalRef.current.y + dY };
                    handleChange({ x, y });
                    onChangeRef.current?.(internalRef.current);
                    onDeltaRef.current?.({ x: dX, y: dY });
                };

                const mouseUp = () => {
                    onFinishRef.current?.(internalRef.current);
                    document.removeEventListener("mousemove", mouseMove);
                    document.removeEventListener("mouseup", mouseUp);
                };

                const mouseDown = (evt: globalThis.MouseEvent) => {
                    if (button === "any" || evt.button === button) {
                        evt.handled = "active";
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
        }, [handleChange, handleRef, button]);

        return local;
    };
}
