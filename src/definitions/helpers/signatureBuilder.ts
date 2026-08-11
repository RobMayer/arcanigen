import type { DataTypes } from "../dataTypes";
import { SocketTypes } from "../socketTypes";

/**
 * The Typed Builder. A node authors its signature with the `signature(...)` factory:
 *
 *   const def = signature({
 *       args: { T: $.ANY, E: $.ANY },
 *       in:  ({ T, E }) => ({ if: "boolean", then: T, else: E }),
 *       out: ({ T, E }) => ({ result: $.oneOf(T, E) }),
 *   });
 *   type ConditionDefinition = SignatureBuilder.DefinitionFrom<typeof def, { label: string; ... }>;
 *   // node Type: { ..., signature: def.instance, ...SignatureEngine.hooks }
 *
 * `$` is the type-expression VOCABULARY only (never the factory). Args are declared once and handed to
 * the `in`/`out` thunks as **tokens** — referencing a var is a property access (`T`), so a typo is a
 * compile error with autocomplete. Concrete kinds are **bare atomic strings** typed against `DataTypes.AtomicKind`
 * (`dataTypes.ts`), so `"array<layer>"` isn't even expressible — arrays go through `$.arrayOf`.
 *
 * `def.instance` is the solved-ready `SocketTypes.Instance` (per-socket Terms + var bounds) that the
 * solver (`signatureEngine`) consumes directly.
 */
export namespace SignatureBuilder {
    // --- type-expression model ------------------------------------------------------------------

    // `members` arrays are `readonly` so `as const` socket-fragments (rung-7 composition — shared
    // `Transforms`/`Stylings` blocks spread into a shape) satisfy `Expr`; without it, `as const` makes the
    // members readonly and they no longer fit a mutable `Expr[]`. (EvalMembers/exprToTerm already tolerate it.)
    /** A socket type-expression: a bare atomic kind, or a tagged combinator, or an arg token. */
    export type Expr = DataTypes.AtomicKind | { $x: "any" } | { $x: "arg"; name: string } | { $x: "oneOf"; members: readonly Expr[] } | { $x: "ctor"; ctor: string; of: Expr };

    /** A variable's constraint (declared in `args`). */
    export type Constraint =
        | DataTypes.AtomicKind
        | { $x: "any" }
        | { $x: "oneOf"; members: readonly Expr[] }
        | { $x: "each"; of: Constraint } // independent-per-member family
        | { $x: "combine"; lattice: string; members: readonly string[] }; // coercion var

    type ArgsInput = Record<string, Constraint>;
    type SocketMap = Record<string, Expr>;

    /** The token handed to the `in`/`out` thunks for each declared arg. Referencing it is typo-safe. */
    type Tokens<A extends ArgsInput> = { [K in keyof A]: { $x: "arg"; name: K } };

    /** What `signature(...)` returns: the resolved maps (types carry the exprs) + the solved-ready instance. */
    export type Result<A extends ArgsInput, In extends SocketMap, Out extends SocketMap> = {
        args: A;
        in: In;
        out: Out;
        /** Per-socket Terms + var bounds — what the solver consumes directly. */
        instance: SocketTypes.Instance;
    };

    // --- type-level derivation: signature -> compile-time Definition -----------------------------
    // A socket's compile-time type is its Kind: a concrete atomic/array kind maps to its literal `K`;
    // a var / wildcard / not-yet-first-class ctor maps to the open `DataTypes.Kind`.

    type KindOf<K> = K extends DataTypes.Kind ? K : DataTypes.Kind;
    type KindUnion<KS> = KS extends readonly (infer K)[] ? (K extends DataTypes.Kind ? K : never) : never;
    type EvalMembers<M, A> = M extends readonly unknown[] ? EvalExpr<M[number], A> : DataTypes.Kind;

    type EvalArg<C> = C extends { $x: "any" }
        ? DataTypes.Kind
        : C extends { $x: "each"; of: infer I }
          ? EvalArg<I>
          : C extends { $x: "oneOf"; members: infer M }
            ? EvalMembers<M, {}>
            : C extends { $x: "combine"; members: infer KS }
              ? KindUnion<KS>
              : C extends string
                ? KindOf<C>
                : DataTypes.Kind;

    export type EvalExpr<X, A> = X extends string
        ? KindOf<X>
        : X extends { $x: "any" }
          ? DataTypes.Kind
          : X extends { $x: "arg"; name: infer N }
            ? N extends keyof A
                ? EvalArg<A[N]>
                : DataTypes.Kind
            : X extends { $x: "oneOf"; members: infer M }
              ? EvalMembers<M, A>
              : X extends { $x: "ctor"; ctor: "array"; of: infer O }
                ? O extends string
                    ? KindOf<`array<${O}>`> // concrete array<K> — a first-class Kind
                    : DataTypes.Kind // var-parameterized array<T> — stays open
                : DataTypes.Kind; // loopFor / bus — not yet first-class kinds

    // A `"prefix_*"` socket key becomes `` `prefix_${string}` `` index signature; others stay literal.
    type SocketKey<K> = K extends `${infer P}_*` ? `${P}_${string}` : K;
    type MapSockets<M, A> = { [K in keyof M as SocketKey<K & string>]: EvalExpr<M[K], A> };

    export type DefinitionFrom<Sig, Payload> = Sig extends { args: infer A; in: infer In; out: infer Out }
        ? {
              inputs: MapSockets<In, A>;
              outputs: MapSockets<Out, A>;
              payload: Payload;
          }
        : never;

    const isTagged = (x: Expr): x is Exclude<Expr, string> => typeof x === "object";

    const exprToTerm = (x: Expr, bounds: Record<string, string>): SocketTypes.Term => {
        if (!isTagged(x)) return SocketTypes.atom(x); // bare atomic kind
        switch (x.$x) {
            case "any":
                return SocketTypes.any();
            case "arg":
                return SocketTypes.tvar(x.name, bounds[x.name]);
            case "oneOf":
                return SocketTypes.union(...x.members.map((m) => exprToTerm(m, bounds)));
            case "ctor":
                // array is the one real container today; loopFor/bus land with the registry reshape.
                return x.ctor === "array" ? SocketTypes.ctor("array", exprToTerm(x.of, bounds)) : SocketTypes.any();
        }
    };

    // The concrete atomic kinds a plain (equality) constraint restricts to, or null (unbounded / not a set).
    const constraintSet = (c: Constraint): Set<string> | null => {
        if (typeof c === "string") return new Set([c]);
        if (c.$x === "oneOf") {
            const s = new Set<string>();
            for (const m of c.members) if (typeof m === "string") s.add(m);
            return s.size ? s : null;
        }
        return null; // any / each / combine carry no scalar membership set
    };

    const toInstance = (args: ArgsInput, inMap: SocketMap, outMap: SocketMap): SocketTypes.Instance => {
        const bounds: Record<string, string> = {};
        const families = new Set<string>();
        const sets: Record<string, ReadonlySet<string>> = {};
        for (const [name, c] of Object.entries(args)) {
            if (typeof c === "object" && c.$x === "combine") bounds[name] = c.lattice;
            else if (typeof c === "object" && c.$x === "each") families.add(name);
            else {
                const s = constraintSet(c);
                if (s) sets[name] = s;
            }
        }
        const mapRec = (m: SocketMap) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, exprToTerm(v, bounds)]));
        return { in: mapRec(inMap), out: mapRec(outMap), bounds, ...(families.size ? { families } : {}), ...(Object.keys(sets).length ? { sets } : {}) };
    };

    // --- the factory ----------------------------------------------------------------------------

    /**
     * Build a node signature. `in`/`out` are each either a **plain map** (concrete node — no vars) or a
     * `(args) => map` that receives the declared args as tokens (reference a var by property
     * access, e.g. `T`;
     *   concrete:    signature({ in: { input: "boolean" }, out: { output: "boolean" } })
     *   polymorphic: signature({ args: { T: $.NUMERIC }, in: ({ T }) => ({ input: T }), out: ({ T }) => ({ output: T }) })
     */
    export const signature = <const A extends ArgsInput = {}, const In extends SocketMap = SocketMap, const Out extends SocketMap = SocketMap>(config: {
        args?: A;
        in: In | ((t: Tokens<A>) => In);
        out: Out | ((t: Tokens<A>) => Out);
    }): Result<A, In, Out> => {
        const args = (config.args ?? {}) as A;
        const tokens = Object.fromEntries(Object.keys(args).map((k) => [k, { $x: "arg", name: k }])) as Tokens<A>;
        const inMap = typeof config.in === "function" ? config.in(tokens) : config.in;
        const outMap = typeof config.out === "function" ? config.out(tokens) : config.out;
        return { args, in: inMap, out: outMap, instance: toInstance(args, inMap, outMap) };
    };

    // --- the vocabulary ($): type-expression combinators ----------------------------------------

    const ANY = { $x: "any" } as { $x: "any" };
    const oneOf = <M extends Expr[]>(...members: M) => ({ $x: "oneOf", members }) as { $x: "oneOf"; members: M };
    const each = <C extends Constraint>(of: C) => ({ $x: "each", of }) as { $x: "each"; of: C };
    const arrayOf = <X extends Expr>(of: X) => ({ $x: "ctor", ctor: "array", of }) as { $x: "ctor"; ctor: "array"; of: X };
    const loopFor = <X extends Expr>(of: X) => ({ $x: "ctor", ctor: "loopFor", of }) as { $x: "ctor"; ctor: "loopFor"; of: X };
    const busOf = <X extends Expr>(of: X) => ({ $x: "ctor", ctor: "bus", of }) as { $x: "ctor"; ctor: "bus"; of: X };

    const NUMERIC = oneOf("integer", "float", "length", "angle");
    const COLOR_OR_GRADIENT = oneOf("color", "gradient");

    type CombineConfig = { name: string; members: readonly DataTypes.AtomicKind[]; join: (a: string, b: string) => string | null };
    const combineFn = <const C extends CombineConfig>(config: C) => {
        if (!SocketTypes.LATTICES[config.name]) {
            SocketTypes.LATTICES[config.name] = { name: config.name, members: new Set(config.members), join: config.join };
        }
        return { $x: "combine", lattice: config.name, members: config.members } as { $x: "combine"; lattice: C["name"]; members: C["members"] };
    };

    const NUM_KINDS = ["integer", "float", "angle", "length"] as const;

    const NUM_PRIORITY: Record<string, number> = { integer: 0, float: 1, angle: 2, length: 3 };
    const NUMERIC_ADDABLE = combineFn({
        name: "NUMERIC_ADDABLE",
        members: NUM_KINDS,
        join: (a, b) => {
            if (a === b) return a;
            if ((a === "angle" && b === "length") || (a === "length" && b === "angle")) return null;
            return (NUM_PRIORITY[a] ?? 0) >= (NUM_PRIORITY[b] ?? 0) ? a : b;
        },
    });
    // Multiplicative (multiply/divide/modulo/remainder): at most ONE dimensional operand; two dims forbidden.
    const NUMERIC_SCALABLE = combineFn({
        name: "NUMERIC_SCALABLE",
        members: NUM_KINDS,
        join: (a, b) => {
            const dimA = a === "angle" || a === "length";
            const dimB = b === "angle" || b === "length";
            if (dimA && dimB) return null;
            if (dimA) return a;
            if (dimB) return b;
            return a === "float" || b === "float" ? "float" : "integer";
        },
    });
    const combine = Object.assign(combineFn, { NUMERIC_ADDABLE, NUMERIC_SCALABLE });

    export const $ = { ANY, oneOf, each, arrayOf, loopFor, busOf, NUMERIC, COLOR_OR_GRADIENT, combine };
}

export const signature = SignatureBuilder.signature;
export const $ = SignatureBuilder.$;
