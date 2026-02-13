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
