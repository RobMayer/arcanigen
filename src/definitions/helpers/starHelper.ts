import { deg2rad, delerp, lerp } from "../../util/misc";

// Shared geometry for star outlines (Star, Banded Star, ...). A star outline is an interleaved ring of
// tip (major) and valley (minor) vertices, each carrying its own corner radius/shape. `buildOutline`
// emits one closed rounded subpath and takes a `reversed` flag (flips round/scoop arc sweeps) so a
// hole-cutting inner outline can be wound opposite the outer one -- the nonzero-fill trick Ring/Knot use.
export namespace StarHelper {
    export type Vertex = { x: number; y: number; cornerR: number; cornerShape: number };

    // Interleaved tip(major)/valley(minor) vertices for one star outline. Tips sit at i/N, valleys at
    // (i+0.5)/N, both routed through the angular distribution lerper.
    export const outlineVertices = (
        N: number,
        majorR: number,
        minorR: number,
        majorCornerR: number,
        majorCornerShape: number,
        minorCornerR: number,
        minorCornerShape: number,
        distroLerper: (t: number) => number,
    ): Vertex[] => {
        const verts: Vertex[] = [];
        for (let i = 0; i < N; i++) {
            const majorAngle = deg2rad(lerp(delerp(i, 0, N), 0, 360, distroLerper) - 90);
            verts.push({ x: majorR * Math.cos(majorAngle), y: majorR * Math.sin(majorAngle), cornerR: majorCornerR, cornerShape: majorCornerShape });

            const minorAngle = deg2rad(lerp(delerp(i + 0.5, 0, N), 0, 360, distroLerper) - 90);
            verts.push({ x: minorR * Math.cos(minorAngle), y: minorR * Math.sin(minorAngle), cornerR: minorCornerR, cornerShape: minorCornerShape });
        }
        return verts;
    };

    // Build a closed star subpath with per-vertex corner params. Returns [d, hasCut]; a "Cut" corner
    // opens the outline (the caller drops fill). `reversed` flips round/scoop sweeps for hole cutting.
    export const buildOutline = (vertices: Vertex[], reversed: boolean): [string, boolean] => {
        const N = vertices.length;

        if (vertices.every((v) => v.cornerR <= 0)) {
            return [
                `M ${vertices[0].x},${vertices[0].y} ${vertices
                    .slice(1)
                    .map((v) => `L ${v.x},${v.y}`)
                    .join(" ")} Z`,
                false,
            ];
        }

        const edgeLengths = vertices.map((v, i) => {
            const next = vertices[(i + 1) % N];
            return Math.hypot(next.x - v.x, next.y - v.y);
        });

        const vertexData = vertices.map((curr, i) => {
            const prev = vertices[(i - 1 + N) % N];
            const next = vertices[(i + 1) % N];
            const ax = prev.x - curr.x,
                ay = prev.y - curr.y;
            const bx = next.x - curr.x,
                by = next.y - curr.y;
            const lenA = edgeLengths[(i - 1 + N) % N];
            const lenB = edgeLengths[i];
            const cosAlpha = Math.max(-1, Math.min(1, (ax * bx + ay * by) / (lenA * lenB)));
            const halfAlpha = Math.acos(cosAlpha) / 2;
            return { ax, ay, bx, by, lenA, lenB, halfAlpha };
        });

        // Per-vertex clamped radius: clamp each to half adjacent edge lengths.
        const clampedR = vertices.map((v, i) => {
            const r = v.cornerR;
            if (r <= 0) return 0;
            const { halfAlpha } = vertexData[i];
            const tanHalf = Math.tan(halfAlpha);
            if (tanHalf <= 1e-10) return 0;
            const halfPrev = edgeLengths[(i - 1 + N) % N] / 2;
            const halfNext = edgeLengths[i] / 2;
            return Math.min(r, Math.min(halfPrev, halfNext) * tanHalf);
        });

        const parts: string[] = [];
        let hasCut = false;
        let firstApX = 0,
            firstApY = 0;
        let firstSet = false;
        for (let i = 0; i < N; i++) {
            const r = clampedR[i];
            const cornerShape = vertices[i].cornerShape;

            if (r <= 0) {
                if (!firstSet) {
                    firstApX = vertices[i].x;
                    firstApY = vertices[i].y;
                    firstSet = true;
                }
                parts.push(i === 0 ? `M ${vertices[i].x},${vertices[i].y}` : `L ${vertices[i].x},${vertices[i].y}`);
                continue;
            }

            const { ax, ay, bx, by, lenA, lenB, halfAlpha } = vertexData[i];
            const curr = vertices[i];
            const t = r / Math.tan(halfAlpha);

            const apX = curr.x + (ax / lenA) * t;
            const apY = curr.y + (ay / lenA) * t;
            const lpX = curr.x + (bx / lenB) * t;
            const lpY = curr.y + (by / lenB) * t;

            if (!firstSet) {
                firstApX = apX;
                firstApY = apY;
                firstSet = true;
            }
            parts.push(i === 0 ? `M ${apX},${apY}` : `L ${apX},${apY}`);

            switch (cornerShape) {
                case 0: // Round
                    parts.push(`A ${r},${r} 0 ${reversed ? "0,0" : "0,1"} ${lpX},${lpY}`);
                    break;
                case 2: // Scoop
                    parts.push(`A ${r},${r} 0 ${reversed ? "0,1" : "0,0"} ${lpX},${lpY}`);
                    break;
                case 3: {
                    // Notch
                    const nX = apX + (bx / lenB) * t;
                    const nY = apY + (by / lenB) * t;
                    parts.push(`L ${nX},${nY} L ${lpX},${lpY}`);
                    break;
                }
                case 4: // Cut
                    parts.push(`M ${lpX},${lpY}`);
                    hasCut = true;
                    break;
                default: // Bevel
                    parts.push(`L ${lpX},${lpY}`);
                    break;
            }
        }
        if (hasCut) {
            parts.push(`L ${firstApX},${firstApY}`);
        } else {
            parts.push("Z");
        }
        return [parts.join(" "), hasCut];
    };
}
