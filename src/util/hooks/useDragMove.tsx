import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { useStable } from "./useStable";

type XY = { x: number; y: number };

type Callback = (coordinate: XY) => void;
type Options = {
    onChange?: Callback;
    onFinish?: Callback;
    button?: number | "any";
};

export const useDragMove = (handleRef: RefObject<HTMLElement | null>, value: XY, { onChange, onFinish, button = 0 }: Options) => {
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

    useEffect(() => {
        const handle = handleRef.current;

        if (handle) {
            const mouseMove = (evt: MouseEvent) => {
                const zoom = handle.currentCSSZoom * devicePixelRatio;
                const dX = evt.movementX / zoom;
                const dY = evt.movementY / zoom;
                const { x, y } = { x: internalRef.current.x + dX, y: internalRef.current.y + dY };
                handleChange({ x, y });
                onChangeRef.current?.(internalRef.current);
            };

            const mouseUp = () => {
                onFinishRef.current?.(internalRef.current);
                document.removeEventListener("mousemove", mouseMove);
                document.removeEventListener("mouseup", mouseUp);
            };

            const mouseDown = (evt: MouseEvent) => {
                if (button === "any" || evt.button === button) {
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
