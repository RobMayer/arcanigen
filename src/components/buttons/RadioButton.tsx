import { MouseEvent, useCallback } from "react";
import { AbstractButton, AbstractButtonProps } from "../abstract/button";
import { useStable } from "../../util/hooks/useStable";

type RadioButtonProps<T extends string = string> = {
    value: T;
    target: T;
    onValue?: (v: T) => void;
};

export const RadioButton = <T extends string = string>({ value, target, onValue, onClick, state, ...rest }: Omit<AbstractButtonProps, "value"> & RadioButtonProps<T>) => {
    const onValueRef = useStable(onValue);
    const onClickRef = useStable(onClick);

    const handleClick = useCallback(
        (evt: MouseEvent<HTMLButtonElement>) => {
            onClickRef.current?.(evt);
            if (evt.nativeEvent.handled) {
                return;
            }
            evt.nativeEvent.handled = "implied";
            onValueRef.current?.(target);
        },
        [target],
    );

    return <AbstractButton {...rest} state={`${state ?? ""} ${target === value ? "checked" : "unchecked"}`} onClick={handleClick} />;
};
