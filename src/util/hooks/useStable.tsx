import { useRef, useEffect } from "react";

export const useStable = <T,>(value: T) => {
    const ref = useRef<T>(value);
    useEffect(() => {
        ref.current = value;
    }, [value]);
    return ref;
};
