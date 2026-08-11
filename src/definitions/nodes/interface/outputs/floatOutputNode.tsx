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
    in: { input: "float" },
    out: {},
});

export type FloatOutputDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<"string">;
        widget: DataTypes.TypeOf<"enum">;
    }
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<FloatOutputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"floatOutput", FloatOutputDefinition> => {
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
        type: "floatOutput",
    };
};

const WIDGET_OPTIONS = Enum.options(Enum.Common.typicalOutputWidget);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<FloatOutputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<FloatOutputDefinition>>) => {
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

const dependsOn = (_node: NodeDefinitions.NodeFor<FloatOutputDefinition>, _outSocket: keyof FloatOutputDefinition["outputs"], _deps: AllDeps): (keyof FloatOutputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<FloatOutputDefinition>, _inSocket: keyof FloatOutputDefinition["inputs"], _deps: AllDeps): (keyof FloatOutputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (_node: NodeDefinitions.NodeFor<FloatOutputDefinition>, _socket: keyof FloatOutputDefinition["outputs"], _context: Resolver.Context): DataTypes.AnyEval | null => {
    // Output nodes don't have output sockets - they're sinks
    // The Custom node reads their input values via context.subgraph()
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"floatOutput", FloatOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "out");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"floatOutput", FloatOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "out");
};

export const FloatOutputType: NodeTypes.Type<"floatOutput", FloatOutputDefinition> = {
    type: "floatOutput",
    displayName: "Float Output",
    defaultLabel: "Float Output",
    iconNode: <NodeIcon shape={NODE_ICONS.num} directionIcon={ICONS.ArrowFrom.RightArc} />,
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
