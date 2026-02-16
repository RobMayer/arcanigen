import { createContext, ReactNode, useMemo, useContext, useCallback, useSyncExternalStore, SetStateAction } from "react";
import { DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../definitions/betterTypes";
import { computeSubgraphDeps, computeForbiddenSockets } from "../../util/cycleDetection";
import { FastContextMember, useFastContextMember } from "../../util/hooks/useFastContext";
import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { useGraphId } from "../graphId";
import type { GraphId, XY, NodesType, LinksType, CacheType, InterfacesType, DepsType, UsersType, MetaType, InterfaceMember } from "./types";
import { invalidateDownstream, evaluateAndCacheNode, rebuildDownstream } from "./cache";
import { INITIAL_STATE } from "./storage";

export namespace Project {
    export type PendingConnection = { scope: GraphId; node: string; socket: string; side: "in" | "out"; type: SocketTypes.Kind; forbidden: Set<string> };

    type TheType = {
        nodes: NodesType;
        nodeList: { [graphId: GraphId]: ArcaneGraph.NodeId[] };
        links: LinksType;
        linkList: { [graphId: GraphId]: ArcaneGraph.LinkId[] };
        positions: { [graphId: GraphId]: { [nodeId: ArcaneGraph.NodeId]: XY } };
        users: UsersType;
        interfaces: InterfacesType;
        cache: CacheType;
        deps: DepsType;
        meta: MetaType;
    };

    type State = { [key in keyof TheType]: FastContextMember<TheType[key]> } & {
        pendingConnection: FastContextMember<PendingConnection | null>;
    };

    const CTX = createContext<State | undefined>(undefined);

    export const Provider = ({ children }: { children?: ReactNode }) => {
        const nodes = useFastContextMember<TheType["nodes"]>(INITIAL_STATE.nodes);
        const nodeList = useFastContextMember<TheType["nodeList"]>(INITIAL_STATE.nodeList);
        const links = useFastContextMember<TheType["links"]>(INITIAL_STATE.links);
        const linkList = useFastContextMember<TheType["linkList"]>(INITIAL_STATE.linkList);
        const positions = useFastContextMember<TheType["positions"]>(INITIAL_STATE.positions);
        const users = useFastContextMember<TheType["users"]>(INITIAL_STATE.users);
        const interfaces = useFastContextMember<TheType["interfaces"]>(INITIAL_STATE.interfaces);
        const cache = useFastContextMember<TheType["cache"]>(INITIAL_STATE.cache);
        const deps = useFastContextMember<TheType["deps"]>(INITIAL_STATE.deps);
        const meta = useFastContextMember<TheType["meta"]>(INITIAL_STATE.meta);

        const pendingConnection = useFastContextMember<{ node: string; socket: string; side: "in" | "out"; type: SocketTypes.Kind; scope: string; forbidden: Set<string> } | null>(null);

        const value = useMemo(() => ({ cache, deps, nodes, nodeList, links, linkList, positions, users, interfaces, meta, pendingConnection }), []);

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

    export const useLink = (id: string | null) => {
        const graphId = useGraphId();
        const ctx = useContext(CTX)!;

        const selector = useCallback(() => {
            if (id !== null) {
                return ctx.links.get()[graphId][id];
            }
            return null;
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

        const value = useSyncExternalStore(ctx.pendingConnection.subscribe, ctx.pendingConnection.get);

        const set = useCallback(
            (payload: { scope: GraphId; node: string; socket: string; side: "in" | "out"; type: SocketTypes.Kind } | null) => {
                if (payload === null) {
                    ctx.pendingConnection.ref.current = null;
                    ctx.pendingConnection.notify();
                    return null;
                }
                const graph = { nodes: ctx.nodes.ref.current[payload.scope], links: ctx.links.ref.current[payload.scope] };
                const forbidden = computeForbiddenSockets(graph, payload.node, payload.socket, payload.side, ctx.deps.ref.current);
                ctx.pendingConnection.ref.current = { ...payload, forbidden };
                ctx.pendingConnection.notify();
                return ctx.pendingConnection.ref.current;
            },
            [ctx],
        );

        return [value, set] as const;
    };

    // todo: handle the case where graphId doesn't yet exist!
    export const useMethods = () => {
        const graphId = useGraphId();
        const ctx = useContext(CTX)!;

        return useMemo(() => {
            const fireOnDisconnect = (hookState: NodeTypes.HookState, removedLinks: ArcaneGraph.Link[], gId: string, skipNodeId?: string): NodeTypes.HookState => {
                for (const link of removedLinks) {
                    // Fire for "from" endpoint (out direction)
                    if (link.fromNode !== skipNodeId) {
                        const fromNode = hookState.nodes[gId]?.[link.fromNode];
                        if (fromNode) {
                            const fromType = NodeTypes.get(fromNode.type);
                            if (fromType.onDisconnect) {
                                const onDisconnect = fromType.onDisconnect as (
                                    node: NodeDefinitions.NodeFor<NodeDefinitions.Any>,
                                    link: ArcaneGraph.Link,
                                    direction: "in" | "out",
                                    state: NodeTypes.HookState,
                                    graphId: string,
                                ) => NodeTypes.HookState;
                                hookState = onDisconnect(fromNode, link, "out", hookState, gId);
                            }
                        }
                    }
                    // Fire for "to" endpoint (in direction)
                    if (link.toNode !== skipNodeId) {
                        const toNode = hookState.nodes[gId]?.[link.toNode];
                        if (toNode) {
                            const toType = NodeTypes.get(toNode.type);
                            if (toType.onDisconnect) {
                                const onDisconnect = toType.onDisconnect as (
                                    node: NodeDefinitions.NodeFor<NodeDefinitions.Any>,
                                    link: ArcaneGraph.Link,
                                    direction: "in" | "out",
                                    state: NodeTypes.HookState,
                                    graphId: string,
                                ) => NodeTypes.HookState;
                                hookState = onDisconnect(toNode, link, "in", hookState, gId);
                            }
                        }
                    }
                }
                return hookState;
            };

            // ! Important: this assumes that 'from' and 'to' have already been normalized
            const connect = (fromNode: string, toNode: string, fromSocket: string, toSocket: string, type: DataTypes.Kind) => {
                const oldGraph = { nodes: ctx.nodes.get()[graphId], links: ctx.links.get()[graphId] };
                const [{ nodes, links }, newLink, removed] = ArcaneGraph.reconnect(oldGraph, fromNode, toNode, fromSocket, toSocket, type);
                if (newLink) {
                    let currentNodes = { ...ctx.nodes.ref.current, [graphId]: nodes };
                    let currentLinks = { ...ctx.links.ref.current, [graphId]: links };
                    let currentInterfaces = ctx.interfaces.ref.current;
                    let currentUsers = ctx.users.ref.current;

                    let hookState: NodeTypes.HookState = {
                        nodes: currentNodes,
                        links: currentLinks,
                        interfaces: currentInterfaces,
                        users: currentUsers,
                    };

                    // Fire onDisconnect for displaced links BEFORE onConnect for the new link
                    if (removed.links.length > 0) {
                        hookState = fireOnDisconnect(hookState, removed.links, graphId);
                    }

                    // Fire onConnect hooks for both endpoints
                    const fromNodeObj = hookState.nodes[graphId][fromNode];
                    const toNodeObj = hookState.nodes[graphId][toNode];
                    const fromType = NodeTypes.get(fromNodeObj.type);
                    const toType = NodeTypes.get(toNodeObj.type);

                    if (fromType.onConnect) {
                        const onConnect = fromType.onConnect as (
                            node: NodeDefinitions.NodeFor<NodeDefinitions.Any>,
                            linkId: string,
                            direction: "in" | "out",
                            state: NodeTypes.HookState,
                            graphId: string,
                        ) => NodeTypes.HookState;
                        hookState = onConnect(fromNodeObj, newLink, "out", hookState, graphId);
                    }
                    if (toType.onConnect) {
                        const onConnect = toType.onConnect as (
                            node: NodeDefinitions.NodeFor<NodeDefinitions.Any>,
                            linkId: string,
                            direction: "in" | "out",
                            state: NodeTypes.HookState,
                            graphId: string,
                        ) => NodeTypes.HookState;
                        hookState = onConnect(toNodeObj, newLink, "in", hookState, graphId);
                    }

                    currentNodes = hookState.nodes;
                    currentLinks = hookState.links;
                    currentInterfaces = hookState.interfaces;
                    currentUsers = hookState.users;

                    // Apply state
                    ctx.nodes.ref.current = currentNodes;
                    ctx.nodeList.ref.current = { ...ctx.nodeList.ref.current, [graphId]: Object.keys(currentNodes[graphId]) };
                    ctx.links.ref.current = currentLinks;
                    ctx.linkList.ref.current = { ...ctx.linkList.ref.current, [graphId]: Object.keys(currentLinks[graphId]) };
                    ctx.interfaces.ref.current = currentInterfaces;
                    ctx.users.ref.current = currentUsers;

                    ctx.nodes.notify();
                    ctx.nodeList.notify();
                    ctx.links.notify();
                    ctx.linkList.notify();
                    ctx.interfaces.notify();
                    ctx.users.notify();

                    // Ensure fromNode is cached first (it may not have been evaluated yet)
                    // Then rebuild cache for toNode and all downstream nodes
                    let newCache = evaluateAndCacheNode(ctx.cache.ref.current, ctx.nodes.ref.current, ctx.links.ref.current, ctx.interfaces.ref.current, graphId, fromNode);
                    newCache = rebuildDownstream(newCache, ctx.nodes.ref.current, ctx.links.ref.current, ctx.interfaces.ref.current, graphId, toNode);
                    ctx.cache.ref.current = newCache;
                    ctx.cache.notify();

                    // Update deps for this graph
                    const graph = { nodes: currentNodes[graphId], links: currentLinks[graphId] };
                    const newDeps = computeSubgraphDeps(graph, currentInterfaces[graphId] ?? [], ctx.deps.ref.current);
                    ctx.deps.ref.current = { ...ctx.deps.ref.current, [graphId]: newDeps };
                    ctx.deps.notify();
                }
            };

            const addNodeByType = (nodeType: NodeTypes.Any, params: Partial<NodeDefinitions.PayloadTypeOf<NodeDefinitions.Generic>>, position?: { x: number; y: number }) => {
                const newNode = nodeType.create(params as Partial<NodeDefinitions.PayloadTypeOf<NodeDefinitions.Any>>);
                const oldGraph = { nodes: ctx.nodes.get()[graphId], links: ctx.links.get()[graphId] };
                const { nodes } = ArcaneGraph.importNodes(oldGraph, [newNode]);

                // Build initial state with the new node added
                let currentNodes = { ...ctx.nodes.ref.current, [graphId]: nodes };
                let currentLinks = ctx.links.ref.current;
                let currentInterfaces = ctx.interfaces.ref.current;
                let currentUsers = ctx.users.ref.current;

                // Call onCreate hook if defined
                if (nodeType.onCreate) {
                    const hookState: NodeTypes.HookState = {
                        nodes: currentNodes,
                        links: currentLinks,
                        interfaces: currentInterfaces,
                        users: currentUsers,
                    };
                    const onCreate = nodeType.onCreate as (node: NodeDefinitions.NodeFor<NodeDefinitions.Any>, state: NodeTypes.HookState, graphId: string) => NodeTypes.HookState;
                    const newState = onCreate(newNode, hookState, graphId);
                    currentNodes = newState.nodes;
                    currentLinks = newState.links;
                    currentInterfaces = newState.interfaces;
                    currentUsers = newState.users;
                }

                ctx.nodes.ref.current = currentNodes;
                ctx.links.ref.current = currentLinks;
                // Rebuild nodeList/linkList for all graphs that may have been affected by the hook
                const newNodeList = { ...ctx.nodeList.ref.current };
                const newLinkList = { ...ctx.linkList.ref.current };
                for (const gId of Object.keys(currentNodes)) {
                    newNodeList[gId] = Object.keys(currentNodes[gId]);
                }
                for (const gId of Object.keys(currentLinks)) {
                    newLinkList[gId] = Object.keys(currentLinks[gId]);
                }
                ctx.nodeList.ref.current = newNodeList;
                ctx.linkList.ref.current = newLinkList;
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
                ctx.links.notify();
                ctx.linkList.notify();
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

                // Call onPayloadChange hook if defined — may modify nodes/links in other graphs
                const node = ctx.nodes.ref.current[graphId][id];
                const nodeType = NodeTypes.get(node.type);
                let hookRan = false;
                if (nodeType.onPayloadChange) {
                    const hookState: NodeTypes.HookState = {
                        nodes: ctx.nodes.ref.current,
                        links: ctx.links.ref.current,
                        interfaces: ctx.interfaces.ref.current,
                        users: ctx.users.ref.current,
                    };
                    const onPayloadChange = nodeType.onPayloadChange as (node: NodeDefinitions.NodeFor<NodeDefinitions.Any>, prev: Record<string, unknown>, state: NodeTypes.HookState, graphId: string) => NodeTypes.HookState | null;
                    const newState = onPayloadChange(node, prev as Record<string, unknown>, hookState, graphId);
                    if (newState) {
                        hookRan = true;
                        ctx.nodes.ref.current = newState.nodes;
                        ctx.links.ref.current = newState.links;
                        ctx.interfaces.ref.current = newState.interfaces;
                        ctx.users.ref.current = newState.users;

                        // Rebuild nodeList/linkList for all graphs that may have been affected
                        const newNodeList = { ...ctx.nodeList.ref.current };
                        const newLinkList = { ...ctx.linkList.ref.current };
                        for (const gId of Object.keys(newState.nodes)) {
                            newNodeList[gId] = Object.keys(newState.nodes[gId]);
                        }
                        for (const gId of Object.keys(newState.links)) {
                            newLinkList[gId] = Object.keys(newState.links[gId]);
                        }
                        ctx.nodeList.ref.current = newNodeList;
                        ctx.linkList.ref.current = newLinkList;
                    }
                }

                // Rebuild cache for this node and all downstream nodes
                ctx.cache.ref.current = rebuildDownstream(ctx.cache.ref.current, ctx.nodes.ref.current, ctx.links.ref.current, ctx.interfaces.ref.current, graphId, id);

                // If hook ran, also rebuild cache for Custom nodes in parent graphs
                if (hookRan) {
                    const usersOfGraph = ctx.users.ref.current[graphId] ?? [];
                    for (const { node: customNodeId, scope } of usersOfGraph) {
                        ctx.cache.ref.current = rebuildDownstream(ctx.cache.ref.current, ctx.nodes.ref.current, ctx.links.ref.current, ctx.interfaces.ref.current, scope, customNodeId);
                    }
                }

                ctx.nodes.notify();
                ctx.cache.notify();
                if (hookRan) {
                    ctx.links.notify();
                    ctx.linkList.notify();
                    ctx.nodeList.notify();
                    ctx.interfaces.notify();
                    ctx.users.notify();
                }
            };

            const removeNode = (nodeId: string) => {
                const oldGraph = { nodes: ctx.nodes.ref.current[graphId], links: ctx.links.ref.current[graphId] };
                const node = oldGraph.nodes[nodeId];
                if (!node) return;

                // Call onDelete hook if defined — hooks may modify nodes/links in OTHER graphs
                let currentNodes = ctx.nodes.ref.current;
                let currentLinks = ctx.links.ref.current;
                let currentInterfaces = ctx.interfaces.ref.current;
                let currentUsers = ctx.users.ref.current;

                const nodeType = NodeTypes.get(node.type);
                if (nodeType.onDelete) {
                    const hookState: NodeTypes.HookState = {
                        nodes: currentNodes,
                        links: currentLinks,
                        interfaces: currentInterfaces,
                        users: currentUsers,
                    };
                    const onDelete = nodeType.onDelete as (node: NodeDefinitions.NodeFor<NodeDefinitions.Any>, state: NodeTypes.HookState, graphId: string) => NodeTypes.HookState;
                    const newState = onDelete(node, hookState, graphId);
                    currentNodes = newState.nodes;
                    currentLinks = newState.links;
                    currentInterfaces = newState.interfaces;
                    currentUsers = newState.users;
                }

                // Find downstream nodes BEFORE removing (they'll need cache rebuild)
                const downstream = ArcaneGraph.wideDownstreamOf(oldGraph, nodeId);

                // Remove node from the current graph (use hook-updated state for this graph)
                const currentGraphState = { nodes: currentNodes[graphId], links: currentLinks[graphId] };
                const [{ nodes, links }, removedFromDelete] = ArcaneGraph.removeNodes(currentGraphState, nodeId);

                const positions = { ...ctx.positions.ref.current[graphId] };
                delete positions[nodeId];

                // Apply: merge current-graph removal with any cross-graph hook changes
                currentNodes = { ...currentNodes, [graphId]: nodes };
                currentLinks = { ...currentLinks, [graphId]: links };

                // Fire onDisconnect on surviving endpoints (skip the deleted node)
                if (removedFromDelete.links.length > 0) {
                    let hookState: NodeTypes.HookState = {
                        nodes: currentNodes,
                        links: currentLinks,
                        interfaces: currentInterfaces,
                        users: currentUsers,
                    };
                    hookState = fireOnDisconnect(hookState, removedFromDelete.links, graphId, nodeId);
                    currentNodes = hookState.nodes;
                    currentLinks = hookState.links;
                    currentInterfaces = hookState.interfaces;
                    currentUsers = hookState.users;
                }

                ctx.nodes.ref.current = currentNodes;
                ctx.links.ref.current = currentLinks;
                // Rebuild nodeList/linkList for all graphs that may have been affected
                const newNodeList = { ...ctx.nodeList.ref.current };
                const newLinkList = { ...ctx.linkList.ref.current };
                for (const gId of Object.keys(currentNodes)) {
                    newNodeList[gId] = Object.keys(currentNodes[gId]);
                }
                for (const gId of Object.keys(currentLinks)) {
                    newLinkList[gId] = Object.keys(currentLinks[gId]);
                }
                ctx.nodeList.ref.current = newNodeList;
                ctx.linkList.ref.current = newLinkList;
                ctx.positions.ref.current = { ...ctx.positions.ref.current, [graphId]: positions };
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

                // Rebuild cache for Custom nodes in parent graphs that reference this subgraph
                const usersOfGraph = currentUsers[graphId] ?? [];
                for (const { node: customNodeId, scope } of usersOfGraph) {
                    newCache = rebuildDownstream(newCache, ctx.nodes.ref.current, ctx.links.ref.current, ctx.interfaces.ref.current, scope, customNodeId);
                }
                ctx.cache.ref.current = newCache;

                // Rebuild deps for the current graph (interfaces may have changed)
                const graphForDeps = { nodes: currentNodes[graphId], links: currentLinks[graphId] };
                ctx.deps.ref.current = { ...ctx.deps.ref.current, [graphId]: computeSubgraphDeps(graphForDeps, currentInterfaces[graphId] ?? [], ctx.deps.ref.current) };

                ctx.nodes.notify();
                ctx.nodeList.notify();
                ctx.positions.notify();
                ctx.links.notify();
                ctx.linkList.notify();
                ctx.cache.notify();
                ctx.deps.notify();
                ctx.interfaces.notify();
                ctx.users.notify();
            };

            const removeLinks = (...linkIds: string[]) => {
                const oldGraph = { nodes: ctx.nodes.ref.current[graphId], links: ctx.links.ref.current[graphId] };
                const [{ nodes, links }, removed] = ArcaneGraph.removeLinks(oldGraph, linkIds);
                if (removed.links.length === 0) return;

                // Fire onDisconnect hooks
                let currentNodes = nodes;
                let currentLinks = links;
                let currentInterfaces = ctx.interfaces.ref.current;
                let currentUsers = ctx.users.ref.current;

                let hookState: NodeTypes.HookState = {
                    nodes: { ...ctx.nodes.ref.current, [graphId]: nodes },
                    links: { ...ctx.links.ref.current, [graphId]: links },
                    interfaces: currentInterfaces,
                    users: currentUsers,
                };
                hookState = fireOnDisconnect(hookState, removed.links, graphId);
                currentNodes = hookState.nodes[graphId];
                currentLinks = hookState.links[graphId];
                currentInterfaces = hookState.interfaces;
                currentUsers = hookState.users;

                // Find affected toNodes for cache rebuild
                const affectedNodes = new Set(removed.links.map((l) => l.toNode));

                ctx.nodes.ref.current = { ...hookState.nodes, [graphId]: currentNodes };
                ctx.nodeList.ref.current = { ...ctx.nodeList.ref.current, [graphId]: Object.keys(currentNodes) };
                ctx.links.ref.current = { ...hookState.links, [graphId]: currentLinks };
                ctx.linkList.ref.current = { ...ctx.linkList.ref.current, [graphId]: Object.keys(currentLinks) };
                ctx.interfaces.ref.current = currentInterfaces;
                ctx.users.ref.current = currentUsers;

                let newCache = ctx.cache.ref.current;
                for (const nodeId of affectedNodes) {
                    if (currentNodes[nodeId]) {
                        newCache = rebuildDownstream(newCache, ctx.nodes.ref.current, ctx.links.ref.current, ctx.interfaces.ref.current, graphId, nodeId);
                    }
                }
                ctx.cache.ref.current = newCache;

                // Update deps for this graph
                const graph = { nodes: currentNodes, links: currentLinks };
                const newDeps = computeSubgraphDeps(graph, ctx.interfaces.ref.current[graphId] ?? [], ctx.deps.ref.current);
                ctx.deps.ref.current = { ...ctx.deps.ref.current, [graphId]: newDeps };

                ctx.nodes.notify();
                ctx.nodeList.notify();
                ctx.links.notify();
                ctx.linkList.notify();
                ctx.cache.notify();
                ctx.deps.notify();
                ctx.interfaces.notify();
                ctx.users.notify();
            };

            const alterNode = (id: ArcaneGraph.NodeId, fn: (node: NodeDefinitions.NodeFor<NodeDefinitions.Any>) => NodeDefinitions.NodeFor<NodeDefinitions.Any>) => {
                const node = ctx.nodes.ref.current[graphId][id];
                if (!node) return;
                const updated = fn(node);

                ctx.nodes.ref.current = {
                    ...ctx.nodes.ref.current,
                    [graphId]: { ...ctx.nodes.ref.current[graphId], [id]: updated },
                };

                ctx.cache.ref.current = rebuildDownstream(ctx.cache.ref.current, ctx.nodes.ref.current, ctx.links.ref.current, ctx.interfaces.ref.current, graphId, id);

                ctx.nodes.notify();
                ctx.cache.notify();
            };

            return { connect, removeNode, updateNodePayload, addNodeByType, removeLinks, alterNode };
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

    export const useMeta = () => {
        const ctx = useContext(CTX)!;
        return useSyncExternalStore(ctx.meta.subscribe, ctx.meta.get);
    };

    export const useUsers = () => {
        const ctx = useContext(CTX)!;
        return useSyncExternalStore(ctx.users.subscribe, ctx.users.get);
    };

    export const useSubgraphMethods = () => {
        const ctx = useContext(CTX)!;

        return useMemo(() => {
            const create = (graphId: string, name: string) => {
                ctx.nodes.ref.current = { ...ctx.nodes.ref.current, [graphId]: {} };
                ctx.nodeList.ref.current = { ...ctx.nodeList.ref.current, [graphId]: [] };
                ctx.links.ref.current = { ...ctx.links.ref.current, [graphId]: {} };
                ctx.linkList.ref.current = { ...ctx.linkList.ref.current, [graphId]: [] };
                ctx.positions.ref.current = { ...ctx.positions.ref.current, [graphId]: {} };
                ctx.users.ref.current = { ...ctx.users.ref.current, [graphId]: [] };
                ctx.interfaces.ref.current = { ...ctx.interfaces.ref.current, [graphId]: [] };
                ctx.cache.ref.current = { ...ctx.cache.ref.current, [graphId]: {} };
                ctx.meta.ref.current = { ...ctx.meta.ref.current, [graphId]: { name } };

                ctx.nodes.notify();
                ctx.nodeList.notify();
                ctx.links.notify();
                ctx.linkList.notify();
                ctx.positions.notify();
                ctx.users.notify();
                ctx.interfaces.notify();
                ctx.cache.notify();
                ctx.meta.notify();
            };

            const rename = (graphId: string, name: string) => {
                ctx.meta.ref.current = { ...ctx.meta.ref.current, [graphId]: { ...ctx.meta.ref.current[graphId], name } };
                ctx.meta.notify();
            };

            const alterInterface = (graphId: string, fn: (members: InterfaceMember[]) => InterfaceMember[]) => {
                const prev = ctx.interfaces.ref.current[graphId] ?? [];
                const next = fn(prev);
                if (next !== prev) {
                    ctx.interfaces.ref.current = { ...ctx.interfaces.ref.current, [graphId]: next };
                    ctx.interfaces.notify();
                }
            };

            const remove = (graphId: string) => {
                let currentNodes = ctx.nodes.ref.current;
                let currentLinks = ctx.links.ref.current;
                let currentInterfaces = ctx.interfaces.ref.current;
                let currentUsers = ctx.users.ref.current;
                let currentPositions = ctx.positions.ref.current;
                let currentCache = ctx.cache.ref.current;

                // Step 1: Remove all Custom nodes in other graphs that reference this subgraph
                const usersOfGraph = currentUsers[graphId] ?? [];
                const affectedScopes = new Set<string>();
                const downstreamByScope: Record<string, Set<string>> = {};

                for (const { node: customNodeId, scope } of usersOfGraph) {
                    affectedScopes.add(scope);
                    const scopeGraph = { nodes: currentNodes[scope], links: currentLinks[scope] };

                    // Find downstream nodes before removal (they'll need cache rebuild)
                    const downstream = ArcaneGraph.wideDownstreamOf(scopeGraph, customNodeId);
                    if (!downstreamByScope[scope]) downstreamByScope[scope] = new Set();
                    for (const d of downstream) downstreamByScope[scope].add(d);

                    // Remove the Custom node and its links
                    const [{ nodes, links }] = ArcaneGraph.removeNodes(scopeGraph, customNodeId);
                    currentNodes = { ...currentNodes, [scope]: nodes };
                    currentLinks = { ...currentLinks, [scope]: links };

                    // Remove position
                    const scopePositions = { ...currentPositions[scope] };
                    delete scopePositions[customNodeId];
                    currentPositions = { ...currentPositions, [scope]: scopePositions };

                    // Invalidate cache for the removed node
                    currentCache = invalidateDownstream(currentCache, currentNodes, currentLinks, scope, customNodeId);
                }

                // Rebuild cache for downstream nodes in affected scopes
                for (const scope of affectedScopes) {
                    for (const downstreamId of downstreamByScope[scope] ?? []) {
                        if (currentNodes[scope]?.[downstreamId]) {
                            currentCache = rebuildDownstream(currentCache, currentNodes, currentLinks, currentInterfaces, scope, downstreamId);
                        }
                    }
                }

                // Step 2: Clean up `users` entries for other subgraphs referenced by Custom nodes INSIDE the deleted graph
                const nodesInGraph = currentNodes[graphId] ?? {};
                for (const nodeId of Object.keys(nodesInGraph)) {
                    const node = nodesInGraph[nodeId];
                    if (node.type === "custom") {
                        const targetGraphId = (node.payload as { graphId?: string }).graphId;
                        if (targetGraphId && currentUsers[targetGraphId]) {
                            currentUsers = {
                                ...currentUsers,
                                [targetGraphId]: currentUsers[targetGraphId].filter((u) => !(u.node === nodeId && u.scope === graphId)),
                            };
                        }
                    }
                }

                // Step 3: Delete all state entries for the deleted graphId
                const omit = <T extends Record<string, unknown>>(obj: T, key: string): T => {
                    const copy = { ...obj };
                    delete copy[key];
                    return copy as T;
                };

                currentNodes = omit(currentNodes, graphId);
                currentLinks = omit(currentLinks, graphId);
                currentInterfaces = omit(currentInterfaces, graphId);
                currentUsers = omit(currentUsers, graphId);
                currentPositions = omit(currentPositions, graphId);
                currentCache = omit(currentCache, graphId);

                // Apply all state
                ctx.nodes.ref.current = currentNodes;
                ctx.links.ref.current = currentLinks;
                ctx.interfaces.ref.current = currentInterfaces;
                ctx.users.ref.current = currentUsers;
                ctx.positions.ref.current = currentPositions;
                ctx.cache.ref.current = currentCache;

                // Rebuild nodeList/linkList: delete the graph's entries and rebuild affected scopes
                const newNodeList = { ...ctx.nodeList.ref.current };
                const newLinkList = { ...ctx.linkList.ref.current };
                delete newNodeList[graphId];
                delete newLinkList[graphId];
                for (const scope of affectedScopes) {
                    newNodeList[scope] = Object.keys(currentNodes[scope] ?? {});
                    newLinkList[scope] = Object.keys(currentLinks[scope] ?? {});
                }
                ctx.nodeList.ref.current = newNodeList;
                ctx.linkList.ref.current = newLinkList;

                // Delete meta and deps
                const newMeta = { ...ctx.meta.ref.current };
                delete newMeta[graphId];
                ctx.meta.ref.current = newMeta;

                const newDeps = { ...ctx.deps.ref.current };
                delete newDeps[graphId];
                // Rebuild deps for affected scopes (they lost a Custom node)
                for (const scope of affectedScopes) {
                    const scopeGraph = { nodes: currentNodes[scope], links: currentLinks[scope] };
                    newDeps[scope] = computeSubgraphDeps(scopeGraph, currentInterfaces[scope] ?? [], newDeps);
                }
                ctx.deps.ref.current = newDeps;

                // Notify all slices
                ctx.nodes.notify();
                ctx.nodeList.notify();
                ctx.links.notify();
                ctx.linkList.notify();
                ctx.positions.notify();
                ctx.interfaces.notify();
                ctx.users.notify();
                ctx.cache.notify();
                ctx.meta.notify();
                ctx.deps.notify();
            };

            return { create, rename, remove, alterInterface };
        }, [ctx]);
    };
}
