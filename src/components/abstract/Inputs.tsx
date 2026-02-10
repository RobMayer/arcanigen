import { ChangeEvent, DetailedHTMLProps, InputHTMLAttributes, SelectHTMLAttributes, useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { Flavour } from "../types";
import { useStable } from "../../util/hooks/useStable";
import { NumericString } from "../../definitions/datatypes/numericString";
import { EmptyOr } from "../../util/misc";

export namespace AbstractInput {
    export const BaseInput = styled.input`
        background: #111;
        padding: 0.25em 0.4em;
        font-family: monospace;
        border: 1px solid #666;
        outline: 1px solid transparent;
        outline-offset: 0px;
        transition: outline-offset 0.1s ease;
        &:focus-visible {
            outline-color: #fffa;
            outline-offset: -2px;
        }
        &:invalid,
        &[data-state~="invalid"] {
            outline-color: #f00;
            background-color: #200;
        }
        &:invalid:focus-visible,
        &[data-state~="invalid"]:focus-visible {
            outline-color: #f88;
        }
        &:disabled {
            opacity: 0.6;
        }
        min-width: 0;
        flex: 1 1;
    `;

    type BaseProps = Omit<DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>, "title" | "value"> & { tooltip?: string; flavour?: Flavour | "inherit" };

    export const Text = <T extends string = string>({
        value,
        onValue,
        onCommit,
        onConfirm,
        onBlur,
        pattern,
        onChange,
        onKeyDown,
        required = false,
        normalize,
        flavour,
        tooltip,
        ...props
    }: Text.Props<T>) => {
        const onKeyDownRef = useStable(onKeyDown);
        const onChangeRef = useStable(onChange);
        const onBlurRef = useStable(onBlur);
        const normalizeRef = useStable(normalize);

        const valueRef = useRef<T>(value);
        const lastValidRef = useRef<T>(value);
        const [cache, setCache] = useState<string>(value);

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

        // Validate and set custom validity
        const validate = useCallback(
            (el: HTMLInputElement, v: string): v is T => {
                // Empty is valid when not required
                if (!required && v === "") {
                    el.setCustomValidity("");
                    return true;
                }
                if (required && v === "") {
                    el.setCustomValidity("Value is required");
                    return false;
                }
                if (pattern) {
                    const regex = new RegExp(`^${pattern}$`);
                    if (!regex.test(v)) {
                        el.setCustomValidity("Value does not match required pattern");
                        return false;
                    }
                }
                el.setCustomValidity("");
                return true;
            },
            [pattern, required],
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
                    onValueRef.current?.(v);
                }
            },
            [validate],
        );

        // On blur - commit or revert
        const handleBlur = useCallback(
            (evt: React.FocusEvent<HTMLInputElement>) => {
                onBlurRef.current?.(evt);
                if (evt.nativeEvent.handled) {
                    return;
                }

                const v = evt.currentTarget.value;

                // Empty is valid when not required
                if (!required && v === "") {
                    const normalized = normalizeRef.current ? normalizeRef.current(v as T) : (v as T);
                    setCache(normalized);
                    evt.currentTarget.setCustomValidity("");
                    lastValidRef.current = normalized;
                    // Fire onValue if normalization changed the value
                    if (normalized !== v) {
                        onValueRef.current?.(normalized);
                    }
                    onCommitRef.current?.(normalized);
                    return;
                }

                if (pattern) {
                    const regex = new RegExp(`^${pattern}$`);
                    if (!regex.test(v)) {
                        // Revert to last valid value
                        setCache(lastValidRef.current);
                        evt.currentTarget.setCustomValidity("");
                        return;
                    }
                }

                // Apply normalization
                const normalized = normalizeRef.current ? normalizeRef.current(v as T) : (v as T);
                setCache(normalized);
                evt.currentTarget.setCustomValidity("");
                // Fire onValue if normalization changed the value
                if (normalized !== v) {
                    onValueRef.current?.(normalized);
                }
                lastValidRef.current = normalized;
                onCommitRef.current?.(normalized);
            },
            [pattern, required],
        );

        // Handle Enter key for onConfirm
        const handleKeyDown = useCallback(
            (evt: React.KeyboardEvent<HTMLInputElement>) => {
                onKeyDownRef.current?.(evt);
                if (evt.nativeEvent.handled) {
                    return;
                }

                if (evt.key !== "Enter") return;
                evt.nativeEvent.handled = "implied";

                const v = evt.currentTarget.value;

                // Empty is valid when not required
                if (!required && v === "") {
                    const normalized = normalizeRef.current ? normalizeRef.current(v as T) : (v as T);
                    setCache(normalized);
                    evt.currentTarget.setCustomValidity("");
                    // Fire onValue if normalization changed the value
                    if (normalized !== v) {
                        onValueRef.current?.(normalized);
                    }
                    lastValidRef.current = normalized;
                    // Fire onCommit if value differs from prop
                    if (normalized !== valueRef.current) {
                        onCommitRef.current?.(normalized);
                    }
                    onConfirmRef.current?.(normalized);
                    return;
                }

                if (pattern) {
                    const regex = new RegExp(`^${pattern}$`);
                    if (!regex.test(v)) {
                        // Invalid - revert to last valid and confirm that
                        setCache(lastValidRef.current);
                        evt.currentTarget.setCustomValidity("");
                        onConfirmRef.current?.(lastValidRef.current);
                        return;
                    }
                }

                // Apply normalization
                const normalized = normalizeRef.current ? normalizeRef.current(v as T) : (v as T);
                setCache(normalized);
                evt.currentTarget.setCustomValidity("");
                // Fire onValue if normalization changed the value
                if (normalized !== v) {
                    onValueRef.current?.(normalized);
                }
                lastValidRef.current = normalized;
                // Fire onCommit if value differs from prop
                if (normalized !== valueRef.current) {
                    onCommitRef.current?.(normalized);
                }
                onConfirmRef.current?.(normalized);
            },
            [pattern, required],
        );

        return <BaseInput {...props} type={"text"} value={cache} onChange={handleChange} onKeyDown={handleKeyDown} onBlur={handleBlur} title={tooltip} data-flavour={flavour} />;
    };

    export namespace Text {
        export type Props<T extends string = string> = {
            value: T;
            onValue?: (v: T) => void;
            onCommit?: (v: T) => void;
            onConfirm?: (v: T) => void; // fires when you hit enter, even if no change was made
            normalize?: (v: T) => T;
        } & BaseProps;
    }

    export const Numeric = ({
        value,
        onBlur,
        onValue,
        onCommit,
        onConfirm,
        min: minProp,
        max: maxProp,
        snap: snapProp,
        step: stepProp = Array.isArray(snapProp) ? undefined : snapProp,
        onChange,
        onKeyDown,
        required,
        precision: precisionProp,
        wrap: wrapProp,
        tooltip,
        flavour,
        ...props
    }: Numeric.Props) => {
        const { precision, min, max, step, wrap, snap } = useMemo(() => {
            const precisionRaw = typeof precisionProp === "number" ? precisionProp : (NumericString.Emptyable.asNumber(precisionProp ?? "") ?? undefined);
            const wrapRaw = typeof wrapProp === "number" ? wrapProp : (NumericString.Emptyable.asNumber(wrapProp ?? "") ?? undefined);
            const minRaw = typeof minProp === "number" ? minProp : (NumericString.Emptyable.asNumber(minProp ?? "") ?? undefined);
            const maxRaw = typeof maxProp === "number" ? maxProp : (NumericString.Emptyable.asNumber(maxProp ?? "") ?? undefined);
            const stepRaw = typeof stepProp === "number" ? stepProp : (NumericString.Emptyable.asNumber(stepProp ?? "") ?? undefined);

            // Parse snap: either a number (interval) or array of numbers (discrete values)
            let snapParsed: number | number[] | undefined;
            if (Array.isArray(snapProp)) {
                snapParsed = snapProp
                    .map((v) => (typeof v === "number" ? v : NumericString.Emptyable.asNumber(v ?? "")))
                    .filter((v): v is number => v !== null && !Number.isNaN(v))
                    .sort((a, b) => a - b);
                if (snapParsed.length === 0) snapParsed = undefined;
            } else if (snapProp !== undefined) {
                snapParsed = typeof snapProp === "number" ? snapProp : (NumericString.Emptyable.asNumber(snapProp ?? "") ?? undefined);
            }

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
                snap: snapParsed,
            };
        }, [precisionProp, minProp, maxProp, stepProp, wrapProp, snapProp]);

        // Snap a value to the snap grid (interval or discrete values)
        const snapValue = useStable((value: number): number => {
            if (snap === undefined) return value;

            if (Array.isArray(snap)) {
                // Snap to closest value in array
                let closest = snap[0];
                let closestDist = Math.abs(value - closest);
                for (let i = 1; i < snap.length; i++) {
                    const dist = Math.abs(value - snap[i]);
                    if (dist < closestDist) {
                        closest = snap[i];
                        closestDist = dist;
                    }
                }
                return closest;
            } else {
                // Snap to interval
                return cleanFloat(Math.round(value / snap) * snap);
            }
        });

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

                // Valid - apply snap, then wrapping if needed, then precision and format for display
                evt.currentTarget.setCustomValidity("");
                const snappedValue = snapValue.current(asNumber);
                const wrappedValue = cleanFloat(normalizeWrappedValue(snappedValue, min, max, wrap));
                const finalValue = precision !== undefined ? String(applyPrecision(wrappedValue, precision)) : String(wrappedValue);
                const displayValue = precision !== undefined ? formatForDisplay(applyPrecision(wrappedValue, precision), precision) : String(wrappedValue);
                setCache(displayValue);

                // Only fire callbacks if value differs from prop
                const normalizedState = normalize(valueRef.current);
                if (finalValue !== normalizedState) {
                    // Only fire onValue if snap/precision changed the value from what was typed
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

                    // Apply snap, then wrapping if needed, then precision and format for display on Enter
                    const asNumber = Number(normalized);
                    const snappedValue = snapValue.current(asNumber);
                    const wrappedValue = cleanFloat(normalizeWrappedValue(snappedValue, min, max, wrap));
                    const finalValue = precision !== undefined ? String(applyPrecision(wrappedValue, precision)) : String(wrappedValue);
                    const displayValue = precision !== undefined ? formatForDisplay(applyPrecision(wrappedValue, precision), precision) : String(wrappedValue);
                    setCache(displayValue);
                    evt.currentTarget.setCustomValidity("");
                    // Fire onValue if snap/precision changed the value
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
                let newValue = cleanFloat(currentValue + delta);

                // Apply wrapping or enforce bounds (don't apply snap - let it show as invalid)
                if (wrap && min !== undefined && max !== undefined) {
                    newValue = cleanFloat(wrapNumber(newValue, min, max));
                } else if (!isNumberInBounds(newValue, min, max)) {
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

                // Check if the new value adheres to snap
                if (snap !== undefined && snapValue.current(newValue) !== newValue) {
                    // Invalid - show value but mark as invalid, don't fire callbacks
                    evt.currentTarget.setCustomValidity("Value doesn't match snap");
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
            [step, min, max, required, precision, wrap, snap],
        );

        // Check if cache value is invalid (doesn't adhere to snap, or out of bounds)
        const isInvalid = useMemo(() => {
            const normalized = normalize(cache);
            if (normalized === null) return false;
            const v = Number(normalized);
            if (!isFinite(v)) return false;

            // Check snap validity
            if (snap !== undefined && snapValue.current(v) !== v) {
                return true;
            }

            // Check bounds validity
            if (min !== undefined && max !== undefined) {
                if (v < min || v > max) {
                    return true;
                }
            }

            return false;
        }, [snap, cache, min, max]);

        const dataState = isInvalid ? "invalid" : undefined;

        return <BaseInput {...props} type={"text"} title={tooltip} data-flavour={flavour} data-state={dataState} value={cache} onChange={handleChange} onKeyDown={handleKeyDown} onBlur={handleBlur} />;
    };

    export namespace Numeric {
        export type Props = {
            value: EmptyOr<NumericString.Type>;
            onValue?: (n: EmptyOr<NumericString.Type>) => void;
            onCommit?: (n: EmptyOr<NumericString.Type>) => void;
            onConfirm?: (v: EmptyOr<NumericString.Type>) => void; // fires when you hit enter, even if no change was made
            min?: number | EmptyOr<NumericString.Type>;
            max?: number | EmptyOr<NumericString.Type>;
            step?: number | EmptyOr<NumericString.Type>;
            precision?: number | EmptyOr<NumericString.Type>;
            wrap?: number | EmptyOr<NumericString.Type>;
            snap?: number | EmptyOr<NumericString.Type> | (number | EmptyOr<NumericString.Type>)[]; // interval or discrete values
        } & Omit<BaseProps, "min" | "max" | "step" | "pattern">;
    }

    export const Measurement = <U extends string>({
        units,
        defaultUnit,
        value,
        converter,
        min,
        max,
        snap: snapProp,
        step: stepProp,
        wrap,
        onValue,
        onCommit,
        onConfirm,
        normalize,
        onBlur,
        onChange,
        onKeyDown,
        required = false,
        tooltip,
        flavour,
        ...props
    }: Measurement.Props<U>) => {
        const resolvedDefaultUnit = defaultUnit ?? units[0];

        const onKeyDownRef = useStable(onKeyDown);
        const onChangeRef = useStable(onChange);
        const onBlurRef = useStable(onBlur);
        const normalizeRef = useStable(normalize);
        const converterRef = useStable(converter);
        const unitsRef = useStable(units);

        const onValueRef = useStable(onValue);
        const onCommitRef = useStable(onCommit);
        const onConfirmRef = useStable(onConfirm);

        const valueRef = useRef<EmptyOr<Measure<U>>>(value);
        const lastValidRef = useRef<EmptyOr<Measure<U>>>(value);
        const lastUnitRef = useRef<U>(value ? (parseMeasure(value, units)?.[1] ?? resolvedDefaultUnit) : resolvedDefaultUnit);
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
                    const parsed = parseMeasure(value, units);
                    if (parsed) {
                        lastUnitRef.current = parsed[1];
                    }
                }
                setCache(value);
            }
        }, [value, units]);

        // Normalize: add unit if bare number, apply custom normalize
        const normalizeInternal = useCallback((v: string): EmptyOr<Measure<U>> => {
            if (v === "") return "" as EmptyOr<Measure<U>>;

            // Check if it's already a valid dimensioned value
            const parsed = parseMeasure(v, unitsRef.current);
            if (parsed) {
                const [num, unit] = parsed;
                lastUnitRef.current = unit;
                const result = formatMeasure(num, unit);
                return normalizeRef.current ? normalizeRef.current(result) : result;
            }

            // Check if it's a bare number
            if (NUMBER_REGEX.test(v)) {
                const num = Number(v);
                const result = formatMeasure(num, lastUnitRef.current);
                return normalizeRef.current ? normalizeRef.current(result) : result;
            }

            // Invalid
            return v as EmptyOr<Measure<U>>;
        }, []);

        // Snap a canonical value to the nearest snap point
        // displayUnit is needed because unit-less snap values are interpreted in the display unit

        const snapMeasure = useCallback(
            (canonicalValue: number, displayUnit: U): number => {
                if (snapProp === undefined) return canonicalValue;

                const snapValues = Array.isArray(snapProp) ? snapProp : [snapProp];

                // Convert all snap values to canonical, sorting as we find closest
                let closest = canonicalValue;
                let closestDist = Infinity;

                for (const snapVal of snapValues) {
                    let snapCanonical: number;

                    if (typeof snapVal === "number") {
                        // Numeric snap - interpret in display unit
                        if (converterRef.current) {
                            snapCanonical = converterRef.current[displayUnit].from(formatMeasure(snapVal, displayUnit));
                        } else {
                            snapCanonical = snapVal;
                        }
                    } else {
                        // String snap - could be with or without unit
                        const parsed = parseMeasure(snapVal, unitsRef.current);
                        if (parsed) {
                            // Has unit - convert to canonical
                            const [num, unit] = parsed;
                            if (converterRef.current) {
                                snapCanonical = converterRef.current[unit].from(formatMeasure(num, unit));
                            } else {
                                snapCanonical = num;
                            }
                        } else if (NUMBER_REGEX.test(snapVal)) {
                            // Bare number - interpret in display unit
                            const num = Number(snapVal);
                            if (converterRef.current) {
                                snapCanonical = converterRef.current[displayUnit].from(formatMeasure(num, displayUnit));
                            } else {
                                snapCanonical = num;
                            }
                        } else {
                            // Invalid snap value, skip
                            continue;
                        }
                    }

                    const dist = Math.abs(canonicalValue - snapCanonical);
                    if (dist < closestDist) {
                        closest = snapCanonical;
                        closestDist = dist;
                    }
                }

                return closest;
            },
            [snapProp],
        );

        // Check if a canonical value matches a snap point

        const isSnapValid = useCallback(
            (canonicalValue: number, displayUnit: U): boolean => {
                if (snapProp === undefined) return true;
                return snapMeasure(canonicalValue, displayUnit) === canonicalValue;
            },
            [snapMeasure, snapProp],
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
                const normalized = normalizeInternal(v);
                if (normalized === "" || !parseMeasure(normalized, unitsRef.current)) {
                    el.setCustomValidity("Invalid value");
                    return false;
                }

                // Check bounds
                if (!isMeasureInBounds(normalized, min, max, unitsRef.current, converterRef.current)) {
                    el.setCustomValidity("Value out of bounds");
                    return false;
                }

                el.setCustomValidity("");
                return true;
            },
            [pattern, required, normalizeInternal, min, max],
        );

        const handleChange = useCallback(
            (evt: ChangeEvent<HTMLInputElement>) => {
                onChangeRef.current?.(evt);
                if (evt.nativeEvent.handled) return;
                evt.nativeEvent.handled = "implied";

                const v = evt.target.value;
                setCache(v);

                if (validate(evt.target, v)) {
                    const normalized = normalizeInternal(v);
                    lastValidRef.current = normalized;
                    onValueRef.current?.(normalized);
                }
            },
            [validate, normalizeInternal],
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

                const normalized = normalizeInternal(v);

                // Check bounds
                if (normalized !== "" && !isMeasureInBounds(normalized, min, max, unitsRef.current, converterRef.current)) {
                    // Revert to last valid
                    setCache(lastValidRef.current);
                    evt.currentTarget.setCustomValidity("");
                    return;
                }

                // Apply wrapping if configured
                let finalValue: EmptyOr<Measure<U>> = normalized;
                if (normalized && wrap) {
                    const parsed = parseMeasure(normalized, unitsRef.current);
                    if (parsed) {
                        const [num, unit] = parsed;
                        finalValue = wrapMeasure(num, unit, min, max, wrap, unitsRef.current, converterRef.current);
                    }
                }

                // Apply snap if configured
                if (finalValue) {
                    const parsed = parseMeasure(finalValue, unitsRef.current);
                    if (parsed) {
                        const [, unit] = parsed;
                        const canonical = toCanonical(finalValue, unitsRef.current, converterRef.current);
                        const snappedCanonical = snapMeasure(canonical, unit);
                        if (snappedCanonical !== canonical) {
                            if (converterRef.current) {
                                finalValue = converterRef.current[unit].to(snappedCanonical);
                            } else {
                                finalValue = formatMeasure(snappedCanonical, unit);
                            }
                        }
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
            [required, pattern, normalizeInternal, min, max, wrap, snapMeasure],
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

                    const normalized = normalizeInternal(v);

                    if (normalized !== "" && !isMeasureInBounds(normalized, min, max, unitsRef.current, converterRef.current)) {
                        setCache(lastValidRef.current);
                        evt.currentTarget.setCustomValidity("");
                        onConfirmRef.current?.(lastValidRef.current);
                        return;
                    }

                    // Apply wrapping
                    let finalValue: EmptyOr<Measure<U>> = normalized;
                    if (normalized && wrap) {
                        const parsed = parseMeasure(normalized, unitsRef.current);
                        if (parsed) {
                            const [num, unit] = parsed;
                            finalValue = wrapMeasure(num, unit, min, max, wrap, unitsRef.current, converterRef.current);
                        }
                    }

                    // Apply snap if configured
                    if (finalValue) {
                        const parsed = parseMeasure(finalValue, unitsRef.current);
                        if (parsed) {
                            const [, unit] = parsed;
                            const canonical = toCanonical(finalValue, unitsRef.current, converterRef.current);
                            const snappedCanonical = snapMeasure(canonical, unit);
                            if (snappedCanonical !== canonical) {
                                if (converterRef.current) {
                                    finalValue = converterRef.current[unit].to(snappedCanonical);
                                } else {
                                    finalValue = formatMeasure(snappedCanonical, unit);
                                }
                            }
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
                let normalized = normalizeInternal(currentDisplay);
                if (normalized === "" || !parseMeasure(normalized, unitsRef.current)) {
                    normalized = lastValidRef.current;
                }
                if (normalized === "" || !parseMeasure(normalized, unitsRef.current)) return;

                const parsed = parseMeasure(normalized, unitsRef.current)!;
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
                    const stepParsed = parseMeasure(stepProp as string, unitsRef.current);
                    if (!stepParsed) {
                        stepAmount = 1;
                    } else {
                        const [stepNum, stepUnit] = stepParsed;
                        if (converterRef.current) {
                            // Convert step to canonical, then to current unit
                            const stepCanonical = converterRef.current[stepUnit].from(formatMeasure(stepNum, stepUnit));
                            const currentCanonical = converterRef.current[currentUnit].from(formatMeasure(currentNum, currentUnit));
                            const newCanonical = cleanFloat(currentCanonical + (evt.key === "ArrowUp" ? stepCanonical : -stepCanonical));
                            const newValue = converterRef.current[currentUnit].to(newCanonical);

                            // Check bounds
                            if (!isMeasureInBounds(newValue, min, max, unitsRef.current, converterRef.current)) {
                                // Try wrapping
                                if (wrap) {
                                    const wrappedParsed = parseMeasure(newValue, unitsRef.current);
                                    if (wrappedParsed) {
                                        const wrapped = wrapMeasure(wrappedParsed[0], wrappedParsed[1], min, max, wrap, unitsRef.current, converterRef.current);
                                        setCache(wrapped);
                                        lastValidRef.current = wrapped;
                                        onValueRef.current?.(wrapped);
                                        onCommitRef.current?.(wrapped);
                                    }
                                }
                                return;
                            }

                            setCache(newValue);

                            // Check snap validity (reuse newCanonical from above)
                            if (!isSnapValid(newCanonical, currentUnit)) {
                                // Invalid - show value but mark as invalid, don't fire callbacks
                                evt.currentTarget.setCustomValidity("Value doesn't match snap");
                                return;
                            }

                            evt.currentTarget.setCustomValidity("");
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
                let newValue = formatMeasure(newNum, currentUnit);

                // Check bounds
                if (!isMeasureInBounds(newValue, min, max, unitsRef.current, converterRef.current)) {
                    // Try wrapping
                    if (wrap) {
                        newValue = wrapMeasure(newNum, currentUnit, min, max, wrap, unitsRef.current, converterRef.current);
                        if (!isMeasureInBounds(newValue, min, max, unitsRef.current, converterRef.current)) {
                            return;
                        }
                    } else {
                        return;
                    }
                }

                setCache(newValue);

                // Check snap validity
                const canonical = toCanonical(newValue, unitsRef.current, converterRef.current);
                if (!isSnapValid(canonical, currentUnit)) {
                    // Invalid - show value but mark as invalid, don't fire callbacks
                    evt.currentTarget.setCustomValidity("Value doesn't match snap");
                    return;
                }

                evt.currentTarget.setCustomValidity("");
                lastValidRef.current = newValue;
                onValueRef.current?.(newValue);
                onCommitRef.current?.(newValue);
            },
            [normalizeInternal, stepProp, min, max, isSnapValid, required, pattern, wrap, snapMeasure],
        );

        // Check if cache value is invalid (doesn't adhere to snap)
        const isInvalid = useMemo(() => {
            if (cache === "") return false;
            if (snapProp === undefined) return false;

            const parsed = parseMeasure(cache, unitsRef.current);
            if (!parsed) return false;

            const [, unit] = parsed;
            const canonical = toCanonical(cache, unitsRef.current, converterRef.current);
            if (!isFinite(canonical)) return false;

            return !isSnapValid(canonical, unit);
        }, [cache, isSnapValid, snapProp]);

        const dataState = isInvalid ? "invalid" : undefined;

        return <BaseInput {...props} type="text" value={cache} data-state={dataState} onChange={handleChange} onKeyDown={handleKeyDown} onBlur={handleBlur} title={tooltip} data-flavour={flavour} />;
    };

    export namespace Measurement {
        export type Measure<U extends string> = `${number}${U}`;
        export type Converter<U extends string> = { [K in U]: { from: (value: Measure<K>) => number; to: (value: number) => Measure<K> } };

        export type Props<U extends string> = {
            units: U[] | readonly U[];
            defaultUnit?: U;
            value: EmptyOr<Measure<U>>;
            converter?: Converter<U>;
            min?: EmptyOr<Measure<U>>;
            max?: EmptyOr<Measure<U>>;
            step?: Measure<U> | number | `${number}` | ""; // empty string treated as undefined
            snap?: Measure<U> | number | `${number}` | (Measure<U> | number | `${number}`)[];
            wrap?: EmptyOr<Measure<U>>;
            onValue?: (v: EmptyOr<Measure<U>>) => void;
            onCommit?: (v: EmptyOr<Measure<U>>) => void;
            onConfirm?: (v: EmptyOr<Measure<U>>) => void;
            normalize?: (v: EmptyOr<Measure<U>>) => EmptyOr<Measure<U>>;
        } & Omit<DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>, "title" | "value"> & { tooltip?: string; flavour?: Flavour | "inherit" };
    }
}

type Measure<U extends string> = `${number}${U}`;
type Converter<U extends string> = { [K in U]: { from: (value: Measure<K>) => number; to: (value: number) => Measure<K> } };

function isNumberInBounds(value: number, min?: number, max?: number): boolean {
    if (min !== undefined && value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
}

// Wrap a value to a range, normalizing boundary values
function wrapNumber(value: number, min: number, max: number): number {
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
    return isNumberInBounds(value, min, max);
}

// Normalize value based on wrapping rules (wraps if doesWrap, otherwise returns as-is)
function normalizeWrappedValue(value: number, min: number | undefined, max: number | undefined, doesWrap: boolean): number {
    if (doesWrap && min !== undefined && max !== undefined) {
        return wrapNumber(value, min, max);
    }
    return value;
}

// Strict pattern for syntactic completeness (rejects "3." during typing)
const NUMBER_REGEX = /^[+-]?\d+(\.\d+)?$/;

// Check if a string is syntactically complete
function isComplete(v: string): boolean {
    return NUMBER_REGEX.test(v);
}

// Truncate floating point errors (e.g., 0.30000000000000004 → 0.3)
function cleanFloat(num: number): number {
    return Number(num.toFixed(10));
}

// Normalize a string to its canonical numeric form, or null if not a valid number
function normalize(v: string): string | null {
    const n = Number(v);
    if (isNaN(n)) return null;
    return String(cleanFloat(n));
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

// Parse a dimensioned value into [number, unit] or null if invalid
function parseMeasure<U extends string>(value: string, units: readonly U[]): [number, U] | null {
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

// Format a number with a unit
function formatMeasure<U extends string>(num: number, unit: U): Measure<U> {
    return `${cleanFloat(num)}${unit}`;
}

// Get numeric value, using converter if present, otherwise just the number portion
function toCanonical<U extends string>(value: string, units: readonly U[], converter?: Converter<U>): number {
    const parsed = parseMeasure(value, units);
    if (!parsed) return NaN;
    const [num, unit] = parsed;
    if (converter) {
        return converter[unit].from(formatMeasure(num, unit));
    }
    return num;
}

// Check if value is within bounds
function isMeasureInBounds<U extends string>(value: string, min: string | undefined, max: string | undefined, units: readonly U[], converter?: Converter<U>): boolean {
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
function wrapMeasure<U extends string>(value: number, unit: U, min: string | undefined, max: string | undefined, wrap: string | undefined, units: readonly U[], converter?: Converter<U>): Measure<U> {
    if (!wrap || wrap === "" || !min || min === "" || !max || max === "") {
        return formatMeasure(value, unit);
    }

    const minV = toCanonical(min, units, converter);
    const maxV = toCanonical(max, units, converter);
    const wrapV = toCanonical(wrap, units, converter);

    // Only wrap if the range matches the wrap value
    if (Math.abs(maxV - minV - wrapV) > 0.0001) {
        return formatMeasure(value, unit);
    }

    // Convert value to canonical for wrapping
    let canonical = converter ? converter[unit].from(formatMeasure(value, unit)) : value;

    // Wrap the canonical value
    const range = maxV - minV;
    canonical = cleanFloat(((((canonical - minV) % range) + range) % range) + minV);

    // Convert back to the original unit
    if (converter) {
        return converter[unit].to(canonical);
    }
    return formatMeasure(canonical, unit);
}

export type AbstractSelectProps = Omit<DetailedHTMLProps<SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement>, "title"> & { tooltip?: string; flavour?: Flavour | "inherit" };

export const AbstractSelect = styled(({ tooltip, flavour, ...props }: AbstractSelectProps) => {
    return <select {...props} title={tooltip} data-flavour={flavour} />;
})`
    background: #111;
    padding: 0.25em 0.4em;
    font-family: monospace;
    border: 1px solid #666;
    outline: 1px solid transparent;
    outline-offset: 0px;
    transition: outline-offset 0.1s ease;
    &:focus-visible {
        outline-color: #fffa;
        outline-offset: -2px;
    }
    &:disabled {
        opacity: 0.6;
    }
    min-width: 0;
    flex: 1 1;
`;
