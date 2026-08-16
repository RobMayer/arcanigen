import { nanoid } from "nanoid";
import { ICONS, NodeIcon, NODE_ICONS } from "../../../../components/Icon";
import { Resolver } from "../../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../../features/nodeview/node";
import { Slot, SocketOut } from "../../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../../nodeTypes";
import { DataTypes } from "../../../dataTypes";
import { addInterface, removeInterface, handleArrayInputPayloadChange } from "../../../helpers/interfaceHelper";
import { TextInput } from "../../../../components/inputs/TextInput";
import { CheckBox } from "../../../../components/buttons/CheckBox";
import { Dropdown } from "../../../../components/inputs/Dropdown";
import { Enum } from "../../../datatypes/enum";
import { Project } from "../../../../state/project";
import { signature, $, SignatureBuilder } from "../../../helpers/signatureBuilder";
import { SignatureEngine } from "../../../helpers/signatureEngine";

const def = signature({
    in: {},
    out: { output: $.arrayOf("point") },
});

export type ArrayPointInputDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        socketed: boolean;
        widget: DataTypes.TypeOf<DataTypes.Enum>;
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<ArrayPointInputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"arrayPointInput", ArrayPointInputDefinition> => {
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
        },
        type: "arrayPointInput",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ArrayPointInputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ArrayPointInputDefinition>>) => {
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
                <Dropdown value={String(node.payload.widget)} onValue={(w) => handleUpdate({ widget: Number(w) })}>
                    {Enum.options(Enum.Common.arrayInputWidget).map((each) => (
                        <option value={each.value} key={each.value}>
                            {each.label}
                        </option>
                    ))}
                </Dropdown>
            </Slot>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<ArrayPointInputDefinition>, _outSocket: "output", _deps: AllDeps): (keyof ArrayPointInputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (
    _node: NodeDefinitions.NodeFor<ArrayPointInputDefinition>,
    _inSocket: keyof ArrayPointInputDefinition["inputs"],
    _deps: AllDeps,
): (keyof ArrayPointInputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<ArrayPointInputDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const providedInput = context.getInput?.<DataTypes.ArrayOf<DataTypes.Point>>(node.id);
        if (providedInput) return providedInput;
    }
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"arrayPointInput", ArrayPointInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "in");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"arrayPointInput", ArrayPointInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "in");
};

export const ArrayPointInputType: NodeTypes.Type<"arrayPointInput", ArrayPointInputDefinition> = {
    type: "arrayPointInput",
    displayName: "Point Array Input",
    defaultLabel: "Point Array Input",
    iconNode: <NodeIcon shape={NODE_ICONS.point} modifierIcon={NODE_ICONS.modifiers.arrayOf} directionIcon={ICONS.ArrowTo.RightArc} />,
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
