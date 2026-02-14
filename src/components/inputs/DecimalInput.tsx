import styled from "styled-components";
import { AbstractInput } from "../abstract/Inputs";
import { Flavour } from "../types";
import { COMMON_STYLES } from "../styles";
import { AbstractSlider } from "../abstract/Slider";
import { Ref, useCallback, useEffect, useState } from "react";
import { NumericString } from "../../definitions/datatypes/numericString";
import { DivProps } from "../../types";
import { EmptyOr } from "../../util/misc";
import { useStable } from "../../util/hooks/useStable";
import { IconDefinition } from "../Icon";

const BaseInput = styled(AbstractInput.Numeric)`
    ${COMMON_STYLES.INPUT}
`;
const BaseSlider = styled(AbstractSlider.Linear)`
    ${COMMON_STYLES.SLIDER}
`;

const BaseCombined = styled.div`
    display: flex;
    gap: 4px;
    flex: 1 1 0;
    min-width: 0;
    align-items: center;
    & > [data-part="slider"] {
        flex: 1 1 auto;
    }
    & > [data-part="input"] {
        flex: 0 0 5em;
        width: 0;
        min-width: 0;
    }
`;

export function DecimalInput({ flavour, ...props }: DecimalInput.Props) {
    return <BaseInput {...props} data-flavour={flavour} />;
}
export namespace DecimalInput {
    export type Props = AbstractInput.Numeric.Props & { flavour?: Flavour };

    export function Slider({ flavour, ...props }: Slider.Props) {
        return <BaseSlider {...props} data-flavour={flavour} />;
    }
    export namespace Slider {
        export type Props = AbstractSlider.Linear.Props & { flavour?: Flavour };
    }

    export function SliderInput({
        value,
        onValue,
        onCommit,
        onConfirm,
        normalize,
        step,
        sliderRef,
        inputRef,
        flavour = "accent",
        min,
        icon,
        max,
        snap,
        required,
        ref,
        disabled,
        ...props
    }: SliderInput.Props) {
        const onValueRef = useStable(onValue);
        const onCommitRef = useStable(onCommit);
        const onConfirmRef = useStable(onConfirm);

        const [cache, setCache] = useState(value);
        useEffect(() => {
            setCache(value);
        }, [value]);

        const handleValue = useCallback((v: EmptyOr<NumericString.Type>) => {
            onValueRef.current?.(v);
            setCache(v);
        }, []);

        const handleCommit = useCallback((v: EmptyOr<NumericString.Type>) => {
            onCommitRef.current?.(v);
            setCache(v);
        }, []);

        const handleConfirm = useCallback((v: EmptyOr<NumericString.Type>) => {
            onConfirmRef.current?.(v);
            setCache(v);
        }, []);

        return (
            <BaseCombined ref={ref} data-flavour={flavour} {...props}>
                <BaseSlider
                    data-part={"slider"}
                    ref={sliderRef}
                    min={min}
                    max={max}
                    data-flavour={"inherit"}
                    onValue={handleValue}
                    onCommit={handleCommit}
                    value={cache}
                    normalize={normalize}
                    step={step}
                    disabled={disabled}
                    snap={snap}
                    icon={icon}
                />
                <BaseInput
                    data-part={"input"}
                    ref={inputRef}
                    min={min}
                    max={max}
                    data-flavour={"inherit"}
                    onValue={handleValue}
                    onCommit={handleCommit}
                    onConfirm={handleConfirm}
                    value={cache}
                    required={required}
                    normalize={normalize}
                    step={step}
                    disabled={disabled}
                    snap={snap}
                />
            </BaseCombined>
        );
    }

    export namespace SliderInput {
        export type Props = DivProps & {
            value: EmptyOr<NumericString.Type>;
            onValue?: (n: EmptyOr<NumericString.Type>) => void;
            onCommit?: (n: EmptyOr<NumericString.Type>) => void;
            onConfirm?: (n: EmptyOr<NumericString.Type>) => void;
            min?: number | EmptyOr<NumericString.Type>;
            max?: number | EmptyOr<NumericString.Type>;
            step?: number | EmptyOr<NumericString.Type>;
            normalize?: (v: EmptyOr<NumericString.Type>) => EmptyOr<NumericString.Type>;
            disabled?: boolean;
            handleRef?: Ref<HTMLDivElement>;
            icon?: IconDefinition;
            snap?: number | EmptyOr<NumericString.Type> | (number | EmptyOr<NumericString.Type>)[]; // if array, snap to the inverval, otherwise snap to the closest/next value in the array.
            inputRef?: Ref<HTMLInputElement>;
            sliderRef?: Ref<HTMLDivElement>;
            required?: boolean;
            flavour?: Flavour;
        };
    }
}
