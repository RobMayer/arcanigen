import { nanoid } from "nanoid";
import { ICONS, NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";
import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { addInterface, removeInterface } from "../../interfaceHelpers";
import { Project } from "../../../state/project";
import { TextInput } from "../../../components/inputs/TextInput";

export type StopIntegerOutputDefinition = {
    inputs: {
        input: DataTypes.Use<"stop<integer>">;
    };
    outputs: never;
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<StopIntegerOutputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"stopIntegerOutput", StopIntegerOutputDefinition> => {
    return {
        id,
        in: {
            input: null,
        },
        out: {},
        payload: {
            label: "",
        },
        type: "stopIntegerOutput",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<StopIntegerOutputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<StopIntegerOutputDefinition>>) => {
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

const dependsOn = (_node: NodeDefinitions.NodeFor<StopIntegerOutputDefinition>, _outSocket: keyof StopIntegerOutputDefinition["outputs"], _deps: AllDeps): (keyof StopIntegerOutputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<StopIntegerOutputDefinition>, _inSocket: keyof StopIntegerOutputDefinition["inputs"], _deps: AllDeps): (keyof StopIntegerOutputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (_node: NodeDefinitions.NodeFor<StopIntegerOutputDefinition>, _socket: keyof StopIntegerOutputDefinition["outputs"], _context: Resolver.Context): DataTypes.AnyEval | null => {
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"stopIntegerOutput", StopIntegerOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "out");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"stopIntegerOutput", StopIntegerOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "out");
};

const SOCKETTYPES_IN: { [key in keyof Required<StopIntegerOutputDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    input: { types: ["stop<integer>"], mode: "or" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<StopIntegerOutputDefinition>, socketId: string, _side: "in" | "out"): SocketTypes.SocketRule => {
    return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
};

export const StopIntegerOutputType: NodeTypes.Type<"stopIntegerOutput", StopIntegerOutputDefinition> = {
    type: "stopIntegerOutput",
    displayName: "Integer Stop Output",
    defaultLabel: "Output",
    iconNode: <NodeIcon shape={NODE_ICONS.num} modifierIcon={NODE_ICONS.modifiers.stopOf} directionIcon={ICONS.ArrowFrom.RightArc} />,
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
