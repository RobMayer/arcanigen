import {
    RefObject,
    ReactNode,
    CSSProperties,
    Ref,
    DetailedHTMLProps,
    HTMLAttributes,
    useRef,
    useState,
    useId,
    useCallback,
    useLayoutEffect,
    useImperativeHandle,
    useEffect,
    useMemo,
    FocusEvent,
} from "react";
import styled from "styled-components";
import { useCombinedRef } from "../../util/hooks/useCombinedRef";
import { useStable } from "../../util/hooks/useStable";

// Escape key stack manager - ensures LIFO ordering (most recently opened handles escape first)
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

type AbstractPopupHandle = {
    open: () => void;
    close: () => void;
    cancel: () => void;
};

type AbstractPopupProps = {
    trapFocus?: boolean;
    backdrop?: "click" | "block" | "pass" | "hover"; // click = "cancel on click", "block" = "intercept click, but do nothing", "pass" = "do not intercept click", "hover" = "cancel when backdrop is hovered" - note that this doesn't style the backdrop (except for pointer-events) - the backdrop always renders, styling of the backdrop is the responsibility of the component
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

export type { AbstractPopupHandle, AbstractPopupProps };

// using <dialog> for semantics

export const AbstractPopup = ({
    className,
    backdrop = "click",
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

                if (last && Math.abs(newRect.top - last.top) < 1 && Math.abs(newRect.left - last.left) < 1 && Math.abs(newRect.width - last.width) < 1 && Math.abs(newRect.height - last.height) < 1) {
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

    // Determine pointer-events for backdrop based on mode
    const captureStyles = useMemo(() => {
        return { pointerEvents: backdrop === "pass" ? "none" : "auto" } as CSSProperties;
    }, [backdrop]);

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

    return (
        <LocalDialog popover={"manual"} ref={combinedDialogRef} className={className}>
            <div data-part={"backdrop"} />
            <div data-part={"bounds"} ref={boundsRef} />
            <div
                data-part={"capture"}
                onClick={isOpen && backdrop === "click" ? doCancel : undefined}
                onMouseMove={isOpen && backdrop === "hover" && ((safeZone && safeZonePath) || !safeZone) ? doCancel : undefined}
                onAuxClick={isOpen && backdrop === "click" ? doCancel : undefined}
                style={captureStyles}
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
        </LocalDialog>
    );
};

type Rect = { top: number; left: number; right: number; bottom: number };
type Point = { x: number; y: number };

// Convex hull using Graham scan - takes arbitrary points
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
