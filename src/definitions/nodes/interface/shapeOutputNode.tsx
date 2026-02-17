import { nanoid } from "nanoid";
import { ICONS, Icon, NODE_ICONS } from "../../../components/Icon";
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

export type ShapeOutputDefinition = {
    inputs: {
        input: DataTypes.Use<"shape">;
    };
    outputs: never;
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        widget: DataTypes.TypeOf<DataTypes.Use<"enum">>;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<ShapeOutputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"shapeOutput", ShapeOutputDefinition> => {
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
        type: "shapeOutput",
    };
};

const WIDGET_OPTIONS = Enum.options(Enum.Common.typicalOutputWidget);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ShapeOutputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ShapeOutputDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketIn node={node} socketId={"input"} type={"shape"}>
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

const dependsOn = (_node: NodeDefinitions.NodeFor<ShapeOutputDefinition>, _outSocket: keyof ShapeOutputDefinition["outputs"], _deps: AllDeps): (keyof ShapeOutputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ShapeOutputDefinition>, _inSocket: keyof ShapeOutputDefinition["inputs"], _deps: AllDeps): (keyof ShapeOutputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (_node: NodeDefinitions.NodeFor<ShapeOutputDefinition>, _socket: keyof ShapeOutputDefinition["outputs"], _context: Resolver.Context): DataTypes.AnyEval | null => {
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"shapeOutput", ShapeOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "out");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"shapeOutput", ShapeOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "out");
};

const getSocketType = (): string => "shape";

export const ShapeOutputType: NodeTypes.Type<"shapeOutput", ShapeOutputDefinition> = {
    type: "shapeOutput",
    displayName: "Shape Output",
    defaultLabel: "Output",
    iconNode: <Icon shape={NODE_ICONS.polygramShape.Item} color={"var(--icon-flavour)"} cutout={"scoop"} layer={ICONS.ArrowFrom.RightArc} layerColor="#fff" />,
    iconCard: <Icon shape={NODE_ICONS.polygramShape.Card} color={"var(--icon-flavour)"} cutout={"scoop"} layer={ICONS.ArrowFrom.RightArc} layerColor="#fff" />,
    category: "Outputs",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    onCreate,
    onDelete,
    getSocketType,
};
