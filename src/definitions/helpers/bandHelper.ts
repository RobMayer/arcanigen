import { Enum } from "../datatypes/enum";

// Shared geometry for the "banded" shape family (Banded Line, Banded Burst, ...): turn a straight
// centerline segment into a filled region with a start/end width. The two side edges ("legs") are the
// common external tangents to a circle at each endpoint (radius = half-width); Offset mode falls back
// to plain perpendicular offsets. Each end is closed by a bandCap built from that same circle:
//   Butt   = the tangent-point chord
//   Round  = the outer arc of the circle
//   Point  = the nose of the circle (center + r * outward-axis)
//   Square = the legs extended out to the line tangent at the nose
// When one end circle swallows the other we emit the larger circle instead.
export namespace BandHelper {
    export const EPS = 1e-6;

    export type Vec = { x: number; y: number };

    const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
    const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
    const scale = (a: Vec, s: number): Vec => ({ x: a.x * s, y: a.y * s });
    const dot = (a: Vec, b: Vec): number => a.x * b.x + a.y * b.y;
    const norm = (a: Vec): Vec => {
        const len = Math.hypot(a.x, a.y);
        return len < EPS ? { x: 0, y: 0 } : { x: a.x / len, y: a.y / len };
    };

    export const f = (v: number): number => Number(v.toFixed(4));
    export const pt = (p: Vec): string => `${f(p.x)},${f(p.y)}`;

    // Commands to travel from an end circle's +side rim point (P1, already the current point) to its
    // -side rim point (P2), closing the band across that end. `u` is the outward axis (away from the
    // band), `legOut1`/`legOut2` the outward leg directions used only by Square. Reused by curved bands
    // (Banded Arc) whose legs are arcs, not straight -- they compute their own end circle + rim points.
    export const capCommands = (cap: number, center: Vec, r: number, u: Vec, p1: Vec, p2: Vec, legOut1: Vec, legOut2: Vec): string => {
        if (r < EPS) return `L ${pt(p2)}`;

        switch (cap) {
            case Enum.Common.bandCap.ROUND.value: {
                // The outer arc of the circle from P1 to P2 (the side containing the nose = center + r*u).
                const a1 = Math.atan2(p1.y - center.y, p1.x - center.x);
                const a2 = Math.atan2(p2.y - center.y, p2.x - center.x);
                const au = Math.atan2(u.y, u.x);
                const TWO_PI = Math.PI * 2;
                const wrap = (v: number): number => ((v % TWO_PI) + TWO_PI) % TWO_PI;
                const deltaPos = wrap(a2 - a1); // increasing-atan2 (screen-clockwise, sweep=1) span P1->P2
                const noseOff = wrap(au - a1);
                const sweep = noseOff <= deltaPos ? 1 : 0;
                const span = sweep === 1 ? deltaPos : TWO_PI - deltaPos;
                const large = span > Math.PI ? 1 : 0;
                return `A ${f(r)} ${f(r)} 0 ${large} ${sweep} ${pt(p2)}`;
            }
            case Enum.Common.bandCap.POINT.value: {
                const tip = add(center, scale(u, r));
                return `L ${pt(tip)} L ${pt(p2)}`;
            }
            case Enum.Common.bandCap.SQUARE.value: {
                // Extend each leg outward until it meets the line tangent to the circle at the nose.
                const nose = add(center, scale(u, r));
                const project = (from: Vec, dir: Vec): Vec => {
                    const denom = dot(dir, u);
                    if (Math.abs(denom) < EPS) return from;
                    const t = dot(sub(nose, from), u) / denom;
                    return add(from, scale(dir, t));
                };
                const c1 = project(p1, legOut1);
                const c2 = project(p2, legOut2);
                return `L ${pt(c1)} L ${pt(c2)} L ${pt(p2)}`;
            }
            default: {
                // Butt: straight chord between the tangent points.
                return `L ${pt(p2)}`;
            }
        }
    };

    const circlePath = (c: Vec, r: number): string =>
        `M ${f(c.x + r)},${f(c.y)} A ${f(r)} ${f(r)} 0 1 0 ${f(c.x - r)},${f(c.y)} A ${f(r)} ${f(r)} 0 1 0 ${f(c.x + r)},${f(c.y)} Z`;

    // Build the filled band outline for one segment, or null when there is nothing to fill (coincident
    // endpoints or two zero-width ends). One circle swallowing the other yields the larger circle.
    export const buildPath = (start: Vec, end: Vec, startWidth: number, endWidth: number, bandMode: number, startCap: number, endCap: number): string | null => {
        const axis = sub(end, start);
        const L = Math.hypot(axis.x, axis.y);
        if (L < EPS) return null;

        const rs = Math.max(0, startWidth) / 2;
        const re = Math.max(0, endWidth) / 2;
        if (rs < EPS && re < EPS) return null;

        if (Math.abs(rs - re) >= L) {
            const bigger = rs >= re ? { c: start, r: rs } : { c: end, r: re };
            return circlePath(bigger.c, bigger.r);
        }

        const d = norm(axis);
        const n: Vec = { x: -d.y, y: d.x };

        // Outward radius directions to the tangent points on the +/- sides.
        let mPlus: Vec;
        let mMinus: Vec;
        if (bandMode === Enum.Common.bandMode.OFFSET.value) {
            mPlus = { x: n.x, y: n.y };
            mMinus = { x: -n.x, y: -n.y };
        } else {
            const phi = Math.asin(Math.max(-1, Math.min(1, (rs - re) / L)));
            const c = Math.cos(phi);
            const s = Math.sin(phi);
            mPlus = { x: c * n.x + s * d.x, y: c * n.y + s * d.y };
            mMinus = { x: -c * n.x + s * d.x, y: -c * n.y + s * d.y };
        }

        const A = add(start, scale(mPlus, rs)); // start, +side
        const B = add(start, scale(mMinus, rs)); // start, -side
        const D = add(end, scale(mPlus, re)); // end, +side
        const C = add(end, scale(mMinus, re)); // end, -side

        const uStart: Vec = { x: -d.x, y: -d.y };
        const uEnd: Vec = { x: d.x, y: d.y };

        // End cap: D (+side) -> C (-side). Legs extended outward: from D away from A, from C away from B.
        const endCapCmds = capCommands(endCap, end, re, uEnd, D, C, norm(sub(D, A)), norm(sub(C, B)));
        // Start cap: B (-side) -> A (+side). Legs extended outward: from B away from C, from A away from D.
        const startCapCmds = capCommands(startCap, start, rs, uStart, B, A, norm(sub(B, C)), norm(sub(A, D)));

        return `M ${pt(A)} L ${pt(D)} ${endCapCmds} L ${pt(B)} ${startCapCmds} Z`;
    };
}
