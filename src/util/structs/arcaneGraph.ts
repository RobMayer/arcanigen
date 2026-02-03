import { nanoid } from "nanoid";
import { NODETYPE_REGISTRY } from "../../definitions";

export namespace ArcaneGraph {
    // aliases just for clarity of purpose when used
    export type NodeId = string;
    export type LinkId = string;
    export type SocketId = string;
    export type SubgraphId = string;

    // allows nodes / links to fetch their node type from a registry.
    export type NodeTypeId = keyof typeof NODETYPE_REGISTRY;
    export type LinkTypeId = string;

    export type NodeOf<P> = {
        id: NodeId;
        type: NodeTypeId;
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

    type NodeMeta = Omit<NodeOf<unknown>, "id" | "payload">;

    export type LinkOf<P> = {
        id: LinkId;
        type: LinkTypeId;
        fromNode: NodeId;
        toNode: NodeId;
        fromSocket: SocketId;
        toSocket: SocketId;
        payload: P; // not sure if needed.
    };

    type LinkMeta = Omit<LinkOf<unknown>, "id" | "payload">;

    export type SubgraphOf<N, L> = {
        nodes: { [key: NodeId]: NodeOf<N> };
        links: { [key: LinkId]: LinkOf<L> };
        users: { node: NodeId; graph: SubgraphId | null }[];
        inputs: NodeId[];
        outputs: NodeId[];
    };

    export type GraphOf<N, L> = {
        nodes: { [key: NodeId]: NodeOf<N> };
        links: { [key: LinkId]: LinkOf<L> };
        subgraphs: { [key: SubgraphId]: SubgraphOf<N, L> };
    };

    //#region Util
    type BulkAdd<T> = T[] | { [key: string]: T };
    const normalizeBulk = <T>(bulk: BulkAdd<T>): { [key: string]: T } => {
        if (Array.isArray(bulk)) {
            return bulk.reduce<{ [key: string]: T }>((acc, each) => {
                acc[nanoid()] = each;
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
    export const hasNode = <P, L>(graph: GraphOf<P, L>, id: NodeId) => id in graph.nodes;
    export const hasLink = <P, L>(graph: GraphOf<P, L>, id: LinkId) => id in graph.links;
    export const hasSocket = <P, L>(graph: GraphOf<P, L>, node: NodeId, socket: SocketId) => node in graph.nodes && (socket in graph.nodes.in || socket in graph.nodes.out);
    //#endregion

    //#region Query
    export const nodeCount = <P, L>(graph: GraphOf<P, L>) => Object.keys(graph.nodes);
    export const linkCount = <P, L>(graph: GraphOf<P, L>) => Object.keys(graph.links);

    //#region Query/Nodes
    // todo: figure out what we want here...
    //#endregion
    //#region QUery/Links
    export const linksBetween = <P, L>(graph: GraphOf<P, L>, nodeA: NodeId, nodeB: NodeId): LinkId[] => {};
    export const directedLinksBetween = <P, L>(graph: GraphOf<P, L>, from: NodeId, to: NodeId): LinkId[] => {};
    export const linksOf = <P, L>(graph: GraphOf<P, L>, node: NodeId, socket: SocketId | null = null): LinkId[] => {};
    export const linksTo = <P, L>(graph: GraphOf<P, L>, node: NodeId, socket: SocketId | null = null): LinkId[] => {};
    export const linksFrom = <P, L>(graph: GraphOf<P, L>, node: NodeId, socket: SocketId | null = null): LinkId[] => {};
    //#endregion
    //#endregion

    //#region Modification
    //#region Modiifictoin/Nodes
    export const addNode = <P, L>(graph: GraphOf<P, L>, payload: Omit<NodeOf<P>, "id">, id: NodeId = nanoid()): [graph: GraphOf<P, L>, newId: string | null] => {};
    export const addNodes = <P, L>(graph: GraphOf<P, L>, payload: BulkAdd<Omit<NodeOf<P>, "id">>, id: NodeId = nanoid()): [graph: GraphOf<P, L>, newIds: string[]] => {};
    export const removeNodes = <P, L>(graph: GraphOf<P, L>, ids: ListOf<NodeId>): [graph: GraphOf<P, L>, removed: { nodes: NodeOf<P>[]; links: LinksOf<L>[] }] => {};

    export const updateNode = <P, L>(graph: GraphOf<P, L>, id: NodeId, payload: P): [graph: GraphOf<P, L>, affected: string | null] => {};
    export const updateNodes = <P, L>(graph: GraphOf<P, L>, payloads: { [key: NodeId]: P }): [graph: GraphOf<P, L>, affected: NodeList[]] => {};
    export const updateNodesWith = <P, L>(graph: GraphOf<P, L>, setter: Setter<P, P | undefined>, ids?: ListOf<NodeId>): [graph: Graph<P, L>, affected: string[]] => {};

    export const alterNode = <P, L>(graph: GraphOf<P, L>, id: NodeId, data: Partial<NodeMeta>): [graph: GraphOf<P, L>, affected: string | null, removedLinks: LinkOf<L>[]] => {};
    export const alterNodes = <P, L>(graph: GraphOf<P, L>, data: { [key: NodeId]: Partial<NodeMeta> }): [graph: GraphOf<P, L>, affected: string | null, removedLinks: LinkOf<L>[]] => {};
    export const alterNodesWith = <P, L>(
        graph: GraphOf<P, L>,
        setter: Setter<NodeMeta, Partial<NodeMeta> | undefined>,
        ids?: ListOf<NodeId>,
    ): [graph: GraphOf<P, L>, affected: string[], removedLinks: LinkOf<L>[]] => {};

    export const isolate = <P, L>(graph: GraphOf<P, L>, id: ListOf<NodeId>): [graph: GraphOf<P, L>, removed: LinkOf<L>[]] => {};
    export const unplug = <P, L>(graph: GraphOf<P, L>, id: NodeId, socket: ListOf<SocketId>): [graphL: GraphOf<P, L>, removed: LinkOf<L> | null] => {};
    export const unplugMany = <P, L>(graph: GraphOf<P, L>, data: { [key: NodeId]: ListOf<SocketId> }): [graphL: GraphOf<P, L>, removed: LinkOf<L> | null] => {};
    export const isolateUpstream = <P, L>(graph: GraphOf<P, L>, id: ListOf<NodeId>): [graph: GraphOf<P, L>, removed: LinkOf<L>[]] => {};
    export const isolateDownstream = <P, L>(graph: GraphOf<P, L>, id: ListOf<NodeId>): [graph: GraphOf<P, L>, removed: LinkOf<L>[]] => {};
    //#endregion
    //#region Modiifictoin/Links
    export const connect = <P, L>(
        graph: GraphOf<P, L>,
        fromNode: NodeId,
        toNode: NodeId,
        fromSocket: SocketId,
        toSocket: SocketId,
        payload: L,
        id: LinkId = nanoid(),
    ): [graph: GraphOf<P, L>, newId: LinkId | null, removedLinks: LinkOf<L> | null] => {};
    export const connectMany = <P, L>(graph: GraphOf<P, L>, data: BulkAdd<Omit<LinkOf<L>, "id">>): [graph: GraphOf<P, L>, newIds: LinkId[], removedLinks: LinkOf<L>[]] => {};
    export const disconnect = <P, L>(
        graph: GraphOf<P, L>,
        fromNode: NodeId,
        toNode: NodeId,
        fromSocket: SocketId | null = null,
        toSocket: SocketId | null = null,
    ): [graph: GraphOf<P, L>, removedLinks: LinkOf<L>[]] => {};
    export const removeLinks = <P, L>(graph: GraphOf<P, L>, id: ListOf<LinkId>): [graph: GraphOf<P, L>, removed: LinkOf<L> | null] => {};

    //#endregion
    //#endregion
}
