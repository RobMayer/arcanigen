import { Ref, useRef, useCallback, RefObject, RefCallback } from "react";

export const useCombinedRef = <T,>(ref: Ref<T> | undefined): [RefObject<T | null>, RefCallback<T>] => {
    const innerRef = useRef<T | null>(null);
    const combinedRef = useCallback(
        (element: T) => {
            innerRef.current = element;
            if (ref) {
                if (typeof ref === "function") {
                    ref(element);
                } else {
                    ref.current = element;
                }
            }
        },
        [ref],
    );

    return [innerRef, combinedRef];
};
