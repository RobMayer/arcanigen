import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { useStable } from "../../util/hooks/useStable";
import styled from "styled-components";
import { AbstractTextInput, AbstractInputProps } from "../abstract/Inputs";

type TextInputProps = {
    value: string;
    onValue?: (v: string) => void;
    onCommit?: (v: string) => void;
    onConfirm?: (v: string) => void; // fires when you hit enter, even if no change was made
};

const TextInput = styled(({ value, onValue, onCommit, onConfirm, onBlur, pattern, onChange, onKeyDown, required = false, ...rest }: Omit<AbstractInputProps, "value"> & TextInputProps) => {
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
    const validate = useCallback(
        (el: HTMLInputElement, v: string): boolean => {
            // Empty is valid when not required
            if (!required && v === "") {
                el.setCustomValidity("");
                return true;
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
                setCache(v);
                evt.currentTarget.setCustomValidity("");
                lastValidRef.current = v;
                onCommitRef.current?.(v);
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

            setCache(v);
            evt.currentTarget.setCustomValidity("");
            lastValidRef.current = v;
            onCommitRef.current?.(v);
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
                evt.currentTarget.setCustomValidity("");
                lastValidRef.current = v;
                onConfirmRef.current?.(v);
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

            setCache(v);
            evt.currentTarget.setCustomValidity("");
            lastValidRef.current = v;
            // Fire onCommit if value differs from prop
            if (v !== valueRef.current) {
                onCommitRef.current?.(v);
            }
            onConfirmRef.current?.(v);
        },
        [pattern, required],
    );

    return <AbstractTextInput {...rest} type="text" value={cache} onChange={handleChange} onKeyDown={handleKeyDown} onBlur={handleBlur} />;
})``;

export default TextInput;
