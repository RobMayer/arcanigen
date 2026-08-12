import { DataTypes } from "./dataTypes";

/**
 * The socket type system -- one namespace over two layers:
 *   - the Term ALGEBRA: parameterized type terms (atom / array<T> ctor / variable / union / set), plus
 *     subsumption (`canFlow`), unification, and coercion lattices. Kind-agnostic: kinds are opaque strings
 *     and this is the ONLY place that ever parses one (splits on '<'/'>').
 *   - the concrete SOCKET SURFACE: the kind-aware constructors (`of`/`and`/`or`/presets), the `ANY`/`NONE`
 *     bounds, and the one-way edge projections (`toCSS`/`linkRepresentation`) used by wire rendering.
 *
 * `Term` is the socket-type currency end to end: getSocketType returns one, the type cache stores one,
 * `canFlow` is subsumption over two.
 */
export namespace SocketTypes {
    // --- Term model -----------------------------------------------------------------------------

    export type Term =
        | { t: "atom"; kind: string } // one opaque kind string, e.g. "point" or "array<stop:color>"
        | { t: "ctor"; name: CtorName; args: Term[] } // parameterized: array<T> / loopFor<T>
        | { t: "var"; id: string; bound?: string } // unification variable; bound = lattice name
        | { t: "any" } // top / gradual wildcard
        | { t: "union"; members: Term[] } // "A | B" -- an "either" output (condition/switch)
        | { t: "set"; mode: "and" | "or"; members: Term[] }; // a concrete multi-kind rule ("or" disjunctive / "and" conjunctive)

    export type CtorName = "array" | "loopFor";
    const CTOR_NAMES = new Set<string>(["array", "loopFor"]);

    export type Subst = Map<string, Term>;

    /**
     * A node's solved-ready type signature: per-socket Terms + the variable/lattice bounds. Produced by
     * the builder (`signatureBuilder.toInstance`) directly from the authored `def`. The solver consumes
     * this to derive `getSocketType` + all connect/disconnect/refresh
     * propagation. `bounds` maps a coercion var to its lattice so it widens by join instead of equality.
     */
    export type Instance = {
        in: Record<string, Term>;
        out: Record<string, Term>;
        bounds: Record<string, string>;
        /** Arg names declared `$.each` — variadic families whose `*` sockets expand per live member. */
        families?: ReadonlySet<string>;
        /** Equality vars restricted to a membership set (e.g. `$.NUMERIC`) — the var's kind ceiling. */
        sets?: Record<string, ReadonlySet<string>>;
    };

    // --- Constructors ---------------------------------------------------------------------------

    export const atom = (kind: string): Term => ({ t: "atom", kind });
    export const ctor = (name: CtorName, ...args: Term[]): Term => ({ t: "ctor", name, args });
    export const tvar = (id: string, bound?: string): Term => ({ t: "var", id, bound });
    export const any = (): Term => ({ t: "any" });
    export const union = (...members: Term[]): Term => ({ t: "union", members });
    export const set = (mode: "and" | "or", ...members: Term[]): Term => ({ t: "set", mode, members });

    // --- Coercion lattices (bounded-variable join) ----------------------------------------------

    /** A bounded variable widens by `join` within `members` instead of unifying by strict equality. */
    export type Lattice = { name: string; members: ReadonlySet<string>; join: (a: string, b: string) => string | null };

    // Registry of coercion lattices, keyed by name. POPULATED by the signature builder's `$.combine`
    // (each combine hands a full `{name, members, join}` config that registers here) — the concrete
    // lattices are DEFINED there, not here, so socketTypes holds no numeric-specific constants. The
    // solver (`unify`/`subsumes`) reads a bounded var's lattice from this registry by name at solve time.
    export const LATTICES: Record<string, Lattice> = {};

    // --- Parser: kind string -> Term ------------------------------------------------------------

    /**
     * Parse a concrete kind string (e.g. "array<stop:color>") to a Term. Grammar:
     *   term  := app ('|' app)*
     *   app   := IDENT ('<' term (',' term)* '>')?
     * a registered ctor head (`array`/`loopFor`) becomes a ctor; an uppercase-initial bare ident becomes a
     * var; any other head (incl. atomic `stop:color`/`tokens:length`) becomes an atom.
     */
    export const parse = (src: string): Term => {
        let i = 0;
        const s = src;
        const ws = () => {
            while (i < s.length && s[i] === " ") i++;
        };
        const parseTerm = (): Term => {
            const first = parseApp();
            ws();
            if (s[i] !== "|") return first;
            const members = [first];
            while (s[i] === "|") {
                i++;
                members.push(parseApp());
                ws();
            }
            return { t: "union", members };
        };
        const parseApp = (): Term => {
            ws();
            const start = i;
            // `:` is part of an atomic identifier (e.g. `stop:color`, `tokens:length`) — only `<`/`>`/`,`/`|` break a head.
            while (i < s.length && /[A-Za-z0-9:]/.test(s[i])) i++;
            const head = s.slice(start, i);
            if (!head) throw new Error(`SocketTypes.parse: expected identifier at ${start} in "${src}"`);
            ws();
            if (s[i] === "<") {
                if (CTOR_NAMES.has(head)) {
                    i++; // consume '<'
                    const args: Term[] = [parseTerm()];
                    ws();
                    while (s[i] === ",") {
                        i++;
                        args.push(parseTerm());
                        ws();
                    }
                    if (s[i] !== ">") throw new Error(`SocketTypes.parse: expected '>' at ${i} in "${src}"`);
                    i++; // consume '>'
                    return { t: "ctor", name: head as CtorName, args };
                }
                // defensive: any non-ctor parameterized head — capture the whole balanced span as an atom
                const spanStart = start;
                let depth = 0;
                do {
                    if (s[i] === "<") depth++;
                    else if (s[i] === ">") depth--;
                    i++;
                } while (i < s.length && depth > 0);
                return { t: "atom", kind: s.slice(spanStart, i) };
            }
            if (/^[A-Z]/.test(head)) return { t: "var", id: head };
            return { t: "atom", kind: head };
        };
        const result = parseTerm();
        ws();
        if (i !== s.length) throw new Error(`SocketTypes.parse: trailing input at ${i} in "${src}"`);
        return result;
    };

    /** Inverse of `parse` for the concrete cases; MUST reproduce the exact enumerated kind strings. */
    export const serialize = (term: Term): string => {
        switch (term.t) {
            case "atom":
                return term.kind;
            case "ctor":
                return `${term.name}<${term.args.map(serialize).join(", ")}>`;
            case "var":
                return term.id;
            case "any":
                return "?";
            case "union":
                return term.members.map(serialize).join(" | ");
            case "set":
                return term.members.map(serialize).join(term.mode === "or" ? " | " : " & ");
        }
    };

    // --- One-way edge projection (Term -> concrete kinds) ---------------------------------------

    /**
     * Project a Term to the concrete Kind strings it represents — the single one-way edge projection for
     * wire CSS / representative link color / a primitive's cast badge. Variables and wildcards
     * have no finite kind set and project to `[]`. It is one-way — nothing reconstructs a Term from these.
     */
    export const project = (term: Term, subst?: Subst): string[] => {
        const t = subst ? resolve(term, subst) : term;
        switch (t.t) {
            case "atom":
                return [t.kind];
            case "ctor":
                return [serialize(t)];
            case "set":
            case "union":
                return t.members.flatMap((m) => project(m, subst));
            case "var":
            case "any":
                return [];
        }
    };

    /** Display mode for a projected term's title: conjunctive (union / and-set = "must accept all") vs disjunctive. */
    export const projectMode = (term: Term): "and" | "or" => (term.t === "union" ? "and" : term.t === "set" ? term.mode : "or");

    /** Order-independent structural equality (used for change detection). */
    const sameMembers = (a: Term[], b: Term[]): boolean => {
        if (a.length !== b.length) return false;
        const sa = a.map(serialize).sort();
        const sb = b.map(serialize).sort();
        return sa.every((s, i) => s === sb[i]);
    };
    export const equal = (a: Term, b: Term): boolean => {
        if (a.t !== b.t) return false;
        switch (a.t) {
            case "atom":
                return a.kind === (b as Extract<Term, { t: "atom" }>).kind;
            case "any":
                return true;
            case "var":
                return a.id === (b as Extract<Term, { t: "var" }>).id;
            case "ctor": {
                const bc = b as Extract<Term, { t: "ctor" }>;
                return a.name === bc.name && a.args.length === bc.args.length && a.args.every((x, i) => equal(x, bc.args[i]));
            }
            case "union":
                return sameMembers(a.members, (b as Extract<Term, { t: "union" }>).members);
            case "set": {
                const bs = b as Extract<Term, { t: "set" }>;
                return a.mode === bs.mode && sameMembers(a.members, bs.members);
            }
        }
    };

    // --- Substitution ---------------------------------------------------------------------------

    export const resolve = (term: Term, subst: Subst): Term => {
        let t = term;
        while (t.t === "var" && subst.has(t.id)) t = subst.get(t.id)!;
        if (t.t === "ctor") return { t: "ctor", name: t.name, args: t.args.map((a) => resolve(a, subst)) };
        if (t.t === "union") return { t: "union", members: t.members.map((m) => resolve(m, subst)) };
        if (t.t === "set") return { t: "set", mode: t.mode, members: t.members.map((m) => resolve(m, subst)) };
        return t;
    };

    const occurs = (id: string, term: Term, subst: Subst): boolean => {
        const t = resolve(term, subst);
        switch (t.t) {
            case "var":
                return t.id === id;
            case "ctor":
                return t.args.some((a) => occurs(id, a, subst));
            case "union":
            case "set":
                return t.members.some((m) => occurs(id, m, subst));
            default:
                return false;
        }
    };

    /** Canonicalize an atom whose string is really a parameterized kind (e.g. "array<point>") to a ctor. */
    const asCtor = (t: Term): Term => {
        if (t.t !== "atom") return t;
        const lt = t.kind.indexOf("<");
        if (lt < 0) return t;
        const head = t.kind.slice(0, lt);
        if (!CTOR_NAMES.has(head)) return t; // non-ctor head stays an atom
        return parse(t.kind);
    };

    const bindVar = (v: Extract<Term, { t: "var" }>, other: Term, subst: Subst): Subst | null => {
        const existing = subst.get(v.id);
        if (existing) return unify(existing, other, subst);
        const o = resolve(other, subst);
        if (v.bound) {
            const lat = LATTICES[v.bound];
            // a bounded var can only bind to a concrete member of its lattice (or another same-bounded var)
            if (o.t === "var") {
                const next = new Map(subst);
                next.set(v.id, o);
                return next;
            }
            if (o.t !== "atom" || !lat.members.has(o.kind)) return null;
            const next = new Map(subst);
            next.set(v.id, o);
            return next;
        }
        if (o.t === "var" && o.id === v.id) return subst;
        if (occurs(v.id, o, subst)) return null;
        const next = new Map(subst);
        next.set(v.id, o);
        return next;
    };

    // --- Unification (equality; bounded vars widen by join) -------------------------------------

    export const unify = (a: Term, b: Term, subst: Subst): Subst | null => {
        const ra = resolve(a, subst);
        const rb = resolve(b, subst);
        // A bounded variable accumulates by join; handle it by identity (raw `a`/`b`) BEFORE `resolve`
        // collapses it to its current binding, which would otherwise turn the join into an equality check.
        if (a.t === "var" && a.bound && rb.t === "atom") return joinBoundInto(a, rb.kind, subst);
        if (b.t === "var" && b.bound && ra.t === "atom") return joinBoundInto(b, ra.kind, subst);

        const ta = ra.t === "atom" ? asCtor(ra) : ra;
        const tb = rb.t === "atom" ? asCtor(rb) : rb;
        if (ta.t === "var") return bindVar(ta, tb, subst);
        if (tb.t === "var") return bindVar(tb, ta, subst);

        if (ta.t === "any" || tb.t === "any") return subst;

        if (ta.t === "atom" && tb.t === "atom") return ta.kind === tb.kind ? subst : null;
        if (ta.t === "ctor" && tb.t === "ctor") {
            if (ta.name !== tb.name || ta.args.length !== tb.args.length) return null;
            let s: Subst | null = subst;
            for (let k = 0; k < ta.args.length; k++) {
                s = unify(ta.args[k], tb.args[k], s!);
                if (!s) return null;
            }
            return s;
        }
        return null;
    };

    // widen a bounded var by joining its current binding with `kind` (within its lattice)
    const joinBoundInto = (v: Extract<Term, { t: "var" }>, kind: string, subst: Subst): Subst | null => {
        const lat = LATTICES[v.bound!];
        if (!lat.members.has(kind)) return null;
        const cur = subst.get(v.id);
        if (cur && cur.t === "atom") {
            const j = lat.join(cur.kind, kind);
            if (j === null) return null;
            const next = new Map(subst);
            next.set(v.id, atom(j));
            return next;
        }
        const next = new Map(subst);
        next.set(v.id, atom(kind));
        return next;
    };

    // --- Subsumption (the `canFlow` core) -------------------------------------------------------

    /**
     * Directional: can an OUT of type `out` flow into an IN of type `in`? Returns the (possibly
     * extended) substitution, or null. On atom/set terms: empty-out -> ok; or-out -> ∃; and-out -> ∀;
     * membership by equality.
     */
    export const subsumes = (out: Term, in_: Term, subst: Subst): Subst | null => {
        const ro = resolve(out, subst);
        const ri = resolve(in_, subst);
        // Bounded variables join by identity (raw `out`/`in_`) before `resolve` collapses them.
        if (out.t === "var" && out.bound && ri.t === "atom") return joinBoundInto(out, ri.kind, subst);
        if (in_.t === "var" && in_.bound && ro.t === "atom") return joinBoundInto(in_, ro.kind, subst);

        const o = ro.t === "atom" ? asCtor(ro) : ro;
        const i = ri.t === "atom" ? asCtor(ri) : ri;

        // IN accepts anything; an OUT wildcard only flows into another wildcard (handled above)
        if (i.t === "any") return subst;
        if (o.t === "any") return null;

        // variables bind (equality) in either direction
        if (o.t === "var") return bindVar(o, i, subst);
        if (i.t === "var") return bindVar(i, o, subst);

        // OUT set: disjunctive => some member flows; conjunctive/empty => all members flow
        if (o.t === "set" || o.t === "union") {
            const members = o.members;
            const all = o.t === "union" ? true : o.mode === "and";
            if (members.length === 0) return subst; // empty OUT flows anywhere
            if (all) {
                let s: Subst | null = subst;
                for (const m of members) {
                    s = subsumes(m, i, s!);
                    if (!s) return null;
                }
                return s;
            }
            for (const m of members) {
                const s = subsumes(m, i, subst);
                if (s) return s;
            }
            return null;
        }

        // OUT is atom/ctor here. IN set: accepted iff OUT flows into some member (membership).
        if (i.t === "set" || i.t === "union") {
            for (const m of i.members) {
                const s = subsumes(o, m, subst);
                if (s) return s;
            }
            return null;
        }

        if (o.t === "atom" && i.t === "atom") return o.kind === i.kind ? subst : null;
        if (o.t === "ctor" && i.t === "ctor") {
            if (o.name !== i.name || o.args.length !== i.args.length) return null;
            // covariant: array<A> flows into array<B> iff A flows into B
            let s: Subst | null = subst;
            for (let k = 0; k < o.args.length; k++) {
                s = subsumes(o.args[k], i.args[k], s!);
                if (!s) return null;
            }
            return s;
        }
        return null;
    };

    /** Boolean gate: can an OUT term flow into an IN term? Subsumption over two terms, the canonical canFlow. */
    export const canFlow = (out: Term, in_: Term): boolean => subsumes(out, in_, new Map()) !== null;

    // --- Concrete socket surface (kind-aware constructors, bounds, edge projections) -------------

    /** Empty set -- unconstrained OUT ("no type yet"); an empty OUT flows anywhere (subsumes). */
    export const NONE: Term = set("and");

    /** Top / gradual wildcard -- unconstrained IN (accepts anything). The honest "any": a real wildcard,
     *  not an enumerated all-kinds set (kinds are an open, recursive space -- there is nothing finite to
     *  enumerate). `subsumes` already accepts it on an IN, `intersect` treats it as the universe, and
     *  `toRepresentation` renders it as the token "any". */
    export const ANY: Term = any();

    /** Build a Term from a kind TOKEN. Recurses structurally over ANY constructor token (`arrayOf(LAYER)` ->
     *  `ctor("array", atom("layer"))`, `loopFor(COLOR)` -> `ctor("loopFor", atom("color"))`) so a Token becomes
     *  a Term with no stringify-then-parse at the bridge. */
    export const of = (token: DataTypes.Token<DataTypes.AnyKind>): Term => (token.ctor && token.inner ? ctor(token.ctor, of(token.inner)) : atom(token.tag));

    // Canonical member order by tag (set equality is order-independent; this is just for stability).
    const byTag = (a: DataTypes.Token<DataTypes.AnyKind>, b: DataTypes.Token<DataTypes.AnyKind>): number => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0);

    /** Conjunctive rule -- "all of these". */
    export const and = (...tokens: DataTypes.Token<DataTypes.AnyKind>[]): Term => set("and", ...[...tokens].sort(byTag).map(of));

    /** Disjunctive rule -- "one of these". */
    export const or = (...tokens: DataTypes.Token<DataTypes.AnyKind>[]): Term => set("or", ...[...tokens].sort(byTag).map(of));

    // --- Display representation (Term -> { attr, title }) ----------------------------------------

    // The machine `attr` string is load-bearing: the socket stylesheet rides its exact spacing.
    // Convention: the whole value is space-padded; atoms are space-joined; a ctor pads a LEAF inner
    // (`array< color >`) but jams a nested ctor tight (`loopFor<array< x >>`) so that only the
    // OUTERMOST ctor is space-preceded -- that is what lets `[data-sockettype*=" array<"]` select the
    // outer shape while ignoring inner ones. Wildcards spell out: `any()` -> "any", empty-set -> "unknown".
    const attrOf = (t: Term): string => {
        switch (t.t) {
            case "atom":
                return t.kind;
            case "any":
            case "var": // materialized terms are var-free; defensive
                return "any";
            case "ctor": {
                const inner = attrOf(t.args[0]);
                return t.args[0].t === "ctor" ? `${t.name}<${inner}>` : `${t.name}< ${inner} >`;
            }
            case "set":
            case "union":
                return t.members.length === 0 ? "unknown" : t.members.map(attrOf).join(" ");
        }
    };

    // Human title: readable kinds joined by `|` (or `&` on a conjunctive output); ctors tight.
    const titleOf = (t: Term, side: "in" | "out"): string => {
        switch (t.t) {
            case "atom":
                return t.kind;
            case "any":
            case "var":
                return "any";
            case "ctor":
                return `${t.name}<${t.args.map((a) => titleOf(a, side)).join(", ")}>`;
            case "set":
            case "union": {
                if (t.members.length === 0) return "unknown";
                const sep = side === "out" && projectMode(t) === "and" ? " & " : " | ";
                return t.members.map((m) => titleOf(m, side)).join(sep);
            }
        }
    };

    /** The strict machine attr string for the `data-sockettype` prop (space-padded; see `attrOf`). */
    export const toCSS = (rule: Term): string => ` ${attrOf(rule)} `;

    /** Both socket display strings from one Term walk: the `data-sockettype` attr + the human title.
     *  `side` only affects the title separator (`|` vs a conjunctive-output `&`); the attr is side-neutral. */
    export const toRepresentation = (rule: Term, side: "in" | "out"): { attr: string; title: string } => {
        const attr = toCSS(rule);
        let title = titleOf(rule, side);
        if (rule.t === "any") title = "« any »";
        else if ((rule.t === "set" || rule.t === "union") && rule.members.length === 0) title = "« unknown »";
        return { attr, title };
    };

    /** The wire's `data-linktype` -- the SAME spaced serialization sockets use (`toCSS`), so wires and sockets
     *  style off ONE attr grammar (`~="color"` colors a leaf at any depth, `*=" loopFor<"` keys the outer
     *  ctor's structural treatment). Prefers the producer (out); falls back to the consumer (in) when the
     *  producer is contentless (an ungrounded var / wildcard / empty set carries no concrete type yet). */
    const contentless = (t: Term): boolean => t.t === "any" || t.t === "var" || (t.t === "set" && t.members.length === 0);
    export const linkRepresentation = (out: Term, inp: Term): string => toCSS(contentless(out) ? inp : out);

    /** Intersection of two rules' concrete kinds (mode from the first operand). `any` is the universe. */
    export const intersect = (a: Term, b: Term): Term => {
        if (a.t === "any") return b;
        if (b.t === "any") return a;
        const kb = new Set(project(b));
        return set(
            projectMode(a),
            ...project(a)
                .filter((k) => kb.has(k))
                .sort()
                .map((k) => atom(k)),
        );
    };

    /** Structural equality of two rules (order-independent) -- alias of `equal`. */
    export const equals = equal;

    /** Named presets */
    export const LAYER_OR_SHAPE: Term = set("and", atom("layer"), atom("shape"));
    export const PATHOP_OR_PATH: Term = set("and", atom("pathOp"), atom("path"));
    export const NUMERIC: Term = set("or", atom("angle"), atom("float"), atom("integer"), atom("length"));
}
