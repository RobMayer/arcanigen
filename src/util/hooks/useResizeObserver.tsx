import { Ref, useEffect } from "react";
import { useStable } from "./useStable";

export const useResizeObserver = (ref: Ref<HTMLElement | null> | undefined, cb: (entry: ResizeObserverEntry) => void) => {
    const cbRef = useStable(cb);

    useEffect(() => {
        const el = ref && "current" in ref ? ref.current : null;
        if (!el) {
            return;
        }
        const observer = new ResizeObserver((entries) => {
            cbRef.current(entries[0]);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [ref, cbRef]);
};
