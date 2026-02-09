import { EmptyOr } from "../../util/misc";

export namespace NumericString {
    export type Type = `${number}`;

    export const asNumber = (v: Type) => Number(v);
    export const add = (a: Type, b: Type): Type => `${Number(a) + Number(b)}`;
    export const subtract = (a: Type, b: Type): Type => `${Number(a) - Number(b)}`;
    export const round = (a: Type): Type => `${Math.round(Number(a))}`;
    export const max = (a: Type, b: Type): Type => `${Math.max(Number(a), Number(b))}`;
    export const min = (a: Type, b: Type): Type => `${Math.min(Number(a), Number(b))}`;

    export namespace Emptyable {
        export const asNumber = (v: EmptyOr<Type>) => (v === "" ? null : Number(v));
        export const coalesce = (a: EmptyOr<Type>, b: Type | number): Type => (a === "" ? `${b}` : a);
        export const round = (a: EmptyOr<Type>): EmptyOr<Type> => (a === "" ? "" : NumericString.round(a));
        export const max = (a: EmptyOr<Type>, b: EmptyOr<Type>): EmptyOr<Type> => (a === "" || b === "" ? "" : `${Math.max(Number(a), Number(b))}`);
        export const min = (a: EmptyOr<Type>, b: EmptyOr<Type>): EmptyOr<Type> => (a === "" || b === "" ? "" : `${Math.min(Number(a), Number(b))}`);
    }
}
