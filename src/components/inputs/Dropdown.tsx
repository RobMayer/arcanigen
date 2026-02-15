import styled from "styled-components";
import { AbstractSelect, AbstractSelectProps } from "../abstract/Inputs";
import { useStable } from "../../util/hooks/useStable";
import { ChangeEvent, useCallback } from "react";

type DropdownProps<T extends string> = {
    value: T;
    onValue?: (v: T) => void;
    tooltip?: string;
};

const BaseDropdown = <T extends string = string>({ onValue, tooltip, value, onChange, ...props }: Omit<AbstractSelectProps, "value"> & DropdownProps<T>) => {
    const onValueRef = useStable(onValue);
    const onChangeRef = useStable(onChange);

    const handleChange = useCallback((evt: ChangeEvent<HTMLSelectElement>) => {
        onChangeRef.current?.(evt);
        if (evt.nativeEvent.handled) {
            return;
        }
        evt.nativeEvent.handled = "implied";
        const v = evt.currentTarget.value as T;
        onValueRef.current?.(v);
    }, []);

    return <AbstractSelect {...props} value={value} onChange={handleChange} />;
};

export const Dropdown = styled(BaseDropdown)``;
