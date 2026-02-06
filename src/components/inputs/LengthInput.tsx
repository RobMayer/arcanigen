import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { useStable } from "../../util/hooks/useStable";
import styled from "styled-components";
import { EmptyOr } from "../../util/misc";
import { AbstractTextInput, AbstractInputProps } from "../abstract/Inputs";
import { Length } from "../../definitions/datatypes/length";

const NUMBER_ONLY_REGEX = /^[+-]?\d*\.?\d+$/;

type LengthInputProps = {
    value: EmptyOr<Length.Type>;
    onValue?: (v: EmptyOr<Length.Type>) => void;
    onCommit?: (v: EmptyOr<Length.Type>) => void;
    onConfirm?: (v: EmptyOr<Length.Type>) => void; // fires when you hit enter, even if no change was made
    min?: Length.Type;
    max?: Length.Type;
};

const LengthInput = styled(
    ({ value, onBlur, onValue, onCommit, onConfirm, min, max, onChange, onKeyDown, required, ...rest }: Omit<AbstractInputProps, "value" | "min" | "max" | "step" | "pattern"> & LengthInputProps) => {
        const onKeyDownRef = useStable(onKeyDown);
        const onBlurRef = useStable(onBlur);
        const onChangeRef = useStable(onChange);

        const valueRef = useRef<string>(value);
        const lastValidRef = useRef<string>(value);
        const [cache, setCache] = useState<string>(value);
        const lastUnitRef = useRef<Length.Unit>(Length.parse(value)?.[1] ?? "px");

        useEffect(() => {
            if (valueRef.current !== value) {
                valueRef.current = value;
                lastValidRef.current = value;
                setCache(value);
            }
        }, [value]);

        const onValueRef = useStable(onValue);
        const onCommitRef = useStable(onCommit);
        const onConfirmRef = useStable(onConfirm);

        const isInBounds = useCallback(
            (v: Length.Type): boolean => {
                return Length.within(v, min ?? null, max ?? null);
            },
            [min, max],
        );

        // Validate and set custom validity
        const validate = useCallback(
            (el: HTMLInputElement, v: string): boolean => {
                // Empty is valid when not required
                if (!required && v === "") {
                    el.setCustomValidity("");
                    return true;
                }

                // Allow unitless numbers without showing error (unit will be added on commit)
                if (NUMBER_ONLY_REGEX.test(v)) {
                    el.setCustomValidity(isInBounds(`${Number(v)}${lastUnitRef.current}`) ? "" : "Value is out of bounds");
                    return false; // Not a valid Length yet, but not an error either
                }

                if (!Length.is(v)) {
                    el.setCustomValidity("Must be a number followed by a unit (px, pt, in, cm, mm)");
                    return false;
                }

                const inBounds = isInBounds(v);
                el.setCustomValidity(inBounds ? "" : "Value is out of bounds");
                return inBounds;
            },
            [isInBounds, required],
        );

        const handleChange = useCallback(
            (evt: ChangeEvent<HTMLInputElement>) => {
                onChangeRef.current?.(evt);
                if (evt.nativeEvent.handled) {
                    return;
                }
                evt.nativeEvent.handled = "implied";
                const v = evt.target.value;
                setCache(v);

                if (validate(evt.target, v)) {
                    lastValidRef.current = v;
                    onValueRef.current?.(v as EmptyOr<Length.Type>);
                }
            },
            [validate],
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
                    setCache(v);
                    evt.currentTarget.setCustomValidity("");
                    lastValidRef.current = "";
                    onCommitRef.current?.("");
                    return;
                }

                // If just a number, append the last known unit
                if (NUMBER_ONLY_REGEX.test(v)) {
                    const withUnit: Length.Type = `${Number(v)}${lastUnitRef.current}`;
                    if (!isInBounds(withUnit)) {
                        setCache(lastValidRef.current);
                        evt.currentTarget.setCustomValidity("");
                        return;
                    }
                    setCache(withUnit);
                    evt.currentTarget.setCustomValidity("");
                    lastValidRef.current = withUnit;
                    onCommitRef.current?.(withUnit);
                    return;
                }

                if (!Length.is(v)) {
                    // Revert to last valid value
                    setCache(lastValidRef.current);
                    evt.currentTarget.setCustomValidity("");
                    return;
                }

                if (!isInBounds(v)) {
                    setCache(lastValidRef.current);
                    evt.currentTarget.setCustomValidity("");
                    return;
                }

                // Update last known unit
                lastUnitRef.current = Length.parse(v)![1];
                setCache(v);
                evt.currentTarget.setCustomValidity("");
                lastValidRef.current = v;
                onCommitRef.current?.(v);
            },
            [isInBounds, required],
        );

        // Arrow key handling - increment/decrement the numeric portion
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

                    // Handle unitless number
                    if (NUMBER_ONLY_REGEX.test(v)) {
                        const withUnit: Length.Type = `${Number(v)}${lastUnitRef.current}`;
                        if (!isInBounds(withUnit)) {
                            // Invalid - confirm last valid
                            setCache(lastValidRef.current);
                            evt.currentTarget.setCustomValidity("");
                            onConfirmRef.current?.(lastValidRef.current as Length.Type);
                            return;
                        }
                        setCache(withUnit);
                        evt.currentTarget.setCustomValidity("");
                        lastValidRef.current = withUnit;
                        onConfirmRef.current?.(withUnit);
                        return;
                    }

                    if (!Length.is(v) || !isInBounds(v)) {
                        // Invalid - confirm last valid
                        setCache(lastValidRef.current);
                        evt.currentTarget.setCustomValidity("");
                        onConfirmRef.current?.(lastValidRef.current as Length.Type);
                        return;
                    }

                    // Valid
                    lastUnitRef.current = Length.parse(v)![1];
                    setCache(v);
                    evt.currentTarget.setCustomValidity("");
                    lastValidRef.current = v;
                    onConfirmRef.current?.(v);
                    return;
                }

                if (evt.key !== "ArrowUp" && evt.key !== "ArrowDown") return;
                evt.nativeEvent.handled = "implied";
                evt.preventDefault();

                // Step from current displayed value if valid, otherwise last valid value
                const currentDisplayed = evt.currentTarget.value;
                const parsed = Length.parse(currentDisplayed) ?? Length.parse(lastValidRef.current);
                if (!parsed) return;

                const [num, unit] = parsed;
                const delta = evt.key === "ArrowUp" ? 1 : -1;
                const newValue: Length.Type = `${num + delta}${unit}`;

                // Check bounds before applying
                if (!isInBounds(newValue)) return;

                setCache(newValue);
                evt.currentTarget.setCustomValidity("");
                lastValidRef.current = newValue;
                onValueRef.current?.(newValue);
                onCommitRef.current?.(newValue);
            },
            [isInBounds, required],
        );

        return <AbstractTextInput {...rest} type="text" value={cache} onChange={handleChange} onKeyDown={handleKeyDown} onBlur={handleBlur} />;
    },
)``;

export default LengthInput;
