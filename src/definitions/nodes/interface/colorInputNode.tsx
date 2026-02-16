import { nanoid } from "nanoid";
import { NODE_ICONS, Icon } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { Slot, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes } from "../../betterTypes";
import { addInterface, removeInterface, handleInputSocketedChange } from "../../interfaceHelpers";
import { ColorHexInput } from "../../../components/inputs/ColorHexInput";
import { TextInput } from "../../../components/inputs/TextInput";
import { Project } from "../../../state/project";
import { Enum } from "../../datatypes/enum";
import { Dropdown } from "../../../components/inputs/Dropdown";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { Color } from "../../datatypes/color";

export type ColorInputDefinition = {
    inputs: never;
    outputs: {
        output: DataTypes.Use<"color">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        initialValue: DataTypes.TypeOf<DataTypes.Use<"color">>;
        widget: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        alpha: boolean;
        nullable: boolean;
        socketed: boolean;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<ColorInputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"colorInput", ColorInputDefinition> => {
    return {
        id,
        in: {},
        out: {
            output: [],
        },
        payload: {
            label: "",
            initialValue: Color.fromHex("#ffffffff"),
            widget: Enum.Common.colorInputWidget.Hex,
            alpha: true,
            nullable: true,
            socketed: true,
        },
        type: "colorInput",
    };
};

const WIDGET_OPTIONS = Enum.options(Enum.Common.colorInputWidget);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ColorInputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ColorInputDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"color"}>
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
                <ColorHexInput value={node.payload.initialValue} onCommit={(initialValue) => handleUpdate({ initialValue })} alpha={node.payload.alpha} nullable={node.payload.nullable} />
            </Slot>
            <Slot>
                <CheckBox checked={node.payload.alpha} onToggle={(alpha) => handleUpdate({ alpha })}>
                    Alpha
                </CheckBox>
            </Slot>
            <Slot>
                <CheckBox checked={node.payload.nullable} onToggle={(nullable) => handleUpdate({ nullable })}>
                    Nullable
                </CheckBox>
            </Slot>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<ColorInputDefinition>, _outSocket: "output", _deps: AllDeps): (keyof ColorInputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ColorInputDefinition>, _inSocket: keyof ColorInputDefinition["inputs"], _deps: AllDeps): (keyof ColorInputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<ColorInputDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const providedInput = context.getInput?.<"color">(node.id);
        return {
            kind: "color",
            data: providedInput?.data ?? node.payload.initialValue,
        };
    }
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"colorInput", ColorInputDefinition>, state: NodeTypes.HookState, graphId: string): NodeTypes.HookState => {
    return addInterface(state, graphId, node.id, "in");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"colorInput", ColorInputDefinition>, state: NodeTypes.HookState, graphId: string): NodeTypes.HookState => {
    return removeInterface(state, graphId, node.id, "in");
};

export const ColorInputType: NodeTypes.Type<"colorInput", ColorInputDefinition> = {
    type: "colorInput",
    displayName: "Color Input",
    defaultLabel: "Input",
    iconNode: <Icon shape={NODE_ICONS.colorValue.Item} />,
    iconCard: <Icon shape={NODE_ICONS.colorValue.Card} />,
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
