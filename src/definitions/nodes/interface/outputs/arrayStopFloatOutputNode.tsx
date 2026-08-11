import { nanoid } from "nanoid";
import { ICONS, NodeIcon, NODE_ICONS } from "../../../../components/Icon";
import { Resolver } from "../../../../util/resolver";
import { ReactNode, useCallback } from "react";
import { TypicalNode } from "../../../../features/nodeview/node";
import { SocketIn } from "../../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../../nodeTypes";
import { DataTypes } from "../../../dataTypes";
import { addInterface, removeInterface } from "../../../helpers/interfaceHelper";
import { Project } from "../../../../state/project";
import { TextInput } from "../../../../components/inputs/TextInput";
import { signature, $, SignatureBuilder } from "../../../helpers/signatureBuilder";
import { SignatureEngine } from "../../../helpers/signatureEngine";

const def = signature({
    in: { input: $.arrayOf("stop:float") },
    out: {},
});

export type ArrayStopFloatOutputDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<"string">;
    }
>;

const create = (
    _input: Partial<NodeDefinitions.PayloadTypeOf<ArrayStopFloatOutputDefinition>>,
    id: string = nanoid(),
): NodeDefinitions.BuiltNodeOf<"arrayStopFloatOutput", ArrayStopFloatOutputDefinition> => {
    return {
        id,
        in: {
            input: null,
        },
        out: {},
        payload: {
            label: "",
        },
        type: "arrayStopFloatOutput",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ArrayStopFloatOutputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ArrayStopFloatOutputDefinition>>) => {
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

const dependsOn = (
    _node: NodeDefinitions.NodeFor<ArrayStopFloatOutputDefinition>,
    _outSocket: keyof ArrayStopFloatOutputDefinition["outputs"],
    _deps: AllDeps,
): (keyof ArrayStopFloatOutputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (
    _node: NodeDefinitions.NodeFor<ArrayStopFloatOutputDefinition>,
    _inSocket: keyof ArrayStopFloatOutputDefinition["inputs"],
    _deps: AllDeps,
): (keyof ArrayStopFloatOutputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (_node: NodeDefinitions.NodeFor<ArrayStopFloatOutputDefinition>, _socket: keyof ArrayStopFloatOutputDefinition["outputs"], _context: Resolver.Context): DataTypes.AnyEval | null => {
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"arrayStopFloatOutput", ArrayStopFloatOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "out");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"arrayStopFloatOutput", ArrayStopFloatOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "out");
};

export const ArrayStopFloatOutputType: NodeTypes.Type<"arrayStopFloatOutput", ArrayStopFloatOutputDefinition> = {
    type: "arrayStopFloatOutput",
    displayName: "Float Stop Array Output",
    defaultLabel: "Float Stop Array Output",
    iconNode: <NodeIcon shape={NODE_ICONS.num} modifierIcon={NODE_ICONS.modifiers.arrayOfStopOf} directionIcon={ICONS.ArrowFrom.RightArc} />,
    flavour: "info",
    category: "Outputs",
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
