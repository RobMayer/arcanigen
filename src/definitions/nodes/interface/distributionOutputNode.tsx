import { nanoid } from "nanoid";
import { ICONS, Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";
import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { addInterface, removeInterface } from "../../interfaceHelpers";
import { Project } from "../../../state/project";
import { TextInput } from "../../../components/inputs/TextInput";

export type DistributionOutputDefinition = {
    inputs: {
        input: DataTypes.Use<"distribution">;
    };
    outputs: never;
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
    };
};

const create = (
    _input: Partial<NodeDefinitions.PayloadTypeOf<DistributionOutputDefinition>>,
    id: string = nanoid(),
): NodeDefinitions.BuiltNodeOf<"distributionOutput", DistributionOutputDefinition> => {
    return {
        id,
        in: {
            input: null,
        },
        out: {},
        payload: {
            label: "",
        },
        type: "distributionOutput",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<DistributionOutputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<DistributionOutputDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketIn node={node} socketId={"input"} type={"distribution"}>
                <TextInput value={node.payload.label} onCommit={(label) => handleUpdate({ label })} placeholder="Output name" />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (
    _node: NodeDefinitions.NodeFor<DistributionOutputDefinition>,
    _outSocket: keyof DistributionOutputDefinition["outputs"],
    _deps: AllDeps,
): (keyof DistributionOutputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (
    _node: NodeDefinitions.NodeFor<DistributionOutputDefinition>,
    _inSocket: keyof DistributionOutputDefinition["inputs"],
    _deps: AllDeps,
): (keyof DistributionOutputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (_node: NodeDefinitions.NodeFor<DistributionOutputDefinition>, _socket: keyof DistributionOutputDefinition["outputs"], _context: Resolver.Context): DataTypes.AnyEval | null => {
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"distributionOutput", DistributionOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "out");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"distributionOutput", DistributionOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "out");
};

const getSocketType = (): SocketTypes.SocketRule => SocketTypes.of("distribution");

export const DistributionOutputType: NodeTypes.Type<"distributionOutput", DistributionOutputDefinition> = {
    type: "distributionOutput",
    displayName: "Distribution Output",
    defaultLabel: "Output",
    iconNode: <Icon shape={NODE_ICONS.curveValue.Item} color={"var(--icon-flavour)"} cutout={"scoop"} layer={ICONS.ArrowFrom.RightArc} layerColor="#fff" />,
    iconCard: <Icon shape={NODE_ICONS.curveValue.Card} color={"var(--icon-flavour)"} cutout={"scoop"} layer={ICONS.ArrowFrom.RightArc} layerColor="#fff" />,
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
