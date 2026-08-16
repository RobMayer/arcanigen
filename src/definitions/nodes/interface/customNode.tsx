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
import { PointInputDefinition } from "./inputs/pointInputNode";
import { PointOutputDefinition } from "./outputs/pointOutputNode";
import { BooleanInputDefinition } from "./inputs/booleanInputNode";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { ColorHexInput } from "../../../components/inputs/ColorHexInput";
import { PointInput } from "../../../components/inputs/PointInput";
import { PointHelper } from "../../helpers/pointHelper";
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
import { buildInputSocketPatch, arrayGroupKey, makeArrayGroupEntry, ArrayGroupEntry as ArrayGroupEntryData, ARRAY_GROUP_PAYLOAD_PREFIXES } from "../../helpers/interfaceHelper";
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

    // Expand Dynamic List groups: replace the input node id with the supersocket + all its element socket names.
    const expanded: string[] = [];
    for (const dep of rawDeps) {
        const groupKey = ARRAY_GROUP_PAYLOAD_PREFIXES.map((p) => `${p}${dep}`).find((k) => k in node.payload);
        if (groupKey) {
            const entries = (node.payload as Record<string, unknown>)[groupKey] as { socket: string }[];
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

    // Check if inSocket is an element socket of a Dynamic List group; if so, defer to its owning input node.
    for (const key of Object.keys(node.payload)) {
        const prefix = ARRAY_GROUP_PAYLOAD_PREFIXES.find((p) => key.startsWith(p));
        if (!prefix) continue;
        const entries = (node.payload as Record<string, unknown>)[key] as { socket: string }[];
        if (entries.some((e) => e.socket === inSocket)) {
            const inKey: InterfaceKey = `in:${key.slice(prefix.length)}`;
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
        case "pointInput":
            return { kind: "point", data: PointHelper.fromAuthoring(storedValue as PointInput.Value) };
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
            const supersocketEval = context.resolve<DataTypes.ArrayOf<DataTypes.Layer>>(node.id, inputNodeId, outerCursorData);
            if (supersocketEval) return supersocketEval;

            // Build from individual layer sockets
            const layerData: { shape: DataTypes.TypeOf<DataTypes.Shape> | null; enabled: boolean | null; blend: number | null }[] = [];
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
            const supersocketEval = context.resolve<DataTypes.ArrayOf<DataTypes.PathOp>>(node.id, inputNodeId, outerCursorData);
            if (supersocketEval) return supersocketEval;

            // Build from individual pathOp sockets
            const pathOpData: { path: DataTypes.TypeOf<DataTypes.Path> | null; enabled: boolean | null; op: number | null }[] = [];
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

        // Dynamic List handling for scalar/stop/point array inputs (mirrors their array constructor fold).
        const elementsKey = `elements_${inputNodeId}`;
        if (elementsKey in node.payload) {
            const inputNode = context.getNode(graphId, inputNodeId);
            const view = inputNode ? ARRAY_ELEMENT_VIEWS[inputNode.type] : undefined;
            if (view) {
                // Supersocket override: a connected array<T> wins over the element rows.
                const supersocketEval = context.resolve(node.id, inputNodeId, outerCursorData);
                if (supersocketEval) return supersocketEval;

                const entries = (node.payload as Record<string, unknown>)[elementsKey] as ArrayGroupEntryData[];
                const data = entries.map((entry) => view.fold(entry, context.resolve(node.id, entry.socket, outerCursorData)));
                if (view.sortByPosition) {
                    data.sort((a, b) => (a as { position: number }).position - (b as { position: number }).position);
                }
                return { kind: view.outputKind, data } as DataTypes.AnyEval;
            }
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
        const { senderId, count } = raw.data as DataTypes.TypeOf<DataTypes.Sequence>;
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
            const patch = buildInputSocketPatch(subgraphNodes[parsed.nodeId], parsed.nodeId);
            Object.assign(inSockets, patch.in);
            Object.assign(initialValues, patch.payload);
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

    // Check if the connected socket is a supersocket for a Dynamic List group (layer/path-op or element group);
    // if so, connecting the whole array clears the now-hidden element sockets (mirrors the array constructors).
    const layersKey = `layers_${link.toSocket}`;
    const pathOpsKey = `pathOps_${link.toSocket}`;
    const elementsKey = `elements_${link.toSocket}`;
    const groupKey = layersKey in node.payload ? layersKey : pathOpsKey in node.payload ? pathOpsKey : elementsKey in node.payload ? elementsKey : null;
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
    floatInput: SocketTypes.of(DataTypes.FLOAT),
    floatOutput: SocketTypes.of(DataTypes.FLOAT),
    integerInput: SocketTypes.of(DataTypes.INTEGER),
    integerOutput: SocketTypes.of(DataTypes.INTEGER),
    angleInput: SocketTypes.of(DataTypes.ANGLE),
    angleOutput: SocketTypes.of(DataTypes.ANGLE),
    lengthInput: SocketTypes.of(DataTypes.LENGTH),
    lengthOutput: SocketTypes.of(DataTypes.LENGTH),
    colorInput: SocketTypes.of(DataTypes.COLOR),
    paintInput: SocketTypes.and(DataTypes.COLOR, DataTypes.GRADIENT),
    colorOutput: SocketTypes.of(DataTypes.COLOR),
    pointInput: SocketTypes.of(DataTypes.POINT),
    pointOutput: SocketTypes.of(DataTypes.POINT),
    booleanInput: SocketTypes.of(DataTypes.BOOLEAN),
    booleanOutput: SocketTypes.of(DataTypes.BOOLEAN),
    enumInput: SocketTypes.of(DataTypes.ENUM),
    enumOutput: SocketTypes.of(DataTypes.ENUM),
    stringInput: SocketTypes.of(DataTypes.STRING),
    stringOutput: SocketTypes.of(DataTypes.STRING),
    tokensLengthInput: SocketTypes.of(DataTypes.TOKENS_LENGTH),
    tokensLengthOutput: SocketTypes.of(DataTypes.TOKENS_LENGTH),
    shapeInput: SocketTypes.of(DataTypes.SHAPE),
    shapeOutput: SocketTypes.of(DataTypes.SHAPE),
    arrayLayerInput: SocketTypes.of(DataTypes.arrayOf(DataTypes.LAYER)),
    arrayLayerOutput: SocketTypes.of(DataTypes.arrayOf(DataTypes.LAYER)),
    arrayPathOpInput: SocketTypes.of(DataTypes.arrayOf(DataTypes.PATHOP)),
    arrayPathOpOutput: SocketTypes.of(DataTypes.arrayOf(DataTypes.PATHOP)),
    layerInput: SocketTypes.of(DataTypes.LAYER),
    layerOutput: SocketTypes.of(DataTypes.LAYER),
    pathOpInput: SocketTypes.of(DataTypes.PATHOP),
    pathOpOutput: SocketTypes.of(DataTypes.PATHOP),
    stopColorInput: SocketTypes.of(DataTypes.STOP_COLOR),
    stopColorOutput: SocketTypes.of(DataTypes.STOP_COLOR),
    arrayStopColorInput: SocketTypes.of(DataTypes.arrayOf(DataTypes.STOP_COLOR)),
    arrayStopColorOutput: SocketTypes.of(DataTypes.arrayOf(DataTypes.STOP_COLOR)),
    stopFloatInput: SocketTypes.of(DataTypes.STOP_FLOAT),
    stopFloatOutput: SocketTypes.of(DataTypes.STOP_FLOAT),
    arrayStopFloatInput: SocketTypes.of(DataTypes.arrayOf(DataTypes.STOP_FLOAT)),
    arrayStopFloatOutput: SocketTypes.of(DataTypes.arrayOf(DataTypes.STOP_FLOAT)),
    stopAngleInput: SocketTypes.of(DataTypes.STOP_ANGLE),
    stopAngleOutput: SocketTypes.of(DataTypes.STOP_ANGLE),
    arrayStopAngleInput: SocketTypes.of(DataTypes.arrayOf(DataTypes.STOP_ANGLE)),
    arrayStopAngleOutput: SocketTypes.of(DataTypes.arrayOf(DataTypes.STOP_ANGLE)),
    arrayAngleInput: SocketTypes.of(DataTypes.arrayOf(DataTypes.ANGLE)),
    arrayAngleOutput: SocketTypes.of(DataTypes.arrayOf(DataTypes.ANGLE)),
    arrayIntegerInput: SocketTypes.of(DataTypes.arrayOf(DataTypes.INTEGER)),
    arrayIntegerOutput: SocketTypes.of(DataTypes.arrayOf(DataTypes.INTEGER)),
    arrayFloatInput: SocketTypes.of(DataTypes.arrayOf(DataTypes.FLOAT)),
    arrayFloatOutput: SocketTypes.of(DataTypes.arrayOf(DataTypes.FLOAT)),
    arrayLengthInput: SocketTypes.of(DataTypes.arrayOf(DataTypes.LENGTH)),
    arrayLengthOutput: SocketTypes.of(DataTypes.arrayOf(DataTypes.LENGTH)),
    arrayColorInput: SocketTypes.of(DataTypes.arrayOf(DataTypes.COLOR)),
    arrayColorOutput: SocketTypes.of(DataTypes.arrayOf(DataTypes.COLOR)),
    arrayBooleanInput: SocketTypes.of(DataTypes.arrayOf(DataTypes.BOOLEAN)),
    arrayBooleanOutput: SocketTypes.of(DataTypes.arrayOf(DataTypes.BOOLEAN)),
    arrayPointInput: SocketTypes.of(DataTypes.arrayOf(DataTypes.POINT)),
    arrayPointOutput: SocketTypes.of(DataTypes.arrayOf(DataTypes.POINT)),
    stopIntegerInput: SocketTypes.of(DataTypes.STOP_INTEGER),
    stopIntegerOutput: SocketTypes.of(DataTypes.STOP_INTEGER),
    arrayStopIntegerInput: SocketTypes.of(DataTypes.arrayOf(DataTypes.STOP_INTEGER)),
    arrayStopIntegerOutput: SocketTypes.of(DataTypes.arrayOf(DataTypes.STOP_INTEGER)),
    stopLengthInput: SocketTypes.of(DataTypes.STOP_LENGTH),
    stopLengthOutput: SocketTypes.of(DataTypes.STOP_LENGTH),
    arrayStopLengthInput: SocketTypes.of(DataTypes.arrayOf(DataTypes.STOP_LENGTH)),
    arrayStopLengthOutput: SocketTypes.of(DataTypes.arrayOf(DataTypes.STOP_LENGTH)),
    distributionInput: SocketTypes.of(DataTypes.DISTRIBUTION),
    distributionOutput: SocketTypes.of(DataTypes.DISTRIBUTION),
    sequenceInput: SocketTypes.of(DataTypes.SEQUENCE),
    sequenceOutput: SocketTypes.of(DataTypes.SEQUENCE),
    pathInput: SocketTypes.of(DataTypes.PATH),
    pathOutput: SocketTypes.of(DataTypes.PATH),
};

const getSocketType = (node: NodeDefinitions.NodeFor<CustomDefinition>, socketId: string, _side: "in" | "out", _graphId: string, ctx: NodeTypes.MethodContext): SocketTypes.Term => {
    const subgraphId = node.payload.graphId;
    if (!subgraphId) return SocketTypes.ANY;

    // Check if this socket belongs to a Dynamic List group (layer/path-op, or a scalar/stop/point element group)
    for (const key of Object.keys(node.payload)) {
        if (key.startsWith("layers_")) {
            const entries = (node.payload as Record<string, unknown>)[key] as { socket: string }[];
            if (entries.some((e) => e.socket === socketId)) return SocketTypes.LAYER_OR_SHAPE;
        } else if (key.startsWith("pathOps_")) {
            const entries = (node.payload as Record<string, unknown>)[key] as { socket: string }[];
            if (entries.some((e) => e.socket === socketId)) return SocketTypes.PATHOP_OR_PATH;
        } else if (key.startsWith("elements_")) {
            const entries = (node.payload as Record<string, unknown>)[key] as { socket: string }[];
            if (entries.some((e) => e.socket === socketId)) {
                const inputNodeId = key.slice("elements_".length);
                const inputNode = ctx.getNode(subgraphId, inputNodeId);
                return (inputNode && ARRAY_ELEMENT_VIEWS[inputNode.type]?.elementSocketType) ?? SocketTypes.ANY;
            }
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
    flavour: "info",
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
        case "pointOutput":
            return <OutputSlotPoint host={hostNode} source={sourceNode as NodeDefinitions.NodeFor<PointOutputDefinition>} />;
        case "pointInput":
            return <InputSlotPoint host={hostNode} source={sourceNode as NodeDefinitions.NodeFor<PointInputDefinition>} handleValue={handleValue} />;
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
        case "arrayFloatInput":
        case "arrayIntegerInput":
        case "arrayAngleInput":
        case "arrayLengthInput":
        case "arrayColorInput":
        case "arrayBooleanInput":
        case "arrayPointInput":
        case "arrayStopColorInput":
        case "arrayStopFloatInput":
        case "arrayStopAngleInput":
        case "arrayStopIntegerInput":
        case "arrayStopLengthInput":
            return <InputSlotArrayGroup host={hostNode} source={sourceNode} />;
        case "layerInput":
        case "pathOpInput":
        case "stopColorInput":
        case "stopFloatInput":
        case "stopAngleInput":
        case "stopIntegerInput":
        case "stopLengthInput":
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
        case "arrayAngleOutput":
        case "arrayIntegerOutput":
        case "arrayFloatOutput":
        case "arrayPointOutput":
        case "arrayLengthOutput":
        case "arrayColorOutput":
        case "arrayBooleanOutput":
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
    const resolved = Project.useCachedOutput(useGraphId(), host, source.id) as DataTypes.EvalOf<DataTypes.ConcreteKind> | null;
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
    const resolved = Project.useCachedOutput(useGraphId(), host, source.id) as DataTypes.EvalOf<DataTypes.ConcreteKind> | null;
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
    const resolved = Project.useCachedOutput(useGraphId(), host, source.id) as DataTypes.EvalOf<DataTypes.ConcreteKind> | null;
    const angleParsed = resolved?.kind === "angle" ? Angle.Emptyable.parse(resolved.data) : null;
    const output = angleParsed ? `${Number(angleParsed[0].toFixed(2))}${angleParsed[1]}` : "« none »";

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
    const resolved = Project.useCachedOutput(useGraphId(), host, source.id) as DataTypes.EvalOf<DataTypes.ConcreteKind> | null;
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
    const resolved = Project.useCachedOutput(useGraphId(), host, source.id) as DataTypes.EvalOf<DataTypes.ConcreteKind> | null;
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
    const resolved = Project.useCachedOutput(useGraphId(), host, source.id) as DataTypes.EvalOf<DataTypes.ConcreteKind> | null;
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

const OutputSlotPoint = ({ host, source }: OutputWidgetProps<PointOutputDefinition>) => {
    const resolved = Project.useCachedOutput(useGraphId(), host, source.id) as DataTypes.EvalOf<DataTypes.ConcreteKind> | null;
    const output = resolved?.kind === "point" ? `(${Number(resolved.data.x.toFixed(2))}, ${Number(resolved.data.y.toFixed(2))})` : "« none »";

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

const InputSlotPoint = ({ host, source, handleValue }: InputWidgetProps<PointInputDefinition>) => {
    const socketed = source.payload.socketed !== false;
    const label = interfaceMemberLabel(source);
    const disabled = host.in[source.id] != null;
    // Fall back to the source input's initialValue if the host somehow lacks a stored value (e.g. a save from
    // before value-seeding was added) -- PointInput hard-dereferences value.mode and would otherwise crash.
    const current = (host.payload[`value_${source.id}`] as PointInput.Value | undefined) ?? source.payload.initialValue;

    switch (source.payload.widget) {
        case Enum.Common.typicalInputWidget.NONE.value: {
            return (
                <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id}>
                    {label}
                </InputSocketOrSlot>
            );
        }
        case Enum.Common.typicalInputWidget.INPUT.value: {
            return (
                <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id} label={label}>
                    <PointInput value={current} onChange={(v) => handleValue({ [`value_${source.id}`]: { ...current, ...v } })} disabled={disabled} />
                </InputSocketOrSlot>
            );
        }
    }
    return null;
};

const OutputSlotBoolean = ({ host, source }: OutputWidgetProps<BooleanOutputDefinition>) => {
    const resolved = Project.useCachedOutput(useGraphId(), host, source.id) as DataTypes.EvalOf<DataTypes.ConcreteKind> | null;
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
    const resolved = Project.useCachedOutput(useGraphId(), host, source.id) as DataTypes.EvalOf<DataTypes.ConcreteKind> | null;
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
    const resolved = Project.useCachedOutput(useGraphId(), host, source.id) as DataTypes.EvalOf<DataTypes.ConcreteKind> | null;
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
    const resolved = Project.useCachedOutput(useGraphId(), host, source.id) as DataTypes.EvalOf<DataTypes.ConcreteKind> | null;
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
    const socketed = (source.payload as { socketed?: boolean }).socketed !== false;
    const isDynamic = (source.payload as { widget?: number }).widget !== Enum.Common.arrayInputWidget.NONE.value;
    const supersocketConnected = socketed && host.in[source.id] != null;
    const showRows = isDynamic && !supersocketConnected;

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
            <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id}>
                {label}
            </InputSocketOrSlot>
            {showRows ? (
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
            ) : null}
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
    // A connected layer carries its own enabled/blend, so freeze the row's controls. Ask the upstream
    // socket directly (structurally) rather than the blended link's representative kind.
    const inbound = Project.useInboundType(useGraphId(), host, entry.socket);
    const overridden = inbound !== null && SocketTypes.project(inbound).includes("layer");
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
                <CheckBox checked={entry.enabled} onToggle={(enabled) => handleLayerUpdate(entry.socket, { enabled })} disabled={overridden} />
                <Dropdown value={`${entry.blend}`} onValue={(v) => handleLayerUpdate(entry.socket, { blend: Number(v) })} disabled={overridden}>
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
    const socketed = (source.payload as { socketed?: boolean }).socketed !== false;
    const isDynamic = (source.payload as { widget?: number }).widget !== Enum.Common.arrayInputWidget.NONE.value;
    const supersocketConnected = socketed && host.in[source.id] != null;
    const showRows = isDynamic && !supersocketConnected;

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
            <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id}>
                {label}
            </InputSocketOrSlot>
            {showRows ? (
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
            ) : null}
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
    const [dropSide, setDropSide] = useState<"above" | "below" | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    // A connected pathOp carries its own op/enabled, so freeze the row's controls. Ask the upstream socket
    // directly (structurally) rather than the blended link's representative kind.
    const inbound = Project.useInboundType(useGraphId(), host, entry.socket);
    const overridden = inbound !== null && SocketTypes.project(inbound).includes("pathOp");

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

// ---- Generic Dynamic List for the scalar/stop/point array inputs ------------------------------------------------
// The layer/path-op groups above stay bespoke (dual-type sockets + enabled/blend|op metadata). Everything else
// shares this one list-wrapper; only the per-element row editor and eval fold vary, via ARRAY_ELEMENT_VIEWS. Each
// view mirrors that element type's array constructor sibling (floatArray, colorStopArray, ...).

const ARRAY_ELEMENT_MIME = "application/x-custom-array-element";

const ArrayRowWrap = styled.div`
    display: flex;
    align-items: center;
    gap: 3px;
    flex: 1 1 0;
    min-width: 0;

    & > .valueField,
    & > .stopValue,
    & > .pointField {
        flex: 1 1 0;
        width: 0;
        min-width: 0;
    }
    & > .stopPosition {
        flex: 0 0 4.5em;
    }
`;

type ArrayRowProps = { entry: ArrayGroupEntryData; connected: boolean; onUpdate: (u: Record<string, unknown>) => void };

const scalarFold = (entry: ArrayGroupEntryData, connected: DataTypes.AnyEval | null): unknown => (connected ? connected.data : entry.value);

const pointFold = (entry: ArrayGroupEntryData, connected: DataTypes.AnyEval | null): { x: number; y: number } => {
    if (connected) {
        const d = connected.data as { x: number; y: number };
        return { x: d.x, y: d.y };
    }
    return PointHelper.fromAuthoring(entry as unknown as PointInput.Value);
};

// Stops fold to { value, position, enabled }, mirroring the *StopArray constructors: a connected element (a full
// stop) overrides each field; otherwise the inline row is used. Output is sorted by position (sortByPosition).
const stopFold = (entry: ArrayGroupEntryData, connected: DataTypes.AnyEval | null): { value: unknown; position: number; enabled: boolean } => {
    const rowPos = NumericString.Emptyable.asNumber(entry.position as NumericString.Type) ?? 0;
    if (connected) {
        const d = connected.data as { value?: unknown; position?: number; enabled?: boolean };
        return { value: d.value ?? entry.value, position: d.position ?? rowPos, enabled: d.enabled ?? (entry.enabled as boolean) };
    }
    return { value: entry.value, position: rowPos, enabled: entry.enabled as boolean };
};

const StopRow = ({ entry, connected, onUpdate, children }: ArrayRowProps & { children: ReactNode }) => (
    <>
        <CheckBox checked={entry.enabled as boolean} onToggle={(enabled) => onUpdate({ enabled })} disabled={connected} />
        {children}
        <DecimalInput className={"stopPosition"} value={entry.position as NumericString.Type} onCommit={(position) => onUpdate({ position })} disabled={connected} min={"0"} max={"100"} />
    </>
);

type ArrayElementView = {
    defaultLabel: string;
    addLabel: string;
    elementSocketType: SocketTypes.Term;
    outputKind: DataTypes.AnyEval["kind"];
    sortByPosition?: boolean;
    Row: (props: ArrayRowProps) => ReactNode;
    fold: (entry: ArrayGroupEntryData, connected: DataTypes.AnyEval | null) => unknown;
};

const ARRAY_ELEMENT_VIEWS: Record<string, ArrayElementView> = {
    arrayFloatInput: {
        defaultLabel: "Floats",
        addLabel: "Add Float",
        elementSocketType: SocketTypes.of(DataTypes.FLOAT),
        outputKind: "array<float>",
        fold: scalarFold,
        Row: ({ entry, connected, onUpdate }) => <DecimalInput className={"valueField"} value={entry.value as NumericString.Type} onCommit={(value) => onUpdate({ value })} disabled={connected} />,
    },
    arrayIntegerInput: {
        defaultLabel: "Integers",
        addLabel: "Add Integer",
        elementSocketType: SocketTypes.of(DataTypes.INTEGER),
        outputKind: "array<integer>",
        fold: scalarFold,
        Row: ({ entry, connected, onUpdate }) => <IntegerInput className={"valueField"} value={entry.value as NumericString.Type} onCommit={(value) => onUpdate({ value })} disabled={connected} />,
    },
    arrayAngleInput: {
        defaultLabel: "Angles",
        addLabel: "Add Angle",
        elementSocketType: SocketTypes.of(DataTypes.ANGLE),
        outputKind: "array<angle>",
        fold: scalarFold,
        Row: ({ entry, connected, onUpdate }) => <AngleInput className={"valueField"} value={entry.value as Angle.Type} onCommit={(value) => onUpdate({ value })} disabled={connected} />,
    },
    arrayLengthInput: {
        defaultLabel: "Lengths",
        addLabel: "Add Length",
        elementSocketType: SocketTypes.of(DataTypes.LENGTH),
        outputKind: "array<length>",
        fold: scalarFold,
        Row: ({ entry, connected, onUpdate }) => <LengthInput className={"valueField"} value={entry.value as Length.Type} onCommit={(value) => onUpdate({ value })} disabled={connected} required />,
    },
    arrayColorInput: {
        defaultLabel: "Colors",
        addLabel: "Add Color",
        elementSocketType: SocketTypes.of(DataTypes.COLOR),
        outputKind: "array<color>",
        fold: scalarFold,
        Row: ({ entry, connected, onUpdate }) => <ColorHexInput className={"valueField"} value={entry.value as Color.Type} onCommit={(value) => onUpdate({ value })} disabled={connected} alpha />,
    },
    arrayBooleanInput: {
        defaultLabel: "Booleans",
        addLabel: "Add Boolean",
        elementSocketType: SocketTypes.of(DataTypes.BOOLEAN),
        outputKind: "array<boolean>",
        fold: scalarFold,
        Row: ({ entry, connected, onUpdate }) => (
            <CheckBox className={"valueField"} checked={entry.value as boolean} onToggle={(value) => onUpdate({ value })} disabled={connected}>
                {(entry.value as boolean) ? "True" : "False"}
            </CheckBox>
        ),
    },
    arrayPointInput: {
        defaultLabel: "Points",
        addLabel: "Add Point",
        elementSocketType: SocketTypes.of(DataTypes.POINT),
        outputKind: "array<point>",
        fold: pointFold,
        Row: ({ entry, connected, onUpdate }) => <PointInput value={entry as unknown as PointInput.Value} onChange={(v) => onUpdate(v)} disabled={connected} />,
    },
    arrayStopColorInput: {
        defaultLabel: "Color Stops",
        addLabel: "Add Stop",
        elementSocketType: SocketTypes.of(DataTypes.STOP_COLOR),
        outputKind: "array<stop:color>",
        sortByPosition: true,
        fold: stopFold,
        Row: (p) => (
            <StopRow {...p}>
                <ColorHexInput className={"stopValue"} value={p.entry.value as Color.Type} onCommit={(value) => p.onUpdate({ value })} disabled={p.connected} alpha />
            </StopRow>
        ),
    },
    arrayStopFloatInput: {
        defaultLabel: "Float Stops",
        addLabel: "Add Stop",
        elementSocketType: SocketTypes.of(DataTypes.STOP_FLOAT),
        outputKind: "array<stop:float>",
        sortByPosition: true,
        fold: stopFold,
        Row: (p) => (
            <StopRow {...p}>
                <DecimalInput className={"stopValue"} value={p.entry.value as NumericString.Type} onCommit={(value) => p.onUpdate({ value })} disabled={p.connected} />
            </StopRow>
        ),
    },
    arrayStopAngleInput: {
        defaultLabel: "Angle Stops",
        addLabel: "Add Stop",
        elementSocketType: SocketTypes.of(DataTypes.STOP_ANGLE),
        outputKind: "array<stop:angle>",
        sortByPosition: true,
        fold: stopFold,
        Row: (p) => (
            <StopRow {...p}>
                <AngleInput className={"stopValue"} value={p.entry.value as Angle.Type} onCommit={(value) => p.onUpdate({ value })} disabled={p.connected} unbound />
            </StopRow>
        ),
    },
    arrayStopIntegerInput: {
        defaultLabel: "Integer Stops",
        addLabel: "Add Stop",
        elementSocketType: SocketTypes.of(DataTypes.STOP_INTEGER),
        outputKind: "array<stop:integer>",
        sortByPosition: true,
        fold: stopFold,
        Row: (p) => (
            <StopRow {...p}>
                <IntegerInput className={"stopValue"} value={p.entry.value as NumericString.Type} onCommit={(value) => p.onUpdate({ value })} disabled={p.connected} />
            </StopRow>
        ),
    },
    arrayStopLengthInput: {
        defaultLabel: "Length Stops",
        addLabel: "Add Stop",
        elementSocketType: SocketTypes.of(DataTypes.STOP_LENGTH),
        outputKind: "array<stop:length>",
        sortByPosition: true,
        fold: stopFold,
        Row: (p) => (
            <StopRow {...p}>
                <LengthInput className={"stopValue"} value={p.entry.value as Length.Type} onCommit={(value) => p.onUpdate({ value })} disabled={p.connected} />
            </StopRow>
        ),
    },
};

const ArrayGroupEntry = ({
    host,
    entry,
    index,
    onRemove,
    onReorder,
    children,
}: {
    host: NodeDefinitions.NodeFor<CustomDefinition>;
    entry: ArrayGroupEntryData;
    index: number;
    onRemove: (socket: string) => void;
    onReorder: (socket: string, toIndex: number) => void;
    children: ReactNode;
}) => {
    const [dropSide, setDropSide] = useState<"above" | "below" | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    const handleDragStart = useCallback(
        (e: DragEvent) => {
            e.dataTransfer.setDragImage(ref.current as Element, 0, 0);
            e.dataTransfer.setData(ARRAY_ELEMENT_MIME, entry.socket);
            e.dataTransfer.effectAllowed = "move";
        },
        [entry.socket],
    );

    const handleDragOver = useCallback((e: DragEvent) => {
        if (!e.dataTransfer.types.includes(ARRAY_ELEMENT_MIME)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const rect = ref.current?.getBoundingClientRect();
        if (rect) setDropSide(e.clientY < rect.top + rect.height / 2 ? "above" : "below");
    }, []);

    const handleDragLeave = useCallback(() => setDropSide(null), []);

    const handleDrop = useCallback(
        (e: DragEvent) => {
            const socket = e.dataTransfer.getData(ARRAY_ELEMENT_MIME);
            if (socket) {
                e.preventDefault();
                onReorder(socket, dropSide === "below" ? index + 1 : index);
            }
            setDropSide(null);
        },
        [onReorder, index, dropSide],
    );

    const handleDragEnd = useCallback(() => setDropSide(null), []);

    return (
        <LayerEntryWrapper ref={ref} data-state={dropSide ? `drop-${dropSide}` : undefined} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onDragEnd={handleDragEnd}>
            <SocketIn node={host} socketId={entry.socket}>
                <ArrayRowWrap>{children}</ArrayRowWrap>
                <DragGrip draggable onDragStart={handleDragStart}>
                    <Icon shape={ICONS.Caret.Vertical} />
                </DragGrip>
                <ActionButton.Lite onClick={() => onRemove(entry.socket)} flavour={"danger"}>
                    <Icon shape={ICONS.Close} />
                </ActionButton.Lite>
            </SocketIn>
        </LayerEntryWrapper>
    );
};

const InputSlotArrayGroup = ({ host, source }: { host: NodeDefinitions.NodeFor<CustomDefinition>; source: NodeDefinitions.NodeFor<NodeDefinitions.Any> }) => {
    const { alterNode, removeLinks } = Project.useMethods();
    const view = ARRAY_ELEMENT_VIEWS[source.type];
    const groupKey = arrayGroupKey(source.type, source.id);
    const entries = ((host.payload as Record<string, unknown>)[groupKey] ?? []) as ArrayGroupEntryData[];
    const socketed = (source.payload as { socketed?: boolean }).socketed !== false;
    const isDynamic = (source.payload as { widget?: number }).widget !== Enum.Common.arrayInputWidget.NONE.value;
    const supersocketConnected = socketed && host.in[source.id] != null;
    const showRows = isDynamic && !supersocketConnected;
    const label = ((source.payload as { label?: string }).label ?? "") === "" ? (view?.defaultLabel ?? "Items") : (source.payload as { label?: string }).label;

    const handleAdd = useCallback(() => {
        const entry = makeArrayGroupEntry(source.type);
        alterNode(host.id, (n) => ({
            ...n,
            in: { ...n.in, [entry.socket]: null },
            payload: { ...n.payload, [groupKey]: [...(((n.payload as Record<string, unknown>)[groupKey] ?? []) as ArrayGroupEntryData[]), entry] },
        }));
    }, [alterNode, host.id, source.type, groupKey]);

    const handleRemove = useCallback(
        (socket: string) => {
            const linkId = host.in[socket];
            if (linkId) removeLinks(linkId);
            alterNode(host.id, (n) => {
                const { [socket]: _, ...restIn } = n.in;
                return { ...n, in: restIn, payload: { ...n.payload, [groupKey]: (((n.payload as Record<string, unknown>)[groupKey] ?? []) as ArrayGroupEntryData[]).filter((e) => e.socket !== socket) } };
            });
        },
        [alterNode, removeLinks, host.id, host.in, groupKey],
    );

    const handleUpdate = useCallback(
        (socket: string, update: Record<string, unknown>) => {
            alterNode(host.id, (n) => ({
                ...n,
                payload: { ...n.payload, [groupKey]: (((n.payload as Record<string, unknown>)[groupKey] ?? []) as ArrayGroupEntryData[]).map((e) => (e.socket === socket ? { ...e, ...update } : e)) },
            }));
        },
        [alterNode, host.id, groupKey],
    );

    const handleReorder = useCallback(
        (socket: string, toIndex: number) => {
            alterNode(host.id, (n) => {
                const list = [...(((n.payload as Record<string, unknown>)[groupKey] ?? []) as ArrayGroupEntryData[])];
                const fromIndex = list.findIndex((e) => e.socket === socket);
                if (fromIndex === -1 || fromIndex === toIndex) return n;
                const [moved] = list.splice(fromIndex, 1);
                list.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, moved);
                return { ...n, payload: { ...n.payload, [groupKey]: list } };
            });
        },
        [alterNode, host.id, groupKey],
    );

    if (!view) return null;

    const Row = view.Row;
    return (
        <>
            <InputSocketOrSlot socketed={socketed} node={host} socketId={source.id}>
                {label}
            </InputSocketOrSlot>
            {showRows ? (
                <>
                    <ActionButton onClick={handleAdd} flavour={"accent"}>
                        {view.addLabel}
                    </ActionButton>
                    {entries.map((entry, idx) => (
                        <ArrayGroupEntry key={entry.socket} host={host} entry={entry} index={idx} onRemove={handleRemove} onReorder={handleReorder}>
                            <Row entry={entry} connected={host.in[entry.socket] != null} onUpdate={(u) => handleUpdate(entry.socket, u)} />
                        </ArrayGroupEntry>
                    ))}
                </>
            ) : null}
        </>
    );
};
