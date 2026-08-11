import { NodeDefinitions, NodeTypes } from "../nodeTypes";
import { SocketTypes } from "../socketTypes";
import { ArcaneGraph } from "../../util/structs/arcaneGraph";

/**
 * Query the OUT type of the upstream node connected to one of our IN sockets.
 * Returns NONE if nothing is connected.
 */

export const queryUpstreamOutType = (node: NodeDefinitions.NodeFor<NodeDefinitions.Any>, socketId: string, graphId: string, ctx: NodeTypes.MethodContext): SocketTypes.Term => {
    const linkId = (node.in as Record<string, string | null>)[socketId];
    if (!linkId) return SocketTypes.NONE;
    const link = ctx.getLink(graphId, linkId);
    if (!link) return SocketTypes.NONE;
    const neighbor = ctx.getNode(graphId, link.fromNode);
    if (!neighbor) return SocketTypes.NONE;
    return NodeTypes.getSocketType(neighbor, link.fromSocket, "out", graphId, ctx);
};

/**
 * Commit a freshly-solved per-socket `{in, out}` type map into the transient socket-type cache
 */
export const commitSocketTypes = (
    node: NodeDefinitions.NodeFor<NodeDefinitions.Any>,
    graphId: string,
    ctx: NodeTypes.MethodContext,
    solved: { in: Record<string, SocketTypes.Term>; out: Record<string, SocketTypes.Term> },
): void => {
    const prev = ctx.getSocketTypes(graphId, node.id) ?? { in: {}, out: {} };
    const changed: { sock: string; side: "in" | "out" }[] = [];
    const mergeSide = (side: "in" | "out"): Record<string, SocketTypes.Term> => {
        const p = prev[side];
        const n = solved[side];
        const merged: Record<string, SocketTypes.Term> = {};
        for (const sock of new Set([...Object.keys(p), ...Object.keys(n)])) {
            const pr = p[sock];
            const nr = n[sock];
            if (nr === undefined) {
                changed.push({ sock, side }); // socket dropped from the solution
                continue;
            }
            if (pr && SocketTypes.equals(pr, nr)) {
                merged[sock] = pr; // unchanged: keep the old object for referential stability
            } else {
                merged[sock] = nr;
                changed.push({ sock, side });
            }
        }
        return merged;
    };
    const entry = { in: mergeSide("in"), out: mergeSide("out") };
    if (changed.length === 0) return;

    ctx.setSocketTypes(graphId, node.id, entry);

    // push the changes outward: input sockets notify upstream, output sockets notify downstream
    for (const { sock, side } of changed) {
        if (side === "in" && (node.in as Record<string, string | null>)[sock]) ctx.requestRefresh(graphId, node.id, sock, "in", "constraintAdded");
        if (side === "out" && ((node.out as Record<string, string[]>)[sock]?.length ?? 0) > 0) ctx.requestRefresh(graphId, node.id, sock, "out", "constraintAdded");
    }
};

/**
 * Factory for a straight-through `canInterject`: accepts the splice when the wire's source can
 * flow into `inRule` and `outRule` can flow into the wire's destination.
 */
export const passthroughCanInterject =
    (inRule: SocketTypes.Term, outRule: SocketTypes.Term) =>
    (link: ArcaneGraph.Link, graphId: string, ctx: NodeTypes.MethodContext): boolean => {
        const fromNode = ctx.getNode(graphId, link.fromNode);
        const toNode = ctx.getNode(graphId, link.toNode);
        if (!fromNode || !toNode) return false;
        const sourceOut = NodeTypes.getSocketType(fromNode, link.fromSocket, "out", graphId, ctx);
        const destIn = NodeTypes.getSocketType(toNode, link.toSocket, "in", graphId, ctx);
        return SocketTypes.canFlow(sourceOut, inRule) && SocketTypes.canFlow(outRule, destIn);
    };

/**
 * Factory for a straight-through `onInterject`: drops the existing link and re-wires the source
 * into `inSocket`, then `outSocket` onward to the original destination
 */
export const passthroughInterject =
    (inSocket: string, outSocket: string) =>
    (node: NodeDefinitions.NodeFor<NodeDefinitions.Generic>, link: ArcaneGraph.Link, graphId: string, ctx: NodeTypes.MethodContext): void => {
        ctx.removeLinks(graphId, link.id);
        ctx.connect(graphId, link.fromNode, node.id, link.fromSocket, inSocket);
        ctx.connect(graphId, node.id, link.toNode, outSocket, link.toSocket);
    };
