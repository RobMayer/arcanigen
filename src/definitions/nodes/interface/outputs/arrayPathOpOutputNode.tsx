import { nanoid } from "nanoid";
import { NodeIcon, ICONS, NODE_ICONS } from "../../../../components/Icon";
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
    in: { input: $.arrayOf("pathOp") },
    out: {},
});

export type ArrayPathOpOutputDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<"string">;
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<ArrayPathOpOutputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"arrayPathOpOutput", ArrayPathOpOutputDefinition> => {
    return {
        id,
        in: {
            input: null,
        },
        out: {},
        payload: {
            label: "",
        },
        type: "arrayPathOpOutput",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ArrayPathOpOutputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ArrayPathOpOutputDefinition>>) => {
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
    _node: NodeDefinitions.NodeFor<ArrayPathOpOutputDefinition>,
    _outSocket: keyof ArrayPathOpOutputDefinition["outputs"],
    _deps: AllDeps,
): (keyof ArrayPathOpOutputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (
    _node: NodeDefinitions.NodeFor<ArrayPathOpOutputDefinition>,
    _inSocket: keyof ArrayPathOpOutputDefinition["inputs"],
    _deps: AllDeps,
): (keyof ArrayPathOpOutputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (_node: NodeDefinitions.NodeFor<ArrayPathOpOutputDefinition>, _socket: keyof ArrayPathOpOutputDefinition["outputs"], _context: Resolver.Context): DataTypes.AnyEval | null => {
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"arrayPathOpOutput", ArrayPathOpOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "out");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"arrayPathOpOutput", ArrayPathOpOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "out");
};

export const ArrayPathOpOutputType: NodeTypes.Type<"arrayPathOpOutput", ArrayPathOpOutputDefinition> = {
    type: "arrayPathOpOutput",
    displayName: "Path Ops Output",
    defaultLabel: "Path Ops Output",
    iconNode: <NodeIcon shape={NODE_ICONS.combine} directionIcon={ICONS.ArrowFrom.RightArc} />,
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
