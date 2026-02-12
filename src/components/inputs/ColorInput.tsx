import styled from "styled-components";
import { AbstractSlider } from "../abstract/Slider";
import { AbstractInput } from "../abstract/Inputs";
import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStable } from "../../util/hooks/useStable";
import { NumericString } from "../../definitions/datatypes/numericString";
import { Color } from "../../definitions/datatypes/color";

type ColorInputProps = {
    value: Color.Type;
    onValue?: (v: Color.Type) => void;
    onCommit?: (v: Color.Type) => void;
    onConfirm?: (v: Color.Type) => void; // fires when you hit enter, even if no change was made
    nullable?: boolean;
    alpha?: boolean;
    disabled?: boolean;
};

// HSV components as individual numeric values (used internally for sliders)

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

export const ColorInput = styled(({ className, alpha, value, onValue, onCommit, onConfirm, nullable, disabled }: ColorInputProps & { className?: string }) => {
    const onValueRef = useStable(onValue);
    const onCommitRef = useStable(onCommit);
    const onConfirmRef = useStable(onConfirm);

    // Cache for RGBA value (the canonical representation)
    const [rgbaCache, setRgbaCache] = useState<Color.Type>(value);

    // Cache for HSV components (derived from RGBA, used by sliders)
    // Stored separately to preserve hue when saturation/value is 0
    const [hsvCache, setHsvCache] = useState<Color.HSV>(() => {
        return Color.toHSV(value);
    });

    // Hex string for text input display
    const hexDisplay = useMemo(() => {
        if (rgbaCache === null) return "";
        return Color.toHex(rgbaCache);
    }, [rgbaCache]);

    const hsvCacheRef = useRef(hsvCache);

    // Sync with incoming prop
    useEffect(() => {
        setRgbaCache(value);
        const hsv = Color.toHSV(value);
        setHsvCache(hsv);
        hsvCacheRef.current = hsv;
    }, [value]);

    // Style for swatch preview
    const swatchStyle = useMemo(() => {
        return { "--value": rgbaCache === null ? "transparent" : Color.toHex(rgbaCache) } as CSSProperties;
    }, [rgbaCache]);

    const pickerStyle = useMemo(() => {
        const vColor = Color.toHex(Color.fromHSV(hsvCache === null ? null : { h: hsvCache.h, s: hsvCache.s, v: 100, a: 100 }));
        return {
            "--hsv-h": hsvCache === null ? "0" : hsvCache.v / 100,
            "--hsv-v": vColor === "transparent" ? "white" : vColor,
            "--hsv-a": vColor === "transparent" ? "black" : Color.toHex(Color.fromHSV(hsvCache === null ? null : { h: hsvCache.h, s: hsvCache.s, v: hsvCache.v, a: 100 })),
        } as CSSProperties;
    }, [hsvCache]);

    // Update from text input
    const handleTextValue = useCallback((v: string) => {
        if (v === "" || v === "transparent") {
            setRgbaCache(null);
            onValueRef.current?.(null);
            setHsvCache(null);
            hsvCacheRef.current = null;
        } else {
            const rgba = Color.fromHex(v);
            setRgbaCache(rgba);
            const newHSV = Color.toHSV(rgba);
            setHsvCache(newHSV);
            hsvCacheRef.current = newHSV;
            onValueRef.current?.(rgba);
        }
    }, []);

    const handleTextCommit = useCallback((v: string) => {
        if (v === "" || v === "transparent") {
            setRgbaCache(null);
            onCommitRef.current?.(null);
            setHsvCache(null);
            hsvCacheRef.current = null;
        } else {
            const rgba = Color.fromHex(v);
            setRgbaCache(rgba);
            const newHSV = Color.toHSV(rgba);
            setHsvCache(newHSV);
            hsvCacheRef.current = newHSV;
            onCommitRef.current?.(rgba);
        }
    }, []);

    const handleTextConfirm = useCallback((v: string) => {
        if (v === "" || v === "transparent") {
            setRgbaCache(null);
            onConfirmRef.current?.(null);
            setHsvCache(null);
            hsvCacheRef.current = null;
        } else {
            const rgba = Color.fromHex(v);
            setRgbaCache(rgba);
            const newHSV = Color.toHSV(rgba);
            setHsvCache(newHSV);
            hsvCacheRef.current = newHSV;
            onConfirmRef.current?.(rgba);
        }
    }, []);

    // Update from polar slider (saturation as radius, hue as angle)

    const polarValue = useMemo(
        () => ({
            r: String(hsvCache?.s ?? "0") as NumericString.Type,
            a: String(hsvCache?.h ?? "0") as NumericString.Type,
        }),
        [hsvCache],
    );

    const handlePolarValue = useCallback((v: { r: string; a: string }) => {
        const newHsv = { ...(hsvCacheRef.current ?? { v: 0, a: 0 }), h: Number(v.a), s: Number(v.r) };
        setHsvCache(newHsv);
        hsvCacheRef.current = newHsv;
        const newRgba = Color.fromHSV(newHsv);
        setRgbaCache(newRgba);
        onValueRef.current?.(newRgba);
    }, []);

    const handlePolarCommit = useCallback((v: { r: string; a: string }) => {
        const newHsv = { ...(hsvCacheRef.current ?? { v: 0, a: 0 }), h: Number(v.a), s: Number(v.r) };
        setHsvCache(newHsv);
        hsvCacheRef.current = newHsv;
        const newRgba = Color.fromHSV(newHsv);
        setRgbaCache(newRgba);
        onCommitRef.current?.(newRgba);
    }, []);

    // Update from value (brightness) slider
    const handleValueValue = useCallback((v: NumericString.Type) => {
        const newHsv = { ...(hsvCacheRef.current ?? { s: 0, a: 0, h: 0 }), v: Number(v) };
        setHsvCache(newHsv);
        hsvCacheRef.current = newHsv;
        const newRgba = Color.fromHSV(newHsv);
        setRgbaCache(newRgba);
        onValueRef.current?.(newRgba);
    }, []);

    const handleValueCommit = useCallback((v: NumericString.Type) => {
        const newHsv = { ...(hsvCacheRef.current ?? { s: 0, a: 0, h: 0 }), v: Number(v) };
        setHsvCache(newHsv);
        hsvCacheRef.current = newHsv;
        const newRgba = Color.fromHSV(newHsv);
        setRgbaCache(newRgba);
        onCommitRef.current?.(newRgba);
    }, []);

    // Update from alpha slider
    const handleAlphaValue = useCallback((v: NumericString.Type) => {
        const newHsv = { ...(hsvCacheRef.current ?? { s: 0, h: 0, v: 0 }), a: Number(v) };
        setHsvCache(newHsv);
        hsvCacheRef.current = newHsv;
        const newRgba = Color.fromHSV(newHsv);
        setRgbaCache(newRgba);
        onValueRef.current?.(newRgba);
    }, []);

    const handleAlphaCommit = useCallback((v: NumericString.Type) => {
        const newHsv = { ...(hsvCacheRef.current ?? { s: 0, h: 0, v: 0 }), a: Number(v) };
        setHsvCache(newHsv);
        hsvCacheRef.current = newHsv;
        const newRgba = Color.fromHSV(newHsv);
        setRgbaCache(newRgba);
        onCommitRef.current?.(newRgba);
    }, []);

    // Text input normalize and pattern
    const textNormalize = useCallback(
        (v: string): string => {
            if (v === "") return nullable ? "transparent" : "";
            if (v === "transparent") return "transparent";
            return normalizeHexString(v, alpha ?? false);
        },
        [nullable, alpha],
    );

    const textPattern = useMemo(() => {
        const base = alpha ? HEX_PATTERN_ALPHA : HEX_PATTERN_NO_ALPHA;
        return nullable ? `(transparent)|${base}` : base;
    }, [nullable, alpha]);

    return (
        <div className={className}>
            <div data-part={"typein"}>
                <span data-part={"swatch"} style={swatchStyle} />
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
            <div data-part={"picker"} style={pickerStyle}>
                <AbstractSlider.Polar
                    data-part={"hueAndSaturation"}
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
                    orientation={"vertical"}
                    value={String(hsvCache?.v ?? "") as NumericString.Type}
                    onValue={handleValueValue}
                    onCommit={handleValueCommit}
                    min={0}
                    max={100}
                    step={1}
                    disabled={disabled}
                />
                <AbstractSlider.Linear
                    data-part={"alpha"}
                    orientation={"vertical"}
                    disabled={!alpha || disabled}
                    value={String(hsvCache?.a ?? "") as NumericString.Type}
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
                linear-gradient(rgba(0, 0, 0, calc(1 - var(--hsv-h, 1))), rgba(0, 0, 0, calc(1 - var(--hsv-h, 1)))),
                radial-gradient(circle, white 0%, rgba(255, 255, 255, 0.5) 25%, rgba(255, 255, 255, 0) 70%), conic-gradient(from 0deg, red, yellow, lime, cyan, blue, magenta, red);
        }
        & > div[data-part="value"] > div[data-part="track"] {
            background: linear-gradient(to top, black, var(--hsv-v, white));
        }
        & > div[data-part="alpha"] > div[data-part="track"] {
            background:
                linear-gradient(to top, transparent, var(--hsv-a, white)),
                repeating-conic-gradient(#808080 0% 25%, #fff 0% 50%) 50% / 8px 8px;
        }
    }
`;
