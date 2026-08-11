import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS, ICONS, Icon, CUSTOM_ICONS } from "../../../components/Icon";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { Resolver } from "../../../util/resolver";
import { DragEvent, ReactNode, useCallback, useRef, useState } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { SocketTypes } from "../../socketTypes";
import { InterfaceKey } from "../../../util/cycleDetection";
import { Project } from "../../../state/project";
import { NodeAccordion, Slot, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { Enum } from "../../datatypes/enum";
import { FloatInputDefinition } from "./inputs/floatInputNode";
import { IntegerInputDefinition } from "./inputs/integerInputNode";
import { AngleInputDefinition } from "./inputs/angleInputNode";
import { LengthInputDefinition } from "./inputs/lengthInputNode";
import { ColorInputDefinition } from "./inputs/colorInputNode";
import { BooleanInputDefinition } from "./inputs/booleanInputNode";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { ColorHexInput } from "../../../components/inputs/ColorHexInput";
import { NumericString } from "../../datatypes/numericString";
import { FloatOutputDefinition } from "./outputs/floatOutputNode";
import { IntegerOutputDefinition } from "./outputs/integerOutputNode";
import { AngleOutputDefinition } from "./outputs/angleOutputNode";
import { LengthOutputDefinition } from "./outputs/lengthOutputNode";
import { ShapeOutputDefinition } from "./outputs/shapeOutputNode";
import { ColorOutputDefinition } from "./outputs/colorOutputNode";
import { BooleanOutputDefinition } from "./outputs/booleanOutputNode";
import { EnumInputDefinition } from "./inputs/enumInputNode";
import { EnumOutputDefinition } from "./outputs/enumOutputNode";
import { TokensLengthInputDefinition } from "./inputs/tokensLengthInputNode";
import { TokensLengthOutputDefinition } from "./outputs/tokensLengthOutputNode";
import { StringInputDefinition } from "./inputs/stringInputNode";
import { StringOutputDefinition } from "./outputs/stringOutputNode";
import { TextInput } from "../../../components/inputs/TextInput";
import { BlockInput } from "../../../components/inputs/BlockInput";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { Dropdown } from "../../../components/inputs/Dropdown";
import { CheckButton } from "../../../components/buttons/CheckButton";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { RadioBox } from "../../../components/buttons/RadioBox";
import { useGraphId } from "../../../state/graphId";
import styled from "styled-components";
import { flattenSockets, parseInterface, interfaceMemberLabel, InterfaceMember } from "../../../state/project/types";
import { ShapePreview } from "../../../features/nodeview/slots";
import { Color } from "../../datatypes/color";
import { Angle } from "../../datatypes/angle";
import { Length } from "../../datatypes/length";
type StoredValueKey = `value_${string}`;

export type CustomDefinition = {
    inputs: Record<string, DataTypes.Kind>;
    outputs: Record<string, DataTypes.Kind>;
    payload: {
        label: string;
        graphId: string;
    } & {
        [key: StoredValueKey]: DataTypes.TypeOf<DataTypes.Kind>;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<CustomDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"custom", CustomDefinition> => {
    return {
        id,
        in: {},
        out: {},
        payload: {
            label: input.label ?? "",
            graphId: input.graphId ?? "",
        },
        type: "custom",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<CustomDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleValue = useCallback(
        (v: Partial<{ [key: StoredValueKey]: DataTypes.TypeOf<DataTypes.Kind> }>) => {
            methods.update(v);
        },
        [methods],
    );

    const interfaceEntries = Project.useGraphInterfaces(node.payload.graphId) ?? [];

    const subMeta = Project.useGraphMeta(node.payload.graphId);
    const iconNode = subMeta ? <NodeIcon shape={CUSTOM_ICONS[subMeta.icon]} modifierIcon={ICONS.User} /> : undefined;

    return (
        <TypicalNode node={node} methods={methods} flavour={subMeta?.flavour} iconNode={iconNode}>
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
                    <InterfaceMembers members={entry.items} graphId={graphId} hostNode={hostNode} handleValue={handleValue} />
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
    const rawDeps = subgraphDeps[outKey] ?? [];

    // Expand layer groups: replace inputNodeId with supersocket + all layer socket names from that group
    const expanded: string[] = [];
    for (const dep of rawDeps) {
        const layersKey = `layers_${dep}`;
        if (layersKey in node.payload) {
            const entries = (node.payload as Record<string, unknown>)[layersKey] as { socket: string }[];
            expanded.push(dep); // supersocket
            expanded.push(...entries.map((e) => e.socket));
        } else {
            expanded.push(dep);
        }
    }
    return expanded;
};

const contributesTo = (node: NodeDefinitions.NodeFor<CustomDefinition>, inSocket: string, deps: AllDeps): string[] => {
    const { graphId } = node.payload;
    if (!graphId) return [];

    const subgraphDeps = deps[graphId];
    if (!subgraphDeps) {
        // Fallback: all inputs contribute to all outputs
        return Object.keys(node.out);
    }

    // Check if inSocket belongs to a layer group
    for (const key of Object.keys(node.payload)) {
        if (!key.startsWith("layers_")) continue;
        const inputNodeId = key.slice(7);
        const entries = (node.payload as Record<string, unknown>)[key] as { socket: string }[];
        if (entries.some((e) => e.socket === inSocket)) {
            const inKey: InterfaceKey = `in:${inputNodeId}`;
            return subgraphDeps[inKey] ?? [];
        }
    }

    // inSocket is the ID of an input interface node in the subgraph
    const inKey: InterfaceKey = `in:${inSocket}`;
    // Values are already plain nodeIds (output interface node IDs = custom node's output sockets)
    return subgraphDeps[inKey] ?? [];
};

const storedValueToEval = (storedValue: unknown, nodeType: string): DataTypes.AnyEval | null => {
    switch (nodeType) {
        case "floatInput":
            return { kind: "float", data: storedValue as NumericString.Type };
        case "integerInput":
            return { kind: "integer", data: storedValue as NumericString.Type };
        case "angleInput":
            return { kind: "angle", data: storedValue as Angle.Type };
        case "lengthInput":
            return { kind: "length", data: storedValue as Length.Type };
        case "colorInput":
        case "paintInput":
            return { kind: "color", data: storedValue as Color.Type };
        case "booleanInput":
            return { kind: "boolean", data: storedValue as boolean };
        case "enumInput":
            return { kind: "enum", data: storedValue as number };
        case "tokensLengthInput":
            return { kind: "tokens:length", data: storedValue as string };
        case "stringInput":
            return { kind: "string", data: storedValue as string };
        default:
            return null;
    }
};

const evaluate = (node: NodeDefinitions.NodeFor<CustomDefinition>, socket: string, context: Resolver.Context): DataTypes.AnyEval | null => {
    const { graphId } = node.payload;
    if (!graphId) return null;

    // Translate cursorData for subgraph boundary crossing
    const { innerCursorData, strippedKeys } = Resolver.translateInward(context.cursorData, node.id);

    // Lazy input resolver: called by Input nodes inside the subgraph with the current cursorData
    const resolveInput = (inputNodeId: string, cursorData: Resolver.CursorData): DataTypes.AnyEval | null => {
        // Translate inner cursorData back to parent-level keys
        const outerCursorData = Resolver.translateOutward(cursorData, strippedKeys, node.id, context.cursorData);

        // Layer group handling
        const layersKey = `layers_${inputNodeId}`;
        if (layersKey in node.payload) {
            const layerEntries = (node.payload as Record<string, unknown>)[layersKey] as { socket: string; enabled: boolean; blend: number }[];

            // Check supersocket first — if connected, use its data directly
            const supersocketEval = context.resolve<"array<layer>">(node.id, inputNodeId, outerCursorData);
            if (supersocketEval) return supersocketEval;

            // Build from individual layer sockets
            const layerData: { shape: DataTypes.TypeOf<"shape"> | null; enabled: boolean | null; blend: number | null }[] = [];
            for (const entry of layerEntries) {
                const resolved = context.resolve(node.id, entry.socket, outerCursorData);
                if (!resolved) {
                    layerData.push({ shape: null, enabled: entry.enabled, blend: entry.blend });
                    continue;
                }
                if (resolved.kind === "layer") {
                    const data = resolved.data;
                    layerData.push({
                        shape: data.shape,
                        enabled: data.enabled ?? entry.enabled,
                        blend: data.blend ?? entry.blend,
                    });
                } else if (resolved.kind === "shape") {
                    layerData.push({
                        shape: resolved.data,
                        enabled: entry.enabled,
                        blend: entry.blend,
                    });
                }
            }
            return { kind: "array<layer>", data: layerData };
        }

        // Path-op group handling
        const pathOpsKey = `pathOps_${inputNodeId}`;
        if (pathOpsKey in node.payload) {
            const pathOpEntries = (node.payload as Record<string, unknown>)[pathOpsKey] as { socket: string; enabled: boolean; op: number }[];

            // Check supersocket first — if connected, use its data directly
            const supersocketEval = context.resolve<"array<pathOp>">(node.id, inputNodeId, outerCursorData);
            if (supersocketEval) return supersocketEval;

            // Build from individual pathOp sockets
            const pathOpData: { path: DataTypes.TypeOf<"path"> | null; enabled: boolean | null; op: number | null }[] = [];
            for (const entry of pathOpEntries) {
                const resolved = context.resolve(node.id, entry.socket, outerCursorData);
                if (!resolved) {
                    pathOpData.push({ path: null, enabled: entry.enabled, op: entry.op });
                    continue;
                }
                if (resolved.kind === "pathOp") {
                    const data = resolved.data;
                    pathOpData.push({
                        path: data.path,
                        enabled: data.enabled ?? entry.enabled,
                        op: data.op ?? entry.op,
                    });
                } else if (resolved.kind === "path") {
                    pathOpData.push({
                        path: resolved.data,
                        enabled: entry.enabled,
                        op: entry.op,
                    });
                }
            }
            return { kind: "array<pathOp>", data: pathOpData };
        }

        // Regular socket: resolve in parent graph with translated cursorData
        const resolved = context.resolve(node.id, inputNodeId, outerCursorData);
        if (resolved) return resolved;

        // Stored value fallback (connected or unsocketed inputs)
        const storedValue = node.payload[`value_${inputNodeId}`];
        if (storedValue !== undefined) {
            const inputNode = context.getNode(graphId, inputNodeId);
            if (inputNode) {
                return storedValueToEval(storedValue, inputNode.type);
            }
        }

        return null;
    };

    // Evaluate just the requested output from the subgraph
    const raw = context.subgraph(graphId, socket, resolveInput, innerCursorData);

    // Remap sequence token senderIds on output
    if (raw?.kind === "sequence") {
        const { senderId, count } = raw.data;
        return { kind: "sequence", data: { senderId: `${node.id}/${senderId}`, count } };
    }
    return raw;
};

const onCreate = (node: NodeDefinitions.NodeFor<CustomDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const targetGraphId = node.payload.graphId;
    if (!targetGraphId) return;

    const interfaceSockets = flattenSockets(ctx.getInterfaces(targetGraphId));

    // Build socket maps and default values from Input/Output nodes
    const inSockets: { [key: string]: string | null } = {};
    const outSockets: { [key: string]: string[] } = {};
    const initialValues: { [key: string]: unknown } = {};
    const subgraphNodes = ctx.getNodesForGraph(targetGraphId);

    for (const entry of interfaceSockets) {
        const parsed = parseInterface(entry);
        if (parsed.direction === "in") {
            const inputNode = subgraphNodes[parsed.nodeId];
            if (inputNode?.type === "arrayLayerInput") {
                // Create supersocket + initial layer group for array<layer> input
                const socketId = `layer_${nanoid()}`;
                inSockets[parsed.nodeId] = null;
                inSockets[socketId] = null;
                initialValues[`layers_${parsed.nodeId}`] = [{ socket: socketId, enabled: true, blend: Enum.Common.blendMode.NORMAL.value }];
            } else if (inputNode?.type === "arrayPathOpInput") {
                // Create supersocket + initial path-op group for array<pathOp> input
                const socketId = `pathop_${nanoid()}`;
                inSockets[parsed.nodeId] = null;
                inSockets[socketId] = null;
                initialValues[`pathOps_${parsed.nodeId}`] = [{ socket: socketId, enabled: true, op: Enum.Common.pathOp.UNIFY.value }];
            } else {
                const socketed = (inputNode?.payload as { socketed?: boolean })?.socketed !== false;
                if (socketed) {
                    inSockets[parsed.nodeId] = null;
                }
                if (inputNode && "initialValue" in inputNode.payload) {
                    initialValues[`value_${parsed.nodeId}`] = inputNode.payload.initialValue;
                }
            }
        } else {
            outSockets[parsed.nodeId] = [];
        }
    }

    ctx.setNode(graphId, node.id, {
        ...node,
        in: inSockets,
        out: outSockets,
        payload: { ...node.payload, ...initialValues },
    });

    // Register this custom node as a user of the target subgraph
    ctx.setUsers(targetGraphId, [...ctx.getUsers(targetGraphId), { node: node.id, scope: graphId }]);
};

const onDelete = (node: NodeDefinitions.NodeFor<CustomDefinition>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const targetGraphId = node.payload.graphId;
    if (!targetGraphId) return;

    ctx.setUsers(
        targetGraphId,
        ctx.getUsers(targetGraphId).filter((u) => !(u.node === node.id && u.scope === graphId)),
    );
};

const onConnect = (node: NodeDefinitions.BuiltNodeOf<"custom", CustomDefinition>, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    if (direction !== "in") return;

    const link = ctx.getLink(graphId, linkId);
    if (!link) return;

    // Check if the connected socket is a supersocket for a layer or path-op group
    const layersKey = `layers_${link.toSocket}`;
    const pathOpsKey = `pathOps_${link.toSocket}`;
    const groupKey = layersKey in node.payload ? layersKey : pathOpsKey in node.payload ? pathOpsKey : null;
    if (!groupKey) return;

    // Collect all link IDs from the group's item sockets
    const currentNode = ctx.getNode(graphId, node.id);
    if (!currentNode) return;
    const groupEntries = (currentNode.payload as Record<string, unknown>)[groupKey] as { socket: string }[];
    const linkIdsToRemove: string[] = [];

    for (const entry of groupEntries) {
        const socketLinkId = currentNode.in[entry.socket];
        if (socketLinkId !== null && socketLinkId !== undefined) {
            linkIdsToRemove.push(socketLinkId);
        }
    }

    if (linkIdsToRemove.length === 0) return;

    // Use high-level removeLinks which fires onDisconnect on endpoints
    ctx.removeLinks(graphId, ...linkIdsToRemove);
};

const INTERFACE_SOCKET_TYPES: Record<string, SocketTypes.Term> = {
    floatInput: SocketTypes.of("float"),
    floatOutput: SocketTypes.of("float"),
    integerInput: SocketTypes.of("integer"),
    integerOutput: SocketTypes.of("integer"),
    angleInput: SocketTypes.of("angle"),
    angleOutput: SocketTypes.of("angle"),
    lengthInput: SocketTypes.of("length"),
    lengthOutput: SocketTypes.of("length"),
    colorInput: SocketTypes.of("color"),
    paintInput: SocketTypes.and("color", "gradient"),
    colorOutput: SocketTypes.of("color"),
    booleanInput: SocketTypes.of("boolean"),
    booleanOutput: SocketTypes.of("boolean"),
    enumInput: SocketTypes.of("enum"),
    enumOutput: SocketTypes.of("enum"),
    stringInput: SocketTypes.of("string"),
    stringOutput: SocketTypes.of("string"),
    tokensLengthInput: SocketTypes.of("tokens:length"),
    tokensLengthOutput: SocketTypes.of("tokens:length"),
    shapeInput: SocketTypes.of("shape"),
    shapeOutput: SocketTypes.of("shape"),
    arrayLayerInput: SocketTypes.of("array<layer>"),
    arrayLayerOutput: SocketTypes.of("array<layer>"),
    arrayPathOpInput: SocketTypes.of("array<pathOp>"),
    arrayPathOpOutput: SocketTypes.of("array<pathOp>"),
    layerInput: SocketTypes.of("layer"),
    layerOutput: SocketTypes.of("layer"),
    pathOpInput: SocketTypes.of("pathOp"),
    pathOpOutput: SocketTypes.of("pathOp"),
    stopColorInput: SocketTypes.of("stop:color"),
    stopColorOutput: SocketTypes.of("stop:color"),
    arrayStopColorInput: SocketTypes.of("array<stop:color>"),
    arrayStopColorOutput: SocketTypes.of("array<stop:color>"),
    stopFloatInput: SocketTypes.of("stop:float"),
    stopFloatOutput: SocketTypes.of("stop:float"),
    arrayStopFloatInput: SocketTypes.of("array<stop:float>"),
    arrayStopFloatOutput: SocketTypes.of("array<stop:float>"),
    stopAngleInput: SocketTypes.of("stop:angle"),
    stopAngleOutput: SocketTypes.of("stop:angle"),
    arrayStopAngleInput: SocketTypes.of("array<stop:angle>"),
    arrayStopAngleOutput: SocketTypes.of("array<stop:angle>"),
    stopIntegerInput: SocketTypes.of("stop:integer"),
    stopIntegerOutput: SocketTypes.of("stop:integer"),
    arrayStopIntegerInput: SocketTypes.of("array<stop:integer>"),
    arrayStopIntegerOutput: SocketTypes.of("array<stop:integer>"),
    stopLengthInput: SocketTypes.of("stop:length"),
    stopLengthOutput: SocketTypes.of("stop:length"),
    arrayStopLengthInput: SocketTypes.of("array<stop:length>"),
    arrayStopLengthOutput: SocketTypes.of("array<stop:length>"),
    distributionInput: SocketTypes.of("distribution"),
    distributionOutput: SocketTypes.of("distribution"),
    sequenceInput: SocketTypes.of("sequence"),
    sequenceOutput: SocketTypes.of("sequence"),
    pathInput: SocketTypes.of("path"),
    pathOutput: SocketTypes.of("path"),
};

const getSocketType = (node: NodeDefinitions.NodeFor<CustomDefinition>, socketId: string, _side: "in" | "out", _graphId: string, ctx: NodeTypes.MethodContext): SocketTypes.Term => {
    const subgraphId = node.payload.graphId;
    if (!subgraphId) return SocketTypes.ANY;

    // Check if this socket belongs to a layer or path-op group
    for (const key of Object.keys(node.payload)) {
        if (key.startsWith("layers_")) {
            const entries = (node.payload as Record<string, unknown>)[key] as { socket: string }[];
            if (entries.some((e) => e.socket === socketId)) return SocketTypes.LAYER_OR_SHAPE;
        } else if (key.startsWith("pathOps_")) {
            const entries = (node.payload as Record<string, unknown>)[key] as { socket: string }[];
            if (entries.some((e) => e.socket === socketId)) return SocketTypes.PATHOP_OR_PATH;
        }
    }

    // Look up the subgraph interface node and map its type
    const subNode = ctx.getNode(subgraphId, socketId);
    if (!subNode) return SocketTypes.ANY;

    return INTERFACE_SOCKET_TYPES[subNode.type] ?? SocketTypes.ANY;
};

export const CustomNodeType: NodeTypes.Type<"custom", CustomDefinition> = {
    type: "custom",
    displayName: "Custom",
    defaultLabel: "Custom",
    iconNode: <NodeIcon shape={NODE_ICONS.user} />,
    flavour: "emphasis",
    category: "Meta",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    onCreate,
    onDelete,
    onConnect,
    getSocketType,
};

type SlotUpdateHandler = (v: Partial<{ [key: StoredValueKey]: DataTypes.TypeOf<DataTypes.Kind> }>) => void;

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
        // Paint Input reuses the Color Input slot UI (identical payload/widget); its socket accepts colour or gradient.
        case "paintInput":
            return <InputSlotColor host={hostNode} source={sourceNode as NodeDefinitions.NodeFor<ColorInputDefinition>} handleValue={handleValue} />;
        case "booleanOutput":
            return <OutputSlotBoolean host={hostNode} source={sourceNode as NodeDefinitions.NodeFor<BooleanOutputDefinition>} />;
        case "booleanInput":
            return <InputSlotBoolean host={hostNode} source={sourceNode as NodeDefinitions.NodeFor<BooleanInputDefinition>} handleValue={handleValue} />;
        case "enumOutput":
            return <OutputSlotEnum host={hostNode} source={sourceNode as NodeDefinitions.NodeFor<EnumOutputDefinition>} />;
        case "enumInput":
            return <InputSlotEnum host={hostNode} source={sourceNode as NodeDefinitions.NodeFor<EnumInputDefinition>} handleValue={handleValue} />;
        case "arrayLayerInput":
            return <InputSlotLayerGroup host={hostNode} source={sourceNode} />;
        case "arrayPathOpInput":
            return <InputSlotPathOpGroup host={hostNode} source={sourceNode} />;
        case "tokensLengthOutput":
            return <OutputSlotTokensLength host={hostNode} source={sourceNode as NodeDefinitions.NodeFor<TokensLengthOutputDefinition>} />;
        case "tokensLengthInput":
            return <InputSlotTokensLength host={hostNode} source={sourceNode as NodeDefinitions.NodeFor<TokensLengthInputDefinition>} handleValue={handleValue} />;
        case "stringOutput":
            return <OutputSlotString host={hostNode} source={sourceNode as NodeDefinitions.NodeFor<StringOutputDefinition>} />;
        case "stringInput":
            return <InputSlotString host={hostNode} source={sourceNode as NodeDefinitions.NodeFor<StringInputDefinition>} handleValue={handleValue} />;
        case "distributionOutput":
            return <OutputSlotDistribution host={hostNode} source={sourceNode} />;
        case "distributionInput":
            return <InputSlotDistribution host={hostNode} source={sourceNode} />;
        case "arrayLayerOutput":
            return <OutputSlotArrayLayer host={hostNode} source={sourceNode} />;
        case "arrayPathOpOutput":
            return <OutputSlotArrayPathOp host={hostNode} source={sourceNode} />;
        case "sequenceInput":
            return <InputSlotSequence host={hostNode} source={sourceNode} />;
        case "sequenceOutput":
            return <OutputSlotSequence host={hostNode} source={sourceNode} />;
        case "pathInput":
            return <InputSlotPath host={hostNode} source={sourceNode} />;
        case "pathOutput":
            return <OutputSlotPath host={hostNode} source={sourceNode} />;
        case "layerInput":
        case "pathOpInput":
        case "stopColorInput":
        case "stopFloatInput":
        case "stopAngleInput":
        case "stopIntegerInput":
        case "stopLengthInput":
        case "arrayStopColorInput":
        case "arrayStopFloatInput":
        case "arrayStopAngleInput":
        case "arrayStopIntegerInput":
        case "arrayStopLengthInput":
            return <InputSlotPassthrough host={hostNode} source={sourceNode} />;
        case "layerOutput":
        case "pathOpOutput":
        case "stopColorOutput":
        case "stopFloatOutput":
        case "stopAngleOutput":
        case "stopIntegerOutput":
        case "stopLengthOutput":
        case "arrayStopColorOutput":
        case "arrayStopFloatOutput":
        case "arrayStopAngleOutput":
        case "arrayStopIntegerOutput":
        case "arrayStopLengthOutput":
            return <OutputSlotPassthrough host={hostNode} source={sourceNode} />;
    }
    return null;
};

type OutputWidgetProps<T extends NodeDefinitions.Any> = { host: NodeDefinitions.NodeFor<CustomDefinition>; source: NodeDefinitions.NodeFor<T> };
type InputWidgetProps<T extends NodeDefinitions.Any> = { host: NodeDefinitions.NodeFor<CustomDefinition>; source: NodeDefinitions.NodeFor<T>; handleValue: SlotUpdateHandler };

const InputSocketOrSlot = ({
    socketed,
    node,
    socketId,
    label,
    children,
}: {
    socketed: boolean;
    node: NodeDefinitions.NodeFor<CustomDefinition>;
    socketId: string;
    label?: string;
    children?: ReactNode;
}) => {
    if (socketed) {
        return (
            <SocketIn node={node} socketId={socketId} label={label}>
                {children}
            </SocketIn>
        );
    }
    return <Slot label={label}>{children}</Slot>;
};

const OutputSlotFloat = ({ host, source }: OutputWidgetProps<FloatOutputDefinition>) => {
    const resolved = Project.useCachedOutput(useGraphId(), host, source.id);
    const output = resolved?.kind === "float" ? Number(NumericString.Emptyable.asNumber(resolved?.data)?.toFixed?.(10)) : "« none »";

    switch (source.payload.widget) {
        case Enum.Common.typicalOutputWidget.NONE.value: {
            return (
                <SocketOut node={host} socketId={source.id}>
                    {interfaceMemberLabel(source)}
                </SocketOut>
            );
        }
        case Enum.Common.typicalOutputWidget.PREVIEW.value: {
            return (
                <SocketOut node={host} socketId={source.id} label={interfaceMemberLabel(source)}>
                    <TextPreview>{output}</TextPreview>
                </SocketOut>
            );
        }
    }
    return null;
};

const InputSlotFloat = ({ host, source, handleValue }: InputWidgetProps<FloatInputDefinition>) => {
    const socketed = source.payload.socketed !== false;
    const label = interfaceMemberLabel(source);
    const disabled = host.in[source.id] != null;

    switch (source.payload.widget) {
        case Enum.Common.numberInputWidget.NONE.value: {
            return (
                <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id}>
                    {label}
                </InputSocketOrSlot>
            );
        }
        case Enum.Common.numberInputWidget.INPUT.value: {
            return (
                <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id} label={label}>
                    <DecimalInput
                        value={host.payload[`value_${source.id}`] as NumericString.Type}
                        onCommit={(v) => handleValue({ [`value_${source.id}`]: v })}
                        disabled={disabled}
                        min={source.payload.min}
                        max={source.payload.max}
                        step={source.payload.step}
                        snap={source.payload.snap}
                        required
                    />
                </InputSocketOrSlot>
            );
        }
        case Enum.Common.numberInputWidget.SLIDER.value: {
            return (
                <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id} label={label}>
                    <DecimalInput.SliderInput
                        value={host.payload[`value_${source.id}`] as NumericString.Type}
                        onCommit={(v) => handleValue({ [`value_${source.id}`]: v })}
                        disabled={disabled}
                        min={source.payload.min ?? "0"}
                        max={source.payload.max ?? "1"}
                        step={source.payload.step ?? "0.01"}
                        snap={source.payload.snap}
                    />
                </InputSocketOrSlot>
            );
        }
    }

    return null;
};

const OutputSlotInteger = ({ host, source }: OutputWidgetProps<IntegerOutputDefinition>) => {
    const resolved = Project.useCachedOutput(useGraphId(), host, source.id);
    const output = resolved?.kind === "integer" ? (NumericString.Emptyable.asNumber(resolved?.data)?.toFixed?.(0) ?? "« none »") : "« none »";

    switch (source.payload.widget) {
        case Enum.Common.typicalOutputWidget.NONE.value: {
            return (
                <SocketOut node={host} socketId={source.id}>
                    {interfaceMemberLabel(source)}
                </SocketOut>
            );
        }
        case Enum.Common.typicalOutputWidget.PREVIEW.value: {
            return (
                <SocketOut node={host} socketId={source.id} label={interfaceMemberLabel(source)}>
                    <TextPreview>{output}</TextPreview>
                </SocketOut>
            );
        }
    }
    return null;
};

const InputSlotInteger = ({ host, source, handleValue }: InputWidgetProps<IntegerInputDefinition>) => {
    const socketed = source.payload.socketed !== false;
    const label = interfaceMemberLabel(source);
    const disabled = host.in[source.id] != null;

    switch (source.payload.widget) {
        case Enum.Common.numberInputWidget.NONE.value: {
            return (
                <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id}>
                    {label}
                </InputSocketOrSlot>
            );
        }
        case Enum.Common.numberInputWidget.INPUT.value: {
            return (
                <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id} label={label}>
                    <IntegerInput
                        value={host.payload[`value_${source.id}`] as NumericString.Type}
                        onCommit={(v) => handleValue({ [`value_${source.id}`]: v })}
                        disabled={disabled}
                        min={source.payload.min}
                        max={source.payload.max}
                        step={source.payload.step}
                        snap={source.payload.snap}
                        required
                    />
                </InputSocketOrSlot>
            );
        }
        case Enum.Common.numberInputWidget.SLIDER.value: {
            return (
                <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id} label={label}>
                    <IntegerInput.SliderInput
                        value={host.payload[`value_${source.id}`] as NumericString.Type}
                        onCommit={(v) => handleValue({ [`value_${source.id}`]: v })}
                        disabled={disabled}
                        min={source.payload.min ?? "0"}
                        max={source.payload.max ?? "100"}
                        step={source.payload.step ?? "1"}
                        snap={source.payload.snap}
                    />
                </InputSocketOrSlot>
            );
        }
    }
    return null;
};

const OutputSlotAngle = ({ host, source }: OutputWidgetProps<AngleOutputDefinition>) => {
    const resolved = Project.useCachedOutput(useGraphId(), host, source.id);
    const output = resolved?.kind === "angle" ? `${Number(NumericString.Emptyable.asNumber(resolved?.data)?.toFixed?.(2))}°` : "« none »";

    switch (source.payload.widget) {
        case Enum.Common.typicalOutputWidget.NONE.value: {
            return (
                <SocketOut node={host} socketId={source.id}>
                    {interfaceMemberLabel(source)}
                </SocketOut>
            );
        }
        case Enum.Common.typicalOutputWidget.PREVIEW.value: {
            return (
                <SocketOut node={host} socketId={source.id} label={interfaceMemberLabel(source)}>
                    <TextPreview>{output}</TextPreview>
                </SocketOut>
            );
        }
    }
    return null;
};

const InputSlotAngle = ({ host, source, handleValue }: InputWidgetProps<AngleInputDefinition>) => {
    const socketed = source.payload.socketed !== false;
    const label = interfaceMemberLabel(source);
    const disabled = host.in[source.id] != null;

    switch (source.payload.widget) {
        case Enum.Common.numberInputWidget.NONE.value: {
            return (
                <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id}>
                    {label}
                </InputSocketOrSlot>
            );
        }
        case Enum.Common.numberInputWidget.INPUT.value: {
            return (
                <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id} label={label}>
                    <AngleInput
                        value={host.payload[`value_${source.id}`] as Angle.Type}
                        onCommit={(v) => handleValue({ [`value_${source.id}`]: v })}
                        disabled={disabled}
                        unbound={!source.payload.wraps}
                    />
                </InputSocketOrSlot>
            );
        }
        case Enum.Common.numberInputWidget.SLIDER.value: {
            return (
                <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id} label={label}>
                    <AngleInput.SliderInput
                        value={host.payload[`value_${source.id}`] as Angle.Type}
                        onCommit={(v) => handleValue({ [`value_${source.id}`]: v })}
                        disabled={disabled}
                        min={source.payload.min}
                        max={source.payload.max}
                        step={source.payload.step}
                        snap={source.payload.snap}
                        unbound={!source.payload.wraps}
                    />
                </InputSocketOrSlot>
            );
        }
    }
    return null;
};

const OutputSlotLength = ({ host, source }: OutputWidgetProps<LengthOutputDefinition>) => {
    const resolved = Project.useCachedOutput(useGraphId(), host, source.id);
    const output = resolved?.kind === "length" ? resolved.data : "« none »";

    switch (source.payload.widget) {
        case Enum.Common.typicalOutputWidget.NONE.value: {
            return (
                <SocketOut node={host} socketId={source.id}>
                    {interfaceMemberLabel(source)}
                </SocketOut>
            );
        }
        case Enum.Common.typicalOutputWidget.PREVIEW.value: {
            return (
                <SocketOut node={host} socketId={source.id} label={interfaceMemberLabel(source)}>
                    <TextPreview>{output}</TextPreview>
                </SocketOut>
            );
        }
    }
    return null;
};

const InputSlotLength = ({ host, source, handleValue }: InputWidgetProps<LengthInputDefinition>) => {
    const socketed = source.payload.socketed !== false;
    const label = interfaceMemberLabel(source);
    const disabled = host.in[source.id] != null;

    switch (source.payload.widget) {
        case Enum.Common.lengthInputWidget.NONE.value: {
            return (
                <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id}>
                    {label}
                </InputSocketOrSlot>
            );
        }
        case Enum.Common.lengthInputWidget.INPUT.value: {
            return (
                <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id} label={label}>
                    <LengthInput value={host.payload[`value_${source.id}`] as Length.Type} onCommit={(v) => handleValue({ [`value_${source.id}`]: v })} disabled={disabled} />
                </InputSocketOrSlot>
            );
        }
    }
    return null;
};

const OutputSlotShape = ({ host, source }: OutputWidgetProps<ShapeOutputDefinition>) => {
    const resolved = Project.useCachedOutput(useGraphId(), host, source.id);
    const svgObject = resolved?.kind === "shape" ? resolved.data : null;

    switch (source.payload.widget) {
        case Enum.Common.typicalOutputWidget.NONE.value: {
            return (
                <SocketOut node={host} socketId={source.id}>
                    {interfaceMemberLabel(source)}
                </SocketOut>
            );
        }
        case Enum.Common.typicalOutputWidget.PREVIEW.value: {
            return (
                <>
                    <SocketOut node={host} socketId={source.id}>
                        {interfaceMemberLabel(source)}
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
        <SocketIn node={host} socketId={source.id}>
            {interfaceMemberLabel(source)}
        </SocketIn>
    );
};

const OutputSlotColor = ({ host, source }: OutputWidgetProps<ColorOutputDefinition>) => {
    const resolved = Project.useCachedOutput(useGraphId(), host, source.id);
    const output = resolved?.kind === "color" ? Color.toHex(resolved.data) : "« none »";

    switch (source.payload.widget) {
        case Enum.Common.typicalOutputWidget.NONE.value: {
            return (
                <SocketOut node={host} socketId={source.id}>
                    {interfaceMemberLabel(source)}
                </SocketOut>
            );
        }
        case Enum.Common.typicalOutputWidget.PREVIEW.value: {
            return (
                <SocketOut node={host} socketId={source.id} label={interfaceMemberLabel(source)}>
                    <TextPreview>{output}</TextPreview>
                </SocketOut>
            );
        }
    }
    return null;
};

const InputSlotColor = ({ host, source, handleValue }: InputWidgetProps<ColorInputDefinition>) => {
    const socketed = source.payload.socketed !== false;
    const label = interfaceMemberLabel(source);
    const disabled = host.in[source.id] != null;

    switch (source.payload.widget) {
        case Enum.Common.colorInputWidget.NONE.value: {
            return (
                <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id}>
                    {label}
                </InputSocketOrSlot>
            );
        }
        case Enum.Common.colorInputWidget.HEX.value: {
            return (
                <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id} label={label}>
                    <ColorHexInput
                        value={host.payload[`value_${source.id}`] as Color.Type}
                        onCommit={(v) => handleValue({ [`value_${source.id}`]: v })}
                        disabled={disabled}
                        alpha={source.payload.alpha}
                        required={source.payload.required}
                    />
                </InputSocketOrSlot>
            );
        }
    }
    return null;
};

const OutputSlotBoolean = ({ host, source }: OutputWidgetProps<BooleanOutputDefinition>) => {
    const resolved = Project.useCachedOutput(useGraphId(), host, source.id);
    const output = resolved?.kind === "boolean" ? (resolved.data ? "True" : "False") : "« none »";

    switch (source.payload.widget) {
        case Enum.Common.typicalOutputWidget.NONE.value: {
            return (
                <SocketOut node={host} socketId={source.id}>
                    {interfaceMemberLabel(source)}
                </SocketOut>
            );
        }
        case Enum.Common.typicalOutputWidget.PREVIEW.value: {
            return (
                <SocketOut node={host} socketId={source.id} label={interfaceMemberLabel(source)}>
                    <TextPreview>{output}</TextPreview>
                </SocketOut>
            );
        }
    }
    return null;
};

const InputSlotBoolean = ({ host, source, handleValue }: InputWidgetProps<BooleanInputDefinition>) => {
    const socketed = source.payload.socketed !== false;
    const label = interfaceMemberLabel(source);
    const disabled = host.in[source.id] != null;

    switch (source.payload.widget) {
        case Enum.Common.booleanInputWidget.NONE.value: {
            return (
                <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id}>
                    {label}
                </InputSocketOrSlot>
            );
        }
        case Enum.Common.booleanInputWidget.CHECKBOX.value: {
            return (
                <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id} label={label}>
                    <CheckBox checked={host.payload[`value_${source.id}`] as boolean} onToggle={(v) => handleValue({ [`value_${source.id}`]: v })} disabled={disabled}>
                        {source.payload.text || "Enabled"}
                    </CheckBox>
                </InputSocketOrSlot>
            );
        }
        case Enum.Common.booleanInputWidget.CHECKBUTTON.value: {
            return (
                <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id} label={label}>
                    <CheckButton checked={host.payload[`value_${source.id}`] as boolean} onToggle={(v) => handleValue({ [`value_${source.id}`]: v })} disabled={disabled}>
                        {source.payload.text || "Enabled"}
                    </CheckButton>
                </InputSocketOrSlot>
            );
        }
    }
};

const OutputSlotEnum = ({ host, source }: OutputWidgetProps<EnumOutputDefinition>) => {
    const resolved = Project.useCachedOutput(useGraphId(), host, source.id);
    const output = resolved?.kind === "enum" ? `${resolved.data}` : "« none »";

    switch (source.payload.widget) {
        case Enum.Common.typicalOutputWidget.NONE.value: {
            return (
                <SocketOut node={host} socketId={source.id}>
                    {interfaceMemberLabel(source)}
                </SocketOut>
            );
        }
        case Enum.Common.typicalOutputWidget.PREVIEW.value: {
            return (
                <SocketOut node={host} socketId={source.id} label={interfaceMemberLabel(source)}>
                    <TextPreview>{output}</TextPreview>
                </SocketOut>
            );
        }
    }
    return null;
};

const InputSlotEnum = ({ host, source, handleValue }: InputWidgetProps<EnumInputDefinition>) => {
    const socketed = source.payload.socketed !== false;
    const options = source.payload.options ?? [];
    const enumOptions = options.map((label, i) => ({ value: `${i}`, label }));
    const label = interfaceMemberLabel(source);
    const value = `${host.payload[`value_${source.id}`] as number}`;
    const onValue = (v: string) => handleValue({ [`value_${source.id}`]: Number(v) });
    const disabled = host.in[source.id] != null;

    switch (source.payload.widget) {
        case Enum.Common.enumInputWidget.NONE.value: {
            return (
                <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id}>
                    {label}
                </InputSocketOrSlot>
            );
        }
        case Enum.Common.enumInputWidget.DROPDOWN.value: {
            return (
                <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id} label={label}>
                    <Dropdown value={value} onValue={onValue} disabled={disabled}>
                        {options.map((opt, i) => (
                            <option value={i} key={i}>
                                {opt}
                            </option>
                        ))}
                    </Dropdown>
                </InputSocketOrSlot>
            );
        }
        case Enum.Common.enumInputWidget.HORIZONTAL_RADIO_BUTTON.value:
        case Enum.Common.enumInputWidget.VERTICAL_RADIO_BUTTON.value: {
            return (
                <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id} label={label}>
                    <RadioButton.Group
                        value={value}
                        onValue={onValue}
                        options={enumOptions}
                        orientation={source.payload.widget === Enum.Common.enumInputWidget.HORIZONTAL_RADIO_BUTTON.value ? "horizontal" : "vertical"}
                        disabled={disabled}
                    />
                </InputSocketOrSlot>
            );
        }
        case Enum.Common.enumInputWidget.HORIZONTAL_RADIO_BOX.value:
        case Enum.Common.enumInputWidget.VERTICAL_RADIO_BOX.value: {
            return (
                <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id} label={label}>
                    <RadioBox.Group
                        value={value}
                        onValue={onValue}
                        options={enumOptions}
                        orientation={source.payload.widget === Enum.Common.enumInputWidget.HORIZONTAL_RADIO_BOX.value ? "horizontal" : "vertical"}
                        disabled={disabled}
                    />
                </InputSocketOrSlot>
            );
        }
    }
    return null;
};

const OutputSlotTokensLength = ({ host, source }: OutputWidgetProps<TokensLengthOutputDefinition>) => {
    const resolved = Project.useCachedOutput(useGraphId(), host, source.id);
    const output = resolved?.kind === "tokens:length" ? resolved.data : "« none »";

    switch (source.payload.widget) {
        case Enum.Common.typicalOutputWidget.NONE.value: {
            return (
                <SocketOut node={host} socketId={source.id}>
                    {interfaceMemberLabel(source)}
                </SocketOut>
            );
        }
        case Enum.Common.typicalOutputWidget.PREVIEW.value: {
            return (
                <SocketOut node={host} socketId={source.id} label={interfaceMemberLabel(source)}>
                    <TextPreview>{output}</TextPreview>
                </SocketOut>
            );
        }
    }
    return null;
};

const InputSlotTokensLength = ({ host, source, handleValue }: InputWidgetProps<TokensLengthInputDefinition>) => {
    const socketed = source.payload.socketed !== false;
    const label = interfaceMemberLabel(source);
    const disabled = host.in[source.id] != null;

    return (
        <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id} label={label}>
            <TextInput value={host.payload[`value_${source.id}`] as string} onCommit={(v) => handleValue({ [`value_${source.id}`]: v })} disabled={disabled} placeholder="e.g. 5px 10px" />
        </InputSocketOrSlot>
    );
};

const OutputSlotString = ({ host, source }: OutputWidgetProps<StringOutputDefinition>) => {
    const resolved = Project.useCachedOutput(useGraphId(), host, source.id);
    const output = resolved?.kind === "string" ? resolved.data : "« none »";

    switch (source.payload.widget) {
        case Enum.Common.typicalOutputWidget.NONE.value: {
            return (
                <SocketOut node={host} socketId={source.id}>
                    {interfaceMemberLabel(source)}
                </SocketOut>
            );
        }
        case Enum.Common.typicalOutputWidget.PREVIEW.value: {
            return (
                <SocketOut node={host} socketId={source.id} label={interfaceMemberLabel(source)}>
                    <TextPreview>{output}</TextPreview>
                </SocketOut>
            );
        }
    }
    return null;
};

const InputSlotString = ({ host, source, handleValue }: InputWidgetProps<StringInputDefinition>) => {
    const socketed = source.payload.socketed !== false;
    const label = interfaceMemberLabel(source);
    const disabled = host.in[source.id] != null;
    const value = host.payload[`value_${source.id}`] as string;
    const onCommit = (v: string) => handleValue({ [`value_${source.id}`]: v });

    switch (source.payload.widget) {
        case Enum.Common.stringInputWidget.NONE.value:
            return (
                <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id}>
                    {label}
                </InputSocketOrSlot>
            );
        case Enum.Common.stringInputWidget.LINE.value:
            return (
                <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id} label={label}>
                    <TextInput value={value} onCommit={onCommit} disabled={disabled} />
                </InputSocketOrSlot>
            );
        case Enum.Common.stringInputWidget.BLOCK_MODAL.value:
            return (
                <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id} label={label}>
                    <BlockInput.WithModal value={value} onCommit={onCommit} disabled={disabled} title={label} />
                </InputSocketOrSlot>
            );
        case Enum.Common.stringInputWidget.MODAL.value:
            return (
                <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id} label={label}>
                    <BlockInput.Modal value={value} onCommit={onCommit} disabled={disabled} title={label} />
                </InputSocketOrSlot>
            );
        case Enum.Common.stringInputWidget.BLOCK.value:
        default:
            return (
                <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id} label={label}>
                    <BlockInput value={value} onCommit={onCommit} disabled={disabled} />
                </InputSocketOrSlot>
            );
    }
};

const InputSlotDistribution = ({ host, source }: { host: NodeDefinitions.NodeFor<CustomDefinition>; source: NodeDefinitions.NodeFor<NodeDefinitions.Any> }) => {
    return (
        <SocketIn node={host} socketId={source.id}>
            {interfaceMemberLabel(source)}
        </SocketIn>
    );
};

const OutputSlotDistribution = ({ host, source }: { host: NodeDefinitions.NodeFor<CustomDefinition>; source: NodeDefinitions.NodeFor<NodeDefinitions.Any> }) => {
    return (
        <SocketOut node={host} socketId={source.id}>
            {interfaceMemberLabel(source)}
        </SocketOut>
    );
};

const OutputSlotArrayLayer = ({ host, source }: { host: NodeDefinitions.NodeFor<CustomDefinition>; source: NodeDefinitions.NodeFor<NodeDefinitions.Any> }) => {
    return (
        <SocketOut node={host} socketId={source.id}>
            {interfaceMemberLabel(source)}
        </SocketOut>
    );
};

const InputSlotSequence = ({ host, source }: { host: NodeDefinitions.NodeFor<CustomDefinition>; source: NodeDefinitions.NodeFor<NodeDefinitions.Any> }) => {
    return (
        <SocketIn node={host} socketId={source.id}>
            {interfaceMemberLabel(source)}
        </SocketIn>
    );
};

const OutputSlotSequence = ({ host, source }: { host: NodeDefinitions.NodeFor<CustomDefinition>; source: NodeDefinitions.NodeFor<NodeDefinitions.Any> }) => {
    return (
        <SocketOut node={host} socketId={source.id}>
            {interfaceMemberLabel(source)}
        </SocketOut>
    );
};

const InputSlotPath = ({ host, source }: { host: NodeDefinitions.NodeFor<CustomDefinition>; source: NodeDefinitions.NodeFor<NodeDefinitions.Any> }) => {
    return (
        <SocketIn node={host} socketId={source.id}>
            {interfaceMemberLabel(source)}
        </SocketIn>
    );
};

const OutputSlotPath = ({ host, source }: { host: NodeDefinitions.NodeFor<CustomDefinition>; source: NodeDefinitions.NodeFor<NodeDefinitions.Any> }) => {
    return (
        <SocketOut node={host} socketId={source.id}>
            {interfaceMemberLabel(source)}
        </SocketOut>
    );
};

// Label-only slots for pass-through interface types (layer, pathOp, stop:*, array<stop:*>) — no inline editor.
const InputSlotPassthrough = ({ host, source }: { host: NodeDefinitions.NodeFor<CustomDefinition>; source: NodeDefinitions.NodeFor<NodeDefinitions.Any> }) => {
    return (
        <SocketIn node={host} socketId={source.id}>
            {interfaceMemberLabel(source)}
        </SocketIn>
    );
};

const OutputSlotPassthrough = ({ host, source }: { host: NodeDefinitions.NodeFor<CustomDefinition>; source: NodeDefinitions.NodeFor<NodeDefinitions.Any> }) => {
    return (
        <SocketOut node={host} socketId={source.id}>
            {interfaceMemberLabel(source)}
        </SocketOut>
    );
};

const BLEND_MODE_OPTIONS = Enum.options(Enum.Common.blendMode);
const LAYER_MIME = "application/x-custom-layer-socket";

const InputSlotLayerGroup = ({ host, source }: { host: NodeDefinitions.NodeFor<CustomDefinition>; source: NodeDefinitions.NodeFor<NodeDefinitions.Any> }) => {
    const { alterNode, removeLinks } = Project.useMethods();
    const label = ((source.payload as { label?: string }).label ?? "") === "" ? "Layers" : (source.payload as { label?: string }).label;
    const layerEntries = ((host.payload as Record<string, unknown>)[`layers_${source.id}`] ?? []) as { socket: string; enabled: boolean; blend: number }[];
    const supersocketConnected = host.in[source.id] !== null;

    const handleAddLayer = useCallback(() => {
        const socketId = `layer_${nanoid()}`;
        alterNode(host.id, (n) => ({
            ...n,
            in: { ...n.in, [socketId]: null },
            payload: {
                ...n.payload,
                [`layers_${source.id}`]: [
                    ...((n.payload as Record<string, unknown>)[`layers_${source.id}`] as { socket: string; enabled: boolean; blend: number }[]),
                    { socket: socketId, enabled: true, blend: Enum.Common.blendMode.NORMAL.value },
                ],
            },
        }));
    }, [alterNode, host.id, source.id]);

    const handleRemoveLayer = useCallback(
        (socket: string) => {
            const linkId = host.in[socket];
            if (linkId) {
                removeLinks(linkId);
            }
            alterNode(host.id, (n) => {
                const { [socket]: _, ...restIn } = n.in;
                return {
                    ...n,
                    in: restIn,
                    payload: {
                        ...n.payload,
                        [`layers_${source.id}`]: ((n.payload as Record<string, unknown>)[`layers_${source.id}`] as { socket: string; enabled: boolean; blend: number }[]).filter(
                            (l) => l.socket !== socket,
                        ),
                    },
                };
            });
        },
        [alterNode, removeLinks, host.id, host.in, source.id],
    );

    const handleLayerUpdate = useCallback(
        (socket: string, update: Partial<{ enabled: boolean; blend: number }>) => {
            alterNode(host.id, (n) => ({
                ...n,
                payload: {
                    ...n.payload,
                    [`layers_${source.id}`]: ((n.payload as Record<string, unknown>)[`layers_${source.id}`] as { socket: string; enabled: boolean; blend: number }[]).map((l) =>
                        l.socket === socket ? { ...l, ...update } : l,
                    ),
                },
            }));
        },
        [alterNode, host.id, source.id],
    );

    const handleReorderLayer = useCallback(
        (socketId: string, toIndex: number) => {
            alterNode(host.id, (n) => {
                const layers = [...((n.payload as Record<string, unknown>)[`layers_${source.id}`] as { socket: string; enabled: boolean; blend: number }[])];
                const fromIndex = layers.findIndex((l) => l.socket === socketId);
                if (fromIndex === -1 || fromIndex === toIndex) return n;
                const [entry] = layers.splice(fromIndex, 1);
                layers.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, entry);
                return {
                    ...n,
                    payload: { ...n.payload, [`layers_${source.id}`]: layers },
                };
            });
        },
        [alterNode, host.id, source.id],
    );

    return (
        <>
            <SocketIn node={host} socketId={source.id}>
                {label}
            </SocketIn>
            {supersocketConnected ? null : (
                <>
                    <ActionButton onClick={handleAddLayer} flavour={"accent"}>
                        Add Layer
                    </ActionButton>
                    {layerEntries.map((entry, idx) => (
                        <LayerGroupEntry
                            key={entry.socket}
                            entry={entry}
                            host={host}
                            index={idx}
                            handleRemoveLayer={handleRemoveLayer}
                            handleLayerUpdate={handleLayerUpdate}
                            handleReorderLayer={handleReorderLayer}
                        />
                    ))}
                </>
            )}
        </>
    );
};

const LayerGroupEntry = ({
    entry,
    host,
    index,
    handleLayerUpdate,
    handleRemoveLayer,
    handleReorderLayer,
}: {
    entry: { socket: string; enabled: boolean; blend: number };
    host: NodeDefinitions.NodeFor<CustomDefinition>;
    index: number;
    handleRemoveLayer: (socket: string) => void;
    handleLayerUpdate: (socket: string, update: Partial<{ enabled: boolean; blend: number }>) => void;
    handleReorderLayer: (socketId: string, toIndex: number) => void;
}) => {
    const theLink = Project.useLink(host.in[entry.socket]);
    const linkType = Project.useLinkType(useGraphId(), theLink);
    const [dropSide, setDropSide] = useState<"above" | "below" | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    const handleDragStart = useCallback(
        (e: DragEvent) => {
            e.dataTransfer.setDragImage(ref.current as Element, 0, 0);
            e.dataTransfer.setData(LAYER_MIME, entry.socket);
            e.dataTransfer.effectAllowed = "move";
        },
        [entry.socket],
    );

    const handleDragOver = useCallback((e: DragEvent) => {
        if (!e.dataTransfer.types.includes(LAYER_MIME)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const rect = ref.current?.getBoundingClientRect();
        if (rect) {
            setDropSide(e.clientY < rect.top + rect.height / 2 ? "above" : "below");
        }
    }, []);

    const handleDragLeave = useCallback(() => {
        setDropSide(null);
    }, []);

    const handleDrop = useCallback(
        (e: DragEvent) => {
            const socketId = e.dataTransfer.getData(LAYER_MIME);
            if (socketId) {
                e.preventDefault();
                handleReorderLayer(socketId, dropSide === "below" ? index + 1 : index);
            }
            setDropSide(null);
        },
        [handleReorderLayer, index, dropSide],
    );

    const handleDragEnd = useCallback(() => {
        setDropSide(null);
    }, []);

    return (
        <LayerEntryWrapper ref={ref} data-state={dropSide ? `drop-${dropSide}` : undefined} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onDragEnd={handleDragEnd}>
            <SocketIn node={host} socketId={entry.socket}>
                <CheckBox checked={entry.enabled} onToggle={(enabled) => handleLayerUpdate(entry.socket, { enabled })} disabled={linkType === "layer"} />
                <Dropdown value={`${entry.blend}`} onValue={(v) => handleLayerUpdate(entry.socket, { blend: Number(v) })} disabled={linkType === "layer"}>
                    {BLEND_MODE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </Dropdown>
                <DragGrip draggable onDragStart={handleDragStart}>
                    <Icon shape={ICONS.Caret.Vertical} />
                </DragGrip>
                <ActionButton.Lite onClick={() => handleRemoveLayer(entry.socket)} flavour={"danger"}>
                    <Icon shape={ICONS.Close} />
                </ActionButton.Lite>
            </SocketIn>
        </LayerEntryWrapper>
    );
};

const LayerEntryWrapper = styled.div`
    position: relative;

    &[data-state="drop-above"]::before,
    &[data-state="drop-below"]::after {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        height: 2px;
        background: var(--flavour, #88f);
        pointer-events: none;
        z-index: 1;
    }
    &[data-state="drop-above"]::before {
        top: -1px;
    }
    &[data-state="drop-below"]::after {
        bottom: -1px;
    }
`;

const DragGrip = styled.div`
    cursor: grab;
    opacity: 0.4;
    display: grid;
    place-items: center;

    &:active {
        cursor: grabbing;
    }
    &:hover {
        opacity: 0.8;
    }
`;

const TextPreview = styled.div`
    text-align: center;
    font-size: 15pt;
    padding: 2px;
    background: #222;
    border: 1px solid #666;
    flex: 1 1 auto;
`;

const PATHOP_OPTIONS = Enum.options(Enum.Common.pathOp);
const PATHOP_MIME = "application/x-custom-pathop-socket";

const OutputSlotArrayPathOp = ({ host, source }: { host: NodeDefinitions.NodeFor<CustomDefinition>; source: NodeDefinitions.NodeFor<NodeDefinitions.Any> }) => {
    return (
        <SocketOut node={host} socketId={source.id}>
            {interfaceMemberLabel(source)}
        </SocketOut>
    );
};

const InputSlotPathOpGroup = ({ host, source }: { host: NodeDefinitions.NodeFor<CustomDefinition>; source: NodeDefinitions.NodeFor<NodeDefinitions.Any> }) => {
    const { alterNode, removeLinks } = Project.useMethods();
    const label = ((source.payload as { label?: string }).label ?? "") === "" ? "Path Ops" : (source.payload as { label?: string }).label;
    const pathOpEntries = ((host.payload as Record<string, unknown>)[`pathOps_${source.id}`] ?? []) as { socket: string; enabled: boolean; op: number }[];
    const supersocketConnected = host.in[source.id] !== null;

    const handleAddPathOp = useCallback(() => {
        const socketId = `pathop_${nanoid()}`;
        alterNode(host.id, (n) => ({
            ...n,
            in: { ...n.in, [socketId]: null },
            payload: {
                ...n.payload,
                [`pathOps_${source.id}`]: [
                    ...((n.payload as Record<string, unknown>)[`pathOps_${source.id}`] as { socket: string; enabled: boolean; op: number }[]),
                    { socket: socketId, enabled: true, op: Enum.Common.pathOp.UNIFY.value },
                ],
            },
        }));
    }, [alterNode, host.id, source.id]);

    const handleRemovePathOp = useCallback(
        (socket: string) => {
            const linkId = host.in[socket];
            if (linkId) {
                removeLinks(linkId);
            }
            alterNode(host.id, (n) => {
                const { [socket]: _, ...restIn } = n.in;
                return {
                    ...n,
                    in: restIn,
                    payload: {
                        ...n.payload,
                        [`pathOps_${source.id}`]: ((n.payload as Record<string, unknown>)[`pathOps_${source.id}`] as { socket: string; enabled: boolean; op: number }[]).filter(
                            (p) => p.socket !== socket,
                        ),
                    },
                };
            });
        },
        [alterNode, removeLinks, host.id, host.in, source.id],
    );

    const handlePathOpUpdate = useCallback(
        (socket: string, update: Partial<{ enabled: boolean; op: number }>) => {
            alterNode(host.id, (n) => ({
                ...n,
                payload: {
                    ...n.payload,
                    [`pathOps_${source.id}`]: ((n.payload as Record<string, unknown>)[`pathOps_${source.id}`] as { socket: string; enabled: boolean; op: number }[]).map((p) =>
                        p.socket === socket ? { ...p, ...update } : p,
                    ),
                },
            }));
        },
        [alterNode, host.id, source.id],
    );

    const handleReorderPathOp = useCallback(
        (socketId: string, toIndex: number) => {
            alterNode(host.id, (n) => {
                const pathOps = [...((n.payload as Record<string, unknown>)[`pathOps_${source.id}`] as { socket: string; enabled: boolean; op: number }[])];
                const fromIndex = pathOps.findIndex((p) => p.socket === socketId);
                if (fromIndex === -1 || fromIndex === toIndex) return n;
                const [entry] = pathOps.splice(fromIndex, 1);
                pathOps.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, entry);
                return {
                    ...n,
                    payload: { ...n.payload, [`pathOps_${source.id}`]: pathOps },
                };
            });
        },
        [alterNode, host.id, source.id],
    );

    return (
        <>
            <SocketIn node={host} socketId={source.id}>
                {label}
            </SocketIn>
            {supersocketConnected ? null : (
                <>
                    <ActionButton onClick={handleAddPathOp} flavour={"accent"}>
                        Add Path
                    </ActionButton>
                    {pathOpEntries.map((entry, idx) => (
                        <PathOpGroupEntry
                            key={entry.socket}
                            entry={entry}
                            host={host}
                            index={idx}
                            handleRemovePathOp={handleRemovePathOp}
                            handlePathOpUpdate={handlePathOpUpdate}
                            handleReorderPathOp={handleReorderPathOp}
                        />
                    ))}
                </>
            )}
        </>
    );
};

const PathOpGroupEntry = ({
    entry,
    host,
    index,
    handlePathOpUpdate,
    handleRemovePathOp,
    handleReorderPathOp,
}: {
    entry: { socket: string; enabled: boolean; op: number };
    host: NodeDefinitions.NodeFor<CustomDefinition>;
    index: number;
    handleRemovePathOp: (socket: string) => void;
    handlePathOpUpdate: (socket: string, update: Partial<{ enabled: boolean; op: number }>) => void;
    handleReorderPathOp: (socketId: string, toIndex: number) => void;
}) => {
    const theLink = Project.useLink(host.in[entry.socket]);
    const linkType = Project.useLinkType(useGraphId(), theLink);
    const [dropSide, setDropSide] = useState<"above" | "below" | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    // A connected pathOp carries its own op/enabled, so freeze the row's controls.
    const overridden = linkType === "pathOp";

    const handleDragStart = useCallback(
        (e: DragEvent) => {
            e.dataTransfer.setDragImage(ref.current as Element, 0, 0);
            e.dataTransfer.setData(PATHOP_MIME, entry.socket);
            e.dataTransfer.effectAllowed = "move";
        },
        [entry.socket],
    );

    const handleDragOver = useCallback((e: DragEvent) => {
        if (!e.dataTransfer.types.includes(PATHOP_MIME)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const rect = ref.current?.getBoundingClientRect();
        if (rect) {
            setDropSide(e.clientY < rect.top + rect.height / 2 ? "above" : "below");
        }
    }, []);

    const handleDragLeave = useCallback(() => {
        setDropSide(null);
    }, []);

    const handleDrop = useCallback(
        (e: DragEvent) => {
            const socketId = e.dataTransfer.getData(PATHOP_MIME);
            if (socketId) {
                e.preventDefault();
                handleReorderPathOp(socketId, dropSide === "below" ? index + 1 : index);
            }
            setDropSide(null);
        },
        [handleReorderPathOp, index, dropSide],
    );

    const handleDragEnd = useCallback(() => {
        setDropSide(null);
    }, []);

    return (
        <LayerEntryWrapper ref={ref} data-state={dropSide ? `drop-${dropSide}` : undefined} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onDragEnd={handleDragEnd}>
            <SocketIn node={host} socketId={entry.socket}>
                <CheckBox checked={entry.enabled} onToggle={(enabled) => handlePathOpUpdate(entry.socket, { enabled })} disabled={overridden} />
                <Dropdown value={`${entry.op}`} onValue={(v) => handlePathOpUpdate(entry.socket, { op: Number(v) })} disabled={overridden}>
                    {PATHOP_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </Dropdown>
                <DragGrip draggable onDragStart={handleDragStart}>
                    <Icon shape={ICONS.Caret.Vertical} />
                </DragGrip>
                <ActionButton.Lite onClick={() => handleRemovePathOp(entry.socket)} flavour={"danger"}>
                    <Icon shape={ICONS.Close} />
                </ActionButton.Lite>
            </SocketIn>
        </LayerEntryWrapper>
    );
};
