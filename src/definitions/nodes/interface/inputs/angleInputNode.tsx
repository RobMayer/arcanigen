import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS, ICONS } from "../../../../components/Icon";
import { Resolver } from "../../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../../features/nodeview/node";
import { Slot, SocketOut } from "../../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../../nodeTypes";
import { DataTypes } from "../../../dataTypes";
import { addInterface, removeInterface, handleInputSocketedChange } from "../../../helpers/interfaceHelper";
import { AngleInput } from "../../../../components/inputs/AngleInput";
import { TextInput } from "../../../../components/inputs/TextInput";
import { Project } from "../../../../state/project";
import { Enum } from "../../../datatypes/enum";
import { Dropdown } from "../../../../components/inputs/Dropdown";
import { CheckBox } from "../../../../components/buttons/CheckBox";
import { Angle } from "../../../datatypes/angle";
import { signature, SignatureBuilder } from "../../../helpers/signatureBuilder";
import { SignatureEngine } from "../../../helpers/signatureEngine";

const def = signature({
    in: {},
    out: { output: "angle" },
});

export type AngleInputDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        initialValue: DataTypes.TypeOf<DataTypes.Angle>;
        widget: DataTypes.TypeOf<DataTypes.Enum>;
        min: DataTypes.TypeOf<DataTypes.Angle>;
        max: DataTypes.TypeOf<DataTypes.Angle>;
        step: DataTypes.TypeOf<DataTypes.Angle>;
        snap: DataTypes.TypeOf<DataTypes.Angle>;
        wraps: boolean;
        socketed: boolean;
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<AngleInputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"angleInput", AngleInputDefinition> => {
    return {
        id,
        in: {},
        out: {
            output: [],
        },
        payload: {
            label: "",
            initialValue: "0deg",
            min: "0deg",
            max: "360deg",
            step: "1deg",
            snap: "1deg",
            widget: Enum.Common.numberInputWidget.INPUT.value,
            wraps: false,
            socketed: true,
        },
        type: "angleInput",
    };
};

const WIDGET_OPTIONS = Enum.options(Enum.Common.numberInputWidget);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<AngleInputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<AngleInputDefinition>>) => {
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
                <AngleInput value={node.payload.initialValue} onCommit={(initialValue) => handleUpdate({ initialValue })} unbound={!node.payload.wraps} />
            </Slot>
            <Slot label={"Minimum"}>
                <AngleInput unbound value={node.payload.min} onCommit={(min) => handleUpdate({ min })} required={node.payload.widget === 2} />
            </Slot>
            <Slot label={"Maximum"}>
                <AngleInput unbound value={node.payload.max} onCommit={(max) => handleUpdate({ max })} required={node.payload.widget === 2} />
            </Slot>
            <Slot label={"Step"}>
                <AngleInput unbound value={node.payload.step} onCommit={(step) => handleUpdate({ step })} required={node.payload.widget === 2} />
            </Slot>
            <Slot label={"Snap"}>
                <AngleInput unbound value={node.payload.snap} onCommit={(snap) => handleUpdate({ snap })} />
            </Slot>
            <Slot label={"Wraps"}>
                <CheckBox checked={node.payload.wraps} onToggle={(wraps) => handleUpdate({ wraps })}>
                    Wrap value between 0-360
                </CheckBox>
            </Slot>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<AngleInputDefinition>, _outSocket: "output", _deps: AllDeps): (keyof AngleInputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<AngleInputDefinition>, _inSocket: keyof AngleInputDefinition["inputs"], _deps: AllDeps): (keyof AngleInputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<AngleInputDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const providedInput = context.getInput?.<DataTypes.Angle>(node.id);
        let data = providedInput?.data ?? node.payload.initialValue;
        let v = Angle.Emptyable.asNumber(data);
        if (v !== null) {
            const snap = Angle.Emptyable.asNumber(node.payload.snap);
            if (snap !== null && snap > 0) v = Math.round(v / snap) * snap;
            if (node.payload.wraps) {
                v = ((v % 360) + 360) % 360;
            } else {
                const min = Angle.Emptyable.asNumber(node.payload.min);
                const max = Angle.Emptyable.asNumber(node.payload.max);
                if (min !== null) v = Math.max(min, v);
                if (max !== null) v = Math.min(max, v);
            }
            data = `${v}deg`;
        }
        return { kind: "angle", data };
    }
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"angleInput", AngleInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "in");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"angleInput", AngleInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "in");
};

export const AngleInputType: NodeTypes.Type<"angleInput", AngleInputDefinition> = {
    type: "angleInput",
    displayName: "Angle Input",
    defaultLabel: "Angle Input",
    iconNode: <NodeIcon shape={NODE_ICONS.angle} directionIcon={ICONS.ArrowTo.RightArc} />,
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
