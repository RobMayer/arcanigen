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

    export type LinkOf<P> = {
        id: LinkId;
        type: LinkTypeId;
        fromNode: NodeId;
        toNode: NodeId;
        fromSocket: SocketId;
        toSocket: SocketId;
        payload: P; // not sure if needed.
    };

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
}
