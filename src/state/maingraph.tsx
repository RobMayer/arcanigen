import { createContext, ReactNode, SetStateAction, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { FastContextMember, useFastContextMember, useFastContextState } from "../util/hooks/useFastContext";
import { NODETYPE_REGISTRY } from "../definitions";
import { PayloadOf } from "../definitions/nodes/types";
import { ArcaneGraph } from "../util/structs/arcaneGraph";

// will eventually hold a container for node-type specific logic

export namespace MainGraph {
    export type BaseNode = PayloadOf<(typeof NODETYPE_REGISTRY)[keyof typeof NODETYPE_REGISTRY]>;

    export type PendingConnection = { node: string; socket: string; side: "in" | "out"; type: string };

    type State = {
        nodes: FastContextMember<{ [nodeId: string]: ArcaneGraph.NodeOf<BaseNode> }>;
        nodeList: FastContextMember<string[]>;
        links: FastContextMember<{ [linkId: string]: ArcaneGraph.LinkOf<string> }>;
        linkList: FastContextMember<string[]>;
        positions: FastContextMember<{ [key: string]: { x: number; y: number } }>;
        // Todo: need more info: nodeId, socketId, side, socketType
        pendingConnection: FastContextMember<PendingConnection | null>;
    };

    const CTX = createContext<State | undefined>(undefined);

    export const Provider = ({ children }: { children?: ReactNode }) => {
        const nodes = useFastContextMember<{ [nodeId: string]: ArcaneGraph.NodeOf<BaseNode> }>({
            RESULT: {
                ...NODETYPE_REGISTRY.result.create({}, "RESULT"),
            },
        });
        const nodeList = useFastContextMember<string[]>(["RESULT"]);

        const links = useFastContextMember<{ [linkId: string]: ArcaneGraph.LinkOf<string> }>({});
        const linkList = useFastContextMember<string[]>([]);

        const positions = useFastContextMember<{ [key: string]: { x: number; y: number } }>({
            RESULT: { x: 0, y: 0 },
        });

        const pendingConnection = useFastContextMember<{ node: string; socket: string; side: "in" | "out"; type: string } | null>(null);

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

    export const usePendingConnection = () => {
        const ctx = useContext(CTX)!;
        return useFastContextState(ctx.pendingConnection);
    };

    export const useMethods = () => {
        const ctx = useContext(CTX)!;

        return useMemo(() => {
            const connect = (fromNode: string, toNode: string, fromSocket: string, toSocket: string) => {
                const oldGraph = { nodes: ctx.nodes.get(), links: ctx.links.get() };
                //const [{ links }, newLink] = Graph.connect(oG, fromNode, toNode, "test");
                // if (newLink) {
                //     ctx.links.ref.current = links;
                //     ctx.linkList.ref.current = Object.keys(links);
                //     ctx.links.notify();
                //     ctx.linkList.notify();
                // }
            };

            return { connect };
        }, [ctx]);
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

    type XY = { x: number; y: number };

    export const usePositionMethods = () => {
        const ctx = useContext(CTX)!;
        return useMemo(() => {
            const doCommit = () => ctx.positions.notify();
            const doSetMany = (toSet: { [key: string]: XY }) => {
                ctx.positions.ref.current = {
                    ...ctx.positions.ref.current,
                    ...toSet,
                };
            };
            const setMany = (toSet: { [key: string]: XY }) => {
                doSetMany(toSet);
                doCommit();
            };
            setMany.passive = doSetMany;
            setMany.commit = doCommit;

            return {
                setMany,
            };
        }, [ctx]);
    };

    export const usePositionsRef = () => useContext(CTX)!.positions.ref;
    export const useNodesRef = () => useContext(CTX)!.nodes.ref;
}
