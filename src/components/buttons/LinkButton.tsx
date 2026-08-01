import styled from "styled-components";
import { AnchorHTMLAttributes, DetailedHTMLProps } from "react";
import { COMMON_STYLES } from "../styles";
import { Flavour } from "../types";

const Base = styled.a`
    ${COMMON_STYLES.BUTTON}
    text-decoration: none;
`;

export function LinkButton({ flavour = "accent", tooltip, ...props }: LinkButton.Props) {
    return <Base {...props} data-flavour={flavour} title={tooltip} />;
}

export namespace LinkButton {
    export type Props = Omit<DetailedHTMLProps<AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>, "title"> & {
        flavour?: Flavour | "inherit";
        tooltip?: string;
    };
}
