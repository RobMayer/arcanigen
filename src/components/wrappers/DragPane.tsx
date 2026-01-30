import { CSSProperties, DetailedHTMLProps, HTMLAttributes, MouseEvent, RefObject, SetStateAction, useCallback, useEffect, useMemo, useRef, useState, WheelEvent } from "react";
import styled from "styled-components";
import { useCombinedRef } from "../../util/hooks/useCombinedRef";
import { useStable } from "../../util/hooks/useStable";
import { createController } from "../../util/hooks/useController";

type XY = { x: number; y: number };
type XYZ = { x: number; y: number; z: number };
type XYoZ = { x: number; y: number; z?: number };

export type DragPaneControls = {
    set: (value: SetStateAction<XYZ>) => void;
    panTo: (value: SetStateAction<XY>) => void;
    panBy: (value: Partial<XY>) => void; // relative pan; zoom compensation should happen internally; if all thre are zero, or not provided, no-op.
    panOn: (event: MouseEvent | MouseEvent<unknown>) => void; // just to make it easier to bind a pan to a mouse-move event externally.
    panFor: (element: HTMLElement) => void;
    center: () => void; // pan to center of bounds (if bounds is not provided, no-op)
    extents: () => void; // pan to center of bounds and zoom to contain (as best as possible) (if bounds is not provided, no-op)
    zoomTo: (z: SetStateAction<number>) => void;
    zoomBy: (z: number) => void;
    zoomOn: (event: WheelEvent | WheelEvent<unknown>) => void; // just to make it easier to bind a zoom to a wheel event externally.
    zoomOnFocal: (event: WheelEvent | WheelEvent<unknown>) => void; // just to make it easier to bind a zoom to a wheel event externally.
    zoomFor: (element: HTMLElement) => void;
    encompass: (element: HTMLElement) => void;
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
} & DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

const DEFAULT_XYZ: XYZ = { x: 0, y: 0, z: 1 };

// content-space helper
const toContentSpace = (el: HTMLElement, offset: HTMLElement | null) => {
    if (!offset) return null;
    const or = offset.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    const zoom = offset.currentCSSZoom;
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

        // control methods
        const methods = useMemo<DragPaneControls>(
            () => ({
                set: (value) => {
                    const cur = member.ref.current;
                    const resolved = resolveSetter(value, cur);
                    const next = clampXYZ(resolved, constraints.current);
                    setPosition(next);
                    onPanRef.current?.(next);
                    onZoomRef.current?.(next.z);
                    onValueRef.current?.(next);
                    onFinishRef.current?.(next);
                    checkBreaches();
                },
                panTo: (value) => {
                    const cur = member.ref.current;
                    const resolved = resolveSetter(value, { x: cur.x, y: cur.y });
                    const next = clampXYZ({ x: resolved.x, y: resolved.y, z: cur.z }, constraints.current);
                    setPosition(next);
                    onPanRef.current?.(next);
                    onValueRef.current?.(next);
                    onFinishRef.current?.(next);
                    checkBreaches();
                },
                panBy: (value) => {
                    const dx = value.x ?? 0;
                    const dy = value.y ?? 0;
                    if (dx === 0 && dy === 0) return;
                    const zoom = offsetRef.current?.currentCSSZoom ?? 1;
                    setPosition(({ x, y, z }) => {
                        const next = clampXYZ({ x: x + dx / zoom, y: y + dy / zoom, z }, constraints.current);
                        onPanRef.current?.(next);
                        onValueRef.current?.(next);
                        onFinishRef.current?.(next);
                        return next;
                    });
                    checkBreaches();
                },
                panOn: (evt) => {
                    const zoom = offsetRef.current?.currentCSSZoom ?? 1;
                    const dX = evt.movementX / zoom;
                    const dY = evt.movementY / zoom;
                    setPosition(({ x, y, z }) => {
                        const next = clampXYZ({ x: x + dX, y: y + dY, z }, constraints.current);
                        onPanRef.current?.(next);
                        onValueRef.current?.(next);
                        return next;
                    });
                    checkBreaches();
                },
                panFor: (element) => {
                    const cs = toContentSpace(element, offsetRef.current);
                    if (!cs) return;
                    const next = clampXYZ({ x: -cs.cx, y: -cs.cy, z: member.ref.current.z }, constraints.current);
                    setPosition(next);
                    onPanRef.current?.(next);
                    onValueRef.current?.(next);
                    onFinishRef.current?.(next);
                    checkBreaches();
                },
                center: () => {
                    const bounds = boundsRefStable.current?.current;
                    if (!bounds) return;
                    const cs = toContentSpace(bounds, offsetRef.current);
                    if (!cs) return;
                    const next = clampXYZ({ x: -cs.cx, y: -cs.cy, z: member.ref.current.z }, constraints.current);
                    setPosition(next);
                    onPanRef.current?.(next);
                    onValueRef.current?.(next);
                    onFinishRef.current?.(next);
                    checkBreaches();
                },
                extents: () => {
                    const bounds = boundsRefStable.current?.current;
                    const viewport = viewportRef.current;
                    if (!bounds || !viewport) return;
                    const cs = toContentSpace(bounds, offsetRef.current);
                    if (!cs) return;
                    const vr = viewport.getBoundingClientRect();
                    const z = Math.min(vr.width / cs.w, vr.height / cs.h);
                    const next = clampXYZ({ x: -cs.cx, y: -cs.cy, z }, constraints.current);
                    setPosition(next);
                    onPanRef.current?.(next);
                    onZoomRef.current?.(next.z);
                    onValueRef.current?.(next);
                    onFinishRef.current?.(next);
                    checkBreaches();
                },
                zoomTo: (value) => {
                    const cur = member.ref.current;
                    const z = resolveSetter(value, cur.z);
                    const next = clampXYZ({ ...cur, z }, constraints.current);
                    setPosition(next);
                    onZoomRef.current?.(next.z);
                    onValueRef.current?.(next);
                    onFinishRef.current?.(next);
                    checkBreaches();
                },
                zoomBy: (factor) => {
                    setPosition(({ x, y, z }) => {
                        const next = clampXYZ({ x, y, z: z * factor }, constraints.current);
                        onZoomRef.current?.(next.z);
                        onValueRef.current?.(next);
                        onFinishRef.current?.(next);
                        return next;
                    });
                    checkBreaches();
                },
                zoomOn: (evt) => {
                    const factor = evt.deltaY > 0 ? 1 / 1.1 : 1.1;
                    setPosition(({ x, y, z }) => {
                        const next = clampXYZ({ x, y, z: z * factor }, constraints.current);
                        onZoomRef.current?.(next.z);
                        onValueRef.current?.(next);
                        return next;
                    });
                    checkBreaches();
                },
                zoomOnFocal: (evt) => {
                    const element = viewportRef.current;
                    if (!element) return;
                    const rect = element.getBoundingClientRect();
                    const cx = evt.clientX - (rect.left + rect.width / 2);
                    const cy = evt.clientY - (rect.top + rect.height / 2);
                    setPosition(({ x, y, z }) => {
                        const factor = evt.deltaY > 0 ? 1 / 1.1 : 1.1;
                        const nz = Math.min(constraints.current.maxZ, Math.max(constraints.current.minZ, z * factor));
                        const nx = cx / nz - (cx / z - x);
                        const ny = cy / nz - (cy / z - y);
                        const next = clampXYZ({ x: nx, y: ny, z: nz }, constraints.current);
                        onPanRef.current?.(next);
                        onZoomRef.current?.(next.z);
                        onValueRef.current?.(next);
                        return next;
                    });
                    checkBreaches();
                },
                zoomFor: (element) => {
                    const viewport = viewportRef.current;
                    if (!viewport) return;
                    const cs = toContentSpace(element, offsetRef.current);
                    if (!cs) return;
                    const vr = viewport.getBoundingClientRect();
                    const z = Math.min(vr.width / cs.w, vr.height / cs.h);
                    const next = clampXYZ({ ...member.ref.current, z }, constraints.current);
                    setPosition(next);
                    onZoomRef.current?.(next.z);
                    onValueRef.current?.(next);
                    onFinishRef.current?.(next);
                    checkBreaches();
                },
                encompass: (element) => {
                    const viewport = viewportRef.current;
                    if (!viewport) return;
                    const cs = toContentSpace(element, offsetRef.current);
                    if (!cs) return;
                    const vr = viewport.getBoundingClientRect();
                    const z = Math.min(vr.width / cs.w, vr.height / cs.h);
                    const next = clampXYZ({ x: -cs.cx, y: -cs.cy, z }, constraints.current);
                    setPosition(next);
                    onPanRef.current?.(next);
                    onZoomRef.current?.(next.z);
                    onValueRef.current?.(next);
                    onFinishRef.current?.(next);
                    checkBreaches();
                },
            }),
            [setPosition, member, checkBreaches],
        );

        // wheel zoom
        useEffect(() => {
            const element = viewportRef.current;
            if (!element) return;

            const wheel = (evt: globalThis.WheelEvent) => {
                evt.preventDefault();
                methods.zoomOnFocal(evt as unknown as WheelEvent);
            };

            element.addEventListener("wheel", wheel, { passive: false });
            return () => {
                element.removeEventListener("wheel", wheel);
            };
        }, [methods, viewportRef]);

        // middle-click pan
        useEffect(() => {
            const element = viewportRef.current;
            if (!element) return;

            const mouseMove = (evt: globalThis.MouseEvent) => {
                methods.panOn(evt as unknown as MouseEvent);
            };

            const mouseUp = () => {
                document.removeEventListener("mousemove", mouseMove);
                document.removeEventListener("mouseup", mouseUp);
                onFinishRef.current?.(member.ref.current);
            };

            const mouseDown = (evt: globalThis.MouseEvent) => {
                if (evt.button === 1) {
                    evt.preventDefault();
                    document.addEventListener("mousemove", mouseMove);
                    document.addEventListener("mouseup", mouseUp);
                }
            };

            element.addEventListener("mousedown", mouseDown);
            return () => {
                element.removeEventListener("mousedown", mouseDown);
                document.removeEventListener("mousemove", mouseMove);
                document.removeEventListener("mouseup", mouseUp);
            };
        }, [methods, viewportRef]);

        const offsetStyle = useMemo<CSSProperties>(
            () => ({
                top: y,
                left: x,
                zoom: z,
            }),
            [x, y, z],
        );

        const dataState = useMemo(() => {
            const tokens: string[] = [];
            if (breach.top) tokens.push("breach-top");
            if (breach.bottom) tokens.push("breach-bottom");
            if (breach.left) tokens.push("breach-left");
            if (breach.right) tokens.push("breach-right");
            return tokens.join(" ");
        }, [breach]);

        return (
            <div className={className} ref={makeViewportRef} style={style} {...rest} data-state={dataState}>
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
    overflow: hidden;
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
