import { nanoid } from "nanoid";

export namespace ArcaneGraph {
    // aliases just for clarity of purpose when used
    export type NodeId = string;
    export type LinkId = string;
    export type SocketId = string;
    export type SubgraphId = string;

    // allows nodes / links to fetch their node type from a registry.
    export type NodeTypeId = string;
    export type LinkTypeId = string;

    export type NodeOf<P> = {
        id: NodeId;
        type: NodeTypeId;
        parent: NodeId | null; // for use with containers - which container, if any, do I belong to?
        children: NodeId[]; // for user with containers - which nodes are contained by this container?
        in: {
            [key: SocketId]: LinkId | null;
        };
        out: {
            [key: SocketId]: LinkId[];
        };
        payload: P; // could contain anything - for layers, it might be a list of layers (with socketIds used in "in", blend modes, etc), for circles it might be parameters such as radius, for example.
    };

    export type LinkOf<P> = {
        id: LinkId;
        type: LinkTypeId;
        fromNode: NodeId;
        toNode: NodeId;
        fromSocket: SocketId;
        toSocket: SocketId;
        payload: P; // not sure if needed.
    };

    export type SubgraphOf<N, L> = {
        nodes: { [key: NodeId]: NodeOf<N> };
        links: { [key: LinkId]: LinkOf<L> };
        users: { node: NodeId; graph: SubgraphId | null }[];
        inputs: NodeId[];
        outputs: NodeId[];
    };

    export type GraphOf<N, L> = {
        nodes: { [key: NodeId]: NodeOf<N> };
        links: { [key: LinkId]: LinkOf<L> };
        subgraphs: { [key: SubgraphId]: SubgraphOf<N, L> };
    };
}

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
                parent: null,
                type: "layer",
                children: [],
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
                parent: null,
                type: "inputFloat",
                children: [],
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

    const NODETYPE_REGSITRY = {
        layer: new NodeTypeLayer(),
        inputFloat: new NodeTypeInputFloat(),
    };
}
