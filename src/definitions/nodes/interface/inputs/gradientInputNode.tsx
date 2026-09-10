import { nanoid } from "nanoid";
import { NodeIcon, ICONS, NODE_ICONS } from "../../../../components/Icon";
import { Resolver } from "../../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../../features/nodeview/node";
import { SocketOut } from "../../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../../nodeTypes";
import { DataTypes } from "../../../dataTypes";
import { addInterface, removeInterface, handleInputSocketedChange } from "../../../helpers/interfaceHelper";
import { TextInput } from "../../../../components/inputs/TextInput";
import { Project } from "../../../../state/project";
import { signature, SignatureBuilder } from "../../../helpers/signatureBuilder";
import { SignatureEngine } from "../../../helpers/signatureEngine";

const def = signature({
    in: {},
    out: { output: "gradient" },
});

export type GradientInputDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        socketed: boolean;
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<GradientInputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"gradientInput", GradientInputDefinition> => {
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
        type: "gradientInput",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<GradientInputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<GradientInputDefinition>>) => {
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

const dependsOn = (_node: NodeDefinitions.NodeFor<GradientInputDefinition>, _outSocket: "output", _deps: AllDeps): (keyof GradientInputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<GradientInputDefinition>, _inSocket: keyof GradientInputDefinition["inputs"], _deps: AllDeps): (keyof GradientInputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<GradientInputDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const providedInput = context.getInput?.<DataTypes.Gradient>(node.id);
        if (providedInput) return providedInput;
    }
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"gradientInput", GradientInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "in");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"gradientInput", GradientInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "in");
};

export const GradientInputType: NodeTypes.Type<"gradientInput", GradientInputDefinition> = {
    type: "gradientInput",
    displayName: "Gradient Input",
    defaultLabel: "Gradient Input",
    iconNode: <NodeIcon shape={NODE_ICONS.gradient} directionIcon={ICONS.ArrowTo.RightArc} />,
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
    onPayloadChange: handleInputSocketedChange,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
