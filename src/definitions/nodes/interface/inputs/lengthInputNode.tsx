import { nanoid } from "nanoid";
import { NodeIcon, ICONS, NODE_ICONS } from "../../../../components/Icon";
import { Resolver } from "../../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../../features/nodeview/node";
import { Slot, SocketOut } from "../../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../../nodeTypes";
import { DataTypes } from "../../../dataTypes";
import { addInterface, removeInterface, handleInputSocketedChange } from "../../../helpers/interfaceHelper";
import { LengthInput } from "../../../../components/inputs/LengthInput";
import { TextInput } from "../../../../components/inputs/TextInput";
import { Project } from "../../../../state/project";
import { Enum } from "../../../datatypes/enum";
import { Dropdown } from "../../../../components/inputs/Dropdown";
import { CheckBox } from "../../../../components/buttons/CheckBox";
import { Length } from "../../../datatypes/length";
import { signature, SignatureBuilder } from "../../../helpers/signatureBuilder";
import { SignatureEngine } from "../../../helpers/signatureEngine";

const def = signature({
    in: {},
    out: { output: "length" },
});

export type LengthInputDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        initialValue: DataTypes.TypeOf<DataTypes.Length>;
        widget: DataTypes.TypeOf<DataTypes.Enum>;
        min: DataTypes.TypeOf<DataTypes.Length>;
        max: DataTypes.TypeOf<DataTypes.Length>;
        step: DataTypes.TypeOf<DataTypes.Length>;
        snap: DataTypes.TypeOf<DataTypes.Length>;
        socketed: boolean;
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<LengthInputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"lengthInput", LengthInputDefinition> => {
    return {
        id,
        in: {},
        out: {
            output: [],
        },
        payload: {
            label: "",
            initialValue: "0px",
            min: "",
            max: "",
            step: "",
            snap: "",
            widget: Enum.Common.lengthInputWidget.INPUT.value,
            socketed: true,
        },
        type: "lengthInput",
    };
};

const WIDGET_OPTIONS = Enum.options(Enum.Common.lengthInputWidget);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<LengthInputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<LengthInputDefinition>>) => {
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
                <LengthInput value={node.payload.initialValue} onCommit={(initialValue) => handleUpdate({ initialValue })} />
            </Slot>
            <Slot label={"Minimum"}>
                <LengthInput value={node.payload.min} onCommit={(min) => handleUpdate({ min })} />
            </Slot>
            <Slot label={"Maximum"}>
                <LengthInput value={node.payload.max} onCommit={(max) => handleUpdate({ max })} />
            </Slot>
            <Slot label={"Step"}>
                <LengthInput value={node.payload.step} onCommit={(step) => handleUpdate({ step })} />
            </Slot>
            <Slot label={"Snap"}>
                <LengthInput value={node.payload.snap} onCommit={(snap) => handleUpdate({ snap })} />
            </Slot>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<LengthInputDefinition>, _outSocket: "output", _deps: AllDeps): (keyof LengthInputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<LengthInputDefinition>, _inSocket: keyof LengthInputDefinition["inputs"], _deps: AllDeps): (keyof LengthInputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<LengthInputDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const providedInput = context.getInput?.<DataTypes.Length>(node.id);
        let data = providedInput?.data ?? node.payload.initialValue;
        let v = Length.Emptyable.asNumber(data);
        if (v !== null) {
            const snap = Length.Emptyable.asNumber(node.payload.snap);
            if (snap !== null && snap > 0) v = Math.round(v / snap) * snap;
            const min = Length.Emptyable.asNumber(node.payload.min);
            const max = Length.Emptyable.asNumber(node.payload.max);
            if (min !== null) v = Math.max(min, v);
            if (max !== null) v = Math.min(max, v);
            data = `${v}px`;
        }
        return { kind: "length", data };
    }
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"lengthInput", LengthInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "in");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"lengthInput", LengthInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "in");
};

export const LengthInputType: NodeTypes.Type<"lengthInput", LengthInputDefinition> = {
    type: "lengthInput",
    displayName: "Length Input",
    defaultLabel: "Length Input",
    iconNode: <NodeIcon shape={NODE_ICONS.length} directionIcon={ICONS.ArrowTo.RightArc} />,
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
