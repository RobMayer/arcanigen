import { nanoid } from "nanoid";
import { Icon, ICONS, NodeIcon, NODE_ICONS } from "../../../../components/Icon";
import { Resolver } from "../../../../util/resolver";
import { ReactNode, useCallback } from "react";
import { TypicalNode } from "../../../../features/nodeview/node";
import { NodeAccordion, Slot, SocketOut } from "../../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../../nodeTypes";
import { DataTypes } from "../../../dataTypes";
import { addInterface, removeInterface, handleArrayInputPayloadChange } from "../../../helpers/interfaceHelper";
import { TextInput } from "../../../../components/inputs/TextInput";
import { CheckBox } from "../../../../components/buttons/CheckBox";
import { Dropdown } from "../../../../components/inputs/Dropdown";
import { ActionButton } from "../../../../components/buttons/ActionButton";
import { Enum } from "../../../datatypes/enum";
import { Project } from "../../../../state/project";
import { signature, $, SignatureBuilder } from "../../../helpers/signatureBuilder";
import { SignatureEngine } from "../../../helpers/signatureEngine";

const def = signature({
    in: {},
    out: { output: $.arrayOf("enum") },
});

export type ArrayEnumInputDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        socketed: boolean;
        widget: DataTypes.TypeOf<DataTypes.Enum>;
        options: string[];
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<ArrayEnumInputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"arrayEnumInput", ArrayEnumInputDefinition> => {
    return {
        id,
        in: {},
        out: {
            output: [],
        },
        payload: {
            label: "",
            socketed: true,
            widget: Enum.Common.arrayInputWidget.DYNAMIC_LIST.value,
            options: ["Option A", "Option B"],
        },
        type: "arrayEnumInput",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ArrayEnumInputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ArrayEnumInputDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const handleOptionChange = useCallback(
        (index: number, label: string) => {
            const options = [...node.payload.options];
            options[index] = label;
            handleUpdate({ options });
        },
        [handleUpdate, node.payload.options],
    );

    const handleAddOption = useCallback(() => {
        handleUpdate({ options: [...node.payload.options, `Option ${String.fromCharCode(65 + node.payload.options.length)}`] });
    }, [handleUpdate, node.payload.options]);

    const handleRemoveOption = useCallback(
        (index: number) => {
            handleUpdate({ options: node.payload.options.filter((_, i) => i !== index) });
        },
        [handleUpdate, node.payload.options],
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
                <Dropdown value={String(node.payload.widget)} onValue={(w) => handleUpdate({ widget: Number(w) })}>
                    {Enum.options(Enum.Common.arrayInputWidget).map((each) => (
                        <option value={each.value} key={each.value}>
                            {each.label}
                        </option>
                    ))}
                </Dropdown>
            </Slot>
            <NodeAccordion label={"Options"} nodeId={node.id}>
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
            </NodeAccordion>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<ArrayEnumInputDefinition>, _outSocket: "output", _deps: AllDeps): (keyof ArrayEnumInputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ArrayEnumInputDefinition>, _inSocket: keyof ArrayEnumInputDefinition["inputs"], _deps: AllDeps): (keyof ArrayEnumInputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<ArrayEnumInputDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const providedInput = context.getInput?.<DataTypes.ArrayOf<DataTypes.Enum>>(node.id);
        if (providedInput) return providedInput;
    }
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"arrayEnumInput", ArrayEnumInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "in");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"arrayEnumInput", ArrayEnumInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "in");
};

export const ArrayEnumInputType: NodeTypes.Type<"arrayEnumInput", ArrayEnumInputDefinition> = {
    type: "arrayEnumInput",
    displayName: "Enum Array Input",
    defaultLabel: "Enum Array Input",
    iconNode: <NodeIcon shape={NODE_ICONS.list} modifierIcon={NODE_ICONS.modifiers.arrayOf} directionIcon={ICONS.ArrowTo.RightArc} />,
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
    onPayloadChange: handleArrayInputPayloadChange,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
