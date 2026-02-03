import { nanoid } from "nanoid";
import { NODETYPE_REGISTRY } from "../../definitions";

export namespace ArcaneGraph {
    // aliases just for clarity of purpose when used
    export type NodeId = string;
    export type LinkId = string;
    export type SocketId = string;
    export type SubgraphId = string;

    export type NodeOf<P> = {
        id: NodeId;
        type: keyof typeof NODETYPE_REGISTRY;
        // parent: NodeId | null; // for use with containers - which container, if any, do I belong to? - unsure if this is a good idea, or if I should just use spacial stuff
        // children: NodeId[]; // for user with containers - which nodes are contained by this container? - unsure if this is a good idea, or if I should just use spacial stuff
        in: {
            [key: SocketId]: LinkId | null;
        };
        out: {
            [key: SocketId]: LinkId[];
        };
        payload: P; // could contain anything - for layers, it might be a list of layers (with socketIds used in "in", blend modes, etc), for circles it might be parameters such as radius, for example.
    };

    export type Link = {
        id: LinkId;
        type: string;
        fromNode: NodeId;
        toNode: NodeId;
        fromSocket: SocketId;
        toSocket: SocketId;
    };

    type RemovedOf<N> = {
        nodes: NodeOf<N>[];
        links: Link[];
    };

    /*
    // kicking this can down the road
    export type SubgraphOf<N> = {
        nodes: { [key: NodeId]: NodeOf<N> };
        links: { [key: LinkId]: Link };
        users: { node: NodeId; graph: SubgraphId | null }[];
        inputs: NodeId[];
        outputs: NodeId[];
    };
    */

    export type GraphOf<N> = {
        nodes: { [key: NodeId]: NodeOf<N> };
        links: { [key: LinkId]: Link };
        // subgraphs: { [key: SubgraphId]: SubgraphOf<N> }; // kicking this can down the road a little
    };

    const generateId = nanoid;

    //#region Util
    type BulkAdd<T> = T[] | { [key: string]: T };
    const normalizeBulk = <T>(bulk: BulkAdd<T>): { [key: string]: T } => {
        if (Array.isArray(bulk)) {
            return bulk.reduce<{ [key: string]: T }>((acc, each) => {
                acc[generateId()] = each;
                return acc;
            }, {});
        }
        return bulk;
    };
    type ListOf<T extends string> = T | T[] | Set<T>;
    const normalizeList = <T extends string>(list: ListOf<T>): Set<T> => {
        return list instanceof Set ? list : new Set<T>(Array.isArray(list) ? list : [list]);
    };
    type Setter<T, R = T> = (previous: T) => R;
    //#endregion

    //#region validation
    export const hasNode = <N>(graph: GraphOf<N>, id: NodeId) => id in graph.nodes;
    export const hasLink = <N>(graph: GraphOf<N>, id: LinkId) => id in graph.links;
    export const hasSocket = <N>(graph: GraphOf<N>, node: NodeId, socket: SocketId) => node in graph.nodes && (socket in graph.nodes[node].in || socket in graph.nodes[node].out);
    //#endregion

    //#region Query
    export const nodeCount = <N>(graph: GraphOf<N>) => Object.keys(graph.nodes).length;
    export const linkCount = <N>(graph: GraphOf<N>) => Object.keys(graph.links).length;

    //#region Query/Nodes

    export const nodesWhere = <N>(graph: GraphOf<N>, filter: (node: NodeOf<N>) => boolean): NodeId[] => Object.keys(graph.nodes).filter((id) => filter(graph.nodes[id]));

    // todo: Traversal
    // export const wideDownstreamOf = <N>(graph: GraphOf<N>, id: NodeId, socketId: SocketId | null = null): NodeId[] => {};
    // export const deepDownstreamOf = <N>(graph: GraphOf<N>, id: NodeId, socketId: SocketId | null = null): NodeId[] => {};
    // export const wideUpstreamOf = <N>(graph: GraphOf<N>, id: NodeId, socketId: SocketId | null = null): NodeId[] => {};
    // export const deepUpstreamOf = <N>(graph: GraphOf<N>, id: NodeId, socketId: SocketId | null = null): NodeId[] => {};

    //#endregion
    //#region Query/Links
    export const linksTo = <N>(graph: GraphOf<N>, node: NodeId, socket: SocketId | null = null): LinkId[] => {
        if (!(node in graph.nodes)) return [];
        const n = graph.nodes[node];
        if (socket !== null) {
            const linkId = n.in[socket];
            return linkId !== null && linkId !== undefined ? [linkId] : [];
        }
        const results: LinkId[] = [];
        for (const linkId of Object.values(n.in)) {
            if (linkId !== null) results.push(linkId);
        }
        return results;
    };
    export const linksFrom = <N>(graph: GraphOf<N>, node: NodeId, socket: SocketId | null = null): LinkId[] => {
        if (!(node in graph.nodes)) return [];
        const n = graph.nodes[node];
        if (socket !== null) {
            return n.out[socket] ?? [];
        }
        const results: LinkId[] = [];
        for (const linkIds of Object.values(n.out)) {
            for (const linkId of linkIds) results.push(linkId);
        }
        return results;
    };
    export const linksOf = <N>(graph: GraphOf<N>, node: NodeId, socket: SocketId | null = null): LinkId[] => {
        if (!(node in graph.nodes)) return [];
        const n = graph.nodes[node];
        const results: LinkId[] = [];
        if (socket !== null) {
            const inLink = n.in[socket];
            if (inLink !== null && inLink !== undefined) results.push(inLink);
            if (socket in n.out) {
                for (const linkId of n.out[socket]) results.push(linkId);
            }
            return results;
        }
        for (const linkId of Object.values(n.in)) {
            if (linkId !== null) results.push(linkId);
        }
        for (const linkIds of Object.values(n.out)) {
            for (const linkId of linkIds) results.push(linkId);
        }
        return results;
    };
    export const directedLinksBetween = <N>(graph: GraphOf<N>, from: NodeId, to: NodeId): LinkId[] => {
        if (!(from in graph.nodes)) return [];
        const results: LinkId[] = [];
        for (const linkIds of Object.values(graph.nodes[from].out)) {
            for (const linkId of linkIds) {
                if (graph.links[linkId].toNode === to) results.push(linkId);
            }
        }
        return results;
    };
    export const linksBetween = <N>(graph: GraphOf<N>, nodeA: NodeId, nodeB: NodeId): LinkId[] => {
        if (!(nodeA in graph.nodes) || !(nodeB in graph.nodes)) return [];
        const results: LinkId[] = [];
        for (const linkIds of Object.values(graph.nodes[nodeA].out)) {
            for (const linkId of linkIds) {
                if (graph.links[linkId].toNode === nodeB) results.push(linkId);
            }
        }
        for (const linkIds of Object.values(graph.nodes[nodeB].out)) {
            for (const linkId of linkIds) {
                if (graph.links[linkId].toNode === nodeA) results.push(linkId);
            }
        }
        return results;
    };
    export const linksWhere = <N>(graph: GraphOf<N>, filter: (link: Link) => boolean): LinkId[] => Object.keys(graph.links).filter((id) => filter(graph.links[id]));

    //#endregion
    //#endregion

    //#region Modification
    //#region Modification/Nodes
    export const addNodes = <N>(graph: GraphOf<N>, payload: BulkAdd<Omit<NodeOf<N>, "id">>): [graph: GraphOf<N>, newIds: NodeId[]] => {
        const normalized = normalizeBulk(payload);
        const newIds: NodeId[] = [];
        const newNodes = { ...graph.nodes };
        for (const [id, data] of Object.entries(normalized)) {
            if (id in newNodes) continue;
            newNodes[id] = { ...data, id } as NodeOf<N>;
            newIds.push(id);
        }
        if (newIds.length === 0) return [graph, []];
        return [{ ...graph, nodes: newNodes }, newIds];
    };
    export const addNode = <N>(graph: GraphOf<N>, payload: Omit<NodeOf<N>, "id">, id: NodeId = generateId()): [graph: GraphOf<N>, newId: NodeId | null] => {
        const [newGraph, newIds] = addNodes(graph, { [id]: payload });
        return [newGraph, newIds.length > 0 ? newIds[0] : null];
    };
    export const removeNodes = <N>(graph: GraphOf<N>, ids: ListOf<NodeId>): [graph: GraphOf<N>, removed: RemovedOf<N>] => {
        const idSet = normalizeList(ids);
        const removedNodes: NodeOf<N>[] = [];
        const removedLinks: Link[] = [];
        const removedLinkIds = new Set<LinkId>();

        // collect nodes to remove and their connected links
        for (const id of idSet) {
            if (!(id in graph.nodes)) continue;
            const node = graph.nodes[id];
            removedNodes.push(node);
            for (const linkId of Object.values(node.in)) {
                if (linkId !== null) removedLinkIds.add(linkId);
            }
            for (const linkIds of Object.values(node.out)) {
                for (const linkId of linkIds) removedLinkIds.add(linkId);
            }
        }

        if (removedNodes.length === 0) return [graph, { nodes: [], links: [] }];

        // collect removed link objects
        for (const linkId of removedLinkIds) {
            removedLinks.push(graph.links[linkId]);
        }

        // build new nodes dict, excluding removed nodes
        const newNodes: typeof graph.nodes = {};
        for (const [id, node] of Object.entries(graph.nodes)) {
            if (idSet.has(id)) continue;
            // check if this node has any references to removed links
            let needsPatch = false;
            for (const linkId of Object.values(node.in)) {
                if (linkId !== null && removedLinkIds.has(linkId)) {
                    needsPatch = true;
                    break;
                }
            }
            if (!needsPatch) {
                for (const linkIds of Object.values(node.out)) {
                    for (const linkId of linkIds) {
                        if (removedLinkIds.has(linkId)) {
                            needsPatch = true;
                            break;
                        }
                    }
                    if (needsPatch) break;
                }
            }
            if (!needsPatch) {
                newNodes[id] = node;
                continue;
            }
            // patch socket references
            const newIn: typeof node.in = {};
            for (const [socketId, linkId] of Object.entries(node.in)) {
                newIn[socketId] = linkId !== null && removedLinkIds.has(linkId) ? null : linkId;
            }
            const newOut: typeof node.out = {};
            for (const [socketId, linkIds] of Object.entries(node.out)) {
                newOut[socketId] = linkIds.filter((linkId) => !removedLinkIds.has(linkId));
            }
            newNodes[id] = { ...node, in: newIn, out: newOut };
        }

        // build new links dict, excluding removed links
        const newLinks: typeof graph.links = {};
        for (const [id, link] of Object.entries(graph.links)) {
            if (!removedLinkIds.has(id)) newLinks[id] = link;
        }

        return [
            { ...graph, nodes: newNodes, links: newLinks },
            { nodes: removedNodes, links: removedLinks },
        ];
    };

    export const updateNodesWith = <N>(graph: GraphOf<N>, setter: Setter<NodeOf<N>, N | undefined>, ids?: ListOf<NodeId>): [graph: GraphOf<N>, affected: NodeId[]] => {
        const targets = ids !== undefined ? normalizeList(ids) : null;
        const affected: NodeId[] = [];
        let newNodes: typeof graph.nodes | null = null;
        for (const [id, node] of Object.entries(graph.nodes)) {
            if (targets !== null && !targets.has(id)) continue;
            const newPayload = setter(node);
            if (newPayload === undefined) continue;
            if (newNodes === null) newNodes = { ...graph.nodes };
            newNodes[id] = { ...node, payload: newPayload };
            affected.push(id);
        }
        if (newNodes === null) return [graph, []];
        return [{ ...graph, nodes: newNodes }, affected];
    };
    export const updateNodes = <N>(graph: GraphOf<N>, payloads: { [key: NodeId]: N }): [graph: GraphOf<N>, affected: NodeId[]] => {
        return updateNodesWith(graph, (node) => (node.id in payloads ? payloads[node.id] : undefined), Object.keys(payloads) as NodeId[]);
    };
    export const updateNodeWith = <N>(graph: GraphOf<N>, id: NodeId, setter: Setter<NodeOf<N>, N | undefined>): [graph: GraphOf<N>, affected: NodeId | null] => {
        const [newGraph, affected] = updateNodesWith(graph, setter, id);
        return [newGraph, affected.length > 0 ? affected[0] : null];
    };
    export const updateNode = <N>(graph: GraphOf<N>, id: NodeId, payload: N): [graph: GraphOf<N>, affected: NodeId | null] => {
        const [newGraph, affected] = updateNodesWith(graph, () => payload, id);
        return [newGraph, affected.length > 0 ? affected[0] : null];
    };

    export const isolate = <N>(graph: GraphOf<N>, id: ListOf<NodeId>): [graph: GraphOf<N>, removed: RemovedOf<N>] => {
        const nodeIds = normalizeList(id);
        const linkIds: LinkId[] = [];
        for (const nodeId of nodeIds) {
            if (!(nodeId in graph.nodes)) continue;
            const node = graph.nodes[nodeId];
            for (const linkId of Object.values(node.in)) {
                if (linkId !== null) linkIds.push(linkId);
            }
            for (const arr of Object.values(node.out)) {
                for (const linkId of arr) linkIds.push(linkId);
            }
        }
        return removeLinks(graph, linkIds);
    };
    export const isolateUpstream = <N>(graph: GraphOf<N>, id: ListOf<NodeId>): [graph: GraphOf<N>, removed: RemovedOf<N>] => {
        const nodeIds = normalizeList(id);
        const linkIds: LinkId[] = [];
        for (const nodeId of nodeIds) {
            if (!(nodeId in graph.nodes)) continue;
            for (const linkId of Object.values(graph.nodes[nodeId].in)) {
                if (linkId !== null) linkIds.push(linkId);
            }
        }
        return removeLinks(graph, linkIds);
    };
    export const isolateDownstream = <N>(graph: GraphOf<N>, id: ListOf<NodeId>): [graph: GraphOf<N>, removed: RemovedOf<N>] => {
        const nodeIds = normalizeList(id);
        const linkIds: LinkId[] = [];
        for (const nodeId of nodeIds) {
            if (!(nodeId in graph.nodes)) continue;
            for (const arr of Object.values(graph.nodes[nodeId].out)) {
                for (const linkId of arr) linkIds.push(linkId);
            }
        }
        return removeLinks(graph, linkIds);
    };
    export const unplug = <N>(graph: GraphOf<N>, id: NodeId, socket: ListOf<SocketId>): [graph: GraphOf<N>, removed: RemovedOf<N>] => {
        if (!(id in graph.nodes)) return [graph, { nodes: [], links: [] }];
        const sockets = normalizeList(socket);
        const node = graph.nodes[id];
        const linkIds: LinkId[] = [];
        for (const socketId of sockets) {
            if (socketId in node.in) {
                const linkId = node.in[socketId];
                if (linkId !== null) linkIds.push(linkId);
            }
            if (socketId in node.out) {
                for (const linkId of node.out[socketId]) linkIds.push(linkId);
            }
        }
        return removeLinks(graph, linkIds);
    };
    export const unplugMany = <N>(graph: GraphOf<N>, data: { [key: NodeId]: ListOf<SocketId> }): [graph: GraphOf<N>, removed: RemovedOf<N>] => {
        const linkIds: LinkId[] = [];
        for (const [nodeId, sockets] of Object.entries(data)) {
            if (!(nodeId in graph.nodes)) continue;
            const socketSet = normalizeList(sockets);
            const node = graph.nodes[nodeId];
            for (const socketId of socketSet) {
                if (socketId in node.in) {
                    const linkId = node.in[socketId];
                    if (linkId !== null) linkIds.push(linkId);
                }
                if (socketId in node.out) {
                    for (const linkId of node.out[socketId]) linkIds.push(linkId);
                }
            }
        }
        return removeLinks(graph, linkIds);
    };
    //#endregion
    //#region Modification/Links
    const doConnect = <N>(graph: GraphOf<N>, data: BulkAdd<Omit<Link, "id">>, displace: boolean): [graph: GraphOf<N>, newIds: LinkId[], removed: RemovedOf<N>] => {
        const normalized = normalizeBulk(data);
        const newIds: LinkId[] = [];
        const displacedLinks: Link[] = [];
        let newNodes: typeof graph.nodes | null = null;
        let newLinks: typeof graph.links | null = null;

        for (const [id, entry] of Object.entries(normalized)) {
            // validate nodes exist
            if (!(entry.fromNode in graph.nodes) || !(entry.toNode in graph.nodes)) continue;
            // skip duplicate ids
            if (id in graph.links || (newLinks !== null && id in newLinks)) continue;

            // resolve the current toNode (may have been patched by a previous iteration)
            const toNode = newNodes !== null && entry.toNode in newNodes ? newNodes[entry.toNode] : graph.nodes[entry.toNode];
            const existing = toNode.in[entry.toSocket];

            if (existing !== null && existing !== undefined) {
                if (!displace) continue; // strict mode: skip if occupied
                // displace the existing link
                const displacedLink = newLinks !== null && existing in newLinks ? newLinks[existing] : graph.links[existing];
                if (displacedLink) {
                    displacedLinks.push(displacedLink);
                    if (newLinks === null) newLinks = { ...graph.links };
                    delete newLinks[existing];
                    // also patch the displaced link's fromNode out socket
                    const displacedFrom = newNodes !== null && displacedLink.fromNode in newNodes ? newNodes[displacedLink.fromNode] : graph.nodes[displacedLink.fromNode];
                    if (displacedFrom) {
                        if (newNodes === null) newNodes = { ...graph.nodes };
                        const outArr = displacedFrom.out[displacedLink.fromSocket];
                        newNodes[displacedLink.fromNode] = {
                            ...displacedFrom,
                            out: { ...displacedFrom.out, [displacedLink.fromSocket]: outArr ? outArr.filter((lid) => lid !== existing) : [] },
                        };
                    }
                }
            }

            // create the new link
            const link: Link = { ...entry, id };
            if (newLinks === null) newLinks = { ...graph.links };
            newLinks[id] = link;

            // wire toNode.in
            if (newNodes === null) newNodes = { ...graph.nodes };
            const currentToNode = newNodes[entry.toNode] ?? graph.nodes[entry.toNode];
            newNodes[entry.toNode] = { ...currentToNode, in: { ...currentToNode.in, [entry.toSocket]: id } };

            // wire fromNode.out
            const currentFromNode = newNodes[entry.fromNode] ?? graph.nodes[entry.fromNode];
            const outArr = currentFromNode.out[entry.fromSocket];
            newNodes[entry.fromNode] = {
                ...currentFromNode,
                out: { ...currentFromNode.out, [entry.fromSocket]: outArr ? [...outArr, id] : [id] },
            };

            newIds.push(id);
        }

        if (newIds.length === 0 && displacedLinks.length === 0) return [graph, [], { nodes: [], links: [] }];
        return [{ ...graph, nodes: newNodes ?? graph.nodes, links: newLinks ?? graph.links }, newIds, { nodes: [], links: displacedLinks }];
    };

    export const connectMany = <N>(graph: GraphOf<N>, data: BulkAdd<Omit<Link, "id">>): [graph: GraphOf<N>, newIds: LinkId[]] => {
        const [g, n] = doConnect(graph, data, false);
        return [g, n];
    };
    export const reconnectMany = <N>(graph: GraphOf<N>, data: BulkAdd<Omit<Link, "id">>): [graph: GraphOf<N>, newIds: LinkId[], removed: RemovedOf<N>] => {
        return doConnect(graph, data, true);
    };
    export const connect = <N>(
        graph: GraphOf<N>,
        fromNode: NodeId,
        toNode: NodeId,
        fromSocket: SocketId,
        toSocket: SocketId,
        type: string,
        id: LinkId = generateId(),
    ): [graph: GraphOf<N>, newId: LinkId | null] => {
        const [newGraph, newIds] = connectMany(graph, { [id]: { fromNode, toNode, fromSocket, toSocket, type } });
        return [newGraph, newIds.length > 0 ? newIds[0] : null];
    };
    export const reconnect = <N>(
        graph: GraphOf<N>,
        fromNode: NodeId,
        toNode: NodeId,
        fromSocket: SocketId,
        toSocket: SocketId,
        type: string,
        id: LinkId = generateId(),
    ): [graph: GraphOf<N>, newId: LinkId | null, removed: RemovedOf<N>] => {
        const [newGraph, newIds, removed] = reconnectMany(graph, { [id]: { fromNode, toNode, fromSocket, toSocket, type } });
        return [newGraph, newIds.length > 0 ? newIds[0] : null, removed];
    };
    export const disconnectBetween = <N>(
        graph: GraphOf<N>,
        nodeA: NodeId,
        nodeB: NodeId,
        nodeASocket: SocketId | null = null,
        nodeBSocket: SocketId | null = null,
    ): [graph: GraphOf<N>, removed: RemovedOf<N>] => {
        const linkIds: LinkId[] = [];
        // A → B
        if (nodeA in graph.nodes) {
            const a = graph.nodes[nodeA];
            const sources = nodeASocket !== null ? (nodeASocket in a.out ? [nodeASocket] : []) : Object.keys(a.out);
            for (const sid of sources) {
                for (const linkId of a.out[sid]) {
                    const link = graph.links[linkId];
                    if (link.toNode !== nodeB) continue;
                    if (nodeBSocket !== null && link.toSocket !== nodeBSocket) continue;
                    linkIds.push(linkId);
                }
            }
        }
        // B → A
        if (nodeB in graph.nodes) {
            const b = graph.nodes[nodeB];
            const sources = nodeBSocket !== null ? (nodeBSocket in b.out ? [nodeBSocket] : []) : Object.keys(b.out);
            for (const sid of sources) {
                for (const linkId of b.out[sid]) {
                    const link = graph.links[linkId];
                    if (link.toNode !== nodeA) continue;
                    if (nodeASocket !== null && link.toSocket !== nodeASocket) continue;
                    linkIds.push(linkId);
                }
            }
        }
        return removeLinks(graph, linkIds);
    };
    export const disconnectUpstream = <N>(graph: GraphOf<N>, node: NodeId, other: NodeId | null = null, socket: SocketId | null = null): [graph: GraphOf<N>, removed: RemovedOf<N>] => {
        if (!(node in graph.nodes)) return [graph, { nodes: [], links: [] }];
        const n = graph.nodes[node];
        const linkIds: LinkId[] = [];
        const sockets = socket !== null ? (socket in n.in ? [socket] : []) : Object.keys(n.in);
        for (const sid of sockets) {
            const linkId = n.in[sid];
            if (linkId === null) continue;
            if (other !== null && graph.links[linkId].fromNode !== other) continue;
            linkIds.push(linkId);
        }
        return removeLinks(graph, linkIds);
    };
    export const disconnectDownstream = <N>(graph: GraphOf<N>, node: NodeId, other: NodeId | null = null, socket: SocketId | null = null): [graph: GraphOf<N>, removed: RemovedOf<N>] => {
        if (!(node in graph.nodes)) return [graph, { nodes: [], links: [] }];
        const n = graph.nodes[node];
        const linkIds: LinkId[] = [];
        const sockets = socket !== null ? (socket in n.out ? [socket] : []) : Object.keys(n.out);
        for (const sid of sockets) {
            for (const linkId of n.out[sid]) {
                if (other !== null && graph.links[linkId].toNode !== other) continue;
                linkIds.push(linkId);
            }
        }
        return removeLinks(graph, linkIds);
    };
    export const removeLinks = <N>(graph: GraphOf<N>, id: ListOf<LinkId>): [graph: GraphOf<N>, removed: RemovedOf<N>] => {
        const idSet = normalizeList(id);
        const removedLinks: Link[] = [];

        // collect links that actually exist
        for (const linkId of idSet) {
            if (linkId in graph.links) removedLinks.push(graph.links[linkId]);
        }
        if (removedLinks.length === 0) return [graph, { nodes: [], links: [] }];

        // build new links dict
        const newLinks: typeof graph.links = {};
        for (const [lid, link] of Object.entries(graph.links)) {
            if (!idSet.has(lid)) newLinks[lid] = link;
        }

        // patch affected nodes
        let newNodes: typeof graph.nodes | null = null;
        for (const link of removedLinks) {
            // patch the toNode's in socket
            if (link.toNode in graph.nodes) {
                if (newNodes === null) newNodes = { ...graph.nodes };
                const toNode = newNodes[link.toNode];
                newNodes[link.toNode] = {
                    ...toNode,
                    in: { ...toNode.in, [link.toSocket]: null },
                };
            }
            // patch the fromNode's out socket
            if (link.fromNode in graph.nodes) {
                if (newNodes === null) newNodes = { ...graph.nodes };
                const fromNode = newNodes[link.fromNode];
                const existing = fromNode.out[link.fromSocket];
                newNodes[link.fromNode] = {
                    ...fromNode,
                    out: { ...fromNode.out, [link.fromSocket]: existing ? existing.filter((lid) => !idSet.has(lid)) : [] },
                };
            }
        }

        return [
            { ...graph, nodes: newNodes ?? graph.nodes, links: newLinks },
            { nodes: [], links: removedLinks },
        ];
    };

    //#endregion
    //#region Modification/Sockets
    type SocketData = { in: ListOf<SocketId>; out: ListOf<SocketId> } | { in: ListOf<SocketId> } | { out: ListOf<SocketId> };
    export const addSockets = <N>(graph: GraphOf<N>, id: NodeId, sockets: SocketData): [graph: GraphOf<N>, affected: NodeId | null] => {
        if (!(id in graph.nodes)) return [graph, null];
        const node = graph.nodes[id];
        let newIn: typeof node.in | null = null;
        let newOut: typeof node.out | null = null;
        if ("in" in sockets) {
            const inSet = normalizeList(sockets.in);
            for (const sid of inSet) {
                if (sid in node.in) continue;
                if (newIn === null) newIn = { ...node.in };
                newIn[sid] = null;
            }
        }
        if ("out" in sockets) {
            const outSet = normalizeList(sockets.out);
            for (const sid of outSet) {
                if (sid in node.out) continue;
                if (newOut === null) newOut = { ...node.out };
                newOut[sid] = [];
            }
        }
        if (newIn === null && newOut === null) return [graph, null];
        const newNode = { ...node, in: newIn ?? node.in, out: newOut ?? node.out };
        return [{ ...graph, nodes: { ...graph.nodes, [id]: newNode } }, id];
    };
    export const removeSockets = <N>(graph: GraphOf<N>, id: NodeId, sockets: SocketData): [graph: GraphOf<N>, affected: NodeId | null, removed: RemovedOf<N>] => {
        if (!(id in graph.nodes)) return [graph, null, { nodes: [], links: [] }];
        const node = graph.nodes[id];
        // collect links to remove from the targeted sockets
        const linkIds: LinkId[] = [];
        const inToRemove = "in" in sockets ? normalizeList(sockets.in) : null;
        const outToRemove = "out" in sockets ? normalizeList(sockets.out) : null;
        if (inToRemove) {
            for (const sid of inToRemove) {
                if (sid in node.in && node.in[sid] !== null) linkIds.push(node.in[sid]!);
            }
        }
        if (outToRemove) {
            for (const sid of outToRemove) {
                if (sid in node.out) {
                    for (const linkId of node.out[sid]) linkIds.push(linkId);
                }
            }
        }
        // remove links first
        let g = graph;
        let removed: RemovedOf<N> = { nodes: [], links: [] };
        if (linkIds.length > 0) {
            [g, removed] = removeLinks(g, linkIds);
        }
        // now remove the socket slots themselves
        const current = g.nodes[id];
        let changed = false;
        let newIn = current.in;
        let newOut = current.out;
        if (inToRemove) {
            newIn = {};
            for (const [sid, val] of Object.entries(current.in)) {
                if (inToRemove.has(sid)) {
                    changed = true;
                    continue;
                }
                newIn[sid] = val;
            }
        }
        if (outToRemove) {
            newOut = {};
            for (const [sid, val] of Object.entries(current.out)) {
                if (outToRemove.has(sid)) {
                    changed = true;
                    continue;
                }
                newOut[sid] = val;
            }
        }
        if (!changed && linkIds.length === 0) return [graph, null, removed];
        const newNode = { ...current, in: newIn, out: newOut };
        return [{ ...g, nodes: { ...g.nodes, [id]: newNode } }, id, removed];
    };
    // if sockets.in is provided, keep the in sockets listed in sockets.in, remove the rest
    // if sockets.out is provided, keep the out sockets listed in sockets.out, remove the rest
    export const alterSockets = <N>(graph: GraphOf<N>, id: NodeId, sockets: SocketData): [graph: GraphOf<N>, affected: NodeId | null, removed: RemovedOf<N>] => {
        if (!(id in graph.nodes)) return [graph, null, { nodes: [], links: [] }];
        const node = graph.nodes[id];
        // invert the keep-list into a remove-list
        const toRemove: Partial<{ in: SocketId[]; out: SocketId[] }> = {};
        if ("in" in sockets) {
            const keepIn = normalizeList(sockets.in);
            const removeIn: SocketId[] = [];
            for (const sid of Object.keys(node.in)) {
                if (!keepIn.has(sid)) removeIn.push(sid);
            }
            if (removeIn.length > 0) toRemove.in = removeIn;
        }
        if ("out" in sockets) {
            const keepOut = normalizeList(sockets.out);
            const removeOut: SocketId[] = [];
            for (const sid of Object.keys(node.out)) {
                if (!keepOut.has(sid)) removeOut.push(sid);
            }
            if (removeOut.length > 0) toRemove.out = removeOut;
        }
        if (!toRemove.in && !toRemove.out) return [graph, null, { nodes: [], links: [] }];
        return removeSockets(graph, id, toRemove as SocketData);
    };

    //#endregion
    //#endregion
}
