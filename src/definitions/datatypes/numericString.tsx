import { EmptyOr } from "../../util/misc";

export namespace NumericString {
    export type Type = `${number}`;

    export const asNumber = (v: Type) => Number(v);
    export const add = (a: Type, b: Type): Type => `${Number(a) + Number(b)}`;
    export const subtract = (a: Type, b: Type): Type => `${Number(a) - Number(b)}`;

    export namespace Emptyable {
        export const asNumber = (v: EmptyOr<Type>) => (v === "" ? null : Number(v));
        export const coalesce = (a: EmptyOr<Type>, b: Type | number): Type => (a === "" ? `${b}` : a);
    }
}
