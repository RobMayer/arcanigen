import { nanoid } from "nanoid";
import { NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { Slot, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes } from "../../betterTypes";
import { addInterface, removeInterface } from "../../interfaceHelpers";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { TextInput } from "../../../components/inputs/TextInput";
import { Project } from "../../../state/project";
import { Enum } from "../../datatypes/enum";
import { Dropdown } from "../../../components/inputs/Dropdown";

export type LengthInputDefinition = {
    inputs: never;
    outputs: {
        output: DataTypes.Use<"length">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        defaultValue: DataTypes.TypeOf<DataTypes.Use<"length">>;
        widget: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        min: DataTypes.TypeOf<DataTypes.Use<"length">>;
        max: DataTypes.TypeOf<DataTypes.Use<"length">>;
        step: DataTypes.TypeOf<DataTypes.Use<"length">>;
        snap: DataTypes.TypeOf<DataTypes.Use<"length">>;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<LengthInputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"lengthInput", LengthInputDefinition> => {
    return {
        id,
        in: {},
        out: {
            output: [],
        },
        payload: {
            label: "",
            defaultValue: "0px",
            min: "",
            max: "",
            step: "",
            snap: "",
            widget: Enum.Common.lengthInputWidget.Input,
        },
        type: "lengthInput",
    };
};

const WIDGET_OPTIONS = Enum.options(Enum.Common.lengthInputWidget);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<LengthInputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<LengthInputDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"length"}>
                <TextInput value={node.payload.label} onCommit={(label) => handleUpdate({ label })} placeholder="Input name" />
            </SocketOut>
            <Slot label={"Default Value"}>
                <LengthInput value={node.payload.defaultValue} onCommit={(defaultValue) => handleUpdate({ defaultValue })} />
            </Slot>
            <Slot label={"Minimum"}>
                <LengthInput value={node.payload.min} onCommit={(min) => handleUpdate({ min })} />
            </Slot>
            <Slot label={"Maximum"}>
                <LengthInput value={node.payload.max} onCommit={(max) => handleUpdate({ max })} />
            </Slot>
            <Slot label={"Step"}>
                <LengthInput value={node.payload.step} onCommit={(step) => handleUpdate({ step })} />
            </Slot>
            <Slot label={"Snap"}>
                <LengthInput value={node.payload.snap} onCommit={(snap) => handleUpdate({ snap })} />
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

const dependsOn = (_node: NodeDefinitions.NodeFor<LengthInputDefinition>, _outSocket: "output", _deps: AllDeps): (keyof LengthInputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<LengthInputDefinition>, _inSocket: keyof LengthInputDefinition["inputs"], _deps: AllDeps): (keyof LengthInputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<LengthInputDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const providedInput = context.getInput?.<"length">(node.id);
        return {
            kind: "length",
            data: providedInput?.data ?? node.payload.defaultValue,
        };
    }
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"lengthInput", LengthInputDefinition>, state: NodeTypes.HookState, graphId: string): NodeTypes.HookState => {
    return addInterface(state, graphId, node.id, "in");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"lengthInput", LengthInputDefinition>, state: NodeTypes.HookState, graphId: string): NodeTypes.HookState => {
    return removeInterface(state, graphId, node.id, "in");
};

export const LengthInputType: NodeTypes.Type<"lengthInput", LengthInputDefinition> = {
    type: "lengthInput",
    displayName: "Length Input",
    defaultLabel: "Input",
    iconNode: NODE_ICONS.lengthValue.Item,
    iconCard: NODE_ICONS.lengthValue.Card,
    category: "inputs",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    onCreate,
    onDelete,
};
