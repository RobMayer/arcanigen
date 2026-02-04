import { MouseEvent, useCallback } from "react";
import { AbstractButtonProps, AbstractLiteButton } from "../abstract/button";
import { useStable } from "../../util/hooks/useStable";
import { Icon, IconDefinition, ICONS } from "../Icon";

type RadioBoxProps<T extends string = string> = {
    value: T;
    target: T;
    iconChecked?: IconDefinition;
    iconUnchecked?: IconDefinition;
    onValue?: (v: T) => void;
};

export const RadioBox = <T extends string = string>({
    value,
    target,
    onValue,
    onClick,
    state,
    children,
    iconChecked = ICONS.RadioBox.Checked,
    iconUnchecked = ICONS.RadioBox.Unchecked,
    ...rest
}: Omit<AbstractButtonProps, "value"> & RadioBoxProps<T>) => {
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

    return (
        <AbstractLiteButton {...rest} state={`${state ?? ""} ${target === value ? "checked" : "unchecked"}`} onClick={handleClick}>
            <Icon shape={target === value ? iconChecked : iconUnchecked} />
            {children}
        </AbstractLiteButton>
    );
};
