import { nanoid } from "nanoid";
import { ICONS, NodeIcon, NODE_ICONS } from "../../../../components/Icon";
import { Resolver } from "../../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../../features/nodeview/node";
import { SocketOut } from "../../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../../nodeTypes";
import { DataTypes } from "../../../dataTypes";
import { addInterface, removeInterface } from "../../../helpers/interfaceHelper";
import { TextInput } from "../../../../components/inputs/TextInput";
import { Project } from "../../../../state/project";
import { signature, $, SignatureBuilder } from "../../../helpers/signatureBuilder";
import { SignatureEngine } from "../../../helpers/signatureEngine";

const def = signature({
    in: {},
    out: { output: $.arrayOf("stop:angle") },
});

export type ArrayStopAngleInputDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<"string">;
    }
>;

const create = (
    _input: Partial<NodeDefinitions.PayloadTypeOf<ArrayStopAngleInputDefinition>>,
    id: string = nanoid(),
): NodeDefinitions.BuiltNodeOf<"arrayStopAngleInput", ArrayStopAngleInputDefinition> => {
    return {
        id,
        in: {},
        out: {
            output: [],
        },
        payload: {
            label: "",
        },
        type: "arrayStopAngleInput",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ArrayStopAngleInputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ArrayStopAngleInputDefinition>>) => {
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

const dependsOn = (_node: NodeDefinitions.NodeFor<ArrayStopAngleInputDefinition>, _outSocket: "output", _deps: AllDeps): (keyof ArrayStopAngleInputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (
    _node: NodeDefinitions.NodeFor<ArrayStopAngleInputDefinition>,
    _inSocket: keyof ArrayStopAngleInputDefinition["inputs"],
    _deps: AllDeps,
): (keyof ArrayStopAngleInputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<ArrayStopAngleInputDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const providedInput = context.getInput?.<"array<stop:angle>">(node.id);
        if (providedInput) return providedInput;
    }
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"arrayStopAngleInput", ArrayStopAngleInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "in");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"arrayStopAngleInput", ArrayStopAngleInputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "in");
};

export const ArrayStopAngleInputType: NodeTypes.Type<"arrayStopAngleInput", ArrayStopAngleInputDefinition> = {
    type: "arrayStopAngleInput",
    displayName: "Angle Stop Array Input",
    defaultLabel: "Angle Stop Array Input",
    iconNode: <NodeIcon shape={NODE_ICONS.angle} modifierIcon={NODE_ICONS.modifiers.arrayOfStopOf} directionIcon={ICONS.ArrowTo.RightArc} />,
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
