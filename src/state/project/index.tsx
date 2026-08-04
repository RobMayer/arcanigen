import { createContext, ReactNode, useMemo, useContext, useCallback, useSyncExternalStore, SetStateAction } from "react";
import { DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../definitions/betterTypes";
import { computeSubgraphDeps, computeForbiddenSockets } from "../../util/cycleDetection";
import { FastContextMember, useFastContextMember } from "../../util/hooks/useFastContext";
import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { useGraphId } from "../graphId";
import type { GraphId, XY, NodesType, LinksType, CacheType, InterfacesType, DepsType, UsersType, MetaType, InterfaceMember } from "./types";
import { nanoid } from "nanoid";
import { buildInitialCache, invalidateDownstream, rebuildDownstream } from "./cache";
import { buildInitialDeps, INITIAL_STATE } from "./storage";
import { MethodContextImpl } from "./methodContext";

export namespace Project {
    export type PendingConnection = { scope: GraphId; node: string; socket: string; side: "in" | "out"; type: SocketTypes.SocketRule; forbidden: Set<string> };

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

    type UiStateType = { [key: string]: unknown };

    type State = { [key in keyof TheType]: FastContextMember<TheType[key]> } & {
        pendingConnection: FastContextMember<PendingConnection | null>;
        uiState: FastContextMember<UiStateType>;
        mc: MethodContextImpl;
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

        const pendingConnection = useFastContextMember<PendingConnection | null>(null);
        const uiState = useFastContextMember<UiStateType>({});

        const mc = useMemo(() => new MethodContextImpl({ nodes, nodeList, links, linkList, positions, users, interfaces, cache, deps, meta }), []);

        const value = useMemo(() => ({ cache, deps, nodes, nodeList, links, linkList, positions, users, interfaces, meta, pendingConnection, uiState, mc }), [mc]);

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
            (payload: { scope: GraphId; node: string; socket: string; side: "in" | "out"; type: SocketTypes.SocketRule } | null) => {
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

    export const useMethods = () => {
        const graphId = useGraphId();
        const ctx = useContext(CTX)!;

        return useMemo(
            () => ({
                connect: (fromNode: string, toNode: string, fromSocket: string, toSocket: string, type: string) =>
                    ctx.mc.run(() => ctx.mc.connect(graphId, fromNode, toNode, fromSocket, toSocket, type)),
                removeNode: (nodeId: string) => ctx.mc.run(() => ctx.mc.removeNode(graphId, nodeId)),
                removeLinks: (...linkIds: string[]) => ctx.mc.run(() => ctx.mc.removeLinks(graphId, ...linkIds)),
                updateNodePayload: <P extends NodeDefinitions.PayloadTypeOf<NodeDefinitions.Any>>(id: ArcaneGraph.NodeId, data: Partial<P>) =>
                    ctx.mc.run(() => ctx.mc.updatePayload(graphId, id, data)),
                addNodeByType: (nodeType: NodeTypes.Any, params: Partial<NodeDefinitions.PayloadTypeOf<NodeDefinitions.Generic>>, position?: { x: number; y: number }) =>
                    ctx.mc.run(() => ctx.mc.addNodeByType(graphId, nodeType, params, position)),
                alterNode: (id: ArcaneGraph.NodeId, fn: (node: NodeDefinitions.NodeFor<NodeDefinitions.Any>) => NodeDefinitions.NodeFor<NodeDefinitions.Any>) =>
                    ctx.mc.run(() => ctx.mc.alterNode(graphId, id, fn)),
                cloneNode: (nodeId: string) => ctx.mc.run(() => ctx.mc.cloneNode(graphId, nodeId)),
                interjectNode: (linkId: string, nodeType: NodeTypes.Any, params: Partial<NodeDefinitions.PayloadTypeOf<NodeDefinitions.Generic>>, position?: { x: number; y: number }) => {
                    let result = false;
                    ctx.mc.run(() => {
                        result = ctx.mc.interjectNode(graphId, linkId, nodeType, params, position);
                    });
                    return result;
                },
            }),
            [ctx.mc, graphId],
        );
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
    export const useMC = () => useContext(CTX)!.mc;

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

                    const [{ nodes, links }] = ArcaneGraph.removeNodes(scopeGraph, customNodeId);
                    currentNodes = { ...currentNodes, [scope]: nodes };
                    currentLinks = { ...currentLinks, [scope]: links };

                    const scopePositions = { ...currentPositions[scope] };
                    delete scopePositions[customNodeId];
                    currentPositions = { ...currentPositions, [scope]: scopePositions };

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
                    return copy;
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

    export const useUiState = <T,>(key: string) => {
        const ctx = useContext(CTX)!;

        const selector = useCallback(() => ctx.uiState.get()[key], [key, ctx]);
        const set = useCallback(
            (v: T | ((p: T | undefined) => T | undefined)) => {
                const p = ctx.uiState.ref.current[key] as T | undefined;
                const n = typeof v === "function" ? (v as (p: T | undefined) => T)(p) : v;
                if (n === undefined) {
                    delete ctx.uiState.ref.current[key];
                } else {
                    ctx.uiState.ref.current[key] = n;
                }
                ctx.uiState.notify();
            },
            [ctx, key],
        );

        return [useSyncExternalStore(ctx.uiState.subscribe, selector), set] as [T | undefined, typeof set];
    };

    export type SavedProject = {
        version: number;
        nodes: NodesType;
        links: LinksType;
        positions: { [graphId: string]: { [nodeId: string]: XY } };
        users: UsersType;
        interfaces: InterfacesType;
        meta: MetaType;
        uiState?: { [key: string]: unknown };
    };

    export const useProjectIO = () => {
        const ctx = useContext(CTX)!;

        return useMemo(() => {
            const save = (): SavedProject => ({
                version: Versioning.CURRENT,
                nodes: ctx.nodes.ref.current,
                links: ctx.links.ref.current,
                positions: ctx.positions.ref.current,
                users: ctx.users.ref.current,
                interfaces: ctx.interfaces.ref.current,
                meta: ctx.meta.ref.current,
                uiState: ctx.uiState.ref.current,
            });

            const load = (raw: SavedProject) => {
                const data = Versioning.normalize(raw);
                const { nodes, links, positions, users, interfaces, meta } = data;

                const nodeList = Object.fromEntries(Object.entries(nodes).map(([gid, g]) => [gid, Object.keys(g)]));
                const linkList = Object.fromEntries(Object.entries(links).map(([gid, g]) => [gid, Object.keys(g)]));
                const cache = buildInitialCache(nodes, links, interfaces);
                const deps = buildInitialDeps(nodes, links, interfaces, users);

                ctx.nodes.ref.current = nodes;
                ctx.nodeList.ref.current = nodeList;
                ctx.links.ref.current = links;
                ctx.linkList.ref.current = linkList;
                ctx.positions.ref.current = positions;
                ctx.users.ref.current = users;
                ctx.interfaces.ref.current = interfaces;
                ctx.cache.ref.current = cache;
                ctx.deps.ref.current = deps;
                ctx.meta.ref.current = meta;
                ctx.uiState.ref.current = data.uiState ?? {};

                ctx.nodes.notify();
                ctx.nodeList.notify();
                ctx.links.notify();
                ctx.linkList.notify();
                ctx.positions.notify();
                ctx.users.notify();
                ctx.interfaces.notify();
                ctx.cache.notify();
                ctx.deps.notify();
                ctx.meta.notify();
                ctx.uiState.notify();
            };

            const importSubgraphs = (raw: SavedProject) => {
                const data = Versioning.normalize(raw);

                // Build ID mapping for non-root graphs
                const idMap = new Map<string, string>();
                for (const graphId of Object.keys(data.nodes)) {
                    if (graphId === "root") continue;
                    idMap.set(graphId, nanoid());
                }

                if (idMap.size === 0) return [];

                let currentNodes = ctx.nodes.ref.current;
                let currentLinks = ctx.links.ref.current;
                let currentPositions = ctx.positions.ref.current;
                let currentUsers = ctx.users.ref.current;
                let currentInterfaces = ctx.interfaces.ref.current;
                let currentMeta = ctx.meta.ref.current;

                for (const [oldId, newId] of idMap) {
                    // Remap custom node payload.graphId references
                    const srcNodes = data.nodes[oldId] ?? {};
                    const remappedNodes: typeof srcNodes = {};
                    for (const [nodeId, node] of Object.entries(srcNodes)) {
                        if (node.type === "custom") {
                            const payload = node.payload as { graphId?: string };
                            const mappedGraphId = payload.graphId ? (idMap.get(payload.graphId) ?? payload.graphId) : undefined;
                            remappedNodes[nodeId] = { ...node, payload: { ...node.payload, graphId: mappedGraphId } as typeof node.payload };
                        } else {
                            remappedNodes[nodeId] = node;
                        }
                    }

                    currentNodes = { ...currentNodes, [newId]: remappedNodes };
                    currentLinks = { ...currentLinks, [newId]: data.links[oldId] ?? {} };
                    currentPositions = { ...currentPositions, [newId]: data.positions[oldId] ?? {} };
                    currentInterfaces = { ...currentInterfaces, [newId]: data.interfaces[oldId] ?? [] };
                    currentMeta = { ...currentMeta, [newId]: data.meta[oldId] ?? { name: "Imported" } };
                    currentUsers = { ...currentUsers, [newId]: [] };
                }

                // Rebuild users from custom node references across all imported graphs
                for (const [, newId] of idMap) {
                    const graphNodes = currentNodes[newId] ?? {};
                    for (const [nodeId, node] of Object.entries(graphNodes)) {
                        if (node.type === "custom") {
                            const targetGraphId = (node.payload as { graphId?: string }).graphId;
                            if (targetGraphId && currentUsers[targetGraphId]) {
                                currentUsers = {
                                    ...currentUsers,
                                    [targetGraphId]: [...currentUsers[targetGraphId], { node: nodeId, scope: newId }],
                                };
                            }
                        }
                    }
                }

                // Remap uiState keys from old graph IDs to new graph IDs
                const currentUiState = { ...ctx.uiState.ref.current };
                if (data.uiState) {
                    for (const [key, val] of Object.entries(data.uiState)) {
                        let remappedKey = key;
                        for (const [oldId, newId] of idMap) {
                            remappedKey = remappedKey.replaceAll(`[${oldId}]`, `[${newId}]`);
                        }
                        currentUiState[remappedKey] = val;
                    }
                }

                // Apply state
                ctx.nodes.ref.current = currentNodes;
                ctx.links.ref.current = currentLinks;
                ctx.positions.ref.current = currentPositions;
                ctx.users.ref.current = currentUsers;
                ctx.interfaces.ref.current = currentInterfaces;
                ctx.meta.ref.current = currentMeta;
                ctx.uiState.ref.current = currentUiState;

                // Rebuild derived state
                const nodeList = Object.fromEntries(Object.entries(currentNodes).map(([gid, g]) => [gid, Object.keys(g)]));
                const linkList = Object.fromEntries(Object.entries(currentLinks).map(([gid, g]) => [gid, Object.keys(g)]));
                ctx.nodeList.ref.current = nodeList;
                ctx.linkList.ref.current = linkList;

                ctx.cache.ref.current = buildInitialCache(currentNodes, currentLinks, currentInterfaces);
                ctx.deps.ref.current = buildInitialDeps(currentNodes, currentLinks, currentInterfaces, currentUsers);

                // Notify
                ctx.nodes.notify();
                ctx.nodeList.notify();
                ctx.links.notify();
                ctx.linkList.notify();
                ctx.positions.notify();
                ctx.users.notify();
                ctx.interfaces.notify();
                ctx.cache.notify();
                ctx.deps.notify();
                ctx.meta.notify();
                ctx.uiState.notify();

                return [...idMap.values()];
            };

            const saveSubgraph = (graphId: string): SavedProject => {
                // Collect the target graph and all transitive subgraph dependencies
                const collected = new Set<string>();
                const queue = [graphId];
                while (queue.length > 0) {
                    const gid = queue.pop()!;
                    if (collected.has(gid)) continue;
                    collected.add(gid);
                    // Find custom nodes that reference other subgraphs
                    const graphNodes = ctx.nodes.ref.current[gid] ?? {};
                    for (const node of Object.values(graphNodes)) {
                        if (node.type === "custom") {
                            const target = (node.payload as { graphId?: string }).graphId;
                            if (target && !collected.has(target)) queue.push(target);
                        }
                    }
                }

                const nodes: NodesType = {};
                const links: LinksType = {};
                const positions: { [g: string]: { [n: string]: XY } } = {};
                const users: UsersType = {};
                const interfaces: InterfacesType = {};
                const meta: MetaType = {};
                for (const gid of collected) {
                    nodes[gid] = ctx.nodes.ref.current[gid] ?? {};
                    links[gid] = ctx.links.ref.current[gid] ?? {};
                    positions[gid] = ctx.positions.ref.current[gid] ?? {};
                    users[gid] = (ctx.users.ref.current[gid] ?? []).filter((u) => collected.has(u.scope));
                    interfaces[gid] = ctx.interfaces.ref.current[gid] ?? [];
                    meta[gid] = ctx.meta.ref.current[gid] ?? { name: "Untitled" };
                }
                // Filter uiState keys relevant to collected graphs
                const uiState: UiStateType = {};
                for (const [key, val] of Object.entries(ctx.uiState.ref.current)) {
                    for (const gid of collected) {
                        if (key.includes(`[${gid}]`)) {
                            uiState[key] = val;
                            break;
                        }
                    }
                }
                return { version: Versioning.CURRENT, nodes, links, positions, users, interfaces, meta, uiState };
            };

            return { save, load, importSubgraphs, saveSubgraph };
        }, [ctx]);
    };

    /* eslint-disable @typescript-eslint/no-explicit-any */
    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    export namespace Versioning {
        export const CURRENT = 4;

        export const normalize = (input: any): Project.SavedProject => {
            if (input.version === 1) {
                for (const graphId in input.nodes) {
                    for (const nodeId in input.nodes[graphId]) {
                        const node = input.nodes[graphId][nodeId];
                        if (node.type === "layers") {
                            // v2 added the "Enabled Count" output; backfill it for v1 layer nodes.
                            node.out.enabledCount = node.out.enabledCount ?? [];
                        }
                    }
                }
                input.version = 2;
            }
            if (input.version === 2) {
                for (const graphId in input.nodes) {
                    for (const nodeId in input.nodes[graphId]) {
                        const node = input.nodes[graphId][nodeId];
                        if (node.type === "stringInput") {
                            // v3 added a selectable input widget; backfill to Block (stringInputWidget.BLOCK = 2).
                            node.payload.widget = node.payload.widget ?? 2;
                            // v3 added the "Character Count" output.
                            node.out.charCount = node.out.charCount ?? [];
                        }
                        if (node.type === "textPath") {
                            // v3 added the "Character Count" output.
                            node.out.charCount = node.out.charCount ?? [];
                        }
                    }
                }
                input.version = 3;
            }
            if (input.version === 3) {
                for (const graphId in input.nodes) {
                    for (const nodeId in input.nodes[graphId]) {
                        const node = input.nodes[graphId][nodeId];
                        if (node.type === "angleIterator") {
                            // v4 added a Cyclical/Continuous continuity mode; existing iterators were implicitly Cyclical (angleContinuity.CYCLICAL = 0).
                            node.in.continuity = node.in.continuity ?? null;
                            node.payload.continuity = node.payload.continuity ?? 0;
                        }
                    }
                }
                input.version = 4;
            }
            // next version alterations go here...
            return input as Project.SavedProject;
        };
    }
}
