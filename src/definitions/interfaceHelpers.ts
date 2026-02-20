import { nanoid } from "nanoid";
import { NodeDefinitions, NodeTypes } from "./betterTypes";
import { InterfaceMember, InterfaceSocket } from "../state/project/types";
import { Enum } from "./datatypes/enum";

/** Recursively removes an entry from an InterfaceMember array, including inside accordions. */
const filterEntry = (members: InterfaceMember[], entry: InterfaceSocket): InterfaceMember[] =>
    members
        .map((m) => (typeof m !== "string" && m.type === "accordion" ? { ...m, items: filterEntry(m.items as InterfaceMember[], entry) as typeof m.items } : m))
        .filter((m) => m !== entry);

/** Adds an interface entry and propagates the new socket to all Custom nodes referencing this subgraph. */
export const addInterface = (ctx: NodeTypes.MethodContext, graphId: string, nodeId: string, direction: "in" | "out"): void => {
    const entry: InterfaceSocket = `${direction}:${nodeId}`;
    ctx.setInterfaces(graphId, [...ctx.getInterfaces(graphId), entry]);

    const users = ctx.getUsers(graphId);
    if (users.length > 0) {
        const sourceNode = ctx.getNode(graphId, nodeId);
        const isLayerGroup = direction === "in" && sourceNode?.type === "arrayLayerInput";

        for (const { node: customNodeId, scope } of users) {
            const customNode = ctx.getNode(scope, customNodeId);
            if (customNode?.type === "custom") {
                let updatedNode: NodeDefinitions.NodeFor<NodeDefinitions.Any>;
                if (isLayerGroup) {
                    const socketId = `layer_${nanoid()}`;
                    updatedNode = {
                        ...customNode,
                        in: { ...customNode.in, [nodeId]: null, [socketId]: null },
                        payload: {
                            ...customNode.payload,
                            [`layers_${nodeId}`]: [{ socket: socketId, enabled: true, blend: Enum.Common.blendMode.NORMAL.value }],
                        },
                    };
                } else {
                    updatedNode = direction === "in" ? { ...customNode, in: { ...customNode.in, [nodeId]: null } } : { ...customNode, out: { ...customNode.out, [nodeId]: [] } };
                }
                ctx.setNode(scope, customNodeId, updatedNode);
            }
        }
    }
};

/** Removes an interface entry, disconnects any links on the socket, and removes it from all Custom nodes referencing this subgraph. */
export const removeInterface = (ctx: NodeTypes.MethodContext, graphId: string, nodeId: string, direction: "in" | "out"): void => {
    const entry: InterfaceSocket = `${direction}:${nodeId}`;

    const users = ctx.getUsers(graphId);
    for (const { node: customNodeId, scope } of users) {
        const customNode = ctx.getNode(scope, customNodeId);
        if (customNode?.type !== "custom") continue;

        // Check if this is a layer group by looking for layers_${nodeId} in payload
        const layersKey = `layers_${nodeId}`;
        const isLayerGroup = direction === "in" && layersKey in customNode.payload;

        if (isLayerGroup) {
            const layerEntries = (customNode.payload as Record<string, unknown>)[layersKey] as { socket: string }[];

            // Collect all link IDs to remove (layer sockets + supersocket)
            const linksToRemove: string[] = [];
            for (const le of layerEntries) {
                const linkId = customNode.in[le.socket];
                if (linkId) linksToRemove.push(linkId);
            }
            const superLinkId = customNode.in[nodeId];
            if (superLinkId) linksToRemove.push(superLinkId);

            // Remove links through the high-level operation (fires onDisconnect)
            if (linksToRemove.length > 0) {
                ctx.removeLinks(scope, ...linksToRemove);
            }

            // Remove all layer sockets + supersocket from in map and layers key from payload
            // Re-read the node since removeLinks may have modified it
            const freshNode = ctx.getNode(scope, customNodeId);
            if (freshNode) {
                const newIn = { ...freshNode.in };
                delete newIn[nodeId];
                for (const le of layerEntries) {
                    delete newIn[le.socket];
                }
                const newPayload = { ...freshNode.payload };
                delete (newPayload as Record<string, unknown>)[layersKey];
                ctx.setNode(scope, customNodeId, { ...freshNode, in: newIn, payload: newPayload });
            }
        } else if (direction === "in") {
            // Disconnect the single link on this input socket
            const linkId = customNode.in[nodeId];
            if (linkId) {
                ctx.removeLinks(scope, linkId);
            }

            // Remove socket from in map (re-read node since removeLinks may have modified it)
            const freshNode = ctx.getNode(scope, customNodeId);
            if (freshNode) {
                const newIn = { ...freshNode.in };
                delete newIn[nodeId];
                ctx.setNode(scope, customNodeId, { ...freshNode, in: newIn });
            }
        } else {
            // Disconnect all links from this output socket
            const linkIds = customNode.out[nodeId] ?? [];
            if (linkIds.length > 0) {
                ctx.removeLinks(scope, ...linkIds);
            }

            // Remove socket from out map (re-read node since removeLinks may have modified it)
            const freshNode = ctx.getNode(scope, customNodeId);
            if (freshNode) {
                const newOut = { ...freshNode.out };
                delete newOut[nodeId];
                ctx.setNode(scope, customNodeId, { ...freshNode, out: newOut });
            }
        }
    }

    ctx.setInterfaces(graphId, filterEntry(ctx.getInterfaces(graphId), entry));
};

/** Adds an input socket to all Custom nodes referencing this subgraph (without modifying interface entries). */
export const addInputSocket = (ctx: NodeTypes.MethodContext, graphId: string, nodeId: string): void => {
    const users = ctx.getUsers(graphId);
    if (users.length === 0) return;

    for (const { node: customNodeId, scope } of users) {
        const customNode = ctx.getNode(scope, customNodeId);
        if (customNode?.type === "custom") {
            ctx.setNode(scope, customNodeId, { ...customNode, in: { ...customNode.in, [nodeId]: null } });
        }
    }
};

/** Removes an input socket from all Custom nodes referencing this subgraph, disconnecting any links (without modifying interface entries). */
export const removeInputSocket = (ctx: NodeTypes.MethodContext, graphId: string, nodeId: string): void => {
    const users = ctx.getUsers(graphId);
    if (users.length === 0) return;

    for (const { node: customNodeId, scope } of users) {
        const customNode = ctx.getNode(scope, customNodeId);
        if (customNode?.type !== "custom") continue;

        // Disconnect the single link on this input socket
        const linkId = customNode.in[nodeId];
        if (linkId) {
            ctx.removeLinks(scope, linkId);
        }

        // Remove socket from in map (re-read node since removeLinks may have modified it)
        const freshNode = ctx.getNode(scope, customNodeId);
        if (freshNode) {
            const newIn = { ...freshNode.in };
            delete newIn[nodeId];
            ctx.setNode(scope, customNodeId, { ...freshNode, in: newIn });
        }
    }
};

/** Shared onPayloadChange handler for all input node types. Propagates socketed toggle to Custom nodes. */
export const handleInputSocketedChange = (
    node: NodeDefinitions.NodeFor<NodeDefinitions.Generic>,
    prev: NodeDefinitions.Generic["payload"],
    graphId: string,
    ctx: NodeTypes.MethodContext,
): void => {
    const prevSocketed = (prev as { socketed?: boolean }).socketed !== false;
    const newSocketed = (node.payload as { socketed?: boolean }).socketed !== false;

    if (prevSocketed === newSocketed) return;

    if (newSocketed) {
        addInputSocket(ctx, graphId, node.id);
    } else {
        removeInputSocket(ctx, graphId, node.id);
    }
};
