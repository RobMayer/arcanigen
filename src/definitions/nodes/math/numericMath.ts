import { DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Enum } from "../../datatypes/enum";
import { Length } from "../../datatypes/length";
import { NumericString } from "../../datatypes/numericString";

// --- Constants ---

const PRIORITY: Record<string, number> = { integer: 0, float: 1, angle: 2, length: 3 };

/** All four numeric data types (disjunctive — could narrow to any one) */
export const NUMERIC_TYPES: SocketTypes.SocketRule = { types: ["angle", "float", "integer", "length"], mode: "or" };

/** Numeric types excluding length (when angle is connected) */
export const WITHOUT_LENGTH: SocketTypes.SocketRule = { types: ["angle", "float", "integer"], mode: "or" };

/** Numeric types excluding angle (when length is connected) */
export const WITHOUT_ANGLE: SocketTypes.SocketRule = { types: ["float", "integer", "length"], mode: "or" };

// --- Type helpers for lifecycle hooks ---

/**
 * Query the OUT type of the upstream node connected to one of our IN sockets.
 * Returns NONE if nothing is connected.
 */
export const queryUpstreamOutType = (node: NodeDefinitions.NodeFor<NodeDefinitions.Any>, socketId: string, graphId: string, ctx: NodeTypes.MethodContext): SocketTypes.SocketRule => {
    const linkId = (node.in as Record<string, string | null>)[socketId];
    if (!linkId) return SocketTypes.NONE;
    const link = ctx.getLink(graphId, linkId);
    if (!link) return SocketTypes.NONE;
    const neighbor = ctx.getNode(graphId, link.fromNode);
    if (!neighbor) return SocketTypes.NONE;
    return NodeTypes.getSocketType(neighbor, link.fromSocket, "out", ctx);
};

/** Dimensionless numeric types (float and integer only) */
export const DIMENSIONLESS: SocketTypes.SocketRule = { types: ["float", "integer"], mode: "or" };

// --- Constraint computation ---

/**
 * Given what's connected on one side, compute what types the *partner* socket can accept.
 * If the connected side includes angle, exclude length from partner (and vice versa).
 * Used by additive operations (add, subtract, min, max, clamp, lerp).
 */
export const constrainForPartner = (connectedType: SocketTypes.SocketRule): SocketTypes.SocketRule => {
    if (connectedType.types.length === 0) return NUMERIC_TYPES;
    const hasAngle = connectedType.types.includes("angle");
    const hasLength = connectedType.types.includes("length");
    if (hasAngle && !hasLength) return SocketTypes.intersect(NUMERIC_TYPES, WITHOUT_LENGTH);
    if (hasLength && !hasAngle) return SocketTypes.intersect(NUMERIC_TYPES, WITHOUT_ANGLE);
    // both or neither — no additional constraint
    return NUMERIC_TYPES;
};

/**
 * Stricter constraint for multiplicative operations (multiply, divide, modulo, remainder).
 * If the partner has angle or length, restrict to float/integer only — you can scale
 * a dimensional value by a scalar, but can't multiply two dimensional values together.
 */
export const constrainForPartnerMultiplicative = (connectedType: SocketTypes.SocketRule): SocketTypes.SocketRule => {
    if (connectedType.types.length === 0) return NUMERIC_TYPES;
    const hasAngle = connectedType.types.includes("angle");
    const hasLength = connectedType.types.includes("length");
    if (hasAngle || hasLength) return DIMENSIONLESS;
    return NUMERIC_TYPES;
};

/**
 * Returns whichever kind has higher priority.
 * Priority: length > angle > float > integer
 */
export const dominantKind = (a: string, b: string): string => {
    return (PRIORITY[a] ?? 0) >= (PRIORITY[b] ?? 0) ? a : b;
};

/**
 * Compute the set of possible output types given the two input type rules.
 * Cartesian product of possible input kinds → union of dominantKind results.
 */
export const computeOutputType = (aRule: SocketTypes.SocketRule, bRule: SocketTypes.SocketRule): SocketTypes.SocketRule => {
    if (aRule.types.length === 0 || bRule.types.length === 0) return NUMERIC_TYPES;
    const result = new Set<DataTypes.Kind>();
    for (const a of aRule.types) {
        for (const b of bRule.types) {
            result.add(dominantKind(a, b) as DataTypes.Kind);
        }
    }
    return { types: [...result].sort(), mode: "or" };
};

// --- Backward propagation ---

/** For a given output kind, what input types can participate in producing it? */
const INVERT_DOMINANT: Record<string, DataTypes.Kind[]> = {
    integer: ["integer"],
    float: ["float", "integer"],
    angle: ["angle", "float", "integer"],
    length: ["float", "integer", "length"],
};

/**
 * Given what the downstream consumers accept (resolvedInTypes) and the partner's
 * connected type, compute what input types are allowed.
 *
 * When partner is known: for each accepted output kind, find input kinds K where
 * there exists a partner kind P such that dominantKind(K, P) produces that output.
 *
 * When partner is unknown (NONE): uses INVERT_DOMINANT as a looser approximation.
 */
export const constrainForOutput = (resolvedInTypes: SocketTypes.SocketRule, partnerType: SocketTypes.SocketRule): SocketTypes.SocketRule => {
    const numericIn = SocketTypes.intersect(resolvedInTypes, NUMERIC_TYPES);
    if (numericIn.types.length === 0) return NUMERIC_TYPES; // no numeric constraint
    const partnerKnown = partnerType.types.length > 0;
    const allowed = new Set<DataTypes.Kind>();
    for (const outKind of numericIn.types) {
        if (partnerKnown) {
            // Precise: check each candidate against actual partner kinds
            for (const k of NUMERIC_TYPES.types) {
                for (const p of partnerType.types) {
                    if (isForbidden(k, p)) continue;
                    if (dominantKind(k, p) === outKind) {
                        allowed.add(k);
                    }
                }
            }
        } else {
            // Loose: no partner info, use precomputed inversion
            for (const k of INVERT_DOMINANT[outKind] ?? NUMERIC_TYPES.types) {
                allowed.add(k);
            }
        }
    }
    return { types: ([...allowed] as DataTypes.Kind[]).sort(), mode: "or" };
};

/** Returns true if the pair is forbidden (angle + length) */
const isForbidden = (a: string, b: string): boolean => {
    return (a === "angle" && b === "length") || (a === "length" && b === "angle");
};

// --- Evaluation helpers ---

/**
 * Extract a pair of raw numbers from two resolved values, handling length unit conversion.
 * Returns the numeric values and the reference unit (if any length is involved).
 */
export const extractPair = (aKind: string, aData: unknown, bKind: string, bData: unknown): { a: number; b: number; unit: Length.Unit | null } => {
    const aIsLength = aKind === "length";
    const bIsLength = bKind === "length";

    if (!aIsLength && !bIsLength) {
        // Both are dimensionless (float, integer, angle)
        return {
            a: NumericString.Emptyable.asNumber(aData as NumericString.Type | "") ?? 0,
            b: NumericString.Emptyable.asNumber(bData as NumericString.Type | "") ?? 0,
            unit: null,
        };
    }

    if (aIsLength && !bIsLength) {
        const parsed = Length.parse(aData as string);
        return {
            a: parsed ? parsed[0] : 0,
            b: NumericString.Emptyable.asNumber(bData as NumericString.Type | "") ?? 0,
            unit: parsed ? parsed[1] : "px",
        };
    }

    if (!aIsLength && bIsLength) {
        const parsed = Length.parse(bData as string);
        return {
            a: NumericString.Emptyable.asNumber(aData as NumericString.Type | "") ?? 0,
            b: parsed ? parsed[0] : 0,
            unit: parsed ? parsed[1] : "px",
        };
    }

    // Both are length — convert B to A's unit
    const parsedA = Length.parse(aData as string);
    const parsedB = Length.parse(bData as string);
    if (!parsedA || !parsedB) {
        return { a: 0, b: 0, unit: "px" };
    }
    const unit = parsedA[1];
    // Convert B to A's unit
    const bConverted = Length.parse(Length.convert(bData as Length.Type, unit));
    return {
        a: parsedA[0],
        b: bConverted ? bConverted[0] : 0,
        unit,
    };
};

/**
 * Extract a single raw number from a resolved value, handling length unit extraction.
 */
export const extractSingle = (kind: string, data: unknown): { value: number; unit: Length.Unit | null } => {
    if (kind === "length") {
        const parsed = Length.parse(data as string);
        return { value: parsed ? parsed[0] : 0, unit: parsed ? parsed[1] : "px" };
    }
    return { value: NumericString.Emptyable.asNumber(data as NumericString.Type | "") ?? 0, unit: null };
};

/**
 * Wrap a computed number back into the appropriate AnyEval for the output kind.
 */
export const wrapResult = (value: number, outputKind: string, unit: Length.Unit | null): DataTypes.AnyEval => {
    switch (outputKind) {
        case "integer":
            return { kind: "integer", data: `${Math.trunc(value)}` };
        case "angle":
            return { kind: "angle", data: `${value}` };
        case "length":
            return { kind: "length", data: `${value}${unit ?? "px"}` };
        case "float":
        default:
            return { kind: "float", data: `${value}` };
    }
};

/**
 * Apply a rounding mode to a number. Used by round node and integer cast.
 */
export const applyRounding = (value: number, mode: number): number => {
    switch (mode) {
        case Enum.Common.roundingMode.CEIL.value:
            return Math.ceil(value);
        case Enum.Common.roundingMode.FLOOR.value:
            return Math.floor(value);
        case Enum.Common.roundingMode.TRUNCATE.value:
            return Math.trunc(value);
        case Enum.Common.roundingMode.EXPAND.value:
            return value >= 0 ? Math.ceil(value) : Math.floor(value);
        case Enum.Common.roundingMode.HALF_CEIL.value:
            return Math.round(value);
        case Enum.Common.roundingMode.HALF_FLOOR.value:
            return -Math.round(-value);
        case Enum.Common.roundingMode.HALF_TRUNCATE.value: {
            const abs = Math.abs(value);
            const frac = abs - Math.floor(abs);
            if (frac === 0.5) return value >= 0 ? Math.floor(value) : Math.ceil(value);
            return Math.round(value);
        }
        case Enum.Common.roundingMode.HALF_EXPAND.value: {
            const abs = Math.abs(value);
            const frac = abs - Math.floor(abs);
            if (frac === 0.5) return value >= 0 ? Math.ceil(value) : Math.floor(value);
            return Math.round(value);
        }
        default:
            return Math.round(value);
    }
};
