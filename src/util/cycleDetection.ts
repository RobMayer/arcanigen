import { ArcaneGraph } from "./structs/arcaneGraph";
import { NodeTypes } from "../definitions/betterTypes";
import { InterfaceMember, flattenSockets } from "../state/project/types";

type SocketRef = `${string}:${string}`; // "nodeId:socketId"

// Type-erased versions for dynamic dispatch
type AnyDependsOn = (node: ArcaneGraph.NodeOf<unknown>, outSocket: string, deps: AllDeps) => string[];
type AnyContributesTo = (node: ArcaneGraph.NodeOf<unknown>, inSocket: string, deps: AllDeps) => string[];

type AllDeps = { [graphId: string]: SubgraphDeps };

/**
 * Computes the set of sockets that would create a cycle if connected to the given source socket.
 *
 * When dragging from an OUTPUT socket, we find all UPSTREAM input sockets (invalid drop targets).
 * When dragging from an INPUT socket, we find all DOWNSTREAM output sockets (invalid drop targets).
 *
 * @param graph - The current graph state
 * @param nodeId - The node where the drag started
 * @param socketId - The socket where the drag started
 * @param side - Whether the drag started from an "in" or "out" socket
 * @param deps - Precomputed subgraph dependencies for custom nodes
 * @returns A Set of "nodeId:socketId" strings representing forbidden connection targets
 */
export function computeForbiddenSockets<N>(graph: ArcaneGraph.GraphOf<N>, nodeId: string, socketId: string, side: "in" | "out", deps: AllDeps): Set<SocketRef> {
    if (side === "out") {
        // Dragging from an output - find all upstream input sockets
        return traceUpstream(graph, nodeId, socketId, "out", deps);
    } else {
        // Dragging from an input - find all downstream output sockets
        return traceDownstream(graph, nodeId, socketId, deps);
    }
}

/**
 * Traces upstream from an output socket to find all input sockets in the dependency chain.
 * Uses dependsOn to traverse within nodes, and links to traverse between nodes.
 */
function traceUpstream<N>(graph: ArcaneGraph.GraphOf<N>, startNodeId: string, startSocketId: string, startDirection: "in" | "out", deps: AllDeps): Set<SocketRef> {
    const visited = new Set<string>(); // "nodeId:socketId:direction" to avoid cycles in traversal
    const result = new Set<SocketRef>(); // input sockets that are upstream

    // Queue entries: [nodeId, socketId, direction]
    // direction: "out" means we're at an output socket, "in" means we're at an input socket
    const queue: Array<[string, string, "in" | "out"]> = [[startNodeId, startSocketId, startDirection]];

    while (queue.length > 0) {
        const [nodeId, socketId, direction] = queue.shift()!;
        const visitKey = `${nodeId}:${socketId}:${direction}`;

        if (visited.has(visitKey)) continue;
        visited.add(visitKey);

        const node = graph.nodes[nodeId];
        if (!node) continue;

        if (direction === "out") {
            // At an output socket - use dependsOn to find which inputs it depends on
            const nodeType = NodeTypes.get(node.type);
            const dependsOn = nodeType.dependsOn as AnyDependsOn;
            const dependentInputs = dependsOn(node, socketId, deps);

            for (const inSocket of dependentInputs) {
                // Add this input to the result set (it's upstream of our starting point)
                result.add(`${nodeId}:${inSocket}`);
                // Continue tracing from this input socket
                queue.push([nodeId, inSocket, "in"]);
            }
        } else {
            // At an input socket - follow the link to find the upstream output
            const linkId = node.in[socketId];
            if (linkId) {
                const link = graph.links[linkId];
                if (link) {
                    // Continue tracing from the upstream output socket
                    queue.push([link.fromNode, link.fromSocket, "out"]);
                }
            }
        }
    }

    return result;
}

/**
 * Traces downstream from an input socket to find all output sockets in the contribution chain.
 * Uses contributesTo to traverse within nodes, and links to traverse between nodes.
 */
function traceDownstream<N>(graph: ArcaneGraph.GraphOf<N>, startNodeId: string, startSocketId: string, deps: AllDeps): Set<SocketRef> {
    const visited = new Set<string>(); // "nodeId:socketId:direction" to avoid cycles in traversal
    const result = new Set<SocketRef>(); // output sockets that are downstream

    // Queue entries: [nodeId, socketId, direction]
    const queue: Array<[string, string, "in" | "out"]> = [[startNodeId, startSocketId, "in"]];

    while (queue.length > 0) {
        const [nodeId, socketId, direction] = queue.shift()!;
        const visitKey = `${nodeId}:${socketId}:${direction}`;

        if (visited.has(visitKey)) continue;
        visited.add(visitKey);

        const node = graph.nodes[nodeId];
        if (!node) continue;

        if (direction === "in") {
            // At an input socket - use contributesTo to find which outputs it contributes to
            const nodeType = NodeTypes.get(node.type);
            const contributesTo = nodeType.contributesTo as AnyContributesTo;
            const contributingOutputs = contributesTo(node, socketId, deps);

            for (const outSocket of contributingOutputs) {
                // Add this output to the result set (it's downstream of our starting point)
                result.add(`${nodeId}:${outSocket}`);
                // Continue tracing from this output socket
                queue.push([nodeId, outSocket, "out"]);
            }
        } else {
            // At an output socket - follow all links to find downstream inputs
            const linkIds = node.out[socketId] ?? [];
            for (const linkId of linkIds) {
                const link = graph.links[linkId];
                if (link) {
                    // Continue tracing from the downstream input socket
                    queue.push([link.toNode, link.toSocket, "in"]);
                }
            }
        }
    }

    return result;
}

/**
 * Helper to create a socket reference string
 */
export function socketRef(nodeId: string, socketId: string): SocketRef {
    return `${nodeId}:${socketId}`;
}

/**
 * Helper to check if a socket is in the forbidden set
 */
export function isForbidden(forbidden: Set<SocketRef>, nodeId: string, socketId: string): boolean {
    return forbidden.has(`${nodeId}:${socketId}`);
}

export type InterfaceKey = `in:${string}` | `out:${string}`;
export type SubgraphDeps = {
    [key: InterfaceKey]: string[];
};

/**
 * Traces upstream from an input socket to find all input interface nodes that are reachable.
 * Input interface nodes are SOURCE nodes (no inputs, only outputs), so we detect them
 * when we reach their output socket.
 */
function traceUpstreamToInputInterfaces<N>(
    graph: ArcaneGraph.GraphOf<N>,
    startNodeId: string,
    startSocketId: string,
    deps: AllDeps,
    inputNodes: Set<string>,
): Set<string> {
    const visited = new Set<string>(); // "nodeId:socketId:direction"
    const result = new Set<string>(); // input interface node IDs found

    const queue: Array<[string, string, "in" | "out"]> = [[startNodeId, startSocketId, "in"]];

    while (queue.length > 0) {
        const [nodeId, socketId, direction] = queue.shift()!;
        const visitKey = `${nodeId}:${socketId}:${direction}`;

        if (visited.has(visitKey)) continue;
        visited.add(visitKey);

        const node = graph.nodes[nodeId];
        if (!node) continue;

        if (direction === "out") {
            // At an output socket
            // Check if this is an input interface node - if so, we found a dependency
            if (inputNodes.has(nodeId)) {
                result.add(nodeId);
                continue; // Don't trace further - this is a source node
            }

            // Otherwise, use dependsOn to find which inputs it depends on
            const nodeType = NodeTypes.get(node.type);
            const dependsOn = nodeType.dependsOn as AnyDependsOn;
            const dependentInputs = dependsOn(node, socketId, deps);

            for (const inSocket of dependentInputs) {
                queue.push([nodeId, inSocket, "in"]);
            }
        } else {
            // At an input socket - follow the link to find the upstream output
            const linkId = node.in[socketId];
            if (linkId) {
                const link = graph.links[linkId];
                if (link) {
                    queue.push([link.fromNode, link.fromSocket, "out"]);
                }
            }
        }
    }

    return result;
}

/**
 * Computes dependency relationships between interface nodes in a subgraph.
 * For each output interface node, finds which input interface nodes it depends on.
 * Returns a bidirectional map (out→in[] and in→out[]).
 *
 * @param graph - The subgraph to analyze
 * @param interfaces - Array of interface entries like "in:nodeId" or "out:nodeId"
 * @returns A map where keys are interface entries and values are arrays of dependent interface entries
 */
export function computeSubgraphDeps<N>(graph: ArcaneGraph.GraphOf<N>, interfaces: InterfaceMember[], deps: AllDeps): SubgraphDeps {
    const result: SubgraphDeps = {};

    // Early return if no interfaces
    if (!interfaces || interfaces.length === 0) {
        return result;
    }

    const sockets = flattenSockets(interfaces);

    // Parse interfaces into sets for quick lookup
    const inputNodes = new Set<string>();
    const outputNodes = new Set<string>();

    for (const entry of sockets) {
        if (entry.startsWith("in:")) {
            inputNodes.add(entry.slice(3));
        } else if (entry.startsWith("out:")) {
            outputNodes.add(entry.slice(4));
        }
    }

    // Initialize empty arrays for all interface entries
    for (const entry of sockets) {
        result[entry as InterfaceKey] = [];
    }

    // For each output interface node, trace upstream and find which input interface nodes it depends on
    for (const outNodeId of outputNodes) {
        const node = graph.nodes[outNodeId];
        if (!node) continue;

        // Output interface nodes have an "input" socket - trace upstream from there
        // We need to find input interface nodes, which are SOURCE nodes (no inputs, only outputs)
        // So we trace upstream and detect when we reach an output socket of an input interface node
        const foundInputNodes = traceUpstreamToInputInterfaces(graph, outNodeId, "input", deps, inputNodes);

        for (const inputNodeId of foundInputNodes) {
            const outKey: InterfaceKey = `out:${outNodeId}`;
            const inKey: InterfaceKey = `in:${inputNodeId}`;

            if (!result[outKey].includes(inputNodeId)) {
                result[outKey].push(inputNodeId);
            }
            if (!result[inKey].includes(outNodeId)) {
                result[inKey].push(outNodeId);
            }
        }
    }

    return result;
}
