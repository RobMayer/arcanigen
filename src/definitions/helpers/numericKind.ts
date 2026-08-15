import { Length } from "../datatypes/length";
import { Angle } from "../datatypes/angle";

// Shared inference for "universal" numeric fields: a single text field that accepts a plain number
// ("2", "0.5"), a length ("10px", "0.5mm"), or an angle ("30deg", "0.25turn") and reports which numeric
// KIND it holds. Used in three places that must agree: the field widget (validity), the signature solver
// (a disconnected field's kind drives the node's output type), and node evaluate (parse -> extractPair).
export namespace NumericKind {
    export type Kind = "integer" | "float" | "length" | "angle";

    // A plain, unit-less real number (optionally signed, decimal, or exponent form).
    const PLAIN = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

    // Infer the kind of a field string. `valid` is false for empty/garbage; kind then defaults to "float"
    // so callers have a safe fallback. A plain number is "float" when it carries a decimal point or
    // exponent, else "integer" -- honoring the user's written intent ("2" -> integer, "2.0" -> float).
    export const infer = (raw: string): { kind: Kind; valid: boolean } => {
        const s = raw.trim();
        if (s === "") return { kind: "float", valid: false };
        if (Length.is(s)) return { kind: "length", valid: true };
        if (Angle.is(s)) return { kind: "angle", valid: true };
        if (PLAIN.test(s)) return { kind: /[.eE]/.test(s) ? "float" : "integer", valid: true };
        return { kind: "float", valid: false };
    };

    // Just the kind, with the safe "float" fallback baked in -- for the solver / eval paths that only
    // need a kind to feed the type lattice.
    export const kindOf = (raw: string): Kind => infer(raw).kind;

    export const isValid = (raw: string): boolean => infer(raw).valid;
}
