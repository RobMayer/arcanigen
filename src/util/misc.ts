import { Enum } from "../definitions/datatypes/enum";

export type ListOf<T> = T | T[] | Set<T>;

type NotIterable<T> = T extends readonly unknown[] | Set<unknown> ? never : T;

export type EmptyOr<T extends string> = T | "";

export const normalizeList = <T>(list: ListOf<NotIterable<T>>): Set<T> => (list instanceof Set ? list : new Set<T>(Array.isArray(list) ? list : [list]));

export const merge = <M, S extends Record<string, unknown>>(item: M, extra: S): M & S => {
    return Object.keys(extra).reduce<M & S>(
        (acc, k: keyof S) => {
            (acc as S)[k] = extra[k];
            return acc;
        },
        item as M & S,
    );
};

export const getTrueRadius = (r: number, scribe: keyof typeof Enum.Common.scribeMode, sides: number) => {
    switch (scribe) {
        case "Middle":
            return (r + r / Math.cos(Math.PI / sides)) / 2;
        case "Circumscribe":
            return r / Math.cos(Math.PI / sides);
        case "Inscribe":
            return r;
    }
};

export const range = (count: number) => Array.from({ length: Math.round(count) });

export const deg2rad = (deg: number) => deg * (Math.PI / 180);

export const distroInterpolator = (curve: keyof typeof Enum.Common.distroFunctions, ease: keyof typeof Enum.Common.distroEasing, i: number = 1) => {
    const e = easedCurve(ease, CURVE_HANDLERS[curve]);
    return (t: number) => {
        return t + i * (e(t) - t);
    };
};

const CURVE_HANDLERS: { [k in keyof typeof Enum.Common.distroFunctions]: (t: number) => number } = {
    Linear: (t: number) => t,
    Quadratic: (t: number) => Math.pow(t, 2),
    Cubic: (t: number) => Math.pow(t, 3),
    Exponential: (t: number) => Math.pow(2, t) - 1,
    Sinusoidal: (t: number) => Math.sin(t * (Math.PI / 2)),
    Rootic: (t: number) => Math.sqrt(t),
    Circular: (t: number) => 1 - Math.sqrt(1 - Math.pow(t, 2)),
};

const easedCurve = (ease: keyof typeof Enum.Common.distroEasing, func: (t: number) => number) => {
    switch (ease) {
        case "In":
            return (a: number) => func(a);
        case "Out":
            return (a: number) => 1 - func(1 - a);
        case "InOut":
            return (a: number) => (a < 0.5 ? func(a * 2) / 2 : a > 0.5 ? 1 - func(a * -2 + 2) / 2 : 0.5);
        case "OutIn":
            return (a: number) => (a < 0.5 ? 0.5 - func(1 - a * 2) / 2 : a > 0.5 ? 0.5 + func(a * 2 - 1) / 2 : 0.5);
    }
};

type Interpolator = (n: number) => number;

const DEFUALT_INTERPOLATOR: Interpolator = (n: number) => n;

export const lerp = (t: number, a: number, b: number, interpolator: Interpolator = DEFUALT_INTERPOLATOR) => {
    return a + interpolator(t) * (b - a);
};

export const delerp = (d: number, start: number, end: number) => {
    return end - start === 0 ? 0 : (d - start) / (end - start);
};
