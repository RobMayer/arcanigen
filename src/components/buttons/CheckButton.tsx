import { MouseEvent, useCallback } from "react";
import { AbstractButton, AbstractButtonProps } from "../abstract/button";
import { useStable } from "../../util/hooks/useStable";

type CheckButtonProps = {
    checked: boolean;
    onToggle?: (v: boolean) => void;
    onCheck?: () => void;
    onUncheck?: () => void;
};

export const CheckButton = ({ checked, onCheck, onUncheck, onToggle, onClick, state, ...rest }: Omit<AbstractButtonProps, "value" | "onToggle"> & CheckButtonProps) => {
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
        (checkedRef.current ? onUncheckRef : onCheckRef).current?.();
    }, []);

    return <AbstractButton {...rest} state={`${state ?? ""} ${checked ? "checked" : "unchecked"}`} onClick={handleClick} />;
};
