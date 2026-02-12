import { DetailedHTMLProps, HTMLAttributes, useRef, useId, useCallback, useMemo, MouseEvent } from "react";
import styled, { CSSProperties } from "styled-components";
import { AbstractPopup, AbstractPopupHandle } from "../abstract/Popup";
import { createController } from "../../util/hooks/useController";
import { useStable } from "../../util/hooks/useStable";
import { PopoverPosition, Flavour } from "../types";

export type FlyoutPopupControls = {
    openFor: (e: HTMLElement) => void;
    openOn: (e: MouseEvent<HTMLElement>) => void;
    close: () => void;
};

export type FlyoutPopupVariants = "typical" | "bare";

const { useController, useControllerInternal: useFlyoutPopupControls, useControllerExternal: useFlyoutPopup, Controller } = createController<HTMLElement | null, FlyoutPopupControls>();

export { useFlyoutPopup, useFlyoutPopupControls };

type FlyoutPopupProps = DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
    controls?: FlyoutPopupControls;
    position?: PopoverPosition;
    onPopupToggle?: (state: boolean) => void;
    onOpen?: () => void;
    onClose?: () => void;
    variant?: FlyoutPopupVariants;
    flavour?: Flavour;
    trapFocus?: boolean;
};

const BaseComponent = styled(
    ({ controls, position = "bottom right", onOpen, onClose, onPopupToggle, style, className, variant = "typical", flavour = "base", trapFocus, ...props }: FlyoutPopupProps) => {
        const [, setAnchorElement, state] = useController(null);
        const popoverHandle = useRef<AbstractPopupHandle>(null);
        const anchorElementRef = useRef<HTMLElement>(null);

        const onPopupToggleRef = useStable(onPopupToggle);
        const onCloseRef = useStable(onClose);
        const onOpenRef = useStable(onOpen);

        const anchorId = useId();

        const openFlyout = useCallback(
            (element: HTMLElement) => {
                anchorElementRef.current = element;
                (element.style as CSSProperties).anchorName = `--trh-anchor_flyout-${anchorId}`;
                setAnchorElement(element);
                onPopupToggleRef.current?.(true);
                onOpenRef.current?.();
                popoverHandle.current?.open();
            },
            [anchorId],
        );

        const closeFlyout = useCallback(() => {
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

        const flyoutMethods = useMemo<FlyoutPopupControls>(
            () => ({
                openFor: (element: HTMLElement) => openFlyout(element),
                openOn: (event: MouseEvent<HTMLElement>) => openFlyout(event.currentTarget),
                close: closeFlyout,
            }),
            [openFlyout, closeFlyout],
        );

        const contentsStyle = useMemo(() => {
            return {
                ...(style ?? {}),
                positionAnchor: `--trh-anchor_flyout-${anchorId}`,
                positionArea: position,
            };
        }, [anchorId, position, style]);

        return (
            <Controller state={state} controls={controls} methods={flyoutMethods}>
                <AbstractPopup
                    handle={popoverHandle}
                    backdrop="hover"
                    escape="close"
                    safeZone={anchorElementRef}
                    onCancel={handleCancel}
                    style={contentsStyle}
                    data-variant={variant}
                    data-flavour={flavour}
                    trapFocus={trapFocus}
                    {...props}
                    className={`${className ?? ""} meta-component_floater meta-component_floater-flyout`}
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

export const FlyoutPopup = BaseComponent;
