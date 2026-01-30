import { DetailedHTMLProps, HTMLAttributes, MouseEvent, useCallback, useId, useMemo, useRef } from "react";
import styled, { CSSProperties } from "styled-components";
import { AbstractPopup, AbstractPopupHandle } from "../abstract/Popup";
import { createController } from "../../util/hooks/useController";
import { useStable } from "../../util/hooks/useStable";
import { PopoverPosition, Flavour } from "../types";

export type AnchoredPopupControls = {
    openFor: (e: HTMLElement) => void;
    openOn: (e: MouseEvent<HTMLElement>) => void;
    close: () => void;
};

type AnchoredPopupVariants = "typical" | "bare";

const { useController, useControllerInternal: useAnchoredPopoupControls, useControllerExternal: useAnchoredPopup, Controller } = createController<HTMLElement | null, AnchoredPopupControls>();

export { useAnchoredPopup, useAnchoredPopoupControls };

type AnchoredPopupProps = DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
    controls?: AnchoredPopupControls;
    position?: PopoverPosition;
    force?: boolean; // when true, prevents closing via backdrop click or escape
    onPopupToggle?: (state: boolean) => void;
    onOpen?: () => void;
    onClose?: () => void;
    variant?: AnchoredPopupVariants;
    flavour?: Flavour;
};

const BaseComponent = styled(
    ({ controls, position = "bottom right", force = false, onOpen, onClose, onPopupToggle, style, className, flavour = "default", variant = "typical", ...props }: AnchoredPopupProps) => {
        const [, setAnchorElement, state] = useController(null);
        const popoverHandle = useRef<AbstractPopupHandle>(null);
        const anchorElementRef = useRef<HTMLElement>(null);
        const anchorId = useId();
        const onPopupToggleRef = useStable(onPopupToggle);
        const onCloseRef = useStable(onClose);
        const onOpenRef = useStable(onOpen);

        const openPopover = useCallback(
            (element: HTMLElement) => {
                anchorElementRef.current = element;
                (element.style as CSSProperties).anchorName = `--trh-anchor_popover-${anchorId}`;
                setAnchorElement(element);
                onPopupToggleRef.current?.(true);
                onOpenRef.current?.();
                popoverHandle.current?.open();
            },
            [anchorId],
        );

        const closePopover = useCallback(() => {
            popoverHandle.current?.close();
            onPopupToggleRef.current?.(false);
            onCloseRef.current?.();
            if (anchorElementRef.current) {
                (anchorElementRef.current.style as CSSProperties).anchorName = "";
                anchorElementRef.current = null;
                setAnchorElement(null);
            }
        }, []);

        const handleCancel = useCallback(() => {
            onPopupToggleRef.current?.(false);
            onCloseRef.current?.();
            if (anchorElementRef.current) {
                (anchorElementRef.current.style as CSSProperties).anchorName = "";
                anchorElementRef.current = null;
                setAnchorElement(null);
            }
        }, []);

        const popoverMethods = useMemo<AnchoredPopupControls>(
            () => ({
                openFor: (element: HTMLElement) => openPopover(element),
                openOn: (event: MouseEvent<HTMLElement>) => openPopover(event.currentTarget),
                close: closePopover,
            }),
            [openPopover, closePopover],
        );

        const contentsStyle = useMemo(() => {
            return {
                ...(style ?? {}),
                positionAnchor: `--trh-anchor_popover-${anchorId}`,
                positionArea: position,
            };
        }, [anchorId, position, style]);

        return (
            <Controller state={state} controls={controls} methods={popoverMethods}>
                <AbstractPopup
                    handle={popoverHandle}
                    backdrop={force ? "block" : "click"}
                    escape={force ? "none" : "close"}
                    onCancel={handleCancel}
                    style={contentsStyle}
                    data-flavour={flavour}
                    data-variant={variant}
                    {...props}
                    className={`${className ?? ""} meta-component_floater meta-component_floater-popover`}
                />
            </Controller>
        );
    },
)`
    & > [data-part="contents"] {
        position-try-fallbacks:
            flip-block,
            flip-inline,
            flip-block flip-inline;
    }
    & > [data-part="contents"][data-variant="typical"] {
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

type ToExport = typeof BaseComponent;

export const AnchoredPopup = BaseComponent as ToExport;
