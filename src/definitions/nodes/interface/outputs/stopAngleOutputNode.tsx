import { nanoid } from "nanoid";
import { ICONS, NodeIcon, NODE_ICONS } from "../../../../components/Icon";
import { Resolver } from "../../../../util/resolver";
import { ReactNode, useCallback } from "react";
import { TypicalNode } from "../../../../features/nodeview/node";
import { SocketIn } from "../../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../../betterTypes";
import { addInterface, removeInterface } from "../../../interfaceHelpers";
import { Project } from "../../../../state/project";
import { TextInput } from "../../../../components/inputs/TextInput";

export type StopAngleOutputDefinition = {
    inputs: {
        input: DataTypes.Use<"stop<angle>">;
    };
    outputs: never;
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<StopAngleOutputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"stopAngleOutput", StopAngleOutputDefinition> => {
    return {
        id,
        in: {
            input: null,
        },
        out: {},
        payload: {
            label: "",
        },
        type: "stopAngleOutput",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<StopAngleOutputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<StopAngleOutputDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketIn node={node} socketId={"input"}>
                <TextInput value={node.payload.label} onCommit={(label) => handleUpdate({ label })} placeholder="Output name" />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (
    _node: NodeDefinitions.NodeFor<StopAngleOutputDefinition>,
    _outSocket: keyof StopAngleOutputDefinition["outputs"],
    _deps: AllDeps,
): (keyof StopAngleOutputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (
    _node: NodeDefinitions.NodeFor<StopAngleOutputDefinition>,
    _inSocket: keyof StopAngleOutputDefinition["inputs"],
    _deps: AllDeps,
): (keyof StopAngleOutputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (_node: NodeDefinitions.NodeFor<StopAngleOutputDefinition>, _socket: keyof StopAngleOutputDefinition["outputs"], _context: Resolver.Context): DataTypes.AnyEval | null => {
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"stopAngleOutput", StopAngleOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "out");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"stopAngleOutput", StopAngleOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "out");
};

const SOCKETTYPES_IN: { [key in keyof Required<StopAngleOutputDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    input: { types: ["stop<angle>"], mode: "or" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<StopAngleOutputDefinition>, socketId: string, _side: "in" | "out"): SocketTypes.SocketRule => {
    return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
};

export const StopAngleOutputType: NodeTypes.Type<"stopAngleOutput", StopAngleOutputDefinition> = {
    type: "stopAngleOutput",
    displayName: "Angle Stop Output",
    defaultLabel: "Output",
    iconNode: <NodeIcon shape={NODE_ICONS.angle} modifierIcon={NODE_ICONS.modifiers.stopOf} directionIcon={ICONS.ArrowFrom.RightArc} />,
    flavour: "info",
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
