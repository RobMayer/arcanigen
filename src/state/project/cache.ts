import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { DataTypes, NodeDefinitions, NodeTypes } from "../../definitions/betterTypes";
import { Resolver } from "../../util/resolver";
import type { CacheType, GraphId, InterfacesType, LinksType, NodesType } from "./types";

/** Parse an interface entry to get the direction and nodeId */
const parseInterface = (entry: string): { direction: "in" | "out"; nodeId: string } | null => {
    if (entry.startsWith("in:")) return { direction: "in", nodeId: entry.slice(3) };
    if (entry.startsWith("out:")) return { direction: "out", nodeId: entry.slice(4) };
    return null;
};

/** Invalidates cache for a node and all its downstream nodes */
export const invalidateDownstream = (cache: CacheType, nodes: NodesType, links: LinksType, graphId: GraphId, nodeId: ArcaneGraph.NodeId): CacheType => {
    const graph = { nodes: nodes[graphId], links: links[graphId] };
    const downstream = ArcaneGraph.wideDownstreamOf(graph, nodeId);
    const toInvalidate = [nodeId, ...downstream];

    const graphCache = cache[graphId];
    if (!graphCache) return cache;

    let newGraphCache = graphCache;
    let changed = false;
    for (const id of toInvalidate) {
        if (id in newGraphCache) {
            if (!changed) {
                newGraphCache = { ...graphCache };
                changed = true;
            }
            delete newGraphCache[id];
        }
    }

    if (!changed) return cache;
    return { ...cache, [graphId]: newGraphCache };
};

/** Evaluates a subgraph given inputs, returns outputs */
const evaluateSubgraphForCache = (
    nodes: NodesType,
    links: LinksType,
    interfaces: InterfacesType,
    subgraphId: GraphId,
    inputValues: { [key: string]: DataTypes.AnyEval | null },
): { [key: string]: DataTypes.AnyEval | null } => {
    const subgraphNodes = nodes[subgraphId];
    const subgraphLinks = links[subgraphId];
    if (!subgraphNodes || !subgraphLinks) return {};

    // Helper to evaluate a node's output within this subgraph
    const evaluateNodeInSubgraph = (nodeId: string, outSocket: string): DataTypes.AnyEval | null => {
        const node = subgraphNodes[nodeId];
        if (!node) return null;

        const evaluate = NodeTypes.getEvaluator(node.type);
        if (!evaluate) return null;

        const subContext: Resolver.Context = {
            graphId: subgraphId,
            define: () => {},
            getNode: (gId: string, nId: string) => nodes[gId]?.[nId],
            getInput: <K extends DataTypes.Kind>(inputNodeId: string): DataTypes.EvalOf<DataTypes.Use<K>> | undefined => {
                return inputValues[inputNodeId] as DataTypes.EvalOf<DataTypes.Use<K>> | undefined;
            },
            resolve: <K extends DataTypes.Kind>(targetNodeId: string, inSocket: string): DataTypes.EvalOf<DataTypes.Use<K>> | null => {
                const targetNode = subgraphNodes[targetNodeId];
                if (!targetNode) return null;

                const linkId = targetNode.in[inSocket];
                if (!linkId) return null;

                const link = subgraphLinks[linkId];
                if (!link) return null;

                return evaluateNodeInSubgraph(link.fromNode, link.fromSocket) as DataTypes.EvalOf<DataTypes.Use<K>> | null;
            },
            subgraph: (nestedGraphId: string, nestedInputs: { [key: string]: DataTypes.AnyEval | null }) => {
                return evaluateSubgraphForCache(nodes, links, interfaces, nestedGraphId, nestedInputs);
            },
        };

        return evaluate(node, outSocket as keyof NodeDefinitions.Any["outputs"], subContext);
    };

    // Get output node IDs by parsing interfaces with "out:" prefix
    const subgraphInterfaces = interfaces[subgraphId] ?? [];
    const results: { [key: string]: DataTypes.AnyEval | null } = {};

    for (const entry of subgraphInterfaces) {
        const parsed = parseInterface(entry);
        if (!parsed || parsed.direction !== "out") continue;

        const outputNodeId = parsed.nodeId;
        const outputNode = subgraphNodes[outputNodeId];
        if (!outputNode) continue;

        // Resolve the "input" socket of the output node
        const linkId = outputNode.in["input"];
        if (!linkId) {
            results[outputNodeId] = null;
            continue;
        }

        const link = subgraphLinks[linkId];
        if (!link) {
            results[outputNodeId] = null;
            continue;
        }

        results[outputNodeId] = evaluateNodeInSubgraph(link.fromNode, link.fromSocket);
    }

    return results;
};

/** Evaluates a single node and caches all its output sockets */
export const evaluateAndCacheNode = (cache: CacheType, nodes: NodesType, links: LinksType, interfaces: InterfacesType, graphId: GraphId, nodeId: ArcaneGraph.NodeId): CacheType => {
    const node = nodes[graphId]?.[nodeId];
    if (!node) return cache;

    const evaluate = NodeTypes.getEvaluator(node.type);
    if (!evaluate) return cache;

    // Create a resolve function that uses the cache
    const resolve = <K extends DataTypes.Kind>(targetNodeId: string, inSocket: string): DataTypes.EvalOf<DataTypes.Use<K>> | null => {
        const targetNode = nodes[graphId]?.[targetNodeId];
        if (!targetNode) return null;

        const linkId = targetNode.in[inSocket];
        if (!linkId) return null;

        const link = links[graphId]?.[linkId];
        if (!link) return null;

        const { fromNode, fromSocket } = link;
        return (cache[graphId]?.[fromNode]?.[fromSocket] ?? null) as DataTypes.EvalOf<DataTypes.Use<K>> | null;
    };

    const context: Resolver.Context = {
        graphId,
        define: () => {}, // definitions are handled at render time
        resolve,
        subgraph: (subgraphId: string, inputValues: { [key: string]: DataTypes.AnyEval | null }) => {
            return evaluateSubgraphForCache(nodes, links, interfaces, subgraphId, inputValues);
        },
        getNode: (gId: string, nId: string) => nodes[gId]?.[nId],
    };

    // Evaluate all output sockets
    const outputSockets = Object.keys(node.out);
    const nodeResults: { [outSocket: string]: DataTypes.AnyEval } = {};
    let hasResults = false;

    for (const outSocket of outputSockets) {
        const result = evaluate(node, outSocket as keyof NodeDefinitions.Any["outputs"], context);
        if (result !== null) {
            nodeResults[outSocket] = result;
            hasResults = true;
        }
    }

    if (!hasResults) return cache;

    return {
        ...cache,
        [graphId]: {
            ...cache[graphId],
            [nodeId]: {
                ...(cache[graphId]?.[nodeId] ?? {}),
                ...nodeResults,
            },
        },
    };
};

/** Rebuilds cache for a node and all downstream nodes in topological order */
export const rebuildDownstream = (cache: CacheType, nodes: NodesType, links: LinksType, interfaces: InterfacesType, graphId: GraphId, nodeId: ArcaneGraph.NodeId): CacheType => {
    const graph = { nodes: nodes[graphId], links: links[graphId] };

    // Get downstream nodes in BFS order (ensures upstream is processed before downstream)
    const downstream = ArcaneGraph.wideDownstreamOf(graph, nodeId);
    const toEvaluate = [nodeId, ...downstream];

    let newCache = cache;
    for (const id of toEvaluate) {
        newCache = evaluateAndCacheNode(newCache, nodes, links, interfaces, graphId, id);
    }

    return newCache;
};

/** Builds cache for all nodes in a graph by evaluating in topological order (sources first) */
const buildGraphCache = (cache: CacheType, nodes: NodesType, links: LinksType, interfaces: InterfacesType, graphId: GraphId): CacheType => {
    const graphNodes = nodes[graphId];
    const graphLinks = links[graphId];
    if (!graphNodes || !graphLinks) return cache;

    // Find source nodes (nodes with no incoming connections)
    const sourceNodes: ArcaneGraph.NodeId[] = [];
    for (const nodeId of Object.keys(graphNodes)) {
        const node = graphNodes[nodeId];
        const hasIncoming = Object.values(node.in).some((linkId) => linkId !== null);
        if (!hasIncoming) {
            sourceNodes.push(nodeId);
        }
    }

    // Build cache starting from each source node
    let newCache = cache;
    for (const sourceId of sourceNodes) {
        newCache = rebuildDownstream(newCache, nodes, links, interfaces, graphId, sourceId);
    }

    return newCache;
};

/** Builds initial cache for all graphs */
export const buildInitialCache = (nodes: NodesType, links: LinksType, interfaces: InterfacesType): CacheType => {
    let cache: CacheType = {};
    for (const graphId of Object.keys(nodes)) {
        cache[graphId] = {};
        cache = buildGraphCache(cache, nodes, links, interfaces, graphId);
    }
    return cache;
};
