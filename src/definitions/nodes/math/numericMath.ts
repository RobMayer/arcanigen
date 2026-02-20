import { DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
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

// --- Constraint computation ---

/**
 * Given what's connected on one side, compute what types the *partner* socket can accept.
 * If the connected side includes angle, exclude length from partner (and vice versa).
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
    return { types: [...result].sort() as DataTypes.Kind[], mode: "or" };
};

// --- Evaluation helpers ---

/**
 * Extract a pair of raw numbers from two resolved values, handling length unit conversion.
 * Returns the numeric values and the reference unit (if any length is involved).
 */
export const extractPair = (
    aKind: string,
    aData: unknown,
    bKind: string,
    bData: unknown,
): { a: number; b: number; unit: Length.Unit | null } => {
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
 * Wrap a computed number back into the appropriate AnyEval for the output kind.
 */
export const wrapResult = (value: number, outputKind: string, unit: Length.Unit | null): DataTypes.AnyEval => {
    switch (outputKind) {
        case "integer":
            return { kind: "integer", data: `${Math.trunc(value)}` as `${number}` };
        case "angle":
            return { kind: "angle", data: `${value}` as `${number}` };
        case "length":
            return { kind: "length", data: `${value}${unit ?? "px"}` as Length.Type };
        case "float":
        default:
            return { kind: "float", data: `${value}` as `${number}` };
    }
};
