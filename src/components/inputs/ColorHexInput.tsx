import { ChangeEvent, CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStable } from "../../util/hooks/useStable";
import styled from "styled-components";
import { AbstractTextInput, AbstractInputProps } from "../abstract/Inputs";
import { Color } from "../../types";

// Matches #rgb, #rrggbb, #rgba, #rrggbbaa
const HEX_3_REGEX = /^#[0-9a-fA-F]{3}$/;
const HEX_4_REGEX = /^#[0-9a-fA-F]{4}$/;
const HEX_6_REGEX = /^#[0-9a-fA-F]{6}$/;
const HEX_8_REGEX = /^#[0-9a-fA-F]{8}$/;

type HexColor = `#${string}`;

function isValidHex(value: string, alpha: boolean): value is HexColor {
    if (alpha) {
        return HEX_4_REGEX.test(value) || HEX_8_REGEX.test(value) || HEX_3_REGEX.test(value) || HEX_6_REGEX.test(value);
    }
    return HEX_3_REGEX.test(value) || HEX_6_REGEX.test(value);
}

function normalizeHex(value: string, alpha: boolean): HexColor {
    // Expand 3-digit to 6-digit (or 8-digit if alpha mode)
    if (HEX_3_REGEX.test(value)) {
        const [, r, g, b] = value.match(/^#(.)(.)(.)$/)!;
        const base = `#${r}${r}${g}${g}${b}${b}` as HexColor;
        return alpha ? (`${base}ff` as HexColor) : base;
    }
    // Expand 4-digit to 8-digit
    if (HEX_4_REGEX.test(value)) {
        const [, r, g, b, a] = value.match(/^#(.)(.)(.)(.)$/)!;
        return `#${r}${r}${g}${g}${b}${b}${a}${a}` as HexColor;
    }
    // 6-digit: add ff if alpha mode
    if (HEX_6_REGEX.test(value)) {
        const base = value.toLowerCase() as HexColor;
        return alpha ? (`${base}ff` as HexColor) : base;
    }
    // 8-digit: just lowercase
    return value.toLowerCase() as HexColor;
}

type ColorHexInputProps = {
    value: Color;
    onValue?: (v: Color) => void;
    onCommit?: (v: Color) => void;
    onConfirm?: (v: Color) => void; // fires when you hit enter, even if no change was made
    nullable?: boolean;
    alpha?: boolean;
};

const ColorHexInput = styled(
    ({ className, value, onValue, onCommit, onConfirm, onBlur, nullable, alpha, onChange, onKeyDown, ...rest }: Omit<AbstractInputProps, "value" | "pattern"> & ColorHexInputProps) => {
        const onKeyDownRef = useStable(onKeyDown);
        const onChangeRef = useStable(onChange);
        const onBlurRef = useStable(onBlur);

        const valueRef = useRef<string>(value);
        const lastValidRef = useRef<string>(value);
        const [cache, setCache] = useState<string>(value);

        useEffect(() => {
            if (valueRef.current !== value) {
                valueRef.current = value;
                lastValidRef.current = value;
                setCache(value);
            }
        }, [value]);

        const onValueRef = useStable(onValue);
        const onCommitRef = useStable(onCommit);
        const onConfirmRef = useStable(onConfirm);

        // Validate and set custom validity
        // Returns true if valid Color to emit, false if invalid or empty (empty is allowed when nullable but doesn't emit)
        const validate = useCallback(
            (el: HTMLInputElement, v: string): v is Color => {
                // Allow "none" if nullable
                if (nullable && v.toLowerCase() === "none") {
                    el.setCustomValidity("");
                    return true;
                }

                // Allow empty while typing if nullable (will become "none" on commit)
                if (nullable && v === "") {
                    el.setCustomValidity("");
                    return false; // Valid to type, but don't emit
                }

                // Must start with #
                if (!v.startsWith("#")) {
                    el.setCustomValidity("Color must start with #");
                    return false;
                }

                // Check if valid hex
                if (!isValidHex(v, alpha ?? false)) {
                    if (alpha) {
                        el.setCustomValidity("Must be a valid hex color (#rgb, #rrggbb, #rgba, or #rrggbbaa)");
                    } else {
                        el.setCustomValidity("Must be a valid hex color (#rgb or #rrggbb)");
                    }
                    return false;
                }

                el.setCustomValidity("");
                return true;
            },
            [nullable, alpha],
        );

        const handleChange = useCallback(
            (evt: ChangeEvent<HTMLInputElement>) => {
                onChangeRef.current?.(evt);
                if (evt.nativeEvent.handled) {
                    return;
                }
                evt.nativeEvent.handled = "implied";
                const v = evt.target.value;
                setCache(v);

                if (validate(evt.target, v)) {
                    lastValidRef.current = v;
                    onValueRef.current?.(v);
                }
            },
            [validate],
        );

        // On blur - commit or revert
        const handleBlur = useCallback(
            (evt: React.FocusEvent<HTMLInputElement>) => {
                onBlurRef.current?.(evt);
                if (evt.nativeEvent.handled) {
                    return;
                }

                const v = evt.currentTarget.value;

                // Handle "none" or empty for nullable
                if (nullable && (v.toLowerCase() === "none" || v === "")) {
                    const normalized: Color = "none";
                    setCache(normalized);
                    evt.currentTarget.setCustomValidity("");
                    // Fire onValue if changed from what was typed
                    if (v !== normalized) {
                        onValueRef.current?.(normalized);
                    }
                    lastValidRef.current = normalized;
                    onCommitRef.current?.(normalized);
                    return;
                }

                // Check if valid hex
                if (!isValidHex(v, alpha ?? false)) {
                    // Revert to last valid value
                    setCache(lastValidRef.current);
                    evt.currentTarget.setCustomValidity("");
                    return;
                }

                // Normalize and commit
                const normalized = normalizeHex(v, alpha ?? false);
                setCache(normalized);
                evt.currentTarget.setCustomValidity("");
                // Fire onValue if normalization changed the value
                if (v !== normalized) {
                    onValueRef.current?.(normalized);
                }
                lastValidRef.current = normalized;
                onCommitRef.current?.(normalized);
            },
            [nullable, alpha],
        );

        const styleValue = useMemo(() => {
            return { "--value": cache } as CSSProperties;
        }, [cache]);

        // Handle Enter key for onConfirm
        const handleKeyDown = useCallback(
            (evt: React.KeyboardEvent<HTMLInputElement>) => {
                onKeyDownRef.current?.(evt);
                if (evt.nativeEvent.handled) {
                    return;
                }

                if (evt.key !== "Enter") return;
                evt.nativeEvent.handled = "implied";

                const v = evt.currentTarget.value;

                // Handle "none" or empty for nullable
                if (nullable && (v.toLowerCase() === "none" || v === "")) {
                    const normalized: Color = "none";
                    setCache(normalized);
                    evt.currentTarget.setCustomValidity("");
                    // Fire onValue if normalization changed the value
                    if (v !== normalized) {
                        onValueRef.current?.(normalized);
                    }
                    lastValidRef.current = normalized;
                    // Fire onCommit if value differs from prop
                    if (normalized !== valueRef.current) {
                        onCommitRef.current?.(normalized);
                    }
                    onConfirmRef.current?.(normalized);
                    return;
                }

                // Check if valid hex
                if (!isValidHex(v, alpha ?? false)) {
                    // Invalid - revert to last valid and confirm that
                    setCache(lastValidRef.current);
                    evt.currentTarget.setCustomValidity("");
                    onConfirmRef.current?.(lastValidRef.current as Color);
                    return;
                }

                // Valid - normalize and confirm
                const normalized = normalizeHex(v, alpha ?? false);
                setCache(normalized);
                evt.currentTarget.setCustomValidity("");
                // Fire onValue if normalization changed the value
                if (v !== normalized) {
                    onValueRef.current?.(normalized);
                }
                lastValidRef.current = normalized;
                // Fire onCommit if value differs from prop
                if (normalized !== valueRef.current) {
                    onCommitRef.current?.(normalized);
                }
                onConfirmRef.current?.(normalized);
            },
            [nullable, alpha],
        );

        return (
            <div className={className}>
                <span className={"swatch"} style={styleValue} />
                <AbstractTextInput {...rest} type="text" value={cache} onChange={handleChange} onKeyDown={handleKeyDown} onBlur={handleBlur} />
            </div>
        );
    },
)`
    display: flex;
    gap: 4px;
    flex: 1 1 0;
    & > .swatch {
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
`;

export default ColorHexInput;
