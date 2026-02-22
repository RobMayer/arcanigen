import { Options } from "../../components/types";

export namespace Enum {
    type Entry = { readonly value: number; readonly label: string };
    type Base = Record<string, Entry>;

    export const keyOf = <O extends Base>(o: O, k: number) => {
        const keys = Object.keys(o);
        return keys[k > keys.length - 1 || k < 0 ? 0 : k] as keyof O;
    };
    export const labelOf = <O extends Base>(o: O, k: number): string => {
        const entries = Object.values(o);
        return entries[k > entries.length - 1 || k < 0 ? 0 : k].label;
    };
    export const labels = <O extends Base>(o: O): string[] => Object.values(o).map((e) => e.label);
    export const options = <O extends Base>(o: O): Options =>
        Object.values(o).map(({ value, label }) => {
            return { value: `${value}`, label };
        });
    export const resolve = <O extends Base>(n: number | null | undefined, o: O): number | undefined => {
        if (n == null || n === undefined) return undefined;
        return Math.max(0, Math.min(n, Object.values(o).length - 1));
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

        export const thetaMode = {
            START_STOP: { value: 0, label: "Start / Stop" },
            INCREMENTAL: { value: 1, label: "Incremental" },
        } as const;

        export const arcMode = {
            START_SWEEP: { value: 0, label: "Start / Sweep" },
            FROM_TO: { value: 1, label: "From / To" },
        } as const;

        export const cornerShape = {
            ROUND: { value: 0, label: "Round" },
            BEVEL: { value: 1, label: "Bevel" },
            SCOOP: { value: 2, label: "Scoop" },
            NOTCH: { value: 3, label: "Notch" },
        } as const;

        export const textAlign = {
            START: { value: 0, label: "Start" },
            CENTER: { value: 1, label: "Center" },
            END: { value: 2, label: "End" },
        } as const;

        export const textAnchor = {
            TOP: { value: 0, label: "Top" },
            MIDDLE: { value: 1, label: "Middle" },
            BOTTOM: { value: 2, label: "Bottom" },
        } as const;

        export const offsetMode = {
            RELATIVE: { value: 0, label: "Relative" },
            ABSOLUTE: { value: 1, label: "Absolute" },
        } as const;

        export const offsetOrigin = {
            START: { value: 0, label: "Start" },
            CENTER: { value: 1, label: "Center" },
            END: { value: 2, label: "End" },
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

        export const typicalInputWidget = {
            NONE: { value: 0, label: "None" },
            INPUT: { value: 1, label: "Input" },
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
            LAB: { value: 8, label: "LAB" },
            OKLAB: { value: 9, label: "OKLAB" },
            OKLCH: { value: 10, label: "OKLCH" },
        } as const;

        export const angleTraversal = {
            CLOSEST_CW: { value: 0, label: "Closest CW" },
            CLOSEST_CCW: { value: 1, label: "Closest CCW" },
            FARTHEST_CW: { value: 2, label: "Farthest CW" },
            FARTHEST_CCW: { value: 3, label: "Farthest CCW" },
            CLOCKWISE: { value: 4, label: "Clockwise" },
            COUNTER_CLOCKWISE: { value: 5, label: "Counter-Clockwise" },
        } as const;
    }
}
