import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStable } from "../../util/hooks/useStable";
import { EmptyOr } from "../../util/misc";
import styled from "styled-components";
import { AbstractNumberInput, AbstractInputProps } from "../abstract/Inputs";
import { NumericString } from "../../definitions/datatypes/numericString";

function isInBounds(value: number, min?: number, max?: number): boolean {
    if (min !== undefined && value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
}

// Wrap a value to a range, normalizing boundary values
function wrapValue(value: number, min: number, max: number): number {
    const range = max - min;
    let wrapped = ((((value - min) % range) + range) % range) + min;
    // Normalize boundary: favor 0, then positive, then closest to 0
    if (wrapped === min || wrapped === max) {
        if (min === 0 || max === 0) wrapped = 0;
        else if (min > 0) wrapped = min;
        else if (max > 0) wrapped = max;
        else wrapped = Math.max(min, max);
    }
    return wrapped;
}

// Check if a value is valid for the given configuration
function isValidValue(value: number, min: number | undefined, max: number | undefined, doesWrap: boolean): boolean {
    if (!isFinite(value)) return false;
    if (doesWrap) return true; // Any finite value can be wrapped
    return isInBounds(value, min, max);
}

// Normalize value based on wrapping rules (wraps if doesWrap, otherwise returns as-is)
function normalizeWrappedValue(value: number, min: number | undefined, max: number | undefined, doesWrap: boolean): number {
    if (doesWrap && min !== undefined && max !== undefined) {
        return wrapValue(value, min, max);
    }
    return value;
}

// Strict pattern for syntactic completeness (rejects "3." during typing)
const FLOAT_REGEX = /^[+-]?\d+(\.\d+)?$/;

// Check if a string is syntactically complete
function isComplete(v: string): boolean {
    return FLOAT_REGEX.test(v);
}

// Normalize a string to its canonical numeric form, or null if not a valid number
function normalize(v: string): string | null {
    const n = Number(v);
    if (isNaN(n)) return null;
    return String(n);
}

// Apply precision to a number by truncating
// positive: truncate to that many decimal places
// zero: truncate to integer
// negative: truncate to that power of 10 (e.g., -3 truncates to nearest 1000)
function applyPrecision(n: number, precision: number): number {
    const factor = Math.pow(10, precision);
    return Math.trunc(n * factor) / factor;
}

// Check if a number already adheres to the given precision
function adheresPrecision(n: number, precision: number): boolean {
    return applyPrecision(n, precision) === n;
}

// Format a number for display with the correct decimal places
// For positive precision, pads with trailing zeros as needed
// For zero or negative precision, just returns the string representation
function formatForDisplay(n: number, precision: number): string {
    if (precision > 0) {
        return n.toFixed(precision);
    }
    return String(n);
}

type NumericInput = {
    value: EmptyOr<NumericString.Type>;
    onValue?: (n: EmptyOr<NumericString.Type>) => void;
    onCommit?: (n: EmptyOr<NumericString.Type>) => void;
    onConfirm?: (v: EmptyOr<NumericString.Type>) => void; // fires when you hit enter, even if no change was made
    min?: number | EmptyOr<NumericString.Type>;
    max?: number | EmptyOr<NumericString.Type>;
    step?: number | EmptyOr<NumericString.Type>;
    precision?: number | EmptyOr<NumericString.Type>;
    wrap?: number | EmptyOr<NumericString.Type>;
};

const NumericInput = styled(
    ({
        value,
        onBlur,
        onValue,
        onCommit,
        onConfirm,
        min: minProp,
        max: maxProp,
        step: stepProp,
        onChange,
        onKeyDown,
        required,
        precision: precisionProp,
        wrap: wrapProp,
        ...rest
    }: Omit<AbstractInputProps, "value" | "min" | "max" | "step" | "pattern"> & NumericInput) => {
        const { precision, min, max, step, wrap } = useMemo(() => {
            const precisionRaw = typeof precisionProp === "number" ? precisionProp : (NumericString.Emptyable.asNumber(precisionProp ?? "") ?? undefined);
            const wrapRaw = typeof wrapProp === "number" ? wrapProp : (NumericString.Emptyable.asNumber(wrapProp ?? "") ?? undefined);
            const minRaw = typeof minProp === "number" ? minProp : (NumericString.Emptyable.asNumber(minProp ?? "") ?? undefined);
            const maxRaw = typeof maxProp === "number" ? maxProp : (NumericString.Emptyable.asNumber(maxProp ?? "") ?? undefined);
            const stepRaw = typeof stepProp === "number" ? stepProp : (NumericString.Emptyable.asNumber(stepProp ?? "") ?? undefined);

            // Derive min/max from wrap if not provided
            let theMin = minRaw ?? (wrapRaw !== undefined ? (maxRaw !== undefined ? maxRaw - wrapRaw : 0) : undefined);
            let theMax = maxRaw ?? (wrapRaw !== undefined ? (minRaw !== undefined ? minRaw + wrapRaw : wrapRaw) : undefined);

            // Swap if max < min
            if (theMin !== undefined && theMax !== undefined && theMax < theMin) {
                [theMin, theMax] = [theMax, theMin];
            }

            // Determine if wrapping should be enabled:
            // wrap is provided AND min and max are both defined AND distance(min, max) === wrap
            const doesWrap = wrapRaw !== undefined && theMin !== undefined && theMax !== undefined && theMax - theMin === wrapRaw;

            return {
                precision: precisionRaw === undefined ? undefined : Math.round(precisionRaw),
                min: theMin,
                max: theMax,
                step: stepRaw,
                wrap: doesWrap,
            };
        }, [precisionProp, minProp, maxProp, stepProp, wrapProp]);

        const onKeyDownRef = useStable(onKeyDown);
        const onBlurRef = useStable(onBlur);
        const onChangeRef = useStable(onChange);

        const valueRef = useRef<string>(value);
        const lastValidRef = useRef<string>(value); // tracks last valid value internally
        const [cache, setCache] = useState<string>(value);

        // On incoming prop change: only update display if normalized values differ
        // This prevents partials from being clobbered during typing
        useEffect(() => {
            if (valueRef.current !== value) {
                valueRef.current = value;
                lastValidRef.current = value; // prop change resets last valid
                const normalizedCache = normalize(cache);
                const normalizedValue = normalize(value);
                // Only update cache if the numeric values are different
                if (normalizedCache !== normalizedValue) {
                    setCache(value);
                }
            }
        }, [value, cache]);

        const onValueRef = useStable(onValue);
        const onCommitRef = useStable(onCommit);
        const onConfirmRef = useStable(onConfirm);

        // During typing (native 'input' event via React onChange)
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
                    lastValidRef.current = "";
                    // Only fire if value actually changed
                    if (valueRef.current !== "") {
                        onValueRef.current?.("");
                    }
                    return;
                }

                // Check syntactic completeness first (rejects "3.", "-", etc.)
                if (!isComplete(v)) {
                    evt.target.setCustomValidity("Not a valid number");
                    return;
                }

                const normalized = normalize(v);
                if (normalized === null) {
                    evt.target.setCustomValidity("Not a valid number");
                    return;
                }

                const asNumber = Number(normalized);
                if (!isValidValue(asNumber, min, max, wrap)) {
                    evt.target.setCustomValidity("Value is out of bounds");
                    return;
                }

                // Check if value adheres to precision (if specified)
                if (precision !== undefined && !adheresPrecision(asNumber, precision)) {
                    evt.target.setCustomValidity("Too many decimal places");
                    return;
                }

                // Valid - clear any error and update last valid
                evt.target.setCustomValidity("");
                lastValidRef.current = normalized;

                // Only fire onValue if the normalized value differs from current state
                const normalizedState = normalize(valueRef.current);
                if (normalized !== normalizedState) {
                    onValueRef.current?.(normalized as NumericString.Type);
                }
            },
            [min, max, required, precision, wrap],
        );

        // On blur - commit the value
        const handleBlur = useCallback(
            (evt: React.FocusEvent<HTMLInputElement>) => {
                onBlurRef.current?.(evt);
                if (evt.nativeEvent.handled) {
                    return;
                }

                const v = evt.currentTarget.value;

                // Empty is valid when not required
                if (!required && v === "") {
                    evt.currentTarget.setCustomValidity("");
                    setCache(v);
                    // Only fire onCommit if value changed from prop
                    if (valueRef.current !== "") {
                        onCommitRef.current?.("");
                    }
                    return;
                }

                const normalized = normalize(v);
                if (normalized === null) {
                    // Invalid - revert to last known good value
                    evt.currentTarget.setCustomValidity("");
                    setCache(lastValidRef.current);
                    return;
                }

                const asNumber = Number(normalized);
                if (!isValidValue(asNumber, min, max, wrap)) {
                    // Out of bounds - revert to last known good value
                    evt.currentTarget.setCustomValidity("");
                    setCache(lastValidRef.current);
                    return;
                }

                // Valid - apply wrapping if needed, then precision and format for display
                evt.currentTarget.setCustomValidity("");
                const wrappedValue = normalizeWrappedValue(asNumber, min, max, wrap);
                const finalValue = precision !== undefined ? String(applyPrecision(wrappedValue, precision)) : String(wrappedValue);
                const displayValue = precision !== undefined ? formatForDisplay(applyPrecision(wrappedValue, precision), precision) : String(wrappedValue);
                setCache(displayValue);

                // Only fire callbacks if value differs from prop
                const normalizedState = normalize(valueRef.current);
                if (finalValue !== normalizedState) {
                    // Only fire onValue if precision truncation changed the value from what was typed
                    if (finalValue !== normalized) {
                        onValueRef.current?.(finalValue as NumericString.Type);
                    }
                    onCommitRef.current?.(finalValue as NumericString.Type);
                }
                lastValidRef.current = finalValue;
            },
            [min, max, required, precision, wrap],
        );

        // Arrow key handling for step increments, Enter key for submit
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
                        evt.currentTarget.setCustomValidity("");
                        onConfirmRef.current?.("");
                        return;
                    }

                    const normalized = normalize(v);
                    if (normalized === null || !isValidValue(Number(normalized), min, max, wrap)) {
                        // Invalid - submit the last valid value
                        evt.currentTarget.setCustomValidity("");
                        setCache(lastValidRef.current);
                        onConfirmRef.current?.(lastValidRef.current as NumericString.Type);
                        return;
                    }

                    // Apply wrapping if needed, then precision and format for display on Enter
                    const asNumber = Number(normalized);
                    const wrappedValue = normalizeWrappedValue(asNumber, min, max, wrap);
                    const finalValue = precision !== undefined ? String(applyPrecision(wrappedValue, precision)) : String(wrappedValue);
                    const displayValue = precision !== undefined ? formatForDisplay(applyPrecision(wrappedValue, precision), precision) : String(wrappedValue);
                    setCache(displayValue);
                    evt.currentTarget.setCustomValidity("");
                    // Fire onValue if normalization/precision changed the value
                    if (finalValue !== normalized) {
                        onValueRef.current?.(finalValue as NumericString.Type);
                    }
                    lastValidRef.current = finalValue;
                    // Fire onCommit if value differs from prop
                    const normalizedProp = normalize(valueRef.current);
                    if (finalValue !== normalizedProp) {
                        onCommitRef.current?.(finalValue as NumericString.Type);
                    }
                    onConfirmRef.current?.(finalValue as NumericString.Type);
                    return;
                }

                if (evt.key !== "ArrowUp" && evt.key !== "ArrowDown") return;
                evt.nativeEvent.handled = "implied";
                evt.preventDefault();

                // Step from current displayed value if valid, otherwise last valid value
                const currentDisplayed = evt.currentTarget.value;
                const normalized = normalize(currentDisplayed) ?? normalize(lastValidRef.current);
                if (normalized === null) return;

                const currentValue = Number(normalized);
                // Default step to precision increment if precision is defined and step is not
                const precisionStep = precision !== undefined ? Math.pow(10, -precision) : 1;
                const stepAmount = step ?? precisionStep;
                const delta = evt.key === "ArrowUp" ? stepAmount : -stepAmount;
                let newValue = currentValue + delta;

                // Apply wrapping or enforce bounds
                if (wrap && min !== undefined && max !== undefined) {
                    newValue = wrapValue(newValue, min, max);
                } else if (!isInBounds(newValue, min, max)) {
                    return;
                }

                const newValueStr = String(newValue);
                setCache(newValueStr);

                // Check if the new value adheres to precision
                if (precision !== undefined && !adheresPrecision(newValue, precision)) {
                    // Invalid - show value but mark as invalid, don't fire callbacks
                    evt.currentTarget.setCustomValidity("Too many decimal places");
                    return;
                }

                // Valid - clear validity and fire callbacks
                evt.currentTarget.setCustomValidity("");
                lastValidRef.current = newValueStr;

                const normalizedState = normalize(valueRef.current);
                if (newValueStr !== normalizedState) {
                    onValueRef.current?.(newValueStr as NumericString.Type);
                    onCommitRef.current?.(newValueStr as NumericString.Type);
                }
            },
            [step, min, max, required, precision, wrap],
        );

        return <AbstractNumberInput {...rest} value={cache} onChange={handleChange} onKeyDown={handleKeyDown} onBlur={handleBlur} />;
    },
)``;

export default NumericInput;
