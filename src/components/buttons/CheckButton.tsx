import { MouseEvent, useCallback } from "react";
import { AbstractButton } from "../abstract/Button";
import { useStable } from "../../util/hooks/useStable";
import styled from "styled-components";
import { COMMON_STYLES } from "../styles";
import { Flavour } from "../types";

const Base = styled(AbstractButton)`
    ${COMMON_STYLES.BUTTON}
`;

export function CheckButton({ checked, onCheck, onUncheck, onToggle, onClick, state, flavour = "accent", ...rest }: CheckButton.Props) {
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

    return <Base {...rest} state={`${state ?? ""} ${checked ? "checked" : "unchecked"}`} onClick={handleClick} data-flavour={flavour} />;
}

export namespace CheckButton {
    export type Props = Omit<AbstractButton.Props, "value" | "onToggle"> & {
        checked: boolean;
        onToggle?: (v: boolean) => void;
        onCheck?: () => void;
        onUncheck?: () => void;
        flavour?: Flavour | "inherit";
    };
}
