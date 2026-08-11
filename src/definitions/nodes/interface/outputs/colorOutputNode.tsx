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
    in: { input: "color" },
    out: {},
});

export type ColorOutputDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<"string">;
        widget: DataTypes.TypeOf<"enum">;
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<ColorOutputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"colorOutput", ColorOutputDefinition> => {
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
        type: "colorOutput",
    };
};

const WIDGET_OPTIONS = Enum.options(Enum.Common.typicalOutputWidget);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ColorOutputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ColorOutputDefinition>>) => {
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

const dependsOn = (_node: NodeDefinitions.NodeFor<ColorOutputDefinition>, _outSocket: keyof ColorOutputDefinition["outputs"], _deps: AllDeps): (keyof ColorOutputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ColorOutputDefinition>, _inSocket: keyof ColorOutputDefinition["inputs"], _deps: AllDeps): (keyof ColorOutputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (_node: NodeDefinitions.NodeFor<ColorOutputDefinition>, _socket: keyof ColorOutputDefinition["outputs"], _context: Resolver.Context): DataTypes.AnyEval | null => {
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"colorOutput", ColorOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "out");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"colorOutput", ColorOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "out");
};

export const ColorOutputType: NodeTypes.Type<"colorOutput", ColorOutputDefinition> = {
    type: "colorOutput",
    displayName: "Color Output",
    defaultLabel: "Color Output",
    iconNode: <NodeIcon shape={NODE_ICONS.color} directionIcon={ICONS.ArrowFrom.RightArc} />,
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
