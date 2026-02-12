import styled from "styled-components";
import { AbstractInput } from "../abstract/Inputs";
import { NumericString } from "../../definitions/datatypes/numericString";
import { COMMON_STYLES } from "../styles";
import { Flavour } from "../types";

const Base = styled(AbstractInput.Numeric)`
    ${COMMON_STYLES.INPUT}
`;

export function IntegerInput({ min: minProp, max: maxProp, step: stepProp, precision: precisionProp, ...props }: IntegerInput.Props) {
    const min = minProp === undefined ? undefined : typeof minProp === "number" ? Math.round(minProp) : (NumericString.Emptyable.round(minProp) ?? undefined);
    const max = maxProp === undefined ? undefined : typeof maxProp === "number" ? Math.round(maxProp) : (NumericString.Emptyable.round(maxProp) ?? undefined);
    const step = stepProp === undefined ? undefined : typeof stepProp === "number" ? Math.round(stepProp) : (NumericString.Emptyable.round(stepProp) ?? undefined);
    const precision = precisionProp === undefined ? 0 : typeof precisionProp === "number" ? Math.max(precisionProp, 0) : (NumericString.Emptyable.max(precisionProp, "0") ?? 0);

    return <Base {...props} min={min} max={max} step={step} precision={precision} />;
}

export namespace IntegerInput {
    export type Props = AbstractInput.Numeric.Props & {
        flavour?: Flavour;
    };
}
