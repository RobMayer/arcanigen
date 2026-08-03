import { createElement, CSSProperties, ReactNode, useId, useMemo } from "react";
import { Shape, Paint, Stroke, Markers, MarkerDef, PathShape, LineShape, RectShape, TextShape, GroupShape, OffsetPathShape, SymbolShape, MaskedShape, ClippedShape, FilteredShape } from "./shapeTypes";
// SymbolShape no longer carries paint/vectorEffect — content Shape handles its own rendering.

// ─── Paint → SVG attributes ─────────────────────────────────────────────────

const strokeAttrs = (s: Stroke): Record<string, string> => {
    const attrs: Record<string, string> = {
        stroke: s.color,
        strokeWidth: `${s.width}`,
        strokeLinecap: s.cap,
        strokeLinejoin: s.join,
    };
    if (s.dash) {
        attrs.strokeDasharray = s.dash.array;
        attrs.strokeDashoffset = `${s.dash.offset}`;
    }
    return attrs;
};

const paintAttrs = (paint: Paint): Record<string, string | undefined> => {
    const attrs: Record<string, string | undefined> = {};
    if (paint.stroke) {
        Object.assign(attrs, strokeAttrs(paint.stroke));
    }
    attrs.fill = paint.fill === null ? "none" : (paint.fill ?? "none");
    if (paint.paintOrder) {
        attrs.paintOrder = paint.paintOrder;
    }
    if (paint.opacity !== undefined && paint.opacity < 1) {
        attrs.opacity = `${paint.opacity}`;
    }
    return attrs;
};

// ─── Marker rendering ────────────────────────────────────────────────────────

const MarkerDefElement = ({ def, id }: { def: MarkerDef; id: string }) => {
    return (
        <marker id={id} markerUnits="userSpaceOnUse" markerWidth="100%" markerHeight="100%" overflow="visible" orient={def.orient}>
            <ShapeElement shape={def.shape} />
        </marker>
    );
};

const MarkerDefs = ({ markers, id }: { markers: Markers; id: string }) => {
    const defs: ReactNode[] = [];
    const attrs: Record<string, string> = {};

    if (markers.start) {
        const mid = `${id}-ms`;
        defs.push(<MarkerDefElement key="ms" def={markers.start} id={mid} />);
        attrs.markerStart = `url(#${mid})`;
    }
    if (markers.mid) {
        const mid = `${id}-mm`;
        defs.push(<MarkerDefElement key="mm" def={markers.mid} id={mid} />);
        attrs.markerMid = `url(#${mid})`;
    }
    if (markers.end) {
        const mid = `${id}-me`;
        defs.push(<MarkerDefElement key="me" def={markers.end} id={mid} />);
        attrs.markerEnd = `url(#${mid})`;
    }

    return { defs, attrs };
};

// ─── Top-level shape dispatch ────────────────────────────────────────────────

export const ShapeElement = ({ shape }: { shape: Shape }): ReactNode => {
    switch (shape.type) {
        case "path":
            return <PathElement shape={shape} />;
        case "line":
            return <LineElement shape={shape} />;
        case "rect":
            return <RectElement shape={shape} />;
        case "text":
            return <TextElement shape={shape} key={shape.textPath?.d} />;
        case "group":
            return <GroupElement shape={shape} />;
        case "offsetPath":
            return <OffsetPathElement shape={shape} />;
        case "symbol":
            return <SymbolElement shape={shape} />;
        case "masked":
            return <MaskedElement shape={shape} />;
        case "clipped":
            return <ClippedElement shape={shape} />;
        case "filtered":
            return <FilteredElement shape={shape} />;
    }
};

// ─── Path ────────────────────────────────────────────────────────────────────

const PathElement = ({ shape }: { shape: PathShape }) => {
    const id = useId();

    let defsNode: ReactNode = null;
    let markerAttrs: Record<string, string> = {};

    if (shape.markers) {
        const m = MarkerDefs({ markers: shape.markers, id });
        defsNode = <defs>{m.defs}</defs>;
        markerAttrs = m.attrs;
    }

    const pa = paintAttrs(shape.paint);
    const el = (
        <path
            d={shape.d}
            fill={pa.fill}
            stroke={pa.stroke}
            strokeWidth={pa.strokeWidth}
            strokeLinecap={pa.strokeLinecap as "butt" | "round" | "square" | undefined}
            strokeLinejoin={pa.strokeLinejoin as "miter" | "bevel" | "round" | undefined}
            strokeDasharray={pa.strokeDasharray}
            strokeDashoffset={pa.strokeDashoffset}
            paintOrder={pa.paintOrder}
            opacity={pa.opacity}
            vectorEffect={shape.vectorEffect}
            transform={shape.transform || undefined}
            {...markerAttrs}
        />
    );

    if (defsNode) {
        return (
            <g>
                {defsNode}
                {el}
            </g>
        );
    }
    return el;
};

// ─── Line ────────────────────────────────────────────────────────────────────

const LineElement = ({ shape }: { shape: LineShape }) => {
    const id = useId();

    let defsNode: ReactNode = null;
    let markerAttrs: Record<string, string> = {};

    if (shape.markers) {
        const m = MarkerDefs({ markers: shape.markers, id });
        defsNode = <defs>{m.defs}</defs>;
        markerAttrs = m.attrs;
    }

    const el = <line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} {...paintAttrs(shape.paint)} {...markerAttrs} transform={shape.transform || undefined} />;

    if (defsNode) {
        return (
            <g>
                {defsNode}
                {el}
            </g>
        );
    }
    return el;
};

// ─── Rect ────────────────────────────────────────────────────────────────────

const RectElement = ({ shape }: { shape: RectShape }) => {
    return <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} ry={shape.ry} {...paintAttrs(shape.paint)} transform={shape.transform || undefined} />;
};

// ─── Text ────────────────────────────────────────────────────────────────────

const TextElement = ({ shape }: { shape: TextShape }) => {
    const id = useId();

    const attrs: Record<string, string | number | undefined> = {
        fontFamily: shape.fontFamily,
        fontSize: shape.fontSize,
        letterSpacing: shape.letterSpacing,
        textAnchor: shape.textAnchor,
        dominantBaseline: shape.dominantBaseline,
        rotate: shape.rotate !== undefined ? `${shape.rotate}` : undefined,
    };

    // The `font-family` presentation attribute is unreliable across renderers/exports;
    // supplement it with an inline style, which takes precedence and is honored everywhere.
    const style: CSSProperties | undefined = shape.fontFamily ? { fontFamily: shape.fontFamily } : undefined;

    if (shape.textPath) {
        const pathId = `${id}-tp`;
        return (
            <text {...attrs} {...paintAttrs(shape.paint)} style={style} transform={shape.transform || undefined}>
                <defs>
                    <path id={pathId} d={shape.textPath.d} />
                </defs>
                <textPath href={`#${pathId}`} startOffset={shape.textPath.startOffset}>
                    {shape.text}
                </textPath>
            </text>
        );
    }

    // SVG <text> ignores "\n" — whitespace never starts a new line — so split explicit
    // breaks into <tspan>s positioned with x (reset to the anchor) + dy (line advance).
    const lines = shape.text.split("\n");
    const lineHeight = shape.lineHeight ?? shape.fontSize * 1.2;
    // Shift the whole block so the vertical anchor (dominant-baseline) applies to the
    // block as a whole rather than only to the first line.
    const firstDy = shape.dominantBaseline === "central" ? (-(lines.length - 1) / 2) * lineHeight : shape.dominantBaseline === "auto" ? -(lines.length - 1) * lineHeight : 0;

    return (
        <text {...attrs} {...paintAttrs(shape.paint)} style={style} transform={shape.transform || undefined}>
            {lines.map((line, i) => (
                <tspan key={i} x={0} dy={i === 0 ? firstDy : lineHeight}>
                    {line}
                </tspan>
            ))}
        </text>
    );
};

// ─── Group ───────────────────────────────────────────────────────────────────

const GroupElement = ({ shape }: { shape: GroupShape }) => {
    const style: Record<string, string> = {};
    if (shape.blendMode && shape.blendMode !== "normal") {
        style.mixBlendMode = shape.blendMode;
    }
    if (shape.isolation) {
        style.isolation = "isolate";
    }

    return (
        <g style={Object.keys(style).length > 0 ? style : undefined} transform={shape.transform || undefined}>
            {shape.children.map((child, i) => (child ? <ShapeElement key={i} shape={child} /> : null))}
        </g>
    );
};

// ─── Offset Path ─────────────────────────────────────────────────────────────

const resolveOffsetPath = (def: OffsetPathShape["path"]): string => {
    const tempPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    tempPath.setAttribute("d", def.d);
    const totalLength = tempPath.getTotalLength();

    let dist = (def.distance.percent / 100) * totalLength + def.distance.px;
    if (def.overflow === "wrap") {
        dist = ((dist % totalLength) + totalLength) % totalLength;
    } else {
        dist = Math.max(0, Math.min(totalLength, dist));
    }

    const pt = tempPath.getPointAtLength(dist);

    let angle = def.rotate.degrees;
    if (def.rotate.auto) {
        const epsilon = Math.min(0.1, totalLength * 0.001);
        const pt2 = tempPath.getPointAtLength(Math.min(dist + epsilon, totalLength));
        angle += Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * (180 / Math.PI);
    }

    return `translate(${pt.x}, ${pt.y}) rotate(${angle})`;
};

const OffsetPathElement = ({ shape }: { shape: OffsetPathShape }) => {
    const childTransform = useMemo(() => resolveOffsetPath(shape.path), [shape.path]);

    return (
        <g transform={shape.transform || undefined}>
            <g transform={childTransform}>
                <ShapeElement shape={shape.shape} />
            </g>
        </g>
    );
};

// ─── Symbol ──────────────────────────────────────────────────────────────────

const SymbolElement = ({ shape }: { shape: SymbolShape }) => {
    const id = useId();
    const symbolId = `${id}-sym`;

    return (
        <g transform={shape.transform || undefined}>
            <defs>
                <symbol id={symbolId} viewBox={shape.symbol.viewBox}>
                    <ShapeElement shape={shape.symbol.content} />
                </symbol>
            </defs>
            <use href={`#${symbolId}`} x={shape.symbol.x} y={shape.symbol.y} width={shape.symbol.width} height={shape.symbol.height} />
        </g>
    );
};

// ─── Masked ─────────────────────────────────────────────────────────────────

const MaskedElement = ({ shape }: { shape: MaskedShape }) => {
    const id = useId();
    const maskId = `${id}-mask`;
    return (
        <g transform={shape.transform || undefined}>
            <defs>
                <mask id={maskId} maskContentUnits="userSpaceOnUse" style={{ maskType: shape.mask.mode }}>
                    <ShapeElement shape={shape.mask.shape} />
                </mask>
            </defs>
            <g mask={`url(#${maskId})`}>
                <ShapeElement shape={shape.content} />
            </g>
        </g>
    );
};

// ─── Clipped ──────────────────────────────────────────────────────────────────

const ClippedElement = ({ shape }: { shape: ClippedShape }) => {
    const id = useId();
    const clipId = `${id}-clip`;

    return (
        <g transform={shape.transform || undefined}>
            <defs>
                <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
                    <path d={shape.clipPath} />
                </clipPath>
            </defs>
            <g clipPath={`url(#${clipId})`}>
                <ShapeElement shape={shape.content} />
            </g>
        </g>
    );
};

// ─── Filtered ─────────────────────────────────────────────────────────────────

const FilteredElement = ({ shape }: { shape: FilteredShape }) => {
    const id = useId();
    const filterId = `${id}-filter`;

    return (
        <g transform={shape.transform || undefined}>
            <defs>
                <filter id={filterId} filterUnits="userSpaceOnUse" x="-100%" y="-100%" width="200%" height="200%">
                    {shape.filter.map((prim, i) => createElement(prim.tag, { key: i, ...prim.attrs }))}
                </filter>
            </defs>
            <g filter={`url(#${filterId})`}>
                <ShapeElement shape={shape.content} />
            </g>
        </g>
    );
};
