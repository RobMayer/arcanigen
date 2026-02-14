import { Ref } from "react";
import { EmptyOr } from "../../util/misc";
import styled from "styled-components";
import { NumericString } from "../../definitions/datatypes/numericString";
import { useCombinedRef } from "../../util/hooks/useCombinedRef";
import { AbstractSlider } from "../abstract/Slider";
import { DivProps } from "../../types";
import { COMMON_STYLES } from "../styles";
import { Flavour } from "../types";

const BaseSlider = styled(AbstractSlider.Linear)`
    ${COMMON_STYLES.SLIDER}
`;

export function SliderInput(props: AbstractSlider.Linear.Props) {
    return <BaseSlider {...props} />;
}

export namespace SliderInput {
    export type Props = AbstractSlider.Linear.Props & { flavour?: Flavour };
}

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
    flavour?: Flavour;
};

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
