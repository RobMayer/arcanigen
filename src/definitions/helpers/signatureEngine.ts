import { NodeTypes, type NodeDefinitions } from "../nodeTypes";
import { SocketTypes } from "../socketTypes";
import { commitSocketTypes } from "./nodeHelper";

/**
 * The generic propagation engine that turns a node's declarative `signature` into a
 * `getSocketType` + the connect/disconnect/refresh hook trio — no hand-rolled per-node type code.
 *
 * A node opts in by setting `signature` and spreading `SignatureEngine.hooks`. The engine solves the
 * signature against the node's current neighbours (a domain-narrowing constraint solve), stores the
 * result in the transient socket-type cache (`ctx.setSocketTypes`, keyed graphId->nodeId->{in,out} — never
 * persisted), and re-broadcasts only when something actually changed (so a graph of signature nodes
 * converges instead of looping). Disconnect is handled by re-solving from scratch.
 *
 * Only NodeTypes *values* are touched inside functions (never at module init), to stay clear of the
 * nodeTypes <-> node-registry import cycle.
 */
export namespace SignatureEngine {
    type MethodContext = NodeTypes.MethodContext;
    type AnyNode = NodeDefinitions.NodeFor<NodeDefinitions.Any>;

    /** A variable's candidate kinds; `null` = unconstrained (⊤). */
    type Domain = Set<string> | null;

    type Instance = SocketTypes.Instance;

    const sigOf = (node: AnyNode): Instance | undefined => NodeTypes.get(node.type).signature;

    // --- domain math ----------------------------------------------------------------------------

    const intersectInto = (dom: Record<string, Domain>, v: string, cands: Set<string>): void => {
        const cur = dom[v];
        dom[v] = cur === null || cur === undefined ? new Set(cands) : new Set([...cur].filter((k) => cands.has(k)));
    };

    // The inner argument of a parameterized kind.
    const kindArg = (kind: string, ctor: string): string | null => {
        const parsed = SocketTypes.parse(kind);
        if (parsed.t === "ctor" && parsed.name === ctor && parsed.args.length === 1) return SocketTypes.serialize(parsed.args[0]);
        return null;
    };

    /** Narrow variable domains from a value of kinds `ks` arriving on an input typed `term`. */
    const constrainFromNeighbour = (term: SocketTypes.Term, ks: Set<string>, dom: Record<string, Domain>, grounded: Set<string>): void => {
        switch (term.t) {
            case "var":
                intersectInto(dom, term.id, ks);
                grounded.add(term.id);
                return;
            case "ctor": {
                const inner = term.args[0];
                if (inner?.t === "var") {
                    const cands = new Set<string>();
                    for (const k of ks) {
                        const a = kindArg(k, term.name);
                        if (a !== null) cands.add(a);
                    }
                    intersectInto(dom, inner.id, cands);
                    grounded.add(inner.id);
                }
                return;
            }
            case "union":
                // an "either" output constrained by a downstream that accepts `ks`: every branch must fit
                for (const m of term.members) constrainFromNeighbour(m, ks, dom, grounded);
                return;
            default:
                return;
        }
    };

    const setOf = (kinds: string[], mode: "and" | "or"): SocketTypes.Term => SocketTypes.set(mode, ...kinds.map((k) => SocketTypes.atom(k)));

    /** Resolve a signature term against solved variable domains into a concrete (var-free) Term. */
    const materialize = (term: SocketTypes.Term, dom: Record<string, Domain>, side: "in" | "out", grounded: Set<string>): SocketTypes.Term => {
        switch (term.t) {
            case "atom":
                return term;
            case "var": {
                const d = dom[term.id];
                if (!d) return side === "in" ? SocketTypes.ANY : SocketTypes.NONE; // unconstrained
                return setOf([...d].sort(), "or");
            }
            case "ctor": {
                const inner = term.args[0];
                if (inner?.t === "var") {
                    const d = dom[inner.id];
                    if (!d) return side === "in" ? SocketTypes.ANY : SocketTypes.NONE;
                    return SocketTypes.set("or", ...[...d].sort().map((k) => SocketTypes.ctor(term.name, SocketTypes.atom(k))));
                }
                return term;
            }
            case "union": {
                // conjunctive: a consumer of "A | B" must accept every grounded possibility
                const kinds = new Set<string>();
                for (const m of term.members) {
                    if (m.t === "var") {
                        if (!grounded.has(m.id)) continue; // unconnected branch contributes nothing
                        for (const k of dom[m.id] ?? []) kinds.add(k);
                    } else {
                        for (const k of SocketTypes.project(materialize(m, dom, side, grounded))) kinds.add(k);
                    }
                }
                if (kinds.size === 0) return SocketTypes.NONE;
                return setOf([...kinds].sort(), "and");
            }
            default:
                return side === "in" ? SocketTypes.ANY : SocketTypes.NONE;
        }
    };

    // --- the solve ------------------------------------------------------------------------------

    const queryNeighbourRule = (graphId: string, nodeId: string, linkId: string, wantSide: "in" | "out", ctx: MethodContext): SocketTypes.Term | null => {
        const link = ctx.getLink(graphId, linkId);
        if (!link) return null;
        const [neighbourId, neighbourSocket] = wantSide === "out" ? [link.fromNode, link.fromSocket] : [link.toNode, link.toSocket];
        const neighbour = ctx.getNode(graphId, neighbourId);
        if (!neighbour) return null;
        return NodeTypes.getSocketType(neighbour, neighbourSocket, wantSide, graphId, ctx);
    };

    const isBareVar = (term: SocketTypes.Term, id: string): boolean => term.t === "var" && term.id === id;
    const intersectSet = (a: Set<string>, b: Set<string>): Set<string> => new Set([...a].filter((k) => b.has(k)));
    const orRule = (kinds: string[]): SocketTypes.Term => (kinds.length === 0 ? SocketTypes.NONE : setOf([...kinds].sort(), "or"));

    /** Kinds achievable by joining one pick from each input domain over lattice `L` (null if no inputs). */
    const achievableJoins = (doms: Set<string>[], L: SocketTypes.Lattice): Set<string> | null => {
        let acc: Set<string> | null = null;
        for (const d of doms) {
            if (acc === null) {
                acc = new Set(d);
                continue;
            }
            const next = new Set<string>();
            for (const x of acc)
                for (const y of d) {
                    const j = L.join(x, y);
                    if (j !== null) next.add(j);
                }
            acc = next;
        }
        return acc;
    };

    // --- variadic families -----------------------------------------------------------------------

    /** "case_*" -> "case_" (the live-member prefix); null if not a `*` family key. */
    const starPrefix = (key: string): string | null => (key.endsWith("_*") ? key.slice(0, -1) : null);

    /** The family arg a `*` socket references (a bare family var), or null. */
    const familyOf = (term: SocketTypes.Term, families: ReadonlySet<string>): string | null => (term.t === "var" && families.has(term.id) ? term.id : null);

    /**
     * Expand `*` family sockets against the node's live sockets: each member becomes its own independent
     * var (`C@case_abc`), and a family reference in an output is replaced by the union of those member
     * vars (the fold). Non-variadic instances pass through untouched.
     */
    const expand = (inst: Instance, node: AnyNode): { xin: Record<string, SocketTypes.Term>; xout: Record<string, SocketTypes.Term> } => {
        const families = inst.families;
        if (!families || families.size === 0) return { xin: inst.in, xout: inst.out };

        const memberVars: Record<string, SocketTypes.Term[]> = {};
        const xin: Record<string, SocketTypes.Term> = {};
        for (const [key, term] of Object.entries(inst.in)) {
            const prefix = starPrefix(key);
            const fam = prefix ? familyOf(term, families) : null;
            if (prefix && fam) {
                memberVars[fam] ??= [];
                for (const m of Object.keys(node.in as Record<string, unknown>).filter((k) => k.startsWith(prefix))) {
                    const mv = SocketTypes.tvar(`${fam}@${m}`);
                    xin[m] = mv;
                    memberVars[fam].push(mv);
                }
            } else {
                xin[key] = term;
            }
        }
        const subst = (term: SocketTypes.Term): SocketTypes.Term => {
            switch (term.t) {
                case "var":
                    return memberVars[term.id] ? SocketTypes.union(...memberVars[term.id]) : term;
                case "union":
                    return { t: "union", members: term.members.map(subst) };
                case "ctor":
                    return { t: "ctor", name: term.name, args: term.args.map(subst) };
                default:
                    return term;
            }
        };
        const xout: Record<string, SocketTypes.Term> = {};
        for (const [key, term] of Object.entries(inst.out)) xout[key] = subst(term);
        return { xin, xout };
    };

    type SolvedEntry = { in: Record<string, SocketTypes.Term>; out: Record<string, SocketTypes.Term> };

    /** Solve the signature against the node's live connections -> a side-split rule map. */
    const solve = (node: AnyNode, graphId: string, ctx: MethodContext): SolvedEntry => {
        const inst = sigOf(node);
        if (!inst) return { in: {}, out: {} };
        const { xin, xout } = expand(inst, node);

        // gather neighbour kind-sets once (null = unconnected socket)
        const inKinds: Record<string, Set<string> | null> = {};
        for (const sock of Object.keys(xin)) {
            const linkId = (node.in as Record<string, string | null>)[sock];
            const r = linkId ? queryNeighbourRule(graphId, node.id, linkId, "out", ctx) : null;
            inKinds[sock] = r ? new Set<string>(SocketTypes.project(r)) : null;
        }
        const outKinds: Record<string, Set<string> | null> = {};
        for (const sock of Object.keys(xout)) {
            const linkIds = (node.out as Record<string, string[]>)[sock] ?? [];
            let accepted: Set<string> | null = null;
            for (const linkId of linkIds) {
                const down = queryNeighbourRule(graphId, node.id, linkId, "in", ctx);
                if (!down) continue;
                const ks = new Set<string>(SocketTypes.project(down));
                accepted = accepted === null ? ks : intersectSet(accepted, ks);
            }
            outKinds[sock] = accepted;
        }

        const resIn: Record<string, SocketTypes.Term> = {};
        const resOut: Record<string, SocketTypes.Term> = {};
        const handledIn = new Set<string>();
        const handledOut = new Set<string>();

        // join variables (coercion lattice): inputs widen by join; the output is the join;
        // each input is back-constrained by mutual joinability with the others + the downstream.
        for (const [v, latName] of Object.entries(inst.bounds)) {
            const L = SocketTypes.LATTICES[latName];
            const inOccs = Object.keys(xin).filter((s) => isBareVar(xin[s], v));
            const outOccs = Object.keys(xout).filter((s) => isBareVar(xout[s], v));
            if (inOccs.length === 0 && outOccs.length === 0) continue;

            const members = new Set(L.members);
            const domIn: Record<string, Set<string>> = {};
            for (const s of inOccs) domIn[s] = inKinds[s] ? intersectSet(inKinds[s]!, members) : new Set(members);
            let dOut = new Set(members);
            for (const s of outOccs) if (outKinds[s]) dOut = intersectSet(dOut, outKinds[s]!);

            const out = intersectSet(achievableJoins(Object.values(domIn), L) ?? new Set(members), dOut);

            for (const s of inOccs) {
                const otherJoins = achievableJoins(
                    inOccs.filter((o) => o !== s).map((o) => domIn[o]),
                    L,
                );
                const valid = [...domIn[s]].filter((k) => {
                    if (otherJoins === null) return out.has(k); // sole input: k must itself land in `out`
                    for (const o of otherJoins) {
                        const j = L.join(k, o);
                        if (j !== null && out.has(j)) return true;
                    }
                    return false;
                });
                resIn[s] = orRule(valid);
                handledIn.add(s);
            }
            for (const s of outOccs) {
                resOut[s] = orRule([...out]);
                handledOut.add(s);
            }
        }

        //  equality vars / atoms / unions / ctors
        const eqDom: Record<string, Domain> = {};
        const grounded = new Set<string>();
        // seed set-constrained vars ($.NUMERIC etc.) with their kind ceiling; neighbours narrow from there.
        for (const [v, set] of Object.entries(inst.sets ?? {})) eqDom[v] = new Set(set);
        for (const [sock, term] of Object.entries(xin)) if (!handledIn.has(sock) && inKinds[sock]) constrainFromNeighbour(term, inKinds[sock]!, eqDom, grounded);
        for (const [sock, term] of Object.entries(xout)) if (!handledOut.has(sock) && outKinds[sock]) constrainFromNeighbour(term, outKinds[sock]!, eqDom, grounded);
        for (const [sock, term] of Object.entries(xin)) if (!handledIn.has(sock)) resIn[sock] = materialize(term, eqDom, "in", grounded);
        for (const [sock, term] of Object.entries(xout)) if (!handledOut.has(sock)) resOut[sock] = materialize(term, eqDom, "out", grounded);

        return { in: resIn, out: resOut };
    };

    // --- public hooks ---------------------------------------------------------------------------

    export const getSocketType = (node: AnyNode, socketId: string, side: "in" | "out", graphId: string, ctx: MethodContext): SocketTypes.Term => {
        const stored = ctx.readSocketType(graphId, node.id, socketId, side);
        if (stored) return stored;
        const inst = sigOf(node);
        if (!inst) return SocketTypes.ANY;
        let term = side === "in" ? inst.in[socketId] : inst.out[socketId];
        if (!term && side === "in") {
            // a live variadic member (case_abc): fall back to its `*` family term
            const starKey = Object.keys(inst.in).find((k) => {
                const p = starPrefix(k);
                return p !== null && socketId.startsWith(p);
            });
            if (starKey) term = inst.in[starKey];
        }
        if (!term) return side === "in" ? SocketTypes.ANY : SocketTypes.NONE;
        const dom: Record<string, Domain> = {};
        for (const [v, latName] of Object.entries(inst.bounds)) dom[v] = new Set(SocketTypes.LATTICES[latName].members);
        for (const [v, set] of Object.entries(inst.sets ?? {})) dom[v] = new Set(set);
        return materialize(term, dom, side, new Set());
    };

    /**
     * Re-solve, store into the transient socket-type cache, and notify neighbours only if the solution
     * changed. Unchanged per-socket rules keep their previous object identity (carried forward) so the
     * per-socket store selectors don't needlessly re-render sockets whose type didn't move.
     */
    const recompute = (node: AnyNode, graphId: string, ctx: MethodContext): void => {
        const current = ctx.getNode(graphId, node.id);
        if (!current) return;
        commitSocketTypes(current, graphId, ctx, solve(current, graphId, ctx));
    };

    export const onConnect = (node: AnyNode, _linkId: string, _direction: "in" | "out", graphId: string, ctx: MethodContext): void => recompute(node, graphId, ctx);
    export const onDisconnect = (node: AnyNode, _link: unknown, _direction: "in" | "out", graphId: string, ctx: MethodContext): void => recompute(node, graphId, ctx);
    export const onRefreshRequest = (node: AnyNode, _socketId: string, _side: "in" | "out", _reason: NodeTypes.RefreshReason, graphId: string, ctx: MethodContext): void =>
        recompute(node, graphId, ctx);

    /**
     * Spread onto a signature node's Type definition to wire the whole engine. The double-cast bridges
     * the engine's loose `AnyNode` parameters to the Type interface's per-definition node parameters
     * (contravariant function positions the compiler can't relate, but which are safe here).
     */
    export const hooks = { getSocketType, onConnect, onDisconnect, onRefreshRequest } as unknown as Pick<
        NodeTypes.Type<NodeTypes.Key, NodeDefinitions.Generic>,
        "getSocketType" | "onConnect" | "onDisconnect" | "onRefreshRequest"
    >;
}
