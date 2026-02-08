import { nanoid } from "nanoid";
import { NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn } from "../../../features/nodeview/slots";
import { DataTypes, NodeDefinitions, NodeTypes } from "../../betterTypes";
import DecimalInput from "../../../components/inputs/DecimalInput";
import TextInput from "../../../components/inputs/TextInput";
import { Project } from "../../../state/project";

export type FloatOutputDefinition = {
    inputs: {
        input: DataTypes.Use<"float">;
    };
    outputs: never;
    payload: {
        label: DataTypes.Use<"string">;
        defaultValue: DataTypes.Use<"float">;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<FloatOutputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"floatOutput", FloatOutputDefinition> => {
    return {
        id,
        in: {
            input: null,
        },
        out: {},
        payload: {
            label: input.label ?? "Output",
            defaultValue: input.defaultValue ?? "0",
        },
        type: "floatOutput",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<FloatOutputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<FloatOutputDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const resolved = Project.useResolved(node, "input");

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketIn node={node} socketId={"input"} type={"float"} label={node.payload.label}>
                <TextInput value={node.payload.label} onCommit={(label) => handleUpdate({ label })} placeholder="Output name" />
            </SocketIn>
            <DecimalInput value={resolved?.data ?? node.payload.defaultValue} onCommit={(defaultValue) => handleUpdate({ defaultValue })} disabled={node.in.input !== null} />
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<FloatOutputDefinition>, _outSocket: keyof FloatOutputDefinition["outputs"]): (keyof FloatOutputDefinition["inputs"])[] => {
    return [];
};

const evaluate = (_node: NodeDefinitions.NodeFor<FloatOutputDefinition>, _socket: keyof FloatOutputDefinition["outputs"], _context: Resolver.Context): DataTypes.AnyEval | null => {
    // Output nodes don't have output sockets - they're sinks
    // The Custom node reads their input values via context.subgraph()
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"floatOutput", FloatOutputDefinition>, state: NodeTypes.HookState, graphId: string): NodeTypes.HookState => {
    return {
        ...state,
        outputs: {
            ...state.outputs,
            [graphId]: [...(state.outputs[graphId] ?? []), node.id],
        },
    };
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"floatOutput", FloatOutputDefinition>, state: NodeTypes.HookState, graphId: string): NodeTypes.HookState => {
    return {
        ...state,
        outputs: {
            ...state.outputs,
            [graphId]: (state.outputs[graphId] ?? []).filter((id) => id !== node.id),
        },
    };
};

export const FloatOutputType: NodeTypes.Type<"floatOutput", FloatOutputDefinition> = {
    type: "floatOutput",
    displayName: "Float Output",
    defaultLabel: "Output",
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
