import { Options } from "../../components/types";

export namespace Enum {
    type Base = Record<string, number>;

    export const members = <O extends Base>(o: O) => Object.keys(o) as (keyof O)[];
    export const keyOf = <O extends Base>(o: O, k: number) => {
        const keys = Object.keys(o);
        return keys[k > keys.length - 1 || k < 0 ? 0 : k] as keyof O;
    };
    export const options = <O extends Base>(o: O): Options<keyof O & string> =>
        Object.keys(o).map((label) => {
            return { value: `${o[label]}`, label };
        });
    export const resolve = <O extends Base>(n: number | null | undefined, o: O): number | undefined => {
        if (n == null || n === undefined) return undefined;
        return Math.max(0, Math.min(n, Object.keys(o).length - 1));
    };

    export namespace Common {
        export const strokeCap = {
            Butt: 0,
            Square: 1,
            Round: 2,
        } as const;

        export const strokeJoin = {
            Miter: 0,
            Bevel: 1,
            Round: 2,
        } as const;

        export const paintOrder = {
            FillStrokeMarkers: 0,
            FillMarkersStroke: 1,
            StrokeFillMarkers: 2,
            StrokeMarkersFill: 3,
            MarkersFillStroke: 4,
            MarkersStrokeFill: 5,
        } as const;

        export const scribeMode = {
            Inscribe: 0,
            Middle: 1,
            Circumscribe: 2,
        } as const;

        export const expandMode = {
            Point: 0,
            Edge: 1,
        } as const;

        export const positionMode = {
            Cartesian: 0,
            Polar: 1,
        } as const;

        export const blendMode = {
            Normal: 0,
            Multiply: 1,
            Screen: 2,
            Overlay: 3,
            Darken: 4,
            Lighten: 5,
            ColorDodge: 6,
            ColorBurn: 7,
            HardLight: 8,
            SoftLight: 9,
            Difference: 10,
            Exclusion: 11,
            Hue: 12,
            Saturation: 13,
            Color: 14,
            Luminosity: 15,
            PlusLighter: 16,
            // PlusDarker: 17, // not yet supported
        } as const;

        export const distroFunctions = {
            Linear: 0,
            Quadratic: 1,
            Cubic: 2,
            Exponential: 3,
            Sinusoidal: 4,
            Rootic: 5,
            Circular: 6,
        };

        export const distroEasing = {
            In: 0,
            Out: 1,
            InOut: 2,
            OutIn: 3,
        };

        export const spanMode = {
            InnerOuter: 0,
            Spread: 1,
        };

        export const spreadAlign = {
            Center: 0,
            Inward: 1,
            Outward: 2,
        };

        export const thetaMode = {
            StartStop: 0,
            Incremental: 1,
        };

        export const arcMode = {
            StartSweep: 0,
            FromTo: 1,
        };

        export const cornerShape = {
            Round: 0,
            Bevel: 1,
            Scoop: 2,
            Notch: 3,
        };

        export const textAlign = {
            Start: 0,
            Center: 1,
            End: 2,
        } as const;

        export const textAnchor = {
            Top: 0,
            Middle: 1,
            Bottom: 2,
        } as const;

        export const offsetMode = {
            Relative: 0,
            Absolute: 1,
        } as const;

        export const offsetOrigin = {
            Start: 0,
            Center: 1,
            End: 2,
        } as const;

        export const maskMode = {
            Luminance: 0,
            Alpha: 1,
        } as const;

        export const spacingMode = {
            Even: 0,
            FixedStart: 1,
            FixedCenter: 2,
            FixedEnd: 3,
        } as const;

        export const overflowMode = {
            Clamp: 0,
            Wrap: 1,
        } as const;

        export const sequencerMode = {
            Wrap: 0,
            Truncate: 1,
            Clamp: 2,
            Bounce: 3,
        } as const;

        //#region Input and Outpput Widgets

        export const numberInputWidget = {
            None: 0,
            Input: 1,
            Slider: 2,
        } as const;

        export const lengthInputWidget = {
            None: 0,
            Input: 1,
        } as const;

        export const colorInputWidget = {
            None: 0,
            Hex: 1,
        } as const;

        export const booleanInputWidget = {
            None: 0,
            Checkbox: 1,
            Checkbutton: 2,
        } as const;

        export const enumInputWidget = {
            None: 0,
            Dropdown: 1,
            VerticalRadioButton: 2,
            HorizontalRadioButton: 3,
            VerticalRadioBox: 4,
            HorizontalRadioBox: 5,
        } as const;

        export const typicalInputWidget = {
            None: 0,
            Input: 1,
        } as const;

        export const typicalOutputWidget = {
            None: 0,
            Preview: 1,
        } as const;

        //#endregion
    }
}
