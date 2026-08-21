import { CSSProperties, DetailedHTMLProps, HTMLAttributes, PointerEvent, RefObject, SetStateAction, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, WheelEvent } from "react";
import styled from "styled-components";
import { useCombinedRef } from "../../util/hooks/useCombinedRef";
import { useStable } from "../../util/hooks/useStable";
import { createController } from "../../util/hooks/useController";
import { useResizeObserver } from "../../util/hooks/useResizeObserver";

type XY = { x: number; y: number };
type XYZ = { x: number; y: number; z: number };
type XYoZ = { x: number; y: number; z?: number };

export type DragPaneControls = {
    set: (value: SetStateAction<XYZ>) => void;
    panTo: (value: SetStateAction<XY>) => void;
    panBy: (value: Partial<XY>) => void; // relative pan; zoom compensation should happen internally; if all thre are zero, or not provided, no-op.
    panOn: ((event: PointerEvent | PointerEvent<unknown>) => void) & { committed: (event: PointerEvent | PointerEvent<unknown>) => void; commit: () => void };
    panFor: (element: HTMLElement) => void;
    center: () => void; // pan to center of bounds (if bounds is not provided, no-op)
    extents: () => void; // pan to center of bounds and zoom to contain (as best as possible) (if bounds is not provided, no-op)
    zoomTo: (z: SetStateAction<number>) => void;
    zoomBy: (z: number) => void;
    zoomOn: (event: WheelEvent | WheelEvent<unknown>) => void; // just to make it easier to bind a zoom to a wheel event externally.
    zoomOnFocal: (event: WheelEvent | WheelEvent<unknown>) => void; // just to make it easier to bind a zoom to a wheel event externally.
    zoomFor: (element: HTMLElement) => void;
    encompass: (element: HTMLElement) => void;
    get: () => XYZ;
    paneRef: () => RefObject<HTMLElement | null>;
};

type DragPaneProps = {
    boundsRef?: RefObject<HTMLElement | null>;
    controls?: DragPaneControls;
    onPan?: (xy: XY) => void;
    onZoom?: (zoom: number) => void;
    onValue?: (xyz: XYZ) => void;
    onFinish?: (xyz: XYZ) => void;
    minZoom?: number;
    maxZoom?: number;
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
    value?: XYoZ;
    "data-state"?: string;
} & DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

const DEFAULT_XYZ: XYZ = { x: 0, y: 0, z: 1 };

const toContentSpace = (el: HTMLElement, offset: HTMLElement | null, zoom: number) => {
    if (!offset) return null;
    const or = offset.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    return {
        cx: (er.left + er.width / 2 - or.left) / zoom,
        cy: (er.top + er.height / 2 - or.top) / zoom,
        w: er.width / zoom,
        h: er.height / zoom,
    };
};

// resolve a SetStateAction against a current value
const resolveSetter = <T,>(action: SetStateAction<T>, current: T): T => (typeof action === "function" ? (action as (prev: T) => T)(current) : action);

const { useController, useControllerInternal: useDragPaneInternal, useControllerExternal: useDragPane, Controller } = createController<XYZ, DragPaneControls>();

export { useDragPane, useDragPaneInternal };

const clampXYZ = (pos: XYZ, c: { minX: number; minY: number; minZ: number; maxX: number; maxY: number; maxZ: number }): XYZ => {
    return {
        x: Math.min(c.maxX, Math.max(c.minX, pos.x)),
        y: Math.min(c.maxY, Math.max(c.minY, pos.y)),
        z: Math.min(c.maxZ, Math.max(c.minZ, pos.z)),
    };
};

const DragPaneBase = styled(
    ({
        boundsRef,
        controls,
        onPan,
        onZoom,
        onValue,
        onFinish,
        minZoom: minZ = 1, //one should opt-in to zoom
        maxZoom: maxZ = 1, //one should opt-in to zoom
        minX = -Infinity,
        maxX = Infinity,
        minY = -Infinity,
        maxY = Infinity,
        value,
        className,
        children,
        ref,
        style,
        "data-state": incomingDataState,
        ...rest
    }: DragPaneProps) => {
        const incoming = useMemo<XYZ>(
            () => ({
                x: value?.x ?? DEFAULT_XYZ.x,
                y: value?.y ?? DEFAULT_XYZ.y,
                z: value?.z ?? DEFAULT_XYZ.z,
            }),
            [value?.x, value?.y, value?.z],
        );

        const [position, setPosition, member] = useController(incoming);
        const { x, y, z } = position;

        const [viewportRef, makeViewportRef] = useCombinedRef(ref);
        const offsetRef = useRef<HTMLDivElement>(null);

        const onPanRef = useStable(onPan);
        const onZoomRef = useStable(onZoom);
        const onValueRef = useStable(onValue);
        const onFinishRef = useStable(onFinish);
        const boundsRefStable = useStable(boundsRef);

        const constraints = useStable({ minZ, maxZ, minX, maxX, minY, maxY });

        const [panning, setPanning] = useState(false);

        // breach detection
        const [breach, setBreach] = useState({ top: false, bottom: false, left: false, right: false });
        const breachRef = useRef(breach);

        const checkBreaches = useCallback(() => {
            const boundsEl = boundsRefStable.current?.current;
            const viewportEl = viewportRef.current;
            if (!boundsEl || !viewportEl) return;
            const b = boundsEl.getBoundingClientRect();
            const v = viewportEl.getBoundingClientRect();
            const top = b.bottom < v.top;
            const bottom = b.top > v.bottom;
            const left = b.right < v.left;
            const right = b.left > v.right;
            const prev = breachRef.current;
            if (prev.top !== top || prev.bottom !== bottom || prev.left !== left || prev.right !== right) {
                const next = { top, bottom, left, right };
                breachRef.current = next;
                setBreach(next);
            }
        }, []);

        const handleChange = useCallback(
            (xyz: XYZ, passive: boolean = false) => {
                const prev = member.ref.current;
                const next = clampXYZ(xyz, constraints.current);
                const xyChanged = next.x !== prev.x || next.y !== prev.y;
                const zChanged = next.z !== prev.z;
                if (!xyChanged && !zChanged) {
                    return;
                }
                if (passive) {
                    // Direct DOM update — bypass React reconciliation
                    member.ref.current = next;
                    const el = offsetRef.current;
                    if (el) {
                        el.style.top = `${next.y * next.z}px`;
                        el.style.left = `${next.x * next.z}px`;
                        el.style.transform = `scale(${next.z})`;
                        el.style.setProperty("--dragpane_zoom", `${next.z}`);
                    }
                    const vp = viewportRef.current;
                    if (vp) {
                        vp.style.setProperty("--x", `${next.x}px`);
                        vp.style.setProperty("--y", `${next.y}px`);
                        vp.style.setProperty("--z", `${next.z}`);
                    }
                } else {
                    setPosition(next);
                }
                const { z, ...xy } = next;
                if (xyChanged) {
                    onPanRef.current?.(xy);
                }
                if (zChanged) {
                    onZoomRef.current?.(z);
                }
                onValueRef.current?.(next);
                if (!passive) onFinishRef.current?.(next);
                checkBreaches();
            },
            [setPosition, member, checkBreaches],
        );

        const methods = useMemo<DragPaneControls>(() => {
            const panOnBase = (evt: PointerEvent | PointerEvent<unknown>, passive: boolean) => {
                const { x, y, z } = member.ref.current;
                handleChange({ x: x + evt.movementX / z, y: y + evt.movementY / z, z }, passive);
            };
            const panOn = Object.assign((evt: PointerEvent | PointerEvent<unknown>) => panOnBase(evt, true), {
                committed: (evt: PointerEvent | PointerEvent<unknown>) => panOnBase(evt, false),
                commit: () => {
                    setPosition(member.ref.current); // reconcile React state with DOM
                    onFinishRef.current?.(member.ref.current);
                },
            });

            return {
                set: (value) => {
                    handleChange(resolveSetter(value, member.ref.current));
                },
                get: () => {
                    return member.ref.current;
                },
                panTo: (value) => {
                    const cur = member.ref.current;
                    const resolved = resolveSetter(value, { x: cur.x, y: cur.y });
                    handleChange({ x: resolved.x, y: resolved.y, z: cur.z });
                },
                panBy: (value) => {
                    const dx = value.x ?? 0;
                    const dy = value.y ?? 0;
                    if (dx === 0 && dy === 0) return;
                    const { x, y, z } = member.ref.current;
                    handleChange({ x: x + dx / z, y: y + dy / z, z });
                },
                panOn,
                panFor: (element) => {
                    const cs = toContentSpace(element, offsetRef.current, member.ref.current.z);
                    if (!cs) return;
                    handleChange({ x: -cs.cx, y: -cs.cy, z: member.ref.current.z });
                },
                center: () => {
                    const bounds = boundsRefStable.current?.current;
                    if (!bounds) return;
                    const cs = toContentSpace(bounds, offsetRef.current, member.ref.current.z);
                    if (!cs) return;
                    handleChange({ x: -cs.cx, y: -cs.cy, z: member.ref.current.z });
                },
                extents: () => {
                    const bounds = boundsRefStable.current?.current;
                    const viewport = viewportRef.current;
                    if (!bounds || !viewport) return;
                    const cs = toContentSpace(bounds, offsetRef.current, member.ref.current.z);
                    if (!cs) return;
                    const vr = viewport.getBoundingClientRect();
                    handleChange({ x: -cs.cx, y: -cs.cy, z: Math.min(vr.width / cs.w, vr.height / cs.h) });
                },
                zoomTo: (value) => {
                    const cur = member.ref.current;
                    handleChange({ ...cur, z: resolveSetter(value, cur.z) });
                },
                zoomBy: (factor) => {
                    const { x, y, z } = member.ref.current;
                    handleChange({ x, y, z: z * factor });
                },
                zoomOn: (evt) => {
                    const factor = evt.deltaY > 0 ? 1 / 1.1 : 1.1;
                    const { x, y, z } = member.ref.current;
                    handleChange({ x, y, z: z * factor }, true);
                },
                zoomOnFocal: (evt) => {
                    const element = viewportRef.current;
                    if (!element) return;
                    const rect = element.getBoundingClientRect();
                    const cx = evt.clientX - (rect.left + rect.width / 2);
                    const cy = evt.clientY - (rect.top + rect.height / 2);
                    const { x, y, z } = member.ref.current;
                    const factor = evt.deltaY > 0 ? 1 / 1.1 : 1.1;
                    const nz = Math.min(constraints.current.maxZ, Math.max(constraints.current.minZ, z * factor));
                    handleChange({ x: cx / nz - (cx / z - x), y: cy / nz - (cy / z - y), z: nz }, true);
                },
                zoomFor: (element) => {
                    const viewport = viewportRef.current;
                    if (!viewport) return;
                    const cs = toContentSpace(element, offsetRef.current, member.ref.current.z);
                    if (!cs) return;
                    const vr = viewport.getBoundingClientRect();
                    handleChange({ ...member.ref.current, z: Math.min(vr.width / cs.w, vr.height / cs.h) });
                },
                encompass: (element) => {
                    const viewport = viewportRef.current;
                    if (!viewport) return;
                    const cs = toContentSpace(element, offsetRef.current, member.ref.current.z);
                    if (!cs) return;
                    const vr = viewport.getBoundingClientRect();
                    handleChange({ x: -cs.cx, y: -cs.cy, z: Math.min(vr.width / cs.w, vr.height / cs.h) });
                },
                paneRef: () => viewportRef,
            };
        }, [member, handleChange]);

        // focus-scroll: pan to bring focused elements into view (overflow: clip prevents native scrolling)
        useEffect(() => {
            const element = viewportRef.current;
            if (!element) return;

            const PADDING = 16;

            const handleFocusIn = (evt: FocusEvent) => {
                const target = evt.target;
                if (!(target instanceof HTMLElement)) return;

                if (target.tabIndex === -1) {
                    return;
                }

                const vr = element.getBoundingClientRect();
                const er = target.getBoundingClientRect();

                let dx = 0;
                let dy = 0;

                if (er.left < vr.left + PADDING) dx = vr.left + PADDING - er.left;
                else if (er.right > vr.right - PADDING) dx = vr.right - PADDING - er.right;

                if (er.top < vr.top + PADDING) dy = vr.top + PADDING - er.top;
                else if (er.bottom > vr.bottom - PADDING) dy = vr.bottom - PADDING - er.bottom;

                if (dx !== 0 || dy !== 0) {
                    methods.panBy({ x: dx, y: dy });
                }
            };

            element.addEventListener("focusin", handleFocusIn);
            return () => {
                element.removeEventListener("focusin", handleFocusIn);
            };
        }, [methods, viewportRef]);

        useResizeObserver(viewportRef, checkBreaches);
        useResizeObserver(boundsRef, checkBreaches);

        // Non-passive changes (toolbar buttons, external set) update position via React state, so the
        // DOM transform isn't live until commit. Re-measure breaches after commit. Passive drags bypass
        // React state (they mutate the DOM directly and check inline), so this won't double-fire on them.
        useLayoutEffect(() => {
            checkBreaches();
        }, [x, y, z, checkBreaches]);

        // wheel zoom
        useEffect(() => {
            const element = viewportRef.current;
            if (!element) return;

            let commitTimer: ReturnType<typeof setTimeout>;

            const hasScrollableAncestor = (target: EventTarget | null): boolean => {
                let el = target instanceof Element ? target : null;
                while (el && el !== element) {
                    if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
                        const style = getComputedStyle(el);
                        if (style.overflowY === "auto" || style.overflowY === "scroll" || style.overflowX === "auto" || style.overflowX === "scroll") {
                            return true;
                        }
                    }
                    el = el.parentElement;
                }
                return false;
            };

            const wheel = (evt: globalThis.WheelEvent) => {
                if (evt.handled || hasScrollableAncestor(evt.target)) return;
                evt.preventDefault();
                methods.zoomOnFocal(evt as unknown as WheelEvent);
                clearTimeout(commitTimer);
                commitTimer = setTimeout(() => {
                    setPosition(member.ref.current); // reconcile React state after wheel settles
                    onFinishRef.current?.(member.ref.current);
                }, 150);
            };

            element.addEventListener("wheel", wheel, { passive: false });
            return () => {
                element.removeEventListener("wheel", wheel);
                clearTimeout(commitTimer);
            };
        }, [methods, viewportRef, setPosition, member]);

        // middle-click pan
        useEffect(() => {
            const element = viewportRef.current;
            if (!element) return;

            const pointerMove = (evt: globalThis.PointerEvent) => {
                methods.panOn(evt as unknown as PointerEvent);
            };

            const pointerUp = (evt: globalThis.PointerEvent) => {
                element.removeEventListener("pointermove", pointerMove);
                element.removeEventListener("pointerup", pointerUp);
                element.releasePointerCapture(evt.pointerId);
                methods.panOn.commit();
                setPanning(false);
            };

            const pointerDown = (evt: globalThis.PointerEvent) => {
                if (evt.button === 1 && !evt.handled) {
                    evt.handled = "active";
                    evt.preventDefault();
                    setPanning(true);
                    element.setPointerCapture(evt.pointerId);
                    element.addEventListener("pointermove", pointerMove);
                    element.addEventListener("pointerup", pointerUp);
                }
            };

            element.addEventListener("pointerdown", pointerDown);
            return () => {
                element.removeEventListener("pointerdown", pointerDown);
                element.removeEventListener("pointermove", pointerMove);
                element.removeEventListener("pointerup", pointerUp);
            };
        }, [methods, viewportRef]);

        // space + left-click pan (alternative for trackpad users)
        useEffect(() => {
            const element = viewportRef.current;
            if (!element) return;

            let spaceHeld = false;
            let dragInProgress = false;

            const isEditableTarget = (target: EventTarget | null): boolean => {
                if (!(target instanceof Element)) return false;
                const tag = target.tagName;
                if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
                if (target instanceof HTMLElement && target.isContentEditable) return true;
                return false;
            };

            const keyDown = (evt: KeyboardEvent) => {
                if (evt.code !== "Space" || evt.repeat) return;
                if (isEditableTarget(document.activeElement)) return;
                evt.preventDefault(); // suppress page-scroll on space
                spaceHeld = true;
                setPanning(true);
            };

            const keyUp = (evt: KeyboardEvent) => {
                if (evt.code !== "Space") return;
                spaceHeld = false;
                if (!dragInProgress) setPanning(false);
            };

            const windowBlur = () => {
                spaceHeld = false;
                if (!dragInProgress) setPanning(false);
            };

            const pointerMove = (evt: globalThis.PointerEvent) => {
                methods.panOn(evt as unknown as PointerEvent);
            };

            const pointerUp = (evt: globalThis.PointerEvent) => {
                element.removeEventListener("pointermove", pointerMove);
                element.removeEventListener("pointerup", pointerUp);
                element.releasePointerCapture(evt.pointerId);
                methods.panOn.commit();
                dragInProgress = false;
                if (!spaceHeld) setPanning(false);
            };

            const pointerDown = (evt: globalThis.PointerEvent) => {
                if (evt.handled) return;
                if (evt.button !== 0 || !spaceHeld) return;
                evt.handled = "active";
                evt.preventDefault();
                dragInProgress = true;
                element.setPointerCapture(evt.pointerId);
                element.addEventListener("pointermove", pointerMove);
                element.addEventListener("pointerup", pointerUp);
            };

            window.addEventListener("keydown", keyDown);
            window.addEventListener("keyup", keyUp);
            window.addEventListener("blur", windowBlur);
            element.addEventListener("pointerdown", pointerDown, true);

            return () => {
                window.removeEventListener("keydown", keyDown);
                window.removeEventListener("keyup", keyUp);
                window.removeEventListener("blur", windowBlur);
                element.removeEventListener("pointerdown", pointerDown, true);
                element.removeEventListener("pointermove", pointerMove);
                element.removeEventListener("pointerup", pointerUp);
            };
        }, [methods, viewportRef]);

        const offsetStyle = useMemo<CSSProperties>(
            () => ({
                top: y * z,
                left: x * z,
                transform: `scale(${z})`,
                transformOrigin: "0 0",
                "--dragpane_zoom": z,
            }),
            [x, y, z],
        );

        const outerStyle = useMemo(
            () =>
                ({
                    ...style,
                    "--x": `${x}px`,
                    "--y": `${y}px`,
                    "--z": `${z}`,
                }) as CSSProperties,
            [style, x, y, z],
        );

        const dataState = useMemo(() => {
            const tokens: string[] = incomingDataState ? [incomingDataState] : [];
            if (panning) tokens.push("panning");
            if (breach.top) tokens.push("breach_top");
            if (breach.bottom) tokens.push("breach_bottom");
            if (breach.left) tokens.push("breach_left");
            if (breach.right) tokens.push("breach_right");
            return tokens.length ? tokens.join(" ") : undefined;
        }, [panning, breach, incomingDataState]);

        return (
            <div className={className} ref={makeViewportRef} {...rest} data-state={dataState} style={outerStyle}>
                <Controller state={member} controls={controls} methods={methods}>
                    <DragPaneOrigin>
                        <DragPaneOffset style={offsetStyle} ref={offsetRef}>
                            {children}
                        </DragPaneOffset>
                    </DragPaneOrigin>
                </Controller>
            </div>
        );
    },
)`
    position: absolute;
    inset: 0;
    display: grid;
    overflow: clip;
`;

const DragPaneOrigin = styled.div`
    width: 0;
    height: 0;
    place-self: center;
    position: absolute;
    overflow: visible;
    isolation: isolate;
    display: grid;
`;

const DragPaneOffset = styled.div`
    position: relative;
`;

export const DragPane = DragPaneBase;
