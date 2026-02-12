// RGBA color with components in 0-1 range (linear RGB)
export type ColorRGBA = { r: number; g: number; b: number; a: number };

// Color is either an RGBA object or null (representing "none"/absence of color)
export type Color = ColorRGBA | null;

// Color utility functions (merged with Color type via declaration merging)
export namespace Color {
    // Common color constants
    export const BLACK: ColorRGBA = { r: 0, g: 0, b: 0, a: 1 };
    export const WHITE: ColorRGBA = { r: 1, g: 1, b: 1, a: 1 };
    export const TRANSPARENT_BLACK: ColorRGBA = { r: 0, g: 0, b: 0, a: 0 };

    // Parse hex string to RGBA (supports #rgb, #rgba, #rrggbb, #rrggbbaa)
    export function fromHex(hex: string): ColorRGBA | null {
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
    }

    // Convert RGBA to hex string (#rrggbb or #rrggbbaa)
    export function toHex(color: Color, includeAlpha: boolean = true): string {
        if (color === null) return "none";

        const toHexComponent = (n: number) =>
            Math.round(Math.max(0, Math.min(1, n)) * 255)
                .toString(16)
                .padStart(2, "0");

        const hex = `#${toHexComponent(color.r)}${toHexComponent(color.g)}${toHexComponent(color.b)}`;
        return includeAlpha ? `${hex}${toHexComponent(color.a)}` : hex;
    }

    // Convert RGBA to CSS rgba() string
    export function toCss(color: Color): string {
        if (color === null) return "none";
        const r = Math.round(Math.max(0, Math.min(1, color.r)) * 255);
        const g = Math.round(Math.max(0, Math.min(1, color.g)) * 255);
        const b = Math.round(Math.max(0, Math.min(1, color.b)) * 255);
        return `rgba(${r}, ${g}, ${b}, ${color.a})`;
    }

    // Convert RGBA to HSV (hue 0-360, saturation/value/alpha 0-100)
    export function toHsv(color: Color): { h: number; s: number; v: number; a: number } {
        if (color === null) return { h: 0, s: 0, v: 0, a: 0 };

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
    }

    // Convert HSV to RGBA (hue 0-360, saturation/value/alpha 0-100)
    export function fromHsv(hsv: { h: number; s: number; v: number; a: number }): ColorRGBA {
        const h = hsv.h / 360;
        const s = hsv.s / 100;
        const v = hsv.v / 100;
        const a = hsv.a / 100;

        let r: number, g: number, b: number;
        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);

        switch (i % 6) {
            case 0:
                r = v;
                g = t;
                b = p;
                break;
            case 1:
                r = q;
                g = v;
                b = p;
                break;
            case 2:
                r = p;
                g = v;
                b = t;
                break;
            case 3:
                r = p;
                g = q;
                b = v;
                break;
            case 4:
                r = t;
                g = p;
                b = v;
                break;
            default:
                r = v;
                g = p;
                b = q;
                break;
        }

        return { r, g, b, a };
    }

    // Linearly interpolate between two colors
    export function lerp(a: Color, b: Color, t: number): Color {
        if (a === null && b === null) return null;
        if (a === null) return b;
        if (b === null) return a;

        return {
            r: a.r + (b.r - a.r) * t,
            g: a.g + (b.g - a.g) * t,
            b: a.b + (b.b - a.b) * t,
            a: a.a + (b.a - a.a) * t,
        };
    }

    // Check equality
    export function equals(a: Color, b: Color): boolean {
        if (a === null && b === null) return true;
        if (a === null || b === null) return false;
        return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
    }

    // Clone a color
    export function clone(color: Color): Color {
        if (color === null) return null;
        return { ...color };
    }
}

export type Measure<U extends string> = `${number}${U}`;

export type SVGObject = {
    tag: "g" | "path" | "svg";
    children: SVGObject[];
    attributes: { [key: string]: string | undefined };
};
