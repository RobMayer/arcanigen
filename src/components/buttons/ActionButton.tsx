import styled from "styled-components";
import { AbstractButton } from "../abstract/Button";
import { COMMON_STYLES } from "../styles";
import { Flavour } from "../types";

const Base = styled(AbstractButton)`
    ${COMMON_STYLES.BUTTON}
`;
const BaseLite = styled(AbstractButton)`
    ${COMMON_STYLES.LITEBUTTON}
`;
const BaseOption = styled(AbstractButton)`
    ${COMMON_STYLES.OPTIONBUTTON}
`;

export function ActionButton({ flavour = "accent", ...props }: ActionButton.Props) {
    return <Base {...props} data-flavour={flavour} />;
}

export namespace ActionButton {
    export type Props = AbstractButton.Props & {
        flavour?: Flavour | "inherit";
    };
    export function Lite({ flavour, ...props }: Props) {
        return <BaseLite {...props} data-flavour={flavour} />;
    }

    export function Option({ flavour, ...props }: Props) {
        return <BaseOption {...props} data-flavour={flavour} />;
    }
}
