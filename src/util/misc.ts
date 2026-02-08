import { Flavour } from "../components/types";
import { NodeCategory } from "../types";

export type ListOf<T> = T | T[] | Set<T>;

type NotIterable<T> = T extends readonly unknown[] | Set<unknown> ? never : T;

export type EmptyOr<T extends string> = T | "";

export type NumericString = `${number}`;

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

export const NODETITLE_FLAVOURS: { [key in NodeCategory]: Flavour } = {
    result: "emphasis",
    interface: "emphasis",
    primitive: "accent",
    collection: "danger",
    shape: "confirm",
    meta: "emphasis",
};
