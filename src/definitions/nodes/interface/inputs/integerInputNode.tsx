import { nanoid } from "nanoid";
import { NodeIcon, ICONS, NODE_ICONS } from "../../../../components/Icon";
import { Resolver } from "../../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../../features/nodeview/node";
import { Slot, SocketOut } from "../../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../../betterTypes";
import { addInterface, removeInterface, handleInputSocketedChange } from "../../../interfaceHelpers";
import { IntegerInput } from "../../../../components/inputs/IntegerInput";
import { TextInput } from "../../../../components/inputs/TextInput";
import { Project } from "../../../../state/project";
import { Enum } from "../../../datatypes/enum";
import { Dropdown } from "../../../../components/inputs/Dropdown";
import { CheckBox } from "../../../../components/buttons/CheckBox";
import { NumericString } from "../../../datatypes/numericString";

export type IntegerInputDefinition = {
    inputs: never;
    outputs: {
        output: DataTypes.Use<"integer">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        initialValue: DataTypes.TypeOf<DataTypes.Use<"integer">>;
        widget: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        min: DataTypes.TypeOf<DataTypes.Use<"integer">>;
        max: DataTypes.TypeOf<DataTypes.Use<"integer">>;
        step: DataTypes.TypeOf<DataTypes.Use<"integer">>;
        snap: DataTypes.TypeOf<DataTypes.Use<"integer">>;
        socketed: boolean;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<IntegerInputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"integerInput", IntegerInputDefinition> => {
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
            max: "100",
            step: "1",
            snap: "1",
            widget: Enum.Common.numberInputWidget.INPUT.value,
            socketed: true,
        },
        type: "integerInput",
    };
};

const WIDGET_OPTIONS = Enum.options(Enum.Common.numberInputWidget);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<IntegerInputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<IntegerInputDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
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
                <IntegerInput value={node.payload.initialValue} onCommit={(initialValue) => handleUpdate({ initialValue })} />
            </Slot>
            <Slot label={"Minimum"}>
                <IntegerInput value={node.payload.min} onCommit={(min) => handleUpdate({ min })} required={node.payload.widget === 2} />
            </Slot>
            <Slot label={"Maximum"}>
                <IntegerInput value={node.payload.max} onCommit={(max) => handleUpdate({ max })} required={node.payload.widget === 2} />
            </Slot>
            <Slot label={"Step"}>
                <IntegerInput value={node.payload.step} onCommit={(step) => handleUpdate({ step })} required={node.payload.widget === 2} />
            </Slot>
            <Slot label={"Snap"}>
                <IntegerInput value={node.payload.snap} onCommit={(snap) => handleUpdate({ snap })} />
            </Slot>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<IntegerInputDefinition>, _outSocket: "output", _deps: AllDeps): (keyof IntegerInputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<IntegerInputDefinition>, _inSocket: keyof IntegerInputDefinition["inputs"], _deps: AllDeps): (keyof IntegerInputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<IntegerInputDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const providedInput = context.getInput?.<"integer">(node.id);
        let data = providedInput?.data ?? node.payload.initialValue;
        let v = NumericString.Emptyable.asNumber(data);
        if (v !== null) {
            const snap = NumericString.Emptyable.asNumber(node.payload.snap);
            if (snap !== null && snap > 0) v = Math.round(v / snap) * snap;
            v = Math.round(v);
            const min = NumericString.Emptyable.asNumber(node.payload.min);
            const max = NumericString.Emptyable.asNumber(node.payload.max);
            if (min !== null) v = Math.max(min, v);
            if (max !== null) v = Math.min(max, v);
            data = `${v}`;
        }
        return { kind: "integer", data };
    }
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"integerInput", IntegerInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "in");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"integerInput", IntegerInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "in");
};

const SOCKETTYPES_OUT: { [key in keyof Required<IntegerInputDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["integer"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<IntegerInputDefinition>, socketId: string, _side: "in" | "out"): SocketTypes.SocketRule => {
    return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
};

export const IntegerInputType: NodeTypes.Type<"integerInput", IntegerInputDefinition> = {
    type: "integerInput",
    displayName: "Integer Input",
    defaultLabel: "Integer Input",
    iconNode: <NodeIcon shape={NODE_ICONS.num} directionIcon={ICONS.ArrowTo.RightArc} />,
    flavour: "info",
    category: "Inputs",
    rootRestricted: true,
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    onCreate,
    onDelete,
    onPayloadChange: handleInputSocketedChange,
    getSocketType,
};
