import { ChangeEvent, Ref, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStable } from "../../util/hooks/useStable";
import { useCombinedRef } from "../../util/hooks/useCombinedRef";
import styled from "styled-components";
import { BoundsOf, Length, LengthUnit } from "../../types";
import { lengthToUnitless } from "../../util/misc";
import { AbstractTextInput, AbstractInputProps } from "../abstract/Inputs";

const LENGTH_REGEX = /^([+-]?\d*\.?\d+)(px|pt|in|cm|mm)$/;
const NUMBER_ONLY_REGEX = /^[+-]?\d*\.?\d+$/;

function parseLength(value: string): { num: number; unit: LengthUnit } | null {
    const match = value.match(LENGTH_REGEX);
    if (!match) return null;
    return { num: Number(match[1]), unit: match[2] as LengthUnit };
}

function formatLength(num: number, unit: LengthUnit): Length {
    return `${num}${unit}`;
}

type ParsedBounds = {
    min?: { value: number; inclusive: boolean };
    max?: { value: number; inclusive: boolean };
};

const REGEX_MIN = /^(>=?)(\d*\.?\d+)(px|pt|in|cm|mm)/;
const REGEX_MAX = /(<=?)(\d*\.?\d+)(px|pt|in|cm|mm)/;

function parseBounds(bounds?: string): ParsedBounds {
    if (!bounds) return {};

    const result: ParsedBounds = {};

    const minMatch = bounds.match(REGEX_MIN);
    if (minMatch) {
        const num = Number(minMatch[2]);
        const unit = minMatch[3] as LengthUnit;
        result.min = {
            value: lengthToUnitless(num, unit),
            inclusive: minMatch[1] === ">=",
        };
    }

    const maxMatch = bounds.match(REGEX_MAX);
    if (maxMatch) {
        const num = Number(maxMatch[2]);
        const unit = maxMatch[3] as LengthUnit;
        result.max = {
            value: lengthToUnitless(num, unit),
            inclusive: maxMatch[1] === "<=",
        };
    }

    return result;
}

function validateLength(parsed: { num: number; unit: LengthUnit }, bounds: ParsedBounds): string {
    const unitless = lengthToUnitless(parsed.num, parsed.unit);

    if (bounds.min) {
        const { value: minVal, inclusive } = bounds.min;
        if (inclusive ? unitless < minVal : unitless <= minVal) {
            return inclusive ? `Value must be at least ${minVal}px` : `Value must be greater than ${minVal}px`;
        }
    }

    if (bounds.max) {
        const { value: maxVal, inclusive } = bounds.max;
        if (inclusive ? unitless > maxVal : unitless >= maxVal) {
            return inclusive ? `Value must be at most ${maxVal}px` : `Value must be less than ${maxVal}px`;
        }
    }

    return "";
}

type LengthInputProps = {
    value: Length;
    onValue?: (v: Length) => void;
    onCommit?: (v: Length) => void;
    onSubmit?: (v: Length) => void; // fires when you hit enter, even if no change was made
    tooltip?: string;
    disabled?: boolean;
    bounds?: BoundsOf<Length>;
    ref?: Ref<HTMLInputElement>;
    className?: string;
};

const LengthInput = styled(({ className, value, onValue, onCommit, onSubmit, ref, tooltip, disabled, bounds, onChange, onKeyDown, ...rest }: AbstractInputProps<LengthInputProps, "title">) => {
    const onKeyDownRef = useStable(onKeyDown);
    const onChangeRef = useStable(onChange);

    const [innerRef, makeRef] = useCombinedRef(ref);
    const valueRef = useRef<string>(value);
    const [cache, setCache] = useState<string>(value);
    const lastUnitRef = useRef<LengthUnit>(parseLength(value)?.unit ?? "px");

    const parsedBounds = useMemo(() => parseBounds(bounds), [bounds]);

    useEffect(() => {
        if (valueRef.current !== value) {
            valueRef.current = value;
            setCache(value);
        }
    }, [value]);

    const onValueRef = useStable(onValue);
    const onCommitRef = useStable(onCommit);
    const onSubmitRef = useStable(onSubmit);

    // Validate and set custom validity
    const validate = useCallback(
        (el: HTMLInputElement, v: string): v is Length => {
            // Allow unitless numbers without showing error (unit will be added on commit)
            if (NUMBER_ONLY_REGEX.test(v)) {
                const num = Number(v);
                const error = validateLength({ num, unit: lastUnitRef.current }, parsedBounds);
                el.setCustomValidity(error);
                return false; // Not a valid Length yet, but not an error either
            }

            const parsed = parseLength(v);
            if (!parsed) {
                el.setCustomValidity("Must be a number followed by a unit (px, pt, in, cm, mm)");
                return false;
            }
            const error = validateLength(parsed, parsedBounds);
            el.setCustomValidity(error);
            return error === "";
        },
        [parsedBounds],
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
                onValueRef.current?.(v);
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

                // If just a number, append the last known unit
                if (NUMBER_ONLY_REGEX.test(v)) {
                    const num = Number(v);
                    const unit = lastUnitRef.current;
                    const error = validateLength({ num, unit }, parsedBounds);
                    if (error) {
                        setCache(valueRef.current);
                        el.setCustomValidity("");
                        return;
                    }
                    const withUnit = formatLength(num, unit);
                    setCache(withUnit);
                    el.setCustomValidity("");
                    onCommitRef.current?.(withUnit);
                    return;
                }

                const parsed = parseLength(v);
                if (!parsed) {
                    // Revert to last valid value
                    setCache(valueRef.current);
                    el.setCustomValidity("");
                    return;
                }

                const error = validateLength(parsed, parsedBounds);
                if (error) {
                    setCache(valueRef.current);
                    el.setCustomValidity("");
                    return;
                }

                // Update last known unit
                lastUnitRef.current = parsed.unit;
                const formatted = formatLength(parsed.num, parsed.unit);
                setCache(formatted);
                el.setCustomValidity("");
                onCommitRef.current?.(formatted);
                onValueRef.current?.(formatted);
            };
            el.addEventListener("change", handler);
            return () => {
                el.removeEventListener("change", handler);
            };
        }
    }, [validate, parsedBounds]);

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

                // Handle unitless number
                if (NUMBER_ONLY_REGEX.test(v)) {
                    const num = Number(v);
                    const unit = lastUnitRef.current;
                    const error = validateLength({ num, unit }, parsedBounds);
                    if (!error) {
                        onSubmitRef.current?.(formatLength(num, unit));
                    }
                    return;
                }

                const parsed = parseLength(v);
                if (parsed) {
                    const error = validateLength(parsed, parsedBounds);
                    if (!error) {
                        onSubmitRef.current?.(formatLength(parsed.num, parsed.unit));
                    }
                }
                return;
            }

            if (evt.key !== "ArrowUp" && evt.key !== "ArrowDown") return;
            evt.nativeEvent.handled = "implied";

            evt.preventDefault();

            const parsed = parseLength(evt.currentTarget.value);
            if (!parsed) return;

            const delta = evt.key === "ArrowUp" ? 1 : -1;
            const newNum = parsed.num + delta;

            // Check bounds before applying
            const error = validateLength({ num: newNum, unit: parsed.unit }, parsedBounds);
            if (error) return;

            const newValue = formatLength(newNum, parsed.unit);
            setCache(newValue);
            evt.currentTarget.setCustomValidity("");
            onValueRef.current?.(newValue);
            onCommitRef.current?.(newValue);
        },
        [parsedBounds],
    );

    return <AbstractTextInput {...rest} className={className} type="text" value={cache} onChange={handleChange} onKeyDown={handleKeyDown} ref={makeRef} title={tooltip} disabled={disabled} />;
})``;

export default LengthInput;
