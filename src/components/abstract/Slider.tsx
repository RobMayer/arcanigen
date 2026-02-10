import { ChangeEvent, DetailedHTMLProps, InputHTMLAttributes, useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { Flavour } from "../types";
import { NumericString } from "../../definitions/datatypes/numericString";
import { EmptyOr } from "../../util/misc";
import { useCombinedRef } from "../../util/hooks/useCombinedRef";
import { useStable } from "../../util/hooks/useStable";

export namespace AbstractSlider {
    export const Linear = styled(
        ({ value, onValue, onCommit, min: minProp = "0.0", max: maxProp = "1.0", step: stepProp = "0.01", onChange, ref, tooltip, flavour = "accent", ...rest }: Linear.Props) => {
            const [inputRef, makeRef] = useCombinedRef(ref);
            const min = typeof minProp === "string" ? (NumericString.Emptyable.asNumber(minProp) ?? 0.0) : minProp;
            const max = typeof maxProp === "string" ? (NumericString.Emptyable.asNumber(maxProp) ?? 1.0) : maxProp;
            const step = typeof stepProp === "string" ? (NumericString.Emptyable.asNumber(stepProp) ?? 0.01) : stepProp;

            const [cache, setCache] = useState(value);

            // Sync cache when prop changes
            useEffect(() => {
                setCache(value);
            }, [value]);

            const onChangeRef = useStable(onChange);
            const onValueRef = useStable(onValue);
            const onCommitRef = useStable(onCommit);

            // Native 'change' event fires on release - use for onCommit
            useEffect(() => {
                const input = inputRef.current;
                if (!input) return;

                const handleNativeChange = (evt: Event) => {
                    evt.handled = "implied";
                    const v = (evt.target as HTMLInputElement).value;
                    onCommitRef.current?.(v as NumericString.Type);
                };

                input.addEventListener("change", handleNativeChange);
                return () => input.removeEventListener("change", handleNativeChange);
            }, []);

            // React onChange (native 'input' event) fires continuously during drag - use for onValue
            const handleChange = useCallback((evt: ChangeEvent<HTMLInputElement>) => {
                onChangeRef.current?.(evt);
                if (evt.nativeEvent.handled) {
                    return;
                }
                evt.nativeEvent.handled = "implied";
                const v = evt.target.value as NumericString.Type;
                setCache(v);
                onValueRef.current?.(v);
            }, []);
            return <input {...rest} ref={makeRef} {...rest} min={min} max={max} step={step} value={cache} onChange={handleChange} type={"range"} title={tooltip} data-flavour={flavour} />;
        },
    )`
        flex: 1 1;
        outline: none;
        padding: 2px;
        isolation: isolate;
        &:disabled {
            opacity: 0.6;
        }
        min-width: 0;
        background: oklch(from var(--flavour) calc(l - 0.2) calc(c * 0.6) h);
        border: 1px solid var(--flavour);
        border-radius: 100vw;
        -webkit-appearance: none; /* Hides the slider so that custom slider can be made */
        &::-webkit-slider-thumb {
            -webkit-appearance: none;
            height: calc(1em + (1lh - 1em) / 2);
            width: calc(1em + (1lh - 1em) / 2);
            background: var(--flavour);
            cursor: ew-resize;
            border-radius: 100%;
            z-index: 1;
            outline: 1px solid transparent;
            outline-offset: 0px;
            transition: outline-offset 0.1s ease;
        }
        &:focus-visible {
            &::-webkit-slider-thumb {
                outline-color: #fffa;
                outline-offset: 2px;
            }
        }
        &:not(:disabled) {
            &::-webkit-slider-thumb:hover,
            &::-webkit-slider-thumb:active {
                background: oklch(from var(--flavour) calc(l + 0.1) c h);
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
        } & Omit<DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>, "title"> & { tooltip?: string; flavour?: Flavour | "inherit" };
    }

    export namespace Radial {}

    export namespace Polar {}

    export namespace Cartesian {}
}
