import { createContext, ReactNode, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { FastContextMember, useFastContextMember, useFastContextState } from "../util/hooks/useFastContext";
import { ListOf, normalizeList } from "../util/misc";

export namespace Session {
    export type MarqueeMode = "contain" | "intersect";

    type ContextValue = {
        selection: FastContextMember<Set<string>>;
        marqueeMode: FastContextMember<MarqueeMode>;
    };

    const CTX = createContext<ContextValue | undefined>(undefined);

    export const Provider = ({ children }: { children?: ReactNode }) => {
        const selection = useFastContextMember<Set<string>>(new Set<string>());
        const marqueeMode = useFastContextMember<MarqueeMode>("contain");

        const value = useMemo(() => ({ selection, marqueeMode }), []);

        return <CTX value={value}>{children}</CTX>;
    };

    export const useIsSelected = (id: string) => {
        const ctx = useContext(CTX)!;
        const selector = useCallback(() => ctx.selection.get().has(id), [id, ctx]);
        return [useSyncExternalStore(ctx.selection.subscribe, selector)] as const;
    };

    export const useSelectionRef = () => useContext(CTX)!.selection.ref;

    export const useMarqueeMode = () => useFastContextState(useContext(CTX)!.marqueeMode);

    export const useSelectionMethods = () => {
        const ctx = useContext(CTX)!;

        return useMemo(() => {
            return {
                set: (list: ListOf<string>) => {
                    ctx.selection.ref.current = new Set(normalizeList(list));
                    ctx.selection.notify();
                },
                coerce: (list: ListOf<string>) => {
                    const n = normalizeList(list);
                    if (n.isSubsetOf(ctx.selection.ref.current)) {
                        ctx.selection.ref.current = ctx.selection.ref.current.difference(n);
                    } else {
                        ctx.selection.ref.current = ctx.selection.ref.current.union(n);
                    }
                    ctx.selection.notify();
                },
                add: (list: ListOf<string>) => {
                    ctx.selection.ref.current = ctx.selection.ref.current.union(normalizeList(list));
                    ctx.selection.notify();
                },
                remove: (list: ListOf<string>) => {
                    ctx.selection.ref.current = ctx.selection.ref.current.difference(normalizeList(list));
                    ctx.selection.notify();
                },
                intersect: (list: ListOf<string>) => {
                    ctx.selection.ref.current = ctx.selection.ref.current.intersection(normalizeList(list));
                    ctx.selection.notify();
                },
                toggle: (list: ListOf<string>) => {
                    ctx.selection.ref.current = ctx.selection.ref.current.symmetricDifference(normalizeList(list));
                    ctx.selection.notify();
                },
                clear: () => {
                    ctx.selection.ref.current = new Set();
                    ctx.selection.notify();
                },
            };
        }, [ctx]);
    };
}
