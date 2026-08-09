import { Enum } from "../datatypes/enum";
import { Length } from "../datatypes/length";
import { NumericString } from "../datatypes/numericString";
import { Angle } from "../datatypes/angle";
import { EmptyOr } from "../../util/misc";

/**
 * Point authoring: the payload-side shape used to *edit* a point (a mode plus both a Cartesian and
 * a Polar pair), and the resolver that collapses it to the `point` datatype's `{ x, y }`.
 *
 * The rich fields live in node payloads (the single Point node, and each `array<point>` builder
 * row) so editing never re-derives a value under the user; only `{ x, y }` flows on the wire.
 */
export namespace Point {
    export type Authoring = {
        mode: number;
        x: EmptyOr<Length.Type>;
        y: EmptyOr<Length.Type>;
        radius: EmptyOr<Length.Type>;
        theta: EmptyOr<Angle.Type>;
    };

    /** Collapse authoring fields (Cartesian or Polar) to a concrete `{ x, y }`. */
    export const resolve = (mode: number, x: EmptyOr<Length.Type>, y: EmptyOr<Length.Type>, radius: EmptyOr<Length.Type>, theta: EmptyOr<Angle.Type>): { x: number; y: number } => {
        if (mode === Enum.Common.positionMode.POLAR.value) {
            const r = Length.Emptyable.asNumber(radius) ?? 0;
            const t = NumericString.Emptyable.asNumber(theta) ?? 0;
            // 0° at the top (12 o'clock), CW positive — same convention as Transforms position.
            const rad = ((t - 90) * Math.PI) / 180;
            return { x: r * Math.cos(rad), y: r * Math.sin(rad) };
        }
        return { x: Length.Emptyable.asNumber(x) ?? 0, y: Length.Emptyable.asNumber(y) ?? 0 };
    };
}
