import { nanoid } from "nanoid";
import { ICONS, Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { Slot, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes } from "../../betterTypes";
import { addInterface, removeInterface, handleInputSocketedChange } from "../../interfaceHelpers";
import { TextInput } from "../../../components/inputs/TextInput";
import { Project } from "../../../state/project";
import { CheckBox } from "../../../components/buttons/CheckBox";

export type StringInputDefinition = {
    inputs: never;
    outputs: {
        output: DataTypes.Use<"string">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        initialValue: DataTypes.TypeOf<DataTypes.Use<"string">>;
        socketed: boolean;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<StringInputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"stringInput", StringInputDefinition> => {
    return {
        id,
        in: {},
        out: {
            output: [],
        },
        payload: {
            label: "",
            initialValue: "",
            socketed: true,
        },
        type: "stringInput",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<StringInputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<StringInputDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"string"}>
                <TextInput value={node.payload.label} onCommit={(label) => handleUpdate({ label })} placeholder="Input name" />
            </SocketOut>
            <Slot label={"Initial Value"}>
                <TextInput value={node.payload.initialValue} onCommit={(initialValue) => handleUpdate({ initialValue })} />
            </Slot>
            <Slot>
                <CheckBox checked={node.payload.socketed} onToggle={(socketed) => handleUpdate({ socketed })}>
                    Socketed
                </CheckBox>
            </Slot>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<StringInputDefinition>, _outSocket: "output", _deps: AllDeps): (keyof StringInputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<StringInputDefinition>, _inSocket: keyof StringInputDefinition["inputs"], _deps: AllDeps): (keyof StringInputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<StringInputDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const providedInput = context.getInput?.<"string">(node.id);
        return {
            kind: "string",
            data: providedInput?.data ?? node.payload.initialValue,
        };
    }
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"stringInput", StringInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "in");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"stringInput", StringInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "in");
};

const getSocketType = (): string => "string";

export const StringInputType: NodeTypes.Type<"stringInput", StringInputDefinition> = {
    type: "stringInput",
    displayName: "String Input",
    defaultLabel: "Input",
    iconNode: <Icon shape={NODE_ICONS.textShape.Item} color={"var(--icon-flavour)"} cutout={"scoop"} layer={ICONS.ArrowTo.RightArc} layerColor="#fff" />,
    iconCard: <Icon shape={NODE_ICONS.textShape.Card} color={"var(--icon-flavour)"} cutout={"scoop"} layer={ICONS.ArrowTo.RightArc} layerColor="#fff" />,
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
