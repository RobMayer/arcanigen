import { createElement, CSSProperties, ReactNode, useId, useMemo } from "react";
import { PaperHelper } from "../util/paperHelper";
import {
    Shape,
    Paint,
    Stroke,
    GradientPaint,
    Fill,
    Markers,
    MarkerDef,
    PathShape,
    LineShape,
    RectShape,
    TextShape,
    GroupShape,
    OffsetPathShape,
    SymbolShape,
    MaskedShape,
    ClippedShape,
    FilteredShape,
} from "../definitions/shapeTypes";
// SymbolShape no longer carries paint/vectorEffect — content Shape handles its own rendering.

const isGradient = (v: Fill | undefined): v is GradientPaint => typeof v === "object" && v !== null;

// ─── Paint -> SVG attributes ─────────────────────────────────────────────────

const strokeAttrs = (s: Stroke): Record<string, string | undefined> => {
    const attrs: Record<string, string | undefined> = {
        // Gradient strokes are materialized by paintDefs into a url(#…) reference.
        stroke: isGradient(s.color) ? undefined : s.color,
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
    // Gradient fills are materialized by paintDefs into a url(#…) reference.
    attrs.fill = isGradient(paint.fill) ? undefined : paint.fill === null ? "none" : (paint.fill ?? "none");
    if (paint.paintOrder) {
        attrs.paintOrder = paint.paintOrder;
    }
    if (paint.opacity !== undefined && paint.opacity < 1) {
        attrs.opacity = `${paint.opacity}`;
    }
    return attrs;
};

// ─── Gradient rendering ──────────────────────────────────────────────────────
// Mirrors the marker pattern: emit a <linearGradient>/<radialGradient> def with a
// generated id and reference it via url(#id) on the host element's fill/stroke.

// Fit (objectBoundingBox): map an angle to the gradient vector's endpoints on the
// unit box. 0° = left->right; increasing angle rotates clockwise in screen space.
const gradientVector = (angleDeg: number): { x1: number; y1: number; x2: number; y2: number } => {
    const rad = (angleDeg * Math.PI) / 180;
    const dx = Math.cos(rad) / 2;
    const dy = Math.sin(rad) / 2;
    return { x1: 0.5 - dx, y1: 0.5 - dy, x2: 0.5 + dx, y2: 0.5 + dy };
};

const GradientDefElement = ({ def, id }: { def: GradientPaint; id: string }) => {
    const stops = def.stops.map((s, i) => <stop key={i} offset={s.position} stopColor={s.color} stopOpacity={s.opacity} />);

    if (def.variant === "radial") {
        if (def.units === "userSpaceOnUse" && def.radial) {
            const { cx, cy, r, fx, fy, fr } = def.radial;
            return (
                <radialGradient id={id} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={r} fx={fx} fy={fy} fr={fr} spreadMethod={def.spread}>
                    {stops}
                </radialGradient>
            );
        }
        return (
            <radialGradient id={id} gradientUnits="objectBoundingBox" cx={0.5} cy={0.5} r={0.5} spreadMethod={def.spread}>
                {stops}
            </radialGradient>
        );
    }

    if (def.units === "userSpaceOnUse" && def.linear) {
        const { x1, y1, x2, y2 } = def.linear;
        return (
            <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2} spreadMethod={def.spread}>
                {stops}
            </linearGradient>
        );
    }
    const v = gradientVector(def.angle);
    return (
        <linearGradient id={id} gradientUnits="objectBoundingBox" x1={v.x1} y1={v.y1} x2={v.x2} y2={v.y2} spreadMethod={def.spread}>
            {stops}
        </linearGradient>
    );
};

// Gather any gradient defs a paint needs (fill and/or stroke) plus the paint attrs,
// with fill/stroke rewritten to url(#…) references where a gradient is present.
const paintDefs = (paint: Paint, id: string): { defs: ReactNode[]; attrs: Record<string, string | undefined> } => {
    const attrs = paintAttrs(paint);
    const defs: ReactNode[] = [];
    if (isGradient(paint.fill)) {
        const gid = `${id}-fg`;
        defs.push(<GradientDefElement key="fg" def={paint.fill} id={gid} />);
        attrs.fill = `url(#${gid})`;
    }
    if (paint.stroke && isGradient(paint.stroke.color)) {
        const gid = `${id}-sg`;
        defs.push(<GradientDefElement key="sg" def={paint.stroke.color} id={gid} />);
        attrs.stroke = `url(#${gid})`;
    }
    return { defs, attrs };
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

    const pd = paintDefs(shape.paint, id);
    const defs: ReactNode[] = [...pd.defs];
    let markerAttrs: Record<string, string> = {};

    if (shape.markers) {
        const m = MarkerDefs({ markers: shape.markers, id });
        defs.push(...m.defs);
        markerAttrs = m.attrs;
    }

    const pa = pd.attrs;
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

    if (defs.length > 0) {
        return (
            <g>
                <defs>{defs}</defs>
                {el}
            </g>
        );
    }
    return el;
};

// ─── Line ────────────────────────────────────────────────────────────────────

const LineElement = ({ shape }: { shape: LineShape }) => {
    const id = useId();

    const pd = paintDefs(shape.paint, id);
    const defs: ReactNode[] = [...pd.defs];
    let markerAttrs: Record<string, string> = {};

    if (shape.markers) {
        const m = MarkerDefs({ markers: shape.markers, id });
        defs.push(...m.defs);
        markerAttrs = m.attrs;
    }

    const el = <line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} {...pd.attrs} {...markerAttrs} transform={shape.transform || undefined} />;

    if (defs.length > 0) {
        return (
            <g>
                <defs>{defs}</defs>
                {el}
            </g>
        );
    }
    return el;
};

// ─── Rect ────────────────────────────────────────────────────────────────────

const RectElement = ({ shape }: { shape: RectShape }) => {
    const id = useId();
    const pd = paintDefs(shape.paint, id);
    const el = <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} ry={shape.ry} {...pd.attrs} transform={shape.transform || undefined} />;

    if (pd.defs.length > 0) {
        return (
            <g>
                <defs>{pd.defs}</defs>
                {el}
            </g>
        );
    }
    return el;
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

    const pd = paintDefs(shape.paint, id);

    if (shape.textPath) {
        const pathId = `${id}-tp`;
        return (
            <text {...attrs} {...pd.attrs} style={style} transform={shape.transform || undefined}>
                <defs>
                    {pd.defs}
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

    const textEl = (
        <text {...attrs} {...pd.attrs} style={style} transform={shape.transform || undefined}>
            {lines.map((line, i) => (
                <tspan key={i} x={0} dy={i === 0 ? firstDy : lineHeight}>
                    {line}
                </tspan>
            ))}
        </text>
    );

    if (pd.defs.length > 0) {
        return (
            <g>
                <defs>{pd.defs}</defs>
                {textEl}
            </g>
        );
    }
    return textEl;
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
    // Sample in the path's own coordinate space (transform is applied by the outer <g> below). Shares
    // the sampler the point-on-path data nodes use, so a shape placed here and a point emitted there
    // land in the same spot.
    const sample = PaperHelper.sampleLocalD(def.d, def.distance, def.overflow);
    if (!sample) return "";

    let angle = def.rotate.degrees;
    if (def.rotate.auto) {
        angle += sample.angle;
    }

    return `translate(${sample.x}, ${sample.y}) rotate(${angle})`;
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
