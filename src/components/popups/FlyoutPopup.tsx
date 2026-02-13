import styled from "styled-components";
import { AbstractPopup } from "../abstract/Popup";
import { Flavour } from "../types";

const Base = styled(AbstractPopup.Anchored)`
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

export function FlyoutPopup({ flavour, backdrop = "hover", ...props }: FlyoutPopup.Props) {
    return <Base {...props} data-flavour={flavour} backdrop={backdrop} />;
}

export namespace FlyoutPopup {
    export type Props = AbstractPopup.Anchored.Props & {
        flavour?: Flavour;
    };

    export const useControls = AbstractPopup.Anchored.useControls;
    export const useInternal = AbstractPopup.Anchored.useInternal;
}
