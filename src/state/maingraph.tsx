import { createContext, ReactNode, SetStateAction, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { FastContextMember, useFastContextMember, useFastContextState } from "../util/hooks/useFastContext";
import { Graph } from "../util/structs/graph";

export namespace MainGraph {
    type State = {
        nodes: FastContextMember<{ [nodeId: string]: Graph.Node<string> }>;
        nodeList: FastContextMember<string[]>;
        links: FastContextMember<{ [linkId: string]: Graph.Link<string> }>;
        linkList: FastContextMember<string[]>;
        positions: FastContextMember<{ [key: string]: { x: number; y: number } }>;
        pendingConnection: FastContextMember<string | null>;
    };

    const CTX = createContext<State | undefined>(undefined);

    export const Provider = ({ children }: { children?: ReactNode }) => {
        const nodes = useFastContextMember<{ [nodeId: string]: Graph.Node<string> }>({
            a: { id: "a", payload: "a" },
            b: { id: "b", payload: "b" },
            c: { id: "c", payload: "c" },
        });
        const nodeList = useFastContextMember<string[]>(["a", "b", "c"]);

        const links = useFastContextMember<{ [linkId: string]: Graph.Link<string> }>({
            "1": { from: "a", to: "b", id: "1", payload: "1" },
        });
        const linkList = useFastContextMember<string[]>(["1"]);

        const positions = useFastContextMember<{ [key: string]: { x: number; y: number } }>({
            a: { x: -100, y: -100 },
            b: { x: 300, y: 0 },
            c: { x: 100, y: 250 },
        });

        const pendingConnection = useFastContextMember<string | null>(null);

        const value = useMemo(() => ({ nodes, nodeList, links, linkList, positions, pendingConnection }), []);

        return <CTX value={value}>{children}</CTX>;
    };

    export const useNodeList = () => {
        const ctx = useContext(CTX)!;

        return useSyncExternalStore(ctx.nodeList.subscribe, ctx.nodeList.get);
    };

    export const useLinkList = () => {
        const ctx = useContext(CTX)!;

        return useSyncExternalStore(ctx.linkList.subscribe, ctx.linkList.get);
    };

    export const useLink = (id: string) => {
        const ctx = useContext(CTX)!;

        const selector = useCallback(() => {
            return ctx.links.get()[id];
        }, [ctx, id]);

        return useSyncExternalStore(ctx.links.subscribe, selector);
    };

    export const useNode = (id: string) => {
        const ctx = useContext(CTX)!;

        const selector = useCallback(() => {
            return ctx.nodes.get()[id];
        }, [ctx, id]);

        return useSyncExternalStore(ctx.nodes.subscribe, selector);
    };

    export const usePositionOf = (id: string) => {
        const ctx = useContext(CTX)!;

        const selector = useCallback(() => {
            return ctx.positions.get()[id];
        }, [ctx, id]);

        const value = useSyncExternalStore(ctx.positions.subscribe, selector);

        const set = useCallback(
            (v: SetStateAction<{ x: number; y: number }>) => {
                const prev = ctx.positions.ref.current[id];
                const { x, y } = typeof v === "function" ? v(prev) : v;
                if (x !== prev.x || y !== prev.y) {
                    ctx.positions.ref.current[id] = { x, y };
                    ctx.positions.notify();
                }
            },
            [ctx, id],
        );

        return [value, set] as const;
    };

    export const usePendingConnection = () => {
        const ctx = useContext(CTX)!;
        return useFastContextState(ctx.pendingConnection);
    };

    export const useMethods = () => {
        const ctx = useContext(CTX)!;

        return useMemo(() => {
            const connect = (fromNode: string, toNode: string) => {
                const oG = { nodes: ctx.nodes.get(), links: ctx.links.get() };
                const [{ links }, newLink] = Graph.connect(oG, fromNode, toNode, "test");
                if (newLink) {
                    ctx.links.ref.current = links;
                    ctx.linkList.ref.current = Object.keys(links);
                    ctx.links.notify();
                    ctx.linkList.notify();
                }
            };

            return { connect };
        }, [ctx]);
    };
}
