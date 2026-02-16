import { nanoid } from "nanoid";
import { ICONS, Icon } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";
import { TypicalNode } from "../../../features/nodeview/node";
import { Slot, SocketIn } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes } from "../../betterTypes";
import { addInterface, removeInterface } from "../../interfaceHelpers";
import { Project } from "../../../state/project";
import { Enum } from "../../datatypes/enum";
import { Dropdown } from "../../../components/inputs/Dropdown";
import { TextInput } from "../../../components/inputs/TextInput";

export type BooleanOutputDefinition = {
    inputs: {
        input: DataTypes.Use<"boolean">;
    };
    outputs: never;
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        widget: DataTypes.TypeOf<DataTypes.Use<"enum">>;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<BooleanOutputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"booleanOutput", BooleanOutputDefinition> => {
    return {
        id,
        in: {
            input: null,
        },
        out: {},
        payload: {
            label: "",
            widget: Enum.Common.typicalOutputWidget.None,
        },
        type: "booleanOutput",
    };
};

const WIDGET_OPTIONS = Enum.options(Enum.Common.typicalOutputWidget);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<BooleanOutputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<BooleanOutputDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketIn node={node} socketId={"input"} type={"boolean"}>
                <TextInput value={node.payload.label} onCommit={(label) => handleUpdate({ label })} placeholder="Output name" />
            </SocketIn>
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
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<BooleanOutputDefinition>, _outSocket: keyof BooleanOutputDefinition["outputs"], _deps: AllDeps): (keyof BooleanOutputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<BooleanOutputDefinition>, _inSocket: keyof BooleanOutputDefinition["inputs"], _deps: AllDeps): (keyof BooleanOutputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (_node: NodeDefinitions.NodeFor<BooleanOutputDefinition>, _socket: keyof BooleanOutputDefinition["outputs"], _context: Resolver.Context): DataTypes.AnyEval | null => {
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"booleanOutput", BooleanOutputDefinition>, state: NodeTypes.HookState, graphId: string): NodeTypes.HookState => {
    return addInterface(state, graphId, node.id, "out");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"booleanOutput", BooleanOutputDefinition>, state: NodeTypes.HookState, graphId: string): NodeTypes.HookState => {
    return removeInterface(state, graphId, node.id, "out");
};

export const BooleanOutputType: NodeTypes.Type<"booleanOutput", BooleanOutputDefinition> = {
    type: "booleanOutput",
    displayName: "Boolean Output",
    defaultLabel: "Output",
    iconNode: <Icon shape={ICONS.Check} />,
    category: "Outputs",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    onCreate,
    onDelete,
};
