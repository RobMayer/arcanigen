import { Enum } from "../definitions/datatypes/enum";

// All converters work with RGB channels in [0, 1] range.
// Alpha is carried separately and always lerped linearly.

type ColorSpaceConverter = {
    fromRGB: (r: number, g: number, b: number) => number[];
    toRGB: (components: number[]) => [number, number, number];
    hueIndex: number | null; // which component index is hue (0–360), or null if no hue
};

// ============================================================================
// Converters
// ============================================================================

const RGB: ColorSpaceConverter = {
    fromRGB: (r, g, b) => [r, g, b],
    toRGB: (c) => [c[0], c[1], c[2]],
    hueIndex: null,
};

const CMY: ColorSpaceConverter = {
    fromRGB: (r, g, b) => [1 - r, 1 - g, 1 - b],
    toRGB: (c) => [1 - c[0], 1 - c[1], 1 - c[2]],
    hueIndex: null,
};

const CMYK: ColorSpaceConverter = {
    fromRGB: (r, g, b) => {
        const k = 1 - Math.max(r, g, b);
        if (k >= 1) return [0, 0, 0, 1];
        const inv = 1 / (1 - k);
        return [(1 - r - k) * inv, (1 - g - k) * inv, (1 - b - k) * inv, k];
    },
    toRGB: (c) => {
        const inv = 1 - c[3];
        return [c[0] * inv + c[3], c[1] * inv + c[3], c[2] * inv + c[3]];
    },
    hueIndex: null,
};

// Shared: extract hue from RGB (returns 0–360)
const rgbToHue = (r: number, g: number, b: number): number => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    if (d === 0) return 0;
    let h: number;
    switch (max) {
        case r:
            h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
            break;
        case g:
            h = ((b - r) / d + 2) / 6;
            break;
        default:
            h = ((r - g) / d + 4) / 6;
            break;
    }
    return h * 360;
};

// Shared: HSV/HSL helper — hue to RGB sector
const hueToRGB = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
};

const HSV: ColorSpaceConverter = {
    fromRGB: (r, g, b) => {
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const h = rgbToHue(r, g, b);
        const s = max === 0 ? 0 : (max - min) / max;
        return [h, s, max];
    },
    toRGB: (c) => {
        const [h, s, v] = c;
        if (s === 0) return [v, v, v];
        const hh = (h / 60) % 6;
        const i = Math.floor(hh);
        const f = hh - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);
        switch (i) {
            case 0:
                return [v, t, p];
            case 1:
                return [q, v, p];
            case 2:
                return [p, v, t];
            case 3:
                return [p, q, v];
            case 4:
                return [t, p, v];
            default:
                return [v, p, q];
        }
    },
    hueIndex: 0,
};

const HSL: ColorSpaceConverter = {
    fromRGB: (r, g, b) => {
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const h = rgbToHue(r, g, b);
        const l = (max + min) / 2;
        const s = max === min ? 0 : l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
        return [h, s, l];
    },
    toRGB: (c) => {
        const [h, s, l] = c;
        if (s === 0) return [l, l, l];
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        const hNorm = h / 360;
        return [hueToRGB(p, q, hNorm + 1 / 3), hueToRGB(p, q, hNorm), hueToRGB(p, q, hNorm - 1 / 3)];
    },
    hueIndex: 0,
};

const HWK: ColorSpaceConverter = {
    fromRGB: (r, g, b) => {
        const h = rgbToHue(r, g, b);
        const w = Math.min(r, g, b);
        const k = 1 - Math.max(r, g, b);
        return [h, w, k];
    },
    toRGB: (c) => {
        const [h, w, k] = c;
        // HWK -> RGB: start with pure hue, then mix with white and black
        const hNorm = h / 360;
        const r1 = hueToRGB(0, 1, hNorm + 1 / 3);
        const g1 = hueToRGB(0, 1, hNorm);
        const b1 = hueToRGB(0, 1, hNorm - 1 / 3);
        const total = w + k;
        if (total >= 1) {
            // Degenerate: clamp to gray
            const gray = w / total;
            return [gray, gray, gray];
        }
        const scale = 1 - w - k;
        return [r1 * scale + w, g1 * scale + w, b1 * scale + w];
    },
    hueIndex: 0,
};

const HSI: ColorSpaceConverter = {
    fromRGB: (r, g, b) => {
        const h = rgbToHue(r, g, b);
        const i = (r + g + b) / 3;
        const s = i === 0 ? 0 : 1 - Math.min(r, g, b) / i;
        return [h, s, i];
    },
    toRGB: (c) => {
        const [h, s, i] = c;
        if (s === 0) return [i, i, i];
        const hRad = (h * Math.PI) / 180;
        const sector = Math.floor(h / 120);
        const hAdj = hRad - (sector * 2 * Math.PI) / 3;

        const cos_h = Math.cos(hAdj);
        const cos_60h = Math.cos(Math.PI / 3 - hAdj);

        const c1 = i * (1 - s);
        const c2 = i * (1 + (s * cos_h) / cos_60h);
        const c3 = 3 * i - c1 - c2;

        switch (sector % 3) {
            case 0:
                return [c2, c3, c1];
            case 1:
                return [c1, c2, c3];
            default:
                return [c3, c1, c2];
        }
    },
    hueIndex: 0,
};

// BT.709 luminance weights
const LUM_R = 0.2126;
const LUM_G = 0.7152;
const LUM_B = 0.0722;

const HCY: ColorSpaceConverter = {
    fromRGB: (r, g, b) => {
        const h = rgbToHue(r, g, b);
        const y = LUM_R * r + LUM_G * g + LUM_B * b;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const ch = max - min;
        return [h, ch, y];
    },
    toRGB: (c) => {
        const [h, ch, y] = c;
        if (ch === 0) return [y, y, y];
        const hh = h / 60;
        const x = ch * (1 - Math.abs((hh % 2) - 1));
        let r1: number, g1: number, b1: number;
        if (hh < 1) {
            [r1, g1, b1] = [ch, x, 0];
        } else if (hh < 2) {
            [r1, g1, b1] = [x, ch, 0];
        } else if (hh < 3) {
            [r1, g1, b1] = [0, ch, x];
        } else if (hh < 4) {
            [r1, g1, b1] = [0, x, ch];
        } else if (hh < 5) {
            [r1, g1, b1] = [x, 0, ch];
        } else {
            [r1, g1, b1] = [ch, 0, x];
        }
        const m = y - (LUM_R * r1 + LUM_G * g1 + LUM_B * b1);
        return [r1 + m, g1 + m, b1 + m];
    },
    hueIndex: 0,
};

// D65 reference white
const XN = 0.95047;
const YN = 1.0;
const ZN = 1.08883;

const CIELAB_EPSILON = 216 / 24389;
const CIELAB_KAPPA = 24389 / 27;

const rgbToXYZ = (r: number, g: number, b: number): [number, number, number] => {
    // sRGB -> linear
    const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    const rl = toLinear(r);
    const gl = toLinear(g);
    const bl = toLinear(b);
    // Linear RGB -> XYZ (sRGB D65 matrix)
    return [0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl, 0.2126729 * rl + 0.7151522 * gl + 0.072175 * bl, 0.0193339 * rl + 0.119192 * gl + 0.9503041 * bl];
};

const xyzToRGB = (x: number, y: number, z: number): [number, number, number] => {
    // XYZ -> linear RGB
    const rl = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
    const gl = -0.969266 * x + 1.8760108 * y + 0.041556 * z;
    const bl = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;
    // linear -> sRGB
    const toSRGB = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
    return [toSRGB(rl), toSRGB(gl), toSRGB(bl)];
};

const CIELAB: ColorSpaceConverter = {
    fromRGB: (r, g, b) => {
        const [x, y, z] = rgbToXYZ(r, g, b);
        const f = (t: number) => (t > CIELAB_EPSILON ? Math.cbrt(t) : (CIELAB_KAPPA * t + 16) / 116);
        const fx = f(x / XN);
        const fy = f(y / YN);
        const fz = f(z / ZN);
        return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
    },
    toRGB: (c) => {
        const [l, a, b] = c;
        const fy = (l + 16) / 116;
        const fx = a / 500 + fy;
        const fz = fy - b / 200;
        const finv = (t: number) => {
            const t3 = t * t * t;
            return t3 > CIELAB_EPSILON ? t3 : (116 * t - 16) / CIELAB_KAPPA;
        };
        return xyzToRGB(finv(fx) * XN, finv(fy) * YN, finv(fz) * ZN);
    },
    hueIndex: null,
};

// Oklab M1 and M2 matrices (from Björn Ottosson's paper)
const OKLAB: ColorSpaceConverter = {
    fromRGB: (r, g, b) => {
        // sRGB -> linear
        const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
        const rl = toLinear(r);
        const gl = toLinear(g);
        const bl = toLinear(b);

        const l_ = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
        const m_ = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
        const s_ = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;

        const l = Math.cbrt(l_);
        const m = Math.cbrt(m_);
        const s = Math.cbrt(s_);

        return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
    },
    toRGB: (c) => {
        const [L, a, b] = c;

        const l = L + 0.3963377774 * a + 0.2158037573 * b;
        const m = L - 0.1055613458 * a - 0.0638541728 * b;
        const s = L - 0.0894841775 * a - 1.291485548 * b;

        const l3 = l * l * l;
        const m3 = m * m * m;
        const s3 = s * s * s;

        const rl = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
        const gl = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
        const bl = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

        // linear -> sRGB
        const toSRGB = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
        return [toSRGB(rl), toSRGB(gl), toSRGB(bl)];
    },
    hueIndex: null,
};

const OKLCH: ColorSpaceConverter = {
    fromRGB: (r, g, b) => {
        const [L, a, bComp] = OKLAB.fromRGB(r, g, b);
        const C = Math.sqrt(a * a + bComp * bComp);
        const H = (Math.atan2(bComp, a) * 180) / Math.PI;
        return [L, C, H < 0 ? H + 360 : H];
    },
    toRGB: (c) => {
        const [L, C, H] = c;
        const hRad = (H * Math.PI) / 180;
        return OKLAB.toRGB([L, C * Math.cos(hRad), C * Math.sin(hRad)]);
    },
    hueIndex: 2,
};

const CIELCH: ColorSpaceConverter = {
    fromRGB: (r, g, b) => {
        const [L, a, bComp] = CIELAB.fromRGB(r, g, b);
        const C = Math.sqrt(a * a + bComp * bComp);
        const H = (Math.atan2(bComp, a) * 180) / Math.PI;
        return [L, C, H < 0 ? H + 360 : H];
    },
    toRGB: (c) => {
        const [L, C, H] = c;
        const hRad = (H * Math.PI) / 180;
        return CIELAB.toRGB([L, C * Math.cos(hRad), C * Math.sin(hRad)]);
    },
    hueIndex: 2,
};

// ============================================================================
// Converter registry (indexed by Enum.Common.colorSpace values)
// ============================================================================

const CONVERTERS: ColorSpaceConverter[] = [
    RGB, // 0
    CMY, // 1
    CMYK, // 2
    HSV, // 3
    HSL, // 4
    HWK, // 5
    HSI, // 6
    HCY, // 7
    CIELAB, // 8
    OKLAB, // 9
    OKLCH, // 10
    CIELCH, // 11
    RGB, // 12 (RGB_BYTE — same converter, joiner scales the inputs differently)
];

// ============================================================================
// Hue interpolation
// ============================================================================

/**
 * Interpolates hue values (0–360) according to traversal mode.
 * Returns the interpolated hue in [0, 360).
 */
export const lerpAngle = (hA: number, hB: number, t: number, traversal: number): number => {
    // Normalize inputs to [0, 360)
    hA = ((hA % 360) + 360) % 360;
    hB = ((hB % 360) + 360) % 360;

    // Forward (CW) delta: how far CW from A to B
    const cwDelta = (((hB - hA) % 360) + 360) % 360;
    // Backward (CCW) delta: how far CCW from A to B
    const ccwDelta = (((hA - hB) % 360) + 360) % 360;

    let delta: number;

    switch (traversal) {
        case Enum.Common.angleTraversal.CLOCKWISE.value:
            delta = cwDelta;
            break;
        case Enum.Common.angleTraversal.COUNTER_CLOCKWISE.value:
            delta = -ccwDelta;
            break;
        case Enum.Common.angleTraversal.CLOSEST_CW.value:
            delta = cwDelta <= 180 ? cwDelta : -ccwDelta;
            break;
        case Enum.Common.angleTraversal.CLOSEST_CCW.value:
            delta = ccwDelta <= 180 ? -ccwDelta : cwDelta;
            break;
        case Enum.Common.angleTraversal.FARTHEST_CW.value:
            delta = cwDelta >= 180 ? cwDelta : -ccwDelta;
            break;
        case Enum.Common.angleTraversal.FARTHEST_CCW.value:
            delta = ccwDelta >= 180 ? -ccwDelta : cwDelta;
            break;
        default:
            delta = cwDelta <= 180 ? cwDelta : -ccwDelta;
    }

    return (((hA + delta * t) % 360) + 360) % 360;
};

// ============================================================================
// Public API
// ============================================================================

export type RGBA = { r: number; g: number; b: number; a: number };

/**
 * Decomposes an RGB triple (channels 0–1) into the components of the given color space.
 * Returns components in their native units (see comments on each converter).
 */
export const componentsFromRGB = (colorSpaceValue: number, r: number, g: number, b: number): number[] => {
    const converter = CONVERTERS[colorSpaceValue] ?? CONVERTERS[0];
    return converter.fromRGB(r, g, b);
};

/**
 * Composes a color from its components in the given color space.
 * Components must be in the converter's native units. Returns RGB channels 0–1.
 */
export const componentsToRGB = (colorSpaceValue: number, components: number[]): [number, number, number] => {
    const converter = CONVERTERS[colorSpaceValue] ?? CONVERTERS[0];
    return converter.toRGB(components);
};

/**
 * Interpolates between two RGBA colors in the given color space.
 * @param a Start color (RGBA, channels 0–1)
 * @param b End color (RGBA, channels 0–1)
 * @param t Interpolation factor (0 = a, 1 = b)
 * @param colorSpaceValue Enum.Common.colorSpace value
 * @param angleTraversalValue Enum.Common.angleTraversal value (used only for hue-based spaces)
 * @returns Interpolated color (RGBA, channels 0–1)
 */
export const interpolateColor = (a: RGBA, b: RGBA, t: number, colorSpaceValue: number, angleTraversalValue: number): RGBA => {
    const converter = CONVERTERS[colorSpaceValue] ?? CONVERTERS[0];

    const compA = converter.fromRGB(a.r, a.g, a.b);
    const compB = converter.fromRGB(b.r, b.g, b.b);

    // Lerp each component
    const result: number[] = [];
    for (let i = 0; i < compA.length; i++) {
        if (i === converter.hueIndex) {
            result.push(lerpAngle(compA[i], compB[i], t, angleTraversalValue));
        } else {
            result.push(compA[i] + (compB[i] - compA[i]) * t);
        }
    }

    const [r, g, b_] = converter.toRGB(result);

    // Alpha always lerped linearly
    const alpha = a.a + (b.a - a.a) * t;

    return { r, g, b: b_, a: alpha };
};
