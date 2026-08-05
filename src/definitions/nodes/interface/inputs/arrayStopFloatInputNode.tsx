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

export type ArrayStopFloatInputDefinition = {
    inputs: never;
    outputs: {
        output: DataTypes.Use<"array<stop<float>>">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
    };
};

const create = (
    _input: Partial<NodeDefinitions.PayloadTypeOf<ArrayStopFloatInputDefinition>>,
    id: string = nanoid(),
): NodeDefinitions.BuiltNodeOf<"arrayStopFloatInput", ArrayStopFloatInputDefinition> => {
    return {
        id,
        in: {},
        out: {
            output: [],
        },
        payload: {
            label: "",
        },
        type: "arrayStopFloatInput",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ArrayStopFloatInputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ArrayStopFloatInputDefinition>>) => {
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

const dependsOn = (_node: NodeDefinitions.NodeFor<ArrayStopFloatInputDefinition>, _outSocket: "output", _deps: AllDeps): (keyof ArrayStopFloatInputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (
    _node: NodeDefinitions.NodeFor<ArrayStopFloatInputDefinition>,
    _inSocket: keyof ArrayStopFloatInputDefinition["inputs"],
    _deps: AllDeps,
): (keyof ArrayStopFloatInputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<ArrayStopFloatInputDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const providedInput = context.getInput?.<"array<stop<float>>">(node.id);
        if (providedInput) return providedInput;
    }
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"arrayStopFloatInput", ArrayStopFloatInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "in");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"arrayStopFloatInput", ArrayStopFloatInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "in");
};

const SOCKETTYPES_OUT: { [key in keyof Required<ArrayStopFloatInputDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["array<stop<float>>"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<ArrayStopFloatInputDefinition>, socketId: string, _side: "in" | "out"): SocketTypes.SocketRule => {
    return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
};

export const ArrayStopFloatInputType: NodeTypes.Type<"arrayStopFloatInput", ArrayStopFloatInputDefinition> = {
    type: "arrayStopFloatInput",
    displayName: "Float Stop Array Input",
    defaultLabel: "Float Stop Array Input",
    iconNode: <NodeIcon shape={NODE_ICONS.num} modifierIcon={NODE_ICONS.modifiers.arrayOfStopOf} directionIcon={ICONS.ArrowTo.RightArc} />,
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
