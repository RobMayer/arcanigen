import { DetailedHTMLProps, HTMLAttributes, useCallback, useMemo, useRef } from "react";
import styled from "styled-components";
import { AbstractPopup, AbstractPopupHandle } from "../abstract/Popup";
import { createController } from "../../util/hooks/useController";
import { useStable } from "../../util/hooks/useStable";
import { Flavour } from "../types";
import { Icon, ICONS } from "../Icon";

export type ModalControls = {
    open: () => void;
    close: () => void;
    value: () => boolean;
};

export type ModalVariants = "typical" | "bare";

const { useController, useControllerInternal: useModalControls, useControllerExternal: useModal, Controller } = createController<boolean, ModalControls>();

export { useModal, useModalControls };

type Alignment = "top" | "center" | "bottom" | "left" | "right";
type CSSUnit = "px" | "em" | "rem" | "vw" | "vh" | "vmin" | "vmax" | "%" | "ch" | "ex" | "cm" | "mm" | "in" | "pt" | "pc" | "dvh" | "dvw" | "lvh" | "lvw" | "svh" | "svw";
type Size = `${number}${CSSUnit}` | "auto" | "fit";

type ModalProps = DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
    controls?: ModalControls;
    force?: boolean; // when true, prevents closing via backdrop click or escape
    onPopupToggle?: (state: boolean) => void;
    onOpen?: () => void;
    onClose?: () => void;
    onCancel?: () => void;
    align?: Alignment | `${Alignment} ${Alignment}`; // e.g., "center", "top left", "center right"
    size?: Size | `${Size} ${Size}`; // e.g., "1024px", "80vw 600px"
    variant?: ModalVariants;
    flavour?: Flavour;
};

const parseAlign = (align?: string): { vertical: string; horizontal: string } => {
    if (!align) return { vertical: "center", horizontal: "center" };

    const parts = align.trim().toLowerCase().split(/\s+/);
    const verticals = ["top", "center", "bottom"];
    const horizontals = ["left", "center", "right"];

    let vertical = "center";
    let horizontal = "center";

    if (parts.length === 1) {
        // Single value - check if it's vertical or horizontal
        if (verticals.includes(parts[0])) {
            vertical = parts[0];
        } else if (horizontals.includes(parts[0])) {
            horizontal = parts[0];
        }
    } else if (parts.length >= 2) {
        // Two values - order doesn't matter
        parts.forEach((part) => {
            if (verticals.includes(part)) vertical = part;
            if (horizontals.includes(part)) horizontal = part;
        });
    }

    return { vertical, horizontal };
};

const parseSize = (size?: string): { width: string; height: string } => {
    if (!size) return { width: "fit-content", height: "fit-content" };

    const parts = size.trim().split(/\s+/);

    if (parts.length === 1) {
        return { width: parts[0] === "fit" ? "fit-content" : parts[0], height: "fit-content" };
    } else {
        return { width: parts[0] === "fit" ? "fit-content" : parts[0], height: parts[1] === "fit" ? "fit-content" : parts[1] };
    }
};

const ModalBase = styled(({ controls, force = false, align, size, variant = "typical", flavour = "base", onCancel, onOpen, onClose, onPopupToggle, style, className, ...props }: ModalProps) => {
    const [, setIsOpen, state] = useController(false);
    const popoverHandle = useRef<AbstractPopupHandle>(null);

    const onCancelRef = useStable(onCancel);
    const onCloseRef = useStable(onClose);
    const onOpenRef = useStable(onOpen);
    const onPopupToggleRef = useStable(onPopupToggle);

    const openModal = useCallback(() => {
        console.log("open Modal fired");
        setIsOpen(true);
        onPopupToggleRef.current?.(true);
        onOpenRef.current?.();
        popoverHandle.current?.open();
    }, []);

    const closeModal = useCallback(() => {
        popoverHandle.current?.close();
        onPopupToggleRef.current?.(false);
        onCloseRef.current?.();
        setIsOpen(false);
    }, []);

    const handleCancel = useCallback(() => {
        onPopupToggleRef.current?.(false);
        onCloseRef.current?.();
        onCancelRef.current?.();
        setIsOpen(false);
    }, []);

    const modalMethods = useMemo<ModalControls>(
        () => ({
            open: openModal,
            close: closeModal,
            value: state.get,
        }),
        [openModal, closeModal],
    );

    const alignment = useMemo(() => parseAlign(align), [align]);
    const dimensions = useMemo(() => parseSize(size), [size]);

    const contentsStyle = useMemo(
        () => ({
            ...(style ?? {}),
            width: dimensions.width,
            height: dimensions.height,
        }),
        [style, dimensions.width, dimensions.height],
    );

    return (
        <Controller state={state} controls={controls} methods={modalMethods}>
            <AbstractPopup
                handle={popoverHandle}
                backdrop={force ? "block" : "click"}
                escape={force ? "none" : "close"}
                trapFocus
                onCancel={handleCancel}
                style={contentsStyle}
                data-align-vertical={alignment.vertical}
                data-align-horizontal={alignment.horizontal}
                data-variant={variant}
                data-flavour={flavour}
                {...props}
                className={`${className ?? ""} meta-component_floater meta-component_floater-modal`}
            />
        </Controller>
    );
})`
    & > [data-part="backdrop"] {
        background: transparent;
    }

    & > [data-part="contents"] {
        position: fixed;
        inset: 0;
        max-width: 90vw;
        max-height: 90vh;
        overflow: clip;
        display: flex;
        flex-direction: column;
    }

    /* Vertical alignment */
    & > [data-part="contents"][data-align-vertical="top"] {
        margin-top: 0;
        margin-bottom: auto;
    }
    & > [data-part="contents"][data-align-vertical="center"] {
        margin-top: auto;
        margin-bottom: auto;
    }
    & > [data-part="contents"][data-align-vertical="bottom"] {
        margin-top: auto;
        margin-bottom: 0;
    }

    /* Horizontal alignment */
    & > [data-part="contents"][data-align-horizontal="left"] {
        margin-left: 0;
        margin-right: auto;
    }
    & > [data-part="contents"][data-align-horizontal="center"] {
        margin-left: auto;
        margin-right: auto;
    }
    & > [data-part="contents"][data-align-horizontal="right"] {
        margin-left: auto;
        margin-right: 0;
    }

    /* Typical variant */
    & > [data-part="contents"][data-variant="typical"] {
        background: var(--flavour-plate-bg);
        border: 1px solid var(--flavour-plate-border);
        border-radius: 8px;
        corner-shape: bevel;
    }

    &:has(> [data-part="contents"][data-variant="typical"]) > [data-part="backdrop"] {
        background: #0004;
        backdrop-filter: blur(4px);
    }
`;

const CloseButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: outline-offset 0.1s ease;
    outline: 1px solid transparent;
    overflow: auto;

    /* Disabled state */
    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    /* Focus visible outline */
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

export const Modal = ModalBase as ToExport;
Modal.Title = ModalTitle;
Modal.Content = ModalContent;
Modal.Footer = ModalFooter;
