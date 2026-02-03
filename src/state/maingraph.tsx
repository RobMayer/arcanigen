import { createContext, ReactNode, SetStateAction, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { FastContextMember, useFastContextMember, useFastContextState } from "../util/hooks/useFastContext";
import { ArcaneGraph } from "../util/structs/arcaneGraph";
import { BaseDefinition } from "../definitions/nodes/abstractNode";
import { NodeTypeRegistry } from "../definitions";
import { DataTypes } from "../definitions/datatypes";

// will eventually hold a container for node-type specific logic

export namespace MainGraph {
    export type PendingConnection = { scope: GraphId; node: string; socket: string; side: "in" | "out"; type: string };
    type GraphId = string;
    type XY = { x: number; y: number };

    type TheType = {
        nodes: { [graphId: GraphId]: { [nodeId: ArcaneGraph.NodeId]: ArcaneGraph.NodeOf<DataTypes.PayloadFor<BaseDefinition>> } };
        nodeList: { [graphId: GraphId]: ArcaneGraph.NodeId[] };
        links: { [graphId: GraphId]: { [linkId: ArcaneGraph.LinkId]: ArcaneGraph.Link } };
        linkList: { [graphId: GraphId]: ArcaneGraph.LinkId[] };
        positions: { [graphId: GraphId]: { [nodeId: ArcaneGraph.NodeId]: XY } };
        users: { [graphId: GraphId]: { node: ArcaneGraph.NodeId; scope: GraphId }[] };
        inputs: { [graphId: GraphId]: ArcaneGraph.NodeId[] };
        outputs: { [graphId: GraphId]: ArcaneGraph.NodeId[] };
    };

    type State = { [key in keyof TheType]: FastContextMember<TheType[key]> } & {
        pendingConnection: FastContextMember<PendingConnection | null>;
    };

    const CTX = createContext<State | undefined>(undefined);

    export const Provider = ({ children }: { children?: ReactNode }) => {
        const nodes = useFastContextMember<TheType["nodes"]>({
            root: {
                RESULT: {
                    ...NodeTypeRegistry.get("result").create({}, "RESULT"),
                },
            },
        });
        const nodeList = useFastContextMember<TheType["nodeList"]>({
            root: ["RESULT"],
        });

        const links = useFastContextMember<TheType["links"]>({
            root: {},
        });

        const linkList = useFastContextMember<TheType["linkList"]>({
            root: [],
        });

        const positions = useFastContextMember<TheType["positions"]>({
            root: {
                RESULT: { x: 0, y: 0 },
            },
        });

        const users = useFastContextMember<TheType["users"]>({
            root: [],
        });

        const inputs = useFastContextMember<TheType["inputs"]>({
            root: [],
        });

        const outputs = useFastContextMember<TheType["outputs"]>({
            root: ["RESULT"],
        });

        const pendingConnection = useFastContextMember<{ node: string; socket: string; side: "in" | "out"; type: string; scope: string } | null>(null);

        const value = useMemo(() => ({ nodes, nodeList, links, linkList, positions, users, inputs, outputs, pendingConnection }), []);

        return <CTX value={value}>{children}</CTX>;
    };

    export const useNodeList = (graphId: string = "root") => {
        const ctx = useContext(CTX)!;
        const selector = useCallback(() => {
            return ctx.nodeList.get()[graphId];
        }, [graphId, ctx]);
        return useSyncExternalStore(ctx.nodeList.subscribe, selector);
    };

    export const useLinkList = (graphId: string = "root") => {
        const ctx = useContext(CTX)!;
        const selector = useCallback(() => {
            return ctx.linkList.get()[graphId];
        }, [graphId, ctx]);
        return useSyncExternalStore(ctx.linkList.subscribe, selector);
    };

    export const useLink = (id: string, graphId: string = "root") => {
        const ctx = useContext(CTX)!;

        const selector = useCallback(() => {
            return ctx.links.get()[graphId][id];
        }, [ctx, id, graphId]);

        return useSyncExternalStore(ctx.links.subscribe, selector);
    };

    export const useNode = (id: string, graphId: string = "root"): ArcaneGraph.NodeOf<DataTypes.PayloadFor<BaseDefinition>> => {
        const ctx = useContext(CTX)!;

        const selector = useCallback(() => {
            return ctx.nodes.get()[graphId][id];
        }, [ctx, id, graphId]);

        return useSyncExternalStore(ctx.nodes.subscribe, selector);
    };

    export const usePendingConnection = () => {
        const ctx = useContext(CTX)!;
        return useFastContextState(ctx.pendingConnection);
    };

    // todo: handle the case where graphId doesn't yet exist!
    export const useMethods = (graphId: GraphId = "root") => {
        const ctx = useContext(CTX)!;

        return useMemo(() => {
            // ! Important: this assumes that 'from' and 'to' have already been normalized
            const connect = (fromNode: string, toNode: string, fromSocket: string, toSocket: string, type: string) => {
                const oldGraph = { nodes: ctx.nodes.get()[graphId], links: ctx.links.get()[graphId] };
                const [{ nodes, links }, newLink] = ArcaneGraph.connect(oldGraph, fromNode, toNode, fromSocket, toSocket, type);
                if (newLink) {
                    if (nodes !== oldGraph.nodes) {
                        ctx.nodes.ref.current = {
                            ...ctx.nodes.ref.current,
                            [graphId]: nodes,
                        };
                        ctx.nodeList.ref.current = {
                            ...ctx.nodeList.ref.current,
                            [graphId]: Object.keys(nodes),
                        };
                        ctx.nodes.notify();
                        ctx.nodeList.notify();
                    }
                    if (links !== oldGraph.links) {
                        ctx.links.ref.current = {
                            ...ctx.links.ref.current,
                            [graphId]: links,
                        };
                        ctx.linkList.ref.current = {
                            ...ctx.linkList.ref.current,
                            [graphId]: Object.keys(links),
                        };
                        ctx.links.notify();
                        ctx.linkList.notify();
                    }
                }
            };

            return { connect };
        }, [ctx, graphId]);
    };

    export const usePositionOf = (id: string, graphId: GraphId = "root") => {
        const ctx = useContext(CTX)!;

        const selector = useCallback(() => {
            return ctx.positions.get()[graphId][id];
        }, [ctx, id, graphId]);

        const value = useSyncExternalStore(ctx.positions.subscribe, selector);

        const set = useCallback(
            (v: SetStateAction<{ x: number; y: number }>) => {
                const prev = ctx.positions.ref.current[graphId][id];
                const { x, y } = typeof v === "function" ? v(prev) : v;
                if (x !== prev.x || y !== prev.y) {
                    ctx.positions.ref.current = {
                        ...ctx.positions.ref.current,
                        [graphId]: {
                            ...ctx.positions.ref.current[graphId],
                            [id]: { x, y },
                        },
                    };
                    ctx.positions.notify();
                }
            },
            [ctx, id, graphId],
        );

        return [value, set] as const;
    };

    export const usePositionMethods = (graphId: GraphId = "root") => {
        const ctx = useContext(CTX)!;
        return useMemo(() => {
            const doCommit = () => ctx.positions.notify();
            const doSetMany = (toSet: { [key: string]: XY }) => {
                ctx.positions.ref.current = {
                    ...ctx.positions.ref.current,
                    [graphId]: {
                        ...ctx.positions.ref.current[graphId],
                        ...toSet,
                    },
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
        }, [ctx, graphId]);
    };

    export const usePositionsRef = () => useContext(CTX)!.positions.ref;
    export const useNodesRef = () => useContext(CTX)!.nodes.ref;
}
