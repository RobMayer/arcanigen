import { SVGPath } from "../types";
import { EmptyOr } from "../util/misc";
import { Angle } from "./datatypes/angle";
import { Color } from "./datatypes/color";
import { Length } from "./datatypes/length";
import { NumericString } from "./datatypes/numericString";
import { Shape, GradientPaint } from "./shapeTypes";

/**
 * Registration surface (the ONLY two things you edit to add a datatype):
 *   - add the id to `ATOMIC_KINDS`
 *   - add its representation to `ATOMIC_REGISTRY` (keys guarded to stay in exact lockstep)
 * `stop:*`/`tokens:*` carry a `:` sublabel to mark them *atomic*, not constructor applications;
 * `array<K>` is the one constructor, derived structurally over any leaf (never hand-enumerated).
 *
 * Everything the rest of the app speaks is computed from those two and exposed as `DataTypes.*`:
 *   - `Kind`      — a datatype identity (`"point"`, `"array<layer>"`)
 *   - `TypeOf<K>` — the representation a Kind carries (`TypeOf<"point">` = `{ x; y }`)
 *   - `EvalOf<K>` / `AnyEval` — a resolved value, `{ kind, data }`
 */
export namespace DataTypes {
    const ATOMIC_KINDS = [
        "float",
        "integer",
        "string",
        "enum",
        "angle",
        "boolean",
        "length",
        "shape",
        "path",
        "color",
        "gradient",
        "distribution",
        "layer",
        "pathOp",
        "point",
        "sequence",
        "tokens:length",
        "stop:float",
        "stop:color",
        "stop:angle",
        "stop:integer",
        "stop:length",
    ] as const;

    /** The representation carried by each atomic leaf. Keys MUST match `ATOMIC_KINDS` (guarded below). */
    type ATOMIC_REGISTRY = {
        float: EmptyOr<NumericString.Type>;
        integer: EmptyOr<NumericString.Type>;
        string: string;
        enum: number;
        angle: EmptyOr<Angle.Type>;
        boolean: boolean;
        length: EmptyOr<Length.Type>;
        shape: Shape;
        path: SVGPath;
        color: Color.Type;
        gradient: GradientPaint;
        distribution: { func: number; easing: number; intensity: EmptyOr<NumericString.Type> };
        layer: { shape: Shape | null; enabled: boolean | null; blend: number | null };
        pathOp: { path: SVGPath | null; enabled: boolean | null; op: number | null };
        point: { x: number; y: number };
        sequence: { senderId: string; count: number };
        "tokens:length": string;
        "stop:float": { value: number | null; position: number | null; enabled: boolean | null };
        "stop:color": { value: Color.Type; position: number | null; enabled: boolean | null };
        "stop:angle": { value: number | null; position: number | null; enabled: boolean | null };
        "stop:integer": { value: number | null; position: number | null; enabled: boolean | null };
        "stop:length": { value: string | null; position: number | null; enabled: boolean | null };
    };

    export type AtomicKind = (typeof ATOMIC_KINDS)[number];

    // Compile-time guard: `ATOMIC_KINDS` and `ATOMIC_REGISTRY` must stay in exact lockstep.
    type _KeysMatch = [AtomicKind] extends [keyof ATOMIC_REGISTRY]
        ? [keyof ATOMIC_REGISTRY] extends [AtomicKind]
            ? true
            : ["ATOMIC_REGISTRY has keys missing from ATOMIC_KINDS"]
        : ["ATOMIC_KINDS has entries missing from ATOMIC_REGISTRY"];
    const _keysMatch: _KeysMatch = true;
    void _keysMatch;

    /** A datatype identity: an atomic leaf, or one `array<…>` level over a leaf. */
    export type Kind = AtomicKind | `array<${AtomicKind}>`;

    /** The representation a Kind carries; `array<K>` is `K`'s representation, arrayed — derived, not listed. */
    export type TypeOf<K extends Kind> = K extends `array<${infer Inner}>` ? (Inner extends AtomicKind ? ATOMIC_REGISTRY[Inner][] : never) : K extends AtomicKind ? ATOMIC_REGISTRY[K] : never;

    /** A resolved value: a Kind paired with its representation. */
    export type EvalOf<K extends Kind> = K extends Kind ? { kind: K; data: TypeOf<K> } : never;
    export type AnyEval = EvalOf<Kind>;

    /** Runtime enumeration of every kind (atomic + one `array<…>` level). */
    export const ALL_KINDS: readonly Kind[] = [...ATOMIC_KINDS, ...ATOMIC_KINDS.map((k) => `array<${k}>` as `array<${AtomicKind}>`)];
}
