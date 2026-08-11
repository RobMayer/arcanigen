import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { NodeDefinitions, NodeTypes } from "../../definitions/nodeTypes";
import { DataTypes } from "../../definitions/dataTypes";
import { Resolver } from "../../util/resolver";
import type { CacheType, GraphId, InterfacesType, LinksType, NodesType } from "./types";

/** Mutable graph cache used during a rebuild pass */
type MutableGraphCache = { [nodeId: string]: { [cacheKey: string]: DataTypes.AnyEval | null } };

const EMPTY_SEQ: Resolver.SequenceData = {};

/** Builds a canonical cache key from an output socket name and the current sequenceData */
const makeCacheKey = (outSocket: string, seqData: Resolver.SequenceData): string => {
    const keys = Object.keys(seqData);
    if (keys.length === 0) return outSocket;
    keys.sort();
    return `${outSocket}:${keys.map((k) => `${k}=${seqData[k]}`).join(",")}`;
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

/** Evaluates a single output of a subgraph given a lazy input resolver (demand-driven, not cached) */
const evaluateSubgraphForCache = (
    nodes: NodesType,
    links: LinksType,
    interfaces: InterfacesType,
    subgraphId: GraphId,
    outputNodeId: string,
    resolveInput: (inputNodeId: string, seqData: Resolver.SequenceData) => DataTypes.AnyEval | null,
    sequenceData: Resolver.SequenceData,
): DataTypes.AnyEval | null => {
    const subgraphNodes = nodes[subgraphId];
    const subgraphLinks = links[subgraphId];
    if (!subgraphNodes || !subgraphLinks) return null;

    const outputNode = subgraphNodes[outputNodeId];
    if (!outputNode) return null;

    const evaluateNodeInSubgraph = (nodeId: string, outSocket: string, seqData: Resolver.SequenceData): DataTypes.AnyEval | null => {
        const node = subgraphNodes[nodeId];
        if (!node) return null;

        const evaluate = NodeTypes.getEvaluator(node.type);
        if (!evaluate) return null;

        const getInput = <K extends DataTypes.Kind>(inputNodeId: string): DataTypes.EvalOf<K> | undefined => {
            return resolveInput(inputNodeId, seqData) as DataTypes.EvalOf<K> | undefined;
        };

        const subContext: Resolver.Context = {
            graphId: subgraphId,
            sequenceData: seqData,
            getNode: (gId: string, nId: string) => nodes[gId]?.[nId],
            getInput,
            resolve: <K extends DataTypes.Kind>(targetNodeId: string, inSocket: string, overrideSeqData?: Resolver.SequenceData): DataTypes.EvalOf<K> | null => {
                const effectiveSeqData = overrideSeqData ?? seqData;
                const targetNode = subgraphNodes[targetNodeId];
                if (!targetNode) return null;

                const linkId = targetNode.in[inSocket];
                if (!linkId) return null;

                const link = subgraphLinks[linkId];
                if (!link) return null;

                return evaluateNodeInSubgraph(link.fromNode, link.fromSocket, effectiveSeqData) as DataTypes.EvalOf<K> | null;
            },
            subgraph: (nestedGraphId: string, nestedOutputNodeId: string, nestedResolveInput: (inputNodeId: string, nestedSeqData: Resolver.SequenceData) => DataTypes.AnyEval | null, innerSeqData: Resolver.SequenceData) => {
                return evaluateSubgraphForCache(nodes, links, interfaces, nestedGraphId, nestedOutputNodeId, nestedResolveInput, innerSeqData);
            },
        };

        return evaluate(node, outSocket as keyof NodeDefinitions.Any["outputs"], subContext);
    };

    // Resolve just the requested output node's "input" socket
    const linkId = outputNode.in["input"];
    if (!linkId) return null;

    const link = subgraphLinks[linkId];
    if (!link) return null;

    return evaluateNodeInSubgraph(link.fromNode, link.fromSocket, sequenceData);
};

/**
 * Evaluates a single output socket and caches the result.
 * Demand-driven with evaluate-on-miss: if resolve follows a link to an
 * uncached upstream socket, it recursively evaluates that socket first.
 * Null results are cached explicitly to distinguish "evaluated to null"
 * from "not yet cached" (checked via `in` operator).
 */
const evaluateSocketCached = (
    graphCache: MutableGraphCache,
    nodes: NodesType,
    links: LinksType,
    interfaces: InterfacesType,
    graphId: GraphId,
    nodeId: string,
    outSocket: string,
    sequenceData: Resolver.SequenceData,
): DataTypes.AnyEval | null => {
    const cacheKey = makeCacheKey(outSocket, sequenceData);

    const nodeCache = graphCache[nodeId];
    if (nodeCache && cacheKey in nodeCache) {
        return nodeCache[cacheKey];
    }

    const node = nodes[graphId]?.[nodeId];
    if (!node) return null;

    const evaluate = NodeTypes.getEvaluator(node.type);
    if (!evaluate) return null;

    // Build context with evaluate-on-miss resolve
    const resolve = <K extends DataTypes.Kind>(targetNodeId: string, inSocket: string, overrideSeqData?: Resolver.SequenceData): DataTypes.EvalOf<K> | null => {
        const effectiveSeqData = overrideSeqData ?? sequenceData;
        const targetNode = nodes[graphId]?.[targetNodeId];
        if (!targetNode) return null;

        const linkId = targetNode.in[inSocket];
        if (!linkId) return null;

        const link = links[graphId]?.[linkId];
        if (!link) return null;

        // Recurse — returns cached value or evaluates on miss
        return evaluateSocketCached(graphCache, nodes, links, interfaces, graphId, link.fromNode, link.fromSocket, effectiveSeqData) as DataTypes.EvalOf<K> | null;
    };

    const context: Resolver.Context = {
        graphId,
        sequenceData,
        resolve,
        subgraph: (subgraphId: string, subOutputNodeId: string, subResolveInput: (inputNodeId: string, seqData: Resolver.SequenceData) => DataTypes.AnyEval | null, innerSeqData: Resolver.SequenceData) => {
            return evaluateSubgraphForCache(nodes, links, interfaces, subgraphId, subOutputNodeId, subResolveInput, innerSeqData);
        },
        getNode: (gId: string, nId: string) => nodes[gId]?.[nId],
    };

    const result = evaluate(node, outSocket as keyof NodeDefinitions.Any["outputs"], context);

    // Cache immediately (including null — distinguishes from "not cached")
    if (!graphCache[nodeId]) graphCache[nodeId] = {};
    graphCache[nodeId][cacheKey] = result;

    return result;
};

/** Rebuilds cache for a node and all downstream nodes in topological order */
export const rebuildDownstream = (cache: CacheType, nodes: NodesType, links: LinksType, interfaces: InterfacesType, graphId: GraphId, nodeId: ArcaneGraph.NodeId): CacheType => {
    const graph = { nodes: nodes[graphId], links: links[graphId] };

    // Get downstream nodes in BFS order (ensures upstream is processed before downstream)
    const downstream = ArcaneGraph.wideDownstreamOf(graph, nodeId);
    const toRebuild = new Set([nodeId, ...downstream]);

    // Create mutable graph cache — copy existing entries, EXCEPT for invalidated nodes
    const graphCache: MutableGraphCache = {};
    const existing = cache[graphId] ?? {};
    for (const [nId, entries] of Object.entries(existing)) {
        if (!toRebuild.has(nId)) {
            graphCache[nId] = entries; // keep non-invalidated entries as-is
        }
        // invalidated nodes: entries are dropped (not copied)
    }

    // Proactively evaluate all output sockets of affected nodes with empty sequenceData.
    // Iteration-specific entries are built on-demand when iterating nodes loop internally.
    // evaluate-on-miss in the resolve closure handles socket-level ordering:
    // if socket A on this node depends on socket B (via upstream links),
    // the recursive resolve evaluates B first and caches it.
    for (const nId of [nodeId, ...downstream]) {
        const node = nodes[graphId]?.[nId];
        if (!node) continue;
        for (const outSocket of Object.keys(node.out)) {
            evaluateSocketCached(graphCache, nodes, links, interfaces, graphId, nId, outSocket, EMPTY_SEQ);
        }
    }

    return { ...cache, [graphId]: graphCache };
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
