import { ChangeEvent, Ref, useCallback, useEffect, useRef, useState } from "react";
import { useStable } from "../../util/hooks/useStable";
import { useCombinedRef } from "../../util/hooks/useCombinedRef";

type MaxBound = `<${number}` | `<=${number}`;
type MinBound = `>${number}` | `>=${number}`;
type RangeBound = `${MinBound}${MaxBound}`;

const t: RangeBound = `>3<=4`;

type NumberInputProps = {
    value: number;
    onValue?: (n: number) => void;
    onCommit?: (n: number) => void;
    bounds?: RangeBound | MaxBound | MinBound;
    step?: number;
    tooltip?: string;
    disabled?: boolean;
    ref?: Ref<HTMLInputElement>;
};

const NumberInput = ({ value, onValue, onCommit, ref, tooltip, disabled, step }: NumberInputProps) => {
    const [innerRef, makeRef] = useCombinedRef(ref);
    const valueRef = useRef<number>(value);
    const [cache, setCache] = useState<string>(`${value}`);
    useEffect(() => {
        if (valueRef.current !== value) {
            valueRef.current = value;
            setCache(`${value}`);
        }
    }, [value]);

    const onValueRef = useStable(onValue);
    const onCommitRef = useStable(onCommit);

    const handleChange = useCallback((evt: ChangeEvent<HTMLInputElement>) => {
        const v = evt.target.value;
        const asNumber = Number(evt.target.value);
        if (v === "" || isNaN(asNumber) || !evt.target.validity.valid) {
            setCache(v);
        } else {
            setCache(v);
            onValueRef.current?.(asNumber);
        }
    }, []);

    useEffect(() => {
        const el = innerRef.current;
        if (el) {
            const handler = () => {
                const v = el.value;
                const asNumber = Number(v);
                if (v === "" || isNaN(asNumber) || !el.validity.valid) {
                    setCache(`${valueRef.current}`);
                } else {
                    setCache(v);
                    onCommitRef.current?.(asNumber);
                }
            };
            el.addEventListener("change", handler);
            return () => {
                el.removeEventListener("change", handler);
            };
        }
    }, []);

    return <input type="number" value={cache} onChange={handleChange} ref={makeRef} title={tooltip} disabled={disabled} step={step ?? "any"} />;
};
