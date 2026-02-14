import { nanoid } from "nanoid";
import { NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { Slot, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes } from "../../betterTypes";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { TextInput } from "../../../components/inputs/TextInput";
import { Project } from "../../../state/project";
import { Enum } from "../../datatypes/enum";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { RadioButton } from "../../../components/buttons/RadioButton";

export type FloatInputDefinition = {
    inputs: never;
    outputs: {
        output: DataTypes.Use<"float">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        defaultValue: DataTypes.TypeOf<DataTypes.Use<"float">>;
        widget: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        min: DataTypes.TypeOf<DataTypes.Use<"float">>;
        hasMin: DataTypes.TypeOf<DataTypes.Use<"boolean">>;
        max: DataTypes.TypeOf<DataTypes.Use<"float">>;
        hasMax: DataTypes.TypeOf<DataTypes.Use<"boolean">>;
        step: DataTypes.TypeOf<DataTypes.Use<"float">>;
        hasStep: DataTypes.TypeOf<DataTypes.Use<"boolean">>;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<FloatInputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"floatInput", FloatInputDefinition> => {
    return {
        id,
        in: {},
        out: {
            output: [],
        },
        payload: {
            label: "",
            defaultValue: "0",
            hasMin: false,
            min: "0",
            hasMax: false,
            max: "1",
            hasStep: false,
            step: "0.01",
            widget: Enum.Common.floatInputWidget.Input,
        },
        type: "floatInput",
    };
};

const WIDGET_OPTIONS = Enum.options(Enum.Common.floatInputWidget);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<FloatInputDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<FloatInputDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"float"}>
                <TextInput value={node.payload.label} onCommit={(label) => handleUpdate({ label })} placeholder="Input name" />
            </SocketOut>
            <Slot label={"Default Value"}>
                <DecimalInput value={node.payload.defaultValue} onCommit={(defaultValue) => handleUpdate({ defaultValue })} />
            </Slot>
            <Slot label={"Minimum"}>
                <CheckBox checked={node.payload.hasMin} onToggle={(hasMin) => handleUpdate({ hasMin })} />
                <DecimalInput value={node.payload.min} onCommit={(min) => handleUpdate({ min })} disabled={!node.payload.hasMin} />
            </Slot>
            <Slot label={"Maximum"}>
                <CheckBox checked={node.payload.hasMax} onToggle={(hasMax) => handleUpdate({ hasMax })} />
                <DecimalInput value={node.payload.max} onCommit={(max) => handleUpdate({ max })} disabled={!node.payload.hasMax} />
            </Slot>
            <Slot label={"Step"}>
                <CheckBox checked={node.payload.hasStep} onToggle={(hasStep) => handleUpdate({ hasStep })} />
                <DecimalInput value={node.payload.step} onCommit={(step) => handleUpdate({ step })} disabled={!node.payload.hasStep} />
            </Slot>
            <Slot label={"Widget"}>
                <RadioButton.Group value={`${node.payload.widget}`} options={WIDGET_OPTIONS} onValue={(w) => handleUpdate({ widget: Number(w) })} />
            </Slot>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<FloatInputDefinition>, _outSocket: "output", _deps: AllDeps): (keyof FloatInputDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<FloatInputDefinition>, _inSocket: keyof FloatInputDefinition["inputs"], _deps: AllDeps): (keyof FloatInputDefinition["outputs"])[] => {
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<FloatInputDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        // When called from subgraph context, use provided input; otherwise use default
        const providedInput = context.getInput?.<"float">(node.id);
        return {
            kind: "float",
            data: providedInput?.data ?? node.payload.defaultValue,
        };
    }
    return null;
};

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"floatInput", FloatInputDefinition>, state: NodeTypes.HookState, graphId: string): NodeTypes.HookState => {
    let newState: NodeTypes.HookState = {
        ...state,
        interfaces: {
            ...state.interfaces,
            [graphId]: [...(state.interfaces[graphId] ?? []), `in:${node.id}`],
        },
    };

    // Propagate: add input socket to all Custom nodes referencing this subgraph
    const users = newState.users[graphId] ?? [];
    if (users.length > 0) {
        let newNodes = newState.nodes;
        for (const { node: customNodeId, scope } of users) {
            const customNode = newNodes[scope]?.[customNodeId];
            if (customNode?.type === "custom") {
                newNodes = {
                    ...newNodes,
                    [scope]: {
                        ...newNodes[scope],
                        [customNodeId]: { ...customNode, in: { ...customNode.in, [node.id]: null } },
                    },
                };
            }
        }
        newState = { ...newState, nodes: newNodes };
    }

    return newState;
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"floatInput", FloatInputDefinition>, state: NodeTypes.HookState, graphId: string): NodeTypes.HookState => {
    let newNodes = state.nodes;
    let newLinks = state.links;

    // Propagate: remove input socket from all Custom nodes referencing this subgraph
    const users = state.users[graphId] ?? [];
    for (const { node: customNodeId, scope } of users) {
        const customNode = newNodes[scope]?.[customNodeId];
        if (customNode?.type === "custom") {
            const linkId = customNode.in[node.id];

            // Disconnect any link on this socket
            if (linkId && newLinks[scope]?.[linkId]) {
                const link = newLinks[scope][linkId];
                const fromNode = newNodes[scope][link.fromNode];
                if (fromNode) {
                    newNodes = {
                        ...newNodes,
                        [scope]: {
                            ...newNodes[scope],
                            [link.fromNode]: {
                                ...fromNode,
                                out: { ...fromNode.out, [link.fromSocket]: (fromNode.out[link.fromSocket] ?? []).filter((id) => id !== linkId) },
                            },
                        },
                    };
                }
                const scopeLinks = { ...newLinks[scope] };
                delete scopeLinks[linkId];
                newLinks = { ...newLinks, [scope]: scopeLinks };
            }

            // Remove socket from Custom node's in map
            const newIn = { ...(newNodes[scope][customNodeId] as typeof customNode).in };
            delete newIn[node.id];
            newNodes = {
                ...newNodes,
                [scope]: {
                    ...newNodes[scope],
                    [customNodeId]: { ...newNodes[scope][customNodeId], in: newIn },
                },
            };
        }
    }

    return {
        ...state,
        nodes: newNodes,
        links: newLinks,
        interfaces: {
            ...state.interfaces,
            [graphId]: (state.interfaces[graphId] ?? []).filter((entry) => entry !== `in:${node.id}`),
        },
    };
};

export const FloatInputType: NodeTypes.Type<"floatInput", FloatInputDefinition> = {
    type: "floatInput",
    displayName: "Float Input",
    defaultLabel: "Input",
    iconNode: NODE_ICONS.numericValue.Item,
    iconCard: NODE_ICONS.numericValue.Card,
    category: "inputs",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    onCreate,
    onDelete,
};
