import { NodeDefinitions, NodeTypes, SocketTypes } from "../betterTypes";
import { ArcaneGraph } from "../../util/structs/arcaneGraph";

// Generic, domain-agnostic node plumbing shared across every node family. These originated in
// math/numericMath but are not numeric-specific, so they live here to avoid non-math nodes
// reaching into the math module for them.

// --- Type helpers for lifecycle hooks ---

/**
 * Query the OUT type of the upstream node connected to one of our IN sockets.
 * Returns NONE if nothing is connected.
 */
export const queryUpstreamOutType = (node: NodeDefinitions.NodeFor<NodeDefinitions.Any>, socketId: string, graphId: string, ctx: NodeTypes.MethodContext): SocketTypes.SocketRule => {
    const linkId = (node.in as Record<string, string | null>)[socketId];
    if (!linkId) return SocketTypes.NONE;
    const link = ctx.getLink(graphId, linkId);
    if (!link) return SocketTypes.NONE;
    const neighbor = ctx.getNode(graphId, link.fromNode);
    if (!neighbor) return SocketTypes.NONE;
    return NodeTypes.getSocketType(neighbor, link.fromSocket, "out", ctx);
};

// --- Interjection factories (drag-a-node-onto-a-wire, straight-through case) ---

/**
 * Factory for a straight-through `canInterject`: accepts the splice when the wire's source can
 * flow into `inRule` and `outRule` can flow into the wire's destination.
 */
export const passthroughCanInterject =
    (inRule: SocketTypes.SocketRule, outRule: SocketTypes.SocketRule) =>
    (link: ArcaneGraph.Link, graphId: string, ctx: NodeTypes.MethodContext): boolean => {
        const fromNode = ctx.getNode(graphId, link.fromNode);
        const toNode = ctx.getNode(graphId, link.toNode);
        if (!fromNode || !toNode) return false;
        const sourceOut = NodeTypes.getSocketType(fromNode, link.fromSocket, "out", ctx);
        const destIn = NodeTypes.getSocketType(toNode, link.toSocket, "in", ctx);
        return SocketTypes.canFlow(sourceOut, inRule) && SocketTypes.canFlow(outRule, destIn);
    };

/**
 * Factory for a straight-through `onInterject`: drops the existing link and re-wires the source
 * into `inSocket`, then `outSocket` onward to the original destination, preserving the wire type.
 */
export const passthroughInterject =
    (inSocket: string, outSocket: string) =>
    (node: NodeDefinitions.NodeFor<NodeDefinitions.Generic>, link: ArcaneGraph.Link, graphId: string, ctx: NodeTypes.MethodContext): void => {
        ctx.removeLinks(graphId, link.id);
        ctx.connect(graphId, link.fromNode, node.id, link.fromSocket, inSocket, link.type);
        ctx.connect(graphId, node.id, link.toNode, outSocket, link.toSocket, link.type);
    };
