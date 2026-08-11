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
            const t = NumericString.Emptyable.asNumber(theta) ?? 0;
            const rad = ((t - 90) * Math.PI) / 180;
            return { x: r * Math.cos(rad), y: r * Math.sin(rad) };
        }
        return { x: Length.Emptyable.asNumber(x) ?? 0, y: Length.Emptyable.asNumber(y) ?? 0 };
    };
}
