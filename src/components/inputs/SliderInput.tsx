import { ChangeEvent, DetailedHTMLProps, HTMLAttributes, Ref, useCallback, useEffect, useState } from "react";
import { useStable } from "../../util/hooks/useStable";
import { EmptyOr } from "../../util/misc";
import styled from "styled-components";
import { AbstractInputProps, AbstractSliderInput } from "../abstract/Inputs";
import { NumericString } from "../../definitions/datatypes/numericString";
import { useCombinedRef } from "../../util/hooks/useCombinedRef";
import { Flavour } from "../types";

type SliderInputProps = {
    value: EmptyOr<NumericString.Type>;
    onValue?: (n: NumericString.Type) => void;
    onCommit?: (n: NumericString.Type) => void;
    min?: number | EmptyOr<NumericString.Type>;
    max?: number | EmptyOr<NumericString.Type>;
    step?: number | EmptyOr<NumericString.Type>;
};

const SliderInput = styled(
    ({
        value,
        onValue,
        onCommit,
        min: minProp = "0.0",
        max: maxProp = "1.0",
        step: stepProp = "0.01",
        onChange,
        ref,
        ...rest
    }: Omit<AbstractInputProps, "value" | "min" | "max" | "step" | "pattern"> & SliderInputProps) => {
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

        return <AbstractSliderInput ref={makeRef} {...rest} min={min} max={max} step={step} value={cache} onChange={handleChange} />;
    },
)``;

type WithDisplayProps = {
    value: EmptyOr<NumericString.Type>;
    onValue?: (n: NumericString.Type) => void;
    onCommit?: (n: NumericString.Type) => void;
    min?: number | EmptyOr<NumericString.Type>;
    max?: number | EmptyOr<NumericString.Type>;
    step?: number | EmptyOr<NumericString.Type>;
    sliderRef?: Ref<HTMLInputElement>;
    displayRef?: Ref<HTMLInputElement>;
    ref?: Ref<HTMLDivElement>;
};

type DivProps = Omit<DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "title"> & { tooltip?: string; flavour?: Flavour | "inherit" };

const WithDisplay = styled(
    ({
        value,
        onValue,
        onCommit,
        min: minProp = "0.0",
        max: maxProp = "1.0",
        step: stepProp = "0.01",
        sliderRef,
        displayRef,
        ref,
        className,
        id,
        flavour,
        ...rest
    }: Omit<DivProps, "ref"> & WithDisplayProps) => {
        const [innerRef, makeRef] = useCombinedRef(ref);
        const [innerSliderRef, makeSliderRef] = useCombinedRef(sliderRef);
        const [innerDisplayRef, makeDisplayRef] = useCombinedRef(displayRef);

        return (
            <div className={className} id={id} ref={makeRef} data-flavour={flavour} {...rest}>
                <input type={"range"} data-part="slider" ref={makeSliderRef} />
                <input type={"text"} data-part="display" ref={makeDisplayRef} />
            </div>
        );
    },
)`
    display: inline-grid;
    grid-template-columns: 3fr 1fr;
    flex: 1 1 auto;
    align-items: center;
`;

export default SliderInput;
