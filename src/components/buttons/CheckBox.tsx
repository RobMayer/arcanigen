import { MouseEvent, useCallback } from "react";
import { AbstractButtonProps, AbstractLiteButton } from "../abstract/button";
import { useStable } from "../../util/hooks/useStable";
import { Icon, IconDefinition, ICONS } from "../Icon";

type CheckBoxProps = {
    checked: boolean;
    iconChecked?: IconDefinition;
    iconUnchecked?: IconDefinition;
    onToggle?: (v: boolean) => void;
    onCheck?: () => void;
    onUncheck?: () => void;
};

export const CheckBox = ({
    checked,
    onCheck,
    onUncheck,
    onToggle,
    onClick,
    state,
    iconChecked = ICONS.RadioBox.Checked,
    iconUnchecked = ICONS.RadioBox.Unchecked,
    children,
    ...rest
}: Omit<AbstractButtonProps, "value" | "onToggle"> & CheckBoxProps) => {
    const onToggleRef = useStable(onToggle);
    const onClickRef = useStable(onClick);
    const checkedRef = useStable(checked);
    const onCheckRef = useStable(onCheck);
    const onUncheckRef = useStable(onUncheck);

    const handleClick = useCallback((evt: MouseEvent<HTMLButtonElement>) => {
        onClickRef.current?.(evt);
        if (evt.nativeEvent.handled) {
            return;
        }
        evt.nativeEvent.handled = "implied";
        onToggleRef.current?.(!checkedRef.current);
        if (checkedRef.current) {
            onUncheckRef.current?.();
        } else {
            onCheckRef.current?.();
        }
    }, []);

    return (
        <AbstractLiteButton {...rest} state={`${state ?? ""} ${checked ? "checked" : "unchecked"}`} onClick={handleClick}>
            <Icon shape={checked ? iconChecked : iconUnchecked} />
            {children}
        </AbstractLiteButton>
    );
};
