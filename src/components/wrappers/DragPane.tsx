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
    panOn: ((event: MouseEvent | MouseEvent<unknown>) => void) & { committed: (event: MouseEvent | MouseEvent<unknown>) => void; commit: () => void };
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
    "data-state"?: string;
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
                setPosition(next);
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

        // control methods
        const methods = useMemo<DragPaneControls>(() => {
            const panOnBase = (evt: MouseEvent | MouseEvent<unknown>, passive: boolean) => {
                const zoom = offsetRef.current?.currentCSSZoom ?? 1;
                const { x, y, z } = member.ref.current;
                handleChange({ x: x + evt.movementX / zoom, y: y + evt.movementY / zoom, z }, passive);
            };
            const panOn = Object.assign((evt: MouseEvent | MouseEvent<unknown>) => panOnBase(evt, true), {
                committed: (evt: MouseEvent | MouseEvent<unknown>) => panOnBase(evt, false),
                commit: () => onFinishRef.current?.(member.ref.current),
            });

            return {
                set: (value) => {
                    handleChange(resolveSetter(value, member.ref.current));
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
                    const zoom = offsetRef.current?.currentCSSZoom ?? 1;
                    const { x, y, z } = member.ref.current;
                    handleChange({ x: x + dx / zoom, y: y + dy / zoom, z });
                },
                panOn,
                panFor: (element) => {
                    const cs = toContentSpace(element, offsetRef.current);
                    if (!cs) return;
                    handleChange({ x: -cs.cx, y: -cs.cy, z: member.ref.current.z });
                },
                center: () => {
                    const bounds = boundsRefStable.current?.current;
                    if (!bounds) return;
                    const cs = toContentSpace(bounds, offsetRef.current);
                    if (!cs) return;
                    handleChange({ x: -cs.cx, y: -cs.cy, z: member.ref.current.z });
                },
                extents: () => {
                    const bounds = boundsRefStable.current?.current;
                    const viewport = viewportRef.current;
                    if (!bounds || !viewport) return;
                    const cs = toContentSpace(bounds, offsetRef.current);
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
                    const cs = toContentSpace(element, offsetRef.current);
                    if (!cs) return;
                    const vr = viewport.getBoundingClientRect();
                    handleChange({ ...member.ref.current, z: Math.min(vr.width / cs.w, vr.height / cs.h) });
                },
                encompass: (element) => {
                    const viewport = viewportRef.current;
                    if (!viewport) return;
                    const cs = toContentSpace(element, offsetRef.current);
                    if (!cs) return;
                    const vr = viewport.getBoundingClientRect();
                    handleChange({ x: -cs.cx, y: -cs.cy, z: Math.min(vr.width / cs.w, vr.height / cs.h) });
                },
            };
        }, [member, handleChange]);

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
                methods.panOn.commit();
                setPanning(false);
            };

            const mouseDown = (evt: globalThis.MouseEvent) => {
                if (evt.button === 1) {
                    evt.handled = "active";
                    evt.preventDefault();
                    setPanning(true);
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
                "--dragpane_zoom": z,
            }),
            [x, y, z],
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
            <div className={className} ref={makeViewportRef} style={style} {...rest} data-state={dataState} data-x={x} data-y={y} data-z={z}>
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
