import { nanoid } from "nanoid";
import { ICONS, NodeIcon, NODE_ICONS } from "../../../../components/Icon";
import { Resolver } from "../../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../../features/nodeview/node";
import { SocketOut } from "../../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../../betterTypes";
import { addInterface, removeInterface } from "../../../interfaceHelpers";
import { TextInput } from "../../../../components/inputs/TextInput";
import { Project } from "../../../../state/project";

export type StopColorInputDefinition = {
    inputs: never;
    outputs: {
        output: DataTypes.Use<"stop<color>">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<StopColorInputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"stopColorInput", StopColorInputDefinition> => {
    return {
        id,
        in: {},
        out: {
            output: [],
        },
        payload: {
            label: "",
        },
        type: "stopColorInput",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<StopColorInputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<StopColorInputDefinition>>) => {
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

const dependsOn = (_node: NodeDefinitions.NodeFor<StopColorInputDefinition>, _outSocket: "output", _deps: AllDeps): (keyof StopColorInputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (
    _node: NodeDefinitions.NodeFor<StopColorInputDefinition>,
    _inSocket: keyof StopColorInputDefinition["inputs"],
    _deps: AllDeps,
): (keyof StopColorInputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<StopColorInputDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const providedInput = context.getInput?.<"stop<color>">(node.id);
        if (providedInput) return providedInput;
    }
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"stopColorInput", StopColorInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "in");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"stopColorInput", StopColorInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "in");
};

const SOCKETTYPES_OUT: { [key in keyof Required<StopColorInputDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["stop<color>"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<StopColorInputDefinition>, socketId: string, _side: "in" | "out"): SocketTypes.SocketRule => {
    return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
};

export const StopColorInputType: NodeTypes.Type<"stopColorInput", StopColorInputDefinition> = {
    type: "stopColorInput",
    displayName: "Color Stop Input",
    defaultLabel: "Color Stop Input",
    iconNode: <NodeIcon shape={NODE_ICONS.color} modifierIcon={NODE_ICONS.modifiers.stopOf} directionIcon={ICONS.ArrowTo.RightArc} />,
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
    getSocketType,
};
