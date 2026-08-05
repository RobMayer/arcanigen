import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS, ICONS } from "../../../../components/Icon";
import { Resolver } from "../../../../util/resolver";
import { ReactNode, useCallback } from "react";
import { TypicalNode } from "../../../../features/nodeview/node";
import { Slot, SocketIn } from "../../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../../betterTypes";
import { addInterface, removeInterface } from "../../../interfaceHelpers";
import { Project } from "../../../../state/project";
import { Enum } from "../../../datatypes/enum";
import { Dropdown } from "../../../../components/inputs/Dropdown";
import { TextInput } from "../../../../components/inputs/TextInput";

export type AngleOutputDefinition = {
    inputs: {
        input: DataTypes.Use<"angle">;
    };
    outputs: never;
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        widget: DataTypes.TypeOf<DataTypes.Use<"enum">>;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<AngleOutputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"angleOutput", AngleOutputDefinition> => {
    return {
        id,
        in: {
            input: null,
        },
        out: {},
        payload: {
            label: "",
            widget: Enum.Common.typicalOutputWidget.NONE.value,
        },
        type: "angleOutput",
    };
};

const WIDGET_OPTIONS = Enum.options(Enum.Common.typicalOutputWidget);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<AngleOutputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<AngleOutputDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketIn node={node} socketId={"input"}>
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

const dependsOn = (_node: NodeDefinitions.NodeFor<AngleOutputDefinition>, _outSocket: keyof AngleOutputDefinition["outputs"], _deps: AllDeps): (keyof AngleOutputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<AngleOutputDefinition>, _inSocket: keyof AngleOutputDefinition["inputs"], _deps: AllDeps): (keyof AngleOutputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (_node: NodeDefinitions.NodeFor<AngleOutputDefinition>, _socket: keyof AngleOutputDefinition["outputs"], _context: Resolver.Context): DataTypes.AnyEval | null => {
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"angleOutput", AngleOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "out");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"angleOutput", AngleOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "out");
};

const SOCKETTYPES_IN: { [key in keyof Required<AngleOutputDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    input: { types: ["angle"], mode: "or" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<AngleOutputDefinition>, socketId: string, _side: "in" | "out"): SocketTypes.SocketRule => {
    return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
};

export const AngleOutputType: NodeTypes.Type<"angleOutput", AngleOutputDefinition> = {
    type: "angleOutput",
    displayName: "Angle Output",
    defaultLabel: "Angle Output",
    iconNode: <NodeIcon shape={NODE_ICONS.angle} directionIcon={ICONS.ArrowFrom.RightArc} />,
    flavour: "info",
    category: "Outputs",
    rootRestricted: true,
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    onCreate,
    onDelete,
    getSocketType,
};
