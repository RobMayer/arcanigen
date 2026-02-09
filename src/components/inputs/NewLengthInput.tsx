/*
 * AbstractInput.Dimensioned - Sketchpad
 * ======================================
 *
 * PROBLEM:
 * LengthInput has complex behavior that doesn't fit cleanly into AbstractInput.Text:
 * - Unit memory: remembers last unit used (px, pt, in, cm, mm)
 * - Bare number acceptance: "42" → "42px" (using last unit)
 * - Unit-aware bounds checking
 * - Arrow key stepping on numeric portion while preserving unit
 * - Revert-to-last-valid on invalid input
 *
 * SOLUTION:
 * A generalized AbstractInput.Dimensioned<U> for unit-suffixed numeric types.
 * Suffix-only for now (e.g., "42px", "90deg"); prefix support (e.g., "$100") can be
 * added later if needed.
 *
 * USE CASES:
 * - Length: px, pt, in, cm, mm
 * - Angle: deg, rad, turn (replacing current numeric-based AngleInput)
 * - Time: ms, s, m, h
 * - Data size: B, KB, MB, GB
 *
 * TYPE SYSTEM:
 * - Dim<U>: Template literal `${number}${U}` for type-safe dimensioned values
 * - UnitsOf<D>: Extracts unit type from a Dim type
 * - Converter<D>: Per-unit { from, to } functions for cross-unit math
 *
 * PROPS:
 * - units: U[] - Available unit suffixes
 * - value: EmptyOr<Dim<U>> - Current value (empty string = no value)
 * - converter?: Converter<Dim<U>> - Unit conversion functions (optional)
 * - min?, max?: EmptyOr<Dim<U>> - Bounds (empty string = no bound)
 * - step?: Dim<U> | number | `${number}` | "" - Step amount for arrow keys
 * - wrap?: EmptyOr<Dim<U>> - Wrap value for cyclic behavior (e.g., angles)
 * - onValue, onCommit, onConfirm - Callbacks
 * - normalize?: Custom normalization after unit is applied
 * - Plus standard HTML input props, tooltip, flavour
 *
 * STEP BEHAVIOR:
 * - If step is a plain number: steps the numeric portion by that amount in display unit
 *   e.g., value="5in", step=1 → up arrow gives "6in"
 * - If step is a Dim<U>: steps by that dimensioned amount (converts if needed)
 *   e.g., value="5in", step="1px" → up arrow gives "5.0104...in" (1px worth added)
 *
 * CONVERTER BEHAVIOR:
 * - When present: enables cross-unit math (bounds checking, dimensioned stepping)
 * - When absent: all units treated as equivalent (numeric portions compared directly)
 *   This allows "branding" use cases where units don't convert (e.g., currencies)
 *
 * INTERNAL BEHAVIOR:
 * - lastUnitRef: remembers last committed unit for bare number → dimensioned conversion
 * - Pattern auto-generated from units array
 * - Revert-on-invalid handled by underlying AbstractInput.Text
 *
 * EXAMPLE USAGE:
 *
 * // LengthInput wrapper:
 * <AbstractInput.Dimensioned
 *     units={["px", "pt", "in", "cm", "mm"]}
 *     converter={LengthConverter}
 *     value="42px"
 *     min="0px"
 *     step={1}
 * />
 *
 * // AngleInput with units:
 * <AbstractInput.Dimensioned
 *     units={["deg", "rad", "turn"]}
 *     converter={AngleConverter}
 *     value="90deg"
 *     wrap="360deg"
 * />
 */

import { ChangeEvent, DetailedHTMLProps, InputHTMLAttributes, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyOr } from "../../util/misc";
import { Flavour } from "../types";
import { useStable } from "../../util/hooks/useStable";
import { AbstractInput } from "../abstract/Inputs";

type Dim<U extends string> = `${number}${U}`;
type Converter<U extends string> = { [K in U]: { from: (value: Dim<K>) => number; to: (value: number) => Dim<K> } };

type DimensionedProps<U extends string> = {
    units: U[];
    defaultUnit?: U;
    value: EmptyOr<Dim<U>>;
    converter?: Converter<U>;
    min?: EmptyOr<Dim<U>>;
    max?: EmptyOr<Dim<U>>;
    step?: Dim<U> | number | `${number}` | ""; // empty string treated as undefined
    wrap?: EmptyOr<Dim<U>>;
    onValue?: (v: EmptyOr<Dim<U>>) => void;
    onCommit?: (v: EmptyOr<Dim<U>>) => void;
    onConfirm?: (v: EmptyOr<Dim<U>>) => void;
    normalize?: (v: EmptyOr<Dim<U>>) => EmptyOr<Dim<U>>;
} & Omit<DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>, "title" | "value"> & { tooltip?: string; flavour?: Flavour | "inherit" };

const NUMBER_REGEX = /^[+-]?\d*\.?\d+$/;

// Parse a dimensioned value into [number, unit] or null if invalid
function parseDim<U extends string>(value: string, units: readonly U[]): [number, U] | null {
    for (const unit of units) {
        if (value.endsWith(unit)) {
            const numPart = value.slice(0, -unit.length);
            if (NUMBER_REGEX.test(numPart)) {
                return [Number(numPart), unit];
            }
        }
    }
    return null;
}

// Truncate floating point errors (e.g., 0.30000000000000004 → 0.3)
function cleanFloat(num: number): number {
    return Number(num.toFixed(10));
}

// Format a number with a unit
function formatDim<U extends string>(num: number, unit: U): Dim<U> {
    return `${cleanFloat(num)}${unit}`;
}

// Get numeric value, using converter if present, otherwise just the number portion
function toCanonical<U extends string>(value: string, units: readonly U[], converter?: Converter<U>): number {
    const parsed = parseDim(value, units);
    if (!parsed) return NaN;
    const [num, unit] = parsed;
    if (converter) {
        return converter[unit].from(formatDim(num, unit));
    }
    return num;
}

// Check if value is within bounds
function isInBounds<U extends string>(value: string, min: string | undefined, max: string | undefined, units: readonly U[], converter?: Converter<U>): boolean {
    const v = toCanonical(value, units, converter);
    if (isNaN(v)) return false;
    if (min && min !== "") {
        const minV = toCanonical(min, units, converter);
        if (v < minV) return false;
    }
    if (max && max !== "") {
        const maxV = toCanonical(max, units, converter);
        if (v > maxV) return false;
    }
    return true;
}

// Wrap a value within bounds
function wrapValue<U extends string>(value: number, unit: U, min: string | undefined, max: string | undefined, wrap: string | undefined, units: readonly U[], converter?: Converter<U>): Dim<U> {
    if (!wrap || wrap === "" || !min || min === "" || !max || max === "") {
        return formatDim(value, unit);
    }

    const minV = toCanonical(min, units, converter);
    const maxV = toCanonical(max, units, converter);
    const wrapV = toCanonical(wrap, units, converter);

    // Only wrap if the range matches the wrap value
    if (Math.abs(maxV - minV - wrapV) > 0.0001) {
        return formatDim(value, unit);
    }

    // Convert value to canonical for wrapping
    let canonical = converter ? converter[unit].from(formatDim(value, unit)) : value;

    // Wrap the canonical value
    const range = maxV - minV;
    canonical = cleanFloat(((((canonical - minV) % range) + range) % range) + minV);

    // Convert back to the original unit
    if (converter) {
        return converter[unit].to(canonical);
    }
    return formatDim(canonical, unit);
}

const Dimensioned = <U extends string>({
    units,
    defaultUnit,
    value,
    converter,
    min,
    max,
    step: stepProp,
    wrap,
    onValue,
    onCommit,
    onConfirm,
    normalize: normalizeProp,
    onBlur,
    onChange,
    onKeyDown,
    required = false,
    tooltip,
    flavour,
    ...props
}: DimensionedProps<U>) => {
    const resolvedDefaultUnit = defaultUnit ?? units[0];

    const onKeyDownRef = useStable(onKeyDown);
    const onChangeRef = useStable(onChange);
    const onBlurRef = useStable(onBlur);
    const normalizeRef = useStable(normalizeProp);

    const onValueRef = useStable(onValue);
    const onCommitRef = useStable(onCommit);
    const onConfirmRef = useStable(onConfirm);

    const valueRef = useRef<EmptyOr<Dim<U>>>(value);
    const lastValidRef = useRef<EmptyOr<Dim<U>>>(value);
    const lastUnitRef = useRef<U>(value ? (parseDim(value, units)?.[1] ?? resolvedDefaultUnit) : resolvedDefaultUnit);
    const [cache, setCache] = useState<string>(value);

    // Pattern: optional number, optional unit (for lenient typing)
    const pattern = useMemo(() => {
        const unitPattern = units.map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
        // Allow: empty (if not required), bare number, or number+unit
        return `([+-]?\\d*\\.?\\d+)(${unitPattern})?`;
    }, [units]);

    // Sync with incoming prop
    useEffect(() => {
        if (valueRef.current !== value) {
            valueRef.current = value;
            lastValidRef.current = value;
            if (value) {
                const parsed = parseDim(value, units);
                if (parsed) {
                    lastUnitRef.current = parsed[1];
                }
            }
            setCache(value);
        }
    }, [value, units]);

    // Normalize: add unit if bare number, apply custom normalize
    const normalize = useCallback(
        (v: string): EmptyOr<Dim<U>> => {
            if (v === "") return "" as EmptyOr<Dim<U>>;

            // Check if it's already a valid dimensioned value
            const parsed = parseDim(v, units);
            if (parsed) {
                const [num, unit] = parsed;
                lastUnitRef.current = unit;
                const result = formatDim(num, unit);
                return normalizeRef.current ? normalizeRef.current(result) : result;
            }

            // Check if it's a bare number
            if (NUMBER_REGEX.test(v)) {
                const num = Number(v);
                const result = formatDim(num, lastUnitRef.current);
                return normalizeRef.current ? normalizeRef.current(result) : result;
            }

            // Invalid
            return v as EmptyOr<Dim<U>>;
        },
        [units],
    );

    // Validate value against pattern and bounds
    const validate = useCallback(
        (el: HTMLInputElement, v: string): boolean => {
            if (!required && v === "") {
                el.setCustomValidity("");
                return true;
            }
            if (required && v === "") {
                el.setCustomValidity("Value is required");
                return false;
            }

            const regex = new RegExp(`^${pattern}$`);
            if (!regex.test(v)) {
                el.setCustomValidity("Invalid format");
                return false;
            }

            // Normalize to check bounds
            const normalized = normalize(v);
            if (normalized === "" || !parseDim(normalized, units)) {
                el.setCustomValidity("Invalid value");
                return false;
            }

            // Check bounds
            if (!isInBounds(normalized, min, max, units, converter)) {
                el.setCustomValidity("Value out of bounds");
                return false;
            }

            el.setCustomValidity("");
            return true;
        },
        [pattern, required, normalize, min, max, units, converter],
    );

    const handleChange = useCallback(
        (evt: ChangeEvent<HTMLInputElement>) => {
            onChangeRef.current?.(evt);
            if (evt.nativeEvent.handled) return;
            evt.nativeEvent.handled = "implied";

            const v = evt.target.value;
            setCache(v);

            if (validate(evt.target, v)) {
                const normalized = normalize(v);
                lastValidRef.current = normalized;
                onValueRef.current?.(normalized);
            }
        },
        [validate, normalize],
    );

    const handleBlur = useCallback(
        (evt: React.FocusEvent<HTMLInputElement>) => {
            onBlurRef.current?.(evt);
            if (evt.nativeEvent.handled) return;

            const v = evt.currentTarget.value;

            if (!required && v === "") {
                setCache("");
                evt.currentTarget.setCustomValidity("");
                lastValidRef.current = "";
                onCommitRef.current?.("");
                return;
            }

            const regex = new RegExp(`^${pattern}$`);
            if (!regex.test(v)) {
                // Revert to last valid
                setCache(lastValidRef.current);
                evt.currentTarget.setCustomValidity("");
                return;
            }

            const normalized = normalize(v);

            // Check bounds
            if (normalized !== "" && !isInBounds(normalized, min, max, units, converter)) {
                // Revert to last valid
                setCache(lastValidRef.current);
                evt.currentTarget.setCustomValidity("");
                return;
            }

            // Apply wrapping if configured
            let finalValue: EmptyOr<Dim<U>> = normalized;
            if (normalized && wrap) {
                const parsed = parseDim(normalized, units);
                if (parsed) {
                    const [num, unit] = parsed;
                    finalValue = wrapValue(num, unit, min, max, wrap, units, converter);
                }
            }

            setCache(finalValue);
            evt.currentTarget.setCustomValidity("");
            lastValidRef.current = finalValue;

            if (finalValue !== v) {
                onValueRef.current?.(finalValue);
            }
            onCommitRef.current?.(finalValue);
        },
        [pattern, required, normalize, min, max, wrap, units, converter],
    );

    const handleKeyDown = useCallback(
        (evt: React.KeyboardEvent<HTMLInputElement>) => {
            onKeyDownRef.current?.(evt);
            if (evt.nativeEvent.handled) return;

            if (evt.key === "Enter") {
                evt.nativeEvent.handled = "implied";
                const v = evt.currentTarget.value;

                if (!required && v === "") {
                    setCache("");
                    evt.currentTarget.setCustomValidity("");
                    lastValidRef.current = "";
                    if (valueRef.current !== "") {
                        onCommitRef.current?.("");
                    }
                    onConfirmRef.current?.("");
                    return;
                }

                const regex = new RegExp(`^${pattern}$`);
                if (!regex.test(v)) {
                    setCache(lastValidRef.current);
                    evt.currentTarget.setCustomValidity("");
                    onConfirmRef.current?.(lastValidRef.current);
                    return;
                }

                const normalized = normalize(v);

                if (normalized !== "" && !isInBounds(normalized, min, max, units, converter)) {
                    setCache(lastValidRef.current);
                    evt.currentTarget.setCustomValidity("");
                    onConfirmRef.current?.(lastValidRef.current);
                    return;
                }

                // Apply wrapping
                let finalValue: EmptyOr<Dim<U>> = normalized;
                if (normalized && wrap) {
                    const parsed = parseDim(normalized, units);
                    if (parsed) {
                        const [num, unit] = parsed;
                        finalValue = wrapValue(num, unit, min, max, wrap, units, converter);
                    }
                }

                setCache(finalValue);
                evt.currentTarget.setCustomValidity("");
                lastValidRef.current = finalValue;

                if (finalValue !== v) {
                    onValueRef.current?.(finalValue);
                }
                if (finalValue !== valueRef.current) {
                    onCommitRef.current?.(finalValue);
                }
                onConfirmRef.current?.(finalValue);
                return;
            }

            if (evt.key !== "ArrowUp" && evt.key !== "ArrowDown") return;
            evt.nativeEvent.handled = "implied";
            evt.preventDefault();

            // Get current value to step from
            const currentDisplay = evt.currentTarget.value;
            let normalized = normalize(currentDisplay);
            if (normalized === "" || !parseDim(normalized, units)) {
                normalized = lastValidRef.current;
            }
            if (normalized === "" || !parseDim(normalized, units)) return;

            const parsed = parseDim(normalized, units)!;
            const [currentNum, currentUnit] = parsed;

            // Calculate step amount
            let stepAmount: number;
            if (stepProp === "" || stepProp === undefined) {
                stepAmount = 1;
            } else if (typeof stepProp === "number") {
                stepAmount = stepProp;
            } else if (typeof stepProp === "string" && NUMBER_REGEX.test(stepProp)) {
                stepAmount = Number(stepProp);
            } else {
                // Dimensioned step
                const stepParsed = parseDim(stepProp as string, units);
                if (!stepParsed) {
                    stepAmount = 1;
                } else {
                    const [stepNum, stepUnit] = stepParsed;
                    if (converter) {
                        // Convert step to canonical, then to current unit
                        const stepCanonical = converter[stepUnit].from(formatDim(stepNum, stepUnit));
                        const currentCanonical = converter[currentUnit].from(formatDim(currentNum, currentUnit));
                        const newCanonical = cleanFloat(currentCanonical + (evt.key === "ArrowUp" ? stepCanonical : -stepCanonical));
                        const newValue = converter[currentUnit].to(newCanonical);

                        // Check bounds
                        if (!isInBounds(newValue, min, max, units, converter)) {
                            // Try wrapping
                            if (wrap) {
                                const wrappedParsed = parseDim(newValue, units);
                                if (wrappedParsed) {
                                    const wrapped = wrapValue(wrappedParsed[0], wrappedParsed[1], min, max, wrap, units, converter);
                                    setCache(wrapped);
                                    lastValidRef.current = wrapped;
                                    onValueRef.current?.(wrapped);
                                    onCommitRef.current?.(wrapped);
                                }
                            }
                            return;
                        }

                        setCache(newValue);
                        lastValidRef.current = newValue;
                        onValueRef.current?.(newValue);
                        onCommitRef.current?.(newValue);
                        return;
                    } else {
                        // No converter - step is just numeric
                        stepAmount = stepNum;
                    }
                }
            }

            const delta = evt.key === "ArrowUp" ? stepAmount : -stepAmount;
            const newNum = currentNum + delta;
            let newValue = formatDim(newNum, currentUnit);

            // Check bounds
            if (!isInBounds(newValue, min, max, units, converter)) {
                // Try wrapping
                if (wrap) {
                    newValue = wrapValue(newNum, currentUnit, min, max, wrap, units, converter);
                    if (!isInBounds(newValue, min, max, units, converter)) {
                        return;
                    }
                } else {
                    return;
                }
            }

            setCache(newValue);
            lastValidRef.current = newValue;
            onValueRef.current?.(newValue);
            onCommitRef.current?.(newValue);
        },
        [pattern, required, normalize, stepProp, min, max, wrap, units, converter],
    );

    return <AbstractInput.BaseInput {...props} type="text" value={cache} onChange={handleChange} onKeyDown={handleKeyDown} onBlur={handleBlur} title={tooltip} data-flavour={flavour} />;
};
