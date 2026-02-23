import { nanoid } from "nanoid";
import { FastContextMember } from "../../util/hooks/useFastContext";
import { NodeDefinitions, NodeTypes } from "../../definitions/betterTypes";
import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { computeSubgraphDeps } from "../../util/cycleDetection";
import { rebuildDownstream, invalidateDownstream } from "./cache";
import type { GraphId, NodesType, LinksType, CacheType, InterfacesType, DepsType, UsersType, MetaType, XY, InterfaceMember } from "./types";

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
};

type DirtyKey = "nodes" | "nodeList" | "links" | "linkList" | "positions" | "users" | "interfaces" | "cache" | "deps" | "meta";

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
        // Rebuild nodeList/linkList for affected graphIds
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

        // Notify React for dirty slices
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

    // ─── High-level operations ───────────────────────────────────────────

    connect(graphId: string, fromNode: string, toNode: string, fromSocket: string, toSocket: string, type: string): void {
        const oldGraph = { nodes: this.refs.nodes.ref.current[graphId], links: this.refs.links.ref.current[graphId] };
        const [{ nodes, links }, newLink, removed] = ArcaneGraph.reconnect(oldGraph, fromNode, toNode, fromSocket, toSocket, type);

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

        // Fire onConnect on both endpoints
        this.fireOnConnect(graphId, fromNode, newLink, "out");
        this.fireOnConnect(graphId, toNode, newLink, "in");

        // Cache: rebuild from toNode downstream (evaluate-on-miss handles fromNode if needed)
        this.refs.cache.ref.current = rebuildDownstream(this.refs.cache.ref.current, this.refs.nodes.ref.current, this.refs.links.ref.current, this.refs.interfaces.ref.current, graphId, toNode);
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

        // Fire onDisconnect
        this.fireOnDisconnect(removed.links, graphId);

        // Rebuild cache for affected toNodes
        const affectedNodes = new Set(removed.links.map((l) => l.toNode));
        for (const nodeId of affectedNodes) {
            if (this.refs.nodes.ref.current[graphId]?.[nodeId]) {
                this.refs.cache.ref.current = rebuildDownstream(this.refs.cache.ref.current, this.refs.nodes.ref.current, this.refs.links.ref.current, this.refs.interfaces.ref.current, graphId, nodeId);
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

        // Update positions
        const positions = { ...this.refs.positions.ref.current[graphId] };
        delete positions[nodeId];
        this.refs.positions.ref.current = { ...this.refs.positions.ref.current, [graphId]: positions };
        this.dirty.add("positions");

        // Apply node/link removal
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

        // Invalidate cache for removed node, rebuild downstream
        this.refs.cache.ref.current = invalidateDownstream(this.refs.cache.ref.current, this.refs.nodes.ref.current, this.refs.links.ref.current, graphId, nodeId);
        for (const downstreamId of downstream) {
            if (this.refs.nodes.ref.current[graphId]?.[downstreamId]) {
                this.refs.cache.ref.current = rebuildDownstream(this.refs.cache.ref.current, this.refs.nodes.ref.current, this.refs.links.ref.current, this.refs.interfaces.ref.current, graphId, downstreamId);
            }
        }

        // Rebuild cache for Custom nodes in parent graphs
        const usersOfGraph = this.refs.users.ref.current[graphId] ?? [];
        for (const { node: customNodeId, scope } of usersOfGraph) {
            this.refs.cache.ref.current = rebuildDownstream(this.refs.cache.ref.current, this.refs.nodes.ref.current, this.refs.links.ref.current, this.refs.interfaces.ref.current, scope, customNodeId);
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

        // Call onPayloadChange hook
        const nodeType = NodeTypes.get(updated.type);
        if (nodeType.onPayloadChange) {
            const onPayloadChange = nodeType.onPayloadChange as (node: NodeDefinitions.NodeFor<NodeDefinitions.Any>, prev: Record<string, unknown>, graphId: string, ctx: NodeTypes.MethodContext) => void;
            onPayloadChange(updated, prev, graphId, this);
        }

        // Rebuild cache downstream
        this.refs.cache.ref.current = rebuildDownstream(this.refs.cache.ref.current, this.refs.nodes.ref.current, this.refs.links.ref.current, this.refs.interfaces.ref.current, graphId, nodeId);
        this.dirty.add("cache");

        // Also rebuild cache for Custom nodes in parent graphs
        const usersOfGraph = this.refs.users.ref.current[graphId] ?? [];
        if (usersOfGraph.length > 0) {
            for (const { node: customNodeId, scope } of usersOfGraph) {
                this.refs.cache.ref.current = rebuildDownstream(this.refs.cache.ref.current, this.refs.nodes.ref.current, this.refs.links.ref.current, this.refs.interfaces.ref.current, scope, customNodeId);
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
    }

    addNodeByType(graphId: string, nodeType: NodeTypes.Any, params: Partial<NodeDefinitions.PayloadTypeOf<NodeDefinitions.Generic>>, position?: XY): void {
        const newNode = nodeType.create(params as Partial<NodeDefinitions.PayloadTypeOf<NodeDefinitions.Any>>);
        const oldGraph = { nodes: this.refs.nodes.ref.current[graphId], links: this.refs.links.ref.current[graphId] };
        const { nodes } = ArcaneGraph.importNodes(oldGraph, [newNode]);

        this.refs.nodes.ref.current = { ...this.refs.nodes.ref.current, [graphId]: nodes };
        this.dirty.add("nodes");
        this.dirtyNodeGraphs.add(graphId);

        // Call onCreate hook
        if (nodeType.onCreate) {
            const onCreate = nodeType.onCreate as (node: NodeDefinitions.NodeFor<NodeDefinitions.Any>, graphId: string, ctx: NodeTypes.MethodContext) => void;
            onCreate(newNode, graphId, this);
        }

        // Set position
        this.refs.positions.ref.current = {
            ...this.refs.positions.ref.current,
            [graphId]: {
                ...this.refs.positions.ref.current[graphId],
                [newNode.id]: position ?? { x: 0, y: 0 },
            },
        };
        this.dirty.add("positions");
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

        // Rebuild cache
        this.refs.cache.ref.current = rebuildDownstream(this.refs.cache.ref.current, this.refs.nodes.ref.current, this.refs.links.ref.current, this.refs.interfaces.ref.current, graphId, nodeId);
        this.dirty.add("cache");
    }

    // ─── Internal helpers ────────────────────────────────────────────────

    private fireOnConnect(graphId: string, nodeId: string, linkId: string, direction: "in" | "out"): void {
        const node = this.getNode(graphId, nodeId);
        if (!node) return;
        const nodeType = NodeTypes.get(node.type);
        if (nodeType.onConnect) {
            const onConnect = nodeType.onConnect as (node: NodeDefinitions.NodeFor<NodeDefinitions.Any>, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext) => void;
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
                        const onDisconnect = fromType.onDisconnect as (node: NodeDefinitions.NodeFor<NodeDefinitions.Any>, link: ArcaneGraph.Link, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext) => void;
                        onDisconnect(fromNode, link, "out", graphId, this);
                    }
                }
            }
            if (link.toNode !== skipNodeId) {
                const toNode = this.getNode(graphId, link.toNode);
                if (toNode) {
                    const toType = NodeTypes.get(toNode.type);
                    if (toType.onDisconnect) {
                        const onDisconnect = toType.onDisconnect as (node: NodeDefinitions.NodeFor<NodeDefinitions.Any>, link: ArcaneGraph.Link, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext) => void;
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
                const onRefresh = neighborType.onRefreshRequest as (node: NodeDefinitions.NodeFor<NodeDefinitions.Any>, socketId: string, side: "in" | "out", reason: NodeTypes.RefreshReason, graphId: string, ctx: NodeTypes.MethodContext) => void;
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
                    const onRefresh = neighborType.onRefreshRequest as (node: NodeDefinitions.NodeFor<NodeDefinitions.Any>, socketId: string, side: "in" | "out", reason: NodeTypes.RefreshReason, graphId: string, ctx: NodeTypes.MethodContext) => void;
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
