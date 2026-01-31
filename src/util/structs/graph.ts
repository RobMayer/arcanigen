import { nanoid } from "nanoid";
import { ListOf, normalizeList } from "../misc";

export namespace Graph {
    export type LinkPayloadOf<G> = G extends Of<infer _N, infer L> ? L : never;
    export type NodePayloadOf<G> = G extends Of<infer N, infer _L> ? N : never;

    type NodeOf<G> = G extends Of<infer N, infer _L> ? Node<N> : never;
    type LinkOf<G> = G extends Of<infer _N, infer L> ? Link<L> : never;

    export type PayloadOf<O> = O extends Node<infer N> ? N : O extends Link<infer L> ? L : never;

    const ALWAYS = () => true;

    export type Node<N> = {
        id: string;
        payload: N;
        // links: { [id: string]: "in" | "out" }
    };

    export type Link<L> = {
        id: string;
        from: string;
        to: string;
        payload: L;
    };

    export type Of<N, L> = {
        nodes: { [id: string]: Node<N> };
        links: { [id: string]: Link<L> };
    };

    type IGraph = Of<unknown, unknown>;

    type UpdateFor<T> = { [key: string]: T } | T[];

    //#region Local Utility

    //#endregion

    //#region Validation

    export const hasNode = <G extends IGraph>(graph: G, id: string) => id in graph.nodes;

    export const hasLink = <G extends IGraph>(graph: G, id: string) => id in graph.links;

    //#region Query

    export const nodeCount = <G extends IGraph>(graph: G): number => Object.keys(graph.nodes).length;
    export const linkCount = <G extends IGraph>(graph: G): number => Object.keys(graph.links).length;

    //#region Query : Links

    export const linksBetween = <G extends IGraph>(graph: G, nodeA: string, nodeB: string, predicate: (link: NoInfer<LinkOf<G>>) => boolean = ALWAYS): string[] => {
        return Object.keys(graph.links).filter((id) => {
            const link = graph.links[id];
            const matchForward = link.from === nodeA && link.to === nodeB;
            const matchReverse = link.from === nodeB && link.to === nodeA;
            return (matchForward || matchReverse) && predicate(graph.links[id] as LinkOf<G>);
        });
    };

    export const directedLinksBetween = <G extends IGraph>(graph: G, from: string, to: string, predicate: (link: NoInfer<LinkOf<G>>) => boolean = ALWAYS): string[] => {
        return Object.keys(graph.links).filter((id) => {
            const link = graph.links[id];
            if (to !== link.to || from !== link.from) {
                return false;
            }
            return predicate(link as LinkOf<G>);
        });
    };

    export const linksOf = <G extends IGraph>(graph: G, id: string, predicate: (link: NoInfer<LinkOf<G>>) => boolean = ALWAYS): string[] => {
        return Object.keys(graph.links).filter((linkId) => (graph.links[linkId].from === id || graph.links[linkId].to === id) && predicate(graph.links[linkId] as LinkOf<G>));
    };

    export const linksTo = <G extends IGraph>(graph: G, id: string, predicate: (link: NoInfer<LinkOf<G>>) => boolean = ALWAYS): string[] => {
        return Object.keys(graph.links).filter((linkId) => graph.links[linkId].to === id && predicate(graph.links[linkId] as LinkOf<G>));
    };

    export const linksFrom = <G extends IGraph>(graph: G, id: string, predicate: (link: NoInfer<LinkOf<G>>) => boolean = ALWAYS): string[] => {
        return Object.keys(graph.links).filter((linkId) => graph.links[linkId].from === id && predicate(graph.links[linkId] as LinkOf<G>));
    };

    //#endregion
    //#endregion

    //#region Modification
    //#region Modification : Nodes

    export const addNode = <G extends IGraph>(graph: G, payload: NodePayloadOf<G>, id = nanoid()): [graph: G, newId: string | null] => {
        if (hasNode(graph, id)) {
            return [graph, null];
        }
        return [
            {
                ...graph,
                nodes: {
                    ...graph.nodes,
                    [id]: { id, payload },
                },
            },
            id,
        ];
    };

    export const addNodes = <G extends IGraph>(graph: G, payloads: UpdateFor<NodePayloadOf<G>>): [graph: G, newIds: string[]] => {
        const entries = Array.isArray(payloads) ? payloads.map<[string, NodePayloadOf<G>]>((payload) => [nanoid(), payload]) : Object.entries(payloads);
        const newNodes = entries.reduce<{
            [id: string]: Node<NodePayloadOf<G>>;
        }>((acc, [id, payload]) => {
            if (id in graph.nodes) {
                return acc;
            }
            acc[id] = { id, payload };
            return acc;
        }, {});

        const newIds = Object.keys(newNodes);

        if (newIds.length === 0) {
            return [graph, []];
        }

        return [
            {
                ...graph,
                nodes: {
                    ...graph.nodes,
                    ...newNodes,
                },
            },
            newIds,
        ];
    };

    export const removeNodes = <G extends IGraph>(graph: G, id: ListOf<string>): [graph: G, removed: { nodes: { [id: string]: NodeOf<G> }; links: { [id: string]: LinkOf<G> } }] => {
        const ids = normalizeList(id);
        if (ids.size === 0) {
            return [graph, { nodes: {}, links: {} }];
        }

        const orphanedLinks = Object.keys(graph.links).filter((linkId) => {
            const link = graph.links[linkId];
            return ids.has(link.from) || ids.has(link.to);
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

    export const updateNodeWith = <G extends IGraph>(graph: G, id: string, setter: (previous: NodePayloadOf<G>) => NodePayloadOf<G>): G => updateNodesWith(graph, setter, id);

    export const updateNodes = <G extends IGraph>(graph: G, items: { [id: string]: NodePayloadOf<G> }): G => {
        const newItems = Object.entries(items).reduce<{ [key: string]: NodeOf<G> }>((acc, [id, payload]) => {
            if (id in graph.nodes) {
                acc[id] = { ...graph.nodes[id], payload } as NodeOf<G>;
            }
            return acc;
        }, {});

        if (Object.keys(newItems).length === 0) {
            return graph;
        }

        return {
            ...graph,
            nodes: {
                ...graph.nodes,
                ...newItems,
            },
        };
    };

    export const updateNodesWith = <G extends IGraph>(graph: G, setter: (previous: NodePayloadOf<G>) => NodePayloadOf<G> | undefined, ids?: ListOf<string>): G => {
        const entries = normalizeList(ids ? ids : Object.keys(graph.nodes));
        const newItems: { [key: string]: NodeOf<G> } = {};

        entries.forEach((id) => {
            if (!(id in graph.nodes)) {
                return;
            }
            const node = graph.nodes[id];
            const result = setter(node.payload as NodePayloadOf<G>);
            if (result !== undefined) {
                newItems[id] = { ...node, payload: result } as NodeOf<G>;
            }
        });

        if (Object.keys(newItems).length === 0) {
            return graph;
        }

        return {
            ...graph,
            nodes: {
                ...graph.nodes,
                ...newItems,
            },
        };
    };

    //#endregion
    //#region Modification : Links

    export const connect = <G extends IGraph>(graph: G, from: string, to: string, payload: LinkPayloadOf<G>, id: string = nanoid()): [graph: G, newId: string | null] => {
        if (hasLink(graph, id) || !hasNode(graph, from) || !hasNode(graph, to)) {
            return [graph, null];
        }
        return [
            {
                ...graph,
                links: {
                    ...graph.links,
                    [id]: {
                        id,
                        from,
                        to,
                        payload,
                    },
                },
            },
            id,
        ];
    };

    export const connectMany = <G extends IGraph>(graph: G, data: UpdateFor<{ from: string; to: string; payload: LinkPayloadOf<G> }>): [graph: G, newIds: string[]] => {
        const entries = Array.isArray(data) ? data.map<[string, { from: string; to: string; payload: LinkPayloadOf<G> }]>((item) => [nanoid(), item]) : Object.entries(data);

        const newLinks = entries.reduce<{ [id: string]: Link<LinkPayloadOf<G>> }>((acc, [id, { from, to, payload }]) => {
            if (id in graph.links || id in acc || !hasNode(graph, from) || !hasNode(graph, to)) {
                return acc;
            }
            acc[id] = { id, from, to, payload };
            return acc;
        }, {});

        const newIds = Object.keys(newLinks);

        if (newIds.length === 0) {
            return [graph, []];
        }

        return [
            {
                ...graph,
                links: {
                    ...graph.links,
                    ...newLinks,
                },
            },
            newIds,
        ];
    };

    export const disconnect = <G extends IGraph>(
        graph: G,
        nodeA: string,
        nodeB: string,
        predicate: (link: NoInfer<LinkOf<G>>) => boolean = ALWAYS,
    ): [graph: G, removedLinks: { [id: string]: LinkOf<G> }] => {
        if (!hasNode(graph, nodeA) || !hasNode(graph, nodeB)) {
            return [graph, {}];
        }
        const ids = linksBetween(graph, nodeA, nodeB, predicate);
        if (ids.length === 0) {
            return [graph, {}];
        }
        return removeLinks(graph, ids);
    };

    export const disconnectFrom = <G extends IGraph>(graph: G, from: string, predicate: (link: NoInfer<LinkOf<G>>) => boolean = ALWAYS): [graph: G, removedLinks: { [id: string]: LinkOf<G> }] => {
        if (!hasNode(graph, from)) {
            return [graph, {}];
        }
        const ids = linksFrom(graph, from, predicate);
        if (ids.length === 0) {
            return [graph, {}];
        }
        return removeLinks(graph, ids);
    };

    export const disconnectTo = <G extends IGraph>(graph: G, to: string, predicate: (link: NoInfer<LinkOf<G>>) => boolean = ALWAYS): [graph: G, removedLinks: { [id: string]: LinkOf<G> }] => {
        if (!hasNode(graph, to)) {
            return [graph, {}];
        }
        const ids = linksTo(graph, to, predicate);
        if (ids.length === 0) {
            return [graph, {}];
        }
        return removeLinks(graph, ids);
    };

    export const removeLinks = <G extends IGraph>(graph: G, id: ListOf<string>): [graph: G, removedLinks: { [id: string]: LinkOf<G> }] => {
        const idSet = normalizeList(id);
        if (idSet.size === 0) {
            return [graph, {}];
        }

        const newLinks = { ...graph.links };
        const removedLinks: { [id: string]: LinkOf<G> } = {};
        for (const linkId of idSet) {
            if (linkId in graph.links) {
                removedLinks[linkId] = graph.links[linkId] as LinkOf<G>;
            }
            delete newLinks[linkId];
        }

        return [
            {
                ...graph,
                links: newLinks,
            },
            removedLinks,
        ];
    };

    export const updateLink = <G extends IGraph>(graph: G, id: string, payload: LinkPayloadOf<G>): G => updateLinks(graph, { [id]: payload });

    export const updateLinkWith = <G extends IGraph>(graph: G, id: string, setter: (previous: LinkPayloadOf<G>) => LinkPayloadOf<G>): G => updateLinksWith(graph, setter, id);

    export const updateLinks = <G extends IGraph>(graph: G, items: { [id: string]: LinkPayloadOf<G> }): G => {
        const newItems = Object.entries(items).reduce<{ [key: string]: LinkOf<G> }>((acc, [id, payload]) => {
            if (id in graph.links) {
                acc[id] = { ...graph.links[id], payload } as LinkOf<G>;
            }
            return acc;
        }, {});

        if (Object.keys(newItems).length === 0) {
            return graph;
        }

        return {
            ...graph,
            links: {
                ...graph.links,
                ...newItems,
            },
        };
    };

    export const updateLinksWith = <G extends IGraph>(graph: G, setter: (previous: LinkPayloadOf<G>) => LinkPayloadOf<G> | undefined, ids?: ListOf<string>): G => {
        const entries = normalizeList(ids ? ids : Object.keys(graph.links));
        const newItems: { [key: string]: LinkOf<G> } = {};

        entries.forEach((id) => {
            if (!(id in graph.links)) {
                return;
            }
            const link = graph.links[id];
            const result = setter(link.payload as LinkPayloadOf<G>);
            if (result !== undefined) {
                newItems[id] = { ...link, payload: result } as LinkOf<G>;
            }
        });

        if (Object.keys(newItems).length === 0) {
            return graph;
        }

        return {
            ...graph,
            links: {
                ...graph.links,
                ...newItems,
            },
        };
    };

    //#endregion

    //#endregion
}
