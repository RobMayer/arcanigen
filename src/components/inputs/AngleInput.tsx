import styled from "styled-components";
import { AbstractInput } from "../abstract/Inputs";
import { AbstractSlider } from "../abstract/Slider";
import { DetailedHTMLProps, HTMLAttributes, Ref, useCallback, useEffect, useState } from "react";
import { Flavour } from "../types";
import { NumericString } from "../../definitions/datatypes/numericString";
import { EmptyOr } from "../../util/misc";
import { IconDefinition } from "../Icon";
import { useStable } from "../../util/hooks/useStable";
import { COMMON_STYLES } from "../styles";

const BaseInput = styled(AbstractInput.Numeric)`
    ${COMMON_STYLES.INPUT}
`;

const BaseSlider = styled(AbstractSlider.Radial)`
    ${COMMON_STYLES.SLIDER}
`;

const BaseCombined = styled.div`
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

export function AngleInput({ min = 0, max = 360, unbound, flavour, ...props }: AngleInput.Props) {
    return <BaseInput {...props} wrap={unbound ? undefined : 360} min={min} max={max} data-flavour={flavour} />;
}

export namespace AngleInput {
    export type Props = Omit<AbstractInput.Numeric.Props, "wrap"> & { unbound?: boolean; flavour?: Flavour };

    export function Combined({
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
    }: Combined.Props) {
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
                    wrap={unbound ? undefined : 360}
                    min={min}
                    max={max}
                    data-flavour={"inherit"}
                    onValue={handleValue}
                    onCommit={handleCommit}
                    value={cache}
                    icon={icon}
                    normalize={normalize}
                    step={step}
                    disabled={disabled}
                />
                <BaseInput
                    data-part={"input"}
                    ref={inputRef}
                    wrap={unbound ? undefined : 360}
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
                />
            </BaseCombined>
        );
    }

    export namespace Combined {
        export type Props = DivProps & {
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
            flavour?: Flavour;
        };
    }
}

type DivProps = Omit<DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "title"> & { tooltip?: string };
