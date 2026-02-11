import styled from "styled-components";
import { AbstractSlider } from "../abstract/Slider";
import { Color } from "../../types";
import { EmptyOr } from "../../util/misc";
import { AbstractInput } from "../abstract/Inputs";
import { CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
import { useStable } from "../../util/hooks/useStable";
import { NumericString } from "../../definitions/datatypes/numericString";

type ColorInputProps = {
    value: EmptyOr<Color>;
    onValue?: (v: EmptyOr<Color>) => void;
    onCommit?: (v: EmptyOr<Color>) => void;
    onConfirm?: (v: EmptyOr<Color>) => void; // fires when you hit enter, even if no change was made
    nullable?: boolean;
    alpha?: boolean;
    disabled?: boolean;
};

// HSV components as individual numeric values
type HSVCache = { h: number; s: number; v: number; a: number };

// Parse hex to RGB (0-1 range)
function hexToRgb(hex: string): { r: number; g: number; b: number; a: number } {
    let r = 0,
        g = 0,
        b = 0,
        a = 1;

    if (hex.length === 4) {
        // #rgb
        r = parseInt(hex[1] + hex[1], 16) / 255;
        g = parseInt(hex[2] + hex[2], 16) / 255;
        b = parseInt(hex[3] + hex[3], 16) / 255;
    } else if (hex.length === 5) {
        // #rgba
        r = parseInt(hex[1] + hex[1], 16) / 255;
        g = parseInt(hex[2] + hex[2], 16) / 255;
        b = parseInt(hex[3] + hex[3], 16) / 255;
        a = parseInt(hex[4] + hex[4], 16) / 255;
    } else if (hex.length === 7) {
        // #rrggbb
        r = parseInt(hex.slice(1, 3), 16) / 255;
        g = parseInt(hex.slice(3, 5), 16) / 255;
        b = parseInt(hex.slice(5, 7), 16) / 255;
    } else if (hex.length === 9) {
        // #rrggbbaa
        r = parseInt(hex.slice(1, 3), 16) / 255;
        g = parseInt(hex.slice(3, 5), 16) / 255;
        b = parseInt(hex.slice(5, 7), 16) / 255;
        a = parseInt(hex.slice(7, 9), 16) / 255;
    }

    return { r, g, b, a };
}

// Convert hex color to HSV components
function hexToHsv(hex: string): HSVCache {
    const { r, g, b, a } = hexToRgb(hex);

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

// Convert HSV components to hex color
function hsvToHex(hsv: HSVCache, includeAlpha: boolean): Color {
    const h = hsv.h / 360;
    const s = hsv.s / 100;
    const v = hsv.v / 100;

    let r, g, b;
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

    const toHex = (n: number) =>
        Math.round(n * 255)
            .toString(16)
            .padStart(2, "0");

    if (includeAlpha) {
        const a = hsv.a / 100;
        return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}` as Color;
    }
    return `#${toHex(r)}${toHex(g)}${toHex(b)}` as Color;
}

// Hex pattern for validation
const HEX_PATTERN_NO_ALPHA = "#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})";
const HEX_PATTERN_ALPHA = "#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})";

// Normalize hex to full form
function normalizeHex(value: string, alpha: boolean): Color {
    const v = value.toLowerCase();
    if (v.length === 4) {
        // #rgb -> #rrggbb or #rrggbbff
        const expanded = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
        return (alpha ? `${expanded}ff` : expanded) as Color;
    }
    if (v.length === 5) {
        // #rgba -> #rrggbbaa
        return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}${v[4]}${v[4]}` as Color;
    }
    if (v.length === 7 && alpha) {
        // #rrggbb -> #rrggbbff
        return `${v}ff` as Color;
    }
    return v as Color;
}

export const ColorInput = styled(({ className, alpha, value, onValue, onCommit, onConfirm, nullable, disabled }: ColorInputProps & { className?: string }) => {
    const onValueRef = useStable(onValue);
    const onCommitRef = useStable(onCommit);
    const onConfirmRef = useStable(onConfirm);

    // Cache for hex value (the canonical representation)
    const [hexCache, setHexCache] = useState<EmptyOr<Color>>(value);

    // Cache for HSV components (derived from hex, used by sliders)
    const hsvCache = useMemo<HSVCache>(() => {
        if (!hexCache || hexCache === "none") {
            return { h: 0, s: 100, v: 100, a: 100 };
        }
        return hexToHsv(hexCache);
    }, [hexCache]);

    // Sync with incoming prop
    useEffect(() => {
        setHexCache(value);
    }, [value]);

    const styleValue = useMemo(() => {
        return { "--value": hexCache } as CSSProperties;
    }, [hexCache]);

    // Dynamic style for the polar slider (hue wheel darkens with value)
    const polarStyle = useMemo(() => {
        return { "--hsv-v": hsvCache.v / 100 } as CSSProperties;
    }, [hsvCache.v]);

    // Dynamic style for value slider (shows current hue/saturation, black to full color)
    const valueSliderStyle = useMemo(() => {
        // Full saturation color at current hue
        const fullColor = hsvToHex({ h: hsvCache.h, s: hsvCache.s, v: 100, a: 100 }, false);
        return { "--slider-color": fullColor } as CSSProperties;
    }, [hsvCache.h, hsvCache.s]);

    // Dynamic style for alpha slider (shows current color, transparent to opaque)
    const alphaSliderStyle = useMemo(() => {
        // Current color at full opacity
        const opaqueColor = hsvToHex({ h: hsvCache.h, s: hsvCache.s, v: hsvCache.v, a: 100 }, false);
        return { "--slider-color": opaqueColor } as CSSProperties;
    }, [hsvCache.h, hsvCache.s, hsvCache.v]);

    // Update from text input
    const handleTextValue = useCallback(
        (v: EmptyOr<Color>) => {
            setHexCache(v);
            onValueRef.current?.(v);
        },
        [onValueRef],
    );

    const handleTextCommit = useCallback(
        (v: EmptyOr<Color>) => {
            setHexCache(v);
            onCommitRef.current?.(v);
        },
        [onCommitRef],
    );

    const handleTextConfirm = useCallback(
        (v: EmptyOr<Color>) => {
            setHexCache(v);
            onConfirmRef.current?.(v);
        },
        [onConfirmRef],
    );

    // Update from polar slider (saturation as radius, hue as angle)
    const polarValue = useMemo(
        () => ({
            r: String(hsvCache.s) as NumericString.Type,
            a: String(hsvCache.h) as NumericString.Type,
        }),
        [hsvCache.h, hsvCache.s],
    );

    const handlePolarValue = useCallback(
        (v: { r: EmptyOr<NumericString.Type>; a: EmptyOr<NumericString.Type> }) => {
            const newHsv = { ...hsvCache, h: Number(v.a), s: Number(v.r) };
            const newHex = hsvToHex(newHsv, alpha ?? false);
            setHexCache(newHex);
            onValueRef.current?.(newHex);
        },
        [hsvCache, alpha, onValueRef],
    );

    const handlePolarCommit = useCallback(
        (v: { r: EmptyOr<NumericString.Type>; a: EmptyOr<NumericString.Type> }) => {
            const newHsv = { ...hsvCache, h: Number(v.a), s: Number(v.r) };
            const newHex = hsvToHex(newHsv, alpha ?? false);
            setHexCache(newHex);
            onCommitRef.current?.(newHex);
        },
        [hsvCache, alpha, onCommitRef],
    );

    // Update from value (brightness) slider
    const handleValueValue = useCallback(
        (v: NumericString.Type) => {
            const newHsv = { ...hsvCache, v: Number(v) };
            const newHex = hsvToHex(newHsv, alpha ?? false);
            setHexCache(newHex);
            onValueRef.current?.(newHex);
        },
        [hsvCache, alpha, onValueRef],
    );

    const handleValueCommit = useCallback(
        (v: NumericString.Type) => {
            const newHsv = { ...hsvCache, v: Number(v) };
            const newHex = hsvToHex(newHsv, alpha ?? false);
            setHexCache(newHex);
            onCommitRef.current?.(newHex);
        },
        [hsvCache, alpha, onCommitRef],
    );

    // Update from alpha slider
    const handleAlphaValue = useCallback(
        (v: NumericString.Type) => {
            const newHsv = { ...hsvCache, a: Number(v) };
            const newHex = hsvToHex(newHsv, true);
            setHexCache(newHex);
            onValueRef.current?.(newHex);
        },
        [hsvCache, onValueRef],
    );

    const handleAlphaCommit = useCallback(
        (v: NumericString.Type) => {
            const newHsv = { ...hsvCache, a: Number(v) };
            const newHex = hsvToHex(newHsv, true);
            setHexCache(newHex);
            onCommitRef.current?.(newHex);
        },
        [hsvCache, onCommitRef],
    );

    // Text input normalize and pattern
    const textNormalize = useCallback(
        (v: EmptyOr<Color>): EmptyOr<Color> => {
            if (v === "") return nullable ? "none" : "";
            return normalizeHex(v, alpha ?? false);
        },
        [nullable, alpha],
    );

    const textPattern = useMemo(() => {
        const base = alpha ? HEX_PATTERN_ALPHA : HEX_PATTERN_NO_ALPHA;
        return nullable ? `(none)|${base}` : base;
    }, [nullable, alpha]);

    return (
        <div className={className}>
            <div data-part={"typein"}>
                <span data-part={"swatch"} style={styleValue} />
                <AbstractInput.Text<EmptyOr<Color>>
                    data-part={"input"}
                    value={hexCache}
                    onValue={handleTextValue}
                    onCommit={handleTextCommit}
                    onConfirm={handleTextConfirm}
                    pattern={textPattern}
                    normalize={textNormalize}
                    required={!nullable}
                    disabled={disabled}
                />
            </div>
            <div data-part={"picker"}>
                <AbstractSlider.Polar
                    data-part={"hueAndSaturation"}
                    style={polarStyle}
                    value={polarValue}
                    onValue={handlePolarValue}
                    onCommit={handlePolarCommit}
                    minRadius={0}
                    maxRadius={100}
                    minAngle={0}
                    maxAngle={360}
                    stepRadius={1}
                    stepAngle={1}
                    disabled={disabled}
                />
                <AbstractSlider.Linear
                    data-part={"value"}
                    style={valueSliderStyle}
                    orientation={"vertical"}
                    value={String(hsvCache.v) as NumericString.Type}
                    onValue={handleValueValue}
                    onCommit={handleValueCommit}
                    min={0}
                    max={100}
                    step={1}
                    disabled={disabled}
                />
                <AbstractSlider.Linear
                    data-part={"alpha"}
                    style={alphaSliderStyle}
                    orientation={"vertical"}
                    disabled={!alpha || disabled}
                    value={String(hsvCache.a) as NumericString.Type}
                    onValue={handleAlphaValue}
                    onCommit={handleAlphaCommit}
                    min={0}
                    max={100}
                    step={1}
                />
            </div>
        </div>
    );
})`
    display: grid;
    flex: 1 1 0;
    min-width: 0;
    width: 0;
    grid-template-rows: auto 1fr;
    & > div[data-part="typein"] {
        display: flex;
        gap: 8px;
        flex: 1 1 0;
        min-width: 0;
        align-items: center;
        & > [data-part="swatch"] {
            flex: 0 0 1lh;
            background: url("swatch.png");
            background-size: 25%;
            display: block;
            height: 1lh;
            aspect-ratio: 1;
            align-self: center;
            border: 1px solid black;
            &:after {
                display: block;
                content: "";
                width: 100%;
                height: 100%;
                background-color: var(--value);
            }
        }
        & > [data-part="input"] {
            flex: 1 1 0;
            width: 0;
            min-width: 0;
        }
    }
    & > div[data-part="picker"] {
        flex: 1 1 0;
        display: grid;
        gap: 8px;
        padding: 8px;
        align-items: center;
        grid-template-columns: minmax(0, 1fr) auto auto;
        & > div[data-part="hueAndSaturation"] > div[data-part="track"] {
            background:
                linear-gradient(rgba(0, 0, 0, calc(1 - var(--hsv-v, 1))), rgba(0, 0, 0, calc(1 - var(--hsv-v, 1)))),
                radial-gradient(circle, white 0%, rgba(255, 255, 255, 0.5) 25%, rgba(255, 255, 255, 0) 70%), conic-gradient(from 0deg, red, yellow, lime, cyan, blue, magenta, red);
        }
        & > div[data-part="value"] > div[data-part="track"] {
            background: linear-gradient(to top, black, var(--slider-color, white));
        }
        & > div[data-part="alpha"] > div[data-part="track"] {
            background:
                linear-gradient(to top, transparent, var(--slider-color, white)),
                repeating-conic-gradient(#808080 0% 25%, #fff 0% 50%) 50% / 8px 8px;
        }
    }
`;
