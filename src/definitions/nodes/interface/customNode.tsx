import { nanoid } from "nanoid";
import { NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes } from "../../betterTypes";
import { InterfaceKey } from "../../../util/cycleDetection";
import { Project } from "../../../state/project";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { Enum } from "../../datatypes/enum";
import { FloatInputDefinition } from "./floatInputNode";
import { IntegerInputDefinition } from "./integerInputNode";
import { AngleInputDefinition } from "./angleInputNode";
import { LengthInputDefinition } from "./lengthInputNode";
import { ColorInputDefinition } from "./colorInputNode";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { ColorHexInput } from "../../../components/inputs/ColorHexInput";
import { NumericString } from "../../datatypes/numericString";
import { FloatOutputDefinition } from "./floatOutputNode";
import { IntegerOutputDefinition } from "./integerOutputNode";
import { AngleOutputDefinition } from "./angleOutputNode";
import { LengthOutputDefinition } from "./lengthOutputNode";
import { ShapeOutputDefinition } from "./shapeOutputNode";
import { ColorOutputDefinition } from "./colorOutputNode";
import { useGraphId } from "../../../state/graphId";
import styled from "styled-components";
import { flattenSockets, parseInterface, InterfaceMember } from "../../../state/project/types";
import { ShapePreview } from "../../../features/nodeview/slots";
import { Color } from "../../datatypes/color";
import { Angle } from "../../datatypes/angle";
import { Length } from "../../datatypes/length";
type StoredValueKey = `value_${string}`;

export type CustomDefinition = {
    inputs: Record<string, DataTypes.Any>;
    outputs: Record<string, DataTypes.Any>;
    payload: {
        label: string;
        graphId: string;
    } & {
        [key: StoredValueKey]: DataTypes.TypeOf<DataTypes.Any>;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<CustomDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"custom", CustomDefinition> => {
    return {
        id,
        in: {},
        out: {},
        payload: {
            label: "",
            graphId: input.graphId ?? "",
        },
        type: "custom",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<CustomDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleValue = useCallback(
        (v: Partial<{ [key: StoredValueKey]: DataTypes.TypeOf<DataTypes.Any> }>) => {
            methods.update(v);
        },
        [methods],
    );

    const interfaceEntries = Project.useGraphInterfaces(node.payload.graphId) ?? [];

    return (
        <TypicalNode node={node} methods={methods}>
            <InterfaceMembers members={interfaceEntries} graphId={node.payload.graphId} hostNode={node} handleValue={handleValue} />
        </TypicalNode>
    );
};

const InterfaceMembers = ({
    members,
    graphId,
    hostNode,
    handleValue,
}: {
    members: InterfaceMember[];
    graphId: string;
    hostNode: NodeDefinitions.NodeFor<CustomDefinition>;
    handleValue: SlotUpdateHandler;
}): ReactNode => {
    return members.map((entry, i) => {
        if (typeof entry === "string") {
            const parsed = parseInterface(entry);
            return <DynamicSlot key={entry} sourceNodeId={parsed.nodeId} graphId={graphId} handleValue={handleValue} hostNode={hostNode} />;
        }
        if (entry.type === "separator") {
            return <InterfaceSep key={`sep-${i}`} />;
        }
        if (entry.type === "accordion") {
            return (
                <NodeAccordion key={`acc-${entry.label}`} label={entry.label} nodeId={hostNode.id} accordionId={entry.id}>
                    <InterfaceMembers members={entry.items as InterfaceMember[]} graphId={graphId} hostNode={hostNode} handleValue={handleValue} />
                </NodeAccordion>
            );
        }
        return null;
    });
};

const InterfaceSep = styled.hr`
    border: none;
    border-top: 1px solid #555;
    margin: 4px 0;
`;

const dependsOn = (node: NodeDefinitions.NodeFor<CustomDefinition>, outSocket: string, deps: AllDeps): string[] => {
    const { graphId } = node.payload;
    if (!graphId) return [];

    const subgraphDeps = deps[graphId];
    if (!subgraphDeps) {
        // Fallback: all outputs depend on all inputs
        return Object.keys(node.in);
    }

    // outSocket is the ID of an output interface node in the subgraph
    const outKey: InterfaceKey = `out:${outSocket}`;
    // Values are already plain nodeIds (input interface node IDs = custom node's input sockets)
    return subgraphDeps[outKey] ?? [];
};

const contributesTo = (node: NodeDefinitions.NodeFor<CustomDefinition>, inSocket: string, deps: AllDeps): string[] => {
    const { graphId } = node.payload;
    if (!graphId) return [];

    const subgraphDeps = deps[graphId];
    if (!subgraphDeps) {
        // Fallback: all inputs contribute to all outputs
        return Object.keys(node.out);
    }

    // inSocket is the ID of an input interface node in the subgraph
    const inKey: InterfaceKey = `in:${inSocket}`;
    // Values are already plain nodeIds (output interface node IDs = custom node's output sockets)
    return subgraphDeps[inKey] ?? [];
};

const evaluate = (node: NodeDefinitions.NodeFor<CustomDefinition>, socket: string, context: Resolver.Context): DataTypes.AnyEval | null => {
    const { graphId } = node.payload;
    if (!graphId) return null;

    // Build inputs by resolving each input socket, or using stored values when not connected
    const inputs: { [key: string]: DataTypes.AnyEval | null } = {};
    for (const inSocket of Object.keys(node.in)) {
        const resolved = context.resolve(node.id, inSocket);
        if (resolved) {
            inputs[inSocket] = resolved;
        } else {
            // Use stored value when not connected
            // The stored value key is `value_${inputNodeId}` where inputNodeId === inSocket
            const storedValue = node.payload[`value_${inSocket}`];
            if (storedValue !== undefined) {
                // Look up the input node to determine its type
                const inputNode = context.getNode(graphId, inSocket);
                if (inputNode?.type === "floatInput") {
                    inputs[inSocket] = { kind: "float", data: storedValue as NumericString.Type };
                } else if (inputNode?.type === "integerInput") {
                    inputs[inSocket] = { kind: "integer", data: storedValue as NumericString.Type };
                } else if (inputNode?.type === "angleInput") {
                    inputs[inSocket] = { kind: "angle", data: storedValue as Angle.Type };
                } else if (inputNode?.type === "lengthInput") {
                    inputs[inSocket] = { kind: "length", data: storedValue as Length.Type };
                } else if (inputNode?.type === "colorInput") {
                    inputs[inSocket] = { kind: "color", data: storedValue as Color.Type };
                }
            }
        }
    }

    // Evaluate subgraph and get outputs
    const outputs = context.subgraph(graphId, inputs);

    return outputs[socket] ?? null;
};

const onCreate = (node: NodeDefinitions.NodeFor<CustomDefinition>, state: NodeTypes.HookState, graphId: string): NodeTypes.HookState => {
    const targetGraphId = node.payload.graphId;
    if (!targetGraphId) return state;

    // Read the subgraph's interface entries
    const interfaceSockets = flattenSockets(state.interfaces[targetGraphId] ?? []);

    // Build socket maps from Input/Output node labels
    const inSockets: { [key: string]: string | null } = {};
    const outSockets: { [key: string]: string[] } = {};

    for (const entry of interfaceSockets) {
        const parsed = parseInterface(entry);
        if (parsed.direction === "in") {
            inSockets[parsed.nodeId] = null;
        } else {
            outSockets[parsed.nodeId] = [];
        }
    }

    // Update the node with the built socket maps
    const updatedNode = {
        ...node,
        in: inSockets,
        out: outSockets,
    };

    return {
        ...state,
        nodes: {
            ...state.nodes,
            [graphId]: {
                ...state.nodes[graphId],
                [node.id]: updatedNode,
            },
        },
        users: {
            ...state.users,
            [targetGraphId]: [...(state.users[targetGraphId] ?? []), { node: node.id, scope: graphId }],
        },
    };
};

const onDelete = (node: NodeDefinitions.NodeFor<CustomDefinition>, state: NodeTypes.HookState, graphId: string): NodeTypes.HookState => {
    const targetGraphId = node.payload.graphId;
    if (!targetGraphId) return state;

    return {
        ...state,
        users: {
            ...state.users,
            [targetGraphId]: (state.users[targetGraphId] ?? []).filter((u) => !(u.node === node.id && u.scope === graphId)),
        },
    };
};

export const CustomNodeType: NodeTypes.Type<"custom", CustomDefinition> = {
    type: "custom",
    displayName: "Custom",
    defaultLabel: "Custom",
    iconNode: NODE_ICONS.customNode.Item,
    iconCard: NODE_ICONS.customNode.Card,
    category: "meta",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    onCreate,
    onDelete,
};

type SlotUpdateHandler = (v: Partial<{ [key: StoredValueKey]: DataTypes.TypeOf<DataTypes.Any> }>) => void;

const DynamicSlot = ({
    sourceNodeId,
    graphId,
    hostNode,
    handleValue,
}: {
    sourceNodeId: string;
    graphId: string;
    hostNode: NodeDefinitions.NodeFor<CustomDefinition>;
    handleValue: SlotUpdateHandler;
}) => {
    const [sourceNode] = Project.useNode(graphId, sourceNodeId);

    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (sourceNode.type) {
        case "floatOutput":
            return <OutputSlotFloat host={hostNode} source={sourceNode as NodeDefinitions.NodeFor<FloatOutputDefinition>} />;
        case "floatInput":
            return <InputSlotFloat host={hostNode} source={sourceNode as NodeDefinitions.NodeFor<FloatInputDefinition>} handleValue={handleValue} />;
        case "integerOutput":
            return <OutputSlotInteger host={hostNode} source={sourceNode as NodeDefinitions.NodeFor<IntegerOutputDefinition>} />;
        case "integerInput":
            return <InputSlotInteger host={hostNode} source={sourceNode as NodeDefinitions.NodeFor<IntegerInputDefinition>} handleValue={handleValue} />;
        case "angleOutput":
            return <OutputSlotAngle host={hostNode} source={sourceNode as NodeDefinitions.NodeFor<AngleOutputDefinition>} />;
        case "angleInput":
            return <InputSlotAngle host={hostNode} source={sourceNode as NodeDefinitions.NodeFor<AngleInputDefinition>} handleValue={handleValue} />;
        case "lengthOutput":
            return <OutputSlotLength host={hostNode} source={sourceNode as NodeDefinitions.NodeFor<LengthOutputDefinition>} />;
        case "lengthInput":
            return <InputSlotLength host={hostNode} source={sourceNode as NodeDefinitions.NodeFor<LengthInputDefinition>} handleValue={handleValue} />;
        case "shapeOutput":
            return <OutputSlotShape host={hostNode} source={sourceNode as NodeDefinitions.NodeFor<ShapeOutputDefinition>} />;
        case "shapeInput":
            return <InputSlotShape host={hostNode} source={sourceNode} />;
        case "colorOutput":
            return <OutputSlotColor host={hostNode} source={sourceNode as NodeDefinitions.NodeFor<ColorOutputDefinition>} />;
        case "colorInput":
            return <InputSlotColor host={hostNode} source={sourceNode as NodeDefinitions.NodeFor<ColorInputDefinition>} handleValue={handleValue} />;
    }
    return null;
};

type OutputWidgetProps<T extends NodeDefinitions.Any> = { host: NodeDefinitions.NodeFor<CustomDefinition>; source: NodeDefinitions.NodeFor<T> };
type InputWidgetProps<T extends NodeDefinitions.Any> = { host: NodeDefinitions.NodeFor<CustomDefinition>; source: NodeDefinitions.NodeFor<T>; handleValue: SlotUpdateHandler };

const OutputSlotFloat = ({ host, source }: OutputWidgetProps<FloatOutputDefinition>) => {
    const resolved = Project.useCachedOutput(useGraphId(), host, source.id);
    const output = resolved?.kind === "float" ? Number(NumericString.Emptyable.asNumber(resolved?.data)?.toFixed?.(10)) : "« none »";

    switch (source.payload.widget) {
        case Enum.Common.typicalOutputWidget.None: {
            return (
                <SocketOut node={host} socketId={source.id} type={"float" as never}>
                    {(source.payload.label ?? "") === "" ? "Output" : source.payload.label}
                </SocketOut>
            );
        }
        case Enum.Common.typicalOutputWidget.Preview: {
            return (
                <SocketOut node={host} socketId={source.id} type={"float" as never} label={(source.payload.label ?? "") === "" ? "Output" : source.payload.label}>
                    <TextPreview>{output}</TextPreview>
                </SocketOut>
            );
        }
    }
    return null;
};

const InputSlotFloat = ({ host, source, handleValue }: InputWidgetProps<FloatInputDefinition>) => {
    switch (source.payload.widget) {
        case Enum.Common.numberInputWidget.None: {
            return (
                <SocketIn node={host} socketId={source.id} type={"float" as never}>
                    {(source.payload.label ?? "") === "" ? "Input" : source.payload.label}
                </SocketIn>
            );
        }
        case Enum.Common.numberInputWidget.Input: {
            return (
                <SocketIn node={host} socketId={source.id} type={"float" as never} label={(source.payload.label ?? "") === "" ? "Input" : source.payload.label}>
                    <DecimalInput
                        value={(host.payload[`value_${source.id}`] as NumericString.Type) ?? source.payload.defaultValue}
                        onCommit={(v) => handleValue({ [`value_${source.id}`]: v })}
                        disabled={host.in[source.id] !== null}
                        min={source.payload.min}
                        max={source.payload.max}
                        step={source.payload.step}
                        snap={source.payload.snap}
                        required
                    />
                </SocketIn>
            );
        }
        case Enum.Common.numberInputWidget.Slider: {
            return (
                <SocketIn node={host} socketId={source.id} type={"float" as never} label={(source.payload.label ?? "") === "" ? "Input" : source.payload.label}>
                    <DecimalInput.SliderInput
                        value={(host.payload[`value_${source.id}`] as NumericString.Type) ?? source.payload.defaultValue}
                        onCommit={(v) => handleValue({ [`value_${source.id}`]: v })}
                        disabled={host.in[source.id] !== null}
                        min={source.payload.min ?? "0"}
                        max={source.payload.max ?? "1"}
                        step={source.payload.step ?? "0.01"}
                        snap={source.payload.snap}
                    />
                </SocketIn>
            );
        }
    }

    return null;
};

const OutputSlotInteger = ({ host, source }: OutputWidgetProps<IntegerOutputDefinition>) => {
    const resolved = Project.useCachedOutput(useGraphId(), host, source.id);
    const output = resolved?.kind === "integer" ? (NumericString.Emptyable.asNumber(resolved?.data)?.toFixed?.(0) ?? "« none »") : "« none »";

    switch (source.payload.widget) {
        case Enum.Common.typicalOutputWidget.None: {
            return (
                <SocketOut node={host} socketId={source.id} type={"integer" as never}>
                    {(source.payload.label ?? "") === "" ? "Output" : source.payload.label}
                </SocketOut>
            );
        }
        case Enum.Common.typicalOutputWidget.Preview: {
            return (
                <SocketOut node={host} socketId={source.id} type={"integer" as never} label={(source.payload.label ?? "") === "" ? "Output" : source.payload.label}>
                    <TextPreview>{output}</TextPreview>
                </SocketOut>
            );
        }
    }
    return null;
};

const InputSlotInteger = ({ host, source, handleValue }: InputWidgetProps<IntegerInputDefinition>) => {
    switch (source.payload.widget) {
        case Enum.Common.numberInputWidget.None: {
            return (
                <SocketIn node={host} socketId={source.id} type={"integer" as never}>
                    {(source.payload.label ?? "") === "" ? "Input" : source.payload.label}
                </SocketIn>
            );
        }
        case Enum.Common.numberInputWidget.Input: {
            return (
                <SocketIn node={host} socketId={source.id} type={"integer" as never} label={(source.payload.label ?? "") === "" ? "Input" : source.payload.label}>
                    <IntegerInput
                        value={(host.payload[`value_${source.id}`] as NumericString.Type) ?? source.payload.defaultValue}
                        onCommit={(v) => handleValue({ [`value_${source.id}`]: v })}
                        disabled={host.in[source.id] !== null}
                        min={source.payload.min}
                        max={source.payload.max}
                        step={source.payload.step}
                        snap={source.payload.snap}
                        required
                    />
                </SocketIn>
            );
        }
        case Enum.Common.numberInputWidget.Slider: {
            return (
                <SocketIn node={host} socketId={source.id} type={"integer" as never} label={(source.payload.label ?? "") === "" ? "Input" : source.payload.label}>
                    <IntegerInput.SliderInput
                        value={(host.payload[`value_${source.id}`] as NumericString.Type) ?? source.payload.defaultValue}
                        onCommit={(v) => handleValue({ [`value_${source.id}`]: v })}
                        disabled={host.in[source.id] !== null}
                        min={source.payload.min ?? "0"}
                        max={source.payload.max ?? "100"}
                        step={source.payload.step ?? "1"}
                        snap={source.payload.snap}
                    />
                </SocketIn>
            );
        }
    }
    return null;
};

const OutputSlotAngle = ({ host, source }: OutputWidgetProps<AngleOutputDefinition>) => {
    const resolved = Project.useCachedOutput(useGraphId(), host, source.id);
    const output = resolved?.kind === "angle" ? `${Number(NumericString.Emptyable.asNumber(resolved?.data)?.toFixed?.(2))}°` : "« none »";

    switch (source.payload.widget) {
        case Enum.Common.typicalOutputWidget.None: {
            return (
                <SocketOut node={host} socketId={source.id} type={"angle" as never}>
                    {(source.payload.label ?? "") === "" ? "Output" : source.payload.label}
                </SocketOut>
            );
        }
        case Enum.Common.typicalOutputWidget.Preview: {
            return (
                <SocketOut node={host} socketId={source.id} type={"angle" as never} label={(source.payload.label ?? "") === "" ? "Output" : source.payload.label}>
                    <TextPreview>{output}</TextPreview>
                </SocketOut>
            );
        }
    }
    return null;
};

const InputSlotAngle = ({ host, source, handleValue }: InputWidgetProps<AngleInputDefinition>) => {
    switch (source.payload.widget) {
        case Enum.Common.numberInputWidget.None: {
            return (
                <SocketIn node={host} socketId={source.id} type={"angle" as never}>
                    {(source.payload.label ?? "") === "" ? "Input" : source.payload.label}
                </SocketIn>
            );
        }
        case Enum.Common.numberInputWidget.Input: {
            return (
                <SocketIn node={host} socketId={source.id} type={"angle" as never} label={(source.payload.label ?? "") === "" ? "Input" : source.payload.label}>
                    <AngleInput
                        value={(host.payload[`value_${source.id}`] as Angle.Type) ?? source.payload.defaultValue}
                        onCommit={(v) => handleValue({ [`value_${source.id}`]: v })}
                        disabled={host.in[source.id] !== null}
                        unbound={!source.payload.wraps}
                    />
                </SocketIn>
            );
        }
        case Enum.Common.numberInputWidget.Slider: {
            return (
                <SocketIn node={host} socketId={source.id} type={"angle" as never} label={(source.payload.label ?? "") === "" ? "Input" : source.payload.label}>
                    <AngleInput.SliderInput
                        value={(host.payload[`value_${source.id}`] as Angle.Type) ?? source.payload.defaultValue}
                        onCommit={(v) => handleValue({ [`value_${source.id}`]: v })}
                        disabled={host.in[source.id] !== null}
                        min={source.payload.min}
                        max={source.payload.max}
                        step={source.payload.step}
                        snap={source.payload.snap}
                        unbound={!source.payload.wraps}
                    />
                </SocketIn>
            );
        }
    }
    return null;
};

const OutputSlotLength = ({ host, source }: OutputWidgetProps<LengthOutputDefinition>) => {
    const resolved = Project.useCachedOutput(useGraphId(), host, source.id);
    const output = resolved?.kind === "length" ? resolved.data : "« none »";

    switch (source.payload.widget) {
        case Enum.Common.typicalOutputWidget.None: {
            return (
                <SocketOut node={host} socketId={source.id} type={"length" as never}>
                    {(source.payload.label ?? "") === "" ? "Output" : source.payload.label}
                </SocketOut>
            );
        }
        case Enum.Common.typicalOutputWidget.Preview: {
            return (
                <SocketOut node={host} socketId={source.id} type={"length" as never} label={(source.payload.label ?? "") === "" ? "Output" : source.payload.label}>
                    <TextPreview>{output}</TextPreview>
                </SocketOut>
            );
        }
    }
    return null;
};

const InputSlotLength = ({ host, source, handleValue }: InputWidgetProps<LengthInputDefinition>) => {
    switch (source.payload.widget) {
        case Enum.Common.lengthInputWidget.None: {
            return (
                <SocketIn node={host} socketId={source.id} type={"length" as never}>
                    {(source.payload.label ?? "") === "" ? "Input" : source.payload.label}
                </SocketIn>
            );
        }
        case Enum.Common.lengthInputWidget.Input: {
            return (
                <SocketIn node={host} socketId={source.id} type={"length" as never} label={(source.payload.label ?? "") === "" ? "Input" : source.payload.label}>
                    <LengthInput
                        value={(host.payload[`value_${source.id}`] as Length.Type) ?? source.payload.defaultValue}
                        onCommit={(v) => handleValue({ [`value_${source.id}`]: v })}
                        disabled={host.in[source.id] !== null}
                    />
                </SocketIn>
            );
        }
    }
    return null;
};

const OutputSlotShape = ({ host, source }: OutputWidgetProps<ShapeOutputDefinition>) => {
    const resolved = Project.useCachedOutput(useGraphId(), host, source.id);
    const svgObject = resolved?.kind === "shape" ? resolved.data : null;

    switch (source.payload.widget) {
        case Enum.Common.typicalOutputWidget.None: {
            return (
                <SocketOut node={host} socketId={source.id} type={"shape" as never}>
                    {(source.payload.label ?? "") === "" ? "Output" : source.payload.label}
                </SocketOut>
            );
        }
        case Enum.Common.typicalOutputWidget.Preview: {
            return (
                <>
                    <SocketOut node={host} socketId={source.id} type={"shape" as never}>
                        {(source.payload.label ?? "") === "" ? "Output" : source.payload.label}
                    </SocketOut>
                    <ShapePreview shape={svgObject} color={Color.fromHex("#ffffffff")} />
                </>
            );
        }
    }
    return null;
};

const InputSlotShape = ({ host, source }: { host: NodeDefinitions.NodeFor<CustomDefinition>; source: NodeDefinitions.NodeFor<NodeDefinitions.Any> }) => {
    return (
        <SocketIn node={host} socketId={source.id} type={"shape" as never}>
            {((source.payload as { label?: string }).label ?? "") === "" ? "Input" : (source.payload as { label?: string }).label}
        </SocketIn>
    );
};

const OutputSlotColor = ({ host, source }: OutputWidgetProps<ColorOutputDefinition>) => {
    const resolved = Project.useCachedOutput(useGraphId(), host, source.id);
    const output = resolved?.kind === "color" ? Color.toHex(resolved.data) : "« none »";

    switch (source.payload.widget) {
        case Enum.Common.typicalOutputWidget.None: {
            return (
                <SocketOut node={host} socketId={source.id} type={"color" as never}>
                    {(source.payload.label ?? "") === "" ? "Output" : source.payload.label}
                </SocketOut>
            );
        }
        case Enum.Common.typicalOutputWidget.Preview: {
            return (
                <SocketOut node={host} socketId={source.id} type={"color" as never} label={(source.payload.label ?? "") === "" ? "Output" : source.payload.label}>
                    <TextPreview>{output}</TextPreview>
                </SocketOut>
            );
        }
    }
    return null;
};

const InputSlotColor = ({ host, source, handleValue }: InputWidgetProps<ColorInputDefinition>) => {
    switch (source.payload.widget) {
        case Enum.Common.colorInputWidget.None: {
            return (
                <SocketIn node={host} socketId={source.id} type={"color" as never}>
                    {(source.payload.label ?? "") === "" ? "Input" : source.payload.label}
                </SocketIn>
            );
        }
        case Enum.Common.colorInputWidget.Hex: {
            return (
                <SocketIn node={host} socketId={source.id} type={"color" as never} label={(source.payload.label ?? "") === "" ? "Input" : source.payload.label}>
                    <ColorHexInput
                        value={(host.payload[`value_${source.id}`] as Color.Type) ?? source.payload.defaultValue}
                        onCommit={(v) => handleValue({ [`value_${source.id}`]: v })}
                        disabled={host.in[source.id] !== null}
                        alpha={source.payload.alpha}
                        nullable={source.payload.nullable}
                    />
                </SocketIn>
            );
        }
    }
    return null;
};

const TextPreview = styled.div`
    text-align: center;
    font-size: 15pt;
    padding: 2px;
    background: #222;
    border: 1px solid #666;
    flex: 1 1 auto;
`;
