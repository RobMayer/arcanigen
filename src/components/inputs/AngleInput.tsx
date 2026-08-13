import styled from "styled-components";
import { AbstractInput } from "../abstract/Inputs";
import { AbstractSlider } from "../abstract/Slider";
import { Ref, useCallback, useEffect, useRef, useState } from "react";
import { Flavour } from "../types";
import { NumericString } from "../../definitions/datatypes/numericString";
import { Angle } from "../../definitions/datatypes/angle";
import { EmptyOr } from "../../util/misc";
import { IconDefinition } from "../Icon";
import { useStable } from "../../util/hooks/useStable";
import { COMMON_STYLES } from "../styles";
import { DivProps } from "../../types";

const BaseInput = styled(AbstractInput.Measurement<Angle.Unit>)`
    ${COMMON_STYLES.INPUT}
`;

const BaseSlider = styled(AbstractSlider.Radial)`
    ${COMMON_STYLES.SLIDER}
`;

const BaseCombined = styled.div`
    display: flex;
    gap: 4px;
    flex: 1 1 0;
    min-width: 0;
    align-items: center;
    & > [data-part="slider"] {
        flex: 0 0 7em;
    }
    & > [data-part="input"] {
        flex: 1 1 0;
        width: 0;
        min-width: 0;
    }
`;

// A snap/step spec: a bare number (interpreted as degrees) or a dimensioned angle.
type SpacingArg = number | EmptyOr<Angle.Type>;
type SnapArg = SpacingArg | SpacingArg[];

// Decimal places the WHEEL rounds its output to, so dragging can't emit float garbage like "0.5123109879deg".
// Only the wheel rounds; typed values are left exactly as the user entered them.
const DEFAULT_PRECISION = 4;

// The wheel and the Measurement text field both pivot through degrees (the canonical unit); this converter maps
// degrees <-> the value's own unit for the text field, and the same conversion is used for the wheel below.
const CONVERTER: AbstractInput.Measurement.Converter<Angle.Unit> = {
    deg: { from: (value) => Angle.asNumber(value), to: (deg) => `${deg}deg` },
    rad: { from: (value) => Angle.asNumber(value), to: (deg) => `${(deg * Math.PI) / 180}rad` },
    turn: { from: (value) => Angle.asNumber(value), to: (deg) => `${deg / 360}turn` },
};

const unitOf = (value: EmptyOr<Angle.Type>): Angle.Unit => Angle.Emptyable.parse(value)?.[1] ?? "deg";

// value -> the degrees number the wheel spins.
const toDegString = (value: EmptyOr<Angle.Type>): EmptyOr<NumericString.Type> => (value === "" ? "" : (`${Angle.asNumber(value)}` as NumericString.Type));

// The wheel's degrees number -> an Angle.Type in `unit`, rounded to `precision` decimals in that unit.
const fromDeg = (deg: EmptyOr<NumericString.Type>, unit: Angle.Unit, precision: number): EmptyOr<Angle.Type> => {
    if (deg === "") return "";
    const parsed = Angle.parse(Angle.convert(`${Number(deg)}deg`, unit))!;
    const factor = 10 ** precision;
    return `${Math.round(parsed[0] * factor) / factor}${parsed[1]}`;
};

// min/max: a bare number is DEGREES (how call sites author bounds, e.g. -360..360); a dimensioned angle uses its
// own value. asMeasure feeds the Angle-typed text field; asDegNumber feeds the degrees-domain wheel.
const asMeasure = (v: number | EmptyOr<Angle.Type> | undefined): EmptyOr<Angle.Type> | undefined => {
    if (v === undefined) return undefined;
    if (typeof v === "number") return `${v}deg`;
    return v;
};
const asDegNumber = (v: number | EmptyOr<Angle.Type> | undefined): number | undefined => {
    if (v === undefined || v === "") return undefined;
    return typeof v === "number" ? v : Angle.asNumber(v);
};

// snap/step: normalize each spec to a degrees magnitude, so BOTH halves snap on the same (degree) grid and can't
// disagree. The wheel takes plain degree numbers; the text field takes "<deg>deg" so its Measurement snapper
// grids in canonical degrees too (a bare number there would otherwise be read in the display unit).
const oneDeg = (v: SpacingArg): number | undefined => (typeof v === "number" ? v : v === "" ? undefined : Angle.asNumber(v));
const wheelSnap = (snap: SnapArg | undefined): number | number[] | undefined => {
    if (snap === undefined) return undefined;
    if (Array.isArray(snap)) return snap.map(oneDeg).filter((n): n is number => n !== undefined);
    return oneDeg(snap);
};
const textSnap = (snap: SnapArg | undefined): Angle.Type | Angle.Type[] | undefined => {
    if (snap === undefined) return undefined;
    const toMeasure = (v: SpacingArg): Angle.Type | undefined => {
        const d = oneDeg(v);
        return d === undefined ? undefined : `${d}deg`;
    };
    if (Array.isArray(snap)) return snap.map(toMeasure).filter((m): m is Angle.Type => m !== undefined);
    return toMeasure(snap);
};
const textStep = (step: SpacingArg | undefined): Angle.Type | undefined => {
    const d = step === undefined ? undefined : oneDeg(step);
    return d === undefined ? undefined : `${d}deg`;
};

export function AngleInput({ unbound, min = unbound ? undefined : 0, max = unbound ? undefined : 360, snap, step, flavour, ...props }: AngleInput.Props) {
    return (
        <BaseInput
            {...props}
            units={Angle.UNITS}
            defaultUnit={"deg"}
            converter={CONVERTER}
            wrap={unbound ? undefined : "360deg"}
            min={asMeasure(min)}
            max={asMeasure(max)}
            snap={textSnap(snap)}
            step={textStep(step)}
            data-flavour={flavour}
        />
    );
}

export namespace AngleInput {
    export type Props = Omit<AbstractInput.Measurement.Props<Angle.Unit>, "units" | "defaultUnit" | "converter" | "wrap" | "min" | "max" | "snap" | "step"> & {
        unbound?: boolean;
        min?: number | EmptyOr<Angle.Type>;
        max?: number | EmptyOr<Angle.Type>;
        snap?: SnapArg;
        step?: SpacingArg;
        flavour?: Flavour;
    };

    export function Slider({ value, onValue, onCommit, min = 0, max = 360, snap, step, precision = DEFAULT_PRECISION, unbound, flavour, ...props }: Slider.Props) {
        const unit = unitOf(value);
        const onValueRef = useStable(onValue);
        const onCommitRef = useStable(onCommit);

        const handleValue = useCallback((deg: NumericString.Type) => onValueRef.current?.(fromDeg(deg, unit, precision)), [unit, precision]);
        const handleCommit = useCallback((deg: NumericString.Type) => onCommitRef.current?.(fromDeg(deg, unit, precision)), [unit, precision]);

        return (
            <BaseSlider
                {...props}
                value={toDegString(value)}
                onValue={handleValue}
                onCommit={handleCommit}
                wrap={unbound ? undefined : 360}
                min={asDegNumber(min)}
                max={asDegNumber(max)}
                snap={wheelSnap(snap)}
                step={oneDeg(step ?? "")}
                data-flavour={flavour}
            />
        );
    }
    export namespace Slider {
        export type Props = Omit<AbstractSlider.Radial.Props, "wrap" | "value" | "onValue" | "onCommit" | "min" | "max" | "snap" | "step"> & {
            value: EmptyOr<Angle.Type>;
            onValue?: (n: EmptyOr<Angle.Type>) => void;
            onCommit?: (n: EmptyOr<Angle.Type>) => void;
            min?: number | EmptyOr<Angle.Type>;
            max?: number | EmptyOr<Angle.Type>;
            snap?: SnapArg;
            step?: SpacingArg;
            precision?: number;
            unbound?: boolean;
            flavour?: Flavour;
        };
    }

    export function SliderInput({
        value,
        onValue,
        onCommit,
        onConfirm,
        normalize,
        step,
        sliderRef,
        inputRef,
        flavour = "accent",
        unbound,
        min = unbound ? undefined : 0,
        max = unbound ? undefined : 360,
        snap,
        precision = DEFAULT_PRECISION,
        required,
        ref,
        icon,
        disabled,
        ...props
    }: SliderInput.Props) {
        const onValueRef = useStable(onValue);
        const onCommitRef = useStable(onCommit);
        const onConfirmRef = useStable(onConfirm);

        const [cache, setCache] = useState<EmptyOr<Angle.Type>>(value);
        const cacheRef = useRef(cache);
        cacheRef.current = cache;
        useEffect(() => {
            setCache(value);
        }, [value]);

        // Both halves read/write `cache`, so they never desync. Typed values pass through untouched; only the
        // wheel rounds (to `precision`) since it's the source of the float noise.
        const handleValue = useCallback((v: EmptyOr<Angle.Type>) => {
            onValueRef.current?.(v);
            setCache(v);
        }, []);
        const handleCommit = useCallback((v: EmptyOr<Angle.Type>) => {
            onCommitRef.current?.(v);
            setCache(v);
        }, []);
        const handleConfirm = useCallback((v: EmptyOr<Angle.Type>) => {
            onConfirmRef.current?.(v);
            setCache(v);
        }, []);

        // The wheel spins degrees; convert back into the value's current unit, rounded to precision.
        const handleWheelValue = useCallback((deg: NumericString.Type) => handleValue(fromDeg(deg, unitOf(cacheRef.current), precision)), [handleValue, precision]);
        const handleWheelCommit = useCallback((deg: NumericString.Type) => handleCommit(fromDeg(deg, unitOf(cacheRef.current), precision)), [handleCommit, precision]);

        return (
            <BaseCombined ref={ref} data-flavour={flavour} {...props}>
                <BaseSlider
                    data-part={"slider"}
                    ref={sliderRef}
                    wrap={unbound ? undefined : 360}
                    min={asDegNumber(min)}
                    max={asDegNumber(max)}
                    data-flavour={"inherit"}
                    onValue={handleWheelValue}
                    onCommit={handleWheelCommit}
                    value={toDegString(cache)}
                    icon={icon}
                    normalize={normalize}
                    step={oneDeg(step ?? "")}
                    disabled={disabled}
                    snap={wheelSnap(snap)}
                />
                <BaseInput
                    data-part={"input"}
                    ref={inputRef}
                    units={Angle.UNITS}
                    defaultUnit={"deg"}
                    converter={CONVERTER}
                    wrap={unbound ? undefined : "360deg"}
                    min={asMeasure(min)}
                    max={asMeasure(max)}
                    data-flavour={"inherit"}
                    onValue={handleValue}
                    onCommit={handleCommit}
                    onConfirm={handleConfirm}
                    value={cache}
                    snap={textSnap(snap)}
                    step={textStep(step)}
                    required={required}
                    disabled={disabled}
                />
            </BaseCombined>
        );
    }

    export namespace SliderInput {
        export type Props = DivProps & {
            value: EmptyOr<Angle.Type>;
            onValue?: (n: EmptyOr<Angle.Type>) => void;
            onCommit?: (n: EmptyOr<Angle.Type>) => void;
            onConfirm?: (n: EmptyOr<Angle.Type>) => void;
            min?: number | EmptyOr<Angle.Type>;
            max?: number | EmptyOr<Angle.Type>;
            step?: SpacingArg;
            normalize?: (v: EmptyOr<NumericString.Type>) => EmptyOr<NumericString.Type>;
            icon?: IconDefinition;
            disabled?: boolean;
            handleRef?: Ref<HTMLDivElement>;
            // Bare number = degrees; dimensioned angle = its own value. A single value is a grid step; an array is a set of discrete targets.
            snap?: SnapArg;
            precision?: number;
            inputRef?: Ref<HTMLInputElement>;
            sliderRef?: Ref<HTMLDivElement>;
            unbound?: boolean;
            required?: boolean;
            flavour?: Flavour;
        };
    }
}
