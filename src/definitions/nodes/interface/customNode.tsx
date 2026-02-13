import { nanoid } from "nanoid";
import { NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { DataTypes, NodeDefinitions, NodeTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { Enum } from "../../datatypes/enum";
import { FloatInputDefinition } from "./floatInputNode";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { NumericString } from "../../datatypes/numericString";
import { FloatOutputDefinition } from "./floatOutputNode";
import { useGraphId } from "../../../state/graphId";
import styled from "styled-components";

type StoredValueKey = `value_${string}`;

/** Parse an interface entry to get the direction and nodeId */
const parseInterface = (entry: string): { direction: "in" | "out"; nodeId: string } | null => {
    if (entry.startsWith("in:")) return { direction: "in", nodeId: entry.slice(3) };
    if (entry.startsWith("out:")) return { direction: "out", nodeId: entry.slice(4) };
    return null;
};

export type CustomDefinition = {
    inputs: Record<string, DataTypes.Any>;
    outputs: Record<string, DataTypes.Any>;
    payload: {
        label: string;
        graphId: string;
    } & {
        [key: StoredValueKey]: DataTypes.TypeOf<DataTypes.Any>;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<CustomDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"custom", CustomDefinition> => {
    return {
        id,
        in: {},
        out: {},
        payload: {
            label: "",
            graphId: input.graphId ?? "",
        },
        type: "custom",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<CustomDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    // todo: for setting stored values?
    const handleValue = useCallback(
        (v: Partial<{ [key: StoredValueKey]: DataTypes.TypeOf<DataTypes.Any> }>) => {
            methods.update(v);
        },
        [methods],
    );

    // Get interface entries (prefixed with "in:" or "out:")
    const interfaceEntries = Project.useGraphInterfaces(node.payload.graphId);

    return (
        <TypicalNode node={node} methods={methods}>
            {interfaceEntries.map((entry) => {
                const parsed = parseInterface(entry);
                if (!parsed) return null;
                return <DynamicSlot key={entry} sourceNodeId={parsed.nodeId} graphId={node.payload.graphId} handleValue={handleValue} hostNode={node} />;
            })}
        </TypicalNode>
    );
};

const dependsOn = (node: NodeDefinitions.NodeFor<CustomDefinition>, _outSocket: string): string[] => {
    // All outputs depend on all inputs
    return Object.keys(node.in);
};

const contributesTo = (node: NodeDefinitions.NodeFor<CustomDefinition>, _inSocket: string): string[] => {
    // All inputs contribute to all outputs
    return Object.keys(node.out);
};

const evaluate = (node: NodeDefinitions.NodeFor<CustomDefinition>, socket: string, context: Resolver.Context): DataTypes.AnyEval | null => {
    const { graphId } = node.payload;
    if (!graphId) return null;

    // Build inputs by resolving each input socket, or using stored values when not connected
    const inputs: { [key: string]: DataTypes.AnyEval | null } = {};
    for (const inSocket of Object.keys(node.in)) {
        const resolved = context.resolve(node.id, inSocket);
        if (resolved) {
            inputs[inSocket] = resolved;
        } else {
            // Use stored value when not connected
            // The stored value key is `value_${inputNodeId}` where inputNodeId === inSocket
            const storedValue = node.payload[`value_${inSocket}`];
            if (storedValue !== undefined) {
                // Look up the input node to determine its type
                const inputNode = context.getNode(graphId, inSocket);
                if (inputNode?.type === "floatInput") {
                    inputs[inSocket] = { kind: "float", data: storedValue as NumericString.Type };
                }
                // TODO: add other input types as they are created (integerInput, angleInput, etc.)
            }
        }
    }

    // Evaluate subgraph and get outputs
    const outputs = context.subgraph(graphId, inputs);

    return outputs[socket] ?? null;
};

const onCreate = (node: NodeDefinitions.NodeFor<CustomDefinition>, state: NodeTypes.HookState, graphId: string): NodeTypes.HookState => {
    const targetGraphId = node.payload.graphId;
    if (!targetGraphId) return state;

    // Read the subgraph's interface entries
    const interfaceEntries = state.interfaces[targetGraphId] ?? [];

    // Build socket maps from Input/Output node labels
    const inSockets: { [key: string]: string | null } = {};
    const outSockets: { [key: string]: string[] } = {};

    for (const entry of interfaceEntries) {
        const parsed = parseInterface(entry);
        if (!parsed) continue;
        if (parsed.direction === "in") {
            inSockets[parsed.nodeId] = null;
        } else {
            outSockets[parsed.nodeId] = [];
        }
    }

    // Update the node with the built socket maps
    const updatedNode = {
        ...node,
        in: inSockets,
        out: outSockets,
    };

    return {
        ...state,
        nodes: {
            ...state.nodes,
            [graphId]: {
                ...state.nodes[graphId],
                [node.id]: updatedNode,
            },
        },
        users: {
            ...state.users,
            [targetGraphId]: [...(state.users[targetGraphId] ?? []), { node: node.id, scope: graphId }],
        },
    };
};

const onDelete = (node: NodeDefinitions.NodeFor<CustomDefinition>, state: NodeTypes.HookState, graphId: string): NodeTypes.HookState => {
    const targetGraphId = node.payload.graphId;
    if (!targetGraphId) return state;

    return {
        ...state,
        users: {
            ...state.users,
            [targetGraphId]: (state.users[targetGraphId] ?? []).filter((u) => !(u.node === node.id && u.scope === graphId)),
        },
    };
};

export const CustomNodeType: NodeTypes.Type<"custom", CustomDefinition> = {
    type: "custom",
    displayName: "Custom",
    defaultLabel: "Custom",
    iconNode: NODE_ICONS.customNode.Item,
    iconCard: NODE_ICONS.customNode.Card,
    category: "interface",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    onCreate,
    onDelete,
};

type SlotUpdateHandler = (v: Partial<{ [key: StoredValueKey]: DataTypes.TypeOf<DataTypes.Any> }>) => void;

const DynamicSlot = ({
    sourceNodeId,
    graphId,
    hostNode,
    handleValue,
}: {
    sourceNodeId: string;
    graphId: string;
    hostNode: NodeDefinitions.NodeFor<CustomDefinition>;
    handleValue: SlotUpdateHandler;
}) => {
    const [sourceNode] = Project.useNode(graphId, sourceNodeId);

    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (sourceNode.type) {
        case "floatOutput":
            return <OutputSlotFloat host={hostNode} source={sourceNode as NodeDefinitions.NodeFor<FloatOutputDefinition>} />;
        case "floatInput":
            return <InputSlotFloat host={hostNode} source={sourceNode as NodeDefinitions.NodeFor<FloatInputDefinition>} handleValue={handleValue} />;
    }
    return null;
};

type OutputWidgetProps<T extends NodeDefinitions.Any> = { host: NodeDefinitions.NodeFor<CustomDefinition>; source: NodeDefinitions.NodeFor<T> };
type InputWidgetProps<T extends NodeDefinitions.Any> = { host: NodeDefinitions.NodeFor<CustomDefinition>; source: NodeDefinitions.NodeFor<T>; handleValue: SlotUpdateHandler };

const OutputSlotFloat = ({ host, source }: OutputWidgetProps<FloatOutputDefinition>) => {
    const resolved = Project.useCachedOutput(useGraphId(), host, source.id);
    const output = resolved?.kind === "float" ? resolved?.data : "« none »";

    switch (source.payload.widget) {
        case Enum.Common.typicalOutputWidget.None: {
            return (
                <SocketOut node={host} socketId={source.id} type={"float" as never}>
                    {(source.payload.label ?? "") === "" ? "Output" : source.payload.label}
                </SocketOut>
            );
        }
        case Enum.Common.typicalOutputWidget.Preview: {
            return (
                <SocketOut node={host} socketId={source.id} type={"float" as never} label={(source.payload.label ?? "") === "" ? "Output" : source.payload.label}>
                    <TextPreview>{output}</TextPreview>
                </SocketOut>
            );
        }
    }
    return null;
};

const InputSlotFloat = ({ host, source, handleValue }: InputWidgetProps<FloatInputDefinition>) => {
    switch (source.payload.widget) {
        case Enum.Common.floatInputWidget.None: {
            return (
                <SocketIn node={host} socketId={source.id} type={"float" as never}>
                    {(source.payload.label ?? "") === "" ? "Input" : source.payload.label}
                </SocketIn>
            );
        }
        case Enum.Common.floatInputWidget.Input: {
            return (
                <SocketIn node={host} socketId={source.id} type={"float" as never} label={(source.payload.label ?? "") === "" ? "Input" : source.payload.label}>
                    <DecimalInput
                        value={(host.payload[`value_${source.id}`] as NumericString.Type) ?? source.payload.defaultValue}
                        onCommit={(v) => handleValue({ [`value_${source.id}`]: v })}
                        disabled={host.in[source.id] !== null}
                        min={source.payload.hasMin ? source.payload.min : undefined}
                        max={source.payload.hasMax ? source.payload.max : undefined}
                        step={source.payload.hasStep ? source.payload.step : undefined}
                        required
                    />
                </SocketIn>
            );
        }
    }

    return null;
};

const TextPreview = styled.div`
    text-align: center;
    font-size: 15pt;
    padding: 2px;
    background: #222;
    border: 1px solid #666;
    flex: 1 1 auto;
`;
