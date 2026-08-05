import { nanoid } from "nanoid";
import { NodeIcon, ICONS, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { addInterface, removeInterface } from "../../interfaceHelpers";
import { TextInput } from "../../../components/inputs/TextInput";
import { Project } from "../../../state/project";

export type ArrayPathOpInputDefinition = {
    inputs: never;
    outputs: {
        output: DataTypes.Use<"array<pathOp>">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<ArrayPathOpInputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"arrayPathOpInput", ArrayPathOpInputDefinition> => {
    return {
        id,
        in: {},
        out: {
            output: [],
        },
        payload: {
            label: "",
        },
        type: "arrayPathOpInput",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ArrayPathOpInputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ArrayPathOpInputDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                <TextInput value={node.payload.label} onCommit={(label) => handleUpdate({ label })} placeholder="Input name" />
            </SocketOut>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<ArrayPathOpInputDefinition>, _outSocket: "output", _deps: AllDeps): (keyof ArrayPathOpInputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (
    _node: NodeDefinitions.NodeFor<ArrayPathOpInputDefinition>,
    _inSocket: keyof ArrayPathOpInputDefinition["inputs"],
    _deps: AllDeps,
): (keyof ArrayPathOpInputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<ArrayPathOpInputDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const providedInput = context.getInput?.<"array<pathOp>">(node.id);
        if (providedInput) return providedInput;
    }
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"arrayPathOpInput", ArrayPathOpInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "in");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"arrayPathOpInput", ArrayPathOpInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "in");
};

const SOCKETTYPES_OUT: { [key in keyof Required<ArrayPathOpInputDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["array<pathOp>"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<ArrayPathOpInputDefinition>, socketId: string, _side: "in" | "out"): SocketTypes.SocketRule => {
    return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
};

export const ArrayPathOpInputType: NodeTypes.Type<"arrayPathOpInput", ArrayPathOpInputDefinition> = {
    type: "arrayPathOpInput",
    displayName: "Path Ops Input",
    defaultLabel: "Input",
    iconNode: <NodeIcon shape={NODE_ICONS.combine} directionIcon={ICONS.ArrowTo.RightArc} />,
    category: "Inputs",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    onCreate,
    onDelete,
    getSocketType,
};
