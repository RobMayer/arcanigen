import { DetailedHTMLProps, HTMLAttributes, MouseEvent, useCallback } from "react";
import { AbstractButton } from "../abstract/button";
import { useStable } from "../../util/hooks/useStable";
import { Flavour, Options } from "../types";
import styled from "styled-components";
import { COMMON_STYLES } from "../styles";

const Base = styled(AbstractButton)`
    ${COMMON_STYLES.BUTTON}
`;

const GroupBase = styled.div`
    flex: 1 1;
    gap: 1px;
    background: #000;
    padding: 1px;
    border: 1px solid var(--flavour);
    display: grid;
    grid-auto-columns: auto;
    grid-auto-rows: 1fr;
    grid-auto-flow: row;
    &[data-orientation="horizontal"] {
        grid-auto-flow: column;
    }
`;

export function RadioButton<T extends string = string>({ value, target, onValue, onClick, state, flavour = "accent", ...rest }: RadioButton.Props<T>) {
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

    return <Base {...rest} state={`${state ?? ""} ${target === value ? "checked" : "unchecked"}`} onClick={handleClick} data-flavour={flavour} />;
}

export namespace RadioButton {
    export type Props<T extends string = string> = Omit<AbstractButton.Props, "value"> & {
        value: T;
        target: T;
        onValue?: (v: T) => void;
        flavour?: Flavour | "inherit";
    };

    export function Group<T extends string = string>({ className, orientation = "vertical", flavour = "base", options, value, onValue, disabled }: Group.Props<T>) {
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
    }

    export namespace Group {
        export type Props<T extends string = string> = Omit<DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "title"> & { tooltip?: string } & {
            value: T;
            onValue?: (v: T) => void;
            flavour?: Flavour | "inherit";
            options: Options<T>;
            disabled?: boolean;
            orientation?: "vertical" | "horizontal";
        };
    }
}
