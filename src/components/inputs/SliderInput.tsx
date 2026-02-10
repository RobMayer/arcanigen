import { DetailedHTMLProps, HTMLAttributes, Ref } from "react";
import { EmptyOr } from "../../util/misc";
import styled from "styled-components";
import { NumericString } from "../../definitions/datatypes/numericString";
import { useCombinedRef } from "../../util/hooks/useCombinedRef";
import { Flavour } from "../types";
import { AbstractSlider } from "../abstract/Slider";

export const SliderInput = (props: AbstractSlider.Linear.Props) => {
    return <AbstractSlider.Linear {...props} />;
};

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
