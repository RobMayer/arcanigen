import styled from "styled-components";
import { AbstractSlider } from "../abstract/Slider";
import { Color, ColorRGBA } from "../../types";
import { AbstractInput } from "../abstract/Inputs";
import { CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
import { useStable } from "../../util/hooks/useStable";
import { NumericString } from "../../definitions/datatypes/numericString";

type ColorInputProps = {
    value: Color;
    onValue?: (v: Color) => void;
    onCommit?: (v: Color) => void;
    onConfirm?: (v: Color) => void; // fires when you hit enter, even if no change was made
    nullable?: boolean;
    alpha?: boolean;
    disabled?: boolean;
};

// HSV components as individual numeric values (used internally for sliders)
type HSVCache = { h: number; s: number; v: number; a: number };

// Hex pattern for validation
const HEX_PATTERN_NO_ALPHA = "#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})";
const HEX_PATTERN_ALPHA = "#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})";

// Convert hex string to normalized form
function normalizeHexString(value: string, alpha: boolean): string {
    const v = value.toLowerCase();
    if (v.length === 4) {
        // #rgb -> #rrggbb or #rrggbbff
        const expanded = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
        return alpha ? `${expanded}ff` : expanded;
    }
    if (v.length === 5) {
        // #rgba -> #rrggbbaa
        return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}${v[4]}${v[4]}`;
    }
    if (v.length === 7 && alpha) {
        // #rrggbb -> #rrggbbff
        return `${v}ff`;
    }
    return v;
}

// Convert HSV to hex string (for display/CSS)
function hsvToHexString(hsv: HSVCache, includeAlpha: boolean): string {
    const rgba = Color.fromHsv(hsv);
    return Color.toHex(rgba, includeAlpha);
}

export const ColorInput = styled(({ className, alpha, value, onValue, onCommit, onConfirm, nullable, disabled }: ColorInputProps & { className?: string }) => {
    const onValueRef = useStable(onValue);
    const onCommitRef = useStable(onCommit);
    const onConfirmRef = useStable(onConfirm);

    // Cache for RGBA value (the canonical representation)
    const [rgbaCache, setRgbaCache] = useState<Color>(value);

    // Cache for HSV components (derived from RGBA, used by sliders)
    // Stored separately to preserve hue when saturation/value is 0
    const [hsvCache, setHsvCache] = useState<HSVCache>(() => {
        if (value === null) {
            return { h: 0, s: 100, v: 100, a: 100 };
        }
        return Color.toHsv(value);
    });

    // Hex string for text input display
    const hexDisplay = useMemo(() => {
        if (rgbaCache === null) return "none";
        return Color.toHex(rgbaCache, alpha ?? false);
    }, [rgbaCache, alpha]);

    // Sync with incoming prop
    useEffect(() => {
        setRgbaCache(value);
        if (value !== null) {
            // Only update HSV from prop if we have a real color
            // This preserves hue when user is editing
            setHsvCache(Color.toHsv(value));
        }
    }, [value]);

    // Style for swatch preview
    const styleValue = useMemo(() => {
        return { "--value": rgbaCache === null ? "transparent" : Color.toHex(rgbaCache, true) } as CSSProperties;
    }, [rgbaCache]);

    // Dynamic style for the polar slider (hue wheel darkens with value)
    const polarStyle = useMemo(() => {
        return { "--hsv-v": hsvCache.v / 100 } as CSSProperties;
    }, [hsvCache.v]);

    // Dynamic style for value slider (shows current hue/saturation, black to full color)
    const valueSliderStyle = useMemo(() => {
        const fullColor = hsvToHexString({ h: hsvCache.h, s: hsvCache.s, v: 100, a: 100 }, false);
        return { "--slider-color": fullColor } as CSSProperties;
    }, [hsvCache.h, hsvCache.s]);

    // Dynamic style for alpha slider (shows current color, transparent to opaque)
    const alphaSliderStyle = useMemo(() => {
        const opaqueColor = hsvToHexString({ h: hsvCache.h, s: hsvCache.s, v: hsvCache.v, a: 100 }, false);
        return { "--slider-color": opaqueColor } as CSSProperties;
    }, [hsvCache.h, hsvCache.s, hsvCache.v]);

    // Update from text input
    const handleTextValue = useCallback(
        (v: string) => {
            if (v === "" || v === "none") {
                setRgbaCache(null);
                onValueRef.current?.(null);
            } else {
                const rgba = Color.fromHex(v);
                if (rgba) {
                    setRgbaCache(rgba);
                    setHsvCache(Color.toHsv(rgba));
                    onValueRef.current?.(rgba);
                }
            }
        },
        [onValueRef],
    );

    const handleTextCommit = useCallback(
        (v: string) => {
            if (v === "" || v === "none") {
                setRgbaCache(null);
                onCommitRef.current?.(null);
            } else {
                const rgba = Color.fromHex(v);
                if (rgba) {
                    setRgbaCache(rgba);
                    setHsvCache(Color.toHsv(rgba));
                    onCommitRef.current?.(rgba);
                }
            }
        },
        [onCommitRef],
    );

    const handleTextConfirm = useCallback(
        (v: string) => {
            if (v === "" || v === "none") {
                setRgbaCache(null);
                onConfirmRef.current?.(null);
            } else {
                const rgba = Color.fromHex(v);
                if (rgba) {
                    setRgbaCache(rgba);
                    setHsvCache(Color.toHsv(rgba));
                    onConfirmRef.current?.(rgba);
                }
            }
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
        (v: { r: string; a: string }) => {
            const newHsv = { ...hsvCache, h: Number(v.a), s: Number(v.r) };
            setHsvCache(newHsv);
            const newRgba = Color.fromHsv(newHsv);
            setRgbaCache(newRgba);
            onValueRef.current?.(newRgba);
        },
        [hsvCache, onValueRef],
    );

    const handlePolarCommit = useCallback(
        (v: { r: string; a: string }) => {
            const newHsv = { ...hsvCache, h: Number(v.a), s: Number(v.r) };
            setHsvCache(newHsv);
            const newRgba = Color.fromHsv(newHsv);
            setRgbaCache(newRgba);
            onCommitRef.current?.(newRgba);
        },
        [hsvCache, onCommitRef],
    );

    // Update from value (brightness) slider
    const handleValueValue = useCallback(
        (v: NumericString.Type) => {
            const newHsv = { ...hsvCache, v: Number(v) };
            setHsvCache(newHsv);
            const newRgba = Color.fromHsv(newHsv);
            setRgbaCache(newRgba);
            onValueRef.current?.(newRgba);
        },
        [hsvCache, onValueRef],
    );

    const handleValueCommit = useCallback(
        (v: NumericString.Type) => {
            const newHsv = { ...hsvCache, v: Number(v) };
            setHsvCache(newHsv);
            const newRgba = Color.fromHsv(newHsv);
            setRgbaCache(newRgba);
            onCommitRef.current?.(newRgba);
        },
        [hsvCache, onCommitRef],
    );

    // Update from alpha slider
    const handleAlphaValue = useCallback(
        (v: NumericString.Type) => {
            const newHsv = { ...hsvCache, a: Number(v) };
            setHsvCache(newHsv);
            const newRgba = Color.fromHsv(newHsv);
            setRgbaCache(newRgba);
            onValueRef.current?.(newRgba);
        },
        [hsvCache, onValueRef],
    );

    const handleAlphaCommit = useCallback(
        (v: NumericString.Type) => {
            const newHsv = { ...hsvCache, a: Number(v) };
            setHsvCache(newHsv);
            const newRgba = Color.fromHsv(newHsv);
            setRgbaCache(newRgba);
            onCommitRef.current?.(newRgba);
        },
        [hsvCache, onCommitRef],
    );

    // Text input normalize and pattern
    const textNormalize = useCallback(
        (v: string): string => {
            if (v === "") return nullable ? "none" : "";
            if (v === "none") return "none";
            return normalizeHexString(v, alpha ?? false);
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
                <AbstractInput.Text<string>
                    data-part={"input"}
                    value={hexDisplay}
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
