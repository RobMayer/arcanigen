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

    export type LinkOf<P> = {
        id: LinkId;
        fromNode: NodeId;
        toNode: NodeId;
        fromSocket: SocketId;
        toSocket: SocketId;
        payload: P;
    };

    type RemovedOf<N, L> = {
        nodes: NodeOf<N>[];
        links: LinkOf<L>[];
    };

    /*
    // kicking this can down the road 
    export type SubgraphOf<N, L> = {
        nodes: { [key: NodeId]: NodeOf<N> };
        links: { [key: LinkId]: LinkOf<L> };
        users: { node: NodeId; graph: SubgraphId | null }[];
        inputs: NodeId[];
        outputs: NodeId[];
    };
    */

    export type GraphOf<N, L> = {
        nodes: { [key: NodeId]: NodeOf<N> };
        links: { [key: LinkId]: LinkOf<L> };
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
    export const hasNode = <N, L>(graph: GraphOf<N, L>, id: NodeId) => id in graph.nodes;
    export const hasLink = <N, L>(graph: GraphOf<N, L>, id: LinkId) => id in graph.links;
    export const hasSocket = <N, L>(graph: GraphOf<N, L>, node: NodeId, socket: SocketId) => node in graph.nodes && (socket in graph.nodes[node].in || socket in graph.nodes[node].out);
    //#endregion

    //#region Query
    export const nodeCount = <N, L>(graph: GraphOf<N, L>) => Object.keys(graph.nodes).length;
    export const linkCount = <N, L>(graph: GraphOf<N, L>) => Object.keys(graph.links).length;

    //#region Query/Nodes

    export const nodesWhere = <N, L>(graph: GraphOf<N, L>, filter: (node: NodeOf<N>) => boolean): NodeId[] => {};

    // todo: Traversal
    // export const wideDownstreamOf = <N, L>(graph: GraphOf<N, L>, id: NodeId, socketId: SocketId | null = null): NodeId[] => {};
    // export const deepDownstreamOf = <N, L>(graph: GraphOf<N, L>, id: NodeId, socketId: SocketId | null = null): NodeId[] => {};
    // export const wideUpstreamOf = <N, L>(graph: GraphOf<N, L>, id: NodeId, socketId: SocketId | null = null): NodeId[] => {};
    // export const deepUpstreamOf = <N, L>(graph: GraphOf<N, L>, id: NodeId, socketId: SocketId | null = null): NodeId[] => {};

    //#endregion
    //#region Query/Links
    export const linksBetween = <N, L>(graph: GraphOf<N, L>, nodeA: NodeId, nodeB: NodeId): LinkId[] => {};
    export const directedLinksBetween = <N, L>(graph: GraphOf<N, L>, from: NodeId, to: NodeId): LinkId[] => {};
    export const linksOf = <N, L>(graph: GraphOf<N, L>, node: NodeId, socket: SocketId | null = null): LinkId[] => {};
    export const linksTo = <N, L>(graph: GraphOf<N, L>, node: NodeId, socket: SocketId | null = null): LinkId[] => {};
    export const linksFrom = <N, L>(graph: GraphOf<N, L>, node: NodeId, socket: SocketId | null = null): LinkId[] => {};
    export const linksWhere = <N, L>(graph: GraphOf<N, L>, filter: (node: LinkOf<L>) => boolean): LinkId[] => {};

    //#endregion
    //#endregion

    //#region Modification
    //#region Modification/Nodes
    export const addNode = <N, L>(graph: GraphOf<N, L>, payload: Omit<NodeOf<N>, "id">, id: NodeId = generateId()): [graph: GraphOf<N, L>, newId: NodeId | null] => {};
    export const addNodes = <N, L>(graph: GraphOf<N, L>, payload: BulkAdd<Omit<NodeOf<N>, "id">>): [graph: GraphOf<N, L>, newIds: NodeId[]] => {};
    export const removeNodes = <N, L>(graph: GraphOf<N, L>, ids: ListOf<NodeId>): [graph: GraphOf<N, L>, removed: RemovedOf<N, L>] => {};

    export const updateNode = <N, L>(graph: GraphOf<N, L>, id: NodeId, payload: N): [graph: GraphOf<N, L>, affected: NodeId | null] => {};
    export const updateNodeWith = <N, L>(graph: GraphOf<N, L>, id: NodeId, setter: Setter<NodeOf<N>, N | undefined>): [graph: GraphOf<N, L>, affected: NodeId | null] => {};
    export const updateNodes = <N, L>(graph: GraphOf<N, L>, payloads: { [key: NodeId]: N }): [graph: GraphOf<N, L>, affected: NodeId[]] => {};
    export const updateNodesWith = <N, L>(graph: GraphOf<N, L>, setter: Setter<NodeOf<N>, N | undefined>, ids?: ListOf<NodeId>): [graph: GraphOf<N, L>, affected: NodeId[]] => {};

    export const isolate = <N, L>(graph: GraphOf<N, L>, id: ListOf<NodeId>): [graph: GraphOf<N, L>, removed: RemovedOf<N, L>] => {};
    export const unplug = <N, L>(graph: GraphOf<N, L>, id: NodeId, socket: ListOf<SocketId>): [graph: GraphOf<N, L>, removed: RemovedOf<N, L>] => {};
    export const unplugMany = <N, L>(graph: GraphOf<N, L>, data: { [key: NodeId]: ListOf<SocketId> }): [graph: GraphOf<N, L>, removed: RemovedOf<N, L>] => {};
    export const isolateUpstream = <N, L>(graph: GraphOf<N, L>, id: ListOf<NodeId>): [graph: GraphOf<N, L>, removed: RemovedOf<N, L>] => {};
    export const isolateDownstream = <N, L>(graph: GraphOf<N, L>, id: ListOf<NodeId>): [graph: GraphOf<N, L>, removed: RemovedOf<N, L>] => {};
    //#endregion
    //#region Modification/Links
    export const connect = <N, L>(
        graph: GraphOf<N, L>,
        fromNode: NodeId,
        toNode: NodeId,
        fromSocket: SocketId,
        toSocket: SocketId,
        payload: L,
        id: LinkId = generateId(),
    ): [graph: GraphOf<N, L>, newId: LinkId | null, removed: RemovedOf<N, L>] => {};
    export const connectMany = <N, L>(graph: GraphOf<N, L>, data: BulkAdd<Omit<LinkOf<L>, "id">>): [graph: GraphOf<N, L>, newIds: LinkId[], removed: RemovedOf<N, L>] => {};
    export const disconnectBetween = <N, L>(
        graph: GraphOf<N, L>,
        fromNode: NodeId,
        toNode: NodeId,
        fromSocket: SocketId | null = null,
        toSocket: SocketId | null = null,
    ): [graph: GraphOf<N, L>, removed: RemovedOf<N, L>] => {};
    export const disconnectUpstream = <N, L>(graph: GraphOf<N, L>, node: NodeId, other: NodeId | null = null, socket: SocketId | null = null): [graph: GraphOf<N, L>, removed: RemovedOf<N, L>] => {};
    export const disconnectDownstream = <N, L>(graph: GraphOf<N, L>, node: NodeId, other: NodeId | null = null, socket: SocketId | null = null): [graph: GraphOf<N, L>, removed: RemovedOf<N, L>] => {};
    export const removeLinks = <N, L>(graph: GraphOf<N, L>, id: ListOf<LinkId>): [graph: GraphOf<N, L>, removed: RemovedOf<N, L>] => {};

    export const updateLink = <N, L>(graph: GraphOf<N, L>, id: LinkId, payload: L): [graph: GraphOf<N, L>, affected: LinkId | null] => {};
    export const updateLinkWith = <N, L>(graph: GraphOf<N, L>, id: LinkId, setter: Setter<LinkOf<L>, L | undefined>): [graph: GraphOf<N, L>, affected: LinkId | null] => {};
    export const updateLinks = <N, L>(graph: GraphOf<N, L>, payloads: { [key: LinkId]: L }): [graph: GraphOf<N, L>, affected: LinkId[]] => {};
    export const updateLinksWith = <N, L>(graph: GraphOf<N, L>, setter: Setter<LinkOf<L>, L | undefined>, id?: ListOf<LinkId>): [graph: GraphOf<N, L>, affected: LinkId[]] => {};
    //#endregion
    //#region Modification/Sockets
    type SocketData = { in: ListOf<SocketId>; out: ListOf<SocketId> } | { in: ListOf<SocketId> } | { out: ListOf<SocketId> };
    export const addSockets = <N, L>(graph: GraphOf<N, L>, id: NodeId, sockets: SocketData): [graph: GraphOf<N, L>, affected: NodeId | null] => {};
    export const removeSockets = <N, L>(graph: GraphOf<N, L>, id: NodeId, sockets: SocketData): [graph: GraphOf<N, L>, affected: NodeId | null, removed: RemovedOf<N, L>] => {};
    // if sockets.in is provided, keep the in sockets listed in sockets.in, remove the rest
    // if sockets.out is provided, keep the out sockets listed in sockets.out, remove the rest
    export const alterSockets = <N, L>(graph: GraphOf<N, L>, id: NodeId, sockets: SocketData): [graph: GraphOf<N, L>, affected: NodeId | null, removed: RemovedOf<N, L>] => {};

    //#endregion
    //#endregion
}
