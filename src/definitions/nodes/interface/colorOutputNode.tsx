import { nanoid } from "nanoid";
import { ICONS, NODE_ICONS, Icon } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";
import { TypicalNode } from "../../../features/nodeview/node";
import { Slot, SocketIn } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { addInterface, removeInterface } from "../../interfaceHelpers";
import { Project } from "../../../state/project";
import { Enum } from "../../datatypes/enum";
import { Dropdown } from "../../../components/inputs/Dropdown";
import { TextInput } from "../../../components/inputs/TextInput";

export type ColorOutputDefinition = {
    inputs: {
        input: DataTypes.Use<"color">;
    };
    outputs: never;
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        widget: DataTypes.TypeOf<DataTypes.Use<"enum">>;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<ColorOutputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"colorOutput", ColorOutputDefinition> => {
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
        type: "colorOutput",
    };
};

const WIDGET_OPTIONS = Enum.options(Enum.Common.typicalOutputWidget);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ColorOutputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ColorOutputDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketIn node={node} socketId={"input"} type={"color"}>
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

const dependsOn = (_node: NodeDefinitions.NodeFor<ColorOutputDefinition>, _outSocket: keyof ColorOutputDefinition["outputs"], _deps: AllDeps): (keyof ColorOutputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ColorOutputDefinition>, _inSocket: keyof ColorOutputDefinition["inputs"], _deps: AllDeps): (keyof ColorOutputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (_node: NodeDefinitions.NodeFor<ColorOutputDefinition>, _socket: keyof ColorOutputDefinition["outputs"], _context: Resolver.Context): DataTypes.AnyEval | null => {
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"colorOutput", ColorOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "out");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"colorOutput", ColorOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "out");
};

const getSocketType = (): SocketTypes.SocketRule => SocketTypes.of("color");

export const ColorOutputType: NodeTypes.Type<"colorOutput", ColorOutputDefinition> = {
    type: "colorOutput",
    displayName: "Color Output",
    defaultLabel: "Output",
    iconNode: <Icon shape={NODE_ICONS.colorValue.Item} color={"var(--icon-flavour)"} cutout={"scoop"} layer={ICONS.ArrowFrom.RightArc} layerColor="#fff" />,
    iconCard: <Icon shape={NODE_ICONS.colorValue.Card} color={"var(--icon-flavour)"} cutout={"scoop"} layer={ICONS.ArrowFrom.RightArc} layerColor="#fff" />,
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
