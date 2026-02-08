import { nanoid } from "nanoid";
import { NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { Slot, SocketOut } from "../../../features/nodeview/slots";
import { DataTypes, NodeDefinitions, NodeTypes } from "../../betterTypes";
import DecimalInput from "../../../components/inputs/DecimalInput";
import TextInput from "../../../components/inputs/TextInput";
import { Project } from "../../../state/project";
import { Enum } from "../../datatypes/enum";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { RadioButton } from "../../../components/buttons/RadioButton";

export type FloatInputDefinition = {
    inputs: never;
    outputs: {
        output: DataTypes.Use<"float">;
    };
    payload: {
        label: DataTypes.Use<"string">;
        defaultValue: DataTypes.Use<"float">;
        widget: DataTypes.Use<"enum">;
        min: DataTypes.Use<"float">;
        hasMin: DataTypes.Use<"boolean">;
        max: DataTypes.Use<"float">;
        hasMax: DataTypes.Use<"boolean">;
        step: DataTypes.Use<"float">;
        hasStep: DataTypes.Use<"boolean">;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<FloatInputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"floatInput", FloatInputDefinition> => {
    return {
        id,
        in: {},
        out: {
            output: [],
        },
        payload: {
            label: "",
            defaultValue: "0",
            hasMin: false,
            min: "0",
            hasMax: false,
            max: "1",
            hasStep: false,
            step: "0.01",
            widget: Enum.Common.floatInputWidget.Input,
        },
        type: "floatInput",
    };
};

const WIDGET_OPTIONS = Enum.options(Enum.Common.floatInputWidget);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<FloatInputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<FloatInputDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"float"}>
                <TextInput value={node.payload.label} onCommit={(label) => handleUpdate({ label })} placeholder="Input name" />
            </SocketOut>
            <Slot label={"Default Value"}>
                <DecimalInput value={node.payload.defaultValue} onCommit={(defaultValue) => handleUpdate({ defaultValue })} />
            </Slot>
            <Slot label={"Minimum"}>
                <CheckBox checked={node.payload.hasMin} onToggle={(hasMin) => handleUpdate({ hasMin })} />
                <DecimalInput value={node.payload.min} onCommit={(min) => handleUpdate({ min })} disabled={!node.payload.hasMin} />
            </Slot>
            <Slot label={"Maximum"}>
                <CheckBox checked={node.payload.hasMax} onToggle={(hasMax) => handleUpdate({ hasMax })} />
                <DecimalInput value={node.payload.max} onCommit={(max) => handleUpdate({ max })} disabled={!node.payload.hasMax} />
            </Slot>
            <Slot label={"Step"}>
                <CheckBox checked={node.payload.hasStep} onToggle={(hasStep) => handleUpdate({ hasStep })} />
                <DecimalInput value={node.payload.step} onCommit={(step) => handleUpdate({ step })} disabled={!node.payload.hasStep} />
            </Slot>
            <Slot label={"Widget"}>
                <RadioButton.Group value={`${node.payload.widget}`} options={WIDGET_OPTIONS} onValue={(w) => handleUpdate({ widget: Number(w) })} />
            </Slot>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<FloatInputDefinition>, _outSocket: "output"): never[] => {
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<FloatInputDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        // When called from subgraph context, use provided input; otherwise use default
        const providedInput = context.getInput?.<"float">(node.id);
        return {
            kind: "float",
            data: providedInput?.data ?? node.payload.defaultValue,
        };
    }
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"floatInput", FloatInputDefinition>, state: NodeTypes.HookState, graphId: string): NodeTypes.HookState => {
    return {
        ...state,
        inputs: {
            ...state.inputs,
            [graphId]: [...(state.inputs[graphId] ?? []), node.id],
        },
    };
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"floatInput", FloatInputDefinition>, state: NodeTypes.HookState, graphId: string): NodeTypes.HookState => {
    return {
        ...state,
        inputs: {
            ...state.inputs,
            [graphId]: (state.inputs[graphId] ?? []).filter((id) => id !== node.id),
        },
    };
};

export const FloatInputType: NodeTypes.Type<"floatInput", FloatInputDefinition> = {
    type: "floatInput",
    displayName: "Float Input",
    defaultLabel: "Input",
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
