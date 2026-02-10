import { AbstractInput } from "../abstract/Inputs";
import { Length } from "../../definitions/datatypes/length";

export const LengthInput = (props: Omit<AbstractInput.Measurement.Props<Length.Unit>, "units" | "defaultUnit" | "converter">) => {
    return <AbstractInput.Measurement {...props} units={Length.UNITS} defaultUnit="px" converter={CONVERTER} />;
};

// Canonical unit is px (96 dpi)
const CONVERTER: AbstractInput.Measurement.Converter<Length.Unit> = {
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
