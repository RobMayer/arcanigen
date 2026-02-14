import { nanoid } from "nanoid";
import { NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";
import { TypicalNode } from "../../../features/nodeview/node";
import { Slot, SocketIn } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Enum } from "../../datatypes/enum";
import { RadioButton } from "../../../components/buttons/RadioButton";

export type FloatOutputDefinition = {
    inputs: {
        input: DataTypes.Use<"float">;
    };
    outputs: never;
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        widget: DataTypes.TypeOf<DataTypes.Use<"enum">>;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<FloatOutputDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"floatOutput", FloatOutputDefinition> => {
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
            <SocketIn node={node} socketId={"input"} type={"float"}>
                Output
            </SocketIn>
            <Slot label={"Widget"}>
                <RadioButton.Group value={`${node.payload.widget}`} options={WIDGET_OPTIONS} onValue={(w) => handleUpdate({ widget: Number(w) })} />
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

const onCreate = (node: NodeDefinitions.BuiltNodeOf<"floatOutput", FloatOutputDefinition>, state: NodeTypes.HookState, graphId: string): NodeTypes.HookState => {
    let newState: NodeTypes.HookState = {
        ...state,
        interfaces: {
            ...state.interfaces,
            [graphId]: [...(state.interfaces[graphId] ?? []), `out:${node.id}`],
        },
    };

    // Propagate: add output socket to all Custom nodes referencing this subgraph
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
                        [customNodeId]: { ...customNode, out: { ...customNode.out, [node.id]: [] } },
                    },
                };
            }
        }
        newState = { ...newState, nodes: newNodes };
    }

    return newState;
};

const onDelete = (node: NodeDefinitions.BuiltNodeOf<"floatOutput", FloatOutputDefinition>, state: NodeTypes.HookState, graphId: string): NodeTypes.HookState => {
    let newNodes = state.nodes;
    let newLinks = state.links;

    // Propagate: remove output socket from all Custom nodes referencing this subgraph
    const users = state.users[graphId] ?? [];
    for (const { node: customNodeId, scope } of users) {
        const customNode = newNodes[scope]?.[customNodeId];
        if (customNode?.type === "custom") {
            const linkIds = customNode.out[node.id] ?? [];

            // Disconnect all links from this socket
            for (const linkId of linkIds) {
                if (newLinks[scope]?.[linkId]) {
                    const link = newLinks[scope][linkId];
                    const toNode = newNodes[scope][link.toNode];
                    if (toNode) {
                        newNodes = {
                            ...newNodes,
                            [scope]: {
                                ...newNodes[scope],
                                [link.toNode]: {
                                    ...toNode,
                                    in: { ...toNode.in, [link.toSocket]: null },
                                },
                            },
                        };
                    }
                    const scopeLinks = { ...newLinks[scope] };
                    delete scopeLinks[linkId];
                    newLinks = { ...newLinks, [scope]: scopeLinks };
                }
            }

            // Remove socket from Custom node's out map
            const newOut = { ...(newNodes[scope][customNodeId] as typeof customNode).out };
            delete newOut[node.id];
            newNodes = {
                ...newNodes,
                [scope]: {
                    ...newNodes[scope],
                    [customNodeId]: { ...newNodes[scope][customNodeId], out: newOut },
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
            [graphId]: (state.interfaces[graphId] ?? []).filter((entry) => entry !== `out:${node.id}`),
        },
    };
};

export const FloatOutputType: NodeTypes.Type<"floatOutput", FloatOutputDefinition> = {
    type: "floatOutput",
    displayName: "Float Output",
    defaultLabel: "Output",
    iconNode: NODE_ICONS.numericValue.Item,
    iconCard: NODE_ICONS.numericValue.Card,
    category: "outputs",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    onCreate,
    onDelete,
};
