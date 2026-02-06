import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { useStable } from "../../util/hooks/useStable";
import { EmptyOr, NumericString } from "../../util/misc";
import styled from "styled-components";
import { AbstractNumberInput, AbstractInputProps } from "../abstract/Inputs";

function isInBounds(value: number, min?: number, max?: number): boolean {
    if (min !== undefined && value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
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

type DecimalInputProps = {
    value: EmptyOr<NumericString>;
    onValue?: (n: EmptyOr<NumericString>) => void;
    onCommit?: (n: EmptyOr<NumericString>) => void;
    onConfirm?: (v: EmptyOr<NumericString>) => void; // fires when you hit enter, even if no change was made
    min?: number;
    max?: number;
    step?: number;
    precision?: number;
};

const DecimalInput = styled(
    ({
        value,
        onBlur,
        onValue,
        onCommit,
        onConfirm,
        min,
        max,
        step,
        onChange,
        onKeyDown,
        required,
        precision: precisionProp,
        ...rest
    }: Omit<AbstractInputProps, "value" | "min" | "max" | "step" | "pattern"> & DecimalInputProps) => {
        const precision = precisionProp === undefined ? undefined : Math.round(precisionProp);

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
                if (!isInBounds(asNumber, min, max)) {
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
                    onValueRef.current?.(normalized as NumericString);
                }
            },
            [min, max, required, precision],
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
                if (!isInBounds(asNumber, min, max)) {
                    // Out of bounds - revert to last known good value
                    evt.currentTarget.setCustomValidity("");
                    setCache(lastValidRef.current);
                    return;
                }

                // Valid - apply precision and format for display
                evt.currentTarget.setCustomValidity("");
                const finalValue = precision !== undefined ? String(applyPrecision(asNumber, precision)) : normalized;
                const displayValue = precision !== undefined ? formatForDisplay(applyPrecision(asNumber, precision), precision) : normalized;
                setCache(displayValue);

                // Only fire callbacks if value differs from prop
                const normalizedState = normalize(valueRef.current);
                if (finalValue !== normalizedState) {
                    // Only fire onValue if precision truncation changed the value from what was typed
                    if (finalValue !== normalized) {
                        onValueRef.current?.(finalValue as NumericString);
                    }
                    onCommitRef.current?.(finalValue as NumericString);
                }
                lastValidRef.current = finalValue;
            },
            [min, max, required, precision],
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
                    if (normalized === null || !isInBounds(Number(normalized), min, max)) {
                        // Invalid - submit the last valid value
                        evt.currentTarget.setCustomValidity("");
                        setCache(lastValidRef.current);
                        onConfirmRef.current?.(lastValidRef.current as NumericString);
                        return;
                    }

                    // Apply precision and format for display on Enter
                    const asNumber = Number(normalized);
                    const finalValue = precision !== undefined ? String(applyPrecision(asNumber, precision)) : normalized;
                    const displayValue = precision !== undefined ? formatForDisplay(applyPrecision(asNumber, precision), precision) : normalized;
                    setCache(displayValue);
                    evt.currentTarget.setCustomValidity("");
                    // Fire onValue if normalization/precision changed the value
                    if (finalValue !== normalized) {
                        onValueRef.current?.(finalValue as NumericString);
                    }
                    lastValidRef.current = finalValue;
                    // Fire onCommit if value differs from prop
                    const normalizedProp = normalize(valueRef.current);
                    if (finalValue !== normalizedProp) {
                        onCommitRef.current?.(finalValue as NumericString);
                    }
                    onConfirmRef.current?.(finalValue as NumericString);
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
                const newValue = currentValue + delta;

                // Enforce bounds
                if (!isInBounds(newValue, min, max)) return;

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
                    onValueRef.current?.(newValueStr as NumericString);
                    onCommitRef.current?.(newValueStr as NumericString);
                }
            },
            [step, min, max, required, precision],
        );

        return <AbstractNumberInput {...rest} value={cache} onChange={handleChange} onKeyDown={handleKeyDown} onBlur={handleBlur} />;
    },
)``;

export default DecimalInput;
