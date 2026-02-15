import { NodeDefinitions, NodeTypes } from "./betterTypes";
import { InterfaceMember, InterfaceSocket } from "../state/project/types";

/** Recursively removes an entry from an InterfaceMember array, including inside accordions. */
const filterEntry = (members: InterfaceMember[], entry: InterfaceSocket): InterfaceMember[] =>
    members
        .map((m) => (typeof m !== "string" && m.type === "accordion" ? { ...m, items: filterEntry(m.items as InterfaceMember[], entry) as typeof m.items } : m))
        .filter((m) => m !== entry);

/** Adds an interface entry and propagates the new socket to all Custom nodes referencing this subgraph. */
export const addInterface = (state: NodeTypes.HookState, graphId: string, nodeId: string, direction: "in" | "out"): NodeTypes.HookState => {
    const entry: InterfaceSocket = `${direction}:${nodeId}`;
    let newState: NodeTypes.HookState = {
        ...state,
        interfaces: {
            ...state.interfaces,
            [graphId]: [...(state.interfaces[graphId] ?? []), entry],
        },
    };

    const users = newState.users[graphId] ?? [];
    if (users.length > 0) {
        let newNodes = newState.nodes;
        for (const { node: customNodeId, scope } of users) {
            const customNode = newNodes[scope]?.[customNodeId];
            if (customNode?.type === "custom") {
                const socketPatch = direction === "in" ? { in: { ...customNode.in, [nodeId]: null } } : { out: { ...customNode.out, [nodeId]: [] } };
                newNodes = {
                    ...newNodes,
                    [scope]: {
                        ...newNodes[scope],
                        [customNodeId]: { ...customNode, ...socketPatch },
                    },
                };
            }
        }
        newState = { ...newState, nodes: newNodes };
    }

    return newState;
};

/** Removes an interface entry, disconnects any links on the socket, and removes it from all Custom nodes referencing this subgraph. */
export const removeInterface = (state: NodeTypes.HookState, graphId: string, nodeId: string, direction: "in" | "out"): NodeTypes.HookState => {
    const entry: InterfaceSocket = `${direction}:${nodeId}`;
    let newNodes = state.nodes;
    let newLinks = state.links;

    const users = state.users[graphId] ?? [];
    for (const { node: customNodeId, scope } of users) {
        const customNode = newNodes[scope]?.[customNodeId];
        if (customNode?.type !== "custom") continue;

        if (direction === "in") {
            // Disconnect the single link on this input socket
            const linkId = customNode.in[nodeId];
            if (linkId && newLinks[scope]?.[linkId]) {
                const link = newLinks[scope][linkId];
                const fromNode = newNodes[scope][link.fromNode];
                if (fromNode) {
                    newNodes = {
                        ...newNodes,
                        [scope]: {
                            ...newNodes[scope],
                            [link.fromNode]: {
                                ...fromNode,
                                out: { ...fromNode.out, [link.fromSocket]: (fromNode.out[link.fromSocket] ?? []).filter((id) => id !== linkId) },
                            },
                        },
                    };
                }
                const scopeLinks = { ...newLinks[scope] };
                delete scopeLinks[linkId];
                newLinks = { ...newLinks, [scope]: scopeLinks };
            }

            // Remove socket from in map
            const newIn = { ...newNodes[scope][customNodeId].in };
            delete newIn[nodeId];
            newNodes = {
                ...newNodes,
                [scope]: { ...newNodes[scope], [customNodeId]: { ...newNodes[scope][customNodeId], in: newIn } },
            };
        } else {
            // Disconnect all links from this output socket
            const linkIds = customNode.out[nodeId] ?? [];
            for (const linkId of linkIds) {
                if (newLinks[scope]?.[linkId]) {
                    const link = newLinks[scope][linkId];
                    const toNode = newNodes[scope][link.toNode];
                    if (toNode) {
                        newNodes = {
                            ...newNodes,
                            [scope]: {
                                ...newNodes[scope],
                                [link.toNode]: { ...toNode, in: { ...toNode.in, [link.toSocket]: null } },
                            },
                        };
                    }
                    const scopeLinks = { ...newLinks[scope] };
                    delete scopeLinks[linkId];
                    newLinks = { ...newLinks, [scope]: scopeLinks };
                }
            }

            // Remove socket from out map
            const newOut = { ...newNodes[scope][customNodeId].out };
            delete newOut[nodeId];
            newNodes = {
                ...newNodes,
                [scope]: { ...newNodes[scope], [customNodeId]: { ...newNodes[scope][customNodeId], out: newOut } },
            };
        }
    }

    return {
        ...state,
        nodes: newNodes,
        links: newLinks,
        interfaces: {
            ...state.interfaces,
            [graphId]: filterEntry(state.interfaces[graphId] ?? [], entry),
        },
    };
};

/** Adds an input socket to all Custom nodes referencing this subgraph (without modifying interface entries). */
export const addInputSocket = (state: NodeTypes.HookState, graphId: string, nodeId: string): NodeTypes.HookState => {
    const users = state.users[graphId] ?? [];
    if (users.length === 0) return state;

    let newNodes = state.nodes;
    for (const { node: customNodeId, scope } of users) {
        const customNode = newNodes[scope]?.[customNodeId];
        if (customNode?.type === "custom") {
            newNodes = {
                ...newNodes,
                [scope]: {
                    ...newNodes[scope],
                    [customNodeId]: { ...customNode, in: { ...customNode.in, [nodeId]: null } },
                },
            };
        }
    }
    return { ...state, nodes: newNodes };
};

/** Removes an input socket from all Custom nodes referencing this subgraph, disconnecting any links (without modifying interface entries). */
export const removeInputSocket = (state: NodeTypes.HookState, graphId: string, nodeId: string): NodeTypes.HookState => {
    const users = state.users[graphId] ?? [];
    if (users.length === 0) return state;

    let newNodes = state.nodes;
    let newLinks = state.links;

    for (const { node: customNodeId, scope } of users) {
        const customNode = newNodes[scope]?.[customNodeId];
        if (customNode?.type !== "custom") continue;

        // Disconnect the single link on this input socket
        const linkId = customNode.in[nodeId];
        if (linkId && newLinks[scope]?.[linkId]) {
            const link = newLinks[scope][linkId];
            const fromNode = newNodes[scope][link.fromNode];
            if (fromNode) {
                newNodes = {
                    ...newNodes,
                    [scope]: {
                        ...newNodes[scope],
                        [link.fromNode]: {
                            ...fromNode,
                            out: { ...fromNode.out, [link.fromSocket]: (fromNode.out[link.fromSocket] ?? []).filter((id) => id !== linkId) },
                        },
                    },
                };
            }
            const scopeLinks = { ...newLinks[scope] };
            delete scopeLinks[linkId];
            newLinks = { ...newLinks, [scope]: scopeLinks };
        }

        // Remove socket from in map
        const newIn = { ...newNodes[scope][customNodeId].in };
        delete newIn[nodeId];
        newNodes = {
            ...newNodes,
            [scope]: { ...newNodes[scope], [customNodeId]: { ...newNodes[scope][customNodeId], in: newIn } },
        };
    }

    return { ...state, nodes: newNodes, links: newLinks };
};

/** Shared onPayloadChange handler for all input node types. Propagates socketed toggle to Custom nodes. */
export const handleInputSocketedChange = (
    node: NodeDefinitions.NodeFor<NodeDefinitions.Generic>,
    prev: NodeDefinitions.Generic["payload"],
    state: NodeTypes.HookState,
    graphId: string,
): NodeTypes.HookState | null => {
    const prevSocketed = (prev as { socketed?: boolean }).socketed !== false;
    const newSocketed = (node.payload as { socketed?: boolean }).socketed !== false;

    if (prevSocketed === newSocketed) return null;

    if (newSocketed) {
        return addInputSocket(state, graphId, node.id);
    } else {
        return removeInputSocket(state, graphId, node.id);
    }
};
