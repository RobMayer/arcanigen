import { createContext, ReactNode, RefObject, SetStateAction, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { FastContextMember, useFastContextMember, useFastContextState } from "../util/hooks/useFastContext";
import { ArcaneGraph } from "../util/structs/arcaneGraph";
import { useGraphId } from "./graphId";
import { DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../definitions/betterTypes";
import { Resolver } from "../util/resolver";

// will eventually hold a container for node-type specific logic

type GraphId = string;
type SocketId = string;
type CacheType = { [graphId: GraphId]: { [nodeId: ArcaneGraph.NodeId]: { [outSocket: SocketId]: DataTypes.AnyEval } } };
type NodesType = { [graphId: GraphId]: { [nodeId: ArcaneGraph.NodeId]: NodeDefinitions.NodeFor<NodeDefinitions.Any> } };
type LinksType = { [graphId: GraphId]: { [linkId: ArcaneGraph.LinkId]: ArcaneGraph.Link } };

/** Invalidates cache for a node and all its downstream nodes */
const invalidateDownstream = (cache: CacheType, nodes: NodesType, links: LinksType, graphId: GraphId, nodeId: ArcaneGraph.NodeId): CacheType => {
    const graph = { nodes: nodes[graphId], links: links[graphId] };
    const downstream = ArcaneGraph.wideDownstreamOf(graph, nodeId);
    const toInvalidate = [nodeId, ...downstream];

    const graphCache = cache[graphId];
    if (!graphCache) return cache;

    let newGraphCache = graphCache;
    let changed = false;
    for (const id of toInvalidate) {
        if (id in newGraphCache) {
            if (!changed) {
                newGraphCache = { ...graphCache };
                changed = true;
            }
            delete newGraphCache[id];
        }
    }

    if (!changed) return cache;
    return { ...cache, [graphId]: newGraphCache };
};

/** Evaluates a single node and caches all its output sockets */
const evaluateAndCacheNode = (cache: CacheType, nodes: NodesType, links: LinksType, graphId: GraphId, nodeId: ArcaneGraph.NodeId): CacheType => {
    const node = nodes[graphId]?.[nodeId];
    if (!node) return cache;

    const evaluate = NodeTypes.getEvaluator(node.type);
    if (!evaluate) return cache;

    // Create a resolve function that uses the cache
    const resolve = <K extends DataTypes.Kind>(targetNodeId: string, inSocket: string): DataTypes.EvalOf<DataTypes.Use<K>> | null => {
        const targetNode = nodes[graphId]?.[targetNodeId];
        if (!targetNode) return null;

        const linkId = targetNode.in[inSocket];
        if (!linkId) return null;

        const link = links[graphId]?.[linkId];
        if (!link) return null;

        const { fromNode, fromSocket } = link;
        return (cache[graphId]?.[fromNode]?.[fromSocket] ?? null) as DataTypes.EvalOf<DataTypes.Use<K>> | null;
    };

    const context: Resolver.Context = {
        graphId,
        define: () => {}, // definitions are handled at render time
        resolve,
        subgraph: () => ({}), // TODO: implement subgraph support
        getNode: (gId: string, nodeId: string) => nodes[gId]?.[nodeId],
    };

    // Evaluate all output sockets
    const outputSockets = Object.keys(node.out);
    const nodeResults: { [outSocket: string]: DataTypes.AnyEval } = {};
    let hasResults = false;

    for (const outSocket of outputSockets) {
        const result = evaluate(node, outSocket as keyof NodeDefinitions.Any["outputs"], context);
        if (result !== null) {
            nodeResults[outSocket] = result;
            hasResults = true;
        }
    }

    if (!hasResults) return cache;

    return {
        ...cache,
        [graphId]: {
            ...cache[graphId],
            [nodeId]: {
                ...(cache[graphId]?.[nodeId] ?? {}),
                ...nodeResults,
            },
        },
    };
};

/** Rebuilds cache for a node and all downstream nodes in topological order */
const rebuildDownstream = (cache: CacheType, nodes: NodesType, links: LinksType, graphId: GraphId, nodeId: ArcaneGraph.NodeId): CacheType => {
    const graph = { nodes: nodes[graphId], links: links[graphId] };

    // Get downstream nodes in BFS order (ensures upstream is processed before downstream)
    const downstream = ArcaneGraph.wideDownstreamOf(graph, nodeId);
    const toEvaluate = [nodeId, ...downstream];

    let newCache = cache;
    for (const id of toEvaluate) {
        newCache = evaluateAndCacheNode(newCache, nodes, links, graphId, id);
    }

    return newCache;
};

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
        cache: { [graphId: GraphId]: { [nodeId: ArcaneGraph.NodeId]: { [inSocket: SocketId]: DataTypes.AnyEval } } };
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
            },
        });
        const nodeList = useFastContextMember<TheType["nodeList"]>({
            root: ["RESULT"],
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

        const cache = useFastContextMember<TheType["cache"]>({
            root: { result: {} },
        });

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

    export const useNode = (graphId: GraphId, id: string) => {
        const ctx = useContext(CTX)!;

        const selector = useCallback(() => {
            return ctx.nodes.get()[graphId][id];
        }, [ctx, id, graphId]);

        const methods = useMethods();

        const nodeMethods = useMemo(() => {
            const update = <P extends NodeDefinitions.PayloadTypeOf<NodeDefinitions.Any>>(data: Partial<P>) => {
                return methods.updateNodePayload(id, data);
            };

            const remove = () => {
                return methods.removeNode(id);
            };

            return { update, remove };
        }, [methods, id]);

        return [useSyncExternalStore(ctx.nodes.subscribe, selector), nodeMethods] as const;
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

                    // Ensure fromNode is cached first (it may not have been evaluated yet)
                    // Then rebuild cache for toNode and all downstream nodes
                    let newCache = evaluateAndCacheNode(ctx.cache.ref.current, ctx.nodes.ref.current, ctx.links.ref.current, graphId, fromNode);
                    newCache = rebuildDownstream(newCache, ctx.nodes.ref.current, ctx.links.ref.current, graphId, toNode);
                    ctx.cache.ref.current = newCache;
                    ctx.cache.notify();
                }
            };

            const addNodeByType = (nodeType: NodeTypes.Any, params: Partial<NodeDefinitions.PayloadTypeOf<NodeDefinitions.Generic>>, position?: { x: number; y: number }) => {
                const newNode = nodeType.create(params);
                const oldGraph = { nodes: ctx.nodes.get()[graphId], links: ctx.links.get()[graphId] };
                const { nodes } = ArcaneGraph.importNodes(oldGraph, [newNode]);

                // Build initial state with the new node added
                let currentNodes = { ...ctx.nodes.ref.current, [graphId]: nodes };
                let currentInputs = ctx.inputs.ref.current;
                let currentOutputs = ctx.outputs.ref.current;
                let currentUsers = ctx.users.ref.current;

                // Call onCreate hook if defined
                if (nodeType.onCreate) {
                    const hookState: NodeTypes.HookState = {
                        nodes: currentNodes,
                        links: ctx.links.ref.current,
                        inputs: currentInputs,
                        outputs: currentOutputs,
                        users: currentUsers,
                    };
                    const onCreate = nodeType.onCreate as (node: NodeDefinitions.NodeFor<NodeDefinitions.Any>, state: NodeTypes.HookState, graphId: string) => NodeTypes.HookState;
                    const newState = onCreate(newNode, hookState, graphId);
                    currentNodes = newState.nodes;
                    currentInputs = newState.inputs;
                    currentOutputs = newState.outputs;
                    currentUsers = newState.users;
                }

                ctx.nodes.ref.current = currentNodes;
                ctx.nodeList.ref.current = {
                    ...ctx.nodeList.ref.current,
                    [graphId]: Object.keys(currentNodes[graphId]),
                };
                ctx.positions.ref.current = {
                    ...ctx.positions.ref.current,
                    [graphId]: {
                        ...ctx.positions.ref.current[graphId],
                        [newNode.id]: position ?? { x: 0, y: 0 },
                    },
                };
                ctx.inputs.ref.current = currentInputs;
                ctx.outputs.ref.current = currentOutputs;
                ctx.users.ref.current = currentUsers;

                ctx.nodes.notify();
                ctx.nodeList.notify();
                ctx.positions.notify();
                ctx.inputs.notify();
                ctx.outputs.notify();
                ctx.users.notify();
            };

            const updateNodePayload = <P extends NodeDefinitions.PayloadTypeOf<NodeDefinitions.Any>>(id: ArcaneGraph.NodeId, data: Partial<P>) => {
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

                // Rebuild cache for this node and all downstream nodes
                ctx.cache.ref.current = rebuildDownstream(ctx.cache.ref.current, ctx.nodes.ref.current, ctx.links.ref.current, graphId, id);

                ctx.nodes.notify();
                ctx.cache.notify();
            };

            const removeNode = (nodeId: string) => {
                const oldGraph = { nodes: ctx.nodes.ref.current[graphId], links: ctx.links.ref.current[graphId] };
                const node = oldGraph.nodes[nodeId];
                if (!node) return;

                // Call onDelete hook if defined
                let currentInputs = ctx.inputs.ref.current;
                let currentOutputs = ctx.outputs.ref.current;
                let currentUsers = ctx.users.ref.current;

                const nodeType = NodeTypes.get(node.type);
                if (nodeType.onDelete) {
                    const hookState: NodeTypes.HookState = {
                        nodes: ctx.nodes.ref.current,
                        links: ctx.links.ref.current,
                        inputs: currentInputs,
                        outputs: currentOutputs,
                        users: currentUsers,
                    };
                    const onDelete = nodeType.onDelete as (node: NodeDefinitions.NodeFor<NodeDefinitions.Any>, state: NodeTypes.HookState, graphId: string) => NodeTypes.HookState;
                    const newState = onDelete(node, hookState, graphId);
                    currentInputs = newState.inputs;
                    currentOutputs = newState.outputs;
                    currentUsers = newState.users;
                }

                // Find downstream nodes BEFORE removing (they'll need cache rebuild)
                const downstream = ArcaneGraph.wideDownstreamOf(oldGraph, nodeId);

                const [{ nodes, links }] = ArcaneGraph.removeNodes(oldGraph, nodeId);

                const positions = { ...ctx.positions.ref.current[graphId] };
                delete positions[nodeId];

                ctx.nodes.ref.current = { ...ctx.nodes.ref.current, [graphId]: nodes };
                ctx.nodeList.ref.current = { ...ctx.nodeList.ref.current, [graphId]: Object.keys(nodes) };
                ctx.positions.ref.current = { ...ctx.positions.ref.current, [graphId]: positions };
                ctx.links.ref.current = { ...ctx.links.ref.current, [graphId]: links };
                ctx.linkList.ref.current = { ...ctx.linkList.ref.current, [graphId]: Object.keys(links) };
                ctx.inputs.ref.current = currentInputs;
                ctx.outputs.ref.current = currentOutputs;
                ctx.users.ref.current = currentUsers;

                // Invalidate cache for the removed node
                let newCache = invalidateDownstream(ctx.cache.ref.current, ctx.nodes.ref.current, ctx.links.ref.current, graphId, nodeId);

                // Rebuild cache for downstream nodes (they lost their upstream connection)
                for (const downstreamId of downstream) {
                    if (nodes[downstreamId]) {
                        newCache = rebuildDownstream(newCache, ctx.nodes.ref.current, ctx.links.ref.current, graphId, downstreamId);
                    }
                }
                ctx.cache.ref.current = newCache;

                ctx.nodes.notify();
                ctx.nodeList.notify();
                ctx.positions.notify();
                ctx.links.notify();
                ctx.linkList.notify();
                ctx.cache.notify();
                ctx.inputs.notify();
                ctx.outputs.notify();
                ctx.users.notify();
            };

            return { connect, removeNode, updateNodePayload, addNodeByType };
        }, [ctx, graphId]);
    };

    export const usePositionOf = (graphId: GraphId, id: string) => {
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

    //
    export const useResolved = <D extends NodeDefinitions.Generic, K extends keyof D["inputs"]>(graphId: GraphId, { id: nodeId }: NodeDefinitions.NodeFor<D>, inSocket: K): DataTypes.EvalOf<D["inputs"][K]> | null => {
        const ctx = useContext(CTX)!;

        const selector = useCallback(() => {
            const node = ctx.nodes.ref.current[graphId]?.[nodeId];
            if (!node) return null;
            const linkId = node.in[inSocket as string];
            if (!linkId) return null;
            const link = ctx.links.ref.current[graphId]?.[linkId];
            if (!link) return null;
            return ctx.cache.get()[graphId]?.[link.fromNode]?.[link.fromSocket] ?? null;
        }, [ctx, graphId, nodeId, inSocket]);

        return useSyncExternalStore(ctx.cache.subscribe, selector) as DataTypes.EvalOf<D["inputs"][K]> | null;
    };

    export const useGraphInputs = (graphId: GraphId) => {
        const ctx = useContext(CTX)!;

        const selector = useCallback(() => {
            return ctx.inputs.get()[graphId];
        }, [graphId, ctx]);

        return useSyncExternalStore(ctx.inputs.subscribe, selector);
    };

    export const useGraphOutputs = (graphId: GraphId) => {
        const ctx = useContext(CTX)!;

        const selector = useCallback(() => {
            return ctx.outputs.get()[graphId];
        }, [graphId, ctx]);

        return useSyncExternalStore(ctx.outputs.subscribe, selector);
    };
}
