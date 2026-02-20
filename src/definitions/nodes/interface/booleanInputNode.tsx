import { nanoid } from "nanoid";
import { ICONS, Icon } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { Slot, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { addInterface, removeInterface, handleInputSocketedChange } from "../../interfaceHelpers";
import { TextInput } from "../../../components/inputs/TextInput";
import { Project } from "../../../state/project";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { Enum } from "../../datatypes/enum";
import { Dropdown } from "../../../components/inputs/Dropdown";

export type BooleanInputDefinition = {
    inputs: never;
    outputs: {
        output: DataTypes.Use<"boolean">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        widget: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        text: DataTypes.TypeOf<DataTypes.Use<"string">>;
        initialValue: boolean;
        socketed: boolean;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<BooleanInputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"booleanInput", BooleanInputDefinition> => {
    return {
        id,
        in: {},
        out: {
            output: [],
        },
        payload: {
            label: "",
            initialValue: false,
            widget: 1,
            text: "Enabled",
            socketed: true,
        },
        type: "booleanInput",
    };
};

const WIDGET_OPTIONS = Enum.options(Enum.Common.booleanInputWidget);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<BooleanInputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<BooleanInputDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"boolean"}>
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
            <Slot>
                <CheckBox checked={node.payload.initialValue} onToggle={(initialValue) => handleUpdate({ initialValue })}>
                    Initial Value
                </CheckBox>
            </Slot>
            <Slot label={"Text"}>
                <TextInput value={node.payload.text} onCommit={(text) => handleUpdate({ text })} placeholder="Text" />
            </Slot>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<BooleanInputDefinition>, _outSocket: "output", _deps: AllDeps): (keyof BooleanInputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<BooleanInputDefinition>, _inSocket: keyof BooleanInputDefinition["inputs"], _deps: AllDeps): (keyof BooleanInputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<BooleanInputDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const providedInput = context.getInput?.<"boolean">(node.id);
        return {
            kind: "boolean",
            data: providedInput?.data ?? node.payload.initialValue,
        };
    }
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"booleanInput", BooleanInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "in");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"booleanInput", BooleanInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "in");
};

const getSocketType = (): SocketTypes.SocketRule => SocketTypes.of("boolean");

export const BooleanInputType: NodeTypes.Type<"booleanInput", BooleanInputDefinition> = {
    type: "booleanInput",
    displayName: "Boolean Input",
    defaultLabel: "Input",
    iconNode: <Icon shape={ICONS.Check} color={"var(--icon-flavour)"} cutout={"scoop"} layer={ICONS.ArrowTo.RightArc} layerColor="#fff" />,
    category: "Inputs",
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
