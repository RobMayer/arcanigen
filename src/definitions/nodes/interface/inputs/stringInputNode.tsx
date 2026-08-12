import { nanoid } from "nanoid";
import { NodeIcon, ICONS, NODE_ICONS } from "../../../../components/Icon";
import { Resolver } from "../../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../../features/nodeview/node";
import { Slot, SocketOut } from "../../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../../nodeTypes";
import { DataTypes } from "../../../dataTypes";
import { addInterface, removeInterface, handleInputSocketedChange } from "../../../helpers/interfaceHelper";
import { TextInput } from "../../../../components/inputs/TextInput";
import { Dropdown } from "../../../../components/inputs/Dropdown";
import { Project } from "../../../../state/project";
import { CheckBox } from "../../../../components/buttons/CheckBox";
import { Enum } from "../../../datatypes/enum";
import { signature, SignatureBuilder } from "../../../helpers/signatureBuilder";
import { SignatureEngine } from "../../../helpers/signatureEngine";

const def = signature({
    in: {},
    out: { output: "string", charCount: "integer" },
});

export type StringInputDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        initialValue: DataTypes.TypeOf<DataTypes.String>;
        socketed: boolean;
        widget: DataTypes.TypeOf<DataTypes.Enum>;
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<StringInputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"stringInput", StringInputDefinition> => {
    return {
        id,
        in: {},
        out: {
            output: [],
            charCount: [],
        },
        payload: {
            label: "",
            initialValue: "",
            socketed: true,
            widget: Enum.Common.stringInputWidget.BLOCK.value,
        },
        type: "stringInput",
    };
};

const WIDGET_OPTIONS = Enum.options(Enum.Common.stringInputWidget);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<StringInputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<StringInputDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                <TextInput value={node.payload.label} onCommit={(label) => handleUpdate({ label })} placeholder="Input name" />
            </SocketOut>
            <SocketOut node={node} socketId={"charCount"}>
                Character Count
            </SocketOut>
            <Slot>
                <CheckBox checked={node.payload.socketed} onToggle={(socketed) => handleUpdate({ socketed })}>
                    Socketed
                </CheckBox>
            </Slot>
            <Slot label={"Widget"}>
                <Dropdown value={`${node.payload.widget}`} onValue={(w) => handleUpdate({ widget: Number(w) })}>
                    {WIDGET_OPTIONS.map((each) => (
                        <option value={each.value} key={each.value}>
                            {each.label}
                        </option>
                    ))}
                </Dropdown>
            </Slot>
            <hr />
            <Slot label={"Initial Value"}>
                <TextInput value={node.payload.initialValue} onCommit={(initialValue) => handleUpdate({ initialValue })} />
            </Slot>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<StringInputDefinition>, _outSocket: keyof StringInputDefinition["outputs"], _deps: AllDeps): (keyof StringInputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<StringInputDefinition>, _inSocket: keyof StringInputDefinition["inputs"], _deps: AllDeps): (keyof StringInputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<StringInputDefinition>, socket: keyof StringInputDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const providedInput = context.getInput?.<DataTypes.String>(node.id);
    const str = providedInput?.data ?? node.payload.initialValue;
    if (socket === "output") return { kind: "string", data: str };
    if (socket === "charCount") return { kind: "integer", data: `${str.length}` };
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"stringInput", StringInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "in");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"stringInput", StringInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "in");
};

export const StringInputType: NodeTypes.Type<"stringInput", StringInputDefinition> = {
    type: "stringInput",
    displayName: "String Input",
    defaultLabel: "String Input",
    iconNode: <NodeIcon shape={NODE_ICONS.text} directionIcon={ICONS.ArrowTo.RightArc} />,
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
    signature: def.instance,
    ...SignatureEngine.hooks,
};
