import { nanoid } from "nanoid";
import { NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { Slot, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes } from "../../betterTypes";
import { addInterface, removeInterface, handleInputSocketedChange } from "../../interfaceHelpers";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { TextInput } from "../../../components/inputs/TextInput";
import { Project } from "../../../state/project";
import { Enum } from "../../datatypes/enum";
import { Dropdown } from "../../../components/inputs/Dropdown";
import { CheckBox } from "../../../components/buttons/CheckBox";

export type AngleInputDefinition = {
    inputs: never;
    outputs: {
        output: DataTypes.Use<"angle">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        initialValue: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        widget: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        min: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        max: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        step: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        snap: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        wraps: boolean;
        socketed: boolean;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<AngleInputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"angleInput", AngleInputDefinition> => {
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
            max: "360",
            step: "1",
            snap: "1",
            widget: Enum.Common.numberInputWidget.Input,
            wraps: false,
            socketed: true,
        },
        type: "angleInput",
    };
};

const WIDGET_OPTIONS = Enum.options(Enum.Common.numberInputWidget);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<AngleInputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<AngleInputDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"angle"}>
                <TextInput value={node.payload.label} onCommit={(label) => handleUpdate({ label })} placeholder="Input name" />
            </SocketOut>
            <Slot label={"Initial Value"}>
                <AngleInput value={node.payload.initialValue} onCommit={(initialValue) => handleUpdate({ initialValue })} unbound={!node.payload.wraps} />
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
            <Slot label={"Wraps"}>
                <CheckBox checked={node.payload.wraps} onToggle={(wraps) => handleUpdate({ wraps })}>
                    Wrap value between 0-360
                </CheckBox>
            </Slot>
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
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<AngleInputDefinition>, _outSocket: "output", _deps: AllDeps): (keyof AngleInputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<AngleInputDefinition>, _inSocket: keyof AngleInputDefinition["inputs"], _deps: AllDeps): (keyof AngleInputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<AngleInputDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const providedInput = context.getInput?.<"angle">(node.id);
        return {
            kind: "angle",
            data: providedInput?.data ?? node.payload.initialValue,
        };
    }
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"angleInput", AngleInputDefinition>, state: NodeTypes.HookState, graphId: string): NodeTypes.HookState => {
    return addInterface(state, graphId, node.id, "in");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"angleInput", AngleInputDefinition>, state: NodeTypes.HookState, graphId: string): NodeTypes.HookState => {
    return removeInterface(state, graphId, node.id, "in");
};

export const AngleInputType: NodeTypes.Type<"angleInput", AngleInputDefinition> = {
    type: "angleInput",
    displayName: "Angle Input",
    defaultLabel: "Input",
    iconNode: NODE_ICONS.angleValue.Item,
    iconCard: NODE_ICONS.angleValue.Card,
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
