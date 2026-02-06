import { ChangeEvent, Ref, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStable } from "../../util/hooks/useStable";
import { useCombinedRef } from "../../util/hooks/useCombinedRef";
import { BoundsOf } from "../../types";
import { EmptyOr, NumericString } from "../../util/misc";
import styled from "styled-components";
import { AbstractNumberInput, AbstractInputProps } from "../abstract/Inputs";

type ParsedBounds = {
    min?: { value: number; inclusive: boolean };
    max?: { value: number; inclusive: boolean };
};

const REGEX_MIN = /^(>=?)([+-]?[\d.]+(?:[eE][+-]?\d+)?)/;
const REGEX_MAX = /(<=?)([+-]?[\d.]+(?:[eE][+-]?\d+)?)/;

function parseBounds(bounds?: string): ParsedBounds {
    if (!bounds) return {};

    const result: ParsedBounds = {};

    // Match min bound: > or >= followed by a number
    const minMatch = bounds.match(REGEX_MIN);
    if (minMatch) {
        result.min = {
            value: Number(minMatch[2]),
            inclusive: minMatch[1] === ">=",
        };
    }

    // Match max bound: < or <= followed by a number
    const maxMatch = bounds.match(REGEX_MAX);
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
    value: EmptyOr<NumericString>;
    onValue?: (n: EmptyOr<NumericString>) => void;
    onCommit?: (n: EmptyOr<NumericString>) => void;
    onSubmit?: (v: EmptyOr<NumericString>) => void; // fires when you hit enter, even if no change was made
    bounds?: BoundsOf<number>;
    step?: number;
    disabled?: boolean;
    ref?: Ref<HTMLInputElement>;
};

const NumberInput = styled(({ value, onValue, onCommit, onSubmit, ref, step, bounds, onChange, onKeyDown, required, ...rest }: Omit<AbstractInputProps, "value" | "min" | "max" | "step"> & NumberInputProps) => {
    const onKeyDownRef = useStable(onKeyDown);
    const onChangeRef = useStable(onChange);

    const [innerRef, makeRef] = useCombinedRef(ref);
    const valueRef = useRef<string>(value);
    const [cache, setCache] = useState<string>(value);

    const parsedBounds = useMemo(() => {
        return parseBounds(bounds);
    }, [bounds]);

    useEffect(() => {
        if (valueRef.current !== value) {
            valueRef.current = value;
            setCache(value);
        }
    }, [value]);

    const onValueRef = useStable(onValue);
    const onCommitRef = useStable(onCommit);
    const onSubmitRef = useStable(onSubmit);

    // Update custom validity whenever value, bounds, or step changes
    useEffect(() => {
        const el = innerRef.current;
        if (el) {
            if (value === "") {
                el.setCustomValidity(required ? "Value is required" : "");
            } else {
                const asNumber = Number(value);
                if (!isNaN(asNumber)) {
                    const error = validateNumber(asNumber, parsedBounds, step);
                    el.setCustomValidity(error);
                }
            }
        }
    }, [value, bounds, step, parsedBounds, required]);

    const handleChange = useCallback(
        (evt: ChangeEvent<HTMLInputElement>) => {
            onChangeRef.current?.(evt);
            if (evt.nativeEvent.handled) {
                return;
            }
            evt.nativeEvent.handled = "implied";
            const v = evt.target.value;
            setCache(v);

            // Empty is valid when not required
            if (!required && v === "") {
                evt.target.setCustomValidity("");
                onValueRef.current?.("");
                return;
            }

            const asNumber = Number(v);
            if (v === "" || isNaN(asNumber)) {
                evt.target.setCustomValidity("Value is required");
                return;
            }

            // Validate and set custom validity
            const error = validateNumber(asNumber, parsedBounds, step);
            evt.target.setCustomValidity(error);

            // Only call onValue if valid
            if (evt.target.validity.valid) {
                onValueRef.current?.(v as NumericString);
            }
        },
        [parsedBounds, step, required],
    );

    useEffect(() => {
        const el = innerRef.current;
        if (el) {
            const handler = (evt: Event) => {
                if (evt.handled) {
                    return;
                }
                evt.handled = "implied";

                const v = el.value;

                // Empty is valid when not required
                if (!required && v === "") {
                    setCache(v);
                    el.setCustomValidity("");
                    onCommitRef.current?.("");
                    return;
                }

                const asNumber = Number(v);

                if (v === "" || isNaN(asNumber)) {
                    setCache(valueRef.current);
                    el.setCustomValidity("");
                    return;
                }

                // Validate and set custom validity
                const error = validateNumber(asNumber, parsedBounds, step);

                // Revert to previous value if invalid, otherwise commit
                if (error) {
                    setCache(valueRef.current);
                    el.setCustomValidity("");
                } else {
                    setCache(v);
                    el.setCustomValidity("");
                    onValueRef.current?.(v as NumericString);
                    onCommitRef.current?.(v as NumericString);
                }
            };
            el.addEventListener("change", handler);
            return () => {
                el.removeEventListener("change", handler);
            };
        }
    }, [parsedBounds, step, required]);

    // Custom arrow key handling for proper step increments and bounds enforcement
    const handleKeyDown = useCallback(
        (evt: React.KeyboardEvent<HTMLInputElement>) => {
            onKeyDownRef.current?.(evt);
            if (evt.nativeEvent.handled) {
                return;
            }

            // Handle Enter key for onSubmit
            if (evt.key === "Enter") {
                evt.nativeEvent.handled = "implied";
                const v = evt.currentTarget.value;

                // Empty is valid when not required
                if (!required && v === "") {
                    onSubmitRef.current?.("");
                    return;
                }

                const currentValue = Number(v);
                if (!isNaN(currentValue)) {
                    const error = validateNumber(currentValue, parsedBounds, step);
                    if (error === "") {
                        onSubmitRef.current?.(v as NumericString);
                    }
                }
                return;
            }

            if (evt.key !== "ArrowUp" && evt.key !== "ArrowDown") return;
            evt.nativeEvent.handled = "implied";

            evt.preventDefault();

            const currentValue = Number(evt.currentTarget.value);
            if (isNaN(currentValue)) return;

            const stepAmount = step ?? 1;
            const delta = evt.key === "ArrowUp" ? stepAmount : -stepAmount;
            const newValue = currentValue + delta;

            // Enforce bounds
            if (parsedBounds.min) {
                const { value: minVal, inclusive } = parsedBounds.min;
                const limit = inclusive ? minVal : minVal + Number.EPSILON;
                if (newValue < limit) return; // Don't go below min
            }
            if (parsedBounds.max) {
                const { value: maxVal, inclusive } = parsedBounds.max;
                const limit = inclusive ? maxVal : maxVal - Number.EPSILON;
                if (newValue > limit) return; // Don't go above max
            }

            // Update the input value and trigger change
            const newValueStr = String(newValue) as NumericString;
            setCache(newValueStr);
            const error = validateNumber(newValue, parsedBounds, step);
            evt.currentTarget.setCustomValidity(error);

            if (error === "") {
                onValueRef.current?.(newValueStr);
                onCommitRef.current?.(newValueStr);
            }
        },
        [step, parsedBounds, required],
    );

    // Always use step="any" to disable HTML5 step validation (we handle it with proper floating point tolerance)
    return <AbstractNumberInput {...rest} type="number" value={cache} onChange={handleChange} onKeyDown={handleKeyDown} ref={makeRef} step="any" />;
})``;

export default NumberInput;
