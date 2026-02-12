import { ChangeEvent, DetailedHTMLProps, InputHTMLAttributes, SelectHTMLAttributes, useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { Flavour } from "../types";
import { useStable } from "../../util/hooks/useStable";
import { NumericString } from "../../definitions/datatypes/numericString";
import { EmptyOr } from "../../util/misc";
import { useStableValue } from "../../util/hooks/useStableValue";
import { useCombinedRef } from "../../util/hooks/useCombinedRef";

export namespace AbstractInput {
    type BaseProps = Omit<DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>, "title" | "value"> & { tooltip?: string };

    export function Text<T extends string = string>({
        value,
        onValue,
        onCommit,
        onConfirm,
        onBlur,
        onFocus,
        pattern,
        onChange,
        onKeyDown,
        required = false,
        normalize,
        tooltip,
        ...props
    }: Text.Props<T>) {
        const onKeyDownRef = useStable(onKeyDown);
        const onChangeRef = useStable(onChange);
        const onBlurRef = useStable(onBlur);
        const onFocusRef = useStable(onFocus);
        const normalizeRef = useStable(normalize);

        const valueRef = useRef<T>(value);
        const lastValidRef = useRef<T>(value);
        const [cache, setCache] = useState<string>(value);
        const isFocusedRef = useRef(false);

        useEffect(() => {
            if (valueRef.current !== value) {
                valueRef.current = value;
                lastValidRef.current = value;
                // Don't clobber the display while user is typing
                if (!isFocusedRef.current) {
                    setCache(value);
                }
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

        const handleFocus = useCallback((evt: React.FocusEvent<HTMLInputElement>) => {
            onFocusRef.current?.(evt);
            isFocusedRef.current = true;
        }, []);

        // On blur - commit or revert
        const handleBlur = useCallback(
            (evt: React.FocusEvent<HTMLInputElement>) => {
                isFocusedRef.current = false;
                onBlurRef.current?.(evt);
                if (evt.nativeEvent.handled) {
                    return;
                }
                evt.nativeEvent.handled = "implied";

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

        return <input {...props} type={"text"} value={cache} onChange={handleChange} onKeyDown={handleKeyDown} onBlur={handleBlur} onFocus={handleFocus} title={tooltip} />;
    }

    export namespace Text {
        export type Props<T extends string = string> = {
            value: T;
            onValue?: (v: T) => void;
            onCommit?: (v: T) => void;
            onConfirm?: (v: T) => void; // fires when you hit enter, even if no change was made
            normalize?: (v: T) => T;
        } & BaseProps;
    }

    export function Numeric({
        value,
        onBlur,
        onFocus,
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
        normalize,
        tooltip,
        ref,
        ...props
    }: Numeric.Props) {
        const stableSnap = useStableValue(snapProp);
        const normalizeRef = useStable(normalize);

        const { precision, min, max, step, wrap, snap } = useMemo(() => {
            const precisionRaw = typeof precisionProp === "number" ? precisionProp : (NumericString.Emptyable.asNumber(precisionProp ?? "") ?? undefined);
            const wrapRaw = typeof wrapProp === "number" ? wrapProp : (NumericString.Emptyable.asNumber(wrapProp ?? "") ?? undefined);
            const minRaw = typeof minProp === "number" ? minProp : (NumericString.Emptyable.asNumber(minProp ?? "") ?? undefined);
            const maxRaw = typeof maxProp === "number" ? maxProp : (NumericString.Emptyable.asNumber(maxProp ?? "") ?? undefined);
            const stepRaw = typeof stepProp === "number" ? stepProp : (NumericString.Emptyable.asNumber(stepProp ?? "") ?? undefined);

            // Parse snap: either a number (interval) or array of numbers (discrete values)
            let snapParsed: number | number[] | undefined;
            if (Array.isArray(stableSnap)) {
                snapParsed = stableSnap
                    .map((v) => (typeof v === "number" ? v : NumericString.Emptyable.asNumber(v ?? "")))
                    .filter((v): v is number => v !== null && !Number.isNaN(v))
                    .sort((a, b) => a - b);
                if (snapParsed.length === 0) snapParsed = undefined;
            } else if (stableSnap !== undefined) {
                snapParsed = typeof stableSnap === "number" ? stableSnap : (NumericString.Emptyable.asNumber(stableSnap ?? "") ?? undefined);
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
        }, [precisionProp, minProp, maxProp, stepProp, wrapProp, stableSnap]);

        const onKeyDownRef = useStable(onKeyDown);
        const onBlurRef = useStable(onBlur);
        const onFocusRef = useStable(onFocus);
        const onChangeRef = useStable(onChange);

        const [inputRef, inputRefMaker] = useCombinedRef(ref);
        const valueRef = useRef<string>(value);
        const lastValidRef = useRef<string>(value); // tracks last valid value internally
        const [cache, setCache] = useState<string>(value);
        const isFocusedRef = useRef(false);

        const normalizeCacheRef = useRef(normalizeNumeric(cache));

        // * this might be worth adding a ref'd version of cache
        // On incoming prop change: only update display if normalized values differ
        // This prevents partials from being clobbered during typing
        useEffect(() => {
            if (valueRef.current !== value) {
                valueRef.current = value;
                lastValidRef.current = value; // prop change resets last valid
                const normalizedValue = normalizeNumeric(value);
                // Only update cache if the numeric values are different AND not focused
                if (normalizeCacheRef.current !== normalizedValue && !isFocusedRef.current) {
                    setCache(value);
                    normalizeCacheRef.current = normalizedValue;
                }
            }
        }, [value]);

        const onValueRef = useStable(onValue);
        const onCommitRef = useStable(onCommit);
        const onConfirmRef = useStable(onConfirm);

        const validate = useCallback(
            (currentValue: EmptyOr<NumericString.Type>, el: HTMLInputElement): EmptyOr<NumericString.Type> | null => {
                // Empty is valid when not required
                if (currentValue === "") {
                    el.setCustomValidity(required ? "Value is required" : "");
                    return required ? null : "";
                }

                if (!NUMBER_REGEX.test(currentValue)) {
                    el.setCustomValidity("Not a valid number");
                    return null;
                }

                const normalized = normalizeNumeric(currentValue);
                if (normalized === null || !isFinite(Number(normalized))) {
                    el.setCustomValidity("Not a valid number");
                    return null;
                }

                const v = Number(normalized);

                // Check bounds validity
                if (min !== undefined && v < min) {
                    el.setCustomValidity("Value is below minimum");
                    return null;
                }
                if (max !== undefined && v > max) {
                    el.setCustomValidity("Value is above maximum");
                    return null;
                }

                // Check snap validity
                if (snap !== undefined && snapNumber(v, snap) !== v) {
                    el.setCustomValidity("Value doesn't match snap");
                    return null;
                }

                // Check precision validity
                if (precision !== undefined && applyPrecision(v, precision) !== v) {
                    el.setCustomValidity("Too many decimal places");
                    return null;
                }

                el.setCustomValidity("");
                return normalized as NumericString.Type;
            },
            [snap, min, max, precision, required],
        );

        // this will revalidate when a new value comes in, or when the validation rules change due to validation itself changing
        useEffect(() => {
            if (!inputRef.current) return;
            validate(value, inputRef.current);
        }, [validate, value]);

        const validateRef = useStable(validate);

        // Shared commit logic for blur and Enter key
        // Returns the final value (for onConfirm to use)
        const commitValue = useCallback(
            (el: HTMLInputElement): EmptyOr<NumericString.Type> => {
                const v = el.value;

                // Empty is valid when not required
                if (!required && v === "") {
                    el.setCustomValidity("");
                    setCache(v);
                    normalizeCacheRef.current = normalizeNumeric(v);
                    if (valueRef.current !== "") {
                        onCommitRef.current?.("");
                    }
                    return "";
                }

                const normalized = normalizeNumeric(v);
                if (normalized === null || (!wrap && !isNumberInBounds(Number(normalized), min, max))) {
                    // Invalid or out of bounds - revert to last known good value
                    el.setCustomValidity("");
                    setCache(lastValidRef.current);
                    normalizeCacheRef.current = normalizeNumeric(lastValidRef.current);
                    return lastValidRef.current as EmptyOr<NumericString.Type>;
                }

                // Valid - apply snap, then wrapping if needed, then precision and format for display
                el.setCustomValidity("");
                const asNumber = Number(normalized);
                const snappedValue = snapNumber(asNumber, snap);
                const wrappedValue = cleanFloat(wrap && min !== undefined && max !== undefined ? wrapNumber(snappedValue, min, max) : snappedValue);
                const precisionApplied = precision !== undefined ? applyPrecision(wrappedValue, precision) : wrappedValue;
                const finalValue = normalizeRef.current ? normalizeRef.current(String(precisionApplied) as NumericString.Type) : (String(precisionApplied) as NumericString.Type);
                const displayValue = precision !== undefined ? formatForDisplay(Number(finalValue), precision) : finalValue;
                setCache(displayValue);
                normalizeCacheRef.current = normalizeNumeric(displayValue);

                // Only fire callbacks if value differs from prop
                onValueRef.current?.(finalValue);
                onCommitRef.current?.(finalValue);
                lastValidRef.current = finalValue;
                return finalValue;
            },
            [required, min, max, wrap, snap, precision],
        );

        // During typing (native 'input' event via React onChange)
        const handleChange = useCallback((evt: ChangeEvent<HTMLInputElement>) => {
            onChangeRef.current?.(evt);
            if (evt.nativeEvent.handled) {
                return;
            }
            evt.nativeEvent.handled = "implied";
            const v = evt.target.value;
            setCache(v);
            normalizeCacheRef.current = normalizeNumeric(v);

            const normalized = validateRef.current(v as EmptyOr<NumericString.Type>, evt.target);
            if (normalized === null) {
                return;
            }

            lastValidRef.current = normalized;

            // Only fire onValue if the normalized value differs from current state
            if (normalized !== normalizeNumeric(valueRef.current)) {
                onValueRef.current?.(normalized);
            }
        }, []);

        const handleFocus = useCallback((evt: React.FocusEvent<HTMLInputElement>) => {
            onFocusRef.current?.(evt);
            isFocusedRef.current = true;
        }, []);

        // On blur - commit the value
        const handleBlur = useCallback(
            (evt: React.FocusEvent<HTMLInputElement>) => {
                isFocusedRef.current = false;
                onBlurRef.current?.(evt);
                if (evt.nativeEvent.handled) {
                    return;
                }
                commitValue(evt.currentTarget);
            },
            [commitValue],
        );

        // Arrow key handling for step increments, Enter key for submit
        const handleKeyDown = useCallback(
            (evt: React.KeyboardEvent<HTMLInputElement>) => {
                onKeyDownRef.current?.(evt);
                if (evt.nativeEvent.handled) {
                    return;
                }

                // Handle Enter key for onConfirm
                if (evt.key === "Enter") {
                    evt.nativeEvent.handled = "implied";
                    const finalValue = commitValue(evt.currentTarget);
                    onConfirmRef.current?.(finalValue);
                    return;
                }

                if (evt.key !== "ArrowUp" && evt.key !== "ArrowDown") return;
                evt.nativeEvent.handled = "implied";
                evt.preventDefault();

                // Step from current displayed value if valid, otherwise last valid value
                const currentDisplayed = evt.currentTarget.value;
                const normalized = normalizeNumeric(currentDisplayed) ?? normalizeNumeric(lastValidRef.current);
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
                normalizeCacheRef.current = normalizeNumeric(newValueStr);

                // Check if the new value adheres to precision
                if (precision !== undefined && applyPrecision(newValue, precision) !== newValue) {
                    // Invalid - show value but mark as invalid, don't fire callbacks
                    evt.currentTarget.setCustomValidity("Too many decimal places");
                    return;
                }

                // Check if the new value adheres to snap
                if (snap !== undefined && snapNumber(newValue, snap) !== newValue) {
                    // Invalid - show value but mark as invalid, don't fire callbacks
                    evt.currentTarget.setCustomValidity("Value doesn't match snap");
                    return;
                }

                // Valid - clear validity and fire callbacks
                evt.currentTarget.setCustomValidity("");
                const normalizedNewValue = normalizeRef.current ? normalizeRef.current(newValueStr as NumericString.Type) : (newValueStr as NumericString.Type);
                lastValidRef.current = normalizedNewValue;
                setCache(normalizedNewValue);
                normalizeCacheRef.current = normalizeNumeric(normalizedNewValue);

                onValueRef.current?.(normalizedNewValue);
                onCommitRef.current?.(normalizedNewValue);
            },
            [commitValue, precision, step, wrap, min, max, snap],
        );

        return <input {...props} type={"text"} ref={inputRefMaker} title={tooltip} value={cache} onChange={handleChange} onKeyDown={handleKeyDown} onBlur={handleBlur} onFocus={handleFocus} />;
    }

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
            normalize?: (v: EmptyOr<NumericString.Type>) => EmptyOr<NumericString.Type>;
        } & Omit<BaseProps, "min" | "max" | "step" | "pattern">;
    }

    export function Measurement<U extends string>({
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
        onFocus,
        onChange,
        onKeyDown,
        required = false,
        tooltip,
        ref,
        ...props
    }: Measurement.Props<U>) {
        const unitsStable = useStableValue(units);
        const snapStable = useStableValue(snapProp);

        const resolvedDefaultUnit = defaultUnit ?? unitsStable[0];

        const onKeyDownRef = useStable(onKeyDown);
        const onChangeRef = useStable(onChange);
        const onBlurRef = useStable(onBlur);
        const onFocusRef = useStable(onFocus);
        const normalizeRef = useStable(normalize);
        const converterRef = useStable(converter);
        const unitsRef = useStable(unitsStable);
        const snapRef = useStable(snapStable);

        const onValueRef = useStable(onValue);
        const onCommitRef = useStable(onCommit);
        const onConfirmRef = useStable(onConfirm);

        const [inputRef, inputRefMaker] = useCombinedRef(ref);
        const valueRef = useRef<EmptyOr<Measure<U>>>(value);
        const lastValidRef = useRef<EmptyOr<Measure<U>>>(value);
        const lastUnitRef = useRef<U>(value ? (parseMeasure(value, unitsStable)?.[1] ?? resolvedDefaultUnit) : resolvedDefaultUnit);
        const [cache, setCache] = useState<string>(value);
        const isFocusedRef = useRef(false);

        // Pattern: optional number, optional unit (for lenient typing)
        const pattern = useMemo(() => {
            const unitPattern = unitsStable.map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
            // Allow: empty (if not required), bare number, or number+unit
            return `([+-]?\\d*\\.?\\d+)(${unitPattern})?`;
        }, [unitsStable]);

        // Sync with incoming prop
        useEffect(() => {
            if (valueRef.current !== value) {
                valueRef.current = value;
                lastValidRef.current = value;
                if (value) {
                    const parsed = parseMeasure(value, unitsStable);
                    if (parsed) {
                        lastUnitRef.current = parsed[1];
                    }
                }
                // Don't clobber the display while user is typing
                if (!isFocusedRef.current) {
                    setCache(value);
                }
            }
        }, [unitsStable, value]);

        // Normalize: add unit if bare number, apply custom normalize
        const normalizeMeasure = useCallback((v: string): EmptyOr<Measure<U>> => {
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

        // Validate value against pattern, bounds, and snap
        const validate = useCallback(
            (el: HTMLInputElement, v: string): EmptyOr<Measure<U>> | null => {
                if (v === "") {
                    el.setCustomValidity(required ? "Value is required" : "");
                    return required ? null : ("" as EmptyOr<Measure<U>>);
                }

                const regex = new RegExp(`^${pattern}$`);
                if (!regex.test(v)) {
                    el.setCustomValidity("Invalid format");
                    return null;
                }

                // Normalize to check bounds
                const normalized = normalizeMeasure(v);
                if (normalized === "" || !parseMeasure(normalized, unitsStable)) {
                    el.setCustomValidity("Invalid value");
                    return null;
                }

                // Check bounds
                if (!isMeasureInBounds(normalized, min, max, unitsStable, converterRef.current)) {
                    el.setCustomValidity("Value out of bounds");
                    return null;
                }

                // Check snap validity
                const parsed = parseMeasure(normalized, unitsStable);
                if (parsed) {
                    const [, unit] = parsed;
                    const canonical = toCanonical(normalized, unitsStable, converterRef.current);
                    if (snapStable !== undefined) {
                        if (snapMeasure(canonical, unit, snapStable, unitsStable, converterRef.current) !== canonical) {
                            el.setCustomValidity("Value doesn't match snap");
                            return null;
                        }
                    }
                }

                el.setCustomValidity("");
                return normalized;
            },
            [pattern, required, normalizeMeasure, min, max, unitsStable, snapStable],
        );

        // Revalidate when value or validation rules change
        useEffect(() => {
            if (!inputRef.current) return;
            validate(inputRef.current, value);
        }, [validate, value]);

        // Shared commit logic for blur and Enter key
        // Returns the final value (for onConfirm to use)
        const commitValue = useCallback(
            (el: HTMLInputElement): EmptyOr<Measure<U>> => {
                const v = el.value;

                // Empty is valid when not required
                if (!required && v === "") {
                    el.setCustomValidity("");
                    setCache("");
                    if (valueRef.current !== "") {
                        onCommitRef.current?.("");
                    }
                    return "" as EmptyOr<Measure<U>>;
                }

                const regex = new RegExp(`^${pattern}$`);
                if (!regex.test(v)) {
                    // Invalid format - revert to last known good value
                    el.setCustomValidity("");
                    setCache(lastValidRef.current);
                    return lastValidRef.current;
                }

                const normalized = normalizeMeasure(v);

                // Check bounds
                if (normalized !== "" && !isMeasureInBounds(normalized, min, max, unitsRef.current, converterRef.current)) {
                    // Out of bounds - revert to last known good value
                    el.setCustomValidity("");
                    setCache(lastValidRef.current);
                    return lastValidRef.current;
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
                if (finalValue && snapRef.current !== undefined) {
                    const parsed = parseMeasure(finalValue, unitsRef.current);
                    if (parsed) {
                        const [, unit] = parsed;
                        const canonical = toCanonical(finalValue, unitsRef.current, converterRef.current);
                        const snappedCanonical = snapMeasure(canonical, unit, snapRef.current, unitsRef.current, converterRef.current);
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
                el.setCustomValidity("");

                onValueRef.current?.(finalValue);
                onCommitRef.current?.(finalValue);
                lastValidRef.current = finalValue;
                return finalValue;
            },
            [required, pattern, normalizeMeasure, min, max, wrap],
        );

        const handleChange = useCallback(
            (evt: ChangeEvent<HTMLInputElement>) => {
                onChangeRef.current?.(evt);
                if (evt.nativeEvent.handled) return;
                evt.nativeEvent.handled = "implied";

                const v = evt.target.value;
                setCache(v);

                const normalized = validate(evt.target, v);
                if (normalized === null) {
                    return;
                }

                lastValidRef.current = normalized;

                if (normalized !== valueRef.current) {
                    onValueRef.current?.(normalized);
                }
            },
            [validate],
        );

        const handleFocus = useCallback((evt: React.FocusEvent<HTMLInputElement>) => {
            onFocusRef.current?.(evt);
            isFocusedRef.current = true;
        }, []);

        const handleBlur = useCallback(
            (evt: React.FocusEvent<HTMLInputElement>) => {
                isFocusedRef.current = false;
                onBlurRef.current?.(evt);
                if (evt.nativeEvent.handled) return;
                commitValue(evt.currentTarget);
            },
            [commitValue],
        );

        const handleKeyDown = useCallback(
            (evt: React.KeyboardEvent<HTMLInputElement>) => {
                onKeyDownRef.current?.(evt);
                if (evt.nativeEvent.handled) return;

                if (evt.key === "Enter") {
                    evt.nativeEvent.handled = "implied";
                    const finalValue = commitValue(evt.currentTarget);
                    onConfirmRef.current?.(finalValue);
                    return;
                }

                if (evt.key !== "ArrowUp" && evt.key !== "ArrowDown") return;
                evt.nativeEvent.handled = "implied";
                evt.preventDefault();

                // Get current value to step from
                const currentDisplay = evt.currentTarget.value;
                let normalized = normalizeMeasure(currentDisplay);
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
                            if (snapRef.current !== undefined) {
                                if (snapMeasure(newCanonical, currentUnit, snapRef.current, unitsRef.current, converterRef.current) !== newCanonical) {
                                    evt.currentTarget.setCustomValidity("Value doesn't match snap");
                                    return;
                                }
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
                if (snapRef.current !== undefined) {
                    if (snapMeasure(canonical, currentUnit, snapRef.current, unitsRef.current, converterRef.current) !== canonical) {
                        evt.currentTarget.setCustomValidity("Value doesn't match snap");
                        return;
                    }
                }

                evt.currentTarget.setCustomValidity("");
                lastValidRef.current = newValue;
                onValueRef.current?.(newValue);
                onCommitRef.current?.(newValue);
            },
            [commitValue, normalizeMeasure, stepProp, min, max, wrap],
        );

        return <input {...props} ref={inputRefMaker} type="text" value={cache} onChange={handleChange} onKeyDown={handleKeyDown} onBlur={handleBlur} onFocus={handleFocus} title={tooltip} />;
    }

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
        } & BaseProps;
    }
}

type Measure<U extends string> = `${number}${U}`;
type Converter<U extends string> = { [K in U]: { from: (value: Measure<K>) => number; to: (value: number) => Measure<K> } };

function isNumberInBounds(value: number, min?: number, max?: number): boolean {
    if (min !== undefined && value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
}

function snapNumber(value: number, snap: undefined | number | number[]) {
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

// Strict pattern for syntactic completeness (rejects "3." during typing)
const NUMBER_REGEX = /^[+-]?\d+(\.\d+)?$/;

// Truncate floating point errors (e.g., 0.30000000000000004 → 0.3)
function cleanFloat(num: number): number {
    return Number(num.toFixed(10));
}

// Normalize a string to its canonical numeric form, or null if not a valid number
function normalizeNumeric(v: string): string | null {
    if (v === "") return "";
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

// Snap a canonical value to the nearest snap point
// displayUnit is needed because unit-less snap values are interpreted in the display unit
type SnapValue<U extends string> = Measure<U> | number | `${number}`;
function snapMeasure<U extends string>(canonicalValue: number, displayUnit: U, snap: SnapValue<U> | SnapValue<U>[] | undefined, units: readonly U[], converter?: Converter<U>): number {
    if (snap === undefined) return canonicalValue;

    const snapValues = Array.isArray(snap) ? snap : [snap];

    let closest = canonicalValue;
    let closestDist = Infinity;

    for (const snapVal of snapValues) {
        let snapCanonical: number;

        if (typeof snapVal === "number") {
            // Numeric snap - interpret in display unit
            if (converter) {
                snapCanonical = converter[displayUnit].from(formatMeasure(snapVal, displayUnit));
            } else {
                snapCanonical = snapVal;
            }
        } else {
            // String snap - could be with or without unit
            const parsed = parseMeasure(snapVal, units);
            if (parsed) {
                // Has unit - convert to canonical
                const [num, unit] = parsed;
                if (converter) {
                    snapCanonical = converter[unit].from(formatMeasure(num, unit));
                } else {
                    snapCanonical = num;
                }
            } else if (NUMBER_REGEX.test(snapVal)) {
                // Bare number - interpret in display unit
                const num = Number(snapVal);
                if (converter) {
                    snapCanonical = converter[displayUnit].from(formatMeasure(num, displayUnit));
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
