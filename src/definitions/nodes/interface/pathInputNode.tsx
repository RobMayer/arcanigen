import { nanoid } from "nanoid";
import { ICONS, Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { addInterface, removeInterface, handleInputSocketedChange } from "../../interfaceHelpers";
import { TextInput } from "../../../components/inputs/TextInput";
import { Project } from "../../../state/project";

export type PathInputDefinition = {
    inputs: never;
    outputs: {
        output: DataTypes.Use<"path">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        socketed: boolean;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<PathInputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"pathInput", PathInputDefinition> => {
    return {
        id,
        in: {},
        out: {
            output: [],
        },
        payload: {
            label: "",
            socketed: true,
        },
        type: "pathInput",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PathInputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PathInputDefinition>>) => {
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

const dependsOn = (_node: NodeDefinitions.NodeFor<PathInputDefinition>, _outSocket: "output", _deps: AllDeps): (keyof PathInputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PathInputDefinition>, _inSocket: keyof PathInputDefinition["inputs"], _deps: AllDeps): (keyof PathInputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<PathInputDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const providedInput = context.getInput?.<"path">(node.id);
        if (providedInput) return providedInput;
    }
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"pathInput", PathInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "in");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"pathInput", PathInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "in");
};

const SOCKETTYPES_OUT: { [key in keyof Required<PathInputDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["path"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<PathInputDefinition>, socketId: string, _side: "in" | "out"): SocketTypes.SocketRule => {
    return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
};

export const PathInputType: NodeTypes.Type<"pathInput", PathInputDefinition> = {
    type: "pathInput",
    displayName: "Path Input",
    defaultLabel: "Input",
    iconNode: <Icon shape={NODE_ICONS.alongPath.Item} color={"var(--icon-flavour)"} cutout={"scoop"} layer={ICONS.ArrowTo.RightArc} layerColor="#fff" />,
    iconCard: <Icon shape={NODE_ICONS.alongPath.Card} color={"var(--icon-flavour)"} cutout={"scoop"} layer={ICONS.ArrowTo.RightArc} layerColor="#fff" />,
    category: "Inputs",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    onCreate,
    onDelete,
    onPayloadChange: handleInputSocketedChange,
    getSocketType,
};
