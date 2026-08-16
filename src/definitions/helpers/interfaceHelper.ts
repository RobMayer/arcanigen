import { nanoid } from "nanoid";
import { NodeDefinitions, NodeTypes } from "../nodeTypes";
import { InterfaceMember, InterfaceSocket } from "../../state/project/types";
import { Enum } from "../datatypes/enum";

/** Recursively removes an entry from an InterfaceMember array, including inside accordions. */
const filterEntry = (members: InterfaceMember[], entry: InterfaceSocket): InterfaceMember[] =>
    members.map((m) => (typeof m !== "string" && m.type === "accordion" ? { ...m, items: filterEntry(m.items as InterfaceMember[], entry) as typeof m.items } : m)).filter((m) => m !== entry);

/** A single element row of an array input's Dynamic List: a unique element socket plus per-type fields. */
export type ArrayGroupEntry = { socket: string } & Record<string, unknown>;

/**
 * The data half of the array-input group registry: for each array input type, where its element rows live on the
 * host (`groupKey`) and how to mint a fresh row (`makeEntry`). Layer/path-op keep their historical payload keys and
 * socket prefixes; the rest share `elements_`/`elem_`. The view half (row editors, eval folds, socket types) lives
 * in customNode. Defaults here mirror each type's array constructor sibling (floatArray, colorStopArray, ...).
 */
const el = (): string => `elem_${nanoid()}`;
const ARRAY_GROUP_DATA: Record<string, { groupKey: (nodeId: string) => string; makeEntry: () => ArrayGroupEntry }> = {
    arrayLayerInput: { groupKey: (id) => `layers_${id}`, makeEntry: () => ({ socket: `layer_${nanoid()}`, enabled: true, blend: Enum.Common.blendMode.NORMAL.value }) },
    arrayPathOpInput: { groupKey: (id) => `pathOps_${id}`, makeEntry: () => ({ socket: `pathop_${nanoid()}`, enabled: true, op: Enum.Common.pathOp.UNIFY.value }) },
    arrayFloatInput: { groupKey: (id) => `elements_${id}`, makeEntry: () => ({ socket: el(), value: "0" }) },
    arrayIntegerInput: { groupKey: (id) => `elements_${id}`, makeEntry: () => ({ socket: el(), value: "0" }) },
    arrayAngleInput: { groupKey: (id) => `elements_${id}`, makeEntry: () => ({ socket: el(), value: "0deg" }) },
    arrayLengthInput: { groupKey: (id) => `elements_${id}`, makeEntry: () => ({ socket: el(), value: "0px" }) },
    arrayColorInput: { groupKey: (id) => `elements_${id}`, makeEntry: () => ({ socket: el(), value: { r: 1, g: 1, b: 1, a: 1 } }) },
    arrayBooleanInput: { groupKey: (id) => `elements_${id}`, makeEntry: () => ({ socket: el(), value: false }) },
    arrayPointInput: { groupKey: (id) => `elements_${id}`, makeEntry: () => ({ socket: el(), mode: Enum.Common.positionMode.CARTESIAN.value, x: "0px", y: "0px", radius: "100px", theta: "0deg" }) },
    arrayStopColorInput: { groupKey: (id) => `elements_${id}`, makeEntry: () => ({ socket: el(), value: { r: 0, g: 0, b: 0, a: 1 }, position: "0", enabled: true }) },
    arrayStopFloatInput: { groupKey: (id) => `elements_${id}`, makeEntry: () => ({ socket: el(), value: "0", position: "0", enabled: true }) },
    arrayStopAngleInput: { groupKey: (id) => `elements_${id}`, makeEntry: () => ({ socket: el(), value: "0deg", position: "0", enabled: true }) },
    arrayStopIntegerInput: { groupKey: (id) => `elements_${id}`, makeEntry: () => ({ socket: el(), value: "0", position: "0", enabled: true }) },
    arrayStopLengthInput: { groupKey: (id) => `elements_${id}`, makeEntry: () => ({ socket: el(), value: "0px", position: "0", enabled: true }) },
};

/** Payload key prefixes under which array-input Dynamic List rows are stored on a host (for prefix-based cleanup). */
export const ARRAY_GROUP_PAYLOAD_PREFIXES = ["layers_", "pathOps_", "elements_"] as const;

/** True when this input type renders a Dynamic List of element rows on the host (any array input type). */
export const isArrayGroupInput = (type: string | undefined): boolean => type !== undefined && type in ARRAY_GROUP_DATA;

/** The host payload key under which an array input's element rows are stored. */
export const arrayGroupKey = (type: string, nodeId: string): string => ARRAY_GROUP_DATA[type].groupKey(nodeId);

/** A fresh element row (unique socket + per-type default fields) for an array input's Dynamic List. */
export const makeArrayGroupEntry = (type: string): ArrayGroupEntry => ARRAY_GROUP_DATA[type].makeEntry();

/** True when an array input's widget is Dynamic List (undefined defaults to Dynamic List, the legacy group behavior). */
const isGroupDynamic = (payload: { widget?: number }): boolean => payload.widget !== Enum.Common.arrayInputWidget.NONE.value;

/** True when an input's supersocket is exposed (default true). */
const isSocketed = (payload: { socketed?: boolean }): boolean => payload.socketed !== false;

/**
 * Builds the `in`-socket and `payload` additions a Custom node needs to host one subgraph input interface node.
 * This is the single source of truth for that mapping, shared by Custom node creation (seeding all interfaces at
 * once) and by adding an interface to an already-in-use subgraph. Two shapes:
 *  - group inputs (arrayLayerInput/arrayPathOpInput) -> a supersocket when `socketed`, plus one initial element
 *    socket + `layers_`/`pathOps_` group payload when the widget is Dynamic List (the two flags are orthogonal)
 *  - everything else -> a plain socket (when `socketed`) + a `value_` payload seeded from the input's initialValue
 */
export const buildInputSocketPatch = (
    inputNode: NodeDefinitions.NodeFor<NodeDefinitions.Any> | null | undefined,
    nodeId: string,
): { in: Record<string, string | null>; payload: Record<string, unknown> } => {
    const inPatch: Record<string, string | null> = {};
    const payloadPatch: Record<string, unknown> = {};

    if (isArrayGroupInput(inputNode?.type)) {
        // socketed -> the array supersocket is exposed; Dynamic List widget -> an initial element row is seeded.
        // The two flags are orthogonal (mirrors value inputs); either, both, or neither may be present.
        if (isSocketed(inputNode!.payload as { socketed?: boolean })) {
            inPatch[nodeId] = null;
        }
        if (isGroupDynamic(inputNode!.payload as { widget?: number })) {
            const entry = makeArrayGroupEntry(inputNode!.type);
            inPatch[entry.socket] = null;
            payloadPatch[arrayGroupKey(inputNode!.type, nodeId)] = [entry];
        }
    } else {
        if (isSocketed((inputNode?.payload as { socketed?: boolean } | undefined) ?? {})) {
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
 * Inverse of buildInputSocketPatch: includes the supersocket, any Dynamic List element sockets, and the
 * `value_`/`layers_`/`pathOps_`/`elements_` payload keys (deleting keys that don't exist is harmless).
 */
export const collectInputSocketRemoval = (customNode: NodeDefinitions.NodeFor<NodeDefinitions.Any>, nodeId: string): { socketIds: string[]; payloadKeys: string[] } => {
    const socketIds: string[] = [nodeId];
    const payloadKeys: string[] = [`value_${nodeId}`];

    for (const groupPrefix of ARRAY_GROUP_PAYLOAD_PREFIXES) {
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

/** Adds an array input's Dynamic List payload plus one initial element socket to every hosting Custom node. */
const addGroupList = (ctx: NodeTypes.MethodContext, graphId: string, type: string, nodeId: string): void => {
    const groupKey = arrayGroupKey(type, nodeId);
    for (const { node: customNodeId, scope } of ctx.getUsers(graphId)) {
        const customNode = ctx.getNode(scope, customNodeId);
        if (customNode?.type !== "custom") continue;
        if (groupKey in customNode.payload) continue;
        const entry = makeArrayGroupEntry(type);
        ctx.setNode(scope, customNodeId, {
            ...customNode,
            in: { ...customNode.in, [entry.socket]: null },
            payload: { ...customNode.payload, [groupKey]: [entry] },
        });
    }
};

/** Removes an array input's Dynamic List payload plus all its element sockets (disconnecting links) from every hosting Custom node. */
const removeGroupList = (ctx: NodeTypes.MethodContext, graphId: string, type: string, nodeId: string): void => {
    const groupKey = arrayGroupKey(type, nodeId);
    for (const { node: customNodeId, scope } of ctx.getUsers(graphId)) {
        const customNode = ctx.getNode(scope, customNodeId);
        if (customNode?.type !== "custom") continue;
        const entries = (customNode.payload as Record<string, unknown>)[groupKey] as { socket: string }[] | undefined;
        if (!entries) continue;

        const links = entries.map((e) => customNode.in[e.socket]).filter((l): l is string => l != null);
        if (links.length > 0) ctx.removeLinks(scope, ...links);

        const fresh = ctx.getNode(scope, customNodeId);
        if (fresh?.type !== "custom") continue;
        const newIn = { ...fresh.in };
        for (const e of entries) delete newIn[e.socket];
        const newPayload = { ...fresh.payload } as Record<string, unknown>;
        delete newPayload[groupKey];
        ctx.setNode(scope, customNodeId, { ...fresh, in: newIn, payload: newPayload as typeof fresh.payload });
    }
};

/**
 * onPayloadChange for all array inputs. Propagates both flags independently to every hosting Custom node: the
 * socketed toggle adds/removes the supersocket, and the widget toggle adds/removes the Dynamic List element rows.
 */
export const handleArrayInputPayloadChange = (node: NodeDefinitions.NodeFor<NodeDefinitions.Generic>, prev: NodeDefinitions.Generic["payload"], graphId: string, ctx: NodeTypes.MethodContext): void => {
    if (!isArrayGroupInput(node.type)) return;

    const prevSocketed = isSocketed(prev as { socketed?: boolean });
    const newSocketed = isSocketed(node.payload as { socketed?: boolean });
    if (prevSocketed !== newSocketed) {
        if (newSocketed) addInputSocket(ctx, graphId, node.id);
        else removeInputSocket(ctx, graphId, node.id);
    }

    const prevDynamic = isGroupDynamic(prev as { widget?: number });
    const newDynamic = isGroupDynamic(node.payload as { widget?: number });
    if (prevDynamic !== newDynamic) {
        if (newDynamic) addGroupList(ctx, graphId, node.type, node.id);
        else removeGroupList(ctx, graphId, node.type, node.id);
    }
};
