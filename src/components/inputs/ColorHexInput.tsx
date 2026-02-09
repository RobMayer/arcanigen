import { CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
import { useStable } from "../../util/hooks/useStable";
import styled from "styled-components";
import { AbstractInput } from "../abstract/Inputs";
import { Color } from "../../types";
import { EmptyOr } from "../../util/misc";

// Matches #rgb, #rrggbb, #rgba, #rrggbbaa
const HEX_3_REGEX = /^#[0-9a-fA-F]{3}$/;
const HEX_4_REGEX = /^#[0-9a-fA-F]{4}$/;
const HEX_6_REGEX = /^#[0-9a-fA-F]{6}$/;
// const HEX_8_REGEX = /^#[0-9a-fA-F]{8}$/;

type HexColor = `#${string}`;

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
    value: EmptyOr<Color>;
    onValue?: (v: EmptyOr<Color>) => void;
    onCommit?: (v: EmptyOr<Color>) => void;
    onConfirm?: (v: EmptyOr<Color>) => void; // fires when you hit enter, even if no change was made
    nullable?: boolean;
    alpha?: boolean;
} & Omit<AbstractInput.TextProps<EmptyOr<Color>>, "normalize" | "pattern" | "required" | "onCommit" | "onConfirm" | "onValue">;

export const ColorHexInput = styled(({ className, value, onValue, onCommit, onConfirm, nullable, alpha, ...rest }: ColorHexInputProps) => {
    const [cache, setCache] = useState<EmptyOr<Color>>(value);
    const onValueRef = useStable(onValue);
    const onCommitRef = useStable(onCommit);
    const onConfirmRef = useStable(onConfirm);

    const styleValue = useMemo(() => {
        return { "--value": cache } as CSSProperties;
    }, [cache]);

    useEffect(() => {
        setCache(value);
    }, [value]);

    const normalize = useCallback(
        (v: EmptyOr<Color>): EmptyOr<Color> => {
            if (v === "") {
                return nullable ? "none" : "";
            }
            return normalizeHex(v, alpha ?? false);
        },
        [nullable, alpha],
    );

    const pattern = useMemo(() => {
        return `${nullable ? "(none)|" : ""}${alpha ? "#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})" : "#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})"}`;
    }, [nullable, alpha]);

    const handleValue = useCallback((v: EmptyOr<Color>) => {
        setCache(v);
        onValueRef.current?.(v);
    }, []);

    const handleCommit = useCallback((v: EmptyOr<Color>) => {
        setCache(v);
        onCommitRef.current?.(v);
    }, []);

    const handleConfirm = useCallback((v: EmptyOr<Color>) => {
        setCache(v);
        onConfirmRef.current?.(v);
    }, []);

    return (
        <div className={className}>
            <span className={"swatch"} style={styleValue} />
            <AbstractInput.Text<EmptyOr<Color>>
                {...rest}
                value={cache}
                onCommit={handleCommit}
                onValue={handleValue}
                onConfirm={handleConfirm}
                pattern={pattern}
                normalize={normalize}
                required={!nullable}
            />
        </div>
    );
})`
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
