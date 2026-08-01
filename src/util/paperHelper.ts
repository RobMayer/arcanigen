import paper from "paper/dist/paper-core";
import { SVGPath } from "../types";
import { DataTypes } from "../definitions/betterTypes";

export namespace PaperHelper {
    let initialized = false;

    function ensurePaper() {
        if (!initialized) {
            paper.setup(new paper.Size(1, 1));
            initialized = true;
        }
    }

    function importPath(pathData: SVGPath): paper.Path | null {
        ensurePaper();
        const item = paper.project.importSVG(`<path d="${pathData.d}" transform="${pathData.transform}"/>`, { insert: false }) as paper.Path;
        if (!item.closed) {
            item.remove();
            return null;
        }
        return item;
    }

    function toResult(result: paper.PathItem): DataTypes.AnyEval {
        const out: DataTypes.AnyEval = {
            kind: "path",
            data: {
                d: result.pathData,
                transform: "",
                preview: { x: result.bounds.x, y: result.bounds.y, w: result.bounds.width, h: result.bounds.height },
            },
        };
        result.remove();
        return out;
    }

    function booleanOp(pathA: SVGPath, pathB: SVGPath, op: (a: paper.Path, b: paper.Path) => paper.PathItem): DataTypes.AnyEval | null {
        const a = importPath(pathA);
        const b = importPath(pathB);
        if (!a || !b) {
            a?.remove();
            b?.remove();
            return null;
        }
        try {
            const result = op(a, b);
            a.remove();
            b.remove();
            return toResult(result);
        } catch (e) {
            console.warn(e);
            a.remove();
            b.remove();
            return null;
        }
    }

    export const unify = (pathA: SVGPath, pathB: SVGPath): DataTypes.AnyEval | null => {
        return booleanOp(pathA, pathB, (a, b) => a.unite(b));
    };

    export const subtract = (pathA: SVGPath, pathB: SVGPath): DataTypes.AnyEval | null => {
        return booleanOp(pathA, pathB, (a, b) => a.subtract(b));
    };

    export const exclude = (pathA: SVGPath, pathB: SVGPath): DataTypes.AnyEval | null => {
        return booleanOp(pathA, pathB, (a, b) => a.exclude(b));
    };

    export const intersect = (pathA: SVGPath, pathB: SVGPath): DataTypes.AnyEval | null => {
        return booleanOp(pathA, pathB, (a, b) => a.intersect(b));
    };

    export const divide = (pathA: SVGPath, pathB: SVGPath): DataTypes.AnyEval | null => {
        return booleanOp(pathA, pathB, (a, b) => a.divide(b));
    };

    /**
     * The seven fold operations a Path Combine row can apply. `inverse*` variants swap the operands
     * (the row's path becomes the minuend/dividend), which only matters for the non-commutative ops.
     */
    export type PathOpKind = "unify" | "intersect" | "exclude" | "subtract" | "inverseSubtract" | "divide" | "inverseDivide";

    /**
     * How each op behaves when exactly one operand is missing. Derived by treating null as the empty
     * set (∅): e.g. Subtract with a null row-path is `acc − ∅ = acc`, Intersect with anything null is ∅.
     * "A" keeps the accumulator, "B" adopts the row's path, "null" empties the pipeline.
     */
    const OP_TABLE: Record<
        PathOpKind,
        {
            compute: (a: paper.PathItem, b: paper.PathItem) => paper.PathItem;
            whenBNull: "A" | "null";
            whenANull: "B" | "null";
        }
    > = {
        unify: { compute: (a, b) => a.unite(b, { insert: false }), whenBNull: "A", whenANull: "B" },
        intersect: { compute: (a, b) => a.intersect(b, { insert: false }), whenBNull: "null", whenANull: "null" },
        exclude: { compute: (a, b) => a.exclude(b, { insert: false }), whenBNull: "A", whenANull: "B" },
        subtract: { compute: (a, b) => a.subtract(b, { insert: false }), whenBNull: "A", whenANull: "null" },
        inverseSubtract: { compute: (a, b) => b.subtract(a, { insert: false }), whenBNull: "null", whenANull: "B" },
        divide: { compute: (a, b) => a.divide(b, { insert: false }), whenBNull: "A", whenANull: "null" },
        inverseDivide: { compute: (a, b) => b.divide(a, { insert: false }), whenBNull: "null", whenANull: "B" },
    };

    // Folds one row into the running accumulator. Consumes (removes) the operands it no longer needs.
    function applyOp(op: PathOpKind, a: paper.PathItem | null, b: paper.PathItem | null): paper.PathItem | null {
        const rule = OP_TABLE[op];

        if (a && b) {
            try {
                const result = rule.compute(a, b);
                a.remove();
                b.remove();
                return result;
            } catch (e) {
                // A single degenerate op shouldn't nuke the whole chain — skip it, keep the accumulator.
                console.warn(e);
                b.remove();
                return a;
            }
        }

        if (!a && !b) return null;

        if (!b) {
            // row path missing
            if (rule.whenBNull === "A") return a;
            a?.remove();
            return null;
        }
        // accumulator missing
        if (rule.whenANull === "B") return b;
        b.remove();
        return null;
    }

    /**
     * Left-folds an ordered list of path/op rows. The first entry seeds the accumulator (its op is
     * ignored — there's nothing to combine with yet); each subsequent entry applies its op against the
     * running result. Callers should pass only enabled rows, already in order. Open paths import as
     * null and are handled per {@link OP_TABLE}. Returns null if the fold ends empty.
     */
    export const combine = (entries: { op: PathOpKind; path: SVGPath | null }[]): DataTypes.AnyEval | null => {
        ensurePaper();

        let acc: paper.PathItem | null = null;
        let seeded = false;

        for (const entry of entries) {
            const imported: paper.PathItem | null = entry.path ? importPath(entry.path) : null;
            if (!seeded) {
                acc = imported;
                seeded = true;
                continue;
            }
            acc = applyOp(entry.op, acc, imported);
        }

        if (!acc) return null;
        return toResult(acc);
    };

    export const reverseD = (d: string): string | null => {
        ensurePaper();
        const p = paper.project.importSVG(`<path d="${d}"/>`, { insert: false }) as paper.Path;
        if (!p) return null;
        try {
            p.reverse();
            const out = p.pathData;
            p.remove();
            return out;
        } catch (e) {
            console.warn(e);
            p.remove();
            return null;
        }
    };

    export const healD = (d: string): string | null => {
        ensurePaper();
        const p = paper.project.importSVG(`<path d="${d}"/>`, { insert: false }) as paper.Path;
        if (!p) return null;
        try {
            const result = p.unite(p);
            const out = result.pathData;
            result.remove();
            p.remove();
            return out;
        } catch (e) {
            console.warn(e);
            p.remove();
            return null;
        }
    };

    export const heal = (path: SVGPath): DataTypes.AnyEval | null => {
        const p = importPath(path);
        if (!p) return null;
        try {
            const result = p.unite(p);
            p.remove();
            return toResult(result);
        } catch (e) {
            console.warn(e);
            p.remove();
            return null;
        }
    };
}
