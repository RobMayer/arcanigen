import styled from "styled-components";
import { AbstractPopup } from "../abstract/Popup";
import { Flavour } from "../types";
import { ReactNode } from "react";
import { DivProps } from "../../types";

const Base = styled(AbstractPopup.Modal)`
    & > [data-part="contents"] {
        background: oklch(from var(--flavour) 0.23 calc(c * 0.1) h);
        border: 1px solid oklch(from var(--flavour) calc(l - 0.05) calc(c * 0.9) h);
        border-radius: 4px;
    }
    & > [data-part="backdrop"] {
        background: #0004;
        backdrop-filter: blur(4px);
    }
`;

const BaseTitle = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    grid-auto-column: auto;
    grid-auto-flow: column;
    margin: 1px;
    background: oklch(from var(--flavour) 0.37 calc(c * 0.65) h);
    color: #fffc;
    padding: 4px;
    padding-left: 8px;
    font-variant: small-caps;
    font-size: 125%;
`;

export function Modal({ flavour = "base", ...props }: Modal.Props) {
    return <Base {...props} data-flavour={flavour} />;
}

export namespace Modal {
    export type Props = AbstractPopup.Modal.Props & {
        flavour?: Flavour;
    };

    export const useControls = AbstractPopup.Modal.useControls;
    export const useInternal = AbstractPopup.Modal.useInternal;

    export function Title({ flavour = "inherit", children, options, ...rest }: DivProps & { options?: ReactNode; flavour?: Flavour }) {
        return (
            <BaseTitle {...rest} data-flavour={flavour}>
                <div data-part={"title"}>{children}</div>
                {options ? <div data-part={"options"}>{options}</div> : null}
            </BaseTitle>
        );
    }
}

/*

const CloseButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: outline-offset 0.1s ease;
    outline: 1px solid transparent;
    overflow: auto;

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
    &:focus-visible {
        outline-color: var(--flavour-outline);
        outline-offset: 2px;
    }

    corner-shape: bevel;
    border-radius: 4px;

    color: var(--flavour-icon);
    aspect-ratio: 1;
    &:hover:not(:disabled) {
        color: var(--flavour-icon-hover);
    }
`;

const ModalTitle = styled(({ children, noClose = false, ...props }: HTMLAttributes<HTMLDivElement> & { noClose?: boolean }) => {
    const [, modalControls] = useModalControls();

    return (
        <div {...props}>
            <div>{children}</div>
            {!noClose && (
                <CloseButton onClick={modalControls.close}>
                    <Icon shape={ICONS.Close} />
                </CloseButton>
            )}
        </div>
    );
})`
    display: grid;
    grid-template-columns: 1fr;
    grid-auto-column: auto;
    grid-auto-flow: column;

    [data-part="contents"][data-variant="typical"] > & {
        margin: 1px;
        background: var(--flavour-plate-layer);
        corner-shape: bevel;
        border-radius: 7px 7px 0px 0px;
        color: var(--flavour-plate-title);
        padding: 4px;
        padding-left: 8px;
    }

`;

const ModalContent = styled.div`
    overflow: auto;
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
`;

const ModalFooter = styled.div`
    display: flex;

    [data-part="contents"][data-variant="typical"] > & {
        justify-content: flex-end;
        gap: 8px;
        margin: 1px;
        background: var(--flavour-plate-layer);
        corner-shape: bevel;
        border-radius: 0px 0px 7px 7px;
        padding: 4px 8px;
    }
`;

type ToExport = typeof ModalBase & {
    Title: typeof ModalTitle;
    Content: typeof ModalContent;
    Footer: typeof ModalFooter;
};

*/
