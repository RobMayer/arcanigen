import { MouseEvent, useCallback } from "react";
import { useStable } from "../../util/hooks/useStable";
import { Icon, IconDefinition, ICONS } from "../Icon";
import styled from "styled-components";
import { AbstractButton } from "../abstract/Button";
import { COMMON_STYLES } from "../styles";
import { Flavour } from "../types";

const Base = styled(AbstractButton)`
    ${COMMON_STYLES.LITEBUTTON}
`;

export function CheckBox({
    checked,
    onCheck,
    onUncheck,
    onToggle,
    onClick,
    state,
    iconChecked = ICONS.CheckBox.Checked,
    iconUnchecked = ICONS.CheckBox.Unchecked,
    children,
    flavour,
    ...rest
}: CheckBox.Props) {
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
        <Base {...rest} state={`${state ?? ""} ${checked ? "checked" : "unchecked"}`} onClick={handleClick} data-flavour={flavour}>
            <Icon shape={checked ? iconChecked : iconUnchecked} />
            {children}
        </Base>
    );
}

export namespace CheckBox {
    export type Props = Omit<AbstractButton.Props, "value" | "onToggle"> & {
        checked: boolean;
        iconChecked?: IconDefinition;
        iconUnchecked?: IconDefinition;
        onToggle?: (v: boolean) => void;
        onCheck?: () => void;
        onUncheck?: () => void;
        flavour?: Flavour | "inherit";
    };
}
