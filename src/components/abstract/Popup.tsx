import {
    CSSProperties,
    DetailedHTMLProps,
    HTMLAttributes,
    ReactNode,
    Ref,
    RefObject,
    useCallback,
    useEffect,
    useId,
    useImperativeHandle,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    FocusEvent,
    MouseEvent,
    createContext,
    useContext,
    WheelEvent,
} from "react";
import styled from "styled-components";
import { createPortal } from "react-dom";
import { useCombinedRef } from "../../util/hooks/useCombinedRef";
import { useStable } from "../../util/hooks/useStable";
import { createController } from "../../util/hooks/useController";

export namespace AbstractPopup {
    export type Placement =
        | "top"
        | "top center"
        | "top span-left"
        | "top span-right"
        | "bottom"
        | "bottom center"
        | "bottom span-left"
        | "bottom span-right"
        | "left"
        | "left center"
        | "left span-top"
        | "left span-bottom"
        | "right"
        | "right center"
        | "right span-top"
        | "right span-bottom"
        | "top left"
        | "top right"
        | "bottom left"
        | "bottom right";

    // the component that everything extends
    const Base = ({
        className,
        backdrop = "click",
        backdropWheel = "pass",
        escape = "close",
        trapFocus = false,
        handle,
        onClose,
        onCancel,
        onPopoverToggle,
        onOpen,
        safeZone,
        ref,
        style,
        preload,
        children,
        onLayout,
        popupRef,
        boundsRef,
        onFocusCapture,
        ...props
    }: AbstractPopupProps & DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>) => {
        const [dialogRef, combinedDialogRef] = useCombinedRef(popupRef);
        const svgRef = useRef<SVGSVGElement>(null);
        const observedRef = useRef<HTMLDivElement>(null);
        const [contentsRef, combinedRef] = useCombinedRef(ref);
        const [isOpen, setIsOpen] = useState(false);
        const [safeZonePath, setSafeZonePath] = useState("");
        const onCancelRef = useStable(onCancel);
        const onOpenRef = useStable(onOpen);
        const onCloseRef = useStable(onClose);
        const onPopoverToggleRef = useStable(onPopoverToggle);
        const previousFocusRef = useRef<HTMLElement | null>(null);
        const onLayoutRef = useStable(onLayout);

        const internalAnchorId = useId();

        const restoreFocus = useCallback(() => {
            if (previousFocusRef.current) {
                previousFocusRef.current.focus();
                previousFocusRef.current = null;
            }
        }, []);

        useLayoutEffect(() => {
            if (isOpen) {
                onLayoutRef?.current?.();
            }
        }, [isOpen]);

        const doCancel = useCallback(() => {
            dialogRef.current?.hidePopover();
            setIsOpen(false);
            restoreFocus();
            onCancelRef.current?.();
            onPopoverToggleRef.current?.(false);
        }, [restoreFocus]);

        const doClose = useCallback(() => {
            dialogRef.current?.hidePopover();
            setIsOpen(false);
            restoreFocus();
            onCloseRef.current?.();
            onPopoverToggleRef.current?.(false);
        }, [restoreFocus]);

        const doOpen = useCallback(() => {
            previousFocusRef.current = document.activeElement as HTMLElement | null;
            dialogRef.current?.showPopover();
            setIsOpen(true);
            onOpenRef.current?.();
            onPopoverToggleRef.current?.(true);
        }, []);

        useImperativeHandle(
            handle,
            () => ({
                open: doOpen,
                close: doClose,
                cancel: doCancel,
            }),
            [doOpen, doClose, doCancel],
        );

        // ESC key handler - uses stack manager for LIFO ordering
        useEffect(() => {
            if (!isOpen || escape === "none") return;

            pushEscapeHandler(doCancel);
            return () => removeEscapeHandler(doCancel);
        }, [isOpen, escape, doCancel]);

        // Focus trap - traps Tab/Shift+Tab within contents and focuses first element on open
        useEffect(() => {
            if (!isOpen || !trapFocus || !contentsRef.current) return;

            const contents = contentsRef.current;
            const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

            // Focus first focusable element on open
            const focusableElements = contents.querySelectorAll<HTMLElement>(focusableSelector);
            if (focusableElements.length > 0) {
                focusableElements[0].focus();
            }

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key !== "Tab") return;
                if (e.defaultPrevented) return;

                const focusable = contents.querySelectorAll<HTMLElement>(focusableSelector);
                if (focusable.length === 0) return;

                const first = focusable[0];
                const last = focusable[focusable.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    }
                } else {
                    if (document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            };

            document.addEventListener("keydown", handleKeyDown);
            return () => document.removeEventListener("keydown", handleKeyDown);
        }, [isOpen, trapFocus]);

        // SafeZone: Calculate path with anchor rectangle + wedge to contents
        const updateSafeZone = useCallback(() => {
            const anchorEl = safeZone?.current;
            if (!anchorEl || !svgRef.current || !contentsRef.current) {
                return;
            }

            const anchorRect = anchorEl.getBoundingClientRect();
            const svgRect = svgRef.current.getBoundingClientRect();
            const contentsRect = contentsRef.current.getBoundingClientRect();

            // Anchor rect relative to SVG position (with 1px padding)
            const anchorRelative: Rect = {
                left: anchorRect.left - svgRect.left - 1,
                right: anchorRect.right - svgRect.left + 1,
                top: anchorRect.top - svgRect.top - 1,
                bottom: anchorRect.bottom - svgRect.top + 1,
            };

            // Contents rect relative to SVG (which is anchored to contents, so 0,0)
            const contentsRelative: Rect = {
                left: 0,
                right: contentsRect.width,
                top: 0,
                bottom: contentsRect.height,
            };

            const path = buildSafeZonePath(anchorRelative, contentsRelative);
            setSafeZonePath(path);
        }, [safeZone]);

        // SafeZone: IntersectionObserver to detect contents position changes
        const observerRef = useRef<IntersectionObserver | null>(null);
        const resizeObserverRef = useRef<ResizeObserver | null>(null);
        const lastRectRef = useRef<{ top: number; left: number; width: number; height: number } | null>(null);

        const setupObserver = useCallback(() => {
            if (!observedRef.current) return;

            observerRef.current?.disconnect();

            const rect = observedRef.current.getBoundingClientRect();
            const vw = window.innerWidth;
            const vh = window.innerHeight;

            lastRectRef.current = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };

            const rootMargin = `${-rect.top + 1}px ${-(vw - rect.right) + 1}px ${-(vh - rect.bottom) + 1}px ${-rect.left + 1}px`;

            observerRef.current = new IntersectionObserver(
                (entries) => {
                    const entry = entries[0];
                    const newRect = entry.boundingClientRect;
                    const last = lastRectRef.current;

                    if (
                        last &&
                        Math.abs(newRect.top - last.top) < 1 &&
                        Math.abs(newRect.left - last.left) < 1 &&
                        Math.abs(newRect.width - last.width) < 1 &&
                        Math.abs(newRect.height - last.height) < 1
                    ) {
                        return;
                    }

                    updateSafeZone();
                    requestAnimationFrame(setupObserver);
                },
                {
                    threshold: [0, 1],
                    rootMargin,
                },
            );

            observerRef.current.observe(observedRef.current);
        }, [updateSafeZone]);

        // SafeZone: Setup observers when open and safeZone is provided
        useEffect(() => {
            if (!safeZone || !isOpen || !observedRef.current) return;

            requestAnimationFrame(() => {
                updateSafeZone();
                setupObserver();
            });

            resizeObserverRef.current = new ResizeObserver(() => {
                updateSafeZone();
                requestAnimationFrame(setupObserver);
            });
            resizeObserverRef.current.observe(observedRef.current);

            return () => {
                observerRef.current?.disconnect();
                resizeObserverRef.current?.disconnect();
            };
        }, [safeZone, isOpen, setupObserver, updateSafeZone]);

        const captureStyles = useMemo(() => {
            return { pointerEvents: backdrop === "pass" ? "none" : "auto" };
        }, [backdrop]);

        const handleBackdropWheel = useMemo(() => {
            if (!isOpen || backdropWheel === "pass") return undefined;
            return (e: WheelEvent<HTMLDivElement>) => {
                e.preventDefault();
                if (backdropWheel === "close") doCancel();
            };
        }, [isOpen, backdropWheel, doCancel]);

        const safezoneStyle = useMemo(() => {
            return {
                positionAnchor: `--trh-metaanchor-${internalAnchorId}`,
                top: `anchor(top)`,
                left: `anchor(left)`,
                right: `anchor(right)`,
                bottom: `anchor(bottom)`,
            };
        }, [internalAnchorId]);

        const contentsStyle = useMemo(() => {
            return { ...(style ?? {}), anchorName: `--trh-metaanchor-${internalAnchorId}` };
        }, [internalAnchorId, style]);

        const handleFocus = useCallback(
            (e: FocusEvent<HTMLDivElement>) => {
                onFocusCapture?.(e);
                dialogRef.current?.hidePopover();
                dialogRef.current?.showPopover();

                const openPopovers = dialogRef.current?.querySelectorAll(":popover-open");
                openPopovers?.forEach((popover) => {
                    (popover as HTMLElement).hidePopover();
                    (popover as HTMLElement).showPopover();
                });
            },
            [onFocusCapture],
        );

        // Portal to <body> so popups escape any transformed/scrollable ancestor
        // (e.g. the zoom-transformed graph pane), which otherwise captures their
        // fixed positioning and makes focus scroll the pane. CSS anchor positioning
        // still works across the portal since it resolves by name, not DOM ancestry.
        return createPortal(
            <LocalDialog popover={"manual"} ref={combinedDialogRef} className={className}>
                <div data-part={"backdrop"} />
                <div data-part={"bounds"} ref={boundsRef} />
                <div
                    data-part={"capture"}
                    onPointerDown={isOpen && backdrop === "click" ? doCancel : undefined}
                    // onClick={isOpen && backdrop === "click" ? doCancel : undefined}
                    onMouseMove={isOpen && backdrop === "hover" && ((safeZone && safeZonePath) || !safeZone) ? doCancel : undefined}
                    // onAuxClick={isOpen && backdrop === "click" ? doCancel : undefined}
                    onWheel={handleBackdropWheel}
                    style={captureStyles as CSSProperties}
                />
                <div data-part={"contents"} style={contentsStyle} ref={combinedRef} {...props} onFocusCapture={handleFocus} tabIndex={-1}>
                    {preload || isOpen ? children : null}
                </div>
                {safeZone && (
                    <>
                        <svg data-part={"safezone"} style={safezoneStyle} ref={svgRef}>
                            <path d={safeZonePath} />
                        </svg>
                        <div data-part={"observed"} style={safezoneStyle} ref={observedRef} />
                    </>
                )}
            </LocalDialog>,
            document.body,
        );
    };

    const BaseWithFallback = styled(Base)`
        & > [data-part="contents"] {
            position-try-fallbacks:
                flip-block,
                flip-inline,
                flip-block flip-inline;
        }
    `;

    //#region Context
    const {
        useController: useContextController,
        useControllerInternal: useContextInternal,
        useControllerExternal: useContextExternal,
        Controller: ContextController,
    } = createController<{ x: number; y: number } | null, Context.Controls>();

    export function Context({ controls, style, onOpen, onClose, onPopupToggle, placement = "bottom right", trapFocus, ...props }: Context.Props) {
        const [location, setLocation, state] = useContextController(null);
        const popoverHandle = useRef<AbstractPopupHandle>(null);
        const anchorRef = useRef<HTMLDivElement>(null);

        const onPopupToggleRef = useStable(onPopupToggle);
        const onCloseRef = useStable(onClose);
        const onOpenRef = useStable(onOpen);

        const anchorId = useId();

        const openPopup = useCallback(
            (x: number, y: number) => {
                setLocation({ x, y });
                if (anchorRef.current) {
                    anchorRef.current.style.left = `${x}px`;
                    anchorRef.current.style.top = `${y}px`;
                }
                onPopupToggleRef.current?.(true);
                onOpenRef.current?.();
                popoverHandle.current?.open();
            },
            [setLocation],
        );

        const closePopup = useCallback(() => {
            popoverHandle.current?.close();
            onPopupToggleRef.current?.(false);
            onCloseRef.current?.();
            setLocation(null);
        }, [setLocation]);

        const handleCancel = useCallback(() => {
            onPopupToggleRef.current?.(false);
            onCloseRef.current?.();
            setLocation(null);
        }, [setLocation]);

        const popupMethods = useMemo<Context.Controls>(
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
                positionArea: placement,
            };
        }, [style, anchorId, placement]);

        return (
            <ContextController state={state} controls={controls} methods={popupMethods}>
                <PositionAnchor style={anchorStyle} ref={anchorRef} />
                <BaseWithFallback trapFocus={trapFocus} handle={popoverHandle} backdrop={"click"} backdropWheel={"close"} escape={"close"} onCancel={handleCancel} style={contentsStyle} {...props} />
            </ContextController>
        );
    }

    export namespace Context {
        export const useControls = useContextExternal;
        export const useInternal = useContextInternal;
        export type Controls = {
            openAt: (x: number, y: number) => void;
            openFor: (e: HTMLElement) => void;
            openOn: (e: globalThis.MouseEvent | MouseEvent<unknown>) => void;
            close: () => void;
        };
        export type Props = DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
            controls?: Controls;
            onPopupToggle?: (state: boolean) => void;
            onOpen?: () => void;
            onClose?: () => void;
            placement?: Placement;
            trapFocus?: boolean;
        };
    }

    //#endregion

    //#region Dialog

    const {
        useController: useDialogController,
        useControllerInternal: useDialogInternal,
        useControllerExternal: useDialogExternal,
        Controller: DialogController,
    } = createController<Point | null, Dialog.Controls>();

    const BaseDialog = styled(Base)`
        & > [data-part="contents"] {
            /* Override default positioning - we use explicit left/top */
            inset: unset;
            margin: 0;
            max-width: 90vw;
            max-height: 90vh;
            overflow: auto;
        }
        & > [data-part="contents"][data-dragging] {
            user-select: none;
        }
    `;

    export function Dialog({ controls, onPositionChange, onOpen, onClose, onPopupToggle, style, children, ...props }: Dialog.Props) {
        const [position, setPosition, state] = useDialogController(null);
        const positionRef = useRef<Point | null>(null);
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
        const getBounds = useCallback((): Rect => {
            if (boundsRef.current) {
                const rect = boundsRef.current.getBoundingClientRect();
                return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
            }
            return { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
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
            let pos: Point;

            switch (instruction.type) {
                case "center": {
                    pos = {
                        x: bounds.left + (bounds.right - bounds.left - dims.width) / 2,
                        y: bounds.top + (bounds.bottom - bounds.top - dims.height) / 2,
                    };
                    break;
                }
                case "at": {
                    const resolved = resolvePosition({ x: instruction.x, y: instruction.y }, dims, instruction.alignment);
                    pos = clampToBounds(resolved, dims.width, dims.height, bounds);
                    break;
                }
                case "on": {
                    const anchorPoint = resolveAnchorPoint(instruction.elementRect, instruction.anchor);
                    const resolved = resolvePosition(anchorPoint, dims, instruction.alignment);
                    pos = clampToBounds(resolved, dims.width, dims.height, bounds);
                    break;
                }
            }

            pendingPositionRef.current = null;
            positionRef.current = pos;
            setPosition(pos);
            onPositionChangeRef.current?.(pos.x, pos.y);
            onPopupToggleRef.current?.(true);
            onOpenRef.current?.();
        }, [getBounds, getDialogDimensions, setPosition]);

        const openCenter = useCallback(() => {
            pendingPositionRef.current = { type: "center" };
            popoverHandle.current?.open();
        }, []);

        const openAt = useCallback((x: number, y: number, alignment?: AlignmentOptions) => {
            pendingPositionRef.current = { type: "at", x, y, alignment };
            popoverHandle.current?.open();
        }, []);

        const openOn = useCallback((element: HTMLElement, alignment?: AlignmentOptions, anchor?: AlignmentOptions) => {
            const elementRect = element.getBoundingClientRect();
            pendingPositionRef.current = { type: "on", elementRect, alignment, anchor };
            popoverHandle.current?.open();
        }, []);

        const closeDialog = useCallback(() => {
            pendingPositionRef.current = null;
            positionRef.current = null;
            popoverHandle.current?.close();
            onPopupToggleRef.current?.(false);
            onCloseRef.current?.();
            setPosition(null);
        }, [setPosition]);

        // Handle cancel (from AbstractPopover)
        const handleCancel = useCallback(() => {
            pendingPositionRef.current = null;
            positionRef.current = null;
            onPopupToggleRef.current?.(false);
            onCloseRef.current?.();
            setPosition(null);
        }, [setPosition]);

        const dialogMethods = useMemo<Dialog.Controls>(
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
                if (e.button !== 0) return;
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
                    onPositionChangeRef.current?.(pos.x, pos.y);
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
        }, [position, setPosition, getDialogDimensions, getBounds]);

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

        const dragHandleContextValue = useMemo<DragHandleContextValue>(
            () => ({
                handleRef,
                isDragging,
            }),
            [isDragging],
        );

        return (
            <DialogController state={state} controls={controls} methods={dialogMethods}>
                <DragHandleContext.Provider value={dragHandleContextValue}>
                    <BaseDialog
                        popupRef={popupRef}
                        boundsRef={boundsRef}
                        handle={popoverHandle}
                        backdrop="pass"
                        backdropWheel="pass"
                        escape="none"
                        trapFocus={false}
                        onCancel={handleCancel}
                        onLayout={handleLayout}
                        style={contentsStyle}
                        ref={contentsRef}
                        data-dragging={isDragging || undefined}
                        {...props}
                    >
                        {children}
                    </BaseDialog>
                </DragHandleContext.Provider>
            </DialogController>
        );
    }

    export namespace Dialog {
        export const useControls = useDialogExternal;
        export const useInternal = useDialogInternal;

        export const useMoveHandle = () => {
            const ctx = useContext(DragHandleContext);
            if (!ctx) {
                throw new Error("useHandle must be used within a Dialog");
            }
            return ctx;
        };

        export type Controls = {
            open: () => void;
            openAt: (x: number, y: number, alignment?: AlignmentOptions) => void;
            openOn: (element: HTMLElement, alignment?: AlignmentOptions, anchor?: AlignmentOptions) => void;
            close: () => void;
            value: () => boolean;
        };
        export type Props = DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
            controls?: Controls;
            onPositionChange?: (x: number, y: number) => void;
            onPopupToggle?: (state: boolean) => void;
            onOpen?: () => void;
            onClose?: () => void;
        };
    }
    //#endregion

    //#region Anchored

    /*
    Click-dismiss (old Anchored): <AbstractPopup.Anchored backdrop="click" /> — the default
    Hover-dismiss (old Flyout): <AbstractPopup.Anchored backdrop="hover" />
    Forced open (old Anchored with force): <AbstractPopup.Anchored force />

    Safe zone only wires up when backdrop="hover" (the only case it's needed). The Anchored export, controller, and namespace are gone entirely.
    */

    const {
        useController: useFlyoutController,
        useControllerInternal: useFlyoutInternal,
        useControllerExternal: useFlyoutExternal,
        Controller: FlyoutController,
    } = createController<HTMLElement | null, Anchored.Controls>();

    export function Anchored({
        controls,
        placement = "bottom right",
        force = false,
        backdrop = "click",
        onOpen,
        onClose,
        onPopupToggle,
        style,
        trapFocus,
        backdropWheel = "close",
        ...props
    }: Anchored.Props) {
        const [, setAnchorElement, state] = useFlyoutController(null);
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
            [anchorId, setAnchorElement],
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
        }, [setAnchorElement]);

        const handleCancel = useCallback(() => {
            onPopupToggleRef.current?.(false);
            onCloseRef.current?.();
            if (anchorElementRef.current) {
                (anchorElementRef.current.style as CSSProperties).anchorName = "";
                anchorElementRef.current = null;
                setAnchorElement(null);
            }
        }, [setAnchorElement]);

        const flyoutMethods = useMemo<Anchored.Controls>(
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
                positionArea: placement,
            };
        }, [anchorId, placement, style]);

        const resolvedWheel = force ? "block" : backdropWheel;
        const resolvedBackdrop = force ? "block" : backdrop;
        const resolvedEscape = force ? "none" : "close";

        return (
            <FlyoutController state={state} controls={controls} methods={flyoutMethods}>
                <BaseWithFallback
                    backdropWheel={resolvedWheel}
                    handle={popoverHandle}
                    backdrop={resolvedBackdrop}
                    escape={resolvedEscape}
                    safeZone={resolvedBackdrop === "hover" ? anchorElementRef : undefined}
                    onCancel={handleCancel}
                    style={contentsStyle}
                    trapFocus={trapFocus}
                    {...props}
                />
            </FlyoutController>
        );
    }

    export namespace Anchored {
        export const useControls = useFlyoutExternal;
        export const useInternal = useFlyoutInternal;
        export type Controls = {
            openFor: (e: HTMLElement) => void;
            openOn: (e: MouseEvent<HTMLElement>) => void;
            close: () => void;
        };
        export type Props = DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
            controls?: Controls;
            placement?: Placement;
            force?: boolean; // when true, prevents closing via backdrop click or escape
            backdrop?: "click" | "hover";
            backdropWheel?: "close" | "pass";
            onPopupToggle?: (state: boolean) => void;
            onOpen?: () => void;
            onClose?: () => void;
            trapFocus?: boolean;
        };
    }
    //#endregion

    //#region Modal

    const {
        useController: useModalController,
        useControllerInternal: useModalInternal,
        useControllerExternal: useModalExternal,
        Controller: ModalController,
    } = createController<boolean, Modal.Controls>();

    const ModalBase = styled(Base)`
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
    `;

    export function Modal({ controls, force = false, align, size, onCancel, onOpen, onClose, onPopupToggle, style, ...props }: Modal.Props) {
        const [, setIsOpen, state] = useModalController(false);
        const popoverHandle = useRef<AbstractPopupHandle>(null);

        const onCancelRef = useStable(onCancel);
        const onCloseRef = useStable(onClose);
        const onOpenRef = useStable(onOpen);
        const onPopupToggleRef = useStable(onPopupToggle);

        const openModal = useCallback(() => {
            setIsOpen(true);
            onPopupToggleRef.current?.(true);
            onOpenRef.current?.();
            popoverHandle.current?.open();
        }, [setIsOpen]);

        const closeModal = useCallback(() => {
            popoverHandle.current?.close();
            onPopupToggleRef.current?.(false);
            onCloseRef.current?.();
            setIsOpen(false);
        }, [setIsOpen]);

        const handleCancel = useCallback(() => {
            onPopupToggleRef.current?.(false);
            onCloseRef.current?.();
            onCancelRef.current?.();
            setIsOpen(false);
        }, [setIsOpen]);

        const modalMethods = useMemo<Modal.Controls>(
            () => ({
                open: openModal,
                close: closeModal,
                value: state.get,
            }),
            [openModal, closeModal, state.get],
        );

        const alignment = useMemo(() => parseAlignment(align), [align]);
        const dimensions = useMemo(() => parseModalSize(size), [size]);

        const contentsStyle = useMemo(
            () => ({
                ...(style ?? {}),
                width: dimensions.width,
                height: dimensions.height,
            }),
            [style, dimensions.width, dimensions.height],
        );

        return (
            <ModalController state={state} controls={controls} methods={modalMethods}>
                <ModalBase
                    handle={popoverHandle}
                    backdrop={force ? "block" : "click"}
                    escape={force ? "none" : "close"}
                    trapFocus
                    onCancel={handleCancel}
                    style={contentsStyle}
                    data-align-vertical={alignment.vertical}
                    data-align-horizontal={alignment.horizontal}
                    {...props}
                />
            </ModalController>
        );
    }

    export namespace Modal {
        export const useControls = useModalExternal;
        export const useInternal = useModalInternal;
        export type Controls = {
            open: () => void;
            close: () => void;
            value: () => boolean;
        };
        export type Props = DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
            controls?: Controls;
            force?: boolean; // when true, prevents closing via backdrop click or escape
            onPopupToggle?: (state: boolean) => void;
            onOpen?: () => void;
            onClose?: () => void;
            onCancel?: () => void;
            align?: AlignmentOptions; // e.g., "center", "top left", "center right"
            size?: Size | `${Size} ${Size}`; // e.g., "1024px", "80vw 600px"
        };
    }
    //#endregion
}

const DRAG_THRESHOLD = 4;

//#region module-level types

type CSSUnit = "px" | "em" | "rem" | "vw" | "vh" | "vmin" | "vmax" | "%" | "ch" | "ex" | "cm" | "mm" | "in" | "pt" | "pc" | "dvh" | "dvw" | "lvh" | "lvw" | "svh" | "svw";
export type Size = `${number}${CSSUnit}` | "auto" | "fit";
type VerticalAlignment = "top" | "center" | "bottom";
type HorizontalAlignment = "left" | "center" | "right";
type Alignment = VerticalAlignment | HorizontalAlignment;
type AlignmentOptions = Alignment | `${Alignment} ${Alignment}`;
type Rect = { top: number; left: number; right: number; bottom: number };
type Point = { x: number; y: number };

type DragHandleContextValue = {
    handleRef: RefObject<HTMLElement | null>;
    isDragging: boolean;
};

const DragHandleContext = createContext<DragHandleContextValue | null>(null);

type PendingPositionInstruction =
    | { type: "center" }
    | { type: "at"; x: number; y: number; alignment?: AlignmentOptions }
    | { type: "on"; elementRect: DOMRect; alignment?: AlignmentOptions; anchor?: AlignmentOptions };

type AbstractPopupHandle = {
    open: () => void;
    close: () => void;
    cancel: () => void;
};

type AbstractPopupProps = {
    trapFocus?: boolean;
    backdrop?: "click" | "block" | "pass" | "hover"; // click = "cancel on click", "block" = "intercept click, but do nothing", "pass" = "do not intercept click", "hover" = "cancel when backdrop is hovered" - note that this doesn't style the backdrop (except for pointer-events) - the backdrop always renders, styling of the backdrop is the responsibility of the component
    backdropWheel?: "close" | "block" | "pass"; // close = "cancel on wheel", block = "prevent wheel propagation", pass = "ignore wheel events"
    safeZone?: RefObject<HTMLElement | null>; // if provided, will add a safe-zone (see current flyout implementation) that surrounds the "contents" and the element provided in the ref
    escape?: "close" | "none"; // what happens when you press escape?
    children?: ReactNode;
    handle: RefObject<AbstractPopupHandle | null>;
    onClose?: () => void; // callback for when handle.close() is called - not sure if needed.
    onCancel?: () => void; // callback for when escape is pressed (depending on 'escape' prop), backdrop is clicked or hovered (depending on 'backdrop' prop), or handle.cancel() is called.
    onOpen?: () => void; // callback for when handle.open() is called - not sure if needed.
    onPopoverToggle?: (v: boolean) => void; // callback for when handle.open() is called - not sure if needed.
    className?: string;
    style?: CSSProperties;
    preload?: boolean;
    onLayout?: () => void;
    popupRef?: Ref<HTMLDivElement | null>;
    boundsRef?: Ref<HTMLDivElement | null>;
};

//#endregion

//#region module-level components

const LocalDialog = styled((props: DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>) => {
    return <div {...props} />;
})`
    position: fixed;
    inset: 0;
    border: none;
    background: transparent;
    padding: 0;
    margin: 0;
    max-width: none;
    max-height: none;
    width: 100%;
    height: 100%;
    pointer-events: none;

    & > * {
        pointer-events: auto;
    }

    &::backdrop {
        display: none; /* ignore the built-in backdrop */
    }

    & > [data-part="capture"] {
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        top: anchor(--trh-anchor-app-title bottom, 0);
        bottom: 0;
    }

    & > [data-part="bounds"] {
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        top: anchor(--trh-anchor-app-menu bottom, anchor(--trh-anchor-app-title bottom, 0));
        bottom: anchor(--trh-anchor-app-status top, 0);
    }

    & > [data-part="backdrop"] {
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;

        top: anchor(--trh-anchor-app-menu bottom, anchor(--trh-anchor-app-title bottom, 0));
        bottom: anchor(--trh-anchor-app-status top, 0);
    }

    & > [data-part="safezone"] {
        position: fixed;
        pointer-events: none;
        overflow: visible;
        z-index: 1;
    }

    & > [data-part="safezone"] > path {
        pointer-events: fill;
        fill: #08f2;
    }

    & > [data-part="observed"] {
        position: fixed;
        pointer-events: none;
        z-index: 2;
    }

    & > [data-part="contents"] {
        position: fixed; /* positioning is done by consumer */
        z-index: 3;
    }
`;

const PositionAnchor = styled.div`
    position: fixed;
    width: 1px;
    height: 1px;
    pointer-events: none;
    background: transparent;
`;

//#endregion

//#region module-level helpers

const escapeStack: (() => void)[] = [];
let escapeListenerAttached = false;

const handleGlobalEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape" && escapeStack.length > 0) {
        e.preventDefault();
        e.stopImmediatePropagation();
        escapeStack[escapeStack.length - 1]();
    }
};

const pushEscapeHandler = (handler: () => void) => {
    if (!escapeListenerAttached) {
        document.addEventListener("keydown", handleGlobalEscape, { capture: true });
        escapeListenerAttached = true;
    }
    escapeStack.push(handler);
};

const removeEscapeHandler = (handler: () => void) => {
    const idx = escapeStack.indexOf(handler);
    if (idx !== -1) escapeStack.splice(idx, 1);
};

const convexHull = (points: Point[]): Point[] => {
    if (points.length < 3) return points;

    // Find bottommost point (highest y), leftmost if tie
    let start = 0;
    for (let i = 1; i < points.length; i++) {
        if (points[i].y > points[start].y || (points[i].y === points[start].y && points[i].x < points[start].x)) {
            start = i;
        }
    }

    const startPoint = points[start];

    const sorted = points
        .filter((_, i) => i !== start)
        .sort((p1, p2) => {
            const angle1 = Math.atan2(p1.y - startPoint.y, p1.x - startPoint.x);
            const angle2 = Math.atan2(p2.y - startPoint.y, p2.x - startPoint.x);
            if (angle1 !== angle2) return angle1 - angle2;
            const dist1 = (p1.x - startPoint.x) ** 2 + (p1.y - startPoint.y) ** 2;
            const dist2 = (p2.x - startPoint.x) ** 2 + (p2.y - startPoint.y) ** 2;
            return dist1 - dist2;
        });

    const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

    const hull: Point[] = [startPoint];

    for (const point of sorted) {
        while (hull.length > 1 && cross(hull[hull.length - 2], hull[hull.length - 1], point) <= 0) {
            hull.pop();
        }
        hull.push(point);
    }

    return hull;
};

// Build safe zone path: anchor rectangle + convex hull of (contents corners + anchor center)
const buildSafeZonePath = (anchor: Rect, contents: Rect): string => {
    // Subpath 1: Rectangle around anchor
    const anchorPath = `M ${anchor.left} ${anchor.top} L ${anchor.right} ${anchor.top} L ${anchor.right} ${anchor.bottom} L ${anchor.left} ${anchor.bottom} Z`;

    // Subpath 2: Convex hull of contents corners + anchor center point
    const anchorCenter: Point = {
        x: (anchor.left + anchor.right) / 2,
        y: (anchor.top + anchor.bottom) / 2,
    };

    const hullPoints: Point[] = [
        anchorCenter,
        { x: contents.left, y: contents.top },
        { x: contents.right, y: contents.top },
        { x: contents.right, y: contents.bottom },
        { x: contents.left, y: contents.bottom },
    ];

    const hull = convexHull(hullPoints);

    if (hull.length < 3) return anchorPath;

    const hullPath = hull.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

    return anchorPath + " " + hullPath;
};

type ParsedAlignment = { vertical: VerticalAlignment; horizontal: HorizontalAlignment };

const parseAlignment = (align?: AlignmentOptions): ParsedAlignment => {
    if (!align) return { vertical: "center", horizontal: "center" };

    const parts = align.trim().toLowerCase().split(/\s+/);
    const verticals = ["top", "center", "bottom"];
    const horizontals = ["left", "center", "right"];

    let vertical: VerticalAlignment = "center";
    let horizontal: HorizontalAlignment = "center";

    for (const part of parts) {
        if (verticals.includes(part)) vertical = part as VerticalAlignment;
        if (horizontals.includes(part)) horizontal = part as HorizontalAlignment;
    }

    return { vertical, horizontal };
};

// Resolves a point on an element rect based on alignment
const resolveAnchorPoint = (elementRect: DOMRect, anchor: AlignmentOptions = "center center"): Point => {
    const a = parseAlignment(anchor);
    return {
        x: a.horizontal === "left" ? elementRect.left : a.horizontal === "right" ? elementRect.right : elementRect.left + elementRect.width / 2,
        y: a.vertical === "top" ? elementRect.top : a.vertical === "bottom" ? elementRect.bottom : elementRect.top + elementRect.height / 2,
    };
};

// Resolves where to place a dialog given an anchor point and which corner of the dialog aligns to it
const resolvePosition = (anchor: Point, dialogDims: { width: number; height: number }, alignment: AlignmentOptions = "top left"): Point => {
    const p = parseAlignment(alignment);
    return {
        x: p.horizontal === "left" ? anchor.x : p.horizontal === "right" ? anchor.x - dialogDims.width : anchor.x - dialogDims.width / 2,
        y: p.vertical === "top" ? anchor.y : p.vertical === "bottom" ? anchor.y - dialogDims.height : anchor.y - dialogDims.height / 2,
    };
};

const clampToBounds = (pos: Point, dialogWidth: number, dialogHeight: number, bounds: Rect): Point => {
    return {
        x: Math.max(bounds.left, Math.min(pos.x, bounds.right - dialogWidth)),
        y: Math.max(bounds.top, Math.min(pos.y, bounds.bottom - dialogHeight)),
    };
};

const parseModalSize = (size?: string): { width: string; height: string } => {
    if (!size) return { width: "fit-content", height: "fit-content" };

    const parts = size.trim().split(/\s+/);

    if (parts.length === 1) {
        return { width: parts[0] === "fit" ? "fit-content" : parts[0], height: "fit-content" };
    } else {
        return { width: parts[0] === "fit" ? "fit-content" : parts[0], height: parts[1] === "fit" ? "fit-content" : parts[1] };
    }
};

//#endregion
