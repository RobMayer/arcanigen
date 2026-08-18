import { nanoid } from "nanoid";
import { NodeIcon, ICONS, Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, Slot, SocketIn, SocketOut, SocketPair } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Dropdown } from "../../../components/inputs/Dropdown";
import { TextInput } from "../../../components/inputs/TextInput";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { Project } from "../../../state/project";
import { Enum } from "../../datatypes/enum";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { value: "enum" },
    out: { output: "enum" },
});

export type EnumDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        value: DataTypes.TypeOf<DataTypes.Enum>;
        options: string[];
    }
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<EnumDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"enum", EnumDefinition> => {
    return {
        id,
        in: {
            value: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            value: input.value ?? 0,
            options: input.options ?? ["Option A", "Option B"],
        },
        type: "enum",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<EnumDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<EnumDefinition>>) => {
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
            const value = node.payload.value >= options.length ? Math.max(0, options.length - 1) : node.payload.value;
            handleUpdate({ options, value });
        },
        [handleUpdate, node.payload.options, node.payload.value],
    );

    const handlePreset = useCallback(
        (options: string[]) => {
            const value = node.payload.value >= options.length ? 0 : node.payload.value;
            handleUpdate({ options, value });
        },
        [handleUpdate, node.payload.value],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketPair node={node} socketInId={"value"} socketOutId={"output"} label={"Value"}>
                <Dropdown value={`${node.payload.value}`} onValue={(v) => handleUpdate({ value: Number(v) })} disabled={node.in.value !== null}>
                    {node.payload.options.map((opt, i) => (
                        <option value={i} key={i}>
                            {opt}
                        </option>
                    ))}
                </Dropdown>
            </SocketPair>
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
                <NodeAccordion label={"Presets"} nodeId={node.id} accordionId={"presets"}>
                    {Enum.PRESETS.map(({ label, options }) => (
                        <ActionButton key={label} onClick={() => handlePreset(Enum.labels(options))}>
                            {label}
                        </ActionButton>
                    ))}
                </NodeAccordion>
            </NodeAccordion>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<EnumDefinition>, outSocket: "output", _deps: AllDeps): (keyof EnumDefinition["inputs"])[] => {
    if (outSocket === "output") return ["value"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<EnumDefinition>, inSocket: keyof EnumDefinition["inputs"], _deps: AllDeps): (keyof EnumDefinition["outputs"])[] => {
    if (inSocket === "value") return ["output"];
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<EnumDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        return {
            kind: "enum",
            data: context.resolve<DataTypes.Enum>(node.id, "value")?.data ?? node.payload.value,
        };
    }
    return null;
};

export const EnumPrimitiveType: NodeTypes.Type<"enum", EnumDefinition> = {
    type: "enum",
    displayName: "Enum",
    defaultLabel: "Enum",
    iconNode: <NodeIcon shape={NODE_ICONS.list} />,
    flavour: "accent",
    category: "Values",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
