import { ChangeEvent, CSSProperties, Ref, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStable } from "../../util/hooks/useStable";
import { useCombinedRef } from "../../util/hooks/useCombinedRef";
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
    onSubmit?: (v: Color) => void; // fires when you hit enter, even if no change was made
    tooltip?: string;
    disabled?: boolean;
    nullable?: boolean;
    alpha?: boolean;
    ref?: Ref<HTMLInputElement>;
    className?: string;
};

const ColorHexInput = styled(
    ({ className, value, onValue, onCommit, onSubmit, ref, tooltip, disabled, nullable, alpha, onChange, onKeyDown, ...rest }: AbstractInputProps<ColorHexInputProps, "title">) => {
        const onKeyDownRef = useStable(onKeyDown);
        const onChangeRef = useStable(onChange);

        const [innerRef, makeRef] = useCombinedRef(ref);
        const valueRef = useRef<string>(value);
        const [cache, setCache] = useState<string>(value);

        useEffect(() => {
            if (valueRef.current !== value) {
                valueRef.current = value;
                setCache(value);
            }
        }, [value]);

        const onValueRef = useStable(onValue);
        const onCommitRef = useStable(onCommit);
        const onSubmitRef = useStable(onSubmit);

        // Validate and set custom validity
        const validate = useCallback(
            (el: HTMLInputElement, v: string): v is Color => {
                // Allow "none" if nullable
                if (nullable && v.toLowerCase() === "none") {
                    el.setCustomValidity("");
                    return true;
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
                    onValueRef.current?.(v);
                }
            },
            [validate],
        );

        // On blur/change event - commit or revert
        useEffect(() => {
            const el = innerRef.current;
            if (el) {
                const handler = (evt: Event) => {
                    if (evt.handled) {
                        return;
                    }
                    evt.handled = "implied";
                    const v = el.value;

                    // Handle "none" for nullable
                    if (nullable && v.toLowerCase() === "none") {
                        const normalized = "none";
                        setCache(normalized);
                        el.setCustomValidity("");
                        onCommitRef.current?.(normalized);
                        return;
                    }

                    // Check if valid hex
                    if (!isValidHex(v, alpha ?? false)) {
                        // Revert to last valid value
                        setCache(valueRef.current);
                        el.setCustomValidity("");
                        return;
                    }

                    // Normalize and commit
                    const normalized = normalizeHex(v, alpha ?? false);
                    setCache(normalized);
                    el.setCustomValidity("");
                    onCommitRef.current?.(normalized);
                    onValueRef.current?.(normalized);
                };
                el.addEventListener("change", handler);
                return () => {
                    el.removeEventListener("change", handler);
                };
            }
        }, [nullable, alpha]);

        const styleValue = useMemo(() => {
            return { "--value": cache } as CSSProperties;
        }, [cache]);

        // Handle Enter key for onSubmit
        const handleKeyDown = useCallback(
            (evt: React.KeyboardEvent<HTMLInputElement>) => {
                onKeyDownRef.current?.(evt);
                if (evt.nativeEvent.handled) {
                    return;
                }

                if (evt.key !== "Enter") return;
                evt.nativeEvent.handled = "implied";

                const v = evt.currentTarget.value;

                // Handle "none" for nullable
                if (nullable && v.toLowerCase() === "none") {
                    onSubmitRef.current?.("none");
                    return;
                }

                // Check if valid hex
                if (isValidHex(v, alpha ?? false)) {
                    const normalized = normalizeHex(v, alpha ?? false);
                    onSubmitRef.current?.(normalized);
                }
            },
            [nullable, alpha],
        );

        return (
            <div className={className}>
                <span className={"swatch"} style={styleValue} />
                <AbstractTextInput {...rest} type="text" value={cache} onChange={handleChange} onKeyDown={handleKeyDown} ref={makeRef} title={tooltip} disabled={disabled} />
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
