import { createContext, ReactNode, RefObject, SetStateAction, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { FastContextMember, useFastContextMember, useFastContextState } from "../util/hooks/useFastContext";
import { ArcaneGraph } from "../util/structs/arcaneGraph";
import { useGraphId } from "./graphId";
import { DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../definitions/betterTypes";
import { SVGObject } from "../types";
import { Resolver } from "../util/resolver";

// will eventually hold a container for node-type specific logic

export namespace Project {
    export type PendingConnection = { scope: GraphId; node: string; socket: string; side: "in" | "out"; type: SocketTypes.Kind };
    type GraphId = string;
    type SocketId = string;
    type XY = { x: number; y: number };

    type TheType = {
        nodes: { [graphId: GraphId]: { [nodeId: ArcaneGraph.NodeId]: NodeDefinitions.NodeFor<NodeDefinitions.Any> } };
        nodeList: { [graphId: GraphId]: ArcaneGraph.NodeId[] };
        links: { [graphId: GraphId]: { [linkId: ArcaneGraph.LinkId]: ArcaneGraph.Link } };
        linkList: { [graphId: GraphId]: ArcaneGraph.LinkId[] };
        positions: { [graphId: GraphId]: { [nodeId: ArcaneGraph.NodeId]: XY } };
        users: { [graphId: GraphId]: { node: ArcaneGraph.NodeId; scope: GraphId }[] };
        inputs: { [graphId: GraphId]: ArcaneGraph.NodeId[] };
        outputs: { [graphId: GraphId]: ArcaneGraph.NodeId[] };
        // we need graph-level properties, and possibly a stable list of subgraphs
        cache: { [graphId: GraphId]: { [nodeId: ArcaneGraph.NodeId]: { [socketId: SocketId]: DataTypes.AnyEval } } };
    };

    type State = { [key in keyof TheType]: FastContextMember<TheType[key]> } & {
        pendingConnection: FastContextMember<PendingConnection | null>;
    };

    const CTX = createContext<State | undefined>(undefined);

    export const Provider = ({ children }: { children?: ReactNode }) => {
        const nodes = useFastContextMember<TheType["nodes"]>({
            root: {
                RESULT: {
                    ...NodeTypes.get("result").create({}, "RESULT"),
                },
                test: {
                    ...NodeTypes.get("circle").create({}, "test"),
                },
            },
        });
        const nodeList = useFastContextMember<TheType["nodeList"]>({
            root: ["RESULT", "test"],
        });
        // const evalCache = useFastContextMember<TheType["evalCache"]>({});

        const links = useFastContextMember<TheType["links"]>({
            root: {},
        });

        const linkList = useFastContextMember<TheType["linkList"]>({
            root: [],
        });

        const positions = useFastContextMember<TheType["positions"]>({
            root: {
                RESULT: { x: 0, y: 0 },
                test: { x: -400, y: 100 },
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

        const cache = useFastContextMember<TheType["cache"]>({});

        const pendingConnection = useFastContextMember<{ node: string; socket: string; side: "in" | "out"; type: SocketTypes.Kind; scope: string } | null>(null);

        const value = useMemo(() => ({ cache, nodes, nodeList, links, linkList, positions, users, inputs, outputs, pendingConnection }), []);

        return <CTX value={value}>{children}</CTX>;
    };

    export const useNodeList = () => {
        const graphId = useGraphId();
        const ctx = useContext(CTX)!;
        const selector = useCallback(() => {
            return ctx.nodeList.get()[graphId];
        }, [graphId, ctx]);
        return useSyncExternalStore(ctx.nodeList.subscribe, selector);
    };

    export const useLinkList = () => {
        const graphId = useGraphId();
        const ctx = useContext(CTX)!;
        const selector = useCallback(() => {
            return ctx.linkList.get()[graphId];
        }, [graphId, ctx]);
        return useSyncExternalStore(ctx.linkList.subscribe, selector);
    };

    export const useLink = (id: string) => {
        const graphId = useGraphId();
        const ctx = useContext(CTX)!;

        const selector = useCallback(() => {
            return ctx.links.get()[graphId][id];
        }, [ctx, id, graphId]);

        return useSyncExternalStore(ctx.links.subscribe, selector);
    };

    export const useNode = (id: string) => {
        const graphId = useGraphId();
        const ctx = useContext(CTX)!;

        const selector = useCallback(() => {
            return ctx.nodes.get()[graphId][id];
        }, [ctx, id, graphId]);

        const methods = useMemo(() => {
            const update = <P extends NodeDefinitions.PayloadTypeOf<NodeDefinitions.Any>>(data: Partial<P>) => {
                const prev = ctx.nodes.ref.current[graphId][id].payload as P;

                ctx.nodes.ref.current = {
                    ...ctx.nodes.ref.current,
                    [graphId]: {
                        ...ctx.nodes.ref.current[graphId],
                        [id]: {
                            ...ctx.nodes.ref.current[graphId][id],
                            payload: {
                                ...prev,
                                ...data,
                            },
                        },
                    },
                };

                // const resolver = makeResolver()

                ctx.nodes.notify();
            };

            const remove = () => {
                const oldGraph = { nodes: ctx.nodes.ref.current[graphId], links: ctx.links.ref.current[graphId] };
                const [{ nodes, links }] = ArcaneGraph.removeNodes(oldGraph, id);

                const positions = { ...ctx.positions.ref.current[graphId] };
                delete positions[id];

                ctx.nodes.ref.current = { ...ctx.nodes.ref.current, [graphId]: nodes };
                ctx.nodeList.ref.current = { ...ctx.nodeList.ref.current, [graphId]: Object.keys(nodes) };
                ctx.positions.ref.current = { ...ctx.positions.ref.current, [graphId]: positions };
                ctx.links.ref.current = { ...ctx.links.ref.current, [graphId]: links };
                ctx.linkList.ref.current = { ...ctx.linkList.ref.current, [graphId]: Object.keys(links) };

                ctx.nodes.notify();
                ctx.nodeList.notify();
                ctx.positions.notify();
                ctx.links.notify();
                ctx.linkList.notify();
            };

            return { update, remove };
        }, [id, graphId, ctx]);

        return [useSyncExternalStore(ctx.nodes.subscribe, selector), methods] as const;
    };

    export const usePendingConnection = () => {
        const ctx = useContext(CTX)!;
        return useFastContextState(ctx.pendingConnection);
    };

    // todo: handle the case where graphId doesn't yet exist!
    export const useMethods = () => {
        const graphId = useGraphId();
        const ctx = useContext(CTX)!;

        return useMemo(() => {
            // ! Important: this assumes that 'from' and 'to' have already been normalized
            const connect = (fromNode: string, toNode: string, fromSocket: string, toSocket: string, type: DataTypes.Kind) => {
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
                    // nothing needs to be *removed* from the cache, but upstream of the link needs to be regenerated.
                }
            };

            const addNodeByType = (nodeType: NodeTypes.Any, params: Partial<NodeDefinitions.PayloadTypeOf<NodeDefinitions.Generic>>, position?: { x: number; y: number }) => {
                const newNode = nodeType.create(params);
                const oldGraph = { nodes: ctx.nodes.get()[graphId], links: ctx.links.get()[graphId] };
                const { nodes } = ArcaneGraph.importNodes(oldGraph, [newNode]);
                ctx.nodes.ref.current = {
                    ...ctx.nodes.ref.current,
                    [graphId]: nodes,
                };
                ctx.nodeList.ref.current = {
                    ...ctx.nodeList.ref.current,
                    [graphId]: Object.keys(nodes),
                };
                ctx.positions.ref.current = {
                    ...ctx.positions.ref.current,
                    [graphId]: {
                        ...ctx.positions.ref.current[graphId],
                        [newNode.id]: position ?? { x: 0, y: 0 },
                    },
                };
                ctx.nodes.notify();
                ctx.nodeList.notify();
                ctx.positions.notify();
            };

            const removeNode = (nodeId: string) => {
                const oldGraph = { nodes: ctx.nodes.ref.current[graphId], links: ctx.links.ref.current[graphId] };
                const [{ nodes, links }] = ArcaneGraph.removeNodes(oldGraph, nodeId);

                const positions = { ...ctx.positions.ref.current[graphId] };
                delete positions[nodeId];

                ctx.nodes.ref.current = { ...ctx.nodes.ref.current, [graphId]: nodes };
                ctx.nodeList.ref.current = { ...ctx.nodeList.ref.current, [graphId]: Object.keys(nodes) };
                ctx.positions.ref.current = { ...ctx.positions.ref.current, [graphId]: positions };
                ctx.links.ref.current = { ...ctx.links.ref.current, [graphId]: links };
                ctx.linkList.ref.current = { ...ctx.linkList.ref.current, [graphId]: Object.keys(links) };

                ctx.nodes.notify();
                ctx.nodeList.notify();
                ctx.positions.notify();
                ctx.links.notify();
                ctx.linkList.notify();
            };

            return { connect, removeNode, addNodeByType };
        }, [ctx, graphId]);
    };

    export const usePositionOf = (id: string) => {
        const graphId = useGraphId();
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

    export const usePositionMethods = () => {
        const graphId = useGraphId();
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

    export const useResolverState = () => {
        const ctx = useContext(CTX)!;

        const nodes = useSyncExternalStore(ctx.nodes.subscribe, ctx.nodes.get);
        const links = useSyncExternalStore(ctx.links.subscribe, ctx.links.get);
        const inputs = useSyncExternalStore(ctx.inputs.subscribe, ctx.inputs.get);
        const outputs = useSyncExternalStore(ctx.outputs.subscribe, ctx.outputs.get);
        const users = useSyncExternalStore(ctx.users.subscribe, ctx.users.get);

        const value = useMemo(() => {
            return { links, nodes, inputs, outputs, users };
        }, [links, nodes, inputs, outputs, users]);

        return value;
    };
}
