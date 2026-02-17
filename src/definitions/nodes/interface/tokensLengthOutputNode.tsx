import { nanoid } from "nanoid";
import { ICONS, Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";
import { TypicalNode } from "../../../features/nodeview/node";
import { Slot, SocketIn } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes } from "../../betterTypes";
import { addInterface, removeInterface } from "../../interfaceHelpers";
import { Project } from "../../../state/project";
import { Enum } from "../../datatypes/enum";
import { Dropdown } from "../../../components/inputs/Dropdown";
import { TextInput } from "../../../components/inputs/TextInput";

export type TokensLengthOutputDefinition = {
    inputs: {
        input: DataTypes.Use<"tokens<length>">;
    };
    outputs: never;
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        widget: DataTypes.TypeOf<DataTypes.Use<"enum">>;
    };
};

const create = (
    _input: Partial<NodeDefinitions.PayloadTypeOf<TokensLengthOutputDefinition>>,
    id: string = nanoid(),
): NodeDefinitions.BuiltNodeOf<"tokensLengthOutput", TokensLengthOutputDefinition> => {
    return {
        id,
        in: {
            input: null,
        },
        out: {},
        payload: {
            label: "",
            widget: Enum.Common.typicalOutputWidget.None,
        },
        type: "tokensLengthOutput",
    };
};

const WIDGET_OPTIONS = Enum.options(Enum.Common.typicalOutputWidget);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<TokensLengthOutputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<TokensLengthOutputDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketIn node={node} socketId={"input"} type={"tokens<length>"}>
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

const dependsOn = (
    _node: NodeDefinitions.NodeFor<TokensLengthOutputDefinition>,
    _outSocket: keyof TokensLengthOutputDefinition["outputs"],
    _deps: AllDeps,
): (keyof TokensLengthOutputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (
    _node: NodeDefinitions.NodeFor<TokensLengthOutputDefinition>,
    _inSocket: keyof TokensLengthOutputDefinition["inputs"],
    _deps: AllDeps,
): (keyof TokensLengthOutputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (_node: NodeDefinitions.NodeFor<TokensLengthOutputDefinition>, _socket: keyof TokensLengthOutputDefinition["outputs"], _context: Resolver.Context): DataTypes.AnyEval | null => {
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"tokensLengthOutput", TokensLengthOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    addInterface(ctx, graphId, node.id, "out");
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"tokensLengthOutput", TokensLengthOutputDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    removeInterface(ctx, graphId, node.id, "out");
};

const getSocketType = (): string => "tokens<length>";

export const TokensLengthOutputType: NodeTypes.Type<"tokensLengthOutput", TokensLengthOutputDefinition> = {
    type: "tokensLengthOutput",
    displayName: "Tokens Output",
    defaultLabel: "Output",
    iconNode: <Icon shape={NODE_ICONS.lengthValue.Item} color={"var(--icon-flavour)"} cutout={"scoop"} layer={ICONS.ArrowFrom.RightArc} layerColor="#fff" />,
    iconCard: <Icon shape={NODE_ICONS.lengthValue.Card} color={"var(--icon-flavour)"} cutout={"scoop"} layer={ICONS.ArrowFrom.RightArc} layerColor="#fff" />,
    category: "Outputs",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    onCreate,
    onDelete,
    getSocketType,
};
