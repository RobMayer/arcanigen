import { createContext, DetailedHTMLProps, HTMLAttributes, RefObject, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { AbstractPopup, AbstractPopupHandle } from "../abstract/Popup";
import { createController } from "../../util/hooks/useController";
import { useStable } from "../../util/hooks/useStable";
import { Flavour } from "../types";
import { Icon, ICONS } from "../Icon";

// Minimum pixels of movement before drag starts
const DRAG_THRESHOLD = 4;

// Position state
type Position = { x: number; y: number };

// Placement/anchor for openOn - "vertical horizontal" format
type Alignment = "top" | "center" | "bottom";
type HorizontalAlignment = "left" | "center" | "right";
type PlacementAnchor = `${Alignment} ${HorizontalAlignment}` | Alignment | HorizontalAlignment;

export type DialogControls = {
    open: () => void;
    openAt: (x: number, y: number, placement?: PlacementAnchor) => void;
    openOn: (element: HTMLElement, placement?: PlacementAnchor, anchor?: PlacementAnchor) => void;
    close: () => void;
    value: () => boolean;
};

export type DialogVariants = "typical" | "bare";

const { useController, useControllerInternal: useDialogControls, useControllerExternal: useDialog, Controller } = createController<Position | null, DialogControls>();

export { useDialog, useDialogControls };

// Context for drag handle
type DragHandleContextValue = {
    handleRef: RefObject<HTMLElement | null>;
    isDragging: boolean;
};

const DragHandleContext = createContext<DragHandleContextValue | null>(null);

export const useDialogHandle = () => {
    const ctx = useContext(DragHandleContext);
    if (!ctx) {
        throw new Error("useDialogHandle must be used within a Dialog");
    }
    return ctx;
};

// Parse alignment string into vertical and horizontal components
const parseAlignment = (align?: PlacementAnchor): { vertical: Alignment; horizontal: HorizontalAlignment } => {
    if (!align) return { vertical: "center", horizontal: "center" };

    const parts = align.trim().toLowerCase().split(/\s+/);
    const verticals = ["top", "center", "bottom"];
    const horizontals = ["left", "center", "right"];

    let vertical: Alignment = "center";
    let horizontal: HorizontalAlignment = "center";

    for (const part of parts) {
        if (verticals.includes(part)) vertical = part as Alignment;
        if (horizontals.includes(part)) horizontal = part as HorizontalAlignment;
    }

    return { vertical, horizontal };
};

// Calculate position based on element rect, placement, and anchor
const calculatePosition = (elementRect: DOMRect, dialogRect: { width: number; height: number }, placement: PlacementAnchor = "center center", anchor: PlacementAnchor = "center center"): Position => {
    const p = parseAlignment(placement);
    const a = parseAlignment(anchor);

    // Get anchor point on the element
    let anchorX: number;
    let anchorY: number;

    switch (a.horizontal) {
        case "left":
            anchorX = elementRect.left;
            break;
        case "right":
            anchorX = elementRect.right;
            break;
        default:
            anchorX = elementRect.left + elementRect.width / 2;
    }

    switch (a.vertical) {
        case "top":
            anchorY = elementRect.top;
            break;
        case "bottom":
            anchorY = elementRect.bottom;
            break;
        default:
            anchorY = elementRect.top + elementRect.height / 2;
    }

    // Calculate dialog position based on placement (which corner/edge of dialog goes at anchor point)
    let x: number;
    let y: number;

    switch (p.horizontal) {
        case "left":
            x = anchorX;
            break;
        case "right":
            x = anchorX - dialogRect.width;
            break;
        default:
            x = anchorX - dialogRect.width / 2;
    }

    switch (p.vertical) {
        case "top":
            y = anchorY;
            break;
        case "bottom":
            y = anchorY - dialogRect.height;
            break;
        default:
            y = anchorY - dialogRect.height / 2;
    }

    return { x, y };
};

// Bounds rect type for clamping
type Bounds = { left: number; top: number; width: number; height: number };

// Clamp position to keep dialog within bounds
const clampToBounds = (pos: Position, dialogWidth: number, dialogHeight: number, bounds: Bounds): Position => {
    return {
        x: Math.max(bounds.left, Math.min(pos.x, bounds.left + bounds.width - dialogWidth)),
        y: Math.max(bounds.top, Math.min(pos.y, bounds.top + bounds.height - dialogHeight)),
    };
};

type DialogProps = DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
    controls?: DialogControls;
    onPositionChange?: (x: number, y: number) => void;
    onPopupToggle?: (state: boolean) => void;
    onOpen?: () => void;
    onClose?: () => void;
    variant?: DialogVariants;
    flavour?: Flavour;
};

// Pending position instruction - set before open, processed in onLayout
type PendingPositionInstruction =
    | { type: "center" }
    | { type: "at"; x: number; y: number; placement?: PlacementAnchor }
    | { type: "on"; elementRect: DOMRect; placement?: PlacementAnchor; anchor?: PlacementAnchor };

const DialogBase = styled(({ controls, onPositionChange, onOpen, onClose, onPopupToggle, style, className, variant = "typical", flavour = "default", children, ...props }: DialogProps) => {
    const [position, setPosition, state] = useController(null);
    const positionRef = useRef<Position | null>(null);
    const popoverHandle = useRef<AbstractPopupHandle>(null);
    const contentsRef = useRef<HTMLDivElement>(null);
    const handleRef = useRef<HTMLElement>(null);
    const boundsRef = useRef<HTMLDivElement>(null);

    const onOpenRef = useStable(onOpen);
    const onCloseRef = useStable(onClose);
    const onPopupToggleRef = useStable(onPopupToggle);
    const onPositionChangeRef = useStable(onPositionChange);

    // Drag state
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef<{ mouseX: number; mouseY: number; dialogX: number; dialogY: number } | null>(null);
    const hasDraggedRef = useRef(false);

    // Pending position instruction - processed in onLayout callback
    const pendingPositionRef = useRef<PendingPositionInstruction | null>(null);

    // Get bounds from bounds element (falls back to window if not available)
    const getBounds = useCallback((): Bounds => {
        if (boundsRef.current) {
            const rect = boundsRef.current.getBoundingClientRect();
            return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
        }
        return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    }, []);

    // Get dialog dimensions (must be called when dialog is open/visible)
    const getDialogDimensions = useCallback(() => {
        if (contentsRef.current) {
            const rect = contentsRef.current.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
        }
        return { width: 0, height: 0 };
    }, []);

    // Called by AbstractPopover's onLayout - children are mounted and measurable
    const handleLayout = useCallback(() => {
        const instruction = pendingPositionRef.current;
        if (!instruction) return;

        const dims = getDialogDimensions();
        const bounds = getBounds();
        let pos: Position;

        switch (instruction.type) {
            case "center": {
                pos = {
                    x: bounds.left + (bounds.width - dims.width) / 2,
                    y: bounds.top + (bounds.height - dims.height) / 2,
                };
                break;
            }
            case "at": {
                const p = parseAlignment(instruction.placement ?? "top left");
                let x: number;
                let y: number;

                switch (p.horizontal) {
                    case "left":
                        x = instruction.x;
                        break;
                    case "right":
                        x = instruction.x - dims.width;
                        break;
                    default:
                        x = instruction.x - dims.width / 2;
                }

                switch (p.vertical) {
                    case "top":
                        y = instruction.y;
                        break;
                    case "bottom":
                        y = instruction.y - dims.height;
                        break;
                    default:
                        y = instruction.y - dims.height / 2;
                }

                pos = clampToBounds({ x, y }, dims.width, dims.height, bounds);
                break;
            }
            case "on": {
                const calculated = calculatePosition(instruction.elementRect, dims, instruction.placement, instruction.anchor);
                pos = clampToBounds(calculated, dims.width, dims.height, bounds);
                break;
            }
        }

        pendingPositionRef.current = null;
        positionRef.current = pos;
        setPosition(pos);
        onPositionChangeRef.current?.(pos.x, pos.y);
        onPopupToggleRef.current?.(true);
        onOpenRef.current?.();
    }, [getBounds, getDialogDimensions]);

    // Open at center of viewport
    const openCenter = useCallback(() => {
        pendingPositionRef.current = { type: "center" };
        popoverHandle.current?.open();
    }, []);

    // Open at explicit coordinates
    const openAt = useCallback((x: number, y: number, placement?: PlacementAnchor) => {
        pendingPositionRef.current = { type: "at", x, y, placement };
        popoverHandle.current?.open();
    }, []);

    // Open relative to element
    const openOn = useCallback((element: HTMLElement, placement?: PlacementAnchor, anchor?: PlacementAnchor) => {
        const elementRect = element.getBoundingClientRect();
        pendingPositionRef.current = { type: "on", elementRect, placement, anchor };
        popoverHandle.current?.open();
    }, []);

    // Close dialog
    const closeDialog = useCallback(() => {
        pendingPositionRef.current = null;
        positionRef.current = null;
        popoverHandle.current?.close();
        onPopupToggleRef.current?.(false);
        onCloseRef.current?.();
        setPosition(null);
    }, []);

    // Handle cancel (from AbstractPopover)
    const handleCancel = useCallback(() => {
        pendingPositionRef.current = null;
        positionRef.current = null;
        onPopupToggleRef.current?.(false);
        onCloseRef.current?.();
        setPosition(null);
    }, []);

    // Controller methods
    const dialogMethods = useMemo<DialogControls>(
        () => ({
            open: openCenter,
            openAt,
            openOn,
            close: closeDialog,
            value: () => positionRef.current !== null,
        }),
        [openCenter, openAt, openOn, closeDialog],
    );

    const popupRef = useRef<HTMLDivElement>(null);

    // Drag handling
    useEffect(() => {
        const handle = handleRef.current;
        if (!handle || !position) return;

        const onPointerDown = (e: PointerEvent) => {
            if (e.button !== 0) return; // Left click only
            const pos = positionRef.current;
            if (!pos) return;

            dragStartRef.current = {
                mouseX: e.clientX,
                mouseY: e.clientY,
                dialogX: pos.x,
                dialogY: pos.y,
            };
            hasDraggedRef.current = false;

            handle.setPointerCapture(e.pointerId);
        };

        const onPointerMove = (e: PointerEvent) => {
            if (!dragStartRef.current) return;

            const dx = e.clientX - dragStartRef.current.mouseX;
            const dy = e.clientY - dragStartRef.current.mouseY;

            // Check threshold
            if (!hasDraggedRef.current) {
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < DRAG_THRESHOLD) return;
                hasDraggedRef.current = true;
                setIsDragging(true);
            }

            const dims = getDialogDimensions();
            const bounds = getBounds();
            const newPos = clampToBounds(
                {
                    x: dragStartRef.current.dialogX + dx,
                    y: dragStartRef.current.dialogY + dy,
                },
                dims.width,
                dims.height,
                bounds,
            );

            positionRef.current = newPos;
            setPosition(newPos);
        };

        const onPointerUp = (e: PointerEvent) => {
            if (!dragStartRef.current) return;

            handle.releasePointerCapture(e.pointerId);

            const pos = positionRef.current;
            if (hasDraggedRef.current && pos) {
                onPositionChange?.(pos.x, pos.y);
            }

            dragStartRef.current = null;
            hasDraggedRef.current = false;
            setIsDragging(false);
        };

        handle.addEventListener("pointerdown", onPointerDown);
        handle.addEventListener("pointermove", onPointerMove);
        handle.addEventListener("pointerup", onPointerUp);
        handle.addEventListener("pointercancel", onPointerUp);

        return () => {
            handle.removeEventListener("pointerdown", onPointerDown);
            handle.removeEventListener("pointermove", onPointerMove);
            handle.removeEventListener("pointerup", onPointerUp);
            handle.removeEventListener("pointercancel", onPointerUp);
        };
    }, [position, setPosition, onPositionChange, getDialogDimensions, getBounds]);

    // ResizeObserver to reposition dialog if contents grow beyond bounds
    useEffect(() => {
        const contents = contentsRef.current;
        if (!contents || !position) return;

        const resizeObserver = new ResizeObserver(() => {
            const pos = positionRef.current;
            if (!pos) return;

            const dims = getDialogDimensions();
            const bounds = getBounds();
            const clamped = clampToBounds(pos, dims.width, dims.height, bounds);

            // Only update if position changed
            if (clamped.x !== pos.x || clamped.y !== pos.y) {
                positionRef.current = clamped;
                setPosition(clamped);
                onPositionChangeRef.current?.(clamped.x, clamped.y);
            }
        });

        resizeObserver.observe(contents);
        return () => resizeObserver.disconnect();
    }, [position, setPosition, getDialogDimensions, getBounds]);

    // Contents positioning style - visibility hidden while pending position
    const contentsStyle = useMemo(
        () => ({
            ...(style ?? {}),
            left: position ? `${position.x}px` : undefined,
            top: position ? `${position.y}px` : undefined,
            visibility: position ? undefined : ("hidden" as const),
        }),
        [style, position],
    );

    // Drag handle context value
    const dragHandleContextValue = useMemo<DragHandleContextValue>(
        () => ({
            handleRef: handleRef as RefObject<HTMLElement | null>,
            isDragging,
        }),
        [isDragging],
    );

    return (
        <Controller state={state} controls={controls} methods={dialogMethods}>
            <DragHandleContext.Provider value={dragHandleContextValue}>
                <AbstractPopup
                    popupRef={popupRef}
                    boundsRef={boundsRef}
                    handle={popoverHandle}
                    backdrop="pass"
                    escape="none"
                    trapFocus={false}
                    onCancel={handleCancel}
                    onLayout={handleLayout}
                    style={contentsStyle}
                    ref={contentsRef}
                    data-variant={variant}
                    data-flavour={flavour}
                    data-dragging={isDragging || undefined}
                    {...props}
                    className={`${className ?? ""} meta-component_floater meta-component_floater-dialog`}
                >
                    {children}
                </AbstractPopup>
            </DragHandleContext.Provider>
        </Controller>
    );
})`
    & > [data-part="contents"] {
        /* Override default positioning - we use explicit left/top */
        inset: unset;
        margin: 0;
        max-width: 90vw;
        max-height: 90vh;
        overflow: auto;
    }

    & > [data-part="contents"][data-variant="typical"] {
        display: flex;
        flex-direction: column;
        background: var(--flavour-plate-bg);
        border: 1px solid var(--flavour-plate-border);
        border-radius: 8px;
        corner-shape: bevel;
        box-shadow: 0px 4px 12px #0004;
    }

    & > [data-part="contents"][data-dragging] {
        user-select: none;
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

export const Dialog = DialogBase as ToExport;
Dialog.Title = DialogTitle;
Dialog.Content = DialogContent;
Dialog.Footer = DialogFooter;
