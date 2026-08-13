import { SVGPath } from "../types";
import { EmptyOr } from "../util/misc";
// Representation imports are aliased `*Rep` -- their bare names (Angle/Color/Length/Shape) collide with the
// derived kind TYPES declared inside the namespace below, which would otherwise shadow them.
import { Angle as AngleRep } from "./datatypes/angle";
import { Color as ColorRep } from "./datatypes/color";
import { Length as LengthRep } from "./datatypes/length";
import { NumericString } from "./datatypes/numericString";
import { Shape as ShapeRep, GradientPaint } from "./shapeTypes";

/**
 * The datatype layer. A Kind is a type-level CONSTRUCTOR (`ArrayOf<LoopFor<Color>>`), not a string --
 * recursion lives in generic instantiation (no TS2456 circular-alias wall) and stays closed + precise.
 * Two faces of one system:
 *   - TYPE face: the `Atomic`/`ArrayOf`/`LoopFor` constructors + `Kind`/`TypeOf`/`EvalOf`/`TagOf` (compile-time).
 *   - VALUE face: kind TOKENS (`FLOAT`, `arrayOf(LAYER)`) carrying the runtime tag string + a phantom of their
 *     constructor. Named TYPES are DERIVED from the tokens (`type Float = KindOf<typeof FLOAT>`), so a kind is
 *     authored once, on the token line.
 *
 * The runtime `{ kind, data }` tag is a ONE-WAY derived string (`TagOf`) -- produced by node code (hardcode /
 * concat), NEVER parsed back. There is deliberately no string -> Kind path (`socketTypes.parse` is likewise gone).
 *
 * Registration surface (the ONLY things you edit to add a datatype): add the id to `ATOMIC_KINDS`, add its
 * representation to `ATOMIC_REGISTRY` (keys guarded to stay in lockstep), then add its `atomicToken` + derived
 * type in the two blocks below. `array<K>` / `loopFor<K>` are the constructors, applied over any Kind.
 */

// Symbol-keyed so a Kind is UN-FORGEABLE: a hand-rolled `{ KIND: "garbage", TYPE: {...} }` cannot satisfy
// `AnyKind` (it lacks these private symbols), which kills the "malformed kind that type-checks but breaks at
// runtime" bug class. Intentional -- do NOT swap to plain string keys.
const KIND = Symbol();
const TYPE = Symbol();

export namespace DataTypes {
    // --- Registration surface -------------------------------------------------------------------
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
        angle: EmptyOr<AngleRep.Type>;
        boolean: boolean;
        length: EmptyOr<LengthRep.Type>;
        shape: ShapeRep;
        path: SVGPath;
        color: ColorRep.Type;
        gradient: GradientPaint;
        distribution: { func: number; easing: number; intensity: EmptyOr<NumericString.Type> };
        layer: { shape: ShapeRep | null; enabled: boolean | null; blend: number | null };
        pathOp: { path: SVGPath | null; enabled: boolean | null; op: number | null };
        point: { x: number; y: number };
        sequence: { senderId: string; count: number };
        "tokens:length": string;
        "stop:float": { value: number | null; position: number | null; enabled: boolean | null };
        "stop:color": { value: ColorRep.Type; position: number | null; enabled: boolean | null };
        "stop:angle": { value: string | null; position: number | null; enabled: boolean | null };
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

    // --- Constructor kinds (the TYPE face) ------------------------------------------------------

    /** Every kind carries a runtime tag (`KIND`) and its representation (`TYPE`). */
    export interface AnyKind {
        readonly [KIND]: string;
        readonly [TYPE]: unknown;
    }

    /** Atomic kind -- representation sourced straight from `ATOMIC_REGISTRY` (no duplication). Exported so
     *  the signature builder can turn a bare atomic-kind string into its constructor (the one string->ctor
     *  step, which must live here where the brand symbols + registry are in scope). */
    export type Atomic<Id extends AtomicKind> = { [KIND]: Id; [TYPE]: ATOMIC_REGISTRY[Id] };

    /** Constructors -- parameterized by an inner kind; recursion via instantiation, not string parsing. */
    export type ArrayOf<X extends AnyKind> = { [KIND]: `array<${X[typeof KIND]}>`; [TYPE]: X[typeof TYPE][] };
    export type LoopFor<X extends AnyKind> = { [KIND]: `loopFor<${X[typeof KIND]}>`; [TYPE]: { senderId: string; count: number } };

    /** A datatype identity: anything satisfying the base constructor shape. */
    export type Kind = AnyKind;

    /** The representation a Kind carries -- a field read now, no parsing. */
    export type TypeOf<K extends AnyKind> = K[typeof TYPE];

    /** A resolved value: a Kind paired with its representation. DISTRIBUTIVE so `if (v.kind === X)` narrows
     *  `v.data` (a discriminated union over the kind tag) -- what `resolve<A | B>` consumers rely on. */
    export type EvalOf<K extends AnyKind> = K extends AnyKind ? { kind: K[typeof KIND]; data: K[typeof TYPE] } : never;

    /** Every concrete kind (atomics + one `array<…>` level), as a DISTRIBUTIVE union of constructors. This
     *  is the enumeration a tagged `{ kind, data }` value needs: `resolve`/`getInput` default to it (bare, no
     *  type-arg), so a resolved value of unknown kind is a discriminated union and `if (v.kind === X)` narrows
     *  `v.data`. (`AtomicKind` is a union; the `infer Id` dance distributes `Atomic`/`ArrayOf` over each leaf
     *  — a plain `Atomic<AtomicKind>` would collapse to one object with union fields, which does NOT narrow.) */
    export type ConcreteKind = AtomicKind extends infer Id ? (Id extends AtomicKind ? Atomic<Id> | ArrayOf<Atomic<Id>> : never) : never;

    /** The type an `evaluate` RETURNS — loose, because a node's output kind/tag is often computed at runtime
     *  (coercion helpers, dynamic ctors). Consumption-side narrowing does NOT come from here; it comes from
     *  `resolve`/`getInput` defaulting their type-arg to `ConcreteKind` (the narrowable discriminated union). */
    export type AnyEval = { kind: string; data: unknown };

    /** The runtime tag, derived ONE-WAY from the constructor. There is deliberately no inverse. */
    export type TagOf<K extends AnyKind> = K[typeof KIND];

    // --- Token layer (the VALUE face) -----------------------------------------------------------

    /** A runtime kind token: the derived tag + its STRUCTURE (`ctor`/`inner`, present on constructor tokens)
     *  + a phantom carrier of its constructor type `K`. The structure lets `socketTypes.of` translate a token
     *  into a structured `Term` directly -- never flattening to a string and re-parsing it at the bridge. */
    export interface Token<K extends AnyKind> {
        readonly tag: TagOf<K>; // runtime: the derived tag string ("float", "array<color>", ...)
        readonly ctor?: "array" | "loopFor"; // present on constructor tokens
        readonly inner?: Token<AnyKind>; // the inner token of a constructor token
        readonly _k?: K; // phantom (compile-time only) -- lets `KindOf<typeof x>` recover the constructor
    }
    /** Recover the constructor type from a token: `KindOf<typeof FLOAT>` = `Atomic<"float">`. */
    export type KindOf<T> = T extends Token<infer K> ? K : never;

    // Makers. `atomicToken` is cast-free; the ctor makers assert their return -- the one spot runtime meets
    // the phantom types (they've built the tag + structure correctly), same move as `$.arrayOf`.
    const atomicToken = <Id extends AtomicKind>(id: Id): Token<Atomic<Id>> => ({ tag: id });
    export const arrayOf = <K extends AnyKind>(v: Token<K>): Token<ArrayOf<K>> => ({ tag: `array<${v.tag}>`, ctor: "array", inner: v }) as Token<ArrayOf<K>>;
    export const loopFor = <K extends AnyKind>(v: Token<K>): Token<LoopFor<K>> => ({ tag: `loopFor<${v.tag}>`, ctor: "loopFor", inner: v }) as Token<LoopFor<K>>;

    // Named atomic TOKENS = the authoring surface (one per leaf in `ATOMIC_KINDS`, in that order). `:`
    // sublabel leaves (`stop:*`, `tokens:*`) work unchanged -- the id string is just passed through.
    export const FLOAT = atomicToken("float");
    export const INTEGER = atomicToken("integer");
    export const STRING = atomicToken("string");
    export const ENUM = atomicToken("enum");
    export const ANGLE = atomicToken("angle");
    export const BOOLEAN = atomicToken("boolean");
    export const LENGTH = atomicToken("length");
    export const SHAPE = atomicToken("shape");
    export const PATH = atomicToken("path");
    export const COLOR = atomicToken("color");
    export const GRADIENT = atomicToken("gradient");
    export const DISTRIBUTION = atomicToken("distribution");
    export const LAYER = atomicToken("layer");
    export const PATHOP = atomicToken("pathOp");
    export const POINT = atomicToken("point");
    export const SEQUENCE = atomicToken("sequence");
    export const TOKENS_LENGTH = atomicToken("tokens:length");
    export const STOP_FLOAT = atomicToken("stop:float");
    export const STOP_COLOR = atomicToken("stop:color");
    export const STOP_ANGLE = atomicToken("stop:angle");
    export const STOP_INTEGER = atomicToken("stop:integer");
    export const STOP_LENGTH = atomicToken("stop:length");

    // Named TYPES are DERIVED from the tokens -- no per-kind duplication (was `type Float = Atomic<"float">`).
    // `String`/`Boolean` deliberately shadow the globals inside this namespace (neither global is used here).
    export type Float = KindOf<typeof FLOAT>; // = Atomic<"float">
    export type Integer = KindOf<typeof INTEGER>;
    export type String = KindOf<typeof STRING>;
    export type Enum = KindOf<typeof ENUM>;
    export type Angle = KindOf<typeof ANGLE>;
    export type Boolean = KindOf<typeof BOOLEAN>;
    export type Length = KindOf<typeof LENGTH>;
    export type Shape = KindOf<typeof SHAPE>;
    export type Path = KindOf<typeof PATH>;
    export type Color = KindOf<typeof COLOR>;
    export type Gradient = KindOf<typeof GRADIENT>;
    export type Distribution = KindOf<typeof DISTRIBUTION>;
    export type Layer = KindOf<typeof LAYER>;
    export type PathOp = KindOf<typeof PATHOP>;
    export type Point = KindOf<typeof POINT>;
    export type Sequence = KindOf<typeof SEQUENCE>;
    export type TokensLength = KindOf<typeof TOKENS_LENGTH>;
    export type StopFloat = KindOf<typeof STOP_FLOAT>;
    export type StopColor = KindOf<typeof STOP_COLOR>;
    export type StopAngle = KindOf<typeof STOP_ANGLE>;
    export type StopInteger = KindOf<typeof STOP_INTEGER>;
    export type StopLength = KindOf<typeof STOP_LENGTH>;
}
