import { ArcaneGraph } from "./structs/arcaneGraph";
import { NodeTypes } from "../definitions/betterTypes";

type SocketRef = `${string}:${string}`; // "nodeId:socketId"

// Type-erased versions for dynamic dispatch
type AnyDependsOn = (node: ArcaneGraph.NodeOf<unknown>, outSocket: string) => string[];
type AnyContributesTo = (node: ArcaneGraph.NodeOf<unknown>, inSocket: string) => string[];

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
 * @returns A Set of "nodeId:socketId" strings representing forbidden connection targets
 */
export function computeForbiddenSockets<N>(graph: ArcaneGraph.GraphOf<N>, nodeId: string, socketId: string, side: "in" | "out"): Set<SocketRef> {
    if (side === "out") {
        // Dragging from an output - find all upstream input sockets
        return traceUpstream(graph, nodeId, socketId);
    } else {
        // Dragging from an input - find all downstream output sockets
        return traceDownstream(graph, nodeId, socketId);
    }
}

/**
 * Traces upstream from an output socket to find all input sockets in the dependency chain.
 * Uses dependsOn to traverse within nodes, and links to traverse between nodes.
 */
function traceUpstream<N>(graph: ArcaneGraph.GraphOf<N>, startNodeId: string, startSocketId: string): Set<SocketRef> {
    const visited = new Set<string>(); // "nodeId:socketId:direction" to avoid cycles in traversal
    const result = new Set<SocketRef>(); // input sockets that are upstream

    // Queue entries: [nodeId, socketId, direction]
    // direction: "out" means we're at an output socket, "in" means we're at an input socket
    const queue: Array<[string, string, "in" | "out"]> = [[startNodeId, startSocketId, "out"]];

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
            const dependentInputs = dependsOn(node, socketId);

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
function traceDownstream<N>(graph: ArcaneGraph.GraphOf<N>, startNodeId: string, startSocketId: string): Set<SocketRef> {
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
            const contributingOutputs = contributesTo(node, socketId);

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
