import styled from "styled-components";
import { AbstractInput } from "../abstract/Inputs";
import { Flavour } from "../types";
import { COMMON_STYLES } from "../styles";

const Base = styled(AbstractInput.Numeric)`
    ${COMMON_STYLES.INPUT}
`;
export function DecimalInput({ flavour, ...props }: DecimalInput.Props) {
    return <Base {...props} data-flavour={flavour} />;
}
export namespace DecimalInput {
    export type Props = AbstractInput.Numeric.Props & { flavour?: Flavour };
}
