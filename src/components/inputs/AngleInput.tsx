import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { useStable } from "../../util/hooks/useStable";
import { EmptyOr, NumericString } from "../../util/misc";
import styled from "styled-components";
import { AbstractNumberInput, AbstractInputProps } from "../abstract/Inputs";

// Check if value is in bounds (for non-wrapping cases)
function isInBounds(value: number, min?: number, max?: number): boolean {
    if (min !== undefined && value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
}

// Check if a value is valid for the given configuration
// For wrapping ranges, any finite number is valid (it will be wrapped)
// For clamping ranges, value must be in bounds
function isValidAngle(value: number, min: number | undefined, max: number | undefined, unbound: boolean): boolean {
    if (!isFinite(value)) return false;
    if (shouldWrap(min, max, unbound)) return true; // Any finite value can be wrapped
    return isInBounds(value, min, max);
}

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

// Wrap a value to a 360° range, normalizing boundary values
// Priority: favor 0, then positive, then closest to 0
function wrapAngle(value: number, min: number, max: number): number {
    const range = max - min; // Should be 360
    let wrapped = ((((value - min) % range) + range) % range) + min;

    // Normalize boundary: if wrapped equals min or max, pick the preferred boundary
    // (min and max are equivalent in a wrapping range)
    if (wrapped === min || wrapped === max) {
        // Favor 0 if it's on the boundary
        if (min === 0 || max === 0) {
            wrapped = 0;
        }
        // Favor positive over negative
        else if (min > 0) {
            wrapped = min; // min is positive, use it
        } else if (max > 0) {
            wrapped = max; // max is positive, use it
        }
        // Both are negative, favor closest to 0
        else {
            wrapped = Math.max(min, max); // closest to 0
        }
    }

    return wrapped;
}

// Clamp a value to min/max bounds
function clampValue(value: number, min?: number, max?: number): number {
    if (min !== undefined && value < min) return min;
    if (max !== undefined && value > max) return max;
    return value;
}

// Determine if we should wrap (360° range with unbound=false) or clamp
function shouldWrap(min: number | undefined, max: number | undefined, unbound: boolean): boolean {
    if (unbound) return false;
    if (min === undefined || max === undefined) return false;
    return max - min === 360;
}

// Normalize an angle value based on wrapping/clamping rules
function normalizeAngle(value: number, min: number | undefined, max: number | undefined, unbound: boolean): number {
    if (shouldWrap(min, max, unbound)) {
        return wrapAngle(value, min!, max!);
    }
    return clampValue(value, min, max);
}

type AngleInputProps = {
    value: EmptyOr<NumericString>;
    onValue?: (n: EmptyOr<NumericString>) => void;
    onCommit?: (n: EmptyOr<NumericString>) => void;
    onConfirm?: (v: EmptyOr<NumericString>) => void; // fires when you hit enter, even if no change was made
    min?: number;
    max?: number;
    step?: number;
    unbound?: boolean;
};

/*
No min/max provided, unbound={false} (default): Value wraps modulo 0–360 (e.g. 450 → 90, -30 → 330)
No min/max provided, unbound={true}: Value is left as-is with no normalization (e.g. 450 stays 450)
One of min/max provided, unbound={false}: The missing bound defaults to 0 (if max is missing → min) or 360 (if min is missing → max). Since the range will be less than 360°, the value is clamped to the resulting range.
Both min and max provided, range != 360°, unbound={false}: Value is clamped to min/max (e.g. min={0}, max={90}, input of 120 → 90)
Both min and max provided, range = 360°, unbound={false}: Value wraps within the min/max range (e.g. min={-180}, max={180}, input of 190 → -170)
Any min/max configuration, unbound={true}: Value is clamped to min/max if provided, but never wraps. If no min/max is provided, the value is left as-is.
*/

const AngleInput = styled(
    ({
        value,
        onBlur,
        onValue,
        onCommit,
        onConfirm,
        unbound = false,
        min = unbound === false ? 0 : undefined,
        max = unbound === false ? 360 : undefined,
        step = 5,
        onChange,
        onKeyDown,
        required,
        ...rest
    }: Omit<AbstractInputProps, "value" | "min" | "max" | "step" | "pattern"> & AngleInputProps) => {
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

                // Check syntactic completeness (rejects "3.", "-", etc.)
                if (!isComplete(v)) {
                    evt.target.setCustomValidity("Not a valid angle");
                    return;
                }

                const normalized = normalize(v);
                if (normalized === null) {
                    evt.target.setCustomValidity("Not a valid angle");
                    return;
                }

                const asNumber = Number(normalized);
                if (!isValidAngle(asNumber, min, max, unbound)) {
                    evt.target.setCustomValidity("Value is out of bounds");
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
            [min, max, unbound, required],
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
                if (!isValidAngle(asNumber, min, max, unbound)) {
                    // Out of bounds - revert to last known good value
                    evt.currentTarget.setCustomValidity("");
                    setCache(lastValidRef.current);
                    return;
                }

                // Apply wrapping/clamping on commit
                const finalValue = normalizeAngle(asNumber, min, max, unbound);
                const finalValueStr = String(finalValue);

                // Valid - normalize the display
                evt.currentTarget.setCustomValidity("");
                setCache(finalValueStr);
                lastValidRef.current = finalValueStr;

                // Only fire onCommit if value differs from prop
                const normalizedState = normalize(valueRef.current);
                if (finalValueStr !== normalizedState) {
                    onCommitRef.current?.(finalValueStr as NumericString);
                }
            },
            [min, max, unbound, required],
        );

        // Arrow key handling for step increments, Enter key for confirm
        const handleKeyDown = useCallback(
            (evt: React.KeyboardEvent<HTMLInputElement>) => {
                onKeyDownRef.current?.(evt);
                if (evt.nativeEvent.handled) {
                    return;
                }

                // Handle Enter key for onConfirm
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
                    if (normalized === null || !isValidAngle(Number(normalized), min, max, unbound)) {
                        // Invalid - confirm the last valid value
                        evt.currentTarget.setCustomValidity("");
                        setCache(lastValidRef.current);
                        onConfirmRef.current?.(lastValidRef.current as NumericString);
                        return;
                    }

                    // Apply wrapping/clamping on Enter
                    const finalValue = normalizeAngle(Number(normalized), min, max, unbound);
                    const finalValueStr = String(finalValue);

                    setCache(finalValueStr);
                    evt.currentTarget.setCustomValidity("");
                    // Fire onValue if normalization changed the value
                    if (finalValueStr !== normalized) {
                        onValueRef.current?.(finalValueStr as NumericString);
                    }
                    lastValidRef.current = finalValueStr;
                    // Fire onCommit if value differs from prop
                    const normalizedProp = normalize(valueRef.current);
                    if (finalValueStr !== normalizedProp) {
                        onCommitRef.current?.(finalValueStr as NumericString);
                    }
                    onConfirmRef.current?.(finalValueStr as NumericString);
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
                const stepAmount = step ?? 1;
                const delta = evt.key === "ArrowUp" ? stepAmount : -stepAmount;
                const newValue = currentValue + delta;

                // Apply wrapping/clamping for arrow key steps
                const finalValue = normalizeAngle(newValue, min, max, unbound);

                // For non-wrapping, check if we hit bounds (no change)
                if (!shouldWrap(min, max, unbound) && !isInBounds(newValue, min, max)) return;

                const finalValueStr = String(finalValue);
                setCache(finalValueStr);
                evt.currentTarget.setCustomValidity("");
                lastValidRef.current = finalValueStr;

                // Only fire callbacks if value actually changed
                const normalizedState = normalize(valueRef.current);
                if (finalValueStr !== normalizedState) {
                    onValueRef.current?.(finalValueStr as NumericString);
                    onCommitRef.current?.(finalValueStr as NumericString);
                }
            },
            [step, min, max, unbound, required],
        );

        return <AbstractNumberInput {...rest} value={cache} onChange={handleChange} onKeyDown={handleKeyDown} onBlur={handleBlur} />;
    },
)``;

export default AngleInput;
