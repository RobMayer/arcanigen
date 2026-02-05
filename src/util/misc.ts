import { Flavour } from "../components/types";
import { DataTypes } from "../definitions/datatypes";
import { LengthUnit, NodeCategory } from "../types";

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

export const NODETITLE_FLAVOURS: { [key in NodeCategory]: Flavour } = {
    result: "confirm",
    interface: "confirm",
    primitive: "accent",
    collection: "danger",
    shape: "emphasis",
};

export const DATATYPE_FLAVOURS: { [key in DataTypes.Keys]: Flavour } = {
    string: "accent",
    length: "accent",
    shape: "confirm",
    float: "accent",
    integer: "accent",
    color: "accent",
    enum: "accent",
    "tokens<length>": "accent",
};
