import { RefObject, useRef, useCallback, useSyncExternalStore, SetStateAction, Dispatch, useMemo } from "react";

export type FastContextMember<T> = {
    ref: RefObject<T>;
    subscribe: (cb: () => void) => () => void;
    get: () => T;
    notify: () => void;
};

export type FastContextWatcher = {
    subscribe: (cb: () => void) => () => void;
    notify: () => void;
};

export type FastContextValue<T> = T extends FastContextMember<infer U> ? U : never;

export const useFastContextMember = <T,>(defaultState: T): FastContextMember<T> => {
    const ref = useRef<T>(defaultState);
    const listeners = useRef(new Set<() => void>());

    const get = useCallback(() => ref.current, []);
    const subscribe = useCallback((cb: () => void) => {
        listeners.current.add(cb);
        return () => {
            listeners.current.delete(cb);
        };
    }, []);

    const notify = useCallback(() => {
        listeners.current.forEach((cb) => cb());
    }, []);

    return useMemo(() => {
        return { ref, subscribe, get, notify };
    }, [get, notify, subscribe]);
};

export const useFastContextWatcher = () => {
    const listeners = useRef(new Set<() => void>());

    const subscribe = useCallback((cb: () => void) => {
        listeners.current.add(cb);
        return () => {
            listeners.current.delete(cb);
        };
    }, []);

    const notify = useCallback(() => {
        listeners.current.forEach((cb) => cb());
    }, []);

    return useMemo(() => {
        return { subscribe, notify };
    }, [notify, subscribe]);
};

export const useFastContextState = <T,>(member: FastContextMember<T>): [T, Dispatch<SetStateAction<T>>] => {
    const value = useSyncExternalStore(member.subscribe, member.get);
    const update = useCallback(
        (action: SetStateAction<T>) => {
            const prev = member.ref.current;
            const next = typeof action === "function" ? (action as (prev: T) => T)(prev) : action;
            member.ref.current = next;
            member.notify();
        },
        [member],
    );
    return [value, update];
};
