import { EmptyOr } from "../../util/misc";

export namespace Length {
    export const UNITS = ["px", "pt", "in", "mm", "cm"] as const;
    export type Unit = (typeof UNITS)[number];
    export type Type = `${number}${Unit}`;

    const NUMBER_REGEX = `[+-]?\\d*\\.?\\d+`;

    export const REGEX = new RegExp(`^(${NUMBER_REGEX})(${UNITS.join("|")})$`);

    export const is = (value: string): value is Type => REGEX.test(value);

    export const parse = (value: string): [number, Unit] | null => {
        const match = value.match(REGEX);
        return match ? [Number(match[1]), match[2] as Unit] : null;
    };

    export const convert = (value: Type, toUnit: Unit): Type => {
        const n = asNumber(value);
        switch (toUnit) {
            case "px":
                return `${n}${toUnit}`;
            case "pt":
                return `${(n * 72) / 96}${toUnit}`;
            case "in":
                return `${n / 96}${toUnit}`;
            case "mm":
                return `${(n * 25.4) / 96}${toUnit}`;
            case "cm":
                return `${(n * 2.54) / 96}${toUnit}`;
        }
    };

    export const asNumber = (t: Type): number => {
        const [num, unit] = parse(t)!;
        switch (unit) {
            case "px":
                return num;
            case "pt":
                return (num / 72) * 96;
            case "in":
                return num * 96;
            case "mm":
                return (num * 96) / 25.4;
            case "cm":
                return (num * 96) / 2.54;
        }
    };

    export const min = (a: Type, b: Type): Type => (asNumber(a) >= asNumber(b) ? b : a);
    export const max = (a: Type, b: Type): Type => (asNumber(b) > asNumber(a) ? b : a);
    export const clamp = (a: Type, theMin: Type, theMax: Type): Type => max(min(a, theMax), theMin);

    // for sorting
    export const compare = (a: Type, b: Type): number => asNumber(a) - asNumber(b);

    // -1 if below min, 1 if above max, 0 if within bounds
    export const compareBounds = (value: Type, min: Type | null, max: Type | null): number => {
        const n = asNumber(value);
        if (min && n < asNumber(min)) return -1;
        if (max && n > asNumber(max)) return 1;
        return 0;
    };

    export const within = (value: Type, min: Type | null, max: Type | null): boolean => compareBounds(value, min, max) === 0;

    export namespace Emptyable {
        export const parse = (value: EmptyOr<Type>) => (value === "" ? null : Length.parse(value));
        export const asNumber = (value: EmptyOr<Type>) => (value === "" ? null : Length.asNumber(value));
        // todo: fix.
        export const min = (a: EmptyOr<Type>, b: EmptyOr<Type>): EmptyOr<Type> => (a === "" || b === "" ? "" : Length.asNumber(b) < Length.asNumber(a) ? b : a);
        export const max = (a: EmptyOr<Type>, b: EmptyOr<Type>): EmptyOr<Type> => (a === "" || b === "" ? "" : Length.asNumber(b) > Length.asNumber(a) ? b : a);
        export const clamp = (a: EmptyOr<Type>, theMin: EmptyOr<Type>, theMax: EmptyOr<Type>): EmptyOr<Type> => max(min(a, theMax), theMin);
    }
}
