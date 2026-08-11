import { DataTypes } from "../dataTypes";
import { Enum } from "../datatypes/enum";
import { Length } from "../datatypes/length";
import { NumericString } from "../datatypes/numericString";

const PRIORITY: Record<string, number> = { integer: 0, float: 1, angle: 2, length: 3 };

export const dominantKind = (a: string, b: string): string => {
    return (PRIORITY[a] ?? 0) >= (PRIORITY[b] ?? 0) ? a : b;
};

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
    const bConverted = Length.parse(Length.convert(bData as Length.Type, unit));
    return {
        a: parsedA[0],
        b: bConverted ? bConverted[0] : 0,
        unit,
    };
};

export const extractSingle = (kind: string, data: unknown): { value: number; unit: Length.Unit | null } => {
    if (kind === "length") {
        const parsed = Length.parse(data as string);
        return { value: parsed ? parsed[0] : 0, unit: parsed ? parsed[1] : "px" };
    }
    return { value: NumericString.Emptyable.asNumber(data as NumericString.Type | "") ?? 0, unit: null };
};

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
