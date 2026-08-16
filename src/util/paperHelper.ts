import paper from "paper/dist/paper-core";
import { SVGPath } from "../types";
import { DataTypes } from "../definitions/dataTypes";

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

    // Total arc length of a path in px (transform baked in). Works on open paths and compound paths.
    export const pathLength = (pathData: SVGPath): number | null => {
        ensurePaper();
        const item = paper.project.importSVG(`<path d="${pathData.d}" transform="${pathData.transform}"/>`, { insert: false }) as paper.PathItem;
        if (!item) return null;
        try {
            const len = item instanceof paper.CompoundPath ? item.children.reduce((sum, child) => sum + (child as paper.Path).length, 0) : (item as paper.Path).length;
            item.remove();
            return len;
        } catch (e) {
            console.warn(e);
            item?.remove();
            return null;
        }
    };

    /**
     * Self-crossings of a single path: the points where the path (or any of a compound path's
     * subpaths) crosses itself or another subpath. Uses getCrossings, so only true crossings count
     * (where a curve changes side) — tangential touches are ignored, being a numerically degenerate
     * case (get those points another way if ever needed). Uses importAny so OPEN paths are kept
     * (unlike importPath) — combine upstream with Path Join into one path first. Transforms are baked
     * on import, so points come back in world space.
     */
    export const crossings = (pathData: SVGPath): { x: number; y: number }[] | null => {
        ensurePaper();
        const item = importAny(pathData);
        if (!item) return null;
        try {
            const points = item.getCrossings().map((loc) => ({ x: loc.point.x, y: loc.point.y }));
            item.remove();
            return points;
        } catch (e) {
            console.warn(e);
            item.remove();
            return null;
        }
    };

    /**
     * The seven fold operations a Path Combine row can apply. `inverse*` variants swap the operands
     * (the row's path becomes the minuend/dividend), which only matters for the non-commutative ops.
     */
    export type PathOpKind = "unify" | "intersect" | "exclude" | "subtract" | "inverseSubtract" | "divide" | "inverseDivide" | "join";

    // Permissive import used by the fold: keeps open paths (unlike importPath, which drops them).
    // Transforms are baked into the geometry, so pathData comes back in world space.
    function importAny(pathData: SVGPath): paper.PathItem | null {
        ensurePaper();
        const item = paper.project.importSVG(`<path d="${pathData.d}" transform="${pathData.transform}"/>`, { insert: false }) as paper.PathItem;
        return item ?? null;
    }

    // Join keeps every operand intact rather than resolving geometry: concatenate both operands'
    // (already transform-baked) subpaths into one compound path.
    function joinItems(a: paper.PathItem, b: paper.PathItem): paper.PathItem {
        return paper.project.importSVG(`<path d="${a.pathData} ${b.pathData}"/>`, { insert: false }) as paper.PathItem;
    }

    // Boolean ops need closed regions; an open path acts as the empty set. Join has no such rule.
    function isOpen(item: paper.PathItem): boolean {
        return item instanceof paper.Path && !item.closed;
    }

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
        join: { compute: joinItems, whenBNull: "A", whenANull: "B" },
    };

    // Folds one row into the running accumulator. Consumes (removes) the operands it no longer needs.
    function applyOp(op: PathOpKind, a: paper.PathItem | null, b: paper.PathItem | null): paper.PathItem | null {
        const rule = OP_TABLE[op];

        // Every op but Join treats an open path as the empty set; drop opens before folding.
        if (op !== "join") {
            if (a && isOpen(a)) {
                a.remove();
                a = null;
            }
            if (b && isOpen(b)) {
                b.remove();
                b = null;
            }
        }

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
            const imported: paper.PathItem | null = entry.path ? importAny(entry.path) : null;
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

    /**
     * Join a set of paths into one compound path, keeping every subpath intact (no boolean
     * resolution). Transforms are baked on import so differently-transformed paths line up; open
     * paths are preserved. Nulls are skipped. Returns null if nothing survives.
     */
    export const join = (paths: (SVGPath | null)[]): DataTypes.AnyEval | null => {
        ensurePaper();
        const items = paths.filter((p): p is SVGPath => p !== null).map(importAny);
        const live = items.filter((i): i is paper.PathItem => i !== null);
        if (live.length === 0) return null;

        const d = live.map((i) => i.pathData).join(" ");
        live.forEach((i) => i.remove());
        const result = paper.project.importSVG(`<path d="${d}"/>`, { insert: false }) as paper.PathItem;
        return toResult(result);
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

    // ─── Sampling ────────────────────────────────────────────────────────────

    // A path sampled at one arc-length offset: world-space point plus tangent heading in degrees.
    export type Sample = { x: number; y: number; angle: number };

    // How a distance-along-path is expressed: a fraction of total length plus an absolute px nudge.
    // Same shape alongPath/pathLayout hand to the renderer's offsetPath.
    export type Distance = { percent: number; px: number };

    // The subpaths of an item with their individual arc lengths, in draw order. A plain path is a
    // single segment; a compound path is its children. This is what lets a global offset be treated
    // as ONE concatenated length line (subpath 1, then subpath 2, ...) — matching the DOM
    // getPointAtLength semantics that alongPath/pathLayout render with.
    function segmentsOf(item: paper.PathItem): { path: paper.Path; length: number }[] {
        const paths = item instanceof paper.CompoundPath ? (item.children as paper.Path[]) : [item as paper.Path];
        return paths.map((path) => ({ path, length: path.length }));
    }

    // Map one Distance to a Sample against the concatenated length line. Wrap/clamp mirrors
    // resolveOffsetPath exactly so a point sampled here lands where an offsetPath shape renders.
    function sampleSegments(segments: { path: paper.Path; length: number }[], total: number, distance: Distance, overflow: "wrap" | "clamp"): Sample | null {
        let dist = (distance.percent / 100) * total + distance.px;
        if (overflow === "wrap") {
            dist = ((dist % total) + total) % total;
        } else {
            dist = Math.max(0, Math.min(total, dist));
        }

        let acc = 0;
        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            const isLast = i === segments.length - 1;
            if (dist <= acc + seg.length || isLast) {
                const local = Math.max(0, Math.min(seg.length, dist - acc));
                const pt = seg.path.getPointAt(local);
                const tan = seg.path.getTangentAt(local);
                if (!pt || !tan) return null;
                return { x: pt.x, y: pt.y, angle: (Math.atan2(tan.y, tan.x) * 180) / Math.PI };
            }
            acc += seg.length;
        }
        return null;
    }

    // Sample every offset against one already-imported item. Compound paths sample as one
    // concatenated length line; a length-0 path yields an all-null array.
    function sampleItem(item: paper.PathItem, distances: Distance[], overflow: "wrap" | "clamp"): (Sample | null)[] {
        const segments = segmentsOf(item);
        const total = segments.reduce((sum, s) => sum + s.length, 0);
        if (total <= 0) return distances.map(() => null);
        return distances.map((d) => sampleSegments(segments, total, d, overflow));
    }

    // Sample many offsets in one import (transforms baked in, so points come back in world space —
    // like crossings/pathLength). Each entry is null if that offset couldn't be sampled.
    export const sampleMany = (pathData: SVGPath, distances: Distance[], overflow: "wrap" | "clamp"): (Sample | null)[] => {
        ensurePaper();
        const item = importAny(pathData);
        if (!item) return distances.map(() => null);
        try {
            const out = sampleItem(item, distances, overflow);
            item.remove();
            return out;
        } catch (e) {
            console.warn(e);
            item.remove();
            return distances.map(() => null);
        }
    };

    // Single-offset convenience over sampleMany.
    export const sampleAt = (pathData: SVGPath, distance: Distance, overflow: "wrap" | "clamp"): Sample | null => {
        return sampleMany(pathData, [distance], overflow)[0] ?? null;
    };

    // Local-space single sample from a raw `d` (no transform baked). For the renderer's offsetPath,
    // which applies the path's transform separately via its own <g>, so sampling must stay in the
    // path's own coordinate space. Compound `d` (multiple subpaths) samples as one concatenated line.
    export const sampleLocalD = (d: string, distance: Distance, overflow: "wrap" | "clamp"): Sample | null => {
        ensurePaper();
        const item = paper.project.importSVG(`<path d="${d}"/>`, { insert: false }) as paper.PathItem;
        if (!item) return null;
        try {
            const out = sampleItem(item, [distance], overflow)[0] ?? null;
            item.remove();
            return out;
        } catch (e) {
            console.warn(e);
            item.remove();
            return null;
        }
    };

    // Split a compound path into its individual subpaths, each as its own path (transforms baked into
    // geometry on import, like crossings/pathLength). A plain path returns a single entry. Empty
    // subpaths are dropped. Returns null only if the path fails to import.
    export const decompound = (pathData: SVGPath): SVGPath[] | null => {
        ensurePaper();
        const item = importAny(pathData);
        if (!item) return null;
        try {
            const children = item instanceof paper.CompoundPath ? (item.children as paper.Path[]) : [item as paper.Path];
            const out = children
                .filter((c) => c && c.pathData)
                .map((c) => ({
                    d: c.pathData,
                    transform: "",
                }));
            item.remove();
            return out;
        } catch (e) {
            console.warn(e);
            item.remove();
            return null;
        }
    };
}
