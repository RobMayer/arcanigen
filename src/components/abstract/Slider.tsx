import { DetailedHTMLProps, HTMLAttributes, Ref, useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { Flavour } from "../types";
import { NumericString } from "../../definitions/datatypes/numericString";
import { EmptyOr } from "../../util/misc";
import { useCombinedRef } from "../../util/hooks/useCombinedRef";
import { useStable } from "../../util/hooks/useStable";
import { Icon, IconDefinition, ICONS } from "../Icon";
import { useStableValue } from "../../util/hooks/useStableValue";

export namespace AbstractSlider {
    export const Linear = styled(
        ({
            value,
            onValue,
            onKeyDown,
            onCommit,
            min: minProp = "0",
            max: maxProp = "1",
            step: stepProp = "0.01",
            snap: snapProp,
            normalize,
            tooltip,
            flavour = "accent",
            disabled,
            tabIndex,
            ref,
            handleRef,
            ...rest
        }: Linear.Props) => {
            const snapStable = useStableValue(snapProp);
            const onKeyDownRef = useStable(onKeyDown);

            const [, makeInnerRef] = useCombinedRef(ref);
            const [innerHandleRef, makeInnerHandleRef] = useCombinedRef(handleRef);

            const [cache, setCache] = useState(value);
            const trackRef = useRef<SVGSVGElement>(null);

            useEffect(() => {
                setCache(value);
            }, [value]);

            const onValueRef = useStable(onValue);
            const onCommitRef = useStable(onCommit);
            const normalizeRef = useStable(normalize);
            const cacheRef = useStable(cache);

            const { min, max, step, snap } = useMemo(() => {
                const minRaw = typeof minProp === "number" ? minProp : (NumericString.Emptyable.asNumber(minProp ?? "") ?? 0);
                const maxRaw = typeof maxProp === "number" ? maxProp : (NumericString.Emptyable.asNumber(maxProp ?? "") ?? 1);
                const stepRaw = typeof stepProp === "number" ? stepProp : (NumericString.Emptyable.asNumber(stepProp ?? "") ?? undefined);

                let snapParsed: number | number[] | undefined;
                if (Array.isArray(snapStable)) {
                    snapParsed = snapStable
                        .map((v) => (typeof v === "number" ? v : NumericString.Emptyable.asNumber(v ?? "")))
                        .filter((v): v is number => v !== null && !Number.isNaN(v))
                        .sort((a, b) => a - b);
                    if (snapParsed.length === 0) snapParsed = undefined;
                } else if (snapStable !== undefined) {
                    snapParsed = typeof snapStable === "number" ? snapStable : (NumericString.Emptyable.asNumber(snapStable ?? "") ?? undefined);
                }

                return { min: minRaw, max: maxRaw, step: stepRaw, snap: snapParsed };
            }, [minProp, maxProp, stepProp, snapStable]);

            const snapRef = useStable(snap);

            // Compute the fraction (0-1) for positioning the handle
            const fraction = useMemo(() => {
                const v = NumericString.Emptyable.asNumber(cache ?? "") ?? min;
                if (max - min === 0) return 0;
                return Math.max(0, Math.min(1, (v - min) / (max - min)));
            }, [cache, min, max]);

            // Get fraction (0-1) from pointer X relative to the track
            const getFractionFromEvent = useCallback((e: PointerEvent) => {
                const track = trackRef.current;
                if (!track) return null;
                const rect = track.getBoundingClientRect();
                if (rect.width === 0) return null;
                return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            }, []);

            const dragStateRef = useRef<{ lastX: number; accumulatedValue: number } | null>(null);
            const rafRef = useRef<number | null>(null);

            // Pointer drag handling
            useEffect(() => {
                const handle = innerHandleRef.current;
                const track = trackRef.current;
                if (!handle || !track || disabled) return;

                // Handle click: offset grab (maintains current value, tracks delta)
                const handlePointerDown = (e: PointerEvent) => {
                    if (e.button !== 0) return;
                    if (e.handled) {
                        return;
                    }
                    e.handled = "implied";
                    handle.setPointerCapture(e.pointerId);
                    const currentValue = NumericString.Emptyable.asNumber(cacheRef.current ?? "") ?? min;
                    dragStateRef.current = { lastX: e.clientX, accumulatedValue: currentValue };
                };

                // Track click: jump to position, then allow dragging
                const handleTrackPointerDown = (e: PointerEvent) => {
                    if (e.button !== 0) return;
                    if (e.target === handle || handle.contains(e.target as Node)) return;
                    if (e.handled) {
                        return;
                    }
                    e.handled = "implied";

                    handle.setPointerCapture(e.pointerId);

                    const frac = getFractionFromEvent(e);
                    if (frac === null) return;

                    let newValue = min + frac * (max - min);
                    if (step !== undefined) newValue = Math.round(newValue / step) * step;
                    newValue = Math.max(min, Math.min(max, cleanFloat(newValue)));

                    dragStateRef.current = { lastX: e.clientX, accumulatedValue: newValue };

                    // Update DOM directly
                    const visualFrac = max - min === 0 ? 0 : (newValue - min) / (max - min);
                    handle.style.left = `${visualFrac * 100}%`;

                    // Update React state
                    const valueStr = String(newValue) as NumericString.Type;
                    setCache(valueStr);
                    onValueRef.current?.(valueStr);
                };

                const handlePointerMove = (e: PointerEvent) => {
                    if (!dragStateRef.current) return;
                    if (e.handled) {
                        return;
                    }
                    e.handled = "implied";

                    const rect = track.getBoundingClientRect();
                    if (rect.width === 0) return;

                    const { lastX, accumulatedValue } = dragStateRef.current;
                    const deltaX = e.clientX - lastX;
                    const valueDelta = (deltaX / rect.width) * (max - min);
                    let newValue = accumulatedValue + valueDelta;

                    // Clamp to bounds
                    const clamped = Math.max(min, Math.min(max, newValue));
                    const wasClamped = clamped !== newValue;
                    newValue = clamped;

                    // If clamped, adjust lastX so reversing direction responds immediately
                    let newLastX = e.clientX;
                    if (wasClamped) {
                        const overshootPx = ((accumulatedValue + valueDelta - newValue) / (max - min)) * rect.width;
                        newLastX = e.clientX - overshootPx;
                    }

                    dragStateRef.current = { lastX: newLastX, accumulatedValue: cleanFloat(newValue) };

                    // Snap for visual display
                    let snappedValue = snapNumber(newValue, snapRef.current);
                    snappedValue = Math.max(min, Math.min(max, snappedValue));

                    // Update DOM directly for smooth visuals
                    const visualFrac = max - min === 0 ? 0 : (snappedValue - min) / (max - min);
                    handle.style.left = `${visualFrac * 100}%`;

                    // Throttle React state updates via RAF
                    if (rafRef.current === null) {
                        rafRef.current = requestAnimationFrame(() => {
                            rafRef.current = null;
                            if (!dragStateRef.current) return;
                            let snapped = snapNumber(dragStateRef.current.accumulatedValue, snapRef.current);
                            snapped = Math.max(min, Math.min(max, snapped));
                            const valueStr = String(cleanFloat(snapped)) as NumericString.Type;
                            setCache(valueStr);
                            onValueRef.current?.(valueStr);
                        });
                    }
                };

                const handlePointerUp = (e: PointerEvent) => {
                    if (e.handled) {
                        return;
                    }
                    e.handled = "implied";
                    if (!dragStateRef.current) return;

                    let finalValue = snapNumber(dragStateRef.current.accumulatedValue, snapRef.current);
                    finalValue = Math.max(min, Math.min(max, finalValue));
                    dragStateRef.current = null;

                    // Cancel any pending RAF
                    if (rafRef.current !== null) {
                        cancelAnimationFrame(rafRef.current);
                        rafRef.current = null;
                    }

                    // Set inline style to final value to prevent flicker
                    const visualFrac = max - min === 0 ? 0 : (finalValue - min) / (max - min);
                    handle.style.left = `${visualFrac * 100}%`;

                    // Update cache first, then fire callbacks
                    const valueStr = String(cleanFloat(finalValue)) as NumericString.Type;
                    const normalized = normalizeRef.current ? normalizeRef.current(valueStr) : valueStr;
                    setCache(normalized);
                    onValueRef.current?.(normalized as NumericString.Type);
                    onCommitRef.current?.(normalized as NumericString.Type);
                };

                handle.addEventListener("pointerdown", handlePointerDown);
                handle.addEventListener("pointermove", handlePointerMove);
                handle.addEventListener("pointerup", handlePointerUp);
                track.addEventListener("pointerdown", handleTrackPointerDown);

                return () => {
                    handle.removeEventListener("pointerdown", handlePointerDown);
                    handle.removeEventListener("pointermove", handlePointerMove);
                    handle.removeEventListener("pointerup", handlePointerUp);
                    track.removeEventListener("pointerdown", handleTrackPointerDown);
                    if (rafRef.current !== null) {
                        cancelAnimationFrame(rafRef.current);
                        rafRef.current = null;
                    }
                };
            }, [disabled, getFractionFromEvent, min, max, step]);

            // Keyboard handling
            const handleKeyDown = useCallback(
                (e: React.KeyboardEvent<HTMLDivElement>) => {
                    onKeyDownRef.current?.(e);
                    if (disabled) return;
                    if (e.nativeEvent.handled) {
                        return;
                    }
                    e.nativeEvent.handled = "implied";

                    const currentValue = NumericString.Emptyable.asNumber(cacheRef.current ?? "") ?? min;
                    const currentSnap = snapRef.current;
                    let newValue: number | null = null;

                    // Array snap: navigate directly to next/prev snap value
                    if (Array.isArray(currentSnap) && currentSnap.length > 0) {
                        switch (e.key) {
                            case "ArrowRight":
                            case "ArrowUp": {
                                e.preventDefault();
                                const next = currentSnap.find((v) => v > currentValue + 1e-10);
                                newValue = next ?? currentSnap[currentSnap.length - 1];
                                break;
                            }
                            case "ArrowLeft":
                            case "ArrowDown": {
                                e.preventDefault();
                                let prev: number | undefined;
                                for (let i = currentSnap.length - 1; i >= 0; i--) {
                                    if (currentSnap[i] < currentValue - 1e-10) {
                                        prev = currentSnap[i];
                                        break;
                                    }
                                }
                                newValue = prev ?? currentSnap[0];
                                break;
                            }
                            case "Home":
                                e.preventDefault();
                                newValue = min;
                                break;
                            case "End":
                                e.preventDefault();
                                newValue = max;
                                break;
                            default:
                                return;
                        }
                    } else {
                        // Interval snap: step by the snap interval; otherwise use step or default
                        const stepAmount = typeof currentSnap === "number" ? currentSnap : (step ?? (max - min) / 100);

                        switch (e.key) {
                            case "ArrowRight":
                            case "ArrowUp":
                                e.preventDefault();
                                newValue = currentValue + stepAmount;
                                break;
                            case "ArrowLeft":
                            case "ArrowDown":
                                e.preventDefault();
                                newValue = currentValue - stepAmount;
                                break;
                            case "Home":
                                e.preventDefault();
                                newValue = min;
                                break;
                            case "End":
                                e.preventDefault();
                                newValue = max;
                                break;
                            default:
                                return;
                        }

                        if (newValue !== null) {
                            newValue = cleanFloat(Math.round(newValue / stepAmount) * stepAmount);
                        }
                    }

                    if (newValue !== null) {
                        newValue = Math.max(min, Math.min(max, newValue));

                        const valueStr = String(newValue) as NumericString.Type;
                        const normalized = normalizeRef.current ? normalizeRef.current(valueStr) : valueStr;
                        setCache(normalized);
                        onValueRef.current?.(normalized as NumericString.Type);
                        onCommitRef.current?.(normalized as NumericString.Type);
                    }
                },
                [disabled, min, max, step],
            );

            const isInvalid = useMemo(() => {
                const v = NumericString.Emptyable.asNumber(cache ?? "");
                if (v === null) return false;
                if (snap !== undefined && snapNumber(v, snap) !== v) return true;
                if (v < min || v > max) return true;
                return false;
            }, [snap, cache, min, max]);

            const dataState = useMemo(() => {
                return [disabled && "disabled", isInvalid && "invalid"].filter(Boolean).join(" ") || undefined;
            }, [disabled, isInvalid]);

            const style = useMemo(() => {
                return { left: `${fraction * 100}%` };
            }, [fraction]);

            return (
                <div {...rest} data-flavour={flavour} tabIndex={disabled ? undefined : (tabIndex ?? 0)} ref={makeInnerRef} data-state={dataState} onKeyDown={handleKeyDown} title={tooltip}>
                    <svg data-part="track" ref={trackRef}>
                        <line data-part="capture" x1="0" y1="50%" x2="100%" y2="50%" />
                        <line data-part="border" x1="0" y1="50%" x2="100%" y2="50%" />
                        <line data-part="main" x1="0" y1="50%" x2="100%" y2="50%" />
                    </svg>
                    <div data-part="bounds">
                        <div data-part="handle" data-flavour="inherit" style={style} ref={makeInnerHandleRef} />
                    </div>
                </div>
            );
        },
    )`
        flex: 1 1;
        min-width: 0;
        isolation: isolate;
        display: grid;
        grid-template-columns: 1fr;
        grid-template-rows: 1fr;
        place-items: center;
        padding: 0 calc(max(var(--handleSize), var(--trackSize)) / 2);

        --handleSize: 1lh;
        --trackSize: 1em;

        &[data-state~="invalid"] {
            outline: 1px solid red;
        }

        & > svg[data-part="track"] {
            grid-area: 1 / 1;
            width: 100%;
            height: var(--handleSize);
            overflow: visible;
            pointer-events: none;
            vector-effect: non-scaling-stroke;
            & > line[data-part="capture"] {
                stroke: transparent;
                stroke-width: var(--handleSize);
                pointer-events: stroke;
            }
            & > line[data-part="border"] {
                stroke: var(--flavour);
                stroke-width: calc(var(--trackSize) + 2px);
                stroke-linecap: round;
                pointer-events: none;
            }
            & > line[data-part="main"] {
                stroke: oklch(from var(--flavour) calc(l - 0.2) calc(c * 0.6) h);
                stroke-width: var(--trackSize);
                stroke-linecap: round;
                pointer-events: none;
            }
        }
        & > div[data-part="bounds"] {
            grid-area: 1 / 1;
            width: 100%;
            height: 100%;
            position: relative;
            pointer-events: none;
            & > div[data-part="handle"] {
                pointer-events: auto;
                position: absolute;
                top: 50%;
                transform: translate(-50%, -50%);
                outline: 1px solid transparent;
                transition: outline-offset 0.1s ease;
                outline-offset: 0;
                width: var(--handleSize);
                height: var(--handleSize);
                background: var(--flavour);
                border-radius: 100%;
                cursor: ew-resize;
                border: 1px solid oklch(from var(--flavour) calc(l + 0.1) c h);
            }
        }

        &[data-state~="disabled"] {
            opacity: 0.6;
        }

        &:not([data-state~="disabled"]) {
            & > div[data-part="bounds"] > div[data-part="handle"] {
                &:active,
                &:hover {
                    background: oklch(from var(--flavour) calc(l + 0.1) c h);
                }
            }
            &:focus-visible > div[data-part="bounds"] > div[data-part="handle"] {
                outline-color: #fffa;
                outline-offset: 2px;
            }
        }
    `;

    export namespace Linear {
        export type Props = {
            value: EmptyOr<NumericString.Type>;
            onValue?: (n: NumericString.Type) => void;
            onCommit?: (n: NumericString.Type) => void;
            min?: number | EmptyOr<NumericString.Type>;
            max?: number | EmptyOr<NumericString.Type>;
            step?: number | EmptyOr<NumericString.Type>;
            snap?: number | EmptyOr<NumericString.Type> | (number | EmptyOr<NumericString.Type>)[];
            normalize?: (v: EmptyOr<NumericString.Type>) => EmptyOr<NumericString.Type>;
            disabled?: boolean;
            handleRef?: Ref<HTMLDivElement>;
        } & Omit<DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "title"> & { tooltip?: string; flavour?: Flavour | "inherit" };
    }

    export const Radial = styled(
        ({
            value,
            onValue,
            onCommit,
            onKeyDown,
            wrap: wrapProp,
            min: minProp,
            max: maxProp,
            snap: snapProp,
            trackMin: trackMinProp = "0",
            trackMax: trackMaxProp = "360",
            step: stepProp = Array.isArray(snapProp) ? undefined : snapProp,
            normalize,
            tooltip,
            flavour = "accent",
            icon = ICONS.Blank,
            disabled,
            tabIndex,
            ref,
            handleRef,
            ...rest
        }: Radial.Props) => {
            const snapStable = useStableValue(snapProp);
            const onKeyDownRef = useStable(onKeyDown);

            const [innerRef, makeInnerRef] = useCombinedRef(ref);
            const [innerHandleRef, makeInnerHandleRef] = useCombinedRef(handleRef);

            const [cache, setCache] = useState(value);
            const trackRef = useRef<SVGSVGElement>(null);

            useEffect(() => {
                setCache(value);
            }, [value]);

            const onValueRef = useStable(onValue);
            const onCommitRef = useStable(onCommit);
            const normalizeRef = useStable(normalize);
            const cacheRef = useStable(cache);

            const { min, max, step, wrap, trackMin, trackMax, snap } = useMemo(() => {
                const wrapRaw = typeof wrapProp === "number" ? wrapProp : (NumericString.Emptyable.asNumber(wrapProp ?? "") ?? undefined);
                const minRaw = typeof minProp === "number" ? minProp : (NumericString.Emptyable.asNumber(minProp ?? "") ?? undefined);
                const maxRaw = typeof maxProp === "number" ? maxProp : (NumericString.Emptyable.asNumber(maxProp ?? "") ?? undefined);
                const stepRaw = typeof stepProp === "number" ? stepProp : (NumericString.Emptyable.asNumber(stepProp ?? "") ?? undefined);

                const trackMinRaw = typeof trackMinProp === "number" ? trackMinProp : (NumericString.Emptyable.asNumber(trackMinProp ?? "") ?? 0);
                const trackMaxRaw = typeof trackMaxProp === "number" ? trackMaxProp : (NumericString.Emptyable.asNumber(trackMaxProp ?? "") ?? 360);

                // Parse snap: either a number (interval) or array of numbers (discrete values)
                let snapParsed: number | number[] | undefined;
                if (Array.isArray(snapStable)) {
                    snapParsed = snapStable
                        .map((v) => (typeof v === "number" ? v : NumericString.Emptyable.asNumber(v ?? "")))
                        .filter((v): v is number => v !== null && !Number.isNaN(v))
                        .sort((a, b) => a - b);
                    if (snapParsed.length === 0) snapParsed = undefined;
                } else if (snapStable !== undefined) {
                    snapParsed = typeof snapStable === "number" ? snapStable : (NumericString.Emptyable.asNumber(snapStable ?? "") ?? undefined);
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
                    min: theMin,
                    max: theMax,
                    step: stepRaw,
                    wrap: doesWrap,
                    trackMin: trackMinRaw,
                    trackMax: trackMaxRaw,
                    snap: snapParsed,
                };
            }, [minProp, maxProp, stepProp, wrapProp, trackMinProp, trackMaxProp, snapStable]);

            const snapRef = useStable(snap);

            const rotation = useMemo(() => {
                const v = NumericString.Emptyable.asNumber(cache ?? "") ?? trackMin;
                if (trackMax - trackMin === 0) return { rotate: "0deg" };
                // Map value to visual angle: value within track range maps to 0-360
                const visualAngle = ((v - trackMin) / (trackMax - trackMin)) * 360;
                // Modulo to handle values outside one track cycle
                const normalized = ((visualAngle % 360) + 360) % 360;
                return { rotate: `${normalized}deg` };
            }, [cache, trackMin, trackMax]);

            // Get angle from pointer event relative to component center (0-360, 0 = top, clockwise)
            const getAngleFromEvent = useCallback((e: PointerEvent) => {
                const el = innerRef.current;
                if (!el) return null;

                const rect = el.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                // atan2 with args swapped and Y inverted gives angle from top, clockwise
                const angle = Math.atan2(e.clientX - centerX, centerY - e.clientY);
                // Convert to 0-360
                return ((angle * 180) / Math.PI + 360) % 360;
            }, []);

            // Ref to track drag state across events
            const dragStateRef = useRef<{ lastAngle: number; accumulatedValue: number } | null>(null);
            // Ref for RAF throttling
            const rafRef = useRef<number | null>(null);

            // Pointer drag handling
            useEffect(() => {
                const handle = innerHandleRef.current;
                const bounds = handle?.parentElement;
                const track = trackRef.current;
                if (!handle || !bounds || !track || disabled) return;

                // Handle click: offset grab (maintains current value, tracks delta)
                const handlePointerDown = (e: PointerEvent) => {
                    if (e.button !== 0) return;
                    handle.setPointerCapture(e.pointerId);

                    const angle = getAngleFromEvent(e);
                    if (angle === null) return;

                    // Initialize drag state with current value (read from ref to avoid stale closure)
                    const currentValue = NumericString.Emptyable.asNumber(cacheRef.current ?? "") ?? trackMin;
                    dragStateRef.current = {
                        lastAngle: angle,
                        accumulatedValue: currentValue,
                    };
                };

                // Track click: jump to position, then allow dragging
                const handleTrackPointerDown = (e: PointerEvent) => {
                    if (e.button !== 0) return;
                    // Don't handle if click was on the handle itself
                    if (e.target === handle || handle.contains(e.target as Node)) return;
                    if (e.handled) {
                        return;
                    }
                    e.handled = "implied";

                    handle.setPointerCapture(e.pointerId);

                    const clickedAngle = getAngleFromEvent(e);
                    if (clickedAngle === null) return;

                    // Get current value and its visual angle
                    const currentValue = NumericString.Emptyable.asNumber(cacheRef.current ?? "") ?? trackMin;
                    const currentAngle = angleFromTrack(currentValue, trackMin, trackMax);

                    // Check if we're near the bounds (within half a turn)
                    const nearMin = min !== undefined && currentValue <= min + (trackMax - trackMin) / 2;
                    const nearMax = max !== undefined && currentValue >= max - (trackMax - trackMin) / 2;

                    let newValue: number;

                    if (!wrap && (nearMin || nearMax)) {
                        // When near bounds, use absolute position within current turn
                        // This allows clicking anywhere on the visible track
                        // Use floor for most cases, but when exactly at a turn boundary, stay on the previous turn
                        const rawTurn = (currentValue - trackMin) / (trackMax - trackMin);
                        const currentTurn = Number.isInteger(rawTurn) && rawTurn > 0 ? rawTurn - 1 : Math.floor(rawTurn);
                        const clickedValueInTurn = (clickedAngle / 360) * (trackMax - trackMin) + trackMin;
                        newValue = currentTurn * (trackMax - trackMin) + clickedValueInTurn;

                        // Apply step if defined
                        if (step !== undefined) {
                            newValue = Math.round(newValue / step) * step;
                        }

                        // Clamp to bounds
                        if (min !== undefined && max !== undefined) {
                            newValue = Math.max(min, Math.min(max, newValue));
                        }
                    } else {
                        // Normal shortest-path behavior for middle range or wrap mode
                        let angleDelta = clickedAngle - currentAngle;

                        // Normalize to -180 to +180 range (shortest path)
                        if (angleDelta > 180) {
                            angleDelta -= 360;
                        } else if (angleDelta < -180) {
                            angleDelta += 360;
                        }

                        // Convert angle delta to value delta and apply
                        const valueDelta = (angleDelta / 360) * (trackMax - trackMin);
                        newValue = currentValue + valueDelta;

                        // Apply step if defined
                        if (step !== undefined) {
                            newValue = Math.round(newValue / step) * step;
                        }

                        // Apply bounds if defined
                        if (min !== undefined && max !== undefined) {
                            if (wrap) {
                                newValue = wrapNumber(newValue, min, max);
                            } else {
                                newValue = Math.max(min, Math.min(max, newValue));
                            }
                        }
                    }

                    dragStateRef.current = {
                        lastAngle: clickedAngle,
                        accumulatedValue: cleanFloat(newValue),
                    };

                    // Update DOM directly
                    const visualAngle = angleFromTrack(newValue, trackMin, trackMax);
                    bounds.style.rotate = `${visualAngle}deg`;

                    // Update React state
                    const valueStr = String(cleanFloat(newValue)) as NumericString.Type;
                    setCache(valueStr);
                    onValueRef.current?.(valueStr);
                };

                const handlePointerMove = (e: PointerEvent) => {
                    if (!dragStateRef.current) return;
                    if (e.handled) {
                        return;
                    }
                    e.handled = "implied";

                    const angle = getAngleFromEvent(e);
                    if (angle === null) return;

                    const { lastAngle, accumulatedValue } = dragStateRef.current;

                    // Calculate angle delta, handling the 0/360 boundary
                    let angleDelta = angle - lastAngle;

                    // Detect boundary crossing: if delta is large, we crossed 0/360
                    if (angleDelta > 180) {
                        angleDelta -= 360; // Crossed from low to high (e.g., 350 -> 10)
                    } else if (angleDelta < -180) {
                        angleDelta += 360; // Crossed from high to low (e.g., 10 -> 350)
                    }

                    // Convert angle delta to value delta
                    const valueDelta = (angleDelta / 360) * (trackMax - trackMin);
                    let newValue = accumulatedValue + valueDelta;
                    const unclampedValue = newValue;

                    // Apply bounds (if defined) with wrap or clamp
                    let wasClamped = false;
                    if (min !== undefined && max !== undefined) {
                        if (wrap) {
                            newValue = wrapNumber(newValue, min, max);
                        } else {
                            const clamped = Math.max(min, Math.min(max, newValue));
                            wasClamped = clamped !== newValue;
                            newValue = clamped;
                        }
                    }

                    // Update drag state
                    // If value was clamped, adjust lastAngle so that reversing direction
                    // starts moving the handle immediately (handle stays "in line" with pointer)
                    let newLastAngle = angle;
                    if (wasClamped) {
                        // Calculate where the angle "should be" for the clamped value
                        // This is the difference between unclamped and clamped, converted back to angle
                        const clampedDelta = ((unclampedValue - newValue) / (trackMax - trackMin)) * 360;
                        newLastAngle = (((angle - clampedDelta) % 360) + 360) % 360;
                    }
                    dragStateRef.current = {
                        lastAngle: newLastAngle,
                        accumulatedValue: cleanFloat(newValue),
                    };

                    // Snap for visual display only, then apply wrap
                    let snappedValue = snapNumber(newValue, snapRef.current);
                    if (wrap && min !== undefined && max !== undefined) {
                        snappedValue = wrapNumber(snappedValue, min, max);
                    }

                    // Update DOM directly for smooth visuals
                    const visualAngle = angleFromTrack(snappedValue, trackMin, trackMax);
                    bounds.style.rotate = `${visualAngle}deg`;

                    // Throttle React state updates via RAF
                    // Schedule RAF if not already pending - it will read latest value from dragStateRef
                    if (rafRef.current === null) {
                        rafRef.current = requestAnimationFrame(() => {
                            rafRef.current = null;
                            if (!dragStateRef.current) return;
                            let snapped = snapNumber(dragStateRef.current.accumulatedValue, snapRef.current);
                            // Apply wrap after snap
                            if (wrap && min !== undefined && max !== undefined) {
                                snapped = wrapNumber(snapped, min, max);
                            }
                            const valueStr = String(cleanFloat(snapped)) as NumericString.Type;
                            setCache(valueStr);
                            onValueRef.current?.(valueStr);
                        });
                    }
                };

                const handlePointerUp = (e: PointerEvent) => {
                    if (!dragStateRef.current) return;
                    if (e.handled) {
                        return;
                    }
                    e.handled = "implied";

                    // Apply snap on commit, then wrap if enabled
                    let finalValue = snapNumber(dragStateRef.current.accumulatedValue, snapRef.current);
                    if (wrap && min !== undefined && max !== undefined) {
                        finalValue = wrapNumber(finalValue, min, max);
                    }
                    dragStateRef.current = null;

                    // Cancel any pending RAF
                    if (rafRef.current !== null) {
                        cancelAnimationFrame(rafRef.current);
                        rafRef.current = null;
                    }

                    // Set inline style to final value to prevent flicker
                    // React will overwrite this when it re-renders with the new cache
                    const finalAngle = angleFromTrack(finalValue, trackMin, trackMax);
                    bounds.style.rotate = `${finalAngle}deg`;

                    // Update cache first, then fire callbacks
                    const valueStr = String(cleanFloat(finalValue)) as NumericString.Type;
                    const normalized = normalizeRef.current ? normalizeRef.current(valueStr) : valueStr;
                    setCache(normalized);
                    onValueRef.current?.(normalized as NumericString.Type);
                    onCommitRef.current?.(normalized as NumericString.Type);
                };

                handle.addEventListener("pointerdown", handlePointerDown);
                handle.addEventListener("pointermove", handlePointerMove);
                handle.addEventListener("pointerup", handlePointerUp);
                track.addEventListener("pointerdown", handleTrackPointerDown);

                return () => {
                    handle.removeEventListener("pointerdown", handlePointerDown);
                    handle.removeEventListener("pointermove", handlePointerMove);
                    handle.removeEventListener("pointerup", handlePointerUp);
                    track.removeEventListener("pointerdown", handleTrackPointerDown);
                    // Cleanup RAF on unmount/re-run
                    if (rafRef.current !== null) {
                        cancelAnimationFrame(rafRef.current);
                        rafRef.current = null;
                    }
                };
            }, [disabled, getAngleFromEvent, trackMin, step, min, max, wrap, trackMax]);

            // Keyboard handling
            const handleKeyDown = useCallback(
                (e: React.KeyboardEvent<HTMLDivElement>) => {
                    onKeyDownRef.current?.(e);
                    if (disabled) return;
                    if (e.nativeEvent.handled) {
                        return;
                    }
                    e.nativeEvent.handled = "implied";

                    const currentValue = NumericString.Emptyable.asNumber(cacheRef.current ?? "") ?? trackMin;
                    // Default step: 1/36 of track range (10 degrees worth)
                    const stepAmount = step ?? (trackMax - trackMin) / 36;
                    let newValue: number | null = null;

                    switch (e.key) {
                        case "ArrowUp":
                        case "ArrowRight":
                            e.preventDefault();
                            newValue = currentValue + stepAmount;
                            break;
                        case "ArrowDown":
                        case "ArrowLeft":
                            e.preventDefault();
                            newValue = currentValue - stepAmount;
                            break;
                        case "Home":
                            e.preventDefault();
                            newValue = min ?? trackMin;
                            break;
                        case "End":
                            e.preventDefault();
                            newValue = max ?? trackMax;
                            break;
                        default:
                            return;
                    }

                    if (newValue !== null) {
                        // Snap to step to avoid floating point accumulation errors
                        newValue = cleanFloat(Math.round(newValue / stepAmount) * stepAmount);

                        // Apply snap first
                        newValue = snapNumber(newValue, snapRef.current);

                        // Then apply bounds (if defined) with wrap or clamp
                        if (min !== undefined && max !== undefined) {
                            if (wrap) {
                                newValue = wrapNumber(newValue, min, max);
                            } else {
                                newValue = Math.max(min, Math.min(max, newValue));
                            }
                        }

                        const valueStr = String(newValue) as NumericString.Type;
                        const normalized = normalizeRef.current ? normalizeRef.current(valueStr) : valueStr;
                        setCache(normalized);
                        onValueRef.current?.(normalized as NumericString.Type);
                        onCommitRef.current?.(normalized as NumericString.Type);
                    }
                },
                [disabled, trackMin, step, min, max, trackMax, wrap],
            );

            // Check if cache value is invalid (doesn't adhere to snap, or out of bounds)
            const isInvalid = useMemo(() => {
                const v = NumericString.Emptyable.asNumber(cache ?? "");
                if (v === null) return false;

                // Check snap validity
                if (snap !== undefined && snapNumber(v, snap) !== v) {
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

            const dataState = useMemo(() => {
                return [disabled && "disabled", isInvalid && "invalid"].filter(Boolean).join(" ") || undefined;
            }, [disabled, isInvalid]);

            return (
                <div {...rest} data-flavour={flavour} tabIndex={disabled ? undefined : (tabIndex ?? 0)} ref={makeInnerRef} data-state={dataState} onKeyDown={handleKeyDown}>
                    <svg data-part="track" ref={trackRef}>
                        <circle data-part="capture" cx={"50%"} cy={"50%"} r={"50%"} fill={"none"} />
                        <circle data-part="border" cx={"50%"} cy={"50%"} r={"50%"} fill={"none"} />
                        <circle data-part="main" cx={"50%"} cy={"50%"} r={"50%"} fill={"none"} />
                    </svg>
                    <div data-part={"bounds"} style={rotation}>
                        <div data-part={"handle"} data-flavour={"inherit"} ref={makeInnerHandleRef}>
                            <Icon shape={icon} />
                        </div>
                    </div>
                </div>
            );
        },
    )`
        min-width: 5em;
        aspect-ratio: 1;
        flex: 1 0 auto;
        display: grid;
        isolation: isolate;
        display: grid;
        grid-template-columns: 1fr;
        grid-template-rows: 1fr;
        place-items: center;
        padding: 4px;
        border-radius: 100%;

        --handleSize: 1lh;
        --trackSize: 1em;

        &[data-state~="invalid"] {
            outline: 1px solid red;
        }

        & > svg[data-part="track"] {
            grid-area: 1 / 1;
            width: calc(100% - var(--handleSize));
            height: calc(100% - var(--handleSize));
            aspect-ratio: 1;
            overflow: visible;
            pointer-events: none;
            vector-effect: non-scaling-stroke;
            & > circle[data-part="capture"] {
                stroke: transparent;
                stroke-width: calc(var(--handleSize));
                pointer-events: stroke;
            }
            & > circle[data-part="border"] {
                stroke: var(--flavour);
                stroke-width: calc(var(--trackSize) + 2px);
                pointer-events: none;
            }
            & > circle[data-part="main"] {
                stroke: oklch(from var(--flavour) calc(l - 0.2) calc(c * 0.6) h);
                stroke-width: calc(var(--trackSize));
                pointer-events: none;
            }
        }
        & > div[data-part="bounds"] {
            grid-area: 1 / 1;
            transform-origin: center center;
            align-self: stretch;
            align-items: start;
            justify-items: start;
            pointer-events: none;
            display: flex;
            & > div[data-part="handle"] {
                pointer-events: auto;
                outline: 1px solid transparent;
                transition: outline-offset 0.1s ease;
                outline-offset: 0;
                display: flex;
                place-items: center;
                place-content: center;
                text-align: center;
                width: var(--handleSize);
                height: var(--handleSize);
                background: var(--flavour);
                border-radius: 100%;
                border: 1px solid oklch(from var(--flavour) calc(l + 0.1) c h);
            }
        }

        &[data-state~="disabled"] {
            opacity: 0.6;
        }

        &:not([data-state~="disabled"]) {
            & > div[data-part="bounds"] > div[data-part="handle"] {
                cursor: move;
                &:active,
                &:hover {
                    background: oklch(from var(--flavour) calc(l + 0.1) c h);
                }
            }
            &:focus > div[data-part="bounds"] > div[data-part="handle"] {
                outline-color: #fff;
                outline-offset: 2px;
            }
        }
    `;

    export namespace Radial {
        export type Props = {
            value: EmptyOr<NumericString.Type>;
            onValue?: (n: NumericString.Type) => void;
            onCommit?: (n: NumericString.Type) => void;
            min?: number | EmptyOr<NumericString.Type>;
            max?: number | EmptyOr<NumericString.Type>;
            trackMin?: number | EmptyOr<NumericString.Type>;
            trackMax?: number | EmptyOr<NumericString.Type>;
            step?: number | EmptyOr<NumericString.Type>;
            wrap?: number | EmptyOr<NumericString.Type>;
            normalize?: (v: EmptyOr<NumericString.Type>) => EmptyOr<NumericString.Type>;
            icon?: IconDefinition;
            disabled?: boolean;
            handleRef?: Ref<HTMLDivElement>;
            snap?: number | EmptyOr<NumericString.Type> | (number | EmptyOr<NumericString.Type>)[]; // if array, snap to the inverval, otherwise snap to the closest/next value in the array.
        } & Omit<DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "title"> & { tooltip?: string; flavour?: Flavour | "inherit" };
    }

    export namespace Polar {
        type Payload = { r: EmptyOr<NumericString.Type>; a: EmptyOr<NumericString.Type> };
        export type Props = {
            value: Payload;
            onValue?: (n: Payload) => void;
            onCommit?: (n: Payload) => void;
            minRadius?: number | EmptyOr<NumericString.Type>;
            maxRadius?: number | EmptyOr<NumericString.Type>;
            minAngle?: number | EmptyOr<NumericString.Type>;
            maxAngle?: number | EmptyOr<NumericString.Type>;
            stepRadius?: number | EmptyOr<NumericString.Type>;
            stepAngle?: number | EmptyOr<NumericString.Type>;
            normalize?: (v: Payload) => Payload;
            icon?: IconDefinition;
            disabled?: boolean;
            handleRef?: Ref<HTMLDivElement>;
            snapRadius?: number | EmptyOr<NumericString.Type> | (number | EmptyOr<NumericString.Type>)[]; // if array, snap to the inverval, otherwise snap to the closest/next value in the array.
            snapAngle?: number | EmptyOr<NumericString.Type> | (number | EmptyOr<NumericString.Type>)[]; // if array, snap to the inverval, otherwise snap to the closest/next value in the array.
        } & Omit<DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "title"> & { tooltip?: string; flavour?: Flavour | "inherit" };
    }

    export namespace Cartesian {
        type Payload = { x: EmptyOr<NumericString.Type>; y: EmptyOr<NumericString.Type> };
        export type Props = {
            value: Payload;
            onValue?: (n: Payload) => void;
            onCommit?: (n: Payload) => void;
            min?: number | EmptyOr<NumericString.Type>;
            max?: number | EmptyOr<NumericString.Type>;
            minX?: number | EmptyOr<NumericString.Type>;
            maxX?: number | EmptyOr<NumericString.Type>;
            minY?: number | EmptyOr<NumericString.Type>;
            maxY?: number | EmptyOr<NumericString.Type>;
            step?: number | EmptyOr<NumericString.Type>;
            stepX?: number | EmptyOr<NumericString.Type>;
            stepY?: number | EmptyOr<NumericString.Type>;
            normalize?: (v: Payload) => Payload;
            icon?: IconDefinition;
            disabled?: boolean;
            handleRef?: Ref<HTMLDivElement>;
            snap?: number | EmptyOr<NumericString.Type> | (number | EmptyOr<NumericString.Type>)[]; // if array, snap to the inverval, otherwise snap to the closest/next value in the array.
            snapX?: number | EmptyOr<NumericString.Type> | (number | EmptyOr<NumericString.Type>)[]; // if array, snap to the inverval, otherwise snap to the closest/next value in the array.
            snapY?: number | EmptyOr<NumericString.Type> | (number | EmptyOr<NumericString.Type>)[]; // if array, snap to the inverval, otherwise snap to the closest/next value in the array.
        } & Omit<DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "title"> & { tooltip?: string; flavour?: Flavour | "inherit" };
    }
}

const snapNumber = (value: number, snap: number | number[] | undefined): number => {
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
};

function cleanFloat(num: number): number {
    return Number(num.toFixed(10));
}

// Wrap a value to a range, normalizing boundary values
// Favors: 0, then positive, then closest to 0
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

const angleFromTrack = (v: number, trackMin: number, trackMax: number) => {
    const trackRange = trackMax - trackMin;
    if (trackRange === 0) return 0;
    const visualAngle = ((v - trackMin) / trackRange) * 360;
    return ((visualAngle % 360) + 360) % 360;
};
