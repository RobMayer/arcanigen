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

export type ArrayStopIntegerOutputDefinition = {
    inputs: {
        input: DataTypes.Use<"array<stop<integer>>">;
    };
    outputs: never;
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<ArrayStopIntegerOutputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"arrayStopIntegerOutput", ArrayStopIntegerOutputDefinition> => {
    return {
        id,
        in: {
            input: null,
        },
        out: {},
        payload: {
            label: "",
        },
        type: "arrayStopIntegerOutput",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ArrayStopIntegerOutputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ArrayStopIntegerOutputDefinition>>) => {
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

const dependsOn = (_node: NodeDefinitions.NodeFor<ArrayStopIntegerOutputDefinition>, _outSocket: keyof ArrayStopIntegerOutputDefinition["outputs"], _deps: AllDeps): (keyof ArrayStopIntegerOutputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ArrayStopIntegerOutputDefinition>, _inSocket: keyof ArrayStopIntegerOutputDefinition["inputs"], _deps: AllDeps): (keyof ArrayStopIntegerOutputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (_node: NodeDefinitions.NodeFor<ArrayStopIntegerOutputDefinition>, _socket: keyof ArrayStopIntegerOutputDefinition["outputs"], _context: Resolver.Context): DataTypes.AnyEval | null => {
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"arrayStopIntegerOutput", ArrayStopIntegerOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "out");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"arrayStopIntegerOutput", ArrayStopIntegerOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "out");
};

const SOCKETTYPES_IN: { [key in keyof Required<ArrayStopIntegerOutputDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    input: { types: ["array<stop<integer>>"], mode: "or" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<ArrayStopIntegerOutputDefinition>, socketId: string, _side: "in" | "out"): SocketTypes.SocketRule => {
    return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
};

export const ArrayStopIntegerOutputType: NodeTypes.Type<"arrayStopIntegerOutput", ArrayStopIntegerOutputDefinition> = {
    type: "arrayStopIntegerOutput",
    displayName: "Integer Stop Array Output",
    defaultLabel: "Output",
    iconNode: <NodeIcon shape={NODE_ICONS.num} modifierIcon={NODE_ICONS.modifiers.arrayOfStopOf} directionIcon={ICONS.ArrowFrom.RightArc} />,
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
