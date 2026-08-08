import { gcd } from "../../../util/misc";

/**
 * Shared spirograph (roulette curve) sampler used by both the Spirograph node and its ringed
 * sibling Spiroring. Kept in one place so the two nodes can't drift on the curve math.
 *
 * A roulette is traced by a pen fixed to a wheel of radius `r` rolling along a fixed ring of
 * radius `R`, with the pen a distance `d` from the wheel's centre:
 *   inside  (hypotrochoid):  x = (R−r)cosθ + d·cos(kθ),  y = (R−r)sinθ − d·sin(kθ)
 *   outside (epitrochoid):   x = (R+r)cosθ − d·cos(kθ),  y = (R+r)sinθ − d·sin(kθ)
 * where k = (R∓r)/r is the frequency of the inner term.
 */
export namespace Spirograph {
    export type Options = {
        ringRadius: number; // R — fixed ring
        wheelRadius: number; // r — rolling wheel
        penDistance: number; // d — pen offset from wheel centre
        inside: boolean; // hypotrochoid (true) vs epitrochoid (false)
        turns: number; // number of full θ revolutions to trace
        samples: number; // total sample count
        closed: boolean; // sample θ exclusive of the endpoint (curve wraps back on itself)
    };

    /** A sampled point plus its unit normal (left of travel). */
    export type SamplePoint = { x: number; y: number; nx: number; ny: number };

    /**
     * Revolutions of θ needed for a geared spirograph to close. The pattern repeats after the
     * wheel makes wheelTeeth / gcd(ringTeeth, wheelTeeth) trips around the ring centre.
     */
    export const closingTurns = (ringTeeth: number, wheelTeeth: number): number => {
        const g = gcd(Math.max(1, Math.round(ringTeeth)), Math.max(1, Math.round(wheelTeeth)));
        return Math.max(1, Math.round(wheelTeeth) / g);
    };

    type Geometry = Pick<Options, "ringRadius" | "wheelRadius" | "penDistance" | "inside">;

    /**
     * The figure's outer (circumradius) and inner (apothem) extents — the max/min distance the pen
     * reaches from the origin. The carrier arm has length |R∓r| and the pen swings ±d about it.
     */
    export const figureMetrics = ({ ringRadius, wheelRadius, penDistance, inside }: Geometry): { circum: number; apothem: number } => {
        const base = Math.abs(inside ? ringRadius - wheelRadius : ringRadius + wheelRadius);
        const d = Math.abs(penDistance);
        return { circum: base + d, apothem: Math.abs(base - d) };
    };

    /** Largest distance from the origin the curve reaches — used for the preview bounding box. */
    export const maxRadius = (geo: Geometry): number => figureMetrics(geo).circum;

    export type RadiusMode = "major" | "minor" | "mechanical";

    /**
     * Back-solve the ring radius R in Geared mode so the chosen figure radius equals `radius`.
     * The figure's circumradius/apothem scale linearly with R, so each mode is just a divide.
     * Falls back to Mechanical (R = radius) when the target extent collapses to ~0 (e.g. a curve
     * whose apothem passes through the origin).
     */
    export const gearedRingRadius = (radius: number, mode: RadiusMode, ratio: number, penOffset: number, inside: boolean): number => {
        if (mode === "mechanical") return radius;
        const unit = figureMetrics({ ringRadius: 1, wheelRadius: ratio, penDistance: ratio * penOffset, inside });
        const factor = mode === "major" ? unit.circum : unit.apothem;
        return factor > 1e-6 ? radius / factor : radius;
    };

    export const sample = ({ ringRadius: R, wheelRadius: r, penDistance: d, inside, turns, samples, closed }: Options): SamplePoint[] => {
        const count = Math.max(2, Math.round(samples));
        const thetaMax = turns * 2 * Math.PI;

        const a = inside ? R - r : R + r; // amplitude of the outer term
        const k = a / r; // frequency of the inner term
        const sx = inside ? 1 : -1; // x inner term sign flips between hypo/epi

        const points: SamplePoint[] = [];
        // Closed curves wrap, so the last sample coincides with the first — sample [0, θmax)
        // exclusively to avoid a duplicate seam point. Open curves include the endpoint.
        const divisor = closed ? count : count - 1;

        for (let n = 0; n < count; n++) {
            const theta = (thetaMax * n) / divisor;

            const x = a * Math.cos(theta) + sx * d * Math.cos(k * theta);
            const y = a * Math.sin(theta) - d * Math.sin(k * theta);

            // Analytic tangent (dx/dθ, dy/dθ) → left-hand unit normal (−dy, dx).
            const dx = -a * Math.sin(theta) - sx * d * k * Math.sin(k * theta);
            const dy = a * Math.cos(theta) - d * k * Math.cos(k * theta);
            const len = Math.hypot(dx, dy);

            let nx: number;
            let ny: number;
            if (len < 1e-9) {
                // Degenerate tangent (a cusp) — fall back to the radial direction.
                const rl = Math.hypot(x, y) || 1;
                nx = x / rl;
                ny = y / rl;
            } else {
                nx = -dy / len;
                ny = dx / len;
            }

            points.push({ x, y, nx, ny });
        }

        return points;
    };

    /**
     * Offset one side of the curve by a signed distance `delta` along the (left) normal.
     *
     * On a concave stretch the offset can fold back on itself into a small "pinch" loop. We don't
     * try to detect that here — the offset boundary is healed (self-united) downstream, which
     * dissolves those loops geometrically. Coincident points are dropped so Heal gets clean input.
     */
    export const offsetSide = (pts: readonly SamplePoint[], delta: number): { x: number; y: number }[] => {
        const out: { x: number; y: number }[] = [];
        for (const p of pts) {
            const x = p.x + p.nx * delta;
            const y = p.y + p.ny * delta;
            const prev = out[out.length - 1];
            if (!prev || Math.hypot(prev.x - x, prev.y - y) > 1e-2) {
                out.push({ x, y });
            }
        }
        return out;
    };

    const TENSION = 1;

    /** Catmull-Rom → cubic Bézier smoothing of a sampled polyline, with wraparound when closed. */
    export const toPath = (pts: readonly { x: number; y: number }[], closed: boolean): string => {
        if (pts.length < 2) return "";
        const n = pts.length;
        const at = closed ? (i: number) => pts[((i % n) + n) % n] : (i: number) => pts[Math.max(0, Math.min(n - 1, i))];

        let d = `M ${pts[0].x},${pts[0].y}`;
        const end = closed ? n : n - 1;
        for (let i = 0; i < end; i++) {
            const p0 = at(i - 1);
            const p1 = at(i);
            const p2 = at(i + 1);
            const p3 = at(i + 2);
            const c1x = p1.x + ((p2.x - p0.x) / 6) * TENSION;
            const c1y = p1.y + ((p2.y - p0.y) / 6) * TENSION;
            const c2x = p2.x - ((p3.x - p1.x) / 6) * TENSION;
            const c2y = p2.y - ((p3.y - p1.y) / 6) * TENSION;
            d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
        }
        if (closed) d += " Z";
        return d;
    };
}
