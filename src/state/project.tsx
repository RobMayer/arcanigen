import { createContext, ReactNode, SetStateAction, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
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
type InterfacesType = { [graphId: GraphId]: string[] }; // prefixed with "in:" or "out:"

/** Parse an interface entry to get the direction and nodeId */
const parseInterface = (entry: string): { direction: "in" | "out"; nodeId: string } | null => {
    if (entry.startsWith("in:")) return { direction: "in", nodeId: entry.slice(3) };
    if (entry.startsWith("out:")) return { direction: "out", nodeId: entry.slice(4) };
    return null;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const STARTING_STATE = {
    root: {
        nodes: {
            RESULT: {
                ...NodeTypes.get("result").create({}, "RESULT"),
            },
        },
        links: {},
        positions: {
            RESULT: { x: 0, y: 0 },
        },
        interfaces: ["out:RESULT"],
    },
};

const TESTING_STATE = {
    root: {
        nodes: {
            CUSTOM_A: {
                type: "custom",
                id: "CUSTOM_A",
                in: {
                    inputA: null,
                },
                out: {
                    addResult: [],
                },
                payload: {
                    label: "",
                    graphId: "testSubgraph",
                    value_inputA: "3",
                },
            },
            RESULT: {
                ...NodeTypes.get("result").create({}, "RESULT"),
            },
        },
        links: {},
        positions: {
            RESULT: { x: 0, y: 0 },
            CUSTOM_A: { x: -400, y: 0 },
        },
        interfaces: ["out:RESULT"],
    },
    testSubgraph: {
        nodes: {
            inputA: {
                id: "inputA",
                type: "floatInput",
                in: {},
                out: {
                    output: ["aToAdder"],
                },
                payload: {
                    label: "A",
                    defaultValue: "1",
                    widget: 1,
                    min: "1",
                    hasMin: true,
                    max: "3",
                    hasMax: false,
                    step: "0.01",
                    hasStep: false,
                },
            },
            adder: {
                id: "adder",
                type: "addFloat",
                in: {
                    a: "aToAdder",
                    b: null,
                },
                out: {
                    output: ["adderToOut"],
                },
                payload: {
                    label: "",
                    a: "1",
                    b: "3",
                },
            },
            addResult: {
                id: "addResult",
                type: "floatOutput",
                in: {
                    input: "adderToOut",
                },
                out: {},
                payload: {
                    label: "Output",
                    widget: 1,
                },
            },
        },
        links: {
            aToAdder: { id: "aToAdder", fromNode: "inputA", fromSocket: "output", toNode: "adder", toSocket: "a", type: "float" },
            adderToOut: { id: "adderToOut", fromNode: "adder", fromSocket: "output", toNode: "addResult", toSocket: "input", type: "float" },
        },
        positions: {
            inputA: { x: -400, y: 0 },
            adder: { x: -200, y: 0 },
            addResult: { x: 0, y: 0 },
        },
        interfaces: ["out:addResult", "in:inputA"],
    },
};

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

/** Evaluates a subgraph given inputs, returns outputs */
const evaluateSubgraphForCache = (
    nodes: NodesType,
    links: LinksType,
    interfaces: InterfacesType,
    subgraphId: GraphId,
    inputValues: { [key: string]: DataTypes.AnyEval | null },
): { [key: string]: DataTypes.AnyEval | null } => {
    const subgraphNodes = nodes[subgraphId];
    const subgraphLinks = links[subgraphId];
    if (!subgraphNodes || !subgraphLinks) return {};

    // Helper to evaluate a node's output within this subgraph
    const evaluateNodeInSubgraph = (nodeId: string, outSocket: string): DataTypes.AnyEval | null => {
        const node = subgraphNodes[nodeId];
        if (!node) return null;

        const evaluate = NodeTypes.getEvaluator(node.type);
        if (!evaluate) return null;

        const subContext: Resolver.Context = {
            graphId: subgraphId,
            define: () => {},
            getNode: (gId: string, nId: string) => nodes[gId]?.[nId],
            getInput: <K extends DataTypes.Kind>(inputNodeId: string): DataTypes.EvalOf<DataTypes.Use<K>> | undefined => {
                return inputValues[inputNodeId] as DataTypes.EvalOf<DataTypes.Use<K>> | undefined;
            },
            resolve: <K extends DataTypes.Kind>(targetNodeId: string, inSocket: string): DataTypes.EvalOf<DataTypes.Use<K>> | null => {
                const targetNode = subgraphNodes[targetNodeId];
                if (!targetNode) return null;

                const linkId = targetNode.in[inSocket];
                if (!linkId) return null;

                const link = subgraphLinks[linkId];
                if (!link) return null;

                return evaluateNodeInSubgraph(link.fromNode, link.fromSocket) as DataTypes.EvalOf<DataTypes.Use<K>> | null;
            },
            subgraph: (nestedGraphId: string, nestedInputs: { [key: string]: DataTypes.AnyEval | null }) => {
                return evaluateSubgraphForCache(nodes, links, interfaces, nestedGraphId, nestedInputs);
            },
        };

        return evaluate(node, outSocket as keyof NodeDefinitions.Any["outputs"], subContext);
    };

    // Get output node IDs by parsing interfaces with "out:" prefix
    const subgraphInterfaces = interfaces[subgraphId] ?? [];
    const results: { [key: string]: DataTypes.AnyEval | null } = {};

    for (const entry of subgraphInterfaces) {
        const parsed = parseInterface(entry);
        if (!parsed || parsed.direction !== "out") continue;

        const outputNodeId = parsed.nodeId;
        const outputNode = subgraphNodes[outputNodeId];
        if (!outputNode) continue;

        // Resolve the "input" socket of the output node
        const linkId = outputNode.in["input"];
        if (!linkId) {
            results[outputNodeId] = null;
            continue;
        }

        const link = subgraphLinks[linkId];
        if (!link) {
            results[outputNodeId] = null;
            continue;
        }

        results[outputNodeId] = evaluateNodeInSubgraph(link.fromNode, link.fromSocket);
    }

    return results;
};

/** Evaluates a single node and caches all its output sockets */
const evaluateAndCacheNode = (cache: CacheType, nodes: NodesType, links: LinksType, interfaces: InterfacesType, graphId: GraphId, nodeId: ArcaneGraph.NodeId): CacheType => {
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
        subgraph: (subgraphId: string, inputValues: { [key: string]: DataTypes.AnyEval | null }) => {
            return evaluateSubgraphForCache(nodes, links, interfaces, subgraphId, inputValues);
        },
        getNode: (gId: string, nId: string) => nodes[gId]?.[nId],
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
const rebuildDownstream = (cache: CacheType, nodes: NodesType, links: LinksType, interfaces: InterfacesType, graphId: GraphId, nodeId: ArcaneGraph.NodeId): CacheType => {
    const graph = { nodes: nodes[graphId], links: links[graphId] };

    // Get downstream nodes in BFS order (ensures upstream is processed before downstream)
    const downstream = ArcaneGraph.wideDownstreamOf(graph, nodeId);
    const toEvaluate = [nodeId, ...downstream];

    let newCache = cache;
    for (const id of toEvaluate) {
        newCache = evaluateAndCacheNode(newCache, nodes, links, interfaces, graphId, id);
    }

    return newCache;
};

/** Builds cache for all nodes in a graph by evaluating in topological order (sources first) */
const buildGraphCache = (cache: CacheType, nodes: NodesType, links: LinksType, interfaces: InterfacesType, graphId: GraphId): CacheType => {
    const graphNodes = nodes[graphId];
    const graphLinks = links[graphId];
    if (!graphNodes || !graphLinks) return cache;

    // Find source nodes (nodes with no incoming connections)
    const sourceNodes: ArcaneGraph.NodeId[] = [];
    for (const nodeId of Object.keys(graphNodes)) {
        const node = graphNodes[nodeId];
        const hasIncoming = Object.values(node.in).some((linkId) => linkId !== null);
        if (!hasIncoming) {
            sourceNodes.push(nodeId);
        }
    }

    // Build cache starting from each source node
    let newCache = cache;
    for (const sourceId of sourceNodes) {
        newCache = rebuildDownstream(newCache, nodes, links, interfaces, graphId, sourceId);
    }

    return newCache;
};

/** Builds initial cache for all graphs */
const buildInitialCache = (nodes: NodesType, links: LinksType, interfaces: InterfacesType): CacheType => {
    let cache: CacheType = {};
    for (const graphId of Object.keys(nodes)) {
        cache[graphId] = {};
        cache = buildGraphCache(cache, nodes, links, interfaces, graphId);
    }
    return cache;
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
        interfaces: { [graphId: GraphId]: string[] }; // prefixed with "in:" or "out:"
        // we need graph-level properties, and possibly a stable list of subgraphs
        cache: { [graphId: GraphId]: { [nodeId: ArcaneGraph.NodeId]: { [inSocket: SocketId]: DataTypes.AnyEval } } };
    };

    type State = { [key in keyof TheType]: FastContextMember<TheType[key]> } & {
        pendingConnection: FastContextMember<PendingConnection | null>;
    };

    const CTX = createContext<State | undefined>(undefined);

    // Derive initial state from STARTING_STATE
    const INITIAL_NODES = Object.fromEntries(Object.entries(TESTING_STATE).map(([graphId, g]) => [graphId, g.nodes])) as TheType["nodes"];
    const INITIAL_NODE_LIST = Object.fromEntries(Object.entries(TESTING_STATE).map(([graphId, g]) => [graphId, Object.keys(g.nodes)])) as TheType["nodeList"];
    const INITIAL_LINKS = Object.fromEntries(Object.entries(TESTING_STATE).map(([graphId, g]) => [graphId, g.links])) as TheType["links"];
    const INITIAL_LINK_LIST = Object.fromEntries(Object.entries(TESTING_STATE).map(([graphId, g]) => [graphId, Object.keys(g.links)])) as TheType["linkList"];
    const INITIAL_POSITIONS = Object.fromEntries(Object.entries(TESTING_STATE).map(([graphId, g]) => [graphId, g.positions])) as TheType["positions"];
    const INITIAL_USERS = Object.fromEntries(Object.entries(TESTING_STATE).map(([graphId]) => [graphId, []])) as TheType["users"];
    const INITIAL_INTERFACES = Object.fromEntries(Object.entries(TESTING_STATE).map(([graphId, g]) => [graphId, g.interfaces])) as TheType["interfaces"];
    const INITIAL_CACHE = buildInitialCache(INITIAL_NODES, INITIAL_LINKS, INITIAL_INTERFACES);

    export const Provider = ({ children }: { children?: ReactNode }) => {
        const nodes = useFastContextMember<TheType["nodes"]>(INITIAL_NODES);
        const nodeList = useFastContextMember<TheType["nodeList"]>(INITIAL_NODE_LIST);
        const links = useFastContextMember<TheType["links"]>(INITIAL_LINKS);
        const linkList = useFastContextMember<TheType["linkList"]>(INITIAL_LINK_LIST);
        const positions = useFastContextMember<TheType["positions"]>(INITIAL_POSITIONS);
        const users = useFastContextMember<TheType["users"]>(INITIAL_USERS);
        const interfaces = useFastContextMember<TheType["interfaces"]>(INITIAL_INTERFACES);
        const cache = useFastContextMember<TheType["cache"]>(INITIAL_CACHE);

        const pendingConnection = useFastContextMember<{ node: string; socket: string; side: "in" | "out"; type: SocketTypes.Kind; scope: string } | null>(null);

        const value = useMemo(() => ({ cache, nodes, nodeList, links, linkList, positions, users, interfaces, pendingConnection }), []);

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
                const [{ nodes, links }, newLink] = ArcaneGraph.reconnect(oldGraph, fromNode, toNode, fromSocket, toSocket, type);
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
                    let newCache = evaluateAndCacheNode(ctx.cache.ref.current, ctx.nodes.ref.current, ctx.links.ref.current, ctx.interfaces.ref.current, graphId, fromNode);
                    newCache = rebuildDownstream(newCache, ctx.nodes.ref.current, ctx.links.ref.current, ctx.interfaces.ref.current, graphId, toNode);
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
                let currentInterfaces = ctx.interfaces.ref.current;
                let currentUsers = ctx.users.ref.current;

                // Call onCreate hook if defined
                if (nodeType.onCreate) {
                    const hookState: NodeTypes.HookState = {
                        nodes: currentNodes,
                        links: ctx.links.ref.current,
                        interfaces: currentInterfaces,
                        users: currentUsers,
                    };
                    const onCreate = nodeType.onCreate as (node: NodeDefinitions.NodeFor<NodeDefinitions.Any>, state: NodeTypes.HookState, graphId: string) => NodeTypes.HookState;
                    const newState = onCreate(newNode, hookState, graphId);
                    currentNodes = newState.nodes;
                    currentInterfaces = newState.interfaces;
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
                ctx.interfaces.ref.current = currentInterfaces;
                ctx.users.ref.current = currentUsers;

                ctx.nodes.notify();
                ctx.nodeList.notify();
                ctx.positions.notify();
                ctx.interfaces.notify();
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
                ctx.cache.ref.current = rebuildDownstream(ctx.cache.ref.current, ctx.nodes.ref.current, ctx.links.ref.current, ctx.interfaces.ref.current, graphId, id);

                ctx.nodes.notify();
                ctx.cache.notify();
            };

            const removeNode = (nodeId: string) => {
                const oldGraph = { nodes: ctx.nodes.ref.current[graphId], links: ctx.links.ref.current[graphId] };
                const node = oldGraph.nodes[nodeId];
                if (!node) return;

                // Call onDelete hook if defined
                let currentInterfaces = ctx.interfaces.ref.current;
                let currentUsers = ctx.users.ref.current;

                const nodeType = NodeTypes.get(node.type);
                if (nodeType.onDelete) {
                    const hookState: NodeTypes.HookState = {
                        nodes: ctx.nodes.ref.current,
                        links: ctx.links.ref.current,
                        interfaces: currentInterfaces,
                        users: currentUsers,
                    };
                    const onDelete = nodeType.onDelete as (node: NodeDefinitions.NodeFor<NodeDefinitions.Any>, state: NodeTypes.HookState, graphId: string) => NodeTypes.HookState;
                    const newState = onDelete(node, hookState, graphId);
                    currentInterfaces = newState.interfaces;
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
                ctx.interfaces.ref.current = currentInterfaces;
                ctx.users.ref.current = currentUsers;

                // Invalidate cache for the removed node
                let newCache = invalidateDownstream(ctx.cache.ref.current, ctx.nodes.ref.current, ctx.links.ref.current, graphId, nodeId);

                // Rebuild cache for downstream nodes (they lost their upstream connection)
                for (const downstreamId of downstream) {
                    if (nodes[downstreamId]) {
                        newCache = rebuildDownstream(newCache, ctx.nodes.ref.current, ctx.links.ref.current, ctx.interfaces.ref.current, graphId, downstreamId);
                    }
                }
                ctx.cache.ref.current = newCache;

                ctx.nodes.notify();
                ctx.nodeList.notify();
                ctx.positions.notify();
                ctx.links.notify();
                ctx.linkList.notify();
                ctx.cache.notify();
                ctx.interfaces.notify();
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
        const interfaces = useSyncExternalStore(ctx.interfaces.subscribe, ctx.interfaces.get);
        const users = useSyncExternalStore(ctx.users.subscribe, ctx.users.get);

        const value = useMemo(() => {
            return { links, nodes, interfaces, users };
        }, [links, nodes, interfaces, users]);

        return value;
    };

    export const useCachedOutput = <D extends NodeDefinitions.Generic, K extends keyof D["outputs"]>(
        graphId: GraphId,
        { id: nodeId }: NodeDefinitions.NodeFor<D>,
        outSocket: K,
    ): DataTypes.EvalOf<D["outputs"][K]> | null => {
        const ctx = useContext(CTX)!;
        const selector = useCallback(() => {
            return ctx.cache.get()[graphId]?.[nodeId]?.[outSocket as string] ?? null;
        }, [ctx, graphId, nodeId, outSocket]);
        return useSyncExternalStore(ctx.cache.subscribe, selector) as DataTypes.EvalOf<D["outputs"][K]> | null;
    };

    //
    export const useCachedInput = <D extends NodeDefinitions.Generic, K extends keyof D["inputs"]>(
        graphId: GraphId,
        { id: nodeId }: NodeDefinitions.NodeFor<D>,
        inSocket: K,
    ): DataTypes.EvalOf<D["inputs"][K]> | null => {
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

    export const useGraphInterfaces = (graphId: GraphId) => {
        const ctx = useContext(CTX)!;

        const selector = useCallback(() => {
            return ctx.interfaces.get()[graphId];
        }, [graphId, ctx]);

        return useSyncExternalStore(ctx.interfaces.subscribe, selector);
    };
}
