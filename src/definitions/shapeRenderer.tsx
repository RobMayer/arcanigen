import { ReactNode, useId } from "react";
import { Shape, Paint, Stroke, Markers, MarkerDef, PathShape, LineShape, RectShape, TextShape, GroupShape, OffsetPathShape, SymbolShape, MaskedShape } from "./shapeTypes";
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
    attrs.fill = paint.fill === null ? "none" : paint.fill ?? "none";
    if (paint.paintOrder) {
        attrs.paintOrder = paint.paintOrder;
    }
    return attrs;
};

// ─── Marker rendering ────────────────────────────────────────────────────────

const MarkerDefElement = ({ def, id }: { def: MarkerDef; id: string }) => {
    return (
        <marker
            id={id}
            markerUnits="userSpaceOnUse"
            markerWidth="100%"
            markerHeight="100%"
            overflow="visible"
            orient={def.orient}
        >
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
            return <TextElement shape={shape} />;
        case "group":
            return <GroupElement shape={shape} />;
        case "offsetPath":
            return <OffsetPathElement shape={shape} />;
        case "symbol":
            return <SymbolElement shape={shape} />;
        case "masked":
            return <MaskedElement shape={shape} />;
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
            vectorEffect={shape.vectorEffect as "none" | "non-scaling-stroke" | undefined}
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

    const el = (
        <line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} {...paintAttrs(shape.paint)} {...markerAttrs} transform={shape.transform || undefined} />
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

// ─── Rect ────────────────────────────────────────────────────────────────────

const RectElement = ({ shape }: { shape: RectShape }) => {
    return (
        <rect
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            rx={shape.rx}
            ry={shape.ry}
            {...paintAttrs(shape.paint)}
            transform={shape.transform || undefined}
        />
    );
};

// ─── Text ────────────────────────────────────────────────────────────────────

const TextElement = ({ shape }: { shape: TextShape }) => {
    const id = useId();

    const attrs: Record<string, string | number | undefined> = {
        fontSize: shape.fontSize,
        letterSpacing: shape.letterSpacing,
        textAnchor: shape.textAnchor,
        dominantBaseline: shape.dominantBaseline,
        rotate: shape.rotate !== undefined ? `${shape.rotate}` : undefined,
    };

    if (shape.textPath) {
        const pathId = `${id}-tp`;
        return (
            <text {...attrs} {...paintAttrs(shape.paint)} transform={shape.transform || undefined}>
                <defs>
                    <path id={pathId} d={shape.textPath.d} />
                </defs>
                <textPath href={`#${pathId}`} startOffset={shape.textPath.startOffset}>
                    {shape.text}
                </textPath>
            </text>
        );
    }

    return (
        <text {...attrs} {...paintAttrs(shape.paint)} transform={shape.transform || undefined}>
            {shape.text}
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

const OffsetPathElement = ({ shape }: { shape: OffsetPathShape }) => {
    const id = useId();
    const pathId = `${id}-op`;

    const style: Record<string, string> = {
        offsetPath: `url(#${pathId})`,
    };
    if (shape.path.distance) {
        style.offsetDistance = shape.path.distance;
    }
    if (shape.path.rotate) {
        style.offsetRotate = shape.path.rotate;
    }

    return (
        <g transform={shape.transform || undefined}>
            <defs>
                <path id={pathId} d={shape.path.d} />
            </defs>
            <g style={style}>
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
    const isLuminance = shape.mask.mode === "luminance";

    return (
        <g transform={shape.transform || undefined}>
            <defs>
                <mask id={maskId} maskContentUnits="userSpaceOnUse" style={{ maskType: shape.mask.mode }}>
                    {/* Background rect: black for luminance (default hidden), transparent for alpha */}
                    <rect x="-5000%" y="-5000%" width="10000%" height="10000%" fill={isLuminance ? "black" : "transparent"} />
                    {/* The mask shape */}
                    <ShapeElement shape={shape.mask.shape} />
                    {/* Invert overlay: a white rect with difference blending flips luminance values */}
                    {isLuminance && shape.mask.invert && (
                        <rect x="-5000%" y="-5000%" width="10000%" height="10000%" fill="white" style={{ mixBlendMode: "difference" }} />
                    )}
                </mask>
            </defs>
            <g mask={`url(#${maskId})`}>
                <ShapeElement shape={shape.content} />
            </g>
        </g>
    );
};
