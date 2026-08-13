import { EmptyOr } from "../../util/misc";

export namespace Angle {
    export const UNITS = ["deg", "rad", "turn"] as const;
    export type Unit = (typeof UNITS)[number];
    export type Type = `${number}${Unit}`;

    const NUMBER_REGEX = `[+-]?\\d*\\.?\\d+`;

    export const REGEX = new RegExp(`^(${NUMBER_REGEX})(${UNITS.join("|")})$`);

    export const is = (value: string): value is Type => REGEX.test(value);

    export const parse = (value: string): [number, Unit] | null => {
        const match = value.match(REGEX);
        return match ? [Number(match[1]), match[2] as Unit] : null;
    };

    // Canonical unit is degrees.
    export const convert = (value: Type, toUnit: Unit): Type => {
        const n = asNumber(value);
        switch (toUnit) {
            case "deg":
                return `${n}${toUnit}`;
            case "rad":
                return `${(n * Math.PI) / 180}${toUnit}`;
            case "turn":
                return `${n / 360}${toUnit}`;
        }
    };

    export const asNumber = (t: Type): number => {
        const [num, unit] = parse(t)!;
        switch (unit) {
            case "deg":
                return num;
            case "rad":
                return (num * 180) / Math.PI;
            case "turn":
                return num * 360;
        }
    };

    export const asRadians = (t: Type): number => (asNumber(t) * Math.PI) / 180;

    export const min = (a: Type, b: Type): Type => (asNumber(a) >= asNumber(b) ? b : a);
    export const max = (a: Type, b: Type): Type => (asNumber(b) > asNumber(a) ? b : a);
    export const clamp = (a: Type, theMin: Type, theMax: Type): Type => max(min(a, theMax), theMin);

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
        export const parse = (value: EmptyOr<Type>) => (value === "" ? null : Angle.parse(value));
        export const asNumber = (value: EmptyOr<Type>) => (value === "" ? null : Angle.asNumber(value));
        export const asRadians = (value: EmptyOr<Type>) => (value === "" ? null : Angle.asRadians(value));
        export const min = (a: EmptyOr<Type>, b: EmptyOr<Type>): EmptyOr<Type> => (a === "" || b === "" ? "" : Angle.asNumber(b) < Angle.asNumber(a) ? b : a);
        export const max = (a: EmptyOr<Type>, b: EmptyOr<Type>): EmptyOr<Type> => (a === "" || b === "" ? "" : Angle.asNumber(b) > Angle.asNumber(a) ? b : a);
        export const clamp = (a: EmptyOr<Type>, theMin: EmptyOr<Type>, theMax: EmptyOr<Type>): EmptyOr<Type> => (a === "" ? "" : theMax === "" || theMin === "" ? a : max(min(a, theMax), theMin));
    }
}
