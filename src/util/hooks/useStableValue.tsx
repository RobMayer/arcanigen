import { useRef } from "react";

const shallowEqual = <T,>(a: T, b: T): boolean => {
    if (a === b) return true;
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((item, i) => item === b[i]);
};

/**
 * Returns a stable reference to a value that might be an array or a scalar.
 * Only updates the reference if the contents actually change.
 * Useful for stabilizing inline arrays passed as props (e.g., `snap={[0, 0.5, 1]}`).
 *
 * Uses shallow comparison for arrays, strict equality for scalars.
 */
export const useStableValue = <T,>(value: T): T => {
    const ref = useRef(value);

    if (!shallowEqual(ref.current, value)) {
        ref.current = value;
    }

    return ref.current;
};
