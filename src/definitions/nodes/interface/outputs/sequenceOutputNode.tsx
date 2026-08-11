import { nanoid } from "nanoid";
import { NodeIcon, ICONS, NODE_ICONS } from "../../../../components/Icon";
import { Resolver } from "../../../../util/resolver";
import { ReactNode, useCallback } from "react";
import { TypicalNode } from "../../../../features/nodeview/node";
import { Slot, SocketIn } from "../../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../../nodeTypes";
import { DataTypes } from "../../../dataTypes";
import { addInterface, removeInterface } from "../../../helpers/interfaceHelper";
import { Project } from "../../../../state/project";
import { Enum } from "../../../datatypes/enum";
import { Dropdown } from "../../../../components/inputs/Dropdown";
import { TextInput } from "../../../../components/inputs/TextInput";
import { signature, SignatureBuilder } from "../../../helpers/signatureBuilder";
import { SignatureEngine } from "../../../helpers/signatureEngine";

const def = signature({
    in: { input: "sequence" },
    out: {},
});

export type SequenceOutputDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<"string">;
        widget: DataTypes.TypeOf<"enum">;
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<SequenceOutputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"sequenceOutput", SequenceOutputDefinition> => {
    return {
        id,
        in: {
            input: null,
        },
        out: {},
        payload: {
            label: "",
            widget: Enum.Common.typicalOutputWidget.NONE.value,
        },
        type: "sequenceOutput",
    };
};

const WIDGET_OPTIONS = Enum.options(Enum.Common.typicalOutputWidget);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<SequenceOutputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<SequenceOutputDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketIn node={node} socketId={"input"}>
                <TextInput value={node.payload.label} onCommit={(label) => handleUpdate({ label })} placeholder="Output name" />
            </SocketIn>
            <Slot label={"Widget"}>
                <Dropdown value={`${node.payload.widget}`} onValue={(w) => handleUpdate({ widget: Number(w) })}>
                    {WIDGET_OPTIONS.map((each) => {
                        return (
                            <option value={each.value} key={each.value}>
                                {each.label}
                            </option>
                        );
                    })}
                </Dropdown>
            </Slot>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<SequenceOutputDefinition>, _outSocket: keyof SequenceOutputDefinition["outputs"], _deps: AllDeps): (keyof SequenceOutputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (
    _node: NodeDefinitions.NodeFor<SequenceOutputDefinition>,
    _inSocket: keyof SequenceOutputDefinition["inputs"],
    _deps: AllDeps,
): (keyof SequenceOutputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (_node: NodeDefinitions.NodeFor<SequenceOutputDefinition>, _socket: keyof SequenceOutputDefinition["outputs"], _context: Resolver.Context): DataTypes.AnyEval | null => {
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"sequenceOutput", SequenceOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "out");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"sequenceOutput", SequenceOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "out");
};

export const SequenceOutputType: NodeTypes.Type<"sequenceOutput", SequenceOutputDefinition> = {
    type: "sequenceOutput",
    displayName: "Sequence Output",
    defaultLabel: "Sequence Output",
    iconNode: <NodeIcon shape={NODE_ICONS.timeline} directionIcon={ICONS.ArrowFrom.RightArc} />,
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
