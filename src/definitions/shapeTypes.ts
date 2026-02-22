// ─── Bounding Box ────────────────────────────────────────────────────────────

export type BBox = {
    x: number;
    y: number;
    w: number;
    h: number;
};

// ─── Stroke ──────────────────────────────────────────────────────────────────

export type Stroke = {
    color: string; // hex: "#RRGGBB" or "#RRGGBBAA"
    width: number;
    cap: "butt" | "round" | "square";
    join: "butt" | "round" | "bevel" | "miter";
    dash?: { array: string; offset: number }; // array is space-separated numbers
};

// ─── Fill ────────────────────────────────────────────────────────────────────

export type Fill = string | null; // hex color string or null for "none"

// ─── Paint styling shared by most leaf shapes ────────────────────────────────

export type Paint = {
    stroke?: Stroke;
    fill?: Fill;
    paintOrder?: string; // e.g. "fill stroke markers"
};

// ─── Markers ─────────────────────────────────────────────────────────────────
// Renderer creates <marker> defs with auto-generated IDs and sets
// markerStart/markerMid/markerEnd attributes on the host element.

export type MarkerDef = {
    shape: Shape;
    orient?: string; // "auto", "auto-start-reverse", or an angle
};

export type Markers = {
    start?: MarkerDef;
    mid?: MarkerDef;
    end?: MarkerDef;
};

// ─── Text on a path ──────────────────────────────────────────────────────────
// Renderer creates a <path> def and wraps text content in <textPath href="#...">.

export type TextPathDef = {
    d: string; // path data
    startOffset?: string; // e.g. "50%", "calc(clamp(0%, ...))"
};

// ─── Offset path (along-path positioning) ────────────────────────────────────
// Renderer computes position via getPointAtLength and emits a transform attribute.

export type OffsetPathDef = {
    d: string; // path data
    distance: { percent: number; px: number }; // resolved as: percent/100 * totalLength + px
    overflow: "clamp" | "wrap";
    rotate: { auto: boolean; degrees: number }; // auto=true: follow tangent + degrees offset
};

// ─── Symbol / instancing ─────────────────────────────────────────────────────
// Renderer creates <symbol> def and <use> elements for each instance.

export type SymbolDef = {
    content: Shape; // rendered inside <symbol>
    viewBox: string; // e.g. "0 0 512 512"
    width: string;
    height: string;
    x: string; // offset for centering
    y: string;
};

// ─── Shape variants ──────────────────────────────────────────────────────────

/** A closed or open path: <path d="..."> */
export type PathShape = {
    type: "path";
    d: string;
    paint: Paint;
    markers?: Markers;
    vectorEffect?: string; // e.g. "non-scaling-stroke"
    signals?: string[];
    transform: string;
    preview: BBox;
};

/** A straight line segment: <line x1 y1 x2 y2> */
export type LineShape = {
    type: "line";
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    paint: Paint;
    markers?: Markers;
    signals?: string[];
    transform: string;
    preview: BBox;
};

/** A rectangle: <rect x y width height rx ry> */
export type RectShape = {
    type: "rect";
    x: string;
    y: string;
    width: string;
    height: string;
    rx?: string;
    ry?: string;
    paint: Paint;
    signals?: string[];
    transform: string;
    preview: BBox;
};

/** A text element, optionally following a path */
export type TextShape = {
    type: "text";
    text: string;
    fontSize: number;
    letterSpacing?: number;
    textAnchor?: "start" | "middle" | "end";
    dominantBaseline?: string;
    rotate?: number; // per-character rotation in degrees
    paint: Paint;
    textPath?: TextPathDef;
    signals?: string[];
    transform: string;
    preview: BBox;
};

/** A group of child shapes */
export type GroupShape = {
    type: "group";
    children: (Shape | null)[];
    blendMode?: string; // CSS mix-blend-mode value
    isolation?: boolean; // CSS isolation: isolate
    signals?: string[];
    transform: string;
    preview: BBox;
};

/** A shape positioned along a path via CSS offset-path */
export type OffsetPathShape = {
    type: "offsetPath";
    shape: Shape; // the shape being positioned
    path: OffsetPathDef;
    signals?: string[];
    transform: string;
    preview: BBox;
};

/** A symbol with one or more <use> instances */
export type SymbolShape = {
    type: "symbol";
    symbol: SymbolDef;
    signals?: string[];
    transform: string;
    preview: BBox;
};

/** A shape masked by another shape via SVG <mask> */
export type MaskedShape = {
    type: "masked";
    content: Shape;
    mask: MaskDef;
    signals?: string[];
    transform: string;
    preview: BBox;
};

export type MaskDef = {
    shape: Shape;
    mode: "luminance" | "alpha";
    invert: boolean; // only meaningful when mode is "luminance"
};

/** An SVG filter primitive: tag name + attributes */
export type FilterPrimitive = {
    tag: string;
    attrs: Record<string, string | number>;
};

/** A shape clipped by an SVG <clipPath> */
export type ClippedShape = {
    type: "clipped";
    content: Shape;
    clipPath: string; // SVG path d attribute
    transform: string;
    signals?: string[];
    preview: BBox;
};

/** A shape with an SVG filter applied */
export type FilteredShape = {
    type: "filtered";
    content: Shape;
    filter: FilterPrimitive[];
    signals?: string[];
    transform: string;
    preview: BBox;
};

// ─── Union ───────────────────────────────────────────────────────────────────

export type Shape =
    | PathShape
    | LineShape
    | RectShape
    | TextShape
    | GroupShape
    | OffsetPathShape
    | SymbolShape
    | MaskedShape
    | ClippedShape
    | FilteredShape;
