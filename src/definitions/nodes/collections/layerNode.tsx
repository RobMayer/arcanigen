import { nanoid } from "nanoid";
import { NODE_ICONS, ICONS, Icon } from "../../../components/Icon";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { Dropdown } from "../../../components/inputs/Dropdown";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { ArcaneGraph } from "../../../util/structs/arcaneGraph";

export type LayerDefinition = {
    inputs: {
        layers: DataTypes.Use<"array<layer>">;
        isolate: DataTypes.Use<"boolean">;
        [layerSocket: `layer_${string}`]: DataTypes.Use<"layer" | "shape">;
    };
    outputs: {
        output: DataTypes.Use<"shape">;
        layerCount: DataTypes.Use<"integer">;
    };
    payload: {
        label: string;
        isolate: boolean;
        layers: { socket: string; enabled: boolean; blend: number }[];
    };
};

const BLEND_MODE_OPTIONS = Enum.options(Enum.Common.blendMode);

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<LayerDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"layers", LayerDefinition> => {
    const socketId: `layer_${string}` = `layer_${nanoid()}`;
    return {
        id,
        in: {
            layers: null,
            isolate: null,
            [socketId]: null,
        },
        out: {
            output: [],
            layerCount: [],
        },
        payload: {
            label: "",
            isolate: false,
            layers: input.layers ?? [{ socket: socketId, enabled: true, blend: Enum.Common.blendMode.Normal }],
        },
        type: "layers",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<LayerDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const { alterNode, removeLinks } = Project.useMethods();

    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<LayerDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const handleLayerUpdate = useCallback(
        (socket: string, update: Partial<{ enabled: boolean; blend: number }>) => {
            methods.update<NodeDefinitions.PayloadTypeOf<LayerDefinition>>({
                layers: node.payload.layers.map((l) => (l.socket === socket ? { ...l, ...update } : l)),
            });
        },
        [methods, node.payload.layers],
    );

    const handleAddLayer = useCallback(() => {
        const socketId: `layer_${string}` = `layer_${nanoid()}`;
        alterNode(node.id, (n) => ({
            ...n,
            in: { ...n.in, [socketId]: null },
            payload: {
                ...n.payload,
                layers: [...(n.payload as LayerDefinition["payload"]).layers, { socket: socketId, enabled: true, blend: Enum.Common.blendMode.Normal }],
            },
        }));
    }, [alterNode, node.id]);

    const handleRemoveLayer = useCallback(
        (socket: string) => {
            const linkId = node.in[socket];
            if (linkId) {
                removeLinks(linkId);
            }
            alterNode(node.id, (n) => {
                const { [socket]: _, ...restIn } = n.in;
                return {
                    ...n,
                    in: restIn,
                    payload: {
                        ...n.payload,
                        layers: (n.payload as LayerDefinition["payload"]).layers.filter((l) => l.socket !== socket),
                    },
                };
            });
        },
        [alterNode, removeLinks, node.id, node.in],
    );

    const supersocketConnected = node.in.layers !== null;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"shape"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"layers"} type={"array<layer>"}>
                Layers
            </SocketIn>
            {supersocketConnected ? null : (
                <>
                    <hr />
                    <ActionButton onClick={handleAddLayer} flavour={"accent"}>
                        Add Layer
                    </ActionButton>
                    {node.payload.layers.map((entry, idx) => (
                        <LayerEntry entry={entry} node={node} key={entry.socket} handleRemoveLayer={handleRemoveLayer} handleLayerUpdate={handleLayerUpdate} />
                    ))}
                </>
            )}
            <hr />
            <NodeAccordion label="Additional Options" nodeId={node.id} socketsOut="layerCount" socketsIn={"isolate"}>
                <SocketOut node={node} socketId={"layerCount"} type={"integer"}>
                    Layer Count
                </SocketOut>
                <SocketIn node={node} socketId={"isolate"} type={"boolean"}>
                    <CheckBox checked={node.payload.isolate} onToggle={(blendInternal) => handleUpdate({ isolate: blendInternal })}>
                        Isolate Blending
                    </CheckBox>
                </SocketIn>
            </NodeAccordion>
        </TypicalNode>
    );
};

const LayerEntry = ({
    entry,
    node,
    handleLayerUpdate,
    handleRemoveLayer,
}: {
    entry: {
        socket: string;
        enabled: boolean;
        blend: number;
    };
    node: NodeDefinitions.NodeFor<LayerDefinition>;
    handleRemoveLayer: (socket: string) => void;
    handleLayerUpdate: (
        socket: string,
        update: Partial<{
            enabled: boolean;
            blend: number;
        }>,
    ) => void;
}) => {
    const theLink = Project.useLink(node.in[entry.socket]);

    return (
        <SocketIn key={entry.socket} node={node} socketId={entry.socket as `layer_${string}`} type={"layerOrShape"}>
            <CheckBox checked={entry.enabled} onToggle={(enabled) => handleLayerUpdate(entry.socket, { enabled })} disabled={theLink?.type === "layer"} />
            <Dropdown value={`${entry.blend}`} onValue={(v) => handleLayerUpdate(entry.socket, { blend: Number(v) })} disabled={theLink?.type === "layer"}>
                {BLEND_MODE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </Dropdown>
            <ActionButton.Lite onClick={() => handleRemoveLayer(entry.socket)} flavour={"danger"}>
                <Icon shape={ICONS.Close} />
            </ActionButton.Lite>
        </SocketIn>
    );
};

const onConnect = (node: NodeDefinitions.BuiltNodeOf<"layers", LayerDefinition>, linkId: string, direction: "in" | "out", state: NodeTypes.HookState, graphId: string): NodeTypes.HookState => {
    if (direction !== "in") return state;

    // Check if the connected socket is the supersocket
    const link = state.links[graphId][linkId];
    if (!link || link.toSocket !== "layers") return state;

    // Collect all link IDs from layer_* sockets
    const nodeData = state.nodes[graphId][node.id];
    const linkIdsToRemove: string[] = [];

    for (const [socketKey, socketLinkId] of Object.entries(nodeData.in)) {
        if (socketKey.startsWith("layer_") && socketLinkId !== null) {
            linkIdsToRemove.push(socketLinkId);
        }
    }

    if (linkIdsToRemove.length === 0) return state;

    // Remove the links using ArcaneGraph
    const graph = { nodes: state.nodes[graphId], links: state.links[graphId] };
    const [{ nodes, links }] = ArcaneGraph.removeLinks(graph, linkIdsToRemove);

    return {
        ...state,
        nodes: { ...state.nodes, [graphId]: nodes },
        links: { ...state.links, [graphId]: links },
    };
};

const dependsOn = (node: NodeDefinitions.NodeFor<LayerDefinition>, outSocket: keyof LayerDefinition["outputs"], _deps: AllDeps): (keyof LayerDefinition["inputs"])[] => {
    if (outSocket === "output") {
        return ["layers", "isolate", ...(node.payload.layers.map((l) => l.socket) as `layer_${string}`[])];
    }
    if (outSocket === "layerCount") {
        return ["layers"];
    }
    return [];
};

const contributesTo = (node: NodeDefinitions.NodeFor<LayerDefinition>, inSocket: keyof LayerDefinition["inputs"], _deps: AllDeps): (keyof LayerDefinition["outputs"])[] => {
    if (inSocket === "layers") {
        return ["output", "layerCount"];
    }
    if (inSocket === "isolate") {
        return ["output"];
    }
    // layer_* sockets contribute to output
    if (typeof inSocket === "string" && inSocket.startsWith("layer_")) {
        return ["output"];
    }
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<LayerDefinition>, socket: keyof LayerDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const layerData: { shape: DataTypes.TypeOf<DataTypes.Use<"shape">>; blend: number }[] = [];

        // Check supersocket first
        const supersocketEval = context.resolve<"array<layer>">(node.id, "layers");
        if (supersocketEval) {
            for (const entry of supersocketEval.data) {
                if (entry.shape === null) continue;
                const enabled = entry.enabled ?? true;
                if (!enabled) continue;
                layerData.push({
                    shape: entry.shape,
                    blend: entry.blend ?? Enum.Common.blendMode.Normal,
                });
            }
        } else {
            // Build from individual sockets
            for (const entry of node.payload.layers) {
                const resolved = context.resolve<"layer">(node.id, entry.socket) as DataTypes.AnyEval | null;
                if (!resolved) continue;

                if (resolved.kind === "layer") {
                    const data = resolved.data;
                    if (data.shape === null) continue;
                    const enabled = data.enabled ?? entry.enabled;
                    if (!enabled) continue;
                    layerData.push({
                        shape: data.shape,
                        blend: data.blend ?? entry.blend,
                    });
                } else if (resolved.kind === "shape") {
                    if (!entry.enabled) continue;
                    layerData.push({
                        shape: resolved.data,
                        blend: entry.blend,
                    });
                }
            }
        }

        if (layerData.length === 0) return null;

        const doBlendInternal = context.resolve<"boolean">(node.id, "isolate")?.data ?? node.payload.isolate ?? false;

        // Build SVG: wrap each layer in <g> with blend mode
        const children = layerData.map((layer) => {
            const blendModeStr = Resolver.EnumMappings.blendMode[layer.blend] ?? "normal";
            if (blendModeStr !== "normal") {
                return {
                    tag: "g" as const,
                    attributes: {},
                    style: { mixBlendMode: blendModeStr },
                    children: [layer.shape],
                };
            }
            return layer.shape;
        });

        return {
            kind: "shape",
            data: {
                tag: "g",
                attributes: {},
                style: { isolation: doBlendInternal ? "isolate" : "auto" },
                children,
            },
        };
    }

    if (socket === "layerCount") {
        const supersocketEval = context.resolve<"array<layer>">(node.id, "layers");
        const count = supersocketEval ? supersocketEval.data.length : node.payload.layers.length;
        return {
            kind: "integer",
            data: `${count}`,
        };
    }

    return null;
};

export const LayerNodeType: NodeTypes.Type<"layers", LayerDefinition> = {
    type: "layers",
    displayName: "Layers",
    defaultLabel: "Layers",
    iconNode: NODE_ICONS.layers.Item,
    iconCard: NODE_ICONS.layers.Card,
    category: "collection",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    onConnect,
};
