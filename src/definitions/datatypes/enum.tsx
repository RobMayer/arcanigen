import { Options } from "../../components/types";

export namespace Enum {
    type Entry = { readonly value: number; readonly label: string };
    type Base = Record<string, Entry>;

    /** Treat an index as an accessor that wraps in either direction (like Array.at(), but modulo). */
    const wrapIndex = (k: number, len: number): number => {
        const i = Math.trunc(k);
        return ((i % len) + len) % len;
    };

    export const keyOf = <O extends Base>(o: O, k: number) => {
        const keys = Object.keys(o);
        return keys[wrapIndex(k, keys.length)] as keyof O;
    };
    export const labelOf = <O extends Base>(o: O, k: number): string => {
        const entries = Object.values(o);
        return entries[wrapIndex(k, entries.length)].label;
    };
    export const labels = <O extends Base>(o: O): string[] => Object.values(o).map((e) => e.label);
    export const options = <O extends Base>(o: O): Options =>
        Object.values(o).map(({ value, label }) => {
            return { value: `${value}`, label };
        });
    export const resolve = <O extends Base>(n: number | null | undefined, o: O): number | undefined => {
        if (n == null || n === undefined) return undefined;
        return wrapIndex(n, Object.values(o).length);
    };

    export namespace Common {
        export const strokeCap = {
            BUTT: { value: 0, label: "Butt" },
            SQUARE: { value: 1, label: "Square" },
            ROUND: { value: 2, label: "Round" },
        } as const;

        export const strokeJoin = {
            MITER: { value: 0, label: "Miter" },
            BEVEL: { value: 1, label: "Bevel" },
            ROUND: { value: 2, label: "Round" },
        } as const;

        export const paintOrder = {
            FILL_STROKE_MARKERS: { value: 0, label: "Fill > Stroke > Markers" },
            FILL_MARKERS_STROKE: { value: 1, label: "Fill > Markers > Stroke" },
            STROKE_FILL_MARKERS: { value: 2, label: "Stroke > Fill > Markers" },
            STROKE_MARKERS_FILL: { value: 3, label: "Stroke > Markers > Fill" },
            MARKERS_FILL_STROKE: { value: 4, label: "Markers > Fill > Stroke" },
            MARKERS_STROKE_FILL: { value: 5, label: "Markers > Stroke > Fill" },
        } as const;

        export const scribeMode = {
            INSCRIBE: { value: 0, label: "Inscribe" },
            MIDDLE: { value: 1, label: "Middle" },
            CIRCUMSCRIBE: { value: 2, label: "Circumscribe" },
        } as const;

        export const expandMode = {
            POINT: { value: 0, label: "Point" },
            EDGE: { value: 1, label: "Edge" },
        } as const;

        export const positionMode = {
            CARTESIAN: { value: 0, label: "Cartesian" },
            POLAR: { value: 1, label: "Polar" },
        } as const;

        export const gradientSpread = {
            PAD: { value: 0, label: "Pad" },
            REFLECT: { value: 1, label: "Reflect" },
            REPEAT: { value: 2, label: "Repeat" },
        } as const;

        export const framing = {
            AUTO: { value: 0, label: "Auto" },
            MANUAL: { value: 1, label: "Manual" },
        } as const;

        export const pathOp = {
            UNIFY: { value: 0, label: "Unify" },
            INTERSECT: { value: 1, label: "Intersect" },
            EXCLUDE: { value: 2, label: "Exclude" },
            SUBTRACT: { value: 3, label: "Subtract" },
            INVERSE_SUBTRACT: { value: 4, label: "Inverse Subtract" },
            DIVIDE: { value: 5, label: "Divide" },
            INVERSE_DIVIDE: { value: 6, label: "Inverse Divide" },
            JOIN: { value: 7, label: "Join" },
        } as const;

        export const blendMode = {
            NORMAL: { value: 0, label: "Normal" },
            MULTIPLY: { value: 1, label: "Multiply" },
            SCREEN: { value: 2, label: "Screen" },
            OVERLAY: { value: 3, label: "Overlay" },
            DARKEN: { value: 4, label: "Darken" },
            LIGHTEN: { value: 5, label: "Lighten" },
            COLOR_DODGE: { value: 6, label: "Color Dodge" },
            COLOR_BURN: { value: 7, label: "Color Burn" },
            HARD_LIGHT: { value: 8, label: "Hard Light" },
            SOFT_LIGHT: { value: 9, label: "Soft Light" },
            DIFFERENCE: { value: 10, label: "Difference" },
            EXCLUSION: { value: 11, label: "Exclusion" },
            HUE: { value: 12, label: "Hue" },
            SATURATION: { value: 13, label: "Saturation" },
            COLOR: { value: 14, label: "Color" },
            LUMINOSITY: { value: 15, label: "Luminosity" },
            PLUS_LIGHTER: { value: 16, label: "Plus Lighter" },
            // PLUS_DARKER: { value: 17, label: "Plus Darker" }, // not yet supported
        } as const;

        export const distroFunctions = {
            LINEAR: { value: 0, label: "Linear" },
            QUADRATIC: { value: 1, label: "Quadratic" },
            CUBIC: { value: 2, label: "Cubic" },
            EXPONENTIAL: { value: 3, label: "Exponential" },
            SINUSOIDAL: { value: 4, label: "Sinusoidal" },
            ROOTIC: { value: 5, label: "Rootic" },
            CIRCULAR: { value: 6, label: "Circular" },
        } as const;

        export const distroEasing = {
            IN: { value: 0, label: "In" },
            OUT: { value: 1, label: "Out" },
            IN_OUT: { value: 2, label: "In Out" },
            OUT_IN: { value: 3, label: "Out In" },
        } as const;

        export const spanMode = {
            INNER_OUTER: { value: 0, label: "Inner / Outer" },
            SPREAD: { value: 1, label: "Spread" },
        } as const;

        export const spreadAlign = {
            CENTER: { value: 0, label: "Center" },
            INWARD: { value: 1, label: "Inward" },
            OUTWARD: { value: 2, label: "Outward" },
        } as const;

        // Star: how a star's two radii are stated. Major/Minor = give the tip (major) and valley
        // (minor) radii directly; Amplitude = give a base radius + how far the tips swing from it.
        // Values match the old spanMode (Inner/Outer=0, Spread=1) so no save-value remap is needed.
        export const starRadiusMode = {
            MAJOR_MINOR: { value: 0, label: "Major / Minor" },
            AMPLITUDE: { value: 1, label: "Amplitude" },
        } as const;

        export const arcMode = {
            START_SWEEP: { value: 0, label: "Start / Sweep" },
            FROM_TO: { value: 1, label: "From / To" },
        } as const;

        // Grid Layout: per-axis solve mode -- the NAMED quantity is the one derived from the other two.
        // Total = give Count+Spacing; Spacing = give Count+Total; Count = give Spacing+Total.
        export const fitCalcMode = {
            TOTAL: { value: 0, label: "Total" },
            SPACING: { value: 1, label: "Spacing" },
            COUNT: { value: 2, label: "Count" },
        } as const;

        // Grid Layout: where the leftover slack lands when Count is derived (Spacing+Total). Start/Center/End
        // keep Spacing exact and place the slack; Fill dissolves it by stretching spacing (Spacing becomes a minimum).
        export const gridJustify = {
            START: { value: 0, label: "Start" },
            CENTER: { value: 1, label: "Center" },
            END: { value: 2, label: "End" },
            FILL: { value: 3, label: "Fill" },
        } as const;

        // Grid Layout: how the 2D grid linearizes into the single Cell Sequence.
        export const gridSequenceOrder = {
            ROW_MAJOR: { value: 0, label: "Row-Major" },
            COLUMN_MAJOR: { value: 1, label: "Column-Major" },
        } as const;

        // Polar Layout radial axis: which way the rings extend from the reference radius (= Anchor). Value 0
        // grows positive, 1 grows negative, 2 splits both ways -- shared numbering with gridDirectionAnnular.
        export const gridDirectionRadial = {
            OUTWARD: { value: 0, label: "Outward" },
            INWARD: { value: 1, label: "Inward" },
            CENTER: { value: 2, label: "Center" },
        } as const;

        // Polar Layout annular axis: which way the sweep extends from the reference angle (= Anchor).
        export const gridDirectionAnnular = {
            CLOCKWISE: { value: 0, label: "CW" },
            COUNTERCLOCKWISE: { value: 1, label: "CCW" },
            CENTER: { value: 2, label: "Center" },
        } as const;

        // Polar Layout: how the ring x angular grid linearizes into the single Cell Sequence.
        export const polarSequenceOrder = {
            RADIAL_MAJOR: { value: 0, label: "Radial-Major" },
            ANNULAR_MAJOR: { value: 1, label: "Annular-Major" },
        } as const;

        // Banded shapes: how a band's two side edges (the "legs") attach to the end circles.
        // Tangent = legs are the common external tangents to the two end circles (smooth, cap-friendly);
        // Offset = legs attach at the plain perpendicular offsets (exact widths at the endpoints).
        export const bandMode = {
            TANGENT: { value: 0, label: "Tangent" },
            OFFSET: { value: 1, label: "Offset" },
        } as const;

        // Banded shapes: how a band's end is closed off. Distinct from strokeCap (an SVG stroke property):
        // these are actual geometry built around the end circle. Point has no strokeCap analogue.
        export const bandCap = {
            BUTT: { value: 0, label: "Butt" },
            ROUND: { value: 1, label: "Round" },
            SQUARE: { value: 2, label: "Square" },
            POINT: { value: 3, label: "Point" },
        } as const;

        // Spirograph: which side the rolling wheel travels on the fixed ring.
        // Inside = hypotrochoid, Outside = epitrochoid.
        export const spiroMode = {
            INSIDE: { value: 0, label: "Inside" },
            OUTSIDE: { value: 1, label: "Outside" },
        } as const;

        // Spirograph: how the gear geometry is specified. Geared uses integer tooth
        // counts (closes automatically); Radii uses explicit lengths + a turn count.
        export const spiroParam = {
            GEARED: { value: 0, label: "Geared" },
            RADII: { value: 1, label: "Radii" },
        } as const;

        // Spirograph (Geared mode): which radius the `radius` input pins.
        // Major = the figure's outer extent (circumradius), Minor = its inner extent (apothem),
        // Mechanical = the ring radius R (the gear you'd physically pick).
        export const spiroRadiusMode = {
            MAJOR: { value: 0, label: "Major" },
            MINOR: { value: 1, label: "Minor" },
            MECHANICAL: { value: 2, label: "Mechanical" },
        } as const;

        export const cornerShape = {
            ROUND: { value: 0, label: "Round" },
            BEVEL: { value: 1, label: "Bevel" },
            SCOOP: { value: 2, label: "Scoop" },
            NOTCH: { value: 3, label: "Notch" },
            CUT: { value: 4, label: "Cut" },
        } as const;

        export const linearAlign = {
            START: { value: 0, label: "Start" },
            CENTER: { value: 1, label: "Center" },
            END: { value: 2, label: "End" },
        } as const;

        export const verticalAlign = {
            TOP: { value: 0, label: "Top" },
            MIDDLE: { value: 1, label: "Middle" },
            BOTTOM: { value: 2, label: "Bottom" },
        } as const;

        export const horizontalAlign = {
            LEFT: { value: 0, label: "Left" },
            CENTER: { value: 1, label: "Center" },
            RIGHT: { value: 2, label: "Right" },
        } as const;

        export const offsetMode = {
            RELATIVE: { value: 0, label: "Relative" },
            ABSOLUTE: { value: 1, label: "Absolute" },
        } as const;

        // General "how is the extent of a sub-run specified" switch, shared by Substring (chars) and Slice
        // (array elements): LENGTH = a count from start, END = an exclusive end index.
        export const subelementMode = {
            LENGTH: { value: 0, label: "Length" },
            END: { value: 1, label: "End" },
        } as const;

        // Which side of the anchored element an Inject/Splice lands on (anchor on a real element, pick a side
        // -> no fencepost, length-free: "after -1" appends, "before 0" prepends).
        export const injectSide = {
            BEFORE: { value: 0, label: "Before" },
            AFTER: { value: 1, label: "After" },
        } as const;

        export const maskMode = {
            LUMINANCE: { value: 0, label: "Luminance" },
            ALPHA: { value: 1, label: "Alpha" },
        } as const;

        export const spacingMode = {
            SPACE_BETWEEN: { value: 0, label: "Space Between" },
            SPACE_AROUND: { value: 1, label: "Space Around" },
            SPACE_AFTER: { value: 5, label: "Space After" },
            SPACE_BEFORE: { value: 6, label: "Space Before" },
            FIXED_START: { value: 2, label: "Fixed Start" },
            FIXED_CENTER: { value: 3, label: "Fixed Center" },
            FIXED_END: { value: 4, label: "Fixed End" },
        } as const;

        export const overflowMode = {
            CLAMP: { value: 0, label: "Clamp" },
            WRAP: { value: 1, label: "Wrap" },
        } as const;

        export const sequencerMode = {
            WRAP: { value: 0, label: "Wrap" },
            TRUNCATE: { value: 1, label: "Truncate" },
            CLAMP: { value: 2, label: "Clamp" },
            BOUNCE: { value: 3, label: "Bounce" },
        } as const;

        //#region Input and Output Widgets

        export const numberInputWidget = {
            NONE: { value: 0, label: "None" },
            INPUT: { value: 1, label: "Input" },
            SLIDER: { value: 2, label: "Slider" },
        } as const;

        export const lengthInputWidget = {
            NONE: { value: 0, label: "None" },
            INPUT: { value: 1, label: "Input" },
        } as const;

        export const colorInputWidget = {
            NONE: { value: 0, label: "None" },
            HEX: { value: 1, label: "Hex" },
        } as const;

        export const booleanInputWidget = {
            NONE: { value: 0, label: "None" },
            CHECKBOX: { value: 1, label: "Checkbox" },
            CHECKBUTTON: { value: 2, label: "Checkbutton" },
        } as const;

        export const enumInputWidget = {
            NONE: { value: 0, label: "None" },
            DROPDOWN: { value: 1, label: "Dropdown" },
            VERTICAL_RADIO_BUTTON: { value: 2, label: "Vertical Radio Button" },
            HORIZONTAL_RADIO_BUTTON: { value: 3, label: "Horizontal Radio Button" },
            VERTICAL_RADIO_BOX: { value: 4, label: "Vertical Radio Box" },
            HORIZONTAL_RADIO_BOX: { value: 5, label: "Horizontal Radio Box" },
        } as const;

        export const stringInputWidget = {
            NONE: { value: 0, label: "None" },
            LINE: { value: 1, label: "Line" },
            BLOCK: { value: 2, label: "Block" },
            BLOCK_MODAL: { value: 3, label: "Block + Modal" },
            MODAL: { value: 4, label: "Modal" },
        } as const;

        export const typicalInputWidget = {
            NONE: { value: 0, label: "None" },
            INPUT: { value: 1, label: "Input" },
        } as const;

        export const arrayInputWidget = {
            NONE: { value: 0, label: "None" },
            DYNAMIC_LIST: { value: 1, label: "Dynamic List" },
        } as const;

        export const typicalOutputWidget = {
            NONE: { value: 0, label: "None" },
            PREVIEW: { value: 1, label: "Preview" },
        } as const;

        export const lengthUnit = {
            PX: { value: 0, label: "px" },
            PT: { value: 1, label: "pt" },
            IN: { value: 2, label: "in" },
            MM: { value: 3, label: "mm" },
            CM: { value: 4, label: "cm" },
        } as const;

        export const roundingMode = {
            CEIL: { value: 0, label: "Ceil" },
            FLOOR: { value: 1, label: "Floor" },
            TRUNCATE: { value: 2, label: "Truncate" },
            EXPAND: { value: 3, label: "Expand" },
            HALF_CEIL: { value: 4, label: "Half Ceil" },
            HALF_FLOOR: { value: 5, label: "Half Floor" },
            HALF_TRUNCATE: { value: 6, label: "Half Truncate" },
            HALF_EXPAND: { value: 7, label: "Half Expand" },
        } as const;

        //#endregion

        export const colorSpace = {
            RGB: { value: 0, label: "RGB" },
            CMY: { value: 1, label: "CMY" },
            CMYK: { value: 2, label: "CMYK" },
            HSV: { value: 3, label: "HSV" },
            HSL: { value: 4, label: "HSL" },
            HWK: { value: 5, label: "HWK" },
            HSI: { value: 6, label: "HSI" },
            HCY: { value: 7, label: "HCY" },
            CIELAB: { value: 8, label: "CIELAB" },
            OKLAB: { value: 9, label: "OKLAB" },
            OKLCH: { value: 10, label: "OKLCH" },
            CIELCH: { value: 11, label: "CIELCH" },
            RGB_BYTE: { value: 12, label: "RGB (Byte)" },
        } as const;

        export const alphaScale = {
            FLOAT: { value: 0, label: "Float (0–100)" },
            BYTE: { value: 1, label: "Byte (0–255)" },
        } as const;

        export const angleTraversal = {
            CLOSEST_CW: { value: 0, label: "Closest CW" },
            CLOSEST_CCW: { value: 1, label: "Closest CCW" },
            FARTHEST_CW: { value: 2, label: "Farthest CW" },
            FARTHEST_CCW: { value: 3, label: "Farthest CCW" },
            CLOCKWISE: { value: 4, label: "Clockwise" },
            COUNTER_CLOCKWISE: { value: 5, label: "Counter-Clockwise" },
        } as const;

        export const angleContinuity = {
            CYCLICAL: { value: 0, label: "Cyclical" },
            CONTINUOUS: { value: 1, label: "Continuous" },
        } as const;
    }

    /**
     * Shared preset list used by the Enum primitive node and the Enum interface input node
     * so both stay in sync. Order is the user-facing order in the Presets accordion.
     */
    export const PRESETS: readonly { readonly label: string; readonly options: Base }[] = [
        { label: "Blend Modes", options: Common.blendMode },
        { label: "Path Operations", options: Common.pathOp },
        { label: "Scribe Modes", options: Common.scribeMode },
        { label: "Position Modes", options: Common.positionMode },
        { label: "Stroke Cap", options: Common.strokeCap },
        { label: "Stroke Join", options: Common.strokeJoin },
        { label: "Distro Functions", options: Common.distroFunctions },
        { label: "Distro Easing", options: Common.distroEasing },
        { label: "Span Mode", options: Common.spanMode },
        { label: "Spread Align", options: Common.spreadAlign },
        { label: "Star Radius Mode", options: Common.starRadiusMode },
        { label: "Paint Order", options: Common.paintOrder },
        { label: "Corner Shape", options: Common.cornerShape },
        { label: "Linear Alignment", options: Common.linearAlign },
        { label: "Vertical Alignment", options: Common.verticalAlign },
        { label: "Horizontal Alignment", options: Common.horizontalAlign },
        { label: "Offset Mode", options: Common.offsetMode },
        { label: "Subelement Mode", options: Common.subelementMode },
        { label: "Inject Side", options: Common.injectSide },
        { label: "Mask Mode", options: Common.maskMode },
        { label: "Spacing Mode", options: Common.spacingMode },
        { label: "Overflow Mode", options: Common.overflowMode },
        { label: "Sequencer Mode", options: Common.sequencerMode },
        { label: "Arc Mode", options: Common.arcMode },
        { label: "Band Mode", options: Common.bandMode },
        { label: "Band Cap", options: Common.bandCap },
        { label: "Spiro Mode", options: Common.spiroMode },
        { label: "Spiro Param", options: Common.spiroParam },
        { label: "Spiro Radius", options: Common.spiroRadiusMode },
        { label: "Expand Mode", options: Common.expandMode },
        { label: "Color Space", options: Common.colorSpace },
        { label: "Alpha Scale", options: Common.alphaScale },
        { label: "Angle Traversal", options: Common.angleTraversal },
        { label: "Angle Continuity", options: Common.angleContinuity },
        { label: "Length Unit", options: Common.lengthUnit },
        { label: "Rounding Mode", options: Common.roundingMode },
    ];
}
