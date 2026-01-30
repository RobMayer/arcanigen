import { nanoid } from "nanoid";

export namespace SocketedGraph {
    type Socket<S> = {
        id: string;
        node: string; // nodeId for reference
        links: string[]; // link Ids for reference
        payload: S;
    };

    export type SocketPayloadOf<G> = G extends Graph<infer _N, infer S, infer _L> ? S : never;
    export type LinkPayloadOf<G> = G extends Graph<infer _N, infer _S, infer L> ? L : never;
    export type NodePayloadOf<G> = G extends Graph<infer N, infer _S, infer _L> ? N : never;

    type NodeOf<G> = G extends Graph<infer N, infer S, infer _L> ? Node<N, S> : never;
    type LinkOf<G> = G extends Graph<infer _N, infer _S, infer L> ? Link<L> : never;
    type SocketOf<G> = G extends Graph<infer _N, infer S, infer _L> ? Socket<S> : never;

    export type PayloadOf<O> = O extends Node<infer N, infer _S> ? N : O extends Socket<infer S> ? S : O extends Link<infer L> ? L : never;

    export type Node<N, S> = {
        id: string;
        sockets: {
            [socketId: string]: Socket<S>;
        };
        payload: N;
    };

    export type Link<L> = {
        id: string;
        fromNode: string;
        toNode: string;
        fromSocket: string;
        toSocket: string;
        payload: L;
    };

    export type Graph<N, S, L> = {
        nodes: { [id: string]: Node<N, S> };
        links: { [id: string]: Link<L> };
    };

    type IGraph = Graph<unknown, unknown, unknown>;

    //#region Local Utility

    type IdList = string | string[] | Set<string>;

    const makeSet = (id: IdList): Set<string> => {
        return typeof id === "string" ? new Set([id]) : id instanceof Set ? id : new Set(id);
    };

    //#endregion

    //#region Validation

    export const hasNode = <G extends IGraph>(graph: G, id: string) => {
        return id in graph.nodes;
    };

    export const hasLink = <G extends IGraph>(graph: G, id: string) => {
        return id in graph.links;
    };

    export const hasSocket = <G extends IGraph>(graph: G, node: string, id: string) => {
        return node in graph.nodes && id in graph.nodes[node].sockets;
    };

    //#region Query

    export const nodeCount = <G extends IGraph>(graph: G): number => Object.keys(graph.nodes).length;
    export const linkCount = <G extends IGraph>(graph: G): number => Object.keys(graph.links).length;

    //#region Query : Links

    export const linksBetween = <G extends IGraph>(graph: G, nodeA: string, nodeB: string, socketA: string | null = null, socketB: string | null = null): string[] => {
        return Object.keys(graph.links).filter((id) => {
            const link = graph.links[id];
            const matchForward = link.fromNode === nodeA && link.toNode === nodeB && (socketA === null || socketA === link.fromSocket) && (socketB === null || socketB === link.toSocket);
            const matchReverse = link.fromNode === nodeB && link.toNode === nodeA && (socketB === null || socketB === link.fromSocket) && (socketA === null || socketA === link.toSocket);
            return matchForward || matchReverse;
        });
    };

    export const directedLinksBetween = <G extends IGraph>(graph: G, fromNode: string, toNode: string, fromSocket: string | null = null, toSocket: string | null = null): string[] => {
        return Object.keys(graph.links).filter((id) => {
            const link = graph.links[id];
            if (fromSocket !== null && fromSocket !== link.fromSocket) {
                return false;
            }
            if (toSocket !== null && toSocket !== link.toSocket) {
                return false;
            }
            if (toNode !== link.toNode || fromNode !== link.fromNode) {
                return false;
            }
            return true;
        });
    };

    export const linksOf = <G extends IGraph>(graph: G, id: string, socket: string | null = null): string[] => {
        return Object.keys(graph.links).filter((linkId) => {
            const link = graph.links[linkId];
            const matchFrom = link.fromNode === id && (socket === null || socket === link.fromSocket);
            const matchTo = link.toNode === id && (socket === null || socket === link.toSocket);
            return matchFrom || matchTo;
        });
    };

    export const linksInboundOf = <G extends IGraph>(graph: G, id: string, socket: string | null = null): string[] => {
        return Object.keys(graph.links).filter((linkId) => {
            const link = graph.links[linkId];
            return link.toNode === id && (socket === null || socket === link.toSocket);
        });
    };

    export const linksOutboundOf = <G extends IGraph>(graph: G, id: string, socket: string | null = null): string[] => {
        return Object.keys(graph.links).filter((linkId) => {
            const link = graph.links[linkId];
            return link.fromNode === id && (socket === null || socket === link.fromSocket);
        });
    };

    //#endregion
    //#endregion

    //#region Modification
    //#region Modification : Nodes

    export const addNode = <G extends IGraph>(graph: G, data: { payload: NodePayloadOf<G>; sockets: { [key: string]: SocketPayloadOf<G> } }, id = nanoid()): [graph: G, newId: string | null] => {
        if (hasNode(graph, id)) {
            return [graph, null];
        }

        const { payload, sockets } = data;

        const newNode: Node<NodePayloadOf<G>, SocketPayloadOf<G>> = {
            id,
            payload,
            sockets: Object.entries(sockets).reduce<{ [id: string]: Socket<SocketPayloadOf<G>> }>((acc, [socketId, payload]) => {
                acc[socketId] = {
                    id: socketId,
                    node: id,
                    payload,
                    links: [],
                };
                return acc;
            }, {}),
        };

        return [
            {
                ...graph,
                nodes: {
                    ...graph.nodes,
                    [id]: newNode,
                },
            },
            id,
        ];
    };

    export const removeNodes = <G extends IGraph>(graph: G, id: IdList): [graph: G, removed: { nodes: { [id: string]: NodeOf<G> }; links: { [id: string]: LinkOf<G> } }] => {
        const ids = makeSet(id);
        if (ids.size === 0) {
            return [graph, { nodes: {}, links: {} }];
        }

        const orphanedLinks = Object.keys(graph.links).filter((linkId) => {
            const link = graph.links[linkId];
            return ids.has(link.fromNode) || ids.has(link.toNode);
        });

        const [cleaned, removedLinks] = orphanedLinks.length > 0 ? removeLinks(graph, orphanedLinks) : [graph, {}];

        const newNodes = { ...cleaned.nodes };
        const removedNodes: { [id: string]: NodeOf<G> } = {};
        for (const nodeId of ids) {
            if (nodeId in graph.nodes) {
                removedNodes[nodeId] = graph.nodes[nodeId] as NodeOf<G>;
            }
            delete newNodes[nodeId];
        }

        return [
            {
                ...cleaned,
                nodes: newNodes,
            },
            {
                nodes: removedNodes,
                links: removedLinks,
            },
        ];
    };

    export const updateNode = <G extends IGraph>(graph: G, id: string, payload: NodePayloadOf<G>): G => updateNodes(graph, { [id]: payload });

    export const updateNodes = <G extends IGraph>(graph: G, items: { [id: string]: NodePayloadOf<G> }): G => {
        // toddo: implement
    };

    //#endregion
    //#region Modification : Links

    export const connect = <G extends IGraph>(
        graph: G,
        fromNode: string,
        fromSocket: string,
        toNode: string,
        toSocket: string,
        payload: LinkPayloadOf<G>,
        id: string = nanoid(),
    ): [graph: G, newId: string | null] => {
        if (hasLink(graph, id)) {
            return [graph, null];
        }
        if (!hasSocket(graph, fromNode, fromSocket) || !hasSocket(graph, toNode, toSocket)) {
            return [graph, null];
        }
        if (fromNode === toNode && fromSocket === toSocket) {
            return [graph, null];
        }

        const sameNode = fromNode === toNode;

        const updatedFromNode = {
            ...graph.nodes[fromNode],
            sockets: {
                ...graph.nodes[fromNode].sockets,
                [fromSocket]: {
                    ...graph.nodes[fromNode].sockets[fromSocket],
                    links: [...graph.nodes[fromNode].sockets[fromSocket].links, id],
                },
                ...(sameNode
                    ? {
                          [toSocket]: {
                              ...graph.nodes[toNode].sockets[toSocket],
                              links: [...graph.nodes[toNode].sockets[toSocket].links, id],
                          },
                      }
                    : {}),
            },
        };

        return [
            {
                ...graph,
                nodes: {
                    ...graph.nodes,
                    [fromNode]: updatedFromNode,
                    ...(sameNode
                        ? {}
                        : {
                              [toNode]: {
                                  ...graph.nodes[toNode],
                                  sockets: {
                                      ...graph.nodes[toNode].sockets,
                                      [toSocket]: {
                                          ...graph.nodes[toNode].sockets[toSocket],
                                          links: [...graph.nodes[toNode].sockets[toSocket].links, id],
                                      },
                                  },
                              },
                          }),
                },
                links: {
                    ...graph.links,
                    [id]: {
                        id,
                        fromNode,
                        fromSocket,
                        toNode,
                        toSocket,
                        payload,
                    },
                },
            },
            id,
        ];
    };

    export const disconnect = <G extends IGraph>(
        graph: G,
        nodeA: string,
        nodeB: string,
        socketA: string | null = null,
        socketB: string | null = null,
    ): [graph: G, removedLinks: { [id: string]: LinkOf<G> }] => {
        if (socketA === null ? !hasNode(graph, nodeA) : !hasSocket(graph, nodeA, socketA)) {
            return [graph, {}];
        }
        if (socketB === null ? !hasNode(graph, nodeB) : !hasSocket(graph, nodeB, socketB)) {
            return [graph, {}];
        }
        const ids = linksBetween(graph, nodeA, nodeB, socketA, socketB);
        if (ids.length === 0) {
            return [graph, {}];
        }
        return removeLinks(graph, ids);
    };

    export const removeLinks = <G extends IGraph>(graph: G, id: IdList): [graph: G, removedLinks: { [id: string]: LinkOf<G> }] => {
        const idSet = makeSet(id);
        if (idSet.size === 0) {
            return [graph, {}];
        }

        const newLinks = { ...graph.links };
        for (const linkId of idSet) {
            delete newLinks[linkId];
        }

        const affectedNodes = new Set<string>();
        for (const linkId of idSet) {
            if (linkId in graph.links) {
                affectedNodes.add(graph.links[linkId].fromNode);
                affectedNodes.add(graph.links[linkId].toNode);
            }
        }

        const newNodes = { ...graph.nodes };
        for (const nodeId of affectedNodes) {
            const node = graph.nodes[nodeId];
            const newSockets = { ...node.sockets };
            for (const [socketId, socket] of Object.entries(newSockets)) {
                const filtered = socket.links.filter((l) => !idSet.has(l));
                if (filtered.length !== socket.links.length) {
                    newSockets[socketId] = { ...socket, links: filtered };
                }
            }
            newNodes[nodeId] = { ...node, sockets: newSockets };
        }

        const removedLinks: { [id: string]: LinkOf<G> } = {};
        for (const linkId of idSet) {
            if (linkId in graph.links) {
                removedLinks[linkId] = graph.links[linkId] as LinkOf<G>;
            }
        }

        return [
            {
                ...graph,
                nodes: newNodes,
                links: newLinks,
            },
            removedLinks,
        ];
    };

    //#endretgion
    //#region Modification : Sockets

    export const addSocket = <G extends IGraph>(graph: G, nodeId: string, payload: SocketPayloadOf<G>, id: string = nanoid()): [graph: G, newId: string | null] => {
        throw "not yet implemnted";
    };

    export const removeSockets = <G extends IGraph>(
        graph: G,
        toRemove: { [nodeId: string]: IdList } | ([nodeId: string, socketId: string] | { node: string; socket: string })[],
    ): [graph: G, { links: { [linkId: string]: LinkOf<G> }; sockets: { [socketId: string]: SocketOf<G> } }] => {
        throw "not yet implemented";
    };

    //#endregion

    //#endregion
}
