import styled from "styled-components";
import { AbstractInput } from "../abstract/Inputs";
import { AbstractSlider } from "../abstract/Slider";
import { DetailedHTMLProps, HTMLAttributes, Ref, useCallback, useEffect, useState } from "react";
import { Flavour } from "../types";
import { NumericString } from "../../definitions/datatypes/numericString";
import { EmptyOr } from "../../util/misc";
import { IconDefinition } from "../Icon";
import { useStable } from "../../util/hooks/useStable";

export const AngleInput = styled(({ min = 0, max = 360, unbound, ...props }: Omit<AbstractInput.Numeric.Props, "wrap"> & { unbound?: boolean }) => {
    return <AbstractInput.Numeric {...props} wrap={unbound ? undefined : 360} min={min} max={max} />;
})``;

const Spinner = styled(({ min = 0, max = 360, unbound, ...props }: Omit<AbstractSlider.Radial.Props, "wrap"> & { unbound?: boolean }) => {
    return <AbstractSlider.Radial {...props} wrap={unbound ? undefined : 360} min={min} max={max} />;
})``;

type DivProps = Omit<DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "title"> & { tooltip?: string; flavour?: Flavour | "inherit" };

type WithDisplayProps = {
    value: EmptyOr<NumericString.Type>;
    onValue?: (n: EmptyOr<NumericString.Type>) => void;
    onCommit?: (n: EmptyOr<NumericString.Type>) => void;
    onConfirm?: (n: EmptyOr<NumericString.Type>) => void;
    min?: number | EmptyOr<NumericString.Type>;
    max?: number | EmptyOr<NumericString.Type>;
    step?: number | EmptyOr<NumericString.Type>;
    normalize?: (v: EmptyOr<NumericString.Type>) => EmptyOr<NumericString.Type>;
    icon?: IconDefinition;
    disabled?: boolean;
    handleRef?: Ref<HTMLDivElement>;
    snap?: number | EmptyOr<NumericString.Type> | (number | EmptyOr<NumericString.Type>)[]; // if array, snap to the inverval, otherwise snap to the closest/next value in the array.
    inputRef?: Ref<HTMLInputElement>;
    sliderRef?: Ref<HTMLDivElement>;

    unbound?: boolean;
    required?: boolean;
};

export const SpinnerWithDisplay = styled(
    ({
        value,
        onValue,
        onCommit,
        onConfirm,
        normalize,
        step,
        sliderRef,
        inputRef,
        flavour = "accent",
        unbound,
        min = 0,
        max = 360,
        snap,
        required,
        ref,
        icon,
        disabled,
        ...props
    }: WithDisplayProps & DivProps) => {
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
            <div ref={ref} data-flavour={flavour} {...props}>
                <AbstractSlider.Radial
                    data-part={"slider"}
                    ref={sliderRef}
                    wrap={unbound ? undefined : 360}
                    min={min}
                    max={max}
                    flavour={"inherit"}
                    onValue={handleValue}
                    onCommit={handleCommit}
                    value={cache}
                    icon={icon}
                    normalize={normalize}
                    step={step}
                    disabled={disabled}
                />
                <AbstractInput.Numeric
                    data-part={"input"}
                    ref={inputRef}
                    wrap={unbound ? undefined : 360}
                    min={min}
                    max={max}
                    flavour={"inherit"}
                    onValue={handleValue}
                    onCommit={handleCommit}
                    onConfirm={handleConfirm}
                    value={cache}
                    required={required}
                    normalize={normalize}
                    step={step}
                    disabled={disabled}
                />
            </div>
        );
    },
)`
    display: flex;
    gap: 4px;
    flex: 1 1 0;
    min-width: 0;
    align-items: center;
    & > [data-part="slider"] {
        flex: 0 0 7em;
    }
    & > [data-part="input"] {
        flex: 1 1 0;
        width: 0;
        min-width: 0;
    }
`;
