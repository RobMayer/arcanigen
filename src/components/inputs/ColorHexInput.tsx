import { CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
import { useStable } from "../../util/hooks/useStable";
import styled from "styled-components";
import { AbstractInput } from "../abstract/Inputs";
import { Color } from "../../definitions/datatypes/color";
import { COMMON_STYLES } from "../styles";
import { Flavour } from "../types";

const BaseInput = styled(AbstractInput.Text)`
    ${COMMON_STYLES.INPUT}
    flex: 1 1 0;
    width: 0;
    min-width: 0;
`;

const BaseSwatch = styled.span`
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
`;

const BaseDiv = styled.div`
    display: flex;
    gap: 4px;
    flex: 1 1 0;
    min-width: 0;
    align-items: center;
`;

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
    value: Color.Type;
    onValue?: (v: Color.Type) => void;
    onCommit?: (v: Color.Type) => void;
    onConfirm?: (v: Color.Type) => void; // fires when you hit enter, even if no change was made
    required?: boolean;
    alpha?: boolean;
    disabled?: boolean;
    flavour?: Flavour;
};

export const ColorHexInput = ({ value, onValue, onCommit, onConfirm, required, alpha, disabled, flavour }: ColorHexInputProps) => {
    // Internal hex string cache for display
    const [hexCache, setHexCache] = useState<string>(() => {
        if (value === null) return "";
        const hex = Color.toHex(value);
        return alpha ? hex : hex.slice(0, 7);
    });

    const onValueRef = useStable(onValue);
    const onCommitRef = useStable(onCommit);
    const onConfirmRef = useStable(onConfirm);

    // Style for swatch preview
    const styleValue = useMemo(() => {
        return { "--value": value === null ? "transparent" : Color.toHex(value) } as CSSProperties;
    }, [value]);

    // Sync with incoming prop
    useEffect(() => {
        if (value === null) {
            setHexCache("");
        } else {
            const hex = Color.toHex(value);
            setHexCache(alpha ? hex : hex.slice(0, 7));
        }
    }, [value, alpha]);

    // Normalize text input
    const normalize = useCallback(
        (v: string): string => {
            if (v === "") return "";
            if (v.toLowerCase() === "transparent" || v.toLowerCase() === "none") {
                return alpha ? "#00000000" : v;
            }
            return normalizeHexString(v, alpha ?? false);
        },
        [alpha],
    );

    // Pattern for validation
    const pattern = useMemo(() => (alpha ? "(transparent|none|#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8}))" : "#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})"), [alpha]);

    const handleValue = useCallback(
        (v: string) => {
            setHexCache(v);
            if (v === "") {
                onValueRef.current?.(null);
            } else {
                onValueRef.current?.(Color.fromHex(v));
            }
        },
        [onValueRef],
    );

    const handleCommit = useCallback(
        (v: string) => {
            setHexCache(v);
            if (v === "") {
                onCommitRef.current?.(null);
            } else {
                onCommitRef.current?.(Color.fromHex(v));
            }
        },
        [onCommitRef],
    );

    const handleConfirm = useCallback(
        (v: string) => {
            setHexCache(v);
            if (v === "") {
                onConfirmRef.current?.(null);
            } else {
                onConfirmRef.current?.(Color.fromHex(v));
            }
        },
        [onConfirmRef],
    );

    return (
        <BaseDiv data-flavour={flavour}>
            <BaseSwatch data-part={"swatch"} style={styleValue} />
            <BaseInput
                data-flavour={"inherit"}
                data-part={"input"}
                value={hexCache}
                onCommit={handleCommit}
                onValue={handleValue}
                onConfirm={handleConfirm}
                pattern={pattern}
                normalize={normalize}
                required={required}
                disabled={disabled}
            />
        </BaseDiv>
    );
};
