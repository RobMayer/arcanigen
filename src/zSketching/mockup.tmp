import { nanoid } from "nanoid";
import { ArcaneGraph } from "../util/structs/arcaneGraph";

namespace Mockup {
    type NodeLayer = {
        layers: {
            socketId: ArcaneGraph.SocketId;
            blendMode: string;
            enabled: boolean;
        }[];
    };

    class NodeTypeLayer {
        create(): ArcaneGraph.NodeOf<NodeLayer> {
            const firstSocketId = nanoid();
            return {
                id: nanoid(),
                // parent: null,
                type: "layer",
                // children: [],
                in: {
                    layers: null,
                    [firstSocketId]: null,
                },
                out: {
                    output: [],
                },
                payload: {
                    layers: [{ socketId: firstSocketId, blendMode: "normal", enabled: true }],
                },
            };
        }

        // todo: args are a work-in-progress
        evaluate(graph: ArcaneGraph.GraphOf<unknown, unknown>, node: ArcaneGraph.NodeOf<NodeLayer>, socket: string) {
            if (socket === "output") {
                if (node.in.layers !== null) {
                    // get link from node.in.layers
                    // get oppositeNode and oppositeSocket from link
                    // get nodeType from node
                    // return NODEREGISTRY[nodeType].evaluate(graph, oppositeNode, oppositeSocket);
                    return;
                }
                return {
                    type: "svg",
                    tag: "g",
                    children: node.payload.layers.reduce<any[]>((acc, layer, i) => {
                        if (node.in[layer.socketId] !== null && layer.enabled) {
                            // todo: get the upstrea node's evaluation
                            const result = null;
                            if (result !== null) {
                                acc.push({
                                    type: "svg",
                                    tag: "g",
                                    attributes: {
                                        style: {
                                            "mix-blend-mode": layer.blendMode,
                                        },
                                    },
                                    children: [result],
                                });
                            }
                        }
                        return acc;
                    }, []),
                };
            }
        }

        getOutputSockets(node: ArcaneGraph.NodeOf<NodeLayer>) {
            return [
                {
                    label: "Output",
                    id: "output",
                    type: "shape",
                },
            ];
        }

        // todo: input might need an associated widget - not sure if this is the right place to do this as this could just be purely for getting socket information.
        getInputSockets(node: ArcaneGraph.NodeOf<NodeLayer>) {
            return [
                {
                    // because one needs to be able to control layers within a subgraph from outside that subgraph...
                    label: "Layers",
                    id: "layer",
                    type: "layers",
                },
                ...(node.in.layers !== null
                    ? []
                    : node.payload.layers.map((layer, i) => {
                          return {
                              label: `Layer ${i + 1}`,
                              id: layer.socketId,
                              type: "shape",
                          };
                      })),
            ];
        }

        // todo: figure out how to
        getInterface(node: ArcaneGraph.NodeOf<NodeLayer>) {
            return [
                {
                    label: "Output",
                    outSocket: "output",
                    widget: "none",
                },
                {
                    label: "Layers",
                    inSocket: "layers",
                    widget: "listOf",
                    property: "layers",
                    modifiable: true, // delete/add buttons?
                    sortable: true, // can be re-sorted?
                    member: {
                        widget: "layer",
                        inSocket: {
                            key: "socketId",
                            type: "shape",
                        },
                    },
                },
            ];
        }
    }

    type NodeInputFloat = {
        defaultValue: number | null;
        label: string;
        socketed: boolean;
        step: number | null;
        min: number | null;
        max: number | null;
    };

    class NodeTypeInputFloat {
        create(): ArcaneGraph.NodeOf<NodeInputFloat> {
            return {
                id: nanoid(),
                // parent: null,
                type: "inputFloat",
                // children: [],
                in: {}, // Inputs don't actually have their own sockets
                out: {
                    output: [],
                },
                payload: {
                    defaultValue: 1,
                    label: "Value",
                    socketed: true,
                    step: null,
                    min: null,
                    max: null,
                },
            };
        }

        // todo: evaluate this node.
        evalutate(graph: ArcaneGraph.GraphOf<unknown, unknown>, node: ArcaneGraph.NodeOf<NodeInputFloat>, socket: string) {
            if (socket === "output") {
            }
        }

        getOutputSockets(node: ArcaneGraph.NodeOf<NodeInputFloat>) {
            return [
                {
                    label: "Output",
                    id: "output",
                    type: "float",
                },
            ];
        }

        getInputSockets(node: ArcaneGraph.NodeOf<NodeInputFloat>) {
            return [];
        }

        // * this is describing what the node WITHIN the subgraph looks like, not what appears on the Custom node that utilzies the subgraph that this input node is part of.
        getInterface(node: ArcaneGraph.NodeOf<NodeInputFloat>) {
            return [
                {
                    property: "output",
                    outSocket: "output",
                    widget: "numericoutput",
                },
                {
                    property: "label",
                    widget: "textinput",
                    hint: "What is this input called on the custom node",
                    pattern: null,
                },
                {
                    property: "socketed",
                    widget: "checkbox",
                    hint: "Will this input on a custom node have a socket",
                    text: "Socketed",
                },
                {
                    property: "defaultValue",
                    widget: "numericInput",
                    hint: "If all else fails, what should this output",
                    isNullable: true,
                    min: null,
                    max: null,
                    step: null,
                },
                {
                    property: "min",
                    widget: "numericInput",
                    hint: "What is the minimum?",
                    isNullable: true,
                    min: null,
                    max: null,
                    step: null,
                },
                {
                    property: "max",
                    widget: "numericInput",
                    hint: "What is the maximum?",
                    isNullable: true,
                    min: null,
                    max: null,
                    step: null,
                },
                {
                    property: "step",
                    widget: "numericInput",
                    hint: "What is the step?",
                    isNullable: true,
                    min: null,
                    max: null,
                    step: null,
                },
            ];
        }
    }

    // The payload for a custom node just needs to know which subgraph it references.
    type NodeCustom = {
        subgraphId: ArcaneGraph.SubgraphId;
    };

    type EvaluationContext = {
        scope: string | null; // what subgraph (if any) are we currently in
        host?: {
            // passed-in by custom node so that it knows where to fetch additional data from
            nodeId: string;
            subgraph: string | null;
        };
    };

    class NodeTypeCustom {
        create(subgraphId: ArcaneGraph.SubgraphId, graph: ArcaneGraph.GraphOf<unknown, unknown>): ArcaneGraph.NodeOf<NodeCustom> {
            const subgraph = graph.subgraphs[subgraphId];
            if (!subgraph) {
                throw new Error(`Subgraph ${subgraphId} not found`);
            }

            // Build input sockets from the subgraph's input nodes
            const inSockets: { [key: ArcaneGraph.SocketId]: ArcaneGraph.LinkId | null } = {};
            for (const inputNodeId of subgraph.inputs) {
                const inputNode = subgraph.nodes[inputNodeId];
                const inputNodeType = NODETYPE_REGSITRY[inputNode.type as keyof typeof NODETYPE_REGSITRY];
                // Only add a socket if the input node declares itself as socketed
                if ("socketed" in (inputNode.payload as any) && (inputNode.payload as any).socketed) {
                    inSockets[inputNodeId] = null; // use the input node's ID as the socket ID on the custom node
                }
            }

            // Build output sockets from the subgraph's output nodes
            const outSockets: { [key: ArcaneGraph.SocketId]: ArcaneGraph.LinkId[] } = {};
            for (const outputNodeId of subgraph.outputs) {
                outSockets[outputNodeId] = [];
            }

            return {
                id: nanoid(),
                // parent: null,
                type: "custom",
                // children: [],
                in: inSockets,
                out: outSockets,
                payload: {
                    subgraphId,
                },
            };
        }

        evaluate(graph: ArcaneGraph.GraphOf<unknown, unknown>, node: ArcaneGraph.NodeOf<NodeCustom>, socket: string, context?: Map<string, unknown>) {
            const subgraph = graph.subgraphs[node.payload.subgraphId];
            if (!subgraph) return undefined;

            // The requested socket corresponds to a SubgraphOutput node ID
            const outputNode = subgraph.nodes[socket];
            if (!outputNode) return undefined;

            // Build the injection context: map each SubgraphInput node ID to the value
            // arriving at the corresponding socket on this custom node (coalesce: connected ?? widget default)
            const injected = new Map<string, unknown>();
            for (const inputNodeId of subgraph.inputs) {
                const inputNode = subgraph.nodes[inputNodeId];
                const linkId = node.in[inputNodeId]; // custom node's socket ID = input node's ID

                if (linkId !== null && linkId !== undefined) {
                    // Socket is connected — pull value from upstream in the parent graph
                    const link = graph.links[linkId];
                    const upstreamNode = graph.nodes[link.fromNode];
                    const upstreamType = NODETYPE_REGSITRY[upstreamNode.type as keyof typeof NODETYPE_REGSITRY];
                    if ("evaluate" in upstreamType) {
                        injected.set(inputNodeId, (upstreamType as any).evaluate(graph, upstreamNode, link.fromSocket, context));
                    }
                } else {
                    // Socket not connected — use the SubgraphInput's default value
                    injected.set(inputNodeId, (inputNode.payload as any).defaultValue ?? null);
                }
            }

            // Now evaluate the SubgraphOutput node inside the subgraph, passing the injected values
            // The SubgraphOutput's single input socket is connected to something inside the subgraph.
            // We need to evaluate that inner chain, but with our injected context.
            // todo: this needs a subgraph-scoped evaluate that uses subgraph.nodes/links instead of graph.nodes/links
            // and carries the `injected` map so SubgraphInput nodes can read from it.
            return undefined; // placeholder
        }

        getOutputSockets(node: ArcaneGraph.NodeOf<NodeCustom>, graph: ArcaneGraph.GraphOf<unknown, unknown>) {
            const subgraph = graph.subgraphs[node.payload.subgraphId];
            if (!subgraph) return [];

            return subgraph.outputs.map((outputNodeId) => {
                const outputNode = subgraph.nodes[outputNodeId];
                // Derive label and type from the SubgraphOutput node's payload
                return {
                    label: (outputNode.payload as any).label ?? "Output",
                    id: outputNodeId,
                    type: (outputNode.payload as any).socketType ?? "any",
                };
            });
        }

        getInputSockets(node: ArcaneGraph.NodeOf<NodeCustom>, graph: ArcaneGraph.GraphOf<unknown, unknown>) {
            const subgraph = graph.subgraphs[node.payload.subgraphId];
            if (!subgraph) return [];

            return subgraph.inputs
                .filter((inputNodeId) => {
                    const inputNode = subgraph.nodes[inputNodeId];
                    // Only expose as socket if the SubgraphInput node has socketed: true
                    return (inputNode.payload as any).socketed !== false;
                })
                .map((inputNodeId) => {
                    const inputNode = subgraph.nodes[inputNodeId];
                    return {
                        label: (inputNode.payload as any).label ?? "Input",
                        id: inputNodeId,
                        type: (inputNode.payload as any).socketType ?? "float",
                    };
                });
        }

        getInterface(node: ArcaneGraph.NodeOf<NodeCustom>, graph: ArcaneGraph.GraphOf<unknown, unknown>) {
            const subgraph = graph.subgraphs[node.payload.subgraphId];
            if (!subgraph) return [];

            const slots: any[] = [];

            // Output slots from SubgraphOutput nodes
            for (const outputNodeId of subgraph.outputs) {
                const outputNode = subgraph.nodes[outputNodeId];
                slots.push({
                    label: (outputNode.payload as any).label ?? "Output",
                    outSocket: outputNodeId,
                    widget: "none",
                });
            }

            // Input slots from SubgraphInput nodes
            for (const inputNodeId of subgraph.inputs) {
                const inputNode = subgraph.nodes[inputNodeId];
                const payload = inputNode.payload as any;

                if (payload.socketed) {
                    // Coalesce slot: socket + widget
                    slots.push({
                        label: payload.label ?? "Input",
                        inSocket: inputNodeId,
                        property: inputNodeId, // todo: widget values for custom node inputs need a storage mechanism
                        widget: payload.widget ?? "numericInput",
                        // Forward widget config from the SubgraphInput's payload
                        ...(payload.min !== undefined && { min: payload.min }),
                        ...(payload.max !== undefined && { max: payload.max }),
                        ...(payload.step !== undefined && { step: payload.step }),
                        ...(payload.defaultValue !== undefined && { defaultValue: payload.defaultValue }),
                    });
                } else {
                    // Widget-only slot: no socket
                    slots.push({
                        label: payload.label ?? "Input",
                        property: inputNodeId,
                        widget: payload.widget ?? "numericInput",
                        ...(payload.min !== undefined && { min: payload.min }),
                        ...(payload.max !== undefined && { max: payload.max }),
                        ...(payload.step !== undefined && { step: payload.step }),
                        ...(payload.defaultValue !== undefined && { defaultValue: payload.defaultValue }),
                    });
                }
            }

            return slots;
        }
    }

    const NODETYPE_REGSITRY = {
        layer: new NodeTypeLayer(),
        inputFloat: new NodeTypeInputFloat(),
        custom: new NodeTypeCustom(),
        // custom nodes wouldn't be registered statically — they'd be looked up dynamically
        // via `custom:${subgraphId}` type prefix, all handled by a single NodeTypeCustom instance
    };
}
