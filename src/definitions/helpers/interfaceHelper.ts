import { nanoid } from "nanoid";
import { NodeDefinitions, NodeTypes } from "../nodeTypes";
import { InterfaceMember, InterfaceSocket } from "../../state/project/types";
import { Enum } from "../datatypes/enum";

/** Recursively removes an entry from an InterfaceMember array, including inside accordions. */
const filterEntry = (members: InterfaceMember[], entry: InterfaceSocket): InterfaceMember[] =>
    members.map((m) => (typeof m !== "string" && m.type === "accordion" ? { ...m, items: filterEntry(m.items as InterfaceMember[], entry) as typeof m.items } : m)).filter((m) => m !== entry);

/**
 * Builds the `in`-socket and `payload` additions a Custom node needs to host one subgraph input interface node.
 * This is the single source of truth for that mapping, shared by Custom node creation (seeding all interfaces at
 * once) and by adding an interface to an already-in-use subgraph. The three cases mirror each other:
 *  - arrayLayerInput  -> supersocket + one initial layer item socket + `layers_` group payload
 *  - arrayPathOpInput -> supersocket + one initial path-op item socket + `pathOps_` group payload
 *  - everything else  -> a plain socket (when socketed) + a `value_` payload seeded from the input's initialValue
 */
export const buildInputSocketPatch = (
    inputNode: NodeDefinitions.NodeFor<NodeDefinitions.Any> | null | undefined,
    nodeId: string,
): { in: Record<string, string | null>; payload: Record<string, unknown> } => {
    const inPatch: Record<string, string | null> = {};
    const payloadPatch: Record<string, unknown> = {};

    if (inputNode?.type === "arrayLayerInput") {
        const socketId = `layer_${nanoid()}`;
        inPatch[nodeId] = null;
        inPatch[socketId] = null;
        payloadPatch[`layers_${nodeId}`] = [{ socket: socketId, enabled: true, blend: Enum.Common.blendMode.NORMAL.value }];
    } else if (inputNode?.type === "arrayPathOpInput") {
        const socketId = `pathop_${nanoid()}`;
        inPatch[nodeId] = null;
        inPatch[socketId] = null;
        payloadPatch[`pathOps_${nodeId}`] = [{ socket: socketId, enabled: true, op: Enum.Common.pathOp.UNIFY.value }];
    } else {
        const socketed = (inputNode?.payload as { socketed?: boolean } | undefined)?.socketed !== false;
        if (socketed) {
            inPatch[nodeId] = null;
        }
        if (inputNode && "initialValue" in inputNode.payload) {
            payloadPatch[`value_${nodeId}`] = (inputNode.payload as { initialValue: unknown }).initialValue;
        }
    }

    return { in: inPatch, payload: payloadPatch };
};

/**
 * Computes every `in`-socket id and `payload` key a Custom node must shed when one input interface node is removed.
 * Inverse of buildInputSocketPatch: includes the supersocket, any layer/path-op group item sockets, and the
 * `value_`/`layers_`/`pathOps_` payload keys (deleting keys that don't exist is harmless).
 */
export const collectInputSocketRemoval = (customNode: NodeDefinitions.NodeFor<NodeDefinitions.Any>, nodeId: string): { socketIds: string[]; payloadKeys: string[] } => {
    const socketIds: string[] = [nodeId];
    const payloadKeys: string[] = [`value_${nodeId}`];

    for (const groupPrefix of ["layers_", "pathOps_"] as const) {
        const key = `${groupPrefix}${nodeId}`;
        if (key in customNode.payload) {
            const entries = (customNode.payload as Record<string, unknown>)[key] as { socket: string }[];
            socketIds.push(...entries.map((e) => e.socket));
            payloadKeys.push(key);
        }
    }

    return { socketIds, payloadKeys };
};

/** Adds an interface entry and propagates the new socket (and any seeded value/group payload) to all Custom nodes referencing this subgraph. */
export const addInterface = (ctx: NodeTypes.MethodContext, graphId: string, nodeId: string, direction: "in" | "out"): void => {
    const entry: InterfaceSocket = `${direction}:${nodeId}`;
    ctx.setInterfaces(graphId, [...ctx.getInterfaces(graphId), entry]);

    const users = ctx.getUsers(graphId);
    if (users.length === 0) return;

    const sourceNode = direction === "in" ? ctx.getNode(graphId, nodeId) : undefined;

    for (const { node: customNodeId, scope } of users) {
        const customNode = ctx.getNode(scope, customNodeId);
        if (customNode?.type !== "custom") continue;

        if (direction === "in") {
            const patch = buildInputSocketPatch(sourceNode, nodeId);
            ctx.setNode(scope, customNodeId, {
                ...customNode,
                in: { ...customNode.in, ...patch.in },
                payload: { ...customNode.payload, ...patch.payload },
            });
        } else {
            ctx.setNode(scope, customNodeId, { ...customNode, out: { ...customNode.out, [nodeId]: [] } });
        }
    }
};

/** Removes an interface entry, disconnects any links on its socket(s), and removes the socket(s) and payload from all Custom nodes referencing this subgraph. */
export const removeInterface = (ctx: NodeTypes.MethodContext, graphId: string, nodeId: string, direction: "in" | "out"): void => {
    const entry: InterfaceSocket = `${direction}:${nodeId}`;

    const users = ctx.getUsers(graphId);
    for (const { node: customNodeId, scope } of users) {
        const customNode = ctx.getNode(scope, customNodeId);
        if (customNode?.type !== "custom") continue;

        if (direction === "in") {
            const { socketIds, payloadKeys } = collectInputSocketRemoval(customNode, nodeId);

            const linksToRemove = socketIds.map((s) => customNode.in[s]).filter((l): l is string => l != null);
            if (linksToRemove.length > 0) {
                ctx.removeLinks(scope, ...linksToRemove);
            }

            const freshNode = ctx.getNode(scope, customNodeId);
            if (freshNode) {
                const newIn = { ...freshNode.in };
                for (const s of socketIds) delete newIn[s];
                const newPayload = { ...freshNode.payload } as Record<string, unknown>;
                for (const k of payloadKeys) delete newPayload[k];
                ctx.setNode(scope, customNodeId, { ...freshNode, in: newIn, payload: newPayload as typeof freshNode.payload });
            }
        } else {
            const linkIds = customNode.out[nodeId] ?? [];
            if (linkIds.length > 0) {
                ctx.removeLinks(scope, ...linkIds);
            }

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

        const linkId = customNode.in[nodeId];
        if (linkId) {
            ctx.removeLinks(scope, linkId);
        }

        const freshNode = ctx.getNode(scope, customNodeId);
        if (freshNode) {
            const newIn = { ...freshNode.in };
            delete newIn[nodeId];
            ctx.setNode(scope, customNodeId, { ...freshNode, in: newIn });
        }
    }
};

/** Shared onPayloadChange handler for all input node types. Propagates socketed toggle to Custom nodes. */
export const handleInputSocketedChange = (node: NodeDefinitions.NodeFor<NodeDefinitions.Generic>, prev: NodeDefinitions.Generic["payload"], graphId: string, ctx: NodeTypes.MethodContext): void => {
    const prevSocketed = (prev as { socketed?: boolean }).socketed !== false;
    const newSocketed = (node.payload as { socketed?: boolean }).socketed !== false;

    if (prevSocketed === newSocketed) return;

    if (newSocketed) {
        addInputSocket(ctx, graphId, node.id);
    } else {
        removeInputSocket(ctx, graphId, node.id);
    }
};
