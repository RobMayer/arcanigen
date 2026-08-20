import { nanoid } from "nanoid";
import { FastContextMember } from "../../util/hooks/useFastContext";
import { NodeDefinitions, NodeTypes } from "../../definitions/nodeTypes";
import { SocketTypes } from "../../definitions/socketTypes";
import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { computeSubgraphDeps } from "../../util/cycleDetection";
import { rebuildDownstream, invalidateDownstream } from "./cache";
import { makeSubgraphMeta } from "./types";
import type { GraphId, NodesType, LinksType, CacheType, InterfacesType, DepsType, UsersType, MetaType, XY, InterfaceMember, SocketTypeCacheType, SocketTypeCacheEntry } from "./types";

export type StateRefs = {
    nodes: FastContextMember<NodesType>;
    nodeList: FastContextMember<{ [graphId: GraphId]: ArcaneGraph.NodeId[] }>;
    links: FastContextMember<LinksType>;
    linkList: FastContextMember<{ [graphId: GraphId]: ArcaneGraph.LinkId[] }>;
    positions: FastContextMember<{ [graphId: GraphId]: { [nodeId: ArcaneGraph.NodeId]: XY } }>;
    users: FastContextMember<UsersType>;
    interfaces: FastContextMember<InterfacesType>;
    cache: FastContextMember<CacheType>;
    deps: FastContextMember<DepsType>;
    meta: FastContextMember<MetaType>;
    socketTypes: FastContextMember<SocketTypeCacheType>;
};

type DirtyKey = "nodes" | "nodeList" | "links" | "linkList" | "positions" | "users" | "interfaces" | "cache" | "deps" | "meta" | "socketTypes";

export class MethodContextImpl implements NodeTypes.MethodContext {
    private dirty = new Set<DirtyKey>();
    private dirtyNodeGraphs = new Set<string>();
    private dirtyLinkGraphs = new Set<string>();
    private depth = 0;

    constructor(private refs: StateRefs) {}

    // ─── Transaction management ──────────────────────────────────────────

    run(fn: () => void): void {
        this.depth++;
        try {
            fn();
        } finally {
            this.depth--;
            if (this.depth === 0) {
                this.flush();
            }
        }
    }

    private flush(): void {
        if (this.dirtyNodeGraphs.size > 0) {
            const nodeList = { ...this.refs.nodeList.ref.current };
            for (const gId of this.dirtyNodeGraphs) {
                const nodes = this.refs.nodes.ref.current[gId];
                nodeList[gId] = nodes ? Object.keys(nodes) : [];
            }
            this.refs.nodeList.ref.current = nodeList;
            this.dirty.add("nodeList");
        }
        if (this.dirtyLinkGraphs.size > 0) {
            const linkList = { ...this.refs.linkList.ref.current };
            for (const gId of this.dirtyLinkGraphs) {
                const links = this.refs.links.ref.current[gId];
                linkList[gId] = links ? Object.keys(links) : [];
            }
            this.refs.linkList.ref.current = linkList;
            this.dirty.add("linkList");
        }

        for (const key of this.dirty) {
            this.refs[key].notify();
        }

        this.dirty.clear();
        this.dirtyNodeGraphs.clear();
        this.dirtyLinkGraphs.clear();
    }

    // ─── State reads ─────────────────────────────────────────────────────

    getNode(graphId: string, nodeId: string): NodeDefinitions.NodeFor<NodeDefinitions.Any> | undefined {
        return this.refs.nodes.ref.current[graphId]?.[nodeId];
    }

    getLink(graphId: string, linkId: string): ArcaneGraph.Link | undefined {
        return this.refs.links.ref.current[graphId]?.[linkId];
    }

    getNodesForGraph(graphId: string): { [nodeId: string]: NodeDefinitions.NodeFor<NodeDefinitions.Any> } {
        return this.refs.nodes.ref.current[graphId] ?? {};
    }

    getLinksForGraph(graphId: string): { [linkId: string]: ArcaneGraph.Link } {
        return this.refs.links.ref.current[graphId] ?? {};
    }

    getInterfaces(graphId: string): InterfaceMember[] {
        return this.refs.interfaces.ref.current[graphId] ?? [];
    }

    getUsers(graphId: string): { node: string; scope: string }[] {
        return this.refs.users.ref.current[graphId] ?? [];
    }

    // ─── Low-level mutations (no hooks fired) ────────────────────────────

    setNode(graphId: string, nodeId: string, node: NodeDefinitions.NodeFor<NodeDefinitions.Any>): void {
        this.refs.nodes.ref.current = {
            ...this.refs.nodes.ref.current,
            [graphId]: {
                ...this.refs.nodes.ref.current[graphId],
                [nodeId]: node,
            },
        };
        this.dirty.add("nodes");
        this.dirtyNodeGraphs.add(graphId);
    }

    setInterfaces(graphId: string, interfaces: InterfaceMember[]): void {
        this.refs.interfaces.ref.current = {
            ...this.refs.interfaces.ref.current,
            [graphId]: interfaces,
        };
        this.dirty.add("interfaces");
    }

    setUsers(graphId: string, users: { node: string; scope: string }[]): void {
        this.refs.users.ref.current = {
            ...this.refs.users.ref.current,
            [graphId]: users,
        };
        this.dirty.add("users");
    }

    // ─── Socket-type cache (transient, derived, never persisted) ─────────
    // The off-payload home for the signature engine's solved socket types (Terms), keyed graphId->nodeId->{in,out}.
    // Rebuilt lazily on solve, reset on load, never serialized (see SocketTypeCacheType).

    readSocketType(graphId: string, nodeId: string, socketId: string, side: "in" | "out"): SocketTypes.Term | undefined {
        return this.refs.socketTypes.ref.current[graphId]?.[nodeId]?.[side]?.[socketId];
    }

    getSocketTypes(graphId: string, nodeId: string): SocketTypeCacheEntry | undefined {
        return this.refs.socketTypes.ref.current[graphId]?.[nodeId];
    }

    setSocketTypes(graphId: string, nodeId: string, entry: SocketTypeCacheEntry): void {
        const cur = this.refs.socketTypes.ref.current;
        this.refs.socketTypes.ref.current = {
            ...cur,
            [graphId]: { ...cur[graphId], [nodeId]: entry },
        };
        this.dirty.add("socketTypes");
    }

    clearSocketTypes(graphId: string, nodeId: string): void {
        const cur = this.refs.socketTypes.ref.current;
        if (!cur[graphId] || !(nodeId in cur[graphId])) return;
        const graphCache = { ...cur[graphId] };
        delete graphCache[nodeId];
        this.refs.socketTypes.ref.current = { ...cur, [graphId]: graphCache };
        this.dirty.add("socketTypes");
    }

    // ─── High-level operations ───────────────────────────────────────────

    connect(graphId: string, fromNode: string, toNode: string, fromSocket: string, toSocket: string): void {
        const oldGraph = { nodes: this.refs.nodes.ref.current[graphId], links: this.refs.links.ref.current[graphId] };
        const [{ nodes, links }, newLink, removed] = ArcaneGraph.reconnect(oldGraph, fromNode, toNode, fromSocket, toSocket);

        if (!newLink) return;

        this.refs.nodes.ref.current = { ...this.refs.nodes.ref.current, [graphId]: nodes };
        this.refs.links.ref.current = { ...this.refs.links.ref.current, [graphId]: links };
        this.dirty.add("nodes");
        this.dirty.add("links");
        this.dirtyNodeGraphs.add(graphId);
        this.dirtyLinkGraphs.add(graphId);

        // Fire onDisconnect for displaced links BEFORE onConnect
        if (removed.links.length > 0) {
            this.fireOnDisconnect(removed.links, graphId);
        }

        this.fireOnConnect(graphId, fromNode, newLink, "out");
        this.fireOnConnect(graphId, toNode, newLink, "in");

        // Cache: rebuild from fromNode downstream (ensures source outputs are cached; toNode is downstream via the new link)
        this.refs.cache.ref.current = rebuildDownstream(this.refs.cache.ref.current, this.refs.nodes.ref.current, this.refs.links.ref.current, this.refs.interfaces.ref.current, graphId, fromNode);
        this.dirty.add("cache");

        this.recomputeDeps(graphId);
    }

    removeLinks(graphId: string, ...linkIds: string[]): void {
        if (linkIds.length === 0) return;

        const oldGraph = { nodes: this.refs.nodes.ref.current[graphId], links: this.refs.links.ref.current[graphId] };
        const [{ nodes, links }, removed] = ArcaneGraph.removeLinks(oldGraph, linkIds);
        if (removed.links.length === 0) return;

        this.refs.nodes.ref.current = { ...this.refs.nodes.ref.current, [graphId]: nodes };
        this.refs.links.ref.current = { ...this.refs.links.ref.current, [graphId]: links };
        this.dirty.add("nodes");
        this.dirty.add("links");
        this.dirtyNodeGraphs.add(graphId);
        this.dirtyLinkGraphs.add(graphId);

        // A removed link can un-ground shared type variables. Per-node re-solve trusts neighbours' cached
        // socket types, so a cyclic mutual constraint (e.g. ForEach.each <-> Map.result) would sustain a
        // stale grounding after its external anchor is gone. Clear the whole weakly-connected component's
        // solved socket types up front; the onDisconnect recompute cascade then re-derives them from the
        // wires that actually remain (a cleared socket falls back to its neighbour-free signature default,
        // which breaks the cycle).
        const postGraph = { nodes: this.refs.nodes.ref.current[graphId], links: this.refs.links.ref.current[graphId] };
        const seeds = removed.links.flatMap((l) => [l.fromNode, l.toNode]);
        for (const nodeId of ArcaneGraph.weaklyConnectedComponent(postGraph, seeds)) {
            this.clearSocketTypes(graphId, nodeId);
        }

        this.fireOnDisconnect(removed.links, graphId);

        const affectedNodes = new Set(removed.links.map((l) => l.toNode));
        for (const nodeId of affectedNodes) {
            if (this.refs.nodes.ref.current[graphId]?.[nodeId]) {
                this.refs.cache.ref.current = rebuildDownstream(
                    this.refs.cache.ref.current,
                    this.refs.nodes.ref.current,
                    this.refs.links.ref.current,
                    this.refs.interfaces.ref.current,
                    graphId,
                    nodeId,
                );
            }
        }
        this.dirty.add("cache");

        this.recomputeDeps(graphId);
    }

    removeNode(graphId: string, nodeId: string): void {
        const node = this.refs.nodes.ref.current[graphId]?.[nodeId];
        if (!node) return;
        if (node.type === "result") return;

        // Fire onDelete hook BEFORE removal
        const nodeType = NodeTypes.get(node.type);
        if (nodeType.onDelete) {
            const onDelete = nodeType.onDelete as (node: NodeDefinitions.NodeFor<NodeDefinitions.Any>, graphId: string, ctx: NodeTypes.MethodContext) => void;
            onDelete(node, graphId, this);
        }

        // Find downstream nodes BEFORE removing (they'll need cache rebuild)
        const preRemoveGraph = { nodes: this.refs.nodes.ref.current[graphId], links: this.refs.links.ref.current[graphId] };
        const downstream = ArcaneGraph.wideDownstreamOf(preRemoveGraph, nodeId);

        // Remove node from graph (reads latest state — onDelete may have already removed some links)
        const currentGraph = { nodes: this.refs.nodes.ref.current[graphId], links: this.refs.links.ref.current[graphId] };
        const [{ nodes, links }, removedFromDelete] = ArcaneGraph.removeNodes(currentGraph, nodeId);

        const positions = { ...this.refs.positions.ref.current[graphId] };
        delete positions[nodeId];
        this.refs.positions.ref.current = { ...this.refs.positions.ref.current, [graphId]: positions };
        this.dirty.add("positions");

        this.refs.nodes.ref.current = { ...this.refs.nodes.ref.current, [graphId]: nodes };
        this.refs.links.ref.current = { ...this.refs.links.ref.current, [graphId]: links };
        this.dirty.add("nodes");
        this.dirty.add("links");
        this.dirtyNodeGraphs.add(graphId);
        this.dirtyLinkGraphs.add(graphId);

        // Fire onDisconnect for removed links (skip the deleted node itself)
        if (removedFromDelete.links.length > 0) {
            this.fireOnDisconnect(removedFromDelete.links, graphId, nodeId);
        }

        // Drop the removed node's transient solved socket types
        this.clearSocketTypes(graphId, nodeId);

        this.refs.cache.ref.current = invalidateDownstream(this.refs.cache.ref.current, this.refs.nodes.ref.current, this.refs.links.ref.current, graphId, nodeId);
        for (const downstreamId of downstream) {
            if (this.refs.nodes.ref.current[graphId]?.[downstreamId]) {
                this.refs.cache.ref.current = rebuildDownstream(
                    this.refs.cache.ref.current,
                    this.refs.nodes.ref.current,
                    this.refs.links.ref.current,
                    this.refs.interfaces.ref.current,
                    graphId,
                    downstreamId,
                );
            }
        }

        // Rebuild cache for Custom nodes in parent graphs
        const usersOfGraph = this.refs.users.ref.current[graphId] ?? [];
        for (const { node: customNodeId, scope } of usersOfGraph) {
            this.refs.cache.ref.current = rebuildDownstream(
                this.refs.cache.ref.current,
                this.refs.nodes.ref.current,
                this.refs.links.ref.current,
                this.refs.interfaces.ref.current,
                scope,
                customNodeId,
            );
        }
        this.dirty.add("cache");

        this.recomputeDeps(graphId);
    }

    updatePayload(graphId: string, nodeId: string, data: Partial<Record<string, unknown>>): void {
        const node = this.refs.nodes.ref.current[graphId]?.[nodeId];
        if (!node) return;

        const prev = node.payload as Record<string, unknown>;
        const updated = { ...node, payload: { ...prev, ...data } } as NodeDefinitions.NodeFor<NodeDefinitions.Any>;

        this.refs.nodes.ref.current = {
            ...this.refs.nodes.ref.current,
            [graphId]: { ...this.refs.nodes.ref.current[graphId], [nodeId]: updated },
        };
        this.dirty.add("nodes");
        this.dirtyNodeGraphs.add(graphId);

        const nodeType = NodeTypes.get(updated.type);
        if (nodeType.onPayloadChange) {
            const onPayloadChange = nodeType.onPayloadChange as (
                node: NodeDefinitions.NodeFor<NodeDefinitions.Any>,
                prev: Record<string, unknown>,
                graphId: string,
                ctx: NodeTypes.MethodContext,
            ) => void;
            onPayloadChange(updated, prev, graphId, this);
        }

        this.refs.cache.ref.current = rebuildDownstream(this.refs.cache.ref.current, this.refs.nodes.ref.current, this.refs.links.ref.current, this.refs.interfaces.ref.current, graphId, nodeId);
        this.dirty.add("cache");

        // Also rebuild cache for Custom nodes in parent graphs
        const usersOfGraph = this.refs.users.ref.current[graphId] ?? [];
        if (usersOfGraph.length > 0) {
            for (const { node: customNodeId, scope } of usersOfGraph) {
                this.refs.cache.ref.current = rebuildDownstream(
                    this.refs.cache.ref.current,
                    this.refs.nodes.ref.current,
                    this.refs.links.ref.current,
                    this.refs.interfaces.ref.current,
                    scope,
                    customNodeId,
                );
            }
        }
    }

    cloneNode(graphId: string, nodeId: string, position?: XY): void {
        const node = this.refs.nodes.ref.current[graphId]?.[nodeId];
        if (!node) return;
        if (node.type === "result") return;

        const nodeType = NodeTypes.get(node.type);
        const cloneFn = (nodeType as NodeTypes.Any).clone as ((node: NodeDefinitions.NodeFor<NodeDefinitions.Any>) => NodeDefinitions.NodeFor<NodeDefinitions.Any>) | undefined;
        let cloned: NodeDefinitions.NodeFor<NodeDefinitions.Any>;
        if (cloneFn) {
            cloned = cloneFn(node);
        } else {
            cloned = structuredClone(node);
            cloned.id = nanoid();
            for (const key of Object.keys(cloned.in)) {
                cloned.in[key] = null;
            }
            for (const key of Object.keys(cloned.out)) {
                cloned.out[key] = [];
            }
        }

        const oldGraph = { nodes: this.refs.nodes.ref.current[graphId], links: this.refs.links.ref.current[graphId] };
        const { nodes } = ArcaneGraph.importNodes(oldGraph, [cloned]);
        this.refs.nodes.ref.current = { ...this.refs.nodes.ref.current, [graphId]: nodes };
        this.dirty.add("nodes");
        this.dirtyNodeGraphs.add(graphId);

        if (nodeType.onCreate) {
            const onCreate = nodeType.onCreate as (node: NodeDefinitions.NodeFor<NodeDefinitions.Any>, graphId: string, ctx: NodeTypes.MethodContext) => void;
            onCreate(cloned, graphId, this);
        }

        const origPos = this.refs.positions.ref.current[graphId]?.[nodeId] ?? { x: 0, y: 0 };
        this.refs.positions.ref.current = {
            ...this.refs.positions.ref.current,
            [graphId]: {
                ...this.refs.positions.ref.current[graphId],
                [cloned.id]: position ?? { x: origPos.x + 40, y: origPos.y + 40 },
            },
        };
        this.dirty.add("positions");

        this.refs.cache.ref.current = rebuildDownstream(this.refs.cache.ref.current, this.refs.nodes.ref.current, this.refs.links.ref.current, this.refs.interfaces.ref.current, graphId, cloned.id);
        this.dirty.add("cache");
    }

    // Clone a set of nodes as a group: each is cloned (result nodes are skipped), links whose BOTH endpoints
    // are within the set are recreated between the clones, and the old->new id mapping is returned so callers
    // can retarget selection onto the clones. Links crossing the set boundary are intentionally dropped.
    cloneManyNodes(graphId: string, nodeIds: string[]): { original: string; clone: string }[] {
        const nodesRef = this.refs.nodes.ref.current[graphId];
        if (!nodesRef) return [];

        const idMap = new Map<string, string>();
        const cloneList: { node: NodeDefinitions.NodeFor<NodeDefinitions.Any>; cloned: NodeDefinitions.NodeFor<NodeDefinitions.Any>; nodeType: NodeTypes.Any }[] = [];

        for (const nodeId of nodeIds) {
            const node = nodesRef[nodeId];
            if (!node) continue;
            if (node.type === "result") continue;

            const nodeType = NodeTypes.get(node.type);
            const cloneFn = (nodeType as NodeTypes.Any).clone as ((node: NodeDefinitions.NodeFor<NodeDefinitions.Any>) => NodeDefinitions.NodeFor<NodeDefinitions.Any>) | undefined;
            let cloned: NodeDefinitions.NodeFor<NodeDefinitions.Any>;
            if (cloneFn) {
                cloned = cloneFn(node);
            } else {
                cloned = structuredClone(node);
                cloned.id = nanoid();
                for (const key of Object.keys(cloned.in)) {
                    cloned.in[key] = null;
                }
                for (const key of Object.keys(cloned.out)) {
                    cloned.out[key] = [];
                }
            }
            idMap.set(node.id, cloned.id);
            cloneList.push({ node, cloned, nodeType: nodeType as NodeTypes.Any });
        }

        if (cloneList.length === 0) return [];

        const oldGraph = { nodes: this.refs.nodes.ref.current[graphId], links: this.refs.links.ref.current[graphId] };
        const { nodes } = ArcaneGraph.importNodes(
            oldGraph,
            cloneList.map(({ cloned }) => cloned),
        );
        this.refs.nodes.ref.current = { ...this.refs.nodes.ref.current, [graphId]: nodes };
        this.dirty.add("nodes");
        this.dirtyNodeGraphs.add(graphId);

        for (const { cloned, nodeType } of cloneList) {
            if (nodeType.onCreate) {
                const onCreate = nodeType.onCreate as (node: NodeDefinitions.NodeFor<NodeDefinitions.Any>, graphId: string, ctx: NodeTypes.MethodContext) => void;
                onCreate(cloned, graphId, this);
            }
        }

        const positions = { ...this.refs.positions.ref.current[graphId] };
        for (const { node, cloned } of cloneList) {
            const origPos = this.refs.positions.ref.current[graphId]?.[node.id] ?? { x: 0, y: 0 };
            positions[cloned.id] = { x: origPos.x + 40, y: origPos.y + 40 };
        }
        this.refs.positions.ref.current = { ...this.refs.positions.ref.current, [graphId]: positions };
        this.dirty.add("positions");

        // Recreate internal links (both endpoints cloned). Snapshot the link list first since connect() mutates it.
        const internalLinks = Object.values(this.refs.links.ref.current[graphId] ?? {}).filter((link) => idMap.has(link.fromNode) && idMap.has(link.toNode));
        for (const link of internalLinks) {
            this.connect(graphId, idMap.get(link.fromNode)!, idMap.get(link.toNode)!, link.fromSocket, link.toSocket);
        }

        // connect() rebuilds cache for connected clones; ensure isolated clones are rebuilt too.
        for (const { cloned } of cloneList) {
            this.refs.cache.ref.current = rebuildDownstream(this.refs.cache.ref.current, this.refs.nodes.ref.current, this.refs.links.ref.current, this.refs.interfaces.ref.current, graphId, cloned.id);
        }
        this.dirty.add("cache");

        return cloneList.map(({ node, cloned }) => ({ original: node.id, clone: cloned.id }));
    }

    // Extract a selection of nodes into a freshly-created subgraph `subgraphId`. Internal links (both endpoints
    // in the selection) are recreated inside the subgraph; boundary links are dropped (we do NOT infer interface
    // sockets). The Result node is never included. No Custom node is placed in the parent -- the user drops one
    // in themselves after adjusting the subgraph. When `copy` is false the originals are removed from the parent
    // (move); when true they are left intact and the subgraph gets fresh-id duplicates. Returns true on success.
    makeSubgraphFromSelection(parentGraphId: string, subgraphId: string, name: string, nodeIds: string[], copy: boolean): boolean {
        const parentNodes = this.refs.nodes.ref.current[parentGraphId];
        if (!parentNodes) return false;

        const moving = nodeIds.filter((id) => parentNodes[id] && parentNodes[id].type !== "result");
        if (moving.length === 0) return false;
        const movingSet = new Set(moving);

        // Snapshot everything we need BEFORE mutating: node objects (sockets cleared, links recreated below),
        // the internal links, and positions. On copy the duplicates get fresh ids so they never collide with the
        // still-present originals; idMap threads old ids to the ids used inside the subgraph for both modes.
        const idMap = new Map<string, string>();
        const cloned = moving.map((id) => {
            const node = structuredClone(parentNodes[id]);
            if (copy) node.id = nanoid();
            for (const key of Object.keys(node.in)) node.in[key] = null;
            for (const key of Object.keys(node.out)) node.out[key] = [];
            idMap.set(id, node.id);
            return node;
        });
        const parentLinks = this.refs.links.ref.current[parentGraphId] ?? {};
        const internalLinks = Object.values(parentLinks).filter((link) => movingSet.has(link.fromNode) && movingSet.has(link.toNode));
        const parentPositions = this.refs.positions.ref.current[parentGraphId] ?? {};
        const movedPositions: { [id: string]: XY } = {};
        for (const id of moving) {
            movedPositions[idMap.get(id)!] = parentPositions[id] ?? { x: 0, y: 0 };
        }

        // Initialize the empty subgraph (mirrors useSubgraphMethods.create; nodeList/linkList are rebuilt on flush).
        this.refs.nodes.ref.current = { ...this.refs.nodes.ref.current, [subgraphId]: {} };
        this.refs.links.ref.current = { ...this.refs.links.ref.current, [subgraphId]: {} };
        this.refs.positions.ref.current = { ...this.refs.positions.ref.current, [subgraphId]: {} };
        this.refs.users.ref.current = { ...this.refs.users.ref.current, [subgraphId]: [] };
        this.refs.interfaces.ref.current = { ...this.refs.interfaces.ref.current, [subgraphId]: [] };
        this.refs.cache.ref.current = { ...this.refs.cache.ref.current, [subgraphId]: {} };
        this.refs.meta.ref.current = { ...this.refs.meta.ref.current, [subgraphId]: makeSubgraphMeta(name) };
        this.dirty.add("nodes").add("links").add("positions").add("users").add("interfaces").add("cache").add("meta");
        this.dirtyNodeGraphs.add(subgraphId);
        this.dirtyLinkGraphs.add(subgraphId);

        // Move mode: remove the originals from the parent (fires onDelete, severs their links including boundary
        // ones). Copy mode leaves the parent untouched.
        if (!copy) {
            for (const id of moving) {
                this.removeNode(parentGraphId, id);
            }
        }

        // Import the moved nodes into the subgraph with their positions preserved.
        const subGraph = { nodes: this.refs.nodes.ref.current[subgraphId], links: this.refs.links.ref.current[subgraphId] };
        this.refs.nodes.ref.current = { ...this.refs.nodes.ref.current, [subgraphId]: ArcaneGraph.importNodes(subGraph, cloned).nodes };
        this.refs.positions.ref.current = {
            ...this.refs.positions.ref.current,
            [subgraphId]: { ...this.refs.positions.ref.current[subgraphId], ...movedPositions },
        };
        this.dirtyNodeGraphs.add(subgraphId);

        // Fire onCreate in the new scope so e.g. nested Custom nodes re-register as users of their subgraphs.
        for (const node of cloned) {
            const nodeType = NodeTypes.get(node.type);
            if (nodeType.onCreate) {
                const onCreate = nodeType.onCreate as (node: NodeDefinitions.NodeFor<NodeDefinitions.Any>, graphId: string, ctx: NodeTypes.MethodContext) => void;
                onCreate(node, subgraphId, this);
            }
        }

        // Recreate the internal links inside the subgraph (endpoints remapped through idMap for copy mode).
        for (const link of internalLinks) {
            this.connect(subgraphId, idMap.get(link.fromNode)!, idMap.get(link.toNode)!, link.fromSocket, link.toSocket);
        }
        for (const node of cloned) {
            this.refs.cache.ref.current = rebuildDownstream(this.refs.cache.ref.current, this.refs.nodes.ref.current, this.refs.links.ref.current, this.refs.interfaces.ref.current, subgraphId, node.id);
        }
        this.dirty.add("cache");

        return true;
    }

    addNodeByType(graphId: string, nodeType: NodeTypes.Any, params: Partial<NodeDefinitions.PayloadTypeOf<NodeDefinitions.Generic>>, position?: XY): void {
        const newNode = nodeType.create(params as Partial<NodeDefinitions.PayloadTypeOf<NodeDefinitions.Any>>);
        const oldGraph = { nodes: this.refs.nodes.ref.current[graphId], links: this.refs.links.ref.current[graphId] };
        const { nodes } = ArcaneGraph.importNodes(oldGraph, [newNode]);

        this.refs.nodes.ref.current = { ...this.refs.nodes.ref.current, [graphId]: nodes };
        this.dirty.add("nodes");
        this.dirtyNodeGraphs.add(graphId);

        if (nodeType.onCreate) {
            const onCreate = nodeType.onCreate as (node: NodeDefinitions.NodeFor<NodeDefinitions.Any>, graphId: string, ctx: NodeTypes.MethodContext) => void;
            onCreate(newNode, graphId, this);
        }

        this.refs.positions.ref.current = {
            ...this.refs.positions.ref.current,
            [graphId]: {
                ...this.refs.positions.ref.current[graphId],
                [newNode.id]: position ?? { x: 0, y: 0 },
            },
        };
        this.dirty.add("positions");

        this.refs.cache.ref.current = rebuildDownstream(this.refs.cache.ref.current, this.refs.nodes.ref.current, this.refs.links.ref.current, this.refs.interfaces.ref.current, graphId, newNode.id);
        this.dirty.add("cache");
    }

    interjectNode(graphId: string, linkId: string, nodeType: NodeTypes.Any, params: Partial<NodeDefinitions.PayloadTypeOf<NodeDefinitions.Generic>>, position?: XY): boolean {
        const link = this.getLink(graphId, linkId);
        if (!link) return false;

        if (!nodeType.canInterject || !nodeType.onInterject) return false;
        if (!nodeType.canInterject(link, graphId, this)) return false;

        const newNode = nodeType.create(params as Partial<NodeDefinitions.PayloadTypeOf<NodeDefinitions.Any>>);
        const oldGraph = { nodes: this.refs.nodes.ref.current[graphId], links: this.refs.links.ref.current[graphId] };
        const { nodes } = ArcaneGraph.importNodes(oldGraph, [newNode]);
        this.refs.nodes.ref.current = { ...this.refs.nodes.ref.current, [graphId]: nodes };
        this.dirty.add("nodes");
        this.dirtyNodeGraphs.add(graphId);

        if (nodeType.onCreate) {
            const onCreate = nodeType.onCreate as (node: NodeDefinitions.NodeFor<NodeDefinitions.Any>, graphId: string, ctx: NodeTypes.MethodContext) => void;
            onCreate(newNode, graphId, this);
        }

        this.refs.positions.ref.current = {
            ...this.refs.positions.ref.current,
            [graphId]: {
                ...this.refs.positions.ref.current[graphId],
                [newNode.id]: position ?? { x: 0, y: 0 },
            },
        };
        this.dirty.add("positions");

        // Let the node type handle the wiring
        const onInterject = nodeType.onInterject as (node: NodeDefinitions.NodeFor<NodeDefinitions.Any>, link: ArcaneGraph.Link, graphId: string, ctx: NodeTypes.MethodContext) => void;
        onInterject(newNode, link, graphId, this);
        return true;
    }

    alterNode(graphId: string, nodeId: string, fn: (node: NodeDefinitions.NodeFor<NodeDefinitions.Any>) => NodeDefinitions.NodeFor<NodeDefinitions.Any>): void {
        const node = this.refs.nodes.ref.current[graphId]?.[nodeId];
        if (!node) return;

        const updated = fn(node);
        this.refs.nodes.ref.current = {
            ...this.refs.nodes.ref.current,
            [graphId]: { ...this.refs.nodes.ref.current[graphId], [nodeId]: updated },
        };
        this.dirty.add("nodes");
        this.dirtyNodeGraphs.add(graphId);

        this.refs.cache.ref.current = rebuildDownstream(this.refs.cache.ref.current, this.refs.nodes.ref.current, this.refs.links.ref.current, this.refs.interfaces.ref.current, graphId, nodeId);
        this.dirty.add("cache");
    }

    // ─── Internal helpers ────────────────────────────────────────────────

    private fireOnConnect(graphId: string, nodeId: string, linkId: string, direction: "in" | "out"): void {
        const node = this.getNode(graphId, nodeId);
        if (!node) return;
        const nodeType = NodeTypes.get(node.type);
        if (nodeType.onConnect) {
            const onConnect = nodeType.onConnect as (
                node: NodeDefinitions.NodeFor<NodeDefinitions.Any>,
                linkId: string,
                direction: "in" | "out",
                graphId: string,
                ctx: NodeTypes.MethodContext,
            ) => void;
            onConnect(node, linkId, direction, graphId, this);
        }
    }

    private fireOnDisconnect(removedLinks: ArcaneGraph.Link[], graphId: string, skipNodeId?: string): void {
        for (const link of removedLinks) {
            if (link.fromNode !== skipNodeId) {
                const fromNode = this.getNode(graphId, link.fromNode);
                if (fromNode) {
                    const fromType = NodeTypes.get(fromNode.type);
                    if (fromType.onDisconnect) {
                        const onDisconnect = fromType.onDisconnect as (
                            node: NodeDefinitions.NodeFor<NodeDefinitions.Any>,
                            link: ArcaneGraph.Link,
                            direction: "in" | "out",
                            graphId: string,
                            ctx: NodeTypes.MethodContext,
                        ) => void;
                        onDisconnect(fromNode, link, "out", graphId, this);
                    }
                }
            }
            if (link.toNode !== skipNodeId) {
                const toNode = this.getNode(graphId, link.toNode);
                if (toNode) {
                    const toType = NodeTypes.get(toNode.type);
                    if (toType.onDisconnect) {
                        const onDisconnect = toType.onDisconnect as (
                            node: NodeDefinitions.NodeFor<NodeDefinitions.Any>,
                            link: ArcaneGraph.Link,
                            direction: "in" | "out",
                            graphId: string,
                            ctx: NodeTypes.MethodContext,
                        ) => void;
                        onDisconnect(toNode, link, "in", graphId, this);
                    }
                }
            }
        }
    }

    requestRefresh(graphId: string, nodeId: string, socketId: string, side: "in" | "out", reason: NodeTypes.RefreshReason): void {
        const node = this.getNode(graphId, nodeId);
        if (!node) return;

        if (side === "in") {
            // Socket is an input — traverse the link to find the upstream neighbor
            const linkId = (node.in as Record<string, string | null>)[socketId];
            if (!linkId) return;
            const link = this.getLink(graphId, linkId);
            if (!link) return;
            const neighbor = this.getNode(graphId, link.fromNode);
            if (!neighbor) return;
            const neighborType = NodeTypes.get(neighbor.type);
            if (neighborType.onRefreshRequest) {
                const onRefresh = neighborType.onRefreshRequest as (
                    node: NodeDefinitions.NodeFor<NodeDefinitions.Any>,
                    socketId: string,
                    side: "in" | "out",
                    reason: NodeTypes.RefreshReason,
                    graphId: string,
                    ctx: NodeTypes.MethodContext,
                ) => void;
                onRefresh(neighbor, link.fromSocket, "out", reason, graphId, this);
            }
        } else {
            // Socket is an output — traverse all links to find downstream neighbors
            const linkIds = (node.out as Record<string, string[]>)[socketId];
            if (!linkIds) return;
            for (const linkId of linkIds) {
                const link = this.getLink(graphId, linkId);
                if (!link) return;
                const neighbor = this.getNode(graphId, link.toNode);
                if (!neighbor) continue;
                const neighborType = NodeTypes.get(neighbor.type);
                if (neighborType.onRefreshRequest) {
                    const onRefresh = neighborType.onRefreshRequest as (
                        node: NodeDefinitions.NodeFor<NodeDefinitions.Any>,
                        socketId: string,
                        side: "in" | "out",
                        reason: NodeTypes.RefreshReason,
                        graphId: string,
                        ctx: NodeTypes.MethodContext,
                    ) => void;
                    onRefresh(neighbor, link.toSocket, "in", reason, graphId, this);
                }
            }
        }
    }

    private recomputeDeps(graphId: string): void {
        const graph = { nodes: this.refs.nodes.ref.current[graphId], links: this.refs.links.ref.current[graphId] };
        const newDeps = computeSubgraphDeps(graph, this.refs.interfaces.ref.current[graphId] ?? [], this.refs.deps.ref.current);
        this.refs.deps.ref.current = { ...this.refs.deps.ref.current, [graphId]: newDeps };
        this.dirty.add("deps");
    }
}
