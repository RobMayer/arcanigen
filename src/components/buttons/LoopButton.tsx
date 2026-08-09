import { useCallback, MouseEvent, useMemo } from "react";
import styled from "styled-components";
import { useStable } from "../../util/hooks/useStable";
import { AbstractButton } from "../abstract/button";
import { COMMON_STYLES } from "../styles";
import { Flavour, Options } from "../types";

// The one real implementation. The public `LoopButton` / `LoopButton.Lite` variants are thin
// generic wrappers that only pick the styled base — keeping `T` on plain function declarations so
// callsite inference (e.g. `onValue`'s value) survives (styled()/HOCs would swallow the generic).
function Impl<T extends string = string>({ value, options, onValue, onClick, flavour = "accent", disabled, ...rest }: LoopButton.Props<T>) {
    const onValueRef = useStable(onValue);
    const onClickRef = useStable(onClick);

    const [idx, current] = useMemo(() => {
        const i = options.findIndex((each) => each.value === value);
        return [i, options[i]] as const;
    }, [value, options]);

    const handleClick = useCallback(
        (evt: MouseEvent<HTMLButtonElement>) => {
            onClickRef.current?.(evt);
            if (evt.nativeEvent.handled) {
                return;
            }
            evt.nativeEvent.handled = "implied";
            onValueRef.current?.(options[(idx + 1) % options.length].value);
        },
        [options, idx],
    );

    return (
        <AbstractButton {...rest} onClick={handleClick} data-flavour={current?.flavour ?? flavour} disabled={current?.disabled || disabled}>
            {current?.label}
        </AbstractButton>
    );
}

const Base = styled(Impl)`
    ${COMMON_STYLES.BUTTON}
` as typeof Impl;

const BaseLite = styled(Impl)`
    ${COMMON_STYLES.LITEBUTTON}
` as typeof Impl;

export function LoopButton<T extends string = string>(props: LoopButton.Props<T>) {
    return <Base {...props} />;
}

export namespace LoopButton {
    export type Props<T extends string = string> = Omit<AbstractButton.Props, "value" | "children"> & {
        value: T;
        options: Options<T>;
        onValue?: (v: T) => void;
        flavour?: Flavour | "inherit";
    };

    export function Lite<T extends string = string>(props: LoopButton.Props<T>) {
        return <BaseLite {...props} />;
    }
}
