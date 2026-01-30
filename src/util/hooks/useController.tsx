import { createContext, Dispatch, ReactNode, RefObject, SetStateAction, useCallback, useContext, useEffect, useImperativeHandle, useMemo, useRef, useSyncExternalStore } from "react";
import { useStable } from "./useStable";
import { FastContextMember, useFastContextMember, useFastContextState } from "./useFastContext";

export const createController = <S, C extends { [key: string]: (...args: any[]) => unknown }>() => {
    const BINDER = Symbol();

    const CTX = createContext<{ state: FastContextMember<S>; controls: C } | undefined>(undefined);

    const useController = (incoming: S, onChange?: (val: S) => void) => {
        const member = useFastContextMember<S>(incoming);
        const onChangeRef = useStable(onChange);

        useEffect(() => {
            if (member.ref.current !== incoming) {
                member.ref.current = incoming;
                member.notify();
            }
        }, [incoming]);

        const [value, setValue] = useFastContextState(member);

        const setValueNew = useCallback<Dispatch<SetStateAction<S>>>(
            (p) => {
                setValue(p);
                onChangeRef.current?.(member.ref.current);
            },
            [setValue],
        );

        return [value, setValueNew, member] as const;
    };

    const Controller = ({ children, state, controls, methods }: { children?: ReactNode; state: FastContextMember<S>; controls: C | undefined; methods: C }) => {
        useImperativeHandle(controls ? ((controls as C & { [BINDER]: RefObject<C> })?.[BINDER] ?? null) : null, () => methods, [methods]);

        const value = useMemo(() => {
            return { controls: methods, state };
        }, [methods, state]);

        return <CTX value={value}>{children}</CTX>;
    };

    const useControllerInternal = () => {
        const ctx = useContext(CTX);
        if (!ctx) {
            throw `useControllerInternal must be used within a ControlLoop`;
        }
        const value = useSyncExternalStore(ctx.state.subscribe, ctx.state.get);
        return [value, ctx.controls] as const;
    };

    const useControllerExternal = () => {
        const binder = useRef<C>({} as C);

        return useMemo(() => {
            return new Proxy({} as C, {
                get(target, prop) {
                    if (prop === BINDER) return binder;
                    if (typeof prop === "symbol") return undefined;
                    return (...args: any[]) => binder.current[prop]?.(...args);
                },
            }) as C;
        }, []);
    };

    return { useController, useControllerInternal, useControllerExternal, Controller };
};
