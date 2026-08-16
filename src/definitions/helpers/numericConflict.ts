import { NumericKind } from "./numericKind";
import { SocketTypes } from "../socketTypes";

// A NUMERIC_ADDABLE node's operands conflict when their kinds can't unify under the lattice (the only
// such pair today is angle vs length). Boolean-output nodes (the comparators) can't carry the `invalid`
// Term on their output, so their Controls compute this and pass it as the fields' `invalid` flag.
//
// Each operand's EFFECTIVE kind: when connected, the producer's resolved kind (project the inbound Term;
// a polymorphic/empty producer is "flexible" and skipped); when disconnected, the field's `kindOf`. This
// mirrors what the solver does for a coercion-var OUTPUT (add & friends), so a connected-vs-field mismatch
// (angle wire into `a` + `10mm` in `b`) flags the same way it does on add.
export const numericConflict = (
    node: { payload: Record<string, unknown> },
    sockets: readonly string[],
    inbounds: readonly (SocketTypes.Term | null)[],
): boolean => {
    const join = SocketTypes.LATTICES["NUMERIC_ADDABLE"]?.join;
    if (!join) return false;
    let acc: string | undefined;
    for (let i = 0; i < sockets.length; i++) {
        const inbound = inbounds[i];
        let kind: string | undefined;
        if (inbound) {
            const ks = SocketTypes.project(inbound);
            if (ks.length === 1) kind = ks[0]; // a single fixed producer kind; polymorphic/wildcard -> flexible
        } else {
            kind = NumericKind.kindOf(String(node.payload[sockets[i]] ?? ""));
        }
        if (kind === undefined) continue;
        if (acc === undefined) {
            acc = kind;
            continue;
        }
        const j = join(acc, kind);
        if (j === null) return true;
        acc = j;
    }
    return false;
};
