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
    in: { input: $.arrayOf("stop:integer") },
    out: {},
});

export type ArrayStopIntegerOutputDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<"string">;
    }
>;

const create = (
    _input: Partial<NodeDefinitions.PayloadTypeOf<ArrayStopIntegerOutputDefinition>>,
    id: string = nanoid(),
): NodeDefinitions.BuiltNodeOf<"arrayStopIntegerOutput", ArrayStopIntegerOutputDefinition> => {
    return {
        id,
        in: {
            input: null,
        },
        out: {},
        payload: {
            label: "",
        },
        type: "arrayStopIntegerOutput",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ArrayStopIntegerOutputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ArrayStopIntegerOutputDefinition>>) => {
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
    _node: NodeDefinitions.NodeFor<ArrayStopIntegerOutputDefinition>,
    _outSocket: keyof ArrayStopIntegerOutputDefinition["outputs"],
    _deps: AllDeps,
): (keyof ArrayStopIntegerOutputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (
    _node: NodeDefinitions.NodeFor<ArrayStopIntegerOutputDefinition>,
    _inSocket: keyof ArrayStopIntegerOutputDefinition["inputs"],
    _deps: AllDeps,
): (keyof ArrayStopIntegerOutputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (
    _node: NodeDefinitions.NodeFor<ArrayStopIntegerOutputDefinition>,
    _socket: keyof ArrayStopIntegerOutputDefinition["outputs"],
    _context: Resolver.Context,
): DataTypes.AnyEval | null => {
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"arrayStopIntegerOutput", ArrayStopIntegerOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "out");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"arrayStopIntegerOutput", ArrayStopIntegerOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "out");
};

export const ArrayStopIntegerOutputType: NodeTypes.Type<"arrayStopIntegerOutput", ArrayStopIntegerOutputDefinition> = {
    type: "arrayStopIntegerOutput",
    displayName: "Integer Stop Array Output",
    defaultLabel: "Integer Stop Array Output",
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
