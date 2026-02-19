import styled from "styled-components";
import { AbstractInput } from "../abstract/Inputs";
import { COMMON_STYLES } from "../styles";
import { Flavour } from "../types";

const Base = styled(AbstractInput.Block)`
    ${COMMON_STYLES.BLOCK}
`;

export function BlockInput({ flavour, ...props }: BlockInput.Props) {
    return <Base {...props} data-flavour={flavour} />;
}

export namespace BlockInput {
    export type Props = AbstractInput.Block.Props & {
        flavour?: Flavour;
    };
}
