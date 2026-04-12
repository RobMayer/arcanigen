import { ReactNode, useCallback, useMemo } from "react";
import styled from "styled-components";
import { AbstractButton } from "../abstract/button";
import { Flavour } from "../types";
import { createController } from "../../util/hooks/useController";
import { merge } from "../../util/misc";
import { Icon, IconDefinition, ICONS } from "../Icon";
import { COMMON_STYLES } from "../styles";

const BaseButton = styled(AbstractButton)`
    ${COMMON_STYLES.BUTTON}
`;

type AccordionControls = {
    open: () => void;
    close: () => void;
    toggle: () => void;
};

const { useController, useControllerExternal: useAccordion, useControllerInternal: useAccordionControls, Controller } = createController<boolean, AccordionControls>();

const Base = styled(
    ({
        children,
        className,
        title,
        isOpen = false,
        onOpenChange,
        controls,
        disabled,
        flavour = "accent",
        iconOpen = ICONS.Caret.Down,
        iconClosed = ICONS.Caret.Right,
    }: {
        children?: ReactNode;
        className?: string;
        title: ReactNode;
        isOpen?: boolean;
        onOpenChange?: (isOpen: boolean) => void;
        controls?: AccordionControls;
        disabled?: boolean;
        flavour?: Flavour | "inherit";
        iconOpen?: IconDefinition;
        iconClosed?: IconDefinition;
    }) => {
        const [value, setValue, member] = useController(isOpen, onOpenChange);

        const methods = useMemo<AccordionControls>(
            () => ({
                open: () => setValue(true),
                close: () => setValue(false),
                toggle: () => setValue((p) => !p),
            }),
            [setValue],
        );

        const handleClick = useCallback(() => {
            if (!disabled) {
                methods.toggle();
            }
        }, [disabled, methods]);

        return (
            <Controller state={member} controls={controls} methods={methods}>
                <BaseButton className={className} onClick={handleClick} disabled={disabled} data-flavour={flavour}>
                    <Icon shape={value ? iconOpen : iconClosed} />
                    {title}
                </BaseButton>
                {value ? children : null}
            </Controller>
        );
    },
)`
    display: flex;
    justify-content: start;
    gap: 4px;
    align-items: center;
`;

export const Accordion = merge(Base, { useAccordion, useAccordionControls });
