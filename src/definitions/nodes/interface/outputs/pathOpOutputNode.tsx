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

export type PathOpOutputDefinition = {
    inputs: {
        input: DataTypes.Use<"pathOp">;
    };
    outputs: never;
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<PathOpOutputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"pathOpOutput", PathOpOutputDefinition> => {
    return {
        id,
        in: {
            input: null,
        },
        out: {},
        payload: {
            label: "",
        },
        type: "pathOpOutput",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PathOpOutputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PathOpOutputDefinition>>) => {
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

const dependsOn = (_node: NodeDefinitions.NodeFor<PathOpOutputDefinition>, _outSocket: keyof PathOpOutputDefinition["outputs"], _deps: AllDeps): (keyof PathOpOutputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PathOpOutputDefinition>, _inSocket: keyof PathOpOutputDefinition["inputs"], _deps: AllDeps): (keyof PathOpOutputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (_node: NodeDefinitions.NodeFor<PathOpOutputDefinition>, _socket: keyof PathOpOutputDefinition["outputs"], _context: Resolver.Context): DataTypes.AnyEval | null => {
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"pathOpOutput", PathOpOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "out");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"pathOpOutput", PathOpOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "out");
};

const SOCKETTYPES_IN: { [key in keyof Required<PathOpOutputDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    input: { types: ["pathOp"], mode: "or" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<PathOpOutputDefinition>, socketId: string, _side: "in" | "out"): SocketTypes.SocketRule => {
    return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
};

export const PathOpOutputType: NodeTypes.Type<"pathOpOutput", PathOpOutputDefinition> = {
    type: "pathOpOutput",
    displayName: "Path Op Output",
    defaultLabel: "Output",
    iconNode: <NodeIcon shape={NODE_ICONS.pathOp} directionIcon={ICONS.ArrowFrom.RightArc} />,
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
