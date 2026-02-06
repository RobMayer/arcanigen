import { BoundsOf } from "../../types";
import { EmptyOr } from "../../util/misc";

export namespace Length {

    export const UNITS = ["px", "pt", "in", "mm", "cm"] as const;
    export type Unit = typeof UNITS[number];
    export type Type = `${number}${Unit}`;
    export type Bounds = BoundsOf<Type>;
    
    const NUMBER_REGEX = `[+-]?\\d*\\.?\\d+`;

    export const REGEX = new RegExp(`^(${NUMBER_REGEX})(${UNITS.join("|")})$`);

    export const is = (value: string): value is Type => REGEX.test(value);

    export const parse = (value: string) : [number, Unit] | null => {
        const match = value.match(REGEX);
        return match ? [Number(match[1]), match[2] as Unit] : null;
    }

    export const convert = (value: Type, toUnit: Unit): Type => {
        const n = asNumber(value);
        switch (toUnit) {
            case "px": return `${n}${toUnit}`;
            case "pt": return `${n * 72 / 96}${toUnit}`;
            case "in": return `${n / 96}${toUnit}`;
            case "mm": return `${n * 25.4 / 96}${toUnit}`;
            case "cm": return `${n * 2.54 / 96}${toUnit}`;
        }
    }

    export const asNumber = (t: Type): number => {
        const [num, unit] = parse(t)!;
        switch (unit) {
            case "px": return num;
            case "pt": return num / 72 * 96;
            case "in": return num * 96;
            case "mm": return num * 96 / 25.4;
            case "cm": return num * 96 / 2.54;
        }
    }

    export const min = (a: Type, b: Type): Type => asNumber(a) >= asNumber(b) ? b : a;
    export const max = (a: Type, b: Type): Type => asNumber(b) > asNumber(a) ? b : a;
    export const clamp = (a: Type, theMin: Type, theMax: Type): Type => max(min(a, theMax), theMin);
    export const constrain = (a: Type, bounds?: Bounds): Type => {
        if (!bounds) { return a; }
        const n = asNumber(a);
        const { min, max } = parseBounds(bounds);
        if (min && (min.inclusive ? n < min.value : n <= min.value)) return min.raw;
        if (max && (max.inclusive ? n > max.value : n >= max.value)) return max.raw;
        return a;
    }

    // for sorting
    export const compare = (a: Type, b: Type): number => asNumber(a) - asNumber(b);

    const BOUNDS_REGEX = new RegExp(`^(?:(>=?)(${NUMBER_REGEX}${UNITS.join("|")}))?(?:(<=?)(${NUMBER_REGEX}${UNITS.join("|")}))?$`)

    const parseBounds = (bounds: Bounds): { min?: { raw: Type; value: number; inclusive: boolean }; max?: { raw: Type; value: number; inclusive: boolean } } => {
        const match = bounds.match(BOUNDS_REGEX);
        if (!match) { return {} }
        const [, minOp, minVal, maxOp, maxVal] = match;
        return {
            min: minOp ? { raw: minVal as Type, value: asNumber(minVal as Type), inclusive: minOp === ">=" } : undefined,
            max: maxOp ? { raw: maxVal as Type, value: asNumber(maxVal as Type), inclusive: maxOp === "<=" } : undefined,
        };
    }

    // -1 if below min, 1 if above max, 0 if within bounds
    export const compareBounds = (value: Type, bounds: Bounds): number => {
        const n = asNumber(value);
        const { min, max } = parseBounds(bounds);
        if (min && (min.inclusive ? n < min.value : n <= min.value)) return -1;
        if (max && (max.inclusive ? n > max.value : n >= max.value)) return 1;
        return 0;
    };

    export const within = (value: Type, bounds: Bounds): boolean => compareBounds(value, bounds) === 0;

    export namespace Emptyable {
        export const asNumber = (value: EmptyOr<Type>) => value === "" ? null : Length.asNumber(value);
        export const constrain = (value: EmptyOr<Type>, bounds?: Length.Bounds): EmptyOr<Type> => value === "" ? "" : Length.constrain(value, bounds);
    }
}
