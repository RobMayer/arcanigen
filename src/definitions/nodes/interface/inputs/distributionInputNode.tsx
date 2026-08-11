import { nanoid } from "nanoid";
import { NodeIcon, ICONS, NODE_ICONS } from "../../../../components/Icon";
import { Resolver } from "../../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../../features/nodeview/node";
import { SocketOut } from "../../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../../nodeTypes";
import { DataTypes } from "../../../dataTypes";
import { addInterface, removeInterface } from "../../../helpers/interfaceHelper";
import { TextInput } from "../../../../components/inputs/TextInput";
import { Project } from "../../../../state/project";
import { signature, SignatureBuilder } from "../../../helpers/signatureBuilder";
import { SignatureEngine } from "../../../helpers/signatureEngine";

const def = signature({
    in: {},
    out: { output: "distribution" },
});

export type DistributionInputDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<"string">;
    }
>;

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
            <SocketOut node={node} socketId={"output"}>
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

export const DistributionInputType: NodeTypes.Type<"distributionInput", DistributionInputDefinition> = {
    type: "distributionInput",
    displayName: "Distribution Input",
    defaultLabel: "Distribution Input",
    iconNode: <NodeIcon shape={NODE_ICONS.func} directionIcon={ICONS.ArrowTo.RightArc} />,
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
    signature: def.instance,
    ...SignatureEngine.hooks,
};
