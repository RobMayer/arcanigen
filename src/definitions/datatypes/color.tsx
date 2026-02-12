export namespace Color {
    export type Type = { r: number; g: number; b: number; a: number } | null;
    export type HSV = { h: number; s: number; v: number; a: number } | null;

    export const fromHex = (hex: string): Type | null => {
        if (!hex || hex === "none") return null;

        const h = hex.toLowerCase();
        let r = 0,
            g = 0,
            b = 0,
            a = 1;

        if (h.length === 4) {
            // #rgb
            r = parseInt(h[1] + h[1], 16) / 255;
            g = parseInt(h[2] + h[2], 16) / 255;
            b = parseInt(h[3] + h[3], 16) / 255;
        } else if (h.length === 5) {
            // #rgba
            r = parseInt(h[1] + h[1], 16) / 255;
            g = parseInt(h[2] + h[2], 16) / 255;
            b = parseInt(h[3] + h[3], 16) / 255;
            a = parseInt(h[4] + h[4], 16) / 255;
        } else if (h.length === 7) {
            // #rrggbb
            r = parseInt(h.slice(1, 3), 16) / 255;
            g = parseInt(h.slice(3, 5), 16) / 255;
            b = parseInt(h.slice(5, 7), 16) / 255;
        } else if (h.length === 9) {
            // #rrggbbaa
            r = parseInt(h.slice(1, 3), 16) / 255;
            g = parseInt(h.slice(3, 5), 16) / 255;
            b = parseInt(h.slice(5, 7), 16) / 255;
            a = parseInt(h.slice(7, 9), 16) / 255;
        } else {
            return null;
        }

        return { r, g, b, a };
    };

    // prettier-ignore
    export const toHex = (color: Type): string => {
        if (color === null) return "transparent";

        const r = Math.round(Math.max(0, Math.min(1, color.r)) * 255).toString(16).padStart(2, "0");
        const g = Math.round(Math.max(0, Math.min(1, color.g)) * 255).toString(16).padStart(2, "0");
        const b = Math.round(Math.max(0, Math.min(1, color.b)) * 255).toString(16).padStart(2, "0");
        const a = Math.round(Math.max(0, Math.min(1, color.a)) * 255).toString(16).padStart(2, "0");

        return `#${r}${g}${b}${a}`;
    };

    export const toHSV = (color: Type): HSV => {
        if (color === null) {
            return null;
        }

        const { r, g, b, a } = color;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const d = max - min;

        let h = 0;
        const s = max === 0 ? 0 : d / max;
        const v = max;

        if (d !== 0) {
            switch (max) {
                case r:
                    h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                    break;
                case g:
                    h = ((b - r) / d + 2) / 6;
                    break;
                case b:
                    h = ((r - g) / d + 4) / 6;
                    break;
            }
        }

        return { h: h * 360, s: s * 100, v: v * 100, a: a * 100 };
    };

    export const fromHSV = (hsv: HSV): Type => {
        if (hsv === null) {
            return null;
        }
        const h = hsv.h / 360;
        const s = hsv.s / 100;
        const v = hsv.v / 100;
        const a = hsv.a / 100;

        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);

        switch (i % 6) {
            case 0:
                return { r: v, g: t, b: p, a };
            case 1:
                return { r: q, g: v, b: p, a };
            case 2:
                return { r: p, g: v, b: t, a };
            case 3:
                return { r: p, g: q, b: v, a };
            case 4:
                return { r: t, g: p, b: v, a };
            default:
                return { r: v, g: p, b: q, a };
        }
    };
}
