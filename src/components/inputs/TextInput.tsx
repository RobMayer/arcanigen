import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { useStable } from "../../util/hooks/useStable";
import { useCombinedRef } from "../../util/hooks/useCombinedRef";
import styled from "styled-components";
import { AbstractTextInput, AbstractInputProps } from "../abstract/Inputs";

type TextInputProps = {
    value: string;
    onValue?: (v: string) => void;
    onCommit?: (v: string) => void;
    onSubmit?: (v: string) => void; // fires when you hit enter, even if no change was made
};

const TextInput = styled(({ value, onValue, onCommit, onSubmit, ref, pattern, onChange, onKeyDown, required = false, ...rest }: Omit<AbstractInputProps, "value"> & TextInputProps) => {
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
                evt.handled = "implied";
                const v = el.value;

                // Empty is valid when not required
                if (!required && v === "") {
                    setCache(v);
                    el.setCustomValidity("");
                    onCommitRef.current?.(v);
                    onValueRef.current?.(v);
                    return;
                }

                if (pattern) {
                    const regex = new RegExp(`^${pattern}$`);
                    if (!regex.test(v)) {
                        // Revert to last valid value
                        setCache(valueRef.current);
                        el.setCustomValidity("");
                        return;
                    }
                }

                setCache(v);
                el.setCustomValidity("");
                onCommitRef.current?.(v);
                onValueRef.current?.(v);
            };
            el.addEventListener("change", handler);
            return () => {
                el.removeEventListener("change", handler);
            };
        }
    }, [pattern, required]);

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

            // Empty is valid when not required
            if (!required && v === "") {
                onSubmitRef.current?.(v);
                return;
            }

            if (pattern) {
                const regex = new RegExp(`^${pattern}$`);
                if (!regex.test(v)) {
                    return;
                }
            }
            onSubmitRef.current?.(v);
        },
        [pattern, required],
    );

    return <AbstractTextInput {...rest} type="text" value={cache} onChange={handleChange} onKeyDown={handleKeyDown} ref={makeRef} />;
})``;

export default TextInput;
