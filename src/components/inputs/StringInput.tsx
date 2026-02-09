import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { useStable } from "../../util/hooks/useStable";
import styled from "styled-components";
import { AbstractTextInput, AbstractInputProps } from "../abstract/Inputs";

type StringInputProps = {
    value: string;
    onValue?: (v: string) => void;
    onCommit?: (v: string) => void;
    onConfirm?: (v: string) => void; // fires when you hit enter, even if no change was made
    normalize?: (v: string) => string;
};

const StringInput = styled(
    ({ value, onValue, onCommit, onConfirm, onBlur, pattern, onChange, onKeyDown, required = false, normalize, ...rest }: Omit<AbstractInputProps, "value"> & StringInputProps) => {
        const onKeyDownRef = useStable(onKeyDown);
        const onChangeRef = useStable(onChange);
        const onBlurRef = useStable(onBlur);
        const normalizeRef = useStable(normalize);

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
        const validate = useCallback(
            (el: HTMLInputElement, v: string): boolean => {
                // Empty is valid when not required
                if (!required && v === "") {
                    el.setCustomValidity("");
                    return true;
                }
                if (required && v === "") {
                    el.setCustomValidity("Value is required");
                    return false;
                }
                if (pattern) {
                    const regex = new RegExp(`^${pattern}$`);
                    if (!regex.test(v)) {
                        el.setCustomValidity("Value does not match required pattern");
                        return false;
                    }
                }
                el.setCustomValidity("");
                return true;
            },
            [pattern, required],
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

                // Empty is valid when not required
                if (!required && v === "") {
                    const normalized = normalizeRef.current ? normalizeRef.current(v) : v;
                    setCache(normalized);
                    evt.currentTarget.setCustomValidity("");
                    lastValidRef.current = normalized;
                    // Fire onValue if normalization changed the value
                    if (normalized !== v) {
                        onValueRef.current?.(normalized);
                    }
                    onCommitRef.current?.(normalized);
                    return;
                }

                if (pattern) {
                    const regex = new RegExp(`^${pattern}$`);
                    if (!regex.test(v)) {
                        // Revert to last valid value
                        setCache(lastValidRef.current);
                        evt.currentTarget.setCustomValidity("");
                        return;
                    }
                }

                // Apply normalization
                const normalized = normalizeRef.current ? normalizeRef.current(v) : v;
                setCache(normalized);
                evt.currentTarget.setCustomValidity("");
                // Fire onValue if normalization changed the value
                if (normalized !== v) {
                    onValueRef.current?.(normalized);
                }
                lastValidRef.current = normalized;
                onCommitRef.current?.(normalized);
            },
            [pattern, required],
        );

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

                // Empty is valid when not required
                if (!required && v === "") {
                    const normalized = normalizeRef.current ? normalizeRef.current(v) : v;
                    setCache(normalized);
                    evt.currentTarget.setCustomValidity("");
                    // Fire onValue if normalization changed the value
                    if (normalized !== v) {
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

                if (pattern) {
                    const regex = new RegExp(`^${pattern}$`);
                    if (!regex.test(v)) {
                        // Invalid - revert to last valid and confirm that
                        setCache(lastValidRef.current);
                        evt.currentTarget.setCustomValidity("");
                        onConfirmRef.current?.(lastValidRef.current);
                        return;
                    }
                }

                // Apply normalization
                const normalized = normalizeRef.current ? normalizeRef.current(v) : v;
                setCache(normalized);
                evt.currentTarget.setCustomValidity("");
                // Fire onValue if normalization changed the value
                if (normalized !== v) {
                    onValueRef.current?.(normalized);
                }
                lastValidRef.current = normalized;
                // Fire onCommit if value differs from prop
                if (normalized !== valueRef.current) {
                    onCommitRef.current?.(normalized);
                }
                onConfirmRef.current?.(normalized);
            },
            [pattern, required],
        );

        return <AbstractTextInput {...rest} type="text" value={cache} onChange={handleChange} onKeyDown={handleKeyDown} onBlur={handleBlur} />;
    },
)``;

export default StringInput;
