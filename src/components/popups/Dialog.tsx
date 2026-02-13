import styled from "styled-components";
import { AbstractPopup } from "../abstract/Popup";
import { Flavour } from "../types";

const Base = styled(AbstractPopup.Dialog)`
    & > [data-part="content"] {
        display: flex;
        flex-direction: column;
        background: var(--flavour-plate-bg);
        border: 1px solid var(--flavour-plate-border);
        border-radius: 8px;
        corner-shape: bevel;
        box-shadow: 0px 4px 12px #0004;
    }
`;

export function Dialog({ flavour, ...props }: Dialog.Props) {
    return <Base {...props} data-flavour={flavour} />;
}

export namespace Dialog {
    export type Props = AbstractPopup.Dialog.Props & {
        flavour?: Flavour;
    };

    export const useControls = AbstractPopup.Dialog.useControls;
    export const useInternal = AbstractPopup.Dialog.useInternal;
    export const useMoveHandle = AbstractPopup.Dialog.useMoveHandle;
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
    background: transparent;
    border: none;
    padding: 0;

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

// Title bar component with optional drag handle
const DialogTitle = styled(({ children, noClose = false, moveable = false, ...props }: HTMLAttributes<HTMLDivElement> & { noClose?: boolean; moveable?: boolean }) => {
    const { handleRef } = useDialogHandle();
    const [, dialogControls] = useDialogControls();

    return (
        <div {...props}>
            <div ref={moveable ? (handleRef as RefObject<HTMLDivElement>) : undefined} data-moveable={moveable ? true : undefined}>
                {children}
            </div>
            {!noClose && (
                <CloseButton onClick={dialogControls.close}>
                    <Icon shape={ICONS.Close} />
                </CloseButton>
            )}
        </div>
    );
})`
    display: grid;
    grid-template-columns: 1fr;
    grid-auto-columns: auto;
    grid-auto-flow: column;
    user-select: none;

    & > div[data-moveable] {
        cursor: grab;
    }
    [data-dragging] & > div[data-moveable] {
        cursor: grabbing;
    }

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

const DialogContent = styled.div`
    overflow: auto;
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;

    [data-part="contents"][data-variant="typical"] > & {
        padding: 12px;
    }
`;

const DialogFooter = styled.div`
    display: flex;

    [data-part="contents"][data-variant="typical"] > & {
        justify-content: flex-end;
        gap: 8px;
        margin: 1px;
        background: var(--flavour-plate-layer);
        corner-shape: bevel;
        border-radius: 0px 0px 7px 7px;
        padding: 8px 12px;
    }
`;

type ToExport = typeof DialogBase & {
    Title: typeof DialogTitle;
    Content: typeof DialogContent;
    Footer: typeof DialogFooter;
};


*/
