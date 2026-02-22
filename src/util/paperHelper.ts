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
