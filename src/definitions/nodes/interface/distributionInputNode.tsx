import { nanoid } from "nanoid";
import { ICONS, Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes } from "../../betterTypes";
import { addInterface, removeInterface } from "../../interfaceHelpers";
import { TextInput } from "../../../components/inputs/TextInput";
import { Project } from "../../../state/project";

export type DistributionInputDefinition = {
    inputs: never;
    outputs: {
        output: DataTypes.Use<"distribution">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<DistributionInputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"distributionInput", DistributionInputDefinition> => {
    return {
        id,
        in: {},
        out: {
            output: [],
        },
        payload: {
            label: "",
        },
        type: "distributionInput",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<DistributionInputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<DistributionInputDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"distribution"}>
                <TextInput value={node.payload.label} onCommit={(label) => handleUpdate({ label })} placeholder="Input name" />
            </SocketOut>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<DistributionInputDefinition>, _outSocket: "output", _deps: AllDeps): (keyof DistributionInputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (
    _node: NodeDefinitions.NodeFor<DistributionInputDefinition>,
    _inSocket: keyof DistributionInputDefinition["inputs"],
    _deps: AllDeps,
): (keyof DistributionInputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<DistributionInputDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const providedInput = context.getInput?.<"distribution">(node.id);
        if (providedInput) return providedInput;
    }
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"distributionInput", DistributionInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "in");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"distributionInput", DistributionInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "in");
};

const getSocketType = (): string => "distribution";

export const DistributionInputType: NodeTypes.Type<"distributionInput", DistributionInputDefinition> = {
    type: "distributionInput",
    displayName: "Distribution Input",
    defaultLabel: "Input",
    iconNode: <Icon shape={NODE_ICONS.curveValue.Item} color={"var(--icon-flavour)"} cutout={"scoop"} layer={ICONS.ArrowTo.RightArc} layerColor="#fff" />,
    iconCard: <Icon shape={NODE_ICONS.curveValue.Card} color={"var(--icon-flavour)"} cutout={"scoop"} layer={ICONS.ArrowTo.RightArc} layerColor="#fff" />,
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
