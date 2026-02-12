import { CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
import { useStable } from "../../util/hooks/useStable";
import styled from "styled-components";
import { AbstractInput } from "../abstract/Inputs";
import { Color } from "../../types";

// Matches #rgb, #rrggbb, #rgba, #rrggbbaa
const HEX_3_REGEX = /^#[0-9a-fA-F]{3}$/;
const HEX_4_REGEX = /^#[0-9a-fA-F]{4}$/;
const HEX_6_REGEX = /^#[0-9a-fA-F]{6}$/;

function normalizeHexString(value: string, alpha: boolean): string {
    // Expand 3-digit to 6-digit (or 8-digit if alpha mode)
    if (HEX_3_REGEX.test(value)) {
        const [, r, g, b] = value.match(/^#(.)(.)(.)$/)!;
        const base = `#${r}${r}${g}${g}${b}${b}`;
        return alpha ? `${base}ff` : base;
    }
    // Expand 4-digit to 8-digit
    if (HEX_4_REGEX.test(value)) {
        const [, r, g, b, a] = value.match(/^#(.)(.)(.)(.)$/)!;
        return `#${r}${r}${g}${g}${b}${b}${a}${a}`;
    }
    // 6-digit: add ff if alpha mode
    if (HEX_6_REGEX.test(value)) {
        const base = value.toLowerCase();
        return alpha ? `${base}ff` : base;
    }
    // 8-digit: just lowercase
    return value.toLowerCase();
}

type ColorHexInputProps = {
    value: Color;
    onValue?: (v: Color) => void;
    onCommit?: (v: Color) => void;
    onConfirm?: (v: Color) => void; // fires when you hit enter, even if no change was made
    nullable?: boolean;
    alpha?: boolean;
    disabled?: boolean;
};

export const ColorHexInput = styled(({ className, value, onValue, onCommit, onConfirm, nullable, alpha, disabled }: ColorHexInputProps & { className?: string }) => {
    // Internal hex string cache for display
    const [hexCache, setHexCache] = useState<string>(() => {
        if (value === null) return "none";
        return Color.toHex(value, alpha ?? false);
    });

    const onValueRef = useStable(onValue);
    const onCommitRef = useStable(onCommit);
    const onConfirmRef = useStable(onConfirm);

    // Style for swatch preview
    const styleValue = useMemo(() => {
        return { "--value": value === null ? "transparent" : Color.toHex(value, true) } as CSSProperties;
    }, [value]);

    // Sync with incoming prop
    useEffect(() => {
        if (value === null) {
            setHexCache("none");
        } else {
            setHexCache(Color.toHex(value, alpha ?? false));
        }
    }, [value, alpha]);

    // Normalize text input
    const normalize = useCallback(
        (v: string): string => {
            if (v === "") {
                return nullable ? "none" : "";
            }
            if (v === "none") return "none";
            return normalizeHexString(v, alpha ?? false);
        },
        [nullable, alpha],
    );

    // Pattern for validation
    const pattern = useMemo(() => {
        return `${nullable ? "(none)|" : ""}${alpha ? "#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})" : "#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})"}`;
    }, [nullable, alpha]);

    const handleValue = useCallback(
        (v: string) => {
            setHexCache(v);
            if (v === "" || v === "none") {
                onValueRef.current?.(null);
            } else {
                const rgba = Color.fromHex(v);
                onValueRef.current?.(rgba);
            }
        },
        [onValueRef],
    );

    const handleCommit = useCallback(
        (v: string) => {
            setHexCache(v);
            if (v === "" || v === "none") {
                onCommitRef.current?.(null);
            } else {
                const rgba = Color.fromHex(v);
                onCommitRef.current?.(rgba);
            }
        },
        [onCommitRef],
    );

    const handleConfirm = useCallback(
        (v: string) => {
            setHexCache(v);
            if (v === "" || v === "none") {
                onConfirmRef.current?.(null);
            } else {
                const rgba = Color.fromHex(v);
                onConfirmRef.current?.(rgba);
            }
        },
        [onConfirmRef],
    );

    return (
        <div className={className}>
            <span data-part={"swatch"} style={styleValue} />
            <AbstractInput.Text<string>
                data-part={"input"}
                value={hexCache}
                onCommit={handleCommit}
                onValue={handleValue}
                onConfirm={handleConfirm}
                pattern={pattern}
                normalize={normalize}
                required={!nullable}
                disabled={disabled}
            />
        </div>
    );
})`
    display: flex;
    gap: 4px;
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
`;
