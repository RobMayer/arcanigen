import { LengthUnit } from "../types";

export type ListOf<T> = T | T[] | Set<T>;

type NotIterable<T> = T extends readonly unknown[] | Set<unknown> ? never : T;

export type Emptyable<T extends string> = T | "";

export type NumericString = `${number}`;

export const normalizeList = <T>(list: ListOf<NotIterable<T>>): Set<T> => (list instanceof Set ? list : new Set<T>(Array.isArray(list) ? list : [list]));

export const lengthToUnitless = (num: number, unit: LengthUnit): number => {
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

export const merge = <M, S extends Record<string, unknown>>(item: M, extra: S): M & S => {
    return Object.keys(extra).reduce<M & S>(
        (acc, k: keyof S) => {
            (acc as S)[k] = extra[k];
            return acc;
        },
        item as M & S,
    );
};
