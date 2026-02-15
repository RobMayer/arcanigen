import { nanoid } from "nanoid";
import { NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";
import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes } from "../../betterTypes";
import { addInterface, removeInterface } from "../../interfaceHelpers";
import { Project } from "../../../state/project";
import { Enum } from "../../datatypes/enum";
import { Dropdown } from "../../../components/inputs/Dropdown";

export type IntegerOutputDefinition = {
    inputs: {
        input: DataTypes.Use<"integer">;
    };
    outputs: never;
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        widget: DataTypes.TypeOf<DataTypes.Use<"enum">>;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<IntegerOutputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"integerOutput", IntegerOutputDefinition> => {
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
        type: "integerOutput",
    };
};

const WIDGET_OPTIONS = Enum.options(Enum.Common.typicalOutputWidget);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<IntegerOutputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<IntegerOutputDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketIn node={node} socketId={"input"} type={"integer"}>
                Output
            </SocketIn>
            <Dropdown value={`${node.payload.widget}`} onValue={(w) => handleUpdate({ widget: Number(w) })}>
                {WIDGET_OPTIONS.map((each) => {
                    return (
                        <option value={each.value} key={each.value}>
                            {each.label}
                        </option>
                    );
                })}
            </Dropdown>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<IntegerOutputDefinition>, _outSocket: keyof IntegerOutputDefinition["outputs"], _deps: AllDeps): (keyof IntegerOutputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<IntegerOutputDefinition>, _inSocket: keyof IntegerOutputDefinition["inputs"], _deps: AllDeps): (keyof IntegerOutputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (_node: NodeDefinitions.NodeFor<IntegerOutputDefinition>, _socket: keyof IntegerOutputDefinition["outputs"], _context: Resolver.Context): DataTypes.AnyEval | null => {
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"integerOutput", IntegerOutputDefinition>, state: NodeTypes.HookState, graphId: string): NodeTypes.HookState => {
    return addInterface(state, graphId, node.id, "out");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"integerOutput", IntegerOutputDefinition>, state: NodeTypes.HookState, graphId: string): NodeTypes.HookState => {
    return removeInterface(state, graphId, node.id, "out");
};

export const IntegerOutputType: NodeTypes.Type<"integerOutput", IntegerOutputDefinition> = {
    type: "integerOutput",
    displayName: "Integer Output",
    defaultLabel: "Output",
    iconNode: NODE_ICONS.numericValue.Item,
    iconCard: NODE_ICONS.numericValue.Card,
    category: "outputs",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    onCreate,
    onDelete,
};
