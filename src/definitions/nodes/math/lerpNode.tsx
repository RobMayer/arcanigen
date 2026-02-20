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

const DIMENSIONLESS_IN: SocketTypes.SocketRule = { types: ["float", "integer"], mode: "or" };

export type LerpDefinition = {
    inputs: {
        a: DataTypes.Use<"float">;
        b: DataTypes.Use<"float">;
        t: DataTypes.Use<"float">;
    };
    outputs: {
        output: DataTypes.Use<"float">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        a: DataTypes.TypeOf<DataTypes.Use<"float">>;
        b: DataTypes.TypeOf<DataTypes.Use<"float">>;
        t: DataTypes.TypeOf<DataTypes.Use<"float">>;
        connectedTypeA: SocketTypes.SocketRule;
        connectedTypeB: SocketTypes.SocketRule;
        resolvedInTypes: SocketTypes.SocketRule;
    };
};

type LerpNode = NodeDefinitions.BuiltNodeOf<"lerp", LerpDefinition>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<LerpDefinition>>, id: string = nanoid()): LerpNode => {
    return {
        id,
        in: { a: null, b: null, t: null },
        out: { output: [] },
        payload: {
            label: "",
            a: input.a ?? "0",
            b: input.b ?? "1",
            t: input.t ?? "0.5",
            connectedTypeA: SocketTypes.NONE,
            connectedTypeB: SocketTypes.NONE,
            resolvedInTypes: SocketTypes.ANY,
        },
        type: "lerp",
    };
};

const effectiveInputType = (connectedType: SocketTypes.SocketRule, partnerType: SocketTypes.SocketRule, resolvedInTypes: SocketTypes.SocketRule): SocketTypes.SocketRule => {
    if (connectedType.types.length > 0) return connectedType;
    const forward = constrainForPartner(partnerType);
    const backward = constrainForOutput(resolvedInTypes, partnerType);
    return SocketTypes.intersect(forward, backward);
};

const queryDownstreamTypes = (node: LerpNode, graphId: string, ctx: NodeTypes.MethodContext): SocketTypes.SocketRule | null => {
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

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<LerpDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<LerpDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const { connectedTypeA, connectedTypeB, resolvedInTypes } = node.payload;
    const typeA = effectiveInputType(connectedTypeA, connectedTypeB, resolvedInTypes);
    const typeB = effectiveInputType(connectedTypeB, connectedTypeA, resolvedInTypes);
    const typeOut = computeOutputType(typeA, typeB);

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={SocketTypes.toCSS(typeOut)}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"a"} type={SocketTypes.toCSS(typeA)} label={"A"}>
                <DecimalInput value={node.payload.a} onCommit={(a) => handleUpdate({ a })} disabled={node.in.a !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"b"} type={SocketTypes.toCSS(typeB)} label={"B"}>
                <DecimalInput value={node.payload.b} onCommit={(b) => handleUpdate({ b })} disabled={node.in.b !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"t"} type={"float integer"} label={"T"}>
                <DecimalInput value={node.payload.t} onCommit={(t) => handleUpdate({ t })} disabled={node.in.t !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<LerpDefinition>, outSocket: "output", _deps: AllDeps): (keyof LerpDefinition["inputs"])[] => {
    if (outSocket === "output") return ["a", "b", "t"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<LerpDefinition>, _inSocket: keyof LerpDefinition["inputs"], _deps: AllDeps): (keyof LerpDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<LerpDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const aVal = context.resolve(node.id, "a");
        const bVal = context.resolve(node.id, "b");
        const aKind = aVal?.kind ?? "float";
        const bKind = bVal?.kind ?? "float";
        const aData = aVal?.data ?? node.payload.a;
        const bData = bVal?.data ?? node.payload.b;
        const { a, b, unit } = extractPair(aKind, aData, bKind, bData);

        const tVal = context.resolve(node.id, "t");
        const tData = tVal?.data ?? node.payload.t;
        const { value: t } = extractSingle(tVal?.kind ?? "float", tData);

        const outputKind = dominantKind(aKind, bKind);
        return wrapResult(a + (b - a) * t, outputKind, unit);
    }
    return null;
};

const setPayload = (nodeId: string, updates: Partial<LerpDefinition["payload"]>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const current = ctx.getNode(graphId, nodeId);
    if (!current) return;
    ctx.setNode(graphId, nodeId, {
        ...current,
        payload: { ...current.payload, ...updates } as NodeDefinitions.NodeFor<NodeDefinitions.Any>["payload"],
    });
};

const onConnect = (node: LerpNode, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    const link = ctx.getLink(graphId, linkId);
    if (!link) return;

    if (direction === "in") {
        const socket = link.toSocket as "a" | "b" | "t";
        if (socket === "t") return;

        const upstreamType = queryUpstreamOutType(node, socket, graphId, ctx);
        const payloadKey = socket === "a" ? "connectedTypeA" : "connectedTypeB";

        setPayload(node.id, { [payloadKey]: upstreamType }, graphId, ctx);

        const otherSocket = socket === "a" ? "b" : "a";
        ctx.requestRefresh(graphId, node.id, otherSocket, "in", "constraintAdded");
        ctx.requestRefresh(graphId, node.id, "output", "out", "constraintAdded");
    } else {
        const currentNode = ctx.getNode(graphId, node.id) as LerpNode | undefined;
        if (!currentNode) return;
        const downstreamTypes = queryDownstreamTypes(currentNode, graphId, ctx);
        if (downstreamTypes !== null) {
            const newInTypes = SocketTypes.intersect(currentNode.payload.resolvedInTypes, downstreamTypes);
            if (!SocketTypes.equals(newInTypes, currentNode.payload.resolvedInTypes)) {
                setPayload(node.id, { resolvedInTypes: newInTypes }, graphId, ctx);
                ctx.requestRefresh(graphId, node.id, "a", "in", "constraintAdded");
                ctx.requestRefresh(graphId, node.id, "b", "in", "constraintAdded");
            }
        }
    }
};

const onDisconnect = (node: LerpNode, link: { fromNode: string; fromSocket: string; toNode: string; toSocket: string }, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    if (direction === "in") {
        const socket = link.toSocket as "a" | "b" | "t";
        if (socket === "t") return;

        const otherSocket = socket === "a" ? "b" : "a";
        const payloadKey = socket === "a" ? "connectedTypeA" : "connectedTypeB";

        ctx.requestRefresh(graphId, node.id, otherSocket, "in", "constraintRemoved");
        ctx.requestRefresh(graphId, node.id, "output", "out", "constraintRemoved");

        setPayload(node.id, { [payloadKey]: SocketTypes.NONE }, graphId, ctx);

        ctx.requestRefresh(graphId, node.id, otherSocket, "in", "constraintAdded");
        ctx.requestRefresh(graphId, node.id, "output", "out", "constraintAdded");
    } else {
        ctx.requestRefresh(graphId, node.id, "a", "in", "constraintRemoved");
        ctx.requestRefresh(graphId, node.id, "b", "in", "constraintRemoved");

        const currentNode = ctx.getNode(graphId, node.id) as LerpNode | undefined;
        if (!currentNode) return;
        const downstream = queryDownstreamTypes(currentNode, graphId, ctx);
        setPayload(node.id, { resolvedInTypes: downstream ?? SocketTypes.ANY }, graphId, ctx);

        ctx.requestRefresh(graphId, node.id, "a", "in", "constraintAdded");
        ctx.requestRefresh(graphId, node.id, "b", "in", "constraintAdded");
    }
};

const onRefreshRequest = (node: LerpNode, socketId: string, side: "in" | "out", reason: NodeTypes.RefreshReason, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const currentNode = ctx.getNode(graphId, node.id) as LerpNode | undefined;
    if (!currentNode) return;

    if (side === "in") {
        if (socketId === "t") return;

        const newUpstreamType = queryUpstreamOutType(currentNode, socketId, graphId, ctx);
        const payloadKey = socketId === "a" ? "connectedTypeA" : "connectedTypeB";
        const oldType = socketId === "a" ? currentNode.payload.connectedTypeA : currentNode.payload.connectedTypeB;

        if (!SocketTypes.equals(newUpstreamType, oldType)) {
            setPayload(node.id, { [payloadKey]: newUpstreamType }, graphId, ctx);

            const otherSocket = socketId === "a" ? "b" : "a";
            ctx.requestRefresh(graphId, node.id, otherSocket, "in", reason);
            ctx.requestRefresh(graphId, node.id, "output", "out", reason);
        }
    } else {
        const newInTypes = queryDownstreamTypes(currentNode, graphId, ctx) ?? SocketTypes.ANY;
        if (!SocketTypes.equals(newInTypes, currentNode.payload.resolvedInTypes)) {
            setPayload(node.id, { resolvedInTypes: newInTypes }, graphId, ctx);
            ctx.requestRefresh(graphId, node.id, "a", "in", reason);
            ctx.requestRefresh(graphId, node.id, "b", "in", reason);
        }
    }
};

const getSocketType = (node: NodeDefinitions.NodeFor<LerpDefinition>, socketId: string, _side: "in" | "out", _ctx: NodeTypes.MethodContext): SocketTypes.SocketRule => {
    const { connectedTypeA, connectedTypeB, resolvedInTypes } = node.payload;
    const effectiveA = effectiveInputType(connectedTypeA, connectedTypeB, resolvedInTypes);
    const effectiveB = effectiveInputType(connectedTypeB, connectedTypeA, resolvedInTypes);
    switch (socketId) {
        case "a":
            return effectiveA;
        case "b":
            return effectiveB;
        case "t":
            return DIMENSIONLESS_IN;
        case "output":
            return computeOutputType(effectiveA, effectiveB);
        default:
            return NUMERIC_TYPES;
    }
};

export const LerpType: NodeTypes.Type<"lerp", LerpDefinition> = {
    type: "lerp",
    displayName: "Lerp",
    defaultLabel: "Lerp",
    iconNode: <Icon shape={NODE_ICONS.lerp.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.lerp.Card} color={"var(--icon-flavour)"} />,
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
