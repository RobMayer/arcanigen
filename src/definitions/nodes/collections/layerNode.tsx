import { nanoid } from "nanoid";
import { NODE_ICONS, ICONS, Icon } from "../../../components/Icon";
import { Enum } from "../../datatypes/enum";
import { DragEvent, ReactNode, useCallback, useRef, useState } from "react";
import styled from "styled-components";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { Dropdown } from "../../../components/inputs/Dropdown";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";

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
            layers: input.layers ?? [{ socket: socketId, enabled: true, blend: Enum.Common.blendMode.NORMAL.value }],
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
                layers: [...(n.payload as LayerDefinition["payload"]).layers, { socket: socketId, enabled: true, blend: Enum.Common.blendMode.NORMAL.value }],
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

    const handleReorderLayer = useCallback(
        (socketId: string, toIndex: number) => {
            methods.update<NodeDefinitions.PayloadTypeOf<LayerDefinition>>({
                layers: (() => {
                    const layers = [...node.payload.layers];
                    const fromIndex = layers.findIndex((l) => l.socket === socketId);
                    if (fromIndex === -1 || fromIndex === toIndex) return layers;
                    const [entry] = layers.splice(fromIndex, 1);
                    layers.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, entry);
                    return layers;
                })(),
            });
        },
        [methods, node.payload.layers],
    );

    const supersocketConnected = node.in.layers !== null;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"layers"}>
                Layers
            </SocketIn>
            {supersocketConnected ? null : (
                <>
                    <hr />
                    <ActionButton onClick={handleAddLayer} flavour={"accent"}>
                        Add Layer
                    </ActionButton>
                    {node.payload.layers.map((entry, idx) => (
                        <LayerEntry
                            entry={entry}
                            node={node}
                            key={entry.socket}
                            index={idx}
                            handleRemoveLayer={handleRemoveLayer}
                            handleLayerUpdate={handleLayerUpdate}
                            handleReorderLayer={handleReorderLayer}
                        />
                    ))}
                </>
            )}
            <hr />
            <NodeAccordion label="Additional Options" nodeId={node.id} socketsOut="layerCount" socketsIn={"isolate"}>
                <SocketOut node={node} socketId={"layerCount"}>
                    Layer Count
                </SocketOut>
                <SocketIn node={node} socketId={"isolate"}>
                    <CheckBox checked={node.payload.isolate} onToggle={(blendInternal) => handleUpdate({ isolate: blendInternal })}>
                        Isolate Blending
                    </CheckBox>
                </SocketIn>
            </NodeAccordion>
        </TypicalNode>
    );
};

const LAYER_MIME = "application/x-layer-socket";

const LayerEntry = ({
    entry,
    node,
    index,
    handleLayerUpdate,
    handleRemoveLayer,
    handleReorderLayer,
}: {
    entry: {
        socket: string;
        enabled: boolean;
        blend: number;
    };
    node: NodeDefinitions.NodeFor<LayerDefinition>;
    index: number;
    handleRemoveLayer: (socket: string) => void;
    handleLayerUpdate: (
        socket: string,
        update: Partial<{
            enabled: boolean;
            blend: number;
        }>,
    ) => void;
    handleReorderLayer: (socketId: string, toIndex: number) => void;
}) => {
    const theLink = Project.useLink(node.in[entry.socket]);
    const [dropSide, setDropSide] = useState<"above" | "below" | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    const handleDragStart = useCallback(
        (e: DragEvent) => {
            e.dataTransfer.setDragImage(ref.current as Element, 0, 0);
            e.dataTransfer.setData(LAYER_MIME, entry.socket);
            e.dataTransfer.effectAllowed = "move";
        },
        [entry.socket],
    );

    const handleDragOver = useCallback((e: DragEvent) => {
        if (!e.dataTransfer.types.includes(LAYER_MIME)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const rect = ref.current?.getBoundingClientRect();
        if (rect) {
            setDropSide(e.clientY < rect.top + rect.height / 2 ? "above" : "below");
        }
    }, []);

    const handleDragLeave = useCallback(() => {
        setDropSide(null);
    }, []);

    const handleDrop = useCallback(
        (e: DragEvent) => {
            const socketId = e.dataTransfer.getData(LAYER_MIME);
            if (socketId) {
                e.preventDefault();
                handleReorderLayer(socketId, dropSide === "below" ? index + 1 : index);
            }
            setDropSide(null);
        },
        [handleReorderLayer, index, dropSide],
    );

    const handleDragEnd = useCallback(() => {
        setDropSide(null);
    }, []);

    return (
        <LayerEntryWrapper ref={ref} data-state={dropSide ? `drop-${dropSide}` : undefined} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onDragEnd={handleDragEnd}>
            <SocketIn node={node} socketId={entry.socket as `layer_${string}`}>
                <CheckBox checked={entry.enabled} onToggle={(enabled) => handleLayerUpdate(entry.socket, { enabled })} disabled={theLink?.type === "layer"} />
                <Dropdown value={`${entry.blend}`} onValue={(v) => handleLayerUpdate(entry.socket, { blend: Number(v) })} disabled={theLink?.type === "layer"}>
                    {BLEND_MODE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </Dropdown>
                <DragGrip draggable onDragStart={handleDragStart}>
                    <Icon shape={ICONS.Caret.Vertical} />
                </DragGrip>
                <ActionButton.Lite onClick={() => handleRemoveLayer(entry.socket)} flavour={"danger"}>
                    <Icon shape={ICONS.Close} />
                </ActionButton.Lite>
            </SocketIn>
        </LayerEntryWrapper>
    );
};

const LayerEntryWrapper = styled.div`
    position: relative;

    &[data-state="drop-above"]::before,
    &[data-state="drop-below"]::after {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        height: 2px;
        background: var(--flavour, #88f);
        pointer-events: none;
        z-index: 1;
    }
    &[data-state="drop-above"]::before {
        top: -1px;
    }
    &[data-state="drop-below"]::after {
        bottom: -1px;
    }
`;

const DragGrip = styled.div`
    cursor: grab;
    opacity: 0.4;
    display: grid;
    place-items: center;

    &:active {
        cursor: grabbing;
    }
    &:hover {
        opacity: 0.8;
    }
`;

const onConnect = (node: NodeDefinitions.BuiltNodeOf<"layers", LayerDefinition>, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    if (direction !== "in") return;

    // Check if the connected socket is the supersocket
    const link = ctx.getLink(graphId, linkId);
    if (!link || link.toSocket !== "layers") return;

    // Collect all link IDs from layer_* sockets
    const currentNode = ctx.getNode(graphId, node.id);
    if (!currentNode) return;
    const linkIdsToRemove: string[] = [];

    for (const [socketKey, socketLinkId] of Object.entries(currentNode.in)) {
        if (socketKey.startsWith("layer_") && socketLinkId !== null) {
            linkIdsToRemove.push(socketLinkId);
        }
    }

    if (linkIdsToRemove.length === 0) return;

    // Use high-level removeLinks which fires onDisconnect on endpoints
    ctx.removeLinks(graphId, ...linkIdsToRemove);
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
                    blend: entry.blend ?? Enum.Common.blendMode.NORMAL.value,
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

        // Wrap each layer: non-normal blend gets a GroupShape wrapper
        const children = layerData.map((layer) => {
            const blendModeStr = Resolver.EnumMappings.blendMode[layer.blend] ?? "normal";
            if (blendModeStr !== "normal") {
                return {
                    type: "group" as const,
                    children: [layer.shape],
                    blendMode: blendModeStr,
                    transform: "",
                    preview: layer.shape.preview,
                };
            }
            return layer.shape;
        });

        // Compute union of children's previews
        let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;
        for (const child of children) {
            minX = Math.min(minX, child.preview.x);
            minY = Math.min(minY, child.preview.y);
            maxX = Math.max(maxX, child.preview.x + child.preview.w);
            maxY = Math.max(maxY, child.preview.y + child.preview.h);
        }

        return {
            kind: "shape",
            data: {
                type: "group",
                children,
                isolation: doBlendInternal,
                transform: "",
                preview: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
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

const SOCKETTYPES_IN: { [key in keyof Required<LayerDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    layers: {
        types: ["array<layer>"],
        mode: "or",
    },
    isolate: {
        types: ["boolean"],
        mode: "or",
    },
};

const SOCKETTYPES_OUT: { [key in keyof Required<LayerDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["shape"], mode: "and" },
    layerCount: {
        types: ["integer"],
        mode: "and",
    },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<LayerDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    if (side === "out") {
        return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
    if (socketId.startsWith("layer_")) {
        return { types: ["layer", "shape"], mode: "or" };
    }
    return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
};

export const LayerNodeType: NodeTypes.Type<"layers", LayerDefinition> = {
    type: "layers",
    displayName: "Layers",
    defaultLabel: "Layers",
    iconNode: <Icon shape={NODE_ICONS.layers} color={"var(--icon-flavour)"} />,
    category: "Collections",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    onConnect,
    getSocketType,
};
