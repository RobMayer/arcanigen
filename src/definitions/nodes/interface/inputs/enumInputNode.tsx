import { nanoid } from "nanoid";
import { NodeIcon, ICONS, Icon, NODE_ICONS } from "../../../../components/Icon";
import { Resolver } from "../../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../../features/nodeview/node";
import { NodeAccordion, Slot, SocketOut } from "../../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../../betterTypes";
import { addInterface, removeInterface, handleInputSocketedChange } from "../../../interfaceHelpers";
import { TextInput } from "../../../../components/inputs/TextInput";
import { Project } from "../../../../state/project";
import { Enum } from "../../../datatypes/enum";
import { Dropdown } from "../../../../components/inputs/Dropdown";
import { ActionButton } from "../../../../components/buttons/ActionButton";
import { CheckBox } from "../../../../components/buttons/CheckBox";

export type EnumInputDefinition = {
    inputs: never;
    outputs: {
        output: DataTypes.Use<"enum">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        widget: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        initialValue: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        options: string[];
        socketed: boolean;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<EnumInputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"enumInput", EnumInputDefinition> => {
    return {
        id,
        in: {},
        out: {
            output: [],
        },
        payload: {
            label: "",
            initialValue: 0,
            widget: Enum.Common.enumInputWidget.DROPDOWN.value,
            options: ["Option A", "Option B"],
            socketed: true,
        },
        type: "enumInput",
    };
};

const WIDGET_OPTIONS = Enum.options(Enum.Common.enumInputWidget);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<EnumInputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<EnumInputDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const handleOptionChange = useCallback(
        (index: number, value: string) => {
            const options = [...node.payload.options];
            options[index] = value;
            handleUpdate({ options });
        },
        [handleUpdate, node.payload.options],
    );

    const handleAddOption = useCallback(() => {
        handleUpdate({ options: [...node.payload.options, `Option ${String.fromCharCode(65 + node.payload.options.length)}`] });
    }, [handleUpdate, node.payload.options]);

    const handleRemoveOption = useCallback(
        (index: number) => {
            const options = node.payload.options.filter((_, i) => i !== index);
            const initialValue = node.payload.initialValue >= options.length ? Math.max(0, options.length - 1) : node.payload.initialValue;
            handleUpdate({ options, initialValue });
        },
        [handleUpdate, node.payload.options, node.payload.initialValue],
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
            <Slot label={"Initial Value"}>
                <Dropdown value={`${node.payload.initialValue}`} onValue={(v) => handleUpdate({ initialValue: Number(v) })}>
                    {node.payload.options.map((opt, i) => (
                        <option value={i} key={i}>
                            {opt}
                        </option>
                    ))}
                </Dropdown>
            </Slot>
            <hr />
            <ActionButton onClick={handleAddOption} flavour={"accent"}>
                Add Option
            </ActionButton>
            {node.payload.options.map((opt, i) => (
                <Slot key={i}>
                    <TextInput value={opt} onCommit={(v) => handleOptionChange(i, v)} />
                    <ActionButton.Lite onClick={() => handleRemoveOption(i)} flavour={"danger"}>
                        <Icon shape={ICONS.Close} />
                    </ActionButton.Lite>
                </Slot>
            ))}
            <NodeAccordion label={"Presets"} nodeId={node.id}>
                {Enum.PRESETS.map(({ label, options }) => (
                    <ActionButton key={label} onClick={() => handleUpdate({ options: Enum.labels(options) })}>
                        {label}
                    </ActionButton>
                ))}
            </NodeAccordion>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<EnumInputDefinition>, _outSocket: "output", _deps: AllDeps): (keyof EnumInputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<EnumInputDefinition>, _inSocket: keyof EnumInputDefinition["inputs"], _deps: AllDeps): (keyof EnumInputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<EnumInputDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const providedInput = context.getInput?.<"enum">(node.id);
        return {
            kind: "enum",
            data: providedInput?.data ?? node.payload.initialValue,
        };
    }
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"enumInput", EnumInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "in");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"enumInput", EnumInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "in");
};

const SOCKETTYPES_OUT: { [key in keyof Required<EnumInputDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["enum"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<EnumInputDefinition>, socketId: string, _side: "in" | "out"): SocketTypes.SocketRule => {
    return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
};

export const EnumInputType: NodeTypes.Type<"enumInput", EnumInputDefinition> = {
    type: "enumInput",
    displayName: "Enum Input",
    defaultLabel: "Enum Input",
    iconNode: <NodeIcon shape={NODE_ICONS.list} directionIcon={ICONS.ArrowTo.RightArc} />,
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
