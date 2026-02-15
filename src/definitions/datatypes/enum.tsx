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
    export const resolve = <O extends Base>(n: number, o: O) => Math.max(0, Math.min(n, Object.keys(o).length - 1));

    export namespace Common {
        export const strokeCap = {
            Butt: 0,
            Square: 1,
            Round: 2,
        } as const;

        export const scribeMode = {
            Inscribe: 0,
            Middle: 1,
            Circumscribe: 2,
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
    }
}
