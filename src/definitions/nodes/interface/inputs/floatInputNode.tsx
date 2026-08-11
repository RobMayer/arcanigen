import { nanoid } from "nanoid";
import { NodeIcon, ICONS, NODE_ICONS } from "../../../../components/Icon";
import { Resolver } from "../../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../../features/nodeview/node";
import { Slot, SocketOut } from "../../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../../nodeTypes";
import { DataTypes } from "../../../dataTypes";
import { addInterface, removeInterface, handleInputSocketedChange } from "../../../helpers/interfaceHelper";
import { DecimalInput } from "../../../../components/inputs/DecimalInput";
import { TextInput } from "../../../../components/inputs/TextInput";
import { Project } from "../../../../state/project";
import { Enum } from "../../../datatypes/enum";
import { Dropdown } from "../../../../components/inputs/Dropdown";
import { CheckBox } from "../../../../components/buttons/CheckBox";
import { NumericString } from "../../../datatypes/numericString";
import { signature, SignatureBuilder } from "../../../helpers/signatureBuilder";
import { SignatureEngine } from "../../../helpers/signatureEngine";

const def = signature({
    in: {},
    out: { output: "float" },
});

export type FloatInputDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<"string">;
        initialValue: DataTypes.TypeOf<"float">;
        widget: DataTypes.TypeOf<"enum">;
        min: DataTypes.TypeOf<"float">;
        max: DataTypes.TypeOf<"float">;
        step: DataTypes.TypeOf<"float">;
        snap: DataTypes.TypeOf<"float">;
        socketed: boolean;
    }
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<FloatInputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"floatInput", FloatInputDefinition> => {
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
            max: "1",
            step: "0.01",
            snap: "0.01",
            widget: Enum.Common.numberInputWidget.INPUT.value,
            socketed: true,
        },
        type: "floatInput",
    };
};

const WIDGET_OPTIONS = Enum.options(Enum.Common.numberInputWidget);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<FloatInputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<FloatInputDefinition>>) => {
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
                <DecimalInput value={node.payload.initialValue} onCommit={(initialValue) => handleUpdate({ initialValue })} />
            </Slot>
            <Slot label={"Minimum"}>
                <DecimalInput value={node.payload.min} onCommit={(min) => handleUpdate({ min })} required={node.payload.widget === 2} />
            </Slot>
            <Slot label={"Maximum"}>
                <DecimalInput value={node.payload.max} onCommit={(max) => handleUpdate({ max })} required={node.payload.widget === 2} />
            </Slot>
            <Slot label={"Step"}>
                <DecimalInput value={node.payload.step} onCommit={(step) => handleUpdate({ step })} required={node.payload.widget === 2} />
            </Slot>
            <Slot label={"Snap"}>
                <DecimalInput value={node.payload.snap} onCommit={(snap) => handleUpdate({ snap })} />
            </Slot>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<FloatInputDefinition>, _outSocket: "output", _deps: AllDeps): (keyof FloatInputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<FloatInputDefinition>, _inSocket: keyof FloatInputDefinition["inputs"], _deps: AllDeps): (keyof FloatInputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<FloatInputDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const providedInput = context.getInput?.<"float">(node.id);
        let data = providedInput?.data ?? node.payload.initialValue;
        let v = NumericString.Emptyable.asNumber(data);
        if (v !== null) {
            const snap = NumericString.Emptyable.asNumber(node.payload.snap);
            if (snap !== null && snap > 0) v = Math.round(v / snap) * snap;
            const min = NumericString.Emptyable.asNumber(node.payload.min);
            const max = NumericString.Emptyable.asNumber(node.payload.max);
            if (min !== null) v = Math.max(min, v);
            if (max !== null) v = Math.min(max, v);
            data = `${v}`;
        }
        return { kind: "float", data };
    }
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"floatInput", FloatInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "in");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"floatInput", FloatInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "in");
};

export const FloatInputType: NodeTypes.Type<"floatInput", FloatInputDefinition> = {
    type: "floatInput",
    displayName: "Float Input",
    defaultLabel: "Float Input",
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
    signature: def.instance,
    ...SignatureEngine.hooks,
};
