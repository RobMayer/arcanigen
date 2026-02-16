import { nanoid } from "nanoid";
import { NODE_ICONS, Icon } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { Slot, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes } from "../../betterTypes";
import { addInterface, removeInterface, handleInputSocketedChange } from "../../interfaceHelpers";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { TextInput } from "../../../components/inputs/TextInput";
import { Project } from "../../../state/project";
import { Enum } from "../../datatypes/enum";
import { Dropdown } from "../../../components/inputs/Dropdown";
import { CheckBox } from "../../../components/buttons/CheckBox";

export type FloatInputDefinition = {
    inputs: never;
    outputs: {
        output: DataTypes.Use<"float">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        initialValue: DataTypes.TypeOf<DataTypes.Use<"float">>;
        widget: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        min: DataTypes.TypeOf<DataTypes.Use<"float">>;
        max: DataTypes.TypeOf<DataTypes.Use<"float">>;
        step: DataTypes.TypeOf<DataTypes.Use<"float">>;
        snap: DataTypes.TypeOf<DataTypes.Use<"float">>;
        socketed: boolean;
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
            initialValue: "0",
            min: "0",
            max: "1",
            step: "0.01",
            snap: "0.01",
            widget: Enum.Common.numberInputWidget.Input,
            socketed: true,
        },
        type: "floatInput",
    };
};

const WIDGET_OPTIONS = Enum.options(Enum.Common.numberInputWidget);

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
            <Slot>
                <CheckBox checked={node.payload.socketed} onToggle={(socketed) => handleUpdate({ socketed })}>
                    Socketed
                </CheckBox>
            </Slot>
            <Slot label={"Widget"}>
                <Dropdown value={`${node.payload.widget}`} onValue={(w) => handleUpdate({ widget: Number(w) })}>
                    {WIDGET_OPTIONS.map((each) => {
                        return (
                            <option value={each.value} key={each.value}>
                                {each.label}
                            </option>
                        );
                    })}
                </Dropdown>
            </Slot>
            <hr />
            <Slot label={"Initial Value"}>
                <DecimalInput value={node.payload.initialValue} onCommit={(initialValue) => handleUpdate({ initialValue })} />
            </Slot>
            <Slot label={"Minimum"}>
                <DecimalInput value={node.payload.min} onCommit={(min) => handleUpdate({ min })} required={node.payload.widget === 2} />
            </Slot>
            <Slot label={"Maximum"}>
                <DecimalInput value={node.payload.max} onCommit={(max) => handleUpdate({ max })} required={node.payload.widget === 2} />
            </Slot>
            <Slot label={"Step"}>
                <DecimalInput value={node.payload.step} onCommit={(step) => handleUpdate({ step })} required={node.payload.widget === 2} />
            </Slot>
            <Slot label={"Snap"}>
                <DecimalInput value={node.payload.snap} onCommit={(snap) => handleUpdate({ snap })} />
            </Slot>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<FloatInputDefinition>, _outSocket: "output", _deps: AllDeps): (keyof FloatInputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<FloatInputDefinition>, _inSocket: keyof FloatInputDefinition["inputs"], _deps: AllDeps): (keyof FloatInputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<FloatInputDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        // When called from subgraph context, use provided input; otherwise use default
        const providedInput = context.getInput?.<"float">(node.id);
        return {
            kind: "float",
            data: providedInput?.data ?? node.payload.initialValue,
        };
    }
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"floatInput", FloatInputDefinition>, state: NodeTypes.HookState, graphId: string): NodeTypes.HookState => {
    return addInterface(state, graphId, node.id, "in");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"floatInput", FloatInputDefinition>, state: NodeTypes.HookState, graphId: string): NodeTypes.HookState => {
    return removeInterface(state, graphId, node.id, "in");
};

export const FloatInputType: NodeTypes.Type<"floatInput", FloatInputDefinition> = {
    type: "floatInput",
    displayName: "Float Input",
    defaultLabel: "Input",
    iconNode: <Icon shape={NODE_ICONS.numericValue.Item} />,
    iconCard: <Icon shape={NODE_ICONS.numericValue.Card} />,
    category: "Inputs",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    onCreate,
    onDelete,
    onPayloadChange: handleInputSocketedChange,
};
