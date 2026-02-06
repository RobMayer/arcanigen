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

const INTEGER_REGEX = /^[+-]?\d+$/;

// Check if a string is syntactically complete
function isComplete(v: string): boolean {
    return INTEGER_REGEX.test(v);
}

// Normalize a string to its canonical numeric form, or null if not a valid number
function normalize(v: string): string | null {
    const n = Number(v);
    if (isNaN(n)) return null;
    return String(n);
}

type IntegerInputProps = {
    value: EmptyOr<NumericString>;
    onValue?: (n: EmptyOr<NumericString>) => void;
    onCommit?: (n: EmptyOr<NumericString>) => void;
    onConfirm?: (v: EmptyOr<NumericString>) => void; // fires when you hit enter, even if no change was made
    min?: number;
    max?: number;
    step?: number;
};

const IntegerInput = styled(
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
        ...rest
    }: Omit<AbstractInputProps, "value" | "min" | "max" | "step" | "pattern"> & IntegerInputProps) => {
        const min = minProp === undefined ? undefined : Math.round(minProp);
        const max = maxProp === undefined ? undefined : Math.round(maxProp);
        const step = stepProp === undefined ? undefined : Math.round(stepProp);

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

                // Check syntactic completeness and integerness first (rejects "3.", "3.0", "-", etc.)
                if (!isComplete(v)) {
                    evt.target.setCustomValidity("Not a valid integer");
                    return;
                }

                const normalized = normalize(v);
                if (normalized === null) {
                    evt.target.setCustomValidity("Not a valid integer");
                    return;
                }

                const asNumber = Number(normalized);
                if (!isInBounds(asNumber, min, max)) {
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
            [min, max, required],
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

                // Valid - normalize the display
                evt.currentTarget.setCustomValidity("");
                setCache(normalized);
                lastValidRef.current = normalized;

                // Only fire onCommit if value differs from prop
                const normalizedState = normalize(valueRef.current);
                if (normalized !== normalizedState) {
                    onCommitRef.current?.(normalized as NumericString);
                }
            },
            [min, max, required],
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
                    if (normalized === null || !isInBounds(Number(normalized), min, max)) {
                        // Invalid - confirm the last valid value
                        evt.currentTarget.setCustomValidity("");
                        setCache(lastValidRef.current);
                        onConfirmRef.current?.(lastValidRef.current as NumericString);
                        return;
                    }

                    // Normalize display on Enter
                    setCache(normalized);
                    evt.currentTarget.setCustomValidity("");
                    lastValidRef.current = normalized;
                    // Fire onCommit if value differs from prop
                    const normalizedProp = normalize(valueRef.current);
                    if (normalized !== normalizedProp) {
                        onCommitRef.current?.(normalized as NumericString);
                    }
                    onConfirmRef.current?.(normalized as NumericString);
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

                // Enforce bounds
                if (!isInBounds(newValue, min, max)) return;

                const newValueStr = String(newValue);
                setCache(newValueStr);
                evt.currentTarget.setCustomValidity("");
                lastValidRef.current = newValueStr;

                // Only fire callbacks if value actually changed
                const normalizedState = normalize(valueRef.current);
                if (newValueStr !== normalizedState) {
                    onValueRef.current?.(newValueStr as NumericString);
                    onCommitRef.current?.(newValueStr as NumericString);
                }
            },
            [step, min, max, required],
        );

        return <AbstractNumberInput {...rest} value={cache} onChange={handleChange} onKeyDown={handleKeyDown} onBlur={handleBlur} />;
    },
)``;

export default IntegerInput;
