import { Length } from "../datatypes/length";
import { Angle } from "../datatypes/angle";

// Shared inference for "universal" numeric fields: a single text field that accepts a plain number
// ("2", "0.5"), a length ("10px", "0.5mm"), or an angle ("30deg", "0.25turn") and reports which numeric
// KIND it holds. Used in three places that must agree: the field widget (validity), the signature solver
// (a disconnected field's kind drives the node's output type), and node evaluate (parse -> extractPair).
export namespace NumericKind {
    export type Kind = "integer" | "float" | "length" | "angle";

    // Regex SOURCES (no anchors), shared so the field `pattern`, `infer`, and everything else agree.
    // A plain, unit-less real number (optionally signed, decimal, or exponent form); or a number carrying
    // one of the known length/angle units.
    const PLAIN_SRC = "[+-]?(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][+-]?\\d+)?";
    const UNIT_SRC = `[+-]?\\d*\\.?\\d+(?:${[...Length.UNITS, ...Angle.UNITS].join("|")})`;
    const PLAIN = new RegExp(`^${PLAIN_SRC}$`);

    // Feed to a text input's native `pattern` so a universal field rejects arbitrary strings -- accepts
    // exactly what `infer` calls valid (plain number, or number + length/angle unit). Stays in lock-step
    // with `infer` because both derive from the same unit lists.
    export const PATTERN = `(?:${PLAIN_SRC}|${UNIT_SRC})`;

    // Restricted pattern for fields that accept an ANGLE or a bare number but NOT a length (e.g. sin/cos/tan
    // inputs -- a bare number is radians, a "30deg" is an angle; "10mm" is meaningless). `kindOf` is safe as
    // the resolver here since this pattern already rejects lengths, so it never returns "length".
    export const ANGLE_PATTERN = `(?:${PLAIN_SRC}|[+-]?\\d*\\.?\\d+(?:${Angle.UNITS.join("|")}))`;

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

    // Resolver for angle-domain fields (sin/cos/tan): infers only angle/float/integer, never length -- so it
    // satisfies a `$.defaulted($.oneOf("angle","float","integer"), ...)` domain. Pair with ANGLE_PATTERN,
    // which already rejects length input.
    export const angleKindOf = (raw: string): "angle" | "float" | "integer" => {
        const s = raw.trim();
        if (Angle.is(s)) return "angle";
        return /[.eE]/.test(s) ? "float" : "integer";
    };
}
