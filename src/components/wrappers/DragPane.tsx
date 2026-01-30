import { DetailedHTMLProps, HTMLAttributes, RefObject, useMemo, useRef } from "react";
import styled from "styled-components";
import { useCombinedRef } from "../../util/hooks/useCombinedRef";

type XYZ = { x: number; y: number; z: number };
type XYoZ = { x: number; y: number; z?: number };

type DragPaneControls = {
    panTo: (x: number, y: number, zoom?: number) => void;
    panFor: (element: HTMLElement) => void;
    center: () => void;
    extents: () => void;
    zoomTo: (z: number) => void;
    zoomPan: (element: HTMLElement) => void;
};

type DragPaneProps = {
    boundsRef?: RefObject<HTMLElement>;
    onPan?: (coordinates: XYZ) => void;
    onZoom?: (coordinates: XYZ) => void;
    onFinish?: (coordinates: XYZ) => void;
    minZoom?: number;
    maxZoom?: number;
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
    value?: XYoZ;
} & DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

const DragPane = styled(({ boundsRef, className, children, ref, style }: DragPaneProps) => {
    const [viewportRef, makeViewportRef] = useCombinedRef(ref);
    const offsetRef = useRef<HTMLDivElement>(null);

    const mergedStyles = useMemo(() => {
        return style;
    }, [style]);

    return (
        <div className={className} ref={makeViewportRef} style={mergedStyles}>
            {children}
        </div>
    );
})``;
