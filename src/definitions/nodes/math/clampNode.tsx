import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { Project } from "../../../state/project";
import { NUMERIC_TYPES, constrainForPartner, constrainForOutput, computeOutputType, queryUpstreamOutType, extractPair, dominantKind, wrapResult, extractSingle } from "./numericMath";

export type ClampDefinition = {
    inputs: {
        input: DataTypes.Use<"float">;
        min: DataTypes.Use<"float">;
        max: DataTypes.Use<"float">;
    };
    outputs: {
        output: DataTypes.Use<"float">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        input: DataTypes.TypeOf<DataTypes.Use<"float">>;
        min: DataTypes.TypeOf<DataTypes.Use<"float">>;
        max: DataTypes.TypeOf<DataTypes.Use<"float">>;
        connectedTypeInput: SocketTypes.SocketRule;
        connectedTypeMin: SocketTypes.SocketRule;
        connectedTypeMax: SocketTypes.SocketRule;
        resolvedInTypes: SocketTypes.SocketRule;
    };
};

type ClampNode = NodeDefinitions.BuiltNodeOf<"clamp", ClampDefinition>;

const SOCKET_KEYS = ["input", "min", "max"] as const;
type SocketKey = (typeof SOCKET_KEYS)[number];
const PAYLOAD_KEY: Record<SocketKey, "connectedTypeInput" | "connectedTypeMin" | "connectedTypeMax"> = {
    input: "connectedTypeInput",
    min: "connectedTypeMin",
    max: "connectedTypeMax",
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<ClampDefinition>>, id: string = nanoid()): ClampNode => {
    return {
        id,
        in: { input: null, min: null, max: null },
        out: { output: [] },
        payload: {
            label: "",
            input: input.input ?? "0",
            min: input.min ?? "0",
            max: input.max ?? "1",
            connectedTypeInput: SocketTypes.NONE,
            connectedTypeMin: SocketTypes.NONE,
            connectedTypeMax: SocketTypes.NONE,
            resolvedInTypes: SocketTypes.ANY,
        },
        type: "clamp",
    };
};

/** Effective type for one socket, considering the other two as partners */
const effectiveInputType = (
    myConnected: SocketTypes.SocketRule,
    partnerA: SocketTypes.SocketRule,
    partnerB: SocketTypes.SocketRule,
    resolvedInTypes: SocketTypes.SocketRule,
): SocketTypes.SocketRule => {
    if (myConnected.types.length > 0) return myConnected;
    // Forward constraint: intersection of both partners' constraints
    const fwdA = constrainForPartner(partnerA);
    const fwdB = constrainForPartner(partnerB);
    const forward = SocketTypes.intersect(fwdA, fwdB);
    // Backward: use the "best" partner (first connected one) for output constraint
    const bestPartner = partnerA.types.length > 0 ? partnerA : partnerB;
    const backward = constrainForOutput(resolvedInTypes, bestPartner);
    return SocketTypes.intersect(forward, backward);
};

const computeOutputType3 = (a: SocketTypes.SocketRule, b: SocketTypes.SocketRule, c: SocketTypes.SocketRule): SocketTypes.SocketRule => {
    if (a.types.length === 0 || b.types.length === 0 || c.types.length === 0) return NUMERIC_TYPES;
    const result = new Set<DataTypes.Kind>();
    for (const ak of a.types) {
        for (const bk of b.types) {
            for (const ck of c.types) {
                const d = dominantKind(dominantKind(ak, bk), ck) as DataTypes.Kind;
                result.add(d);
            }
        }
    }
    return { types: [...result].sort() as DataTypes.Kind[], mode: "or" };
};

const queryDownstreamTypes = (node: ClampNode, graphId: string, ctx: NodeTypes.MethodContext): SocketTypes.SocketRule | null => {
    const linkIds = node.out.output;
    if (linkIds.length === 0) return null;
    let result: SocketTypes.SocketRule | null = null;
    for (const linkId of linkIds) {
        const link = ctx.getLink(graphId, linkId);
        if (!link) continue;
        const neighbor = ctx.getNode(graphId, link.toNode);
        if (!neighbor) continue;
        const st = NodeTypes.getSocketType(neighbor, link.toSocket, "in", ctx);
        result = result === null ? st : SocketTypes.intersect(result, st);
    }
    return result;
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ClampDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ClampDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const { connectedTypeInput, connectedTypeMin, connectedTypeMax, resolvedInTypes } = node.payload;
    const typeInput = effectiveInputType(connectedTypeInput, connectedTypeMin, connectedTypeMax, resolvedInTypes);
    const typeMin = effectiveInputType(connectedTypeMin, connectedTypeInput, connectedTypeMax, resolvedInTypes);
    const typeMax = effectiveInputType(connectedTypeMax, connectedTypeInput, connectedTypeMin, resolvedInTypes);
    const typeOut = computeOutputType3(typeInput, typeMin, typeMax);

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={SocketTypes.toCSS(typeOut)}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"input"} type={SocketTypes.toCSS(typeInput)} label={"Input"}>
                <DecimalInput value={node.payload.input} onCommit={(input) => handleUpdate({ input })} disabled={node.in.input !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"min"} type={SocketTypes.toCSS(typeMin)} label={"Min"}>
                <DecimalInput value={node.payload.min} onCommit={(min) => handleUpdate({ min })} disabled={node.in.min !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"max"} type={SocketTypes.toCSS(typeMax)} label={"Max"}>
                <DecimalInput value={node.payload.max} onCommit={(max) => handleUpdate({ max })} disabled={node.in.max !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<ClampDefinition>, outSocket: "output", _deps: AllDeps): (keyof ClampDefinition["inputs"])[] => {
    if (outSocket === "output") return ["input", "min", "max"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ClampDefinition>, _inSocket: keyof ClampDefinition["inputs"], _deps: AllDeps): (keyof ClampDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<ClampDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const inputVal = context.resolve(node.id, "input");
        const minVal = context.resolve(node.id, "min");
        const maxVal = context.resolve(node.id, "max");

        const inputKind = inputVal?.kind ?? "float";
        const inputData = inputVal?.data ?? node.payload.input;
        const { value, unit } = extractSingle(inputKind, inputData);

        const minKind = minVal?.kind ?? "float";
        const minData = minVal?.data ?? node.payload.min;
        const { value: lo } = extractSingle(minKind, minData);

        const maxKind = maxVal?.kind ?? "float";
        const maxData = maxVal?.data ?? node.payload.max;
        const { value: hi } = extractSingle(maxKind, maxData);

        const outputKind = dominantKind(dominantKind(inputKind, minKind), maxKind);
        return wrapResult(Math.max(lo, Math.min(hi, value)), outputKind, unit);
    }
    return null;
};

const setPayload = (nodeId: string, updates: Partial<ClampDefinition["payload"]>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const current = ctx.getNode(graphId, nodeId);
    if (!current) return;
    ctx.setNode(graphId, nodeId, {
        ...current,
        payload: { ...current.payload, ...updates } as NodeDefinitions.NodeFor<NodeDefinitions.Any>["payload"],
    });
};

const onConnect = (node: ClampNode, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    const link = ctx.getLink(graphId, linkId);
    if (!link) return;

    if (direction === "in") {
        const socket = link.toSocket as SocketKey;
        const upstreamType = queryUpstreamOutType(node, socket, graphId, ctx);
        setPayload(node.id, { [PAYLOAD_KEY[socket]]: upstreamType }, graphId, ctx);

        for (const other of SOCKET_KEYS) {
            if (other !== socket) ctx.requestRefresh(graphId, node.id, other, "in", "constraintAdded");
        }
        ctx.requestRefresh(graphId, node.id, "output", "out", "constraintAdded");
    } else {
        const currentNode = ctx.getNode(graphId, node.id) as ClampNode | undefined;
        if (!currentNode) return;
        const downstreamTypes = queryDownstreamTypes(currentNode, graphId, ctx);
        if (downstreamTypes !== null) {
            const newInTypes = SocketTypes.intersect(currentNode.payload.resolvedInTypes, downstreamTypes);
            if (!SocketTypes.equals(newInTypes, currentNode.payload.resolvedInTypes)) {
                setPayload(node.id, { resolvedInTypes: newInTypes }, graphId, ctx);
                for (const s of SOCKET_KEYS) ctx.requestRefresh(graphId, node.id, s, "in", "constraintAdded");
            }
        }
    }
};

const onDisconnect = (node: ClampNode, link: { fromNode: string; fromSocket: string; toNode: string; toSocket: string }, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    if (direction === "in") {
        const socket = link.toSocket as SocketKey;
        for (const other of SOCKET_KEYS) {
            if (other !== socket) ctx.requestRefresh(graphId, node.id, other, "in", "constraintRemoved");
        }
        ctx.requestRefresh(graphId, node.id, "output", "out", "constraintRemoved");

        setPayload(node.id, { [PAYLOAD_KEY[socket]]: SocketTypes.NONE }, graphId, ctx);

        for (const other of SOCKET_KEYS) {
            if (other !== socket) ctx.requestRefresh(graphId, node.id, other, "in", "constraintAdded");
        }
        ctx.requestRefresh(graphId, node.id, "output", "out", "constraintAdded");
    } else {
        for (const s of SOCKET_KEYS) ctx.requestRefresh(graphId, node.id, s, "in", "constraintRemoved");

        const currentNode = ctx.getNode(graphId, node.id) as ClampNode | undefined;
        if (!currentNode) return;
        const downstream = queryDownstreamTypes(currentNode, graphId, ctx);
        setPayload(node.id, { resolvedInTypes: downstream ?? SocketTypes.ANY }, graphId, ctx);

        for (const s of SOCKET_KEYS) ctx.requestRefresh(graphId, node.id, s, "in", "constraintAdded");
    }
};

const onRefreshRequest = (node: ClampNode, socketId: string, side: "in" | "out", reason: NodeTypes.RefreshReason, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const currentNode = ctx.getNode(graphId, node.id) as ClampNode | undefined;
    if (!currentNode) return;

    if (side === "in") {
        const socket = socketId as SocketKey;
        const newUpstreamType = queryUpstreamOutType(currentNode, socketId, graphId, ctx);
        const oldType = currentNode.payload[PAYLOAD_KEY[socket]];

        if (!SocketTypes.equals(newUpstreamType, oldType)) {
            setPayload(node.id, { [PAYLOAD_KEY[socket]]: newUpstreamType }, graphId, ctx);
            for (const other of SOCKET_KEYS) {
                if (other !== socket) ctx.requestRefresh(graphId, node.id, other, "in", reason);
            }
            ctx.requestRefresh(graphId, node.id, "output", "out", reason);
        }
    } else {
        const newInTypes = queryDownstreamTypes(currentNode, graphId, ctx) ?? SocketTypes.ANY;
        if (!SocketTypes.equals(newInTypes, currentNode.payload.resolvedInTypes)) {
            setPayload(node.id, { resolvedInTypes: newInTypes }, graphId, ctx);
            for (const s of SOCKET_KEYS) ctx.requestRefresh(graphId, node.id, s, "in", reason);
        }
    }
};

const getSocketType = (node: NodeDefinitions.NodeFor<ClampDefinition>, socketId: string, _side: "in" | "out", _ctx: NodeTypes.MethodContext): SocketTypes.SocketRule => {
    const { connectedTypeInput, connectedTypeMin, connectedTypeMax, resolvedInTypes } = node.payload;
    const eInput = effectiveInputType(connectedTypeInput, connectedTypeMin, connectedTypeMax, resolvedInTypes);
    const eMin = effectiveInputType(connectedTypeMin, connectedTypeInput, connectedTypeMax, resolvedInTypes);
    const eMax = effectiveInputType(connectedTypeMax, connectedTypeInput, connectedTypeMin, resolvedInTypes);
    switch (socketId) {
        case "input":
            return eInput;
        case "min":
            return eMin;
        case "max":
            return eMax;
        case "output":
            return computeOutputType3(eInput, eMin, eMax);
        default:
            return NUMERIC_TYPES;
    }
};

export const ClampType: NodeTypes.Type<"clamp", ClampDefinition> = {
    type: "clamp",
    displayName: "Clamp",
    defaultLabel: "Clamp",
    iconNode: <Icon shape={NODE_ICONS.spreadValue.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.spreadValue.Card} color={"var(--icon-flavour)"} />,
    category: "Math",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    getSocketType,
    onConnect,
    onDisconnect,
    onRefreshRequest,
};
