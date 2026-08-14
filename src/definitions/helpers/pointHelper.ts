import { Enum } from "../datatypes/enum";
import { Length } from "../datatypes/length";
import { NumericString } from "../datatypes/numericString";
import { Angle } from "../datatypes/angle";
import { EmptyOr } from "../../util/misc";

export namespace PointHelper {
    export type Authoring = {
        mode: number;
        x: EmptyOr<Length.Type>;
        y: EmptyOr<Length.Type>;
        radius: EmptyOr<Length.Type>;
        theta: EmptyOr<Angle.Type>;
    };

    export const resolve = (mode: number, x: EmptyOr<Length.Type>, y: EmptyOr<Length.Type>, radius: EmptyOr<Length.Type>, theta: EmptyOr<Angle.Type>): { x: number; y: number } => {
        if (mode === Enum.Common.positionMode.POLAR.value) {
            const r = Length.Emptyable.asNumber(radius) ?? 0;
            const t = Angle.Emptyable.asNumber(theta) ?? 0;
            const rad = ((t - 90) * Math.PI) / 180;
            return { x: r * Math.cos(rad), y: r * Math.sin(rad) };
        }
        return { x: Length.Emptyable.asNumber(x) ?? 0, y: Length.Emptyable.asNumber(y) ?? 0 };
    };

    /** Resolve a whole authoring value (the shape `PointInput` edits) to concrete cartesian numbers. */
    export const fromAuthoring = (v: Authoring): { x: number; y: number } => resolve(v.mode, v.x, v.y, v.radius, v.theta);

    // Cartesian <-> polar at the raw-number level, sharing the primitive's convention: theta is in
    // degrees, 0deg points "up" (screen -Y) and increases clockwise. These are the currency of the
    // point-math nodes' polar-space ops (rotate/scale/displace/complex/polar-lerp).
    export const fromPolar = (radius: number, theta: number): { x: number; y: number } => {
        const rad = ((theta - 90) * Math.PI) / 180;
        return { x: radius * Math.cos(rad), y: radius * Math.sin(rad) };
    };

    // Degenerate point (on the pole) has no defined direction -> theta 0, the agreed fallback. Only
    // displace actually reads it there; scale/rotate/complex carry radius 0 back to the pole regardless.
    export const toPolar = (x: number, y: number): { radius: number; theta: number } => {
        if (x === 0 && y === 0) return { radius: 0, theta: 0 };
        return { radius: Math.hypot(x, y), theta: (Math.atan2(y, x) * 180) / Math.PI + 90 };
    };
}
