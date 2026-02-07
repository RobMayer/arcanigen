import { MouseEvent, useCallback } from "react";
import { AbstractButtonProps, AbstractLiteButton } from "../abstract/button";
import { useStable } from "../../util/hooks/useStable";
import { Icon, IconDefinition, ICONS } from "../Icon";
import styled from "styled-components";
import { Flavour, Options } from "../types";

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

const GroupBase = styled.div`
    flex: 1 1;
    gap: 1px;
    background: #000;
    padding: 1px;
    border: 1px solid var(--flavour);
    display: grid;
    grid-auto-columns: 1fr;
    grid-auto-rows: 1fr;
    grid-auto-flow: row;
    &[data-orientation="horizontal"] {
        grid-auto-flow: column;
    }
`;

type GroupOptions<T extends string = string> = {
    value: T;
    iconChecked?: IconDefinition;
    iconUnchecked?: IconDefinition;
    onValue?: (v: T) => void;
    options: Options<T>;
    disabled?: boolean;
};

const Group = <T extends string = string>({
    className,
    orientation = "vertical",
    flavour,
    options,
    value,
    iconChecked,
    iconUnchecked,
    onValue,
    disabled,
}: { className?: string; orientation?: "vertical" | "horizontal"; flavour?: Flavour } & GroupOptions<T>) => {
    return (
        <GroupBase className={className} data-orientation={orientation} data-flavour={flavour}>
            {options.map(({ value: target, label: children, disabled: optionDisabled, flavour: optionFlavour }) => {
                return (
                    <RadioBox<T>
                        key={target}
                        onValue={onValue}
                        value={value}
                        target={target}
                        iconChecked={iconChecked}
                        iconUnchecked={iconUnchecked}
                        flavour={optionFlavour}
                        disabled={disabled || optionDisabled}
                    >
                        {children}
                    </RadioBox>
                );
            })}
        </GroupBase>
    );
};

RadioBox.Group = Group;
