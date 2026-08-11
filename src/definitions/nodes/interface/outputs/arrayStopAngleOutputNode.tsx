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
    in: { input: $.arrayOf("stop:angle") },
    out: {},
});

export type ArrayStopAngleOutputDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<"string">;
    }
>;

const create = (
    _input: Partial<NodeDefinitions.PayloadTypeOf<ArrayStopAngleOutputDefinition>>,
    id: string = nanoid(),
): NodeDefinitions.BuiltNodeOf<"arrayStopAngleOutput", ArrayStopAngleOutputDefinition> => {
    return {
        id,
        in: {
            input: null,
        },
        out: {},
        payload: {
            label: "",
        },
        type: "arrayStopAngleOutput",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ArrayStopAngleOutputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ArrayStopAngleOutputDefinition>>) => {
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
    _node: NodeDefinitions.NodeFor<ArrayStopAngleOutputDefinition>,
    _outSocket: keyof ArrayStopAngleOutputDefinition["outputs"],
    _deps: AllDeps,
): (keyof ArrayStopAngleOutputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (
    _node: NodeDefinitions.NodeFor<ArrayStopAngleOutputDefinition>,
    _inSocket: keyof ArrayStopAngleOutputDefinition["inputs"],
    _deps: AllDeps,
): (keyof ArrayStopAngleOutputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (_node: NodeDefinitions.NodeFor<ArrayStopAngleOutputDefinition>, _socket: keyof ArrayStopAngleOutputDefinition["outputs"], _context: Resolver.Context): DataTypes.AnyEval | null => {
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"arrayStopAngleOutput", ArrayStopAngleOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "out");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"arrayStopAngleOutput", ArrayStopAngleOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "out");
};

export const ArrayStopAngleOutputType: NodeTypes.Type<"arrayStopAngleOutput", ArrayStopAngleOutputDefinition> = {
    type: "arrayStopAngleOutput",
    displayName: "Angle Stop Array Output",
    defaultLabel: "Angle Stop Array Output",
    iconNode: <NodeIcon shape={NODE_ICONS.angle} modifierIcon={NODE_ICONS.modifiers.arrayOfStopOf} directionIcon={ICONS.ArrowFrom.RightArc} />,
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
