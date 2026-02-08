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
import DecimalInput from "../../../components/inputs/DecimalInput";
import { NumericString } from "../../../util/misc";

type StoredValueKey = `value_${string}`;

export type CustomDefinition = {
    inputs: Record<string, DataTypes.Any>;
    outputs: Record<string, DataTypes.Any>;
    payload: {
        label: DataTypes.Use<"string">;
        graphId: DataTypes.Use<"string">;
    } & {
        [key: StoredValueKey]: DataTypes.Any;
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

    // question: should we do this?
    const outputNodeIds = Project.useGraphOutputs(node.payload.graphId);
    const inputNodeIds = Project.useGraphInputs(node.payload.graphId);

    return (
        <TypicalNode node={node} methods={methods}>
            {outputNodeIds.map((sourceId) => {
                return <DynamicSlot key={sourceId} sourceNodeId={sourceId} graphId={node.payload.graphId} handleValue={handleValue} hostNode={node} />;
            })}
            {inputNodeIds.map((sourceId) => {
                return <DynamicSlot key={sourceId} sourceNodeId={sourceId} graphId={node.payload.graphId} handleValue={handleValue} hostNode={node} />;
            })}
        </TypicalNode>
    );
};

const dependsOn = (node: NodeDefinitions.NodeFor<CustomDefinition>, _outSocket: string): string[] => {
    // All outputs depend on all inputs
    return Object.keys(node.in);
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
                    inputs[inSocket] = { kind: "float", data: storedValue as NumericString };
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

    // Read the subgraph's interface
    const inputNodeIds = state.inputs[targetGraphId] ?? [];
    const outputNodeIds = state.outputs[targetGraphId] ?? [];

    // Build socket maps from Input/Output node labels
    const inSockets: { [key: string]: string | null } = {};
    const outSockets: { [key: string]: string[] } = {};

    for (const inputNodeId of inputNodeIds) {
        inSockets[inputNodeId] = null;
    }

    for (const outputNodeId of outputNodeIds) {
        outSockets[outputNodeId] = [];
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
    iconNode: NODE_ICONS.numericValue.Item,
    iconCard: NODE_ICONS.numericValue.Card,
    category: "interface",
    evaluate,
    Controls,
    dependsOn,
    create,
    onCreate,
    onDelete,
};

const DynamicSlot = ({
    sourceNodeId,
    graphId,
    hostNode,
    handleValue,
}: {
    sourceNodeId: string;
    graphId: string;
    hostNode: NodeDefinitions.NodeFor<CustomDefinition>;
    handleValue: (v: Partial<{ [key: StoredValueKey]: DataTypes.TypeOf<DataTypes.Any> }>) => void;
}) => {
    const [sourceNode] = Project.useNode(graphId, sourceNodeId);

    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (sourceNode.type) {
        case "floatOutput":
            return (
                // todo: these casts are terrible, but that's because SocketOut is too safe.
                <SocketOut node={hostNode} socketId={sourceNodeId} type={"float" as never}>
                    {sourceNode.payload.label ?? "Float"}
                </SocketOut>
            );
        case "floatInput":
            return (
                // todo: these casts are terrible, but that's because SocketIn is too safe.
                // we should probably delegate this earlier so that we don't have to do so much casting...
                // contents will eventually be handled by a switch of sourceNode.widget
                <SocketIn
                    node={hostNode}
                    socketId={sourceNodeId}
                    type={"float" as never}
                    label={(sourceNode as NodeDefinitions.NodeFor<FloatInputDefinition>).payload.widget !== Enum.Common.floatInputWidget.None ? (sourceNode.payload.label ?? "Input") : undefined}
                >
                    <DecimalInput
                        value={(hostNode.payload[`value_${sourceNodeId}`] as NumericString) ?? (sourceNode as NodeDefinitions.NodeFor<FloatInputDefinition>).payload.defaultValue}
                        onCommit={(v) => handleValue({ [`value_${sourceNodeId}`]: v })}
                        disabled={hostNode.in[sourceNodeId] !== null}
                    />
                </SocketIn>
            );
    }
    return null;
};
