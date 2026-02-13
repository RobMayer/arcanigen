import styled from "styled-components";
import { AbstractPopup } from "../abstract/Popup";
import { Flavour } from "../types";

const Base = styled(AbstractPopup.Context)`
    & > [data-part="content"] {
        display: flex;
        flex-direction: column;
        background: var(--flavour-plate-bg);
        border: 1px solid var(--flavour-plate-border);
        padding: 0.25em;
        border-radius: 6px;
        corner-shape: bevel;
        box-shadow: 0px 4px 8px #0004;
    }
`;

export function ContextPopup({ flavour, ...props }: ContextPopup.Props) {
    return <Base {...props} data-flavour={flavour} />;
}

export namespace ContextPopup {
    export type Props = AbstractPopup.Context.Props & {
        flavour?: Flavour;
    };

    export const useControls = AbstractPopup.Context.useControls;
    export const useInternal = AbstractPopup.Context.useInternal;
}
