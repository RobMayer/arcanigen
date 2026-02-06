import { ChangeEvent, Ref, useCallback, useEffect, useRef, useState } from "react";
import { useStable } from "../../util/hooks/useStable";
import { useCombinedRef } from "../../util/hooks/useCombinedRef";
import { EmptyOr, NumericString } from "../../util/misc";
import styled from "styled-components";
import { AbstractNumberInput, AbstractInputProps } from "../abstract/Inputs";

function isInBounds(value: number, min?: number, max?: number): boolean {
    if (min !== undefined && value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
}

type NumberInputProps = {
    value: EmptyOr<NumericString>;
    onValue?: (n: EmptyOr<NumericString>) => void;
    onCommit?: (n: EmptyOr<NumericString>) => void;
    onSubmit?: (v: EmptyOr<NumericString>) => void; // fires when you hit enter, even if no change was made
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    ref?: Ref<HTMLInputElement>;
};

const NumberInput = styled(
    ({ value, onValue, onCommit, onSubmit, ref, min, max, step, onChange, onKeyDown, required, ...rest }: Omit<AbstractInputProps, "value" | "min" | "max" | "step"> & NumberInputProps) => {
        const onKeyDownRef = useStable(onKeyDown);
        const onChangeRef = useStable(onChange);

        const [innerRef, makeRef] = useCombinedRef(ref);
        const valueRef = useRef<string>(value);
        const [cache, setCache] = useState<string>(value);

        useEffect(() => {
            if (valueRef.current !== value) {
                valueRef.current = value;
                setCache(value);
            }
        }, [value]);

        const onValueRef = useStable(onValue);
        const onCommitRef = useStable(onCommit);
        const onSubmitRef = useStable(onSubmit);

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
                    onValueRef.current?.("");
                    return;
                }

                const asNumber = Number(v);
                if (v === "" || isNaN(asNumber)) {
                    return;
                }

                // Only call onValue if valid
                if (isInBounds(asNumber, min, max)) {
                    onValueRef.current?.(v as NumericString);
                }
            },
            [min, max, required],
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
                        onCommitRef.current?.("");
                        return;
                    }

                    const asNumber = Number(v);

                    if (v === "" || isNaN(asNumber)) {
                        setCache(valueRef.current);
                        return;
                    }

                    // Revert to previous value if out of bounds, otherwise commit
                    if (!isInBounds(asNumber, min, max)) {
                        setCache(valueRef.current);
                    } else {
                        setCache(v);
                        onValueRef.current?.(v as NumericString);
                        onCommitRef.current?.(v as NumericString);
                    }
                };
                el.addEventListener("change", handler);
                return () => {
                    el.removeEventListener("change", handler);
                };
            }
        }, [min, max, required]);

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
                    if (!isNaN(currentValue) && isInBounds(currentValue, min, max)) {
                        onSubmitRef.current?.(v as NumericString);
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
                if (!isInBounds(newValue, min, max)) return;

                // Update the input value and trigger change
                const newValueStr = String(newValue) as NumericString;
                setCache(newValueStr);
                onValueRef.current?.(newValueStr);
                onCommitRef.current?.(newValueStr);
            },
            [step, min, max, required],
        );

        // Use native HTML5 validation for min/max/step
        return (
            <AbstractNumberInput
                {...rest}
                type="number"
                value={cache}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                ref={makeRef}
                min={min?.toFixed(8)}
                max={max?.toFixed(8)}
                step={step?.toFixed(8) ?? "any"}
            />
        );
    },
)``;

export default NumberInput;
