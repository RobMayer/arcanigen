import { ChangeEvent, Ref, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStable } from "../../util/hooks/useStable";
import { useCombinedRef } from "../../util/hooks/useCombinedRef";

type MaxBound = `<${number}` | `<=${number}`;
type MinBound = `>${number}` | `>=${number}`;
type RangeBound = `${MinBound}${MaxBound}`;

type ParsedBounds = {
    min?: { value: number; inclusive: boolean };
    max?: { value: number; inclusive: boolean };
};

function parseBounds(bounds?: string): ParsedBounds {
    if (!bounds) return {};

    const result: ParsedBounds = {};

    // Match min bound: > or >= followed by a number
    const minMatch = bounds.match(/^(>=?)([+-]?[\d.]+(?:[eE][+-]?\d+)?)/);
    if (minMatch) {
        result.min = {
            value: Number(minMatch[2]),
            inclusive: minMatch[1] === ">=",
        };
    }

    // Match max bound: < or <= followed by a number
    const maxMatch = bounds.match(/(<=?)([+-]?[\d.]+(?:[eE][+-]?\d+)?)/);
    if (maxMatch) {
        result.max = {
            value: Number(maxMatch[2]),
            inclusive: maxMatch[1] === "<=",
        };
    }

    return result;
}

function validateNumber(value: number, bounds: ParsedBounds, step?: number): string {
    // Check min bound
    if (bounds.min) {
        const { value: minVal, inclusive } = bounds.min;
        if (inclusive ? value < minVal : value <= minVal) {
            return inclusive ? `Value must be at least ${minVal}` : `Value must be greater than ${minVal}`;
        }
    }

    // Check max bound
    if (bounds.max) {
        const { value: maxVal, inclusive } = bounds.max;
        if (inclusive ? value > maxVal : value >= maxVal) {
            return inclusive ? `Value must be at most ${maxVal}` : `Value must be less than ${maxVal}`;
        }
    }

    // Check step (with floating point tolerance)
    if (step !== undefined && step > 0) {
        const minBase = bounds.min?.value ?? 0;
        const steps = Math.round((value - minBase) / step);
        const expectedValue = minBase + steps * step;
        const tolerance = step * 1e-10; // Small epsilon for floating point
        if (Math.abs(value - expectedValue) > tolerance) {
            return `Value must be a multiple of ${step}`;
        }
    }

    return ""; // Valid
}

type NumberInputProps = {
    value: number;
    onValue?: (n: number) => void;
    onCommit?: (n: number) => void;
    bounds?: RangeBound | MaxBound | MinBound;
    step?: number;
    tooltip?: string;
    disabled?: boolean;
    ref?: Ref<HTMLInputElement>;
};

const NumberInput = ({ value, onValue, onCommit, ref, tooltip, disabled, step, bounds }: NumberInputProps) => {
    const [innerRef, makeRef] = useCombinedRef(ref);
    const valueRef = useRef<number>(value);
    const [cache, setCache] = useState<string>(`${value}`);

    const parsedBounds = useMemo(() => {
        return parseBounds(bounds);
    }, [bounds]);

    useEffect(() => {
        if (valueRef.current !== value) {
            valueRef.current = value;
            setCache(`${value}`);
        }
    }, [value]);

    const onValueRef = useStable(onValue);
    const onCommitRef = useStable(onCommit);

    // Update custom validity whenever value, bounds, or step changes
    useEffect(() => {
        const el = innerRef.current;
        if (el && !isNaN(value)) {
            const error = validateNumber(value, parsedBounds, step);
            el.setCustomValidity(error);
        }
    }, [value, bounds, step, parsedBounds]);

    const handleChange = useCallback(
        (evt: ChangeEvent<HTMLInputElement>) => {
            const v = evt.target.value;
            const asNumber = Number(evt.target.value);
            setCache(v);

            if (v === "" || isNaN(asNumber)) {
                evt.target.setCustomValidity("");
                return;
            }

            // Validate and set custom validity
            const error = validateNumber(asNumber, parsedBounds, step);
            evt.target.setCustomValidity(error);

            // Only call onValue if valid
            if (evt.target.validity.valid) {
                onValueRef.current?.(asNumber);
            }
        },
        [parsedBounds, step],
    );

    useEffect(() => {
        const el = innerRef.current;
        if (el) {
            const handler = () => {
                const v = el.value;
                const asNumber = Number(v);

                if (v === "" || isNaN(asNumber)) {
                    el.setCustomValidity("");
                    setCache(`${valueRef.current}`);
                    return;
                }

                // Validate and set custom validity
                const error = validateNumber(asNumber, parsedBounds, step);
                el.setCustomValidity(error);

                // Revert to previous value if invalid, otherwise commit
                if (!el.validity.valid) {
                    setCache(`${valueRef.current}`);
                } else {
                    setCache(v);
                    onCommitRef.current?.(asNumber);
                }
            };
            el.addEventListener("change", handler);
            return () => {
                el.removeEventListener("change", handler);
            };
        }
    }, [parsedBounds, step]);
    return <input type="number" value={cache} onChange={handleChange} ref={makeRef} title={tooltip} disabled={disabled} step={step ?? "any"} />;
};

export default NumberInput;
