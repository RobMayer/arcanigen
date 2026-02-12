import { AbstractInput } from "../abstract/Inputs";
import { Length } from "../../definitions/datatypes/length";
import styled from "styled-components";
import { COMMON_STYLES } from "../styles";
import { Flavour } from "../types";

const Base = styled(AbstractInput.Measurement<Length.Unit>)`
    ${COMMON_STYLES.INPUT}
`;

export function LengthInput({ flavour, ...props }: LengthInput.Props) {
    return <Base {...props} data-flavour={flavour} units={Length.UNITS} defaultUnit="px" converter={LengthInput.CONVERTER} />;
}

export namespace LengthInput {
    export type Props = Omit<AbstractInput.Measurement.Props<Length.Unit>, "units" | "defaultUnit" | "converter"> & {
        flavour?: Flavour;
    };
    export const CONVERTER: AbstractInput.Measurement.Converter<Length.Unit> = {
        px: {
            from: (value) => Length.asNumber(value),
            to: (px) => `${px}px`,
        },
        pt: {
            from: (value) => Length.asNumber(value),
            to: (px) => `${(px * 72) / 96}pt`,
        },
        in: {
            from: (value) => Length.asNumber(value),
            to: (px) => `${px / 96}in`,
        },
        mm: {
            from: (value) => Length.asNumber(value),
            to: (px) => `${(px * 25.4) / 96}mm`,
        },
        cm: {
            from: (value) => Length.asNumber(value),
            to: (px) => `${(px * 2.54) / 96}cm`,
        },
    };
}
