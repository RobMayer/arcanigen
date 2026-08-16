import { createContext, ReactNode, useMemo, useContext, useCallback, useSyncExternalStore, SetStateAction } from "react";
import { NodeDefinitions, NodeTypes } from "../../definitions/nodeTypes";
import { DataTypes } from "../../definitions/dataTypes";
import { SocketTypes } from "../../definitions/socketTypes";
import { computeSubgraphDeps, computeForbiddenSockets } from "../../util/cycleDetection";
import { FastContextMember, useFastContextMember } from "../../util/hooks/useFastContext";
import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { useGraphId } from "../graphId";
import type { GraphId, XY, NodesType, LinksType, CacheType, InterfacesType, DepsType, UsersType, MetaType, SubgraphMeta, InterfaceMember, SocketTypeCacheType } from "./types";
import { makeSubgraphMeta } from "./types";
import { nanoid } from "nanoid";
import { buildInitialCache, invalidateDownstream, rebuildDownstream } from "./cache";
import { buildInitialDeps, INITIAL_STATE } from "./storage";
import { MethodContextImpl } from "./methodContext";

export namespace Project {
    export type PendingConnection = { scope: GraphId; node: string; socket: string; side: "in" | "out"; type: SocketTypes.Term; forbidden: Set<string> };

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
        socketTypes: SocketTypeCacheType;
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
        const socketTypes = useFastContextMember<TheType["socketTypes"]>(INITIAL_STATE.socketTypes);

        const pendingConnection = useFastContextMember<PendingConnection | null>(null);
        const uiState = useFastContextMember<UiStateType>({});

        const mc = useMemo(() => new MethodContextImpl({ nodes, nodeList, links, linkList, positions, users, interfaces, cache, deps, meta, socketTypes }), []);

        const value = useMemo(() => ({ cache, deps, nodes, nodeList, links, linkList, positions, users, interfaces, meta, socketTypes, pendingConnection, uiState, mc }), [mc]);

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

    /**
     * Reactive socket type for rendering. Subscribes to the transient socket-type cache so the socket
     * re-renders when its solved type changes; `getSocketType` returns the stored rule (or the signature
     * default / a hand-rolled node's own answer). The subscription selects the *stored* rule — a stable
     * reference only replaced on recompute — so unchanged sockets don't re-render on every cache write.
     */
    export const useSocketType = (graphId: GraphId, node: NodeDefinitions.NodeFor<NodeDefinitions.Any> | undefined, socketId: string, side: "in" | "out"): SocketTypes.Term => {
        const ctx = useContext(CTX)!;
        const nodeId = node?.id;
        const selector = useCallback(() => (nodeId ? ctx.socketTypes.get()[graphId]?.[nodeId]?.[side]?.[socketId] : undefined), [ctx, graphId, nodeId, side, socketId]);
        const stored = useSyncExternalStore(ctx.socketTypes.subscribe, selector);
        return useMemo(() => (node ? NodeTypes.getSocketType(node, socketId, side, graphId, ctx.mc) : SocketTypes.NONE), [node, socketId, side, graphId, ctx.mc, stored]);
    };

    /**
     * The single kind a wire is carrying, computed on demand from its two endpoints' solved socket
     * types (never stored). Subscribes to the socketTypes store for the change signal, but reads the
     * endpoint nodes non-reactively via mc.getNode, so endpoint payload edits (e.g. dragging a radius)
     * don't re-render the wire. Returning the kind string straight from getSnapshot lets
     * useSyncExternalStore bail on Object.is-equal, so an unrelated re-solve elsewhere only re-renders
     * this wire when its own carried kind actually changes.
     */
    export const useLinkType = (graphId: GraphId, link: ArcaneGraph.Link | null): string => {
        const ctx = useContext(CTX)!;
        const getSnapshot = useCallback(() => {
            if (!link) return "";
            const from = ctx.mc.getNode(graphId, link.fromNode);
            const to = ctx.mc.getNode(graphId, link.toNode);
            if (!from || !to) return "";
            const outType = NodeTypes.getSocketType(from, link.fromSocket, "out", graphId, ctx.mc);
            const inType = NodeTypes.getSocketType(to, link.toSocket, "in", graphId, ctx.mc);
            return SocketTypes.linkRepresentation(outType, inType);
        }, [ctx, graphId, link]);
        return useSyncExternalStore(ctx.socketTypes.subscribe, getSnapshot);
    };

    /**
     * The `Term` the UPSTREAM output socket is sending into `node`'s input `inSocket` -- the type-analogue of
     * `useCachedInput` (which gives the value). Reads the producer's socket type DIRECTLY (never the reading
     * node's own socket, and no blend), so a node asking "what am I receiving?" gets an honest source of
     * truth. Null when the input is unconnected. Inspect it with `SocketTypes.project`/`subsumes`.
     */
    export const useInboundType = <D extends NodeDefinitions.Generic>(graphId: GraphId, { id: nodeId }: NodeDefinitions.NodeFor<D>, inSocket: string): SocketTypes.Term | null => {
        const ctx = useContext(CTX)!;
        const lookup = useCallback((): SocketTypes.Term | null => {
            const node = ctx.nodes.ref.current[graphId]?.[nodeId];
            const linkId = node?.in[inSocket];
            if (!linkId) return null;
            const link = ctx.links.ref.current[graphId]?.[linkId];
            if (!link) return null;
            const from = ctx.mc.getNode(graphId, link.fromNode);
            if (!from) return null;
            return NodeTypes.getSocketType(from, link.fromSocket, "out", graphId, ctx.mc);
        }, [ctx, graphId, nodeId, inSocket]);
        // getSocketType can hand back a FRESH Term ref on its fallback path (hand-rolled getSocketTypes build
        // one per call), so subscribing on the Term itself would tear/loop. Subscribe on a stable serialized
        // KEY (never parsed back), and reconstruct a ref-stable Term from the real lookup, keyed by it.
        const key = useSyncExternalStore(ctx.socketTypes.subscribe, () => {
            const t = lookup();
            return t ? SocketTypes.serialize(t) : "";
        });
        return useMemo(() => (key === "" ? null : lookup()), [key, lookup]);
    };

    export const usePendingConnection = () => {
        const ctx = useContext(CTX)!;

        const value = useSyncExternalStore(ctx.pendingConnection.subscribe, ctx.pendingConnection.get);

        const set = useCallback(
            (payload: { scope: GraphId; node: string; socket: string; side: "in" | "out"; type: SocketTypes.Term } | null) => {
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
                connect: (fromNode: string, toNode: string, fromSocket: string, toSocket: string) => ctx.mc.run(() => ctx.mc.connect(graphId, fromNode, toNode, fromSocket, toSocket)),
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

    export const useGraphMeta = (graphId: GraphId) => {
        const ctx = useContext(CTX)!;

        const selector = useCallback(() => {
            return ctx.meta.get()[graphId];
        }, [graphId, ctx]);

        return useSyncExternalStore(ctx.meta.subscribe, selector);
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
                ctx.meta.ref.current = { ...ctx.meta.ref.current, [graphId]: makeSubgraphMeta(name) };

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

            const setMeta = (graphId: string, patch: Partial<SubgraphMeta>) => {
                const prev = ctx.meta.ref.current[graphId];
                if (!prev) return;
                ctx.meta.ref.current = { ...ctx.meta.ref.current, [graphId]: { ...prev, ...patch } };
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

            return { create, rename, setMeta, remove, alterInterface };
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
                ctx.socketTypes.ref.current = {}; // transient/derived — engine repopulates lazily on first solve
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
                ctx.socketTypes.notify();
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
                    currentMeta = { ...currentMeta, [newId]: data.meta[oldId] ?? makeSubgraphMeta("Imported") };
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
                    meta[gid] = ctx.meta.ref.current[gid] ?? makeSubgraphMeta("Untitled");
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
        export const CURRENT = 12;

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
                            node.payload.widget = node.payload.widget ?? 2;
                            node.out.charCount = node.out.charCount ?? [];
                        }
                        if (node.type === "textPath") {
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
                            node.in.continuity = node.in.continuity ?? null;
                            node.payload.continuity = node.payload.continuity ?? 0;
                        }
                    }
                }
                input.version = 4;
            }
            if (input.version === 4) {
                for (const graphId in input.nodes) {
                    for (const nodeId in input.nodes[graphId]) {
                        const node = input.nodes[graphId][nodeId];
                        switch (node.type) {
                            case "repetitionArray":
                                input.nodes[graphId][nodeId].type = "repeatedLayout";
                                break;
                            case "polygonArray":
                                input.nodes[graphId][nodeId].type = "polygonLayout";
                                break;
                            case "radialArray":
                                input.nodes[graphId][nodeId].type = "radialLayout";
                                break;
                            case "pathArray":
                                input.nodes[graphId][nodeId].type = "pathLayout";
                                break;
                        }
                        if (node.type === "layers") {
                            node.out.layerArray = node.out.layerArray ?? [];
                        }
                        if (node.type === "pathCombine") {
                            node.out.pathOpArray = node.out.pathOpArray ?? [];
                        }
                    }
                }
                // Subgraph meta gained flavour/category/icon (custom-node appearance in the drawer).
                for (const graphId in input.meta) {
                    const m = input.meta[graphId];
                    m.flavour = m.flavour ?? "info";
                    m.category = m.category ?? "Custom";
                    m.icon = m.icon ?? "default";
                }
                input.version = 5;
            }
            if (input.version === 5) {
                // Glyph dropped its DPI socket/payload; the viewBox is now used as-authored.
                for (const graphId in input.nodes) {
                    for (const nodeId in input.nodes[graphId]) {
                        const node = input.nodes[graphId][nodeId];
                        if (node.type === "glyph") {
                            const theLink = node.in.dpi;
                            if (theLink) {
                                const link = input.links?.[graphId]?.[theLink];
                                if (link) {
                                    const outArr = input.nodes[graphId][link.fromNode]?.out?.[link.fromSocket];
                                    if (outArr) {
                                        input.nodes[graphId][link.fromNode].out[link.fromSocket] = outArr.filter((lid: string) => lid !== theLink);
                                    }
                                    delete input.links[graphId][theLink];
                                }
                            }
                            delete node.in.dpi;
                            delete node.payload.dpi;
                        }
                    }
                }
                input.version = 6;
            }
            if (input.version === 6) {
                // Glyph's string path-data input was renamed "path" -> "pathData" to free the "path"
                // socket id for the node's new geometry (path) output.
                for (const graphId in input.nodes) {
                    for (const nodeId in input.nodes[graphId]) {
                        const node = input.nodes[graphId][nodeId];
                        if (node.type === "glyph") {
                            if ("path" in node.payload) {
                                node.payload.pathData = node.payload.path;
                                delete node.payload.path;
                            }
                            const theLink = node.in.path;
                            node.in.pathData = theLink ?? null;
                            delete node.in.path;
                            if (theLink) {
                                const link = input.links?.[graphId]?.[theLink];
                                if (link) {
                                    link.toSocket = "pathData";
                                }
                            }
                        }
                    }
                }
                input.version = 7;
            }
            if (input.version === 7) {
                const STALE_TYPE_FIELDS = [
                    "connectedType",
                    "connectedTypeA",
                    "connectedTypeB",
                    "connectedTypeInput",
                    "connectedTypeMin",
                    "connectedTypeMax",
                    "connectedTypeValue",
                    "connectedTypeTarget",
                    "connectedTypeTolerance",
                    "resolvedInTypes",
                    "resolvedOutTypes",
                    "connectedKind",
                ];

                const NEW_PAYLOAD_FIELDS: { [key: string]: any } = {
                    add: { a: "0", b: "0" },
                    subtract: { a: "0", b: "0" },
                    min: { a: "0", b: "0" },
                    max: { a: "0", b: "0" },
                    multiply: { a: "1", b: "1" },
                    divide: { a: "1", b: "1" },
                    modulo: { a: "0", b: "1" },
                    remainder: { a: "0", b: "1" },
                    clamp: { input: "0", min: "0", max: "1" },
                    lerp: { a: "0", b: "1" },
                    abs: { input: "0" },
                    negate: { input: "0" },
                    reciprocal: { input: "1" },
                    pow: { input: "2" },
                    root: { input: "4" },
                    round: { input: "0" },
                };

                // Angle datatype became unit-suffixed (`"45deg"` instead of bare `"45"`). Backfill "deg" onto
                // every persisted angle payload field. Canonical unit is degrees, so pre-migration bare numbers
                // ARE degrees. XFORM = the shared transform-prefab angle fields present on every shape.
                const XFORM = ["positionTheta", "rotation"];
                const ANGLE_PAYLOAD_FIELDS: { [key: string]: string[] } = {
                    transform: ["positionTheta", "preRotation", "postRotation", "skewX", "skewY"],
                    circle: XFORM,
                    rectangle: XFORM,
                    ring: XFORM,
                    polyring: XFORM,
                    polygon: XFORM,
                    polygram: XFORM,
                    knot: XFORM,
                    star: XFORM,
                    glyph: XFORM,
                    fromPath: XFORM,
                    spirograph: XFORM,
                    spiroring: XFORM,
                    repeatedLayout: XFORM,
                    arc: [...XFORM, "thetaStart", "sweep", "thetaFrom", "thetaTo"],
                    burst: [...XFORM, "thetaStart", "sweep", "thetaFrom", "thetaTo"],
                    spiral: [...XFORM, "thetaStart", "sweep", "thetaFrom", "thetaTo"],
                    line: [...XFORM, "startTheta", "endTheta"],
                    text: [...XFORM, "letterRotation"],
                    textPath: ["rotation"],
                    alongPath: ["memberRotation"],
                    pathLayout: ["memberRotation"],
                    polygonLayout: [...XFORM, "memberRotation"],
                    radialLayout: [...XFORM, "thetaStart", "sweep", "thetaFrom", "thetaTo", "memberRotation"],
                    point: ["theta"],
                    glowEffect: ["offsetTheta"],
                    linearGradient: ["angle", "startTheta", "endTheta"],
                    radialGradient: ["centerTheta", "startOffsetTheta"],
                    colorJoin: ["hsv_h", "hsl_h", "hwk_h", "hsi_h", "hcy_h", "cielch_h", "oklch_h"],
                    angle: ["value"],
                    angleInput: ["initialValue", "min", "max", "step", "snap"],
                    angleStop: ["value"],
                };
                // Types that hold their angle values inside an array of entries.
                const ANGLE_STOP_ARRAYS: { [key: string]: { array: string; field: string } } = {
                    angleStopArray: { array: "stops", field: "value" },
                    angleIterator2: { array: "stops", field: "value" },
                    angleIterator: { array: "stops", field: "value" },
                    pointArray: { array: "points", field: "theta" },
                };
                const appendDeg = (v: any): any => {
                    if (typeof v === "number") return `${v}deg`;
                    if (typeof v === "string" && /^[+-]?\d*\.?\d+$/.test(v)) return `${v}deg`;
                    return v;
                };

                for (const graphId in input.nodes) {
                    for (const nodeId in input.nodes[graphId]) {
                        const payload = input.nodes[graphId][nodeId].payload;
                        const type = input.nodes[graphId][nodeId].type;
                        if (!payload || !type) continue;

                        for (const field of STALE_TYPE_FIELDS) delete payload[field];
                        // special case for "pairs" (patchNode)
                        if (Array.isArray(payload.pairs)) {
                            for (const pair of payload.pairs) {
                                delete pair.connectedType;
                                delete pair.resolvedInTypes;
                            }
                        }

                        // add new fields
                        const merged = {
                            ...NEW_PAYLOAD_FIELDS[type],
                            ...input.nodes[graphId][nodeId].payload,
                        };
                        input.nodes[graphId][nodeId].payload = merged;

                        // backfill "deg" onto angle payload values
                        for (const field of ANGLE_PAYLOAD_FIELDS[type] ?? []) {
                            if (field in merged) merged[field] = appendDeg(merged[field]);
                        }
                        const stopSpec = ANGLE_STOP_ARRAYS[type];
                        if (stopSpec && Array.isArray(merged[stopSpec.array])) {
                            for (const entry of merged[stopSpec.array]) {
                                if (entry && typeof entry === "object") entry[stopSpec.field] = appendDeg(entry[stopSpec.field]);
                            }
                        }

                        // A custom (subgraph) node stores each interface INPUT's value under `value_<interfaceNodeId>`.
                        // Backfill "deg" onto those too, but ONLY where the interface node is an angleInput -- look
                        // its type up in the node's own subgraph (payload.graphId) so other input kinds are untouched.
                        if (type === "custom") {
                            const subGraphId = merged.graphId as string | undefined;
                            const subGraph = subGraphId ? input.nodes[subGraphId] : undefined;
                            if (subGraph) {
                                for (const key of Object.keys(merged)) {
                                    if (!key.startsWith("value_")) continue;
                                    const interfaceId = key.slice("value_".length);
                                    if (subGraph[interfaceId]?.type === "angleInput") merged[key] = appendDeg(merged[key]);
                                }
                            }
                        }
                    }
                }
                // Link type is now computed live from its endpoints' solved types, never stored.
                for (const graphId in input.links) {
                    for (const linkId in input.links[graphId]) {
                        delete input.links[graphId][linkId].type;
                    }
                }
                input.version = 8;
            }
            if (input.version === 8) {
                // Position slices (the {Mode,X,Y,Radius,Theta} authoring cluster) collapse to a single
                // `point` input socket per slice. Nodes that had NO wired sub-socket just swap the socket
                // signature; nodes with ANY wired sub-socket get a Point node injected upstream (the wire
                // can't fold into a payload), reproducing the old inline resolve. Table-driven so each
                // converted node type is added here in lockstep with its def change.
                const SLICE_SUFFIXES = ["Mode", "X", "Y", "Radius", "Theta"];
                // Every node that carries the shared TransformPrefab `position` slice, plus the standalone
                // transform. Each converted node type is listed here in lockstep with its def change; a type
                // absent from this table keeps its old sockets untouched.
                const POSITION_ONLY = [{ prefix: "position", pointSocket: "position" }];
                const POSITION_SLICES: { [type: string]: { prefix: string; pointSocket: string }[] } = {
                    transform: POSITION_ONLY,
                    rectangle: POSITION_ONLY,
                    text: POSITION_ONLY,
                    spirograph: POSITION_ONLY,
                    circle: POSITION_ONLY,
                    polygon: POSITION_ONLY,
                    arc: POSITION_ONLY,
                    line: [
                        { prefix: "position", pointSocket: "position" },
                        { prefix: "start", pointSocket: "startPoint" },
                        { prefix: "end", pointSocket: "endPoint" },
                    ],
                    star: POSITION_ONLY,
                    polyring: POSITION_ONLY,
                    polygram: POSITION_ONLY,
                    burst: POSITION_ONLY,
                    spiroring: POSITION_ONLY,
                    glyph: POSITION_ONLY,
                    ring: POSITION_ONLY,
                    fromPath: POSITION_ONLY,
                    knot: POSITION_ONLY,
                    spiral: POSITION_ONLY,
                    radialLayout: POSITION_ONLY,
                    repeatedLayout: POSITION_ONLY,
                    polygonLayout: POSITION_ONLY,
                    linearGradient: [
                        { prefix: "start", pointSocket: "startPoint" },
                        { prefix: "end", pointSocket: "endPoint" },
                    ],
                    radialGradient: [
                        { prefix: "center", pointSocket: "centerPoint" },
                        { prefix: "startOffset", pointSocket: "focalPoint" },
                    ],
                    glowEffect: [{ prefix: "offset", pointSocket: "offset" }],
                };

                for (const graphId in input.nodes) {
                    for (const nodeId in input.nodes[graphId]) {
                        const node = input.nodes[graphId][nodeId];
                        const slices = POSITION_SLICES[node.type];
                        if (!slices) continue;
                        for (const { prefix, pointSocket } of slices) {
                            const subSockets = SLICE_SUFFIXES.map((s) => `${prefix}${s}`);
                            const anyWired = subSockets.some((sock) => node.in?.[sock] != null);

                            if (!anyWired) {
                                // payload-only: drop the sub-sockets, add the point socket. Authoring payload
                                // (positionMode/X/Y/Radius/Theta) stays put for inline expression.
                                for (const sock of subSockets) delete node.in[sock];
                                node.in[pointSocket] = null;
                                continue;
                            }

                            // inject a Point node that resolves to the same {x,y} the consumer used to compute inline
                            const pid = nanoid();
                            const point = NodeTypes.get("point").create({}, pid) as any;
                            point.payload.mode = node.payload[`${prefix}Mode`];
                            point.payload.x = node.payload[`${prefix}X`];
                            point.payload.y = node.payload[`${prefix}Y`];
                            point.payload.radius = node.payload[`${prefix}Radius`];
                            point.payload.theta = node.payload[`${prefix}Theta`];
                            input.nodes[graphId][pid] = point;

                            // place it just left of the consumer so it doesn't land across the viewport
                            const pos = input.positions?.[graphId]?.[nodeId] ?? { x: 0, y: 0 };
                            if (!input.positions[graphId]) input.positions[graphId] = {};
                            input.positions[graphId][pid] = { x: pos.x - 220, y: pos.y };

                            // start the injected node folded so it doesn't clutter the graph
                            if (!input.uiState) input.uiState = {};
                            input.uiState[`node_accordion[${graphId}][${pid}]`] = true;

                            for (const s of SLICE_SUFFIXES) {
                                const sock = `${prefix}${s}`;
                                const linkId = node.in[sock];
                                if (linkId) {
                                    // retarget the existing wire onto the Point node (leaves the source's out[] intact)
                                    const link = input.links?.[graphId]?.[linkId];
                                    if (link) {
                                        link.toNode = pid;
                                        link.toSocket = s.toLowerCase();
                                        point.in[s.toLowerCase()] = linkId;
                                    }
                                }
                                delete node.in[sock];
                            }

                            // add the single Point.output -> consumer.<pointSocket> link
                            const newLinkId = nanoid();
                            input.links[graphId][newLinkId] = { id: newLinkId, fromNode: pid, toNode: nodeId, fromSocket: "output", toSocket: pointSocket };
                            point.out.output.push(newLinkId);
                            node.in[pointSocket] = newLinkId;
                        }
                    }
                }

                // Dedeprecate the iterators: the old `xIterator` exposed a bare {value_,pos_} socket PAIR per
                // stop; the reworked node takes a single compound `stop:X` socket. `xIterator2` (already the
                // compound shape) just reclaims the clean `xIterator` name; old-shape `xIterator` is transformed.
                // A wired old value_/pos_ can't retarget onto the compound socket, so inject the matching xStop
                // constructor as an adapter (value/position -> stop:X), same pattern as the point migration.
                const RENAME: { [k: string]: string } = {
                    floatIterator2: "floatIterator",
                    integerIterator2: "integerIterator",
                    lengthIterator2: "lengthIterator",
                    angleIterator2: "angleIterator",
                    colorIterator2: "colorIterator",
                };
                const STOP_NODE: { [k: string]: string } = {
                    floatIterator: "floatStop",
                    integerIterator: "integerStop",
                    lengthIterator: "lengthStop",
                    angleIterator: "angleStop",
                    colorIterator: "colorStop",
                };
                for (const graphId in input.nodes) {
                    for (const nodeId in input.nodes[graphId]) {
                        const node = input.nodes[graphId][nodeId];
                        if (RENAME[node.type]) {
                            // already the compound shape -- just reclaim the clean name
                            node.type = RENAME[node.type];
                            continue;
                        }
                        const stopType = STOP_NODE[node.type];
                        if (!stopType) continue;
                        // old-shape iterator. colorIterator's per-stop value lives under `color`, others `value`.
                        const valueField = node.type === "colorIterator" ? "color" : "value";
                        const oldStops = Array.isArray(node.payload.stops) ? node.payload.stops : [];
                        const newStops: any[] = [];
                        for (const stop of oldStops) {
                            const socket = `stop_${stop.id}`;
                            const valSock = `${valueField}_${stop.id}`;
                            const posSock = `pos_${stop.id}`;
                            const valLink = node.in?.[valSock];
                            const posLink = node.in?.[posSock];
                            const value = stop[valueField];
                            newStops.push({ socket, value, position: stop.position, enabled: true });

                            if (valLink != null || posLink != null) {
                                // inject an xStop adapter that reconstructs the compound stop from the wire(s)
                                const sid = nanoid();
                                const stopNode = NodeTypes.get(stopType as "floatStop").create({}, sid) as any;
                                stopNode.payload.value = value;
                                stopNode.payload.position = stop.position;
                                stopNode.payload.enabled = true;
                                input.nodes[graphId][sid] = stopNode;

                                const pos = input.positions?.[graphId]?.[nodeId] ?? { x: 0, y: 0 };
                                if (!input.positions[graphId]) input.positions[graphId] = {};
                                input.positions[graphId][sid] = { x: pos.x - 220, y: pos.y };
                                if (!input.uiState) input.uiState = {};
                                input.uiState[`node_accordion[${graphId}][${sid}]`] = true;

                                if (valLink != null) {
                                    const lk = input.links?.[graphId]?.[valLink];
                                    if (lk) {
                                        lk.toNode = sid;
                                        lk.toSocket = "value";
                                        stopNode.in.value = valLink;
                                    }
                                }
                                if (posLink != null) {
                                    const lk = input.links?.[graphId]?.[posLink];
                                    if (lk) {
                                        lk.toNode = sid;
                                        lk.toSocket = "position";
                                        stopNode.in.position = posLink;
                                    }
                                }
                                const nl = nanoid();
                                input.links[graphId][nl] = { id: nl, fromNode: sid, toNode: nodeId, fromSocket: "output", toSocket: socket };
                                stopNode.out.output.push(nl);
                                node.in[socket] = nl;
                            } else {
                                node.in[socket] = null;
                            }
                            delete node.in[valSock];
                            delete node.in[posSock];
                        }
                        node.payload.stops = newStops;
                        node.in.stops = null; // supersocket
                        node.out.stopCount = []; // new output
                        // node.type stays the same reclaimed string -- no reassignment
                    }
                }
                input.version = 9;
            }
            if (input.version === 9) {
                // The inline point-authoring cluster that v8->v9 left flat (`${prefix}{Mode,X,Y,Radius,Theta}`)
                // nests into a single object matching `PointInput.Value`, so one shared editor (PointInput) drives
                // it. Missing slices fall back to the point default. Table-driven: a node type is nested here in
                // lockstep with its def swapping to PointInput. Mirrors the v8->v9 `POSITION_SLICES` set (payload
                // key == old prefix). pointArray is absent -- its per-entry payload was already nested.
                const SLICE_SUFFIXES = ["Mode", "X", "Y", "Radius", "Theta"] as const;
                const POINT_DEFAULT = { mode: 0, x: "0px", y: "0px", radius: "0px", theta: "0deg" };
                const POSITION = [{ prefix: "position", key: "position" }];
                const NEST_POINT_SLICES: { [type: string]: { prefix: string; key: string }[] } = {
                    transform: POSITION,
                    rectangle: POSITION,
                    text: POSITION,
                    spirograph: POSITION,
                    circle: POSITION,
                    polygon: POSITION,
                    arc: POSITION,
                    star: POSITION,
                    polyring: POSITION,
                    polygram: POSITION,
                    burst: POSITION,
                    spiroring: POSITION,
                    glyph: POSITION,
                    ring: POSITION,
                    fromPath: POSITION,
                    knot: POSITION,
                    spiral: POSITION,
                    radialLayout: POSITION,
                    repeatedLayout: POSITION,
                    polygonLayout: POSITION,
                    line: [
                        { prefix: "position", key: "position" },
                        { prefix: "start", key: "start" },
                        { prefix: "end", key: "end" },
                    ],
                    linearGradient: [
                        { prefix: "start", key: "start" },
                        { prefix: "end", key: "end" },
                    ],
                    radialGradient: [
                        { prefix: "center", key: "center" },
                        { prefix: "startOffset", key: "startOffset" },
                    ],
                    glowEffect: [{ prefix: "offset", key: "offset" }],
                };
                for (const graphId in input.nodes) {
                    for (const nodeId in input.nodes[graphId]) {
                        const node = input.nodes[graphId][nodeId];
                        const slices = NEST_POINT_SLICES[node.type];
                        if (!slices || !node.payload) continue;
                        const p = node.payload as { [k: string]: any };
                        for (const { prefix, key } of slices) {
                            p[key] = {
                                mode: p[`${prefix}Mode`] ?? POINT_DEFAULT.mode,
                                x: p[`${prefix}X`] ?? POINT_DEFAULT.x,
                                y: p[`${prefix}Y`] ?? POINT_DEFAULT.y,
                                radius: p[`${prefix}Radius`] ?? POINT_DEFAULT.radius,
                                theta: p[`${prefix}Theta`] ?? POINT_DEFAULT.theta,
                            };
                            for (const s of SLICE_SUFFIXES) delete p[`${prefix}${s}`];
                        }
                    }
                }
                input.version = 10;
            }
            if (input.version === 10) {
                // Comparison nodes gained inline float fields for disconnected inputs (like add/multiply).
                // Backfill the new payload keys on existing nodes; default "0".
                const COMPARATOR_FIELDS: { [type: string]: string[] } = {
                    equal: ["a", "b"],
                    greaterThan: ["a", "b"],
                    lessThan: ["a", "b"],
                    greaterOrEqual: ["a", "b"],
                    lessOrEqual: ["a", "b"],
                    between: ["value", "min", "max"],
                    within: ["value", "target", "tolerance"],
                };
                for (const graphId in input.nodes) {
                    for (const nodeId in input.nodes[graphId]) {
                        const node = input.nodes[graphId][nodeId];
                        const fields = COMPARATOR_FIELDS[node.type];
                        if (!fields || !node.payload) continue;
                        for (const f of fields) {
                            node.payload[f] = node.payload[f] ?? "0";
                        }
                    }
                }
                input.version = 11;
            }
            if (input.version === 11) {
                // Array input interface nodes gained orthogonal `socketed` + `widget` options (like value inputs).
                // Backfill existing instances to their prior behavior: the group inputs (layer/path-op) were always
                // a socketed dynamic list; the other array inputs were a plain socket with no inline authoring.
                // widget values mirror Enum.Common.arrayInputWidget: 0 = None, 1 = Dynamic List.
                const GROUP_ARRAY_INPUTS = new Set(["arrayLayerInput", "arrayPathOpInput"]);
                const OTHER_ARRAY_INPUTS = new Set([
                    "arrayFloatInput",
                    "arrayIntegerInput",
                    "arrayAngleInput",
                    "arrayLengthInput",
                    "arrayColorInput",
                    "arrayBooleanInput",
                    "arrayPointInput",
                    "arrayStopColorInput",
                    "arrayStopFloatInput",
                    "arrayStopAngleInput",
                    "arrayStopIntegerInput",
                    "arrayStopLengthInput",
                ]);
                for (const graphId in input.nodes) {
                    for (const nodeId in input.nodes[graphId]) {
                        const node = input.nodes[graphId][nodeId];
                        if (!node.payload) continue;
                        if (GROUP_ARRAY_INPUTS.has(node.type)) {
                            node.payload.socketed = node.payload.socketed ?? true;
                            node.payload.widget = node.payload.widget ?? 1;
                        } else if (OTHER_ARRAY_INPUTS.has(node.type)) {
                            node.payload.socketed = node.payload.socketed ?? true;
                            node.payload.widget = node.payload.widget ?? 0;
                        }
                    }
                }
                input.version = 12;
            }
            // next version alterations go here...
            return input as Project.SavedProject;
        };
    }
}
