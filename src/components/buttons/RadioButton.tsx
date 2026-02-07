import { MouseEvent, useCallback } from "react";
import { AbstractButton, AbstractButtonProps } from "../abstract/button";
import { useStable } from "../../util/hooks/useStable";
import { Flavour, Options } from "../types";
import styled from "styled-components";

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
    onValue?: (v: T) => void;
    options: Options<T>;
    disabled?: boolean;
};

const Group = <T extends string = string>({
    className,
    orientation = "vertical",
    flavour = "base",
    options,
    value,
    onValue,
    disabled,
}: { className?: string; orientation?: "vertical" | "horizontal"; flavour?: Flavour } & GroupOptions<T>) => {
    return (
        <GroupBase className={className} data-orientation={orientation} data-flavour={flavour}>
            {options.map(({ value: target, label: children, disabled: optionDisabled, flavour: optionFlavour }) => {
                return (
                    <RadioButton<T> key={target} onValue={onValue} value={value} target={target} flavour={optionFlavour} disabled={optionDisabled || disabled}>
                        {children}
                    </RadioButton>
                );
            })}
        </GroupBase>
    );
};

RadioButton.Group = Group;
