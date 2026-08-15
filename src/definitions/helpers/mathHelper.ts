import { DataTypes } from "../dataTypes";
import { Angle } from "../datatypes/angle";
import { Enum } from "../datatypes/enum";
import { Length } from "../datatypes/length";
import { NumericString } from "../datatypes/numericString";

// Extract a bare number from any dimensionless kind (float/integer/angle). Angle is unit-suffixed now, so
// it must go through Angle.parse (canonical degrees) rather than the plain NumericString path.
const asScalar = (kind: string, data: unknown): number => (kind === "angle" ? (Angle.Emptyable.asNumber(data as Angle.Type | "") ?? 0) : (NumericString.Emptyable.asNumber(data as NumericString.Type | "") ?? 0));

const PRIORITY: Record<string, number> = { integer: 0, float: 1, angle: 2, length: 3 };

export const dominantKind = (a: string, b: string): string => {
    return (PRIORITY[a] ?? 0) >= (PRIORITY[b] ?? 0) ? a : b;
};

// A dimensional value (length OR angle) as a number in its NATIVE unit; null for dimensionless kinds
// (float/integer). Angle is dimensional the same way length is -- its native unit (deg/rad/turn) is kept
// rather than collapsed to canonical degrees, so `0.25turn` stays a turn.
const parseDim = (kind: string, data: unknown): { num: number; unit: string } | null => {
    if (kind === "length") {
        const p = Length.parse(data as string);
        return p ? { num: p[0], unit: p[1] } : { num: 0, unit: "px" };
    }
    if (kind === "angle") {
        const p = Angle.parse(data as string);
        return p ? { num: p[0], unit: p[1] } : { num: 0, unit: "deg" };
    }
    return null;
};

export const extractPair = (aKind: string, aData: unknown, bKind: string, bData: unknown): { a: number; b: number; unit: string | null } => {
    const aDim = parseDim(aKind, aData);
    const bDim = parseDim(bKind, bData);

    // Both dimensionless (float/integer).
    if (!aDim && !bDim) {
        return { a: asScalar(aKind, aData), b: asScalar(bKind, bData), unit: null };
    }

    // Exactly one dimensional: the plain operand is taken as a raw number IN the dimensional operand's
    // unit, and that unit is preserved (so `0.25turn` + `0.5` = `0.75turn`, mirroring length + float).
    if (aDim && !bDim) {
        return { a: aDim.num, b: asScalar(bKind, bData), unit: aDim.unit };
    }
    if (!aDim && bDim) {
        return { a: asScalar(aKind, aData), b: bDim.num, unit: bDim.unit };
    }

    // Both dimensional. Same dimension -> convert B into A's unit. Cross-dimension (length vs angle) is
    // forbidden by the NUMERIC_ADDABLE lattice so it never reaches here; fall back safely if it does.
    if (aKind === bKind) {
        if (aKind === "length") {
            const bConv = Length.parse(Length.convert(bData as Length.Type, aDim!.unit as Length.Unit));
            return { a: aDim!.num, b: bConv ? bConv[0] : 0, unit: aDim!.unit };
        }
        const bConv = Angle.parse(Angle.convert(bData as Angle.Type, aDim!.unit as Angle.Unit));
        return { a: aDim!.num, b: bConv ? bConv[0] : 0, unit: aDim!.unit };
    }
    return { a: aDim!.num, b: 0, unit: aDim!.unit };
};

export const extractSingle = (kind: string, data: unknown): { value: number; unit: string | null } => {
    const dim = parseDim(kind, data);
    if (dim) return { value: dim.num, unit: dim.unit };
    return { value: asScalar(kind, data), unit: null };
};

export const wrapResult = (value: number, outputKind: string, unit: string | null): DataTypes.AnyEval => {
    switch (outputKind) {
        case "integer":
            return { kind: "integer", data: `${Math.trunc(value)}` };
        case "angle":
            return { kind: "angle", data: `${value}${unit ?? "deg"}` };
        case "length":
            return { kind: "length", data: `${value}${unit ?? "px"}` };
        case "float":
        default:
            return { kind: "float", data: `${value}` };
    }
};

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
