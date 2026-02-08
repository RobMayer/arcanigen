import { nanoid } from "nanoid";
import { NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { DataTypes, NodeDefinitions, NodeTypes } from "../../betterTypes";
import { Project } from "../../../state/project";

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
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<CustomDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    // todo: for setting stored values?
    const updateValue = useCallback(
        (v: Partial<{ [key: StoredValueKey]: DataTypes.TypeOf<DataTypes.Any> }> /* MERR */) => {
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
                return <DynamicSlot key={sourceId} sourceNodeId={sourceId} graphId={node.payload.graphId} />;
            })}
            {inputNodeIds.map((sourceId) => {
                return <DynamicSlot key={sourceId} sourceNodeId={sourceId} graphId={node.payload.graphId} />;
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

    // Build inputs by resolving each input socket
    const inputs: { [key: string]: DataTypes.AnyEval | null } = {};
    for (const inSocket of Object.keys(node.in)) {
        inputs[inSocket] = context.resolve(node.id, inSocket);
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

const DynamicSlot = ({ sourceNodeId, graphId }: { sourceNodeId: string; graphId: string }) => {
    // todo: This won't work - it relies on graphIdContext to pull from the correct graph.
    const [sourceNodeData] = Project.useNode(sourceNodeId);

    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (sourceNodeData.type) {
        case "floatOutput":
            return <div>will be an output!</div>;
        case "floatInput":
            return <div>{sourceNodeData.type}</div>;
    }
    return null;
};
