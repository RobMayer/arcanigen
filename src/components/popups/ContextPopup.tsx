import styled from "styled-components";
import { AbstractPopup } from "../abstract/Popup";
import { Flavour } from "../types";

const Base = styled(AbstractPopup.Context)`
    & > [data-part="contents"] {
        display: flex;
        flex-direction: column;
        background: oklch(from var(--flavour) 0.23 calc(c * 0.1) h);
        border: 1px solid oklch(from var(--flavour) calc(l - 0.05) calc(c * 0.9) h);
        padding: 0.25em;
        border-radius: 6px;
        corner-shape: bevel;
        box-shadow: 0px 4px 8px #0004;
        min-width: 192px;
    }
`;

export function ContextPopup({ flavour = "base", ...props }: ContextPopup.Props) {
    return <Base {...props} data-flavour={flavour} />;
}

export namespace ContextPopup {
    export type Props = AbstractPopup.Context.Props & {
        flavour?: Flavour;
    };

    export const useControls = AbstractPopup.Context.useControls;
    export const useInternal = AbstractPopup.Context.useInternal;
}
