import { DetailedHTMLProps, HTMLAttributes, useRef, useId, useCallback, useMemo, MouseEvent } from "react";
import styled from "styled-components";
import { AbstractPopup, AbstractPopupHandle } from "../abstract/Popup";
import { createController } from "../../util/hooks/useController";
import { useStable } from "../../util/hooks/useStable";
import { Flavour, PopoverPosition } from "../types";

export type ContextPopupControls = {
    openAt: (x: number, y: number) => void;
    openFor: (e: HTMLElement) => void;
    openOn: (e: globalThis.MouseEvent | MouseEvent<unknown>) => void;
    close: () => void;
};

export type ContextPopupVariants = "typical" | "bare";

const { useController, useControllerInternal: useContextPopupControls, useControllerExternal: useContextPopup, Controller } = createController<{ x: number; y: number } | null, ContextPopupControls>();

export { useContextPopup, useContextPopupControls };

type ContextPopupProps = DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
    controls?: ContextPopupControls;
    onPopupToggle?: (state: boolean) => void;
    onOpen?: () => void;
    onClose?: () => void;
    variant?: ContextPopupVariants;
    flavour?: Flavour;
    position?: PopoverPosition;
    trapFocus?: boolean;
};

// Invisible 1px anchor positioned at cursor coordinates
const PositionAnchor = styled.div`
    position: fixed;
    width: 1px;
    height: 1px;
    pointer-events: none;
`;

const BaseComponent = styled(
    ({ controls, style, onOpen, onClose, onPopupToggle: onPopupToggle, position = "bottom right", trapFocus, className, variant = "typical", flavour = "base", ...props }: ContextPopupProps) => {
        const [location, setLocation, state] = useController(null);
        const popoverHandle = useRef<AbstractPopupHandle>(null);
        const anchorRef = useRef<HTMLDivElement>(null);

        const onPopupToggleRef = useStable(onPopupToggle);
        const onCloseRef = useStable(onClose);
        const onOpenRef = useStable(onOpen);

        const anchorId = useId();

        const openPopup = useCallback((x: number, y: number) => {
            setLocation({ x, y });
            onPopupToggleRef.current?.(true);
            onOpenRef.current?.();
            popoverHandle.current?.open();
        }, []);

        const closePopup = useCallback(() => {
            popoverHandle.current?.close();
            onPopupToggleRef.current?.(false);
            onCloseRef.current?.();
            setLocation(null);
        }, []);

        const handleCancel = useCallback(() => {
            onPopupToggleRef.current?.(false);
            onCloseRef.current?.();
            setLocation(null);
        }, []);

        const popupMethods = useMemo<ContextPopupControls>(
            () => ({
                openAt: (x: number, y: number) => openPopup(x, y),
                openFor: (element: HTMLElement) => {
                    const rect = element.getBoundingClientRect();
                    openPopup(rect.left + rect.width / 2, rect.top + rect.height / 2);
                },
                openOn: (e: globalThis.MouseEvent | MouseEvent<unknown>) => {
                    if (e.type === "contextmenu") {
                        e.preventDefault();
                    }
                    openPopup(e.clientX, e.clientY);
                },
                close: closePopup,
            }),
            [openPopup, closePopup],
        );

        const anchorStyle = useMemo(() => {
            return {
                left: location ? `${location.x}px` : undefined,
                top: location ? `${location.y}px` : undefined,
                anchorName: `--trh-anchor_contextpopup-${anchorId}`,
            };
        }, [location, anchorId]);

        const contentsStyle = useMemo(() => {
            return {
                ...(style ?? {}),
                positionAnchor: `--trh-anchor_contextpopup-${anchorId}`,
                positionArea: position,
            };
        }, [style, anchorId, position]);

        return (
            <Controller state={state} controls={controls} methods={popupMethods}>
                <PositionAnchor style={anchorStyle} ref={anchorRef} />
                <AbstractPopup
                    trapFocus={trapFocus}
                    handle={popoverHandle}
                    backdrop={"click"}
                    escape={"close"}
                    onCancel={handleCancel}
                    style={contentsStyle}
                    data-flavour={flavour}
                    data-variant={variant}
                    {...props}
                    className={`${className ?? ""} meta-component_floater meta-component_floater-contextpopup`}
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

export const ContextPopup = BaseComponent;
