import styled from "styled-components";
import { AbstractInput } from "../abstract/Inputs";
import { COMMON_STYLES } from "../styles";
import { Flavour } from "../types";

const Base = styled(AbstractInput.Text)`
    ${COMMON_STYLES.INPUT}
`;

export function TextInput({ flavour, ...props }: TextInput.Props) {
    return <Base {...props} data-flavour={flavour} />;
}

export namespace TextInput {
    export type Props = AbstractInput.Text.Props & {
        flavour?: Flavour;
    };
}
