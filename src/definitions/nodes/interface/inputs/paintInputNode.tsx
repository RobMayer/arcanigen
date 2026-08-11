import { nanoid } from "nanoid";
import { NodeIcon, ICONS, NODE_ICONS } from "../../../../components/Icon";
import { Resolver } from "../../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../../features/nodeview/node";
import { Slot, SocketOut } from "../../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../../nodeTypes";
import { DataTypes } from "../../../dataTypes";
import { addInterface, removeInterface, handleInputSocketedChange } from "../../../helpers/interfaceHelper";
import { ColorHexInput } from "../../../../components/inputs/ColorHexInput";
import { TextInput } from "../../../../components/inputs/TextInput";
import { Project } from "../../../../state/project";
import { Enum } from "../../../datatypes/enum";
import { Dropdown } from "../../../../components/inputs/Dropdown";
import { CheckBox } from "../../../../components/buttons/CheckBox";
import { Color } from "../../../datatypes/color";
import { signature, $, SignatureBuilder } from "../../../helpers/signatureBuilder";
import { SignatureEngine } from "../../../helpers/signatureEngine";

const def = signature({
    in: {},
    out: { output: $.COLOR_OR_GRADIENT },
});

export type PaintInputDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<"string">;
        initialValue: DataTypes.TypeOf<"color">;
        widget: DataTypes.TypeOf<"enum">;
        alpha: boolean;
        required: boolean;
        socketed: boolean;
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<PaintInputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"paintInput", PaintInputDefinition> => {
    return {
        id,
        in: {},
        out: {
            output: [],
        },
        payload: {
            label: "",
            initialValue: Color.fromHex("#ffffffff"),
            widget: Enum.Common.colorInputWidget.HEX.value,
            alpha: true,
            required: true,
            socketed: true,
        },
        type: "paintInput",
    };
};

const WIDGET_OPTIONS = Enum.options(Enum.Common.colorInputWidget);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PaintInputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PaintInputDefinition>>) => {
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
                <ColorHexInput value={node.payload.initialValue} onCommit={(initialValue) => handleUpdate({ initialValue })} alpha={node.payload.alpha} required={node.payload.required} />
            </Slot>
            <Slot>
                <CheckBox checked={node.payload.alpha} onToggle={(alpha) => handleUpdate({ alpha })}>
                    Alpha
                </CheckBox>
            </Slot>
            <Slot>
                <CheckBox checked={node.payload.required} onToggle={(required) => handleUpdate({ required })}>
                    Required
                </CheckBox>
            </Slot>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<PaintInputDefinition>, _outSocket: "output", _deps: AllDeps): (keyof PaintInputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PaintInputDefinition>, _inSocket: keyof PaintInputDefinition["inputs"], _deps: AllDeps): (keyof PaintInputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<PaintInputDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        // Pass through whatever was wired in (colour or gradient); fall back to the colour default when nothing is.
        const providedInput = context.getInput?.(node.id);
        if (providedInput) {
            return providedInput;
        }
        return {
            kind: "color",
            data: node.payload.initialValue,
        };
    }
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"paintInput", PaintInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "in");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"paintInput", PaintInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "in");
};

export const PaintInputType: NodeTypes.Type<"paintInput", PaintInputDefinition> = {
    type: "paintInput",
    displayName: "Paint Input",
    defaultLabel: "Paint Input",
    iconNode: <NodeIcon shape={NODE_ICONS.brush} directionIcon={ICONS.ArrowTo.RightArc} />,
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
