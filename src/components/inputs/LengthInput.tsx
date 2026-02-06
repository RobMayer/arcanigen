import { ChangeEvent, Ref, useCallback, useEffect, useRef, useState } from "react";
import { useStable } from "../../util/hooks/useStable";
import { useCombinedRef } from "../../util/hooks/useCombinedRef";
import styled from "styled-components";
import { EmptyOr } from "../../util/misc";
import { AbstractTextInput, AbstractInputProps } from "../abstract/Inputs";
import { Length } from "../../definitions/datatypes/length";

const NUMBER_ONLY_REGEX = /^[+-]?\d*\.?\d+$/;

type LengthInputProps = {
    value: EmptyOr<Length.Type>;
    onValue?: (v: EmptyOr<Length.Type>) => void;
    onCommit?: (v: EmptyOr<Length.Type>) => void;
    onSubmit?: (v: EmptyOr<Length.Type>) => void; // fires when you hit enter, even if no change was made
    bounds?: Length.Bounds;
    ref?: Ref<HTMLInputElement>;
};

const LengthInput = styled(({ value, onValue, onCommit, onSubmit, ref, bounds, onChange, onKeyDown, required, ...rest }: Omit<AbstractInputProps, "value"> & LengthInputProps) => {
    const onKeyDownRef = useStable(onKeyDown);
    const onChangeRef = useStable(onChange);

    const [innerRef, makeRef] = useCombinedRef(ref);
    const valueRef = useRef<string>(value);
    const [cache, setCache] = useState<string>(value);
    const lastUnitRef = useRef<Length.Unit>(Length.parse(value)?.[1] ?? "px");

    useEffect(() => {
        if (valueRef.current !== value) {
            valueRef.current = value;
            setCache(value);
        }
    }, [value]);

    const onValueRef = useStable(onValue);
    const onCommitRef = useStable(onCommit);
    const onSubmitRef = useStable(onSubmit);

    const isInBounds = useCallback(
        (v: Length.Type): boolean => {
            return !bounds || Length.within(v, bounds);
        },
        [bounds],
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
                onValueRef.current?.(v as EmptyOr<Length.Type>);
            }
        },
        [validate],
    );

    // On blur/change event - commit or revert
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

                // If just a number, append the last known unit
                if (NUMBER_ONLY_REGEX.test(v)) {
                    const withUnit: Length.Type = `${Number(v)}${lastUnitRef.current}`;
                    if (!isInBounds(withUnit)) {
                        setCache(valueRef.current);
                        el.setCustomValidity("");
                        return;
                    }
                    setCache(withUnit);
                    el.setCustomValidity("");
                    onCommitRef.current?.(withUnit);
                    return;
                }

                if (!Length.is(v)) {
                    // Revert to last valid value
                    setCache(valueRef.current);
                    el.setCustomValidity("");
                    return;
                }

                if (!isInBounds(v)) {
                    setCache(valueRef.current);
                    el.setCustomValidity("");
                    return;
                }

                // Update last known unit
                lastUnitRef.current = Length.parse(v)![1];
                setCache(v);
                el.setCustomValidity("");
                onCommitRef.current?.(v);
                onValueRef.current?.(v);
            };
            el.addEventListener("change", handler);
            return () => {
                el.removeEventListener("change", handler);
            };
        }
    }, [validate, isInBounds, required]);

    // Arrow key handling - increment/decrement the numeric portion
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

                // Handle unitless number
                if (NUMBER_ONLY_REGEX.test(v)) {
                    const asType: Length.Type = `${Number(v)}${lastUnitRef.current}`;
                    if (isInBounds(asType)) {
                        onSubmitRef.current?.(asType);
                    }
                    return;
                }

                if (Length.is(v) && isInBounds(v)) {
                    onSubmitRef.current?.(v);
                }
                return;
            }

            if (evt.key !== "ArrowUp" && evt.key !== "ArrowDown") return;
            evt.nativeEvent.handled = "implied";

            evt.preventDefault();

            const parsed = Length.parse(evt.currentTarget.value);
            if (!parsed) return;

            const [num, unit] = parsed;
            const delta = evt.key === "ArrowUp" ? 1 : -1;
            const newValue: Length.Type = `${num + delta}${unit}`;

            // Check bounds before applying
            if (!isInBounds(newValue)) return;

            setCache(newValue);
            evt.currentTarget.setCustomValidity("");
            onValueRef.current?.(newValue);
            onCommitRef.current?.(newValue);
        },
        [isInBounds, required],
    );

    return <AbstractTextInput {...rest} type="text" value={cache} onChange={handleChange} onKeyDown={handleKeyDown} ref={makeRef} />;
})``;

export default LengthInput;
