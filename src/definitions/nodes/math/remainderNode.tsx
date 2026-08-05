import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { NUMERIC_TYPES, constrainForPartnerMultiplicative, constrainForOutput, computeOutputType, queryUpstreamOutType, extractPair, dominantKind, wrapResult, numericCanInterject, makeOnInterject } from "./numericMath";

export type RemainderDefinition = {
    inputs: {
        a: DataTypes.Use<"float">;
        b: DataTypes.Use<"float">;
    };
    outputs: {
        output: DataTypes.Use<"float">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        connectedTypeA: SocketTypes.SocketRule;
        connectedTypeB: SocketTypes.SocketRule;
        resolvedInTypes: SocketTypes.SocketRule;
    };
};

type RemainderNode = NodeDefinitions.BuiltNodeOf<"remainder", RemainderDefinition>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<RemainderDefinition>>, id: string = nanoid()): RemainderNode => {
    return {
        id,
        in: {
            a: null,
            b: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            connectedTypeA: SocketTypes.NONE,
            connectedTypeB: SocketTypes.NONE,
            resolvedInTypes: SocketTypes.ANY,
        },
        type: "remainder",
    };
};

// --- Helpers ---

const effectiveInputType = (connectedType: SocketTypes.SocketRule, partnerType: SocketTypes.SocketRule, resolvedInTypes: SocketTypes.SocketRule): SocketTypes.SocketRule => {
    if (connectedType.types.length > 0) return connectedType;
    const forward = constrainForPartnerMultiplicative(partnerType);
    const backward = constrainForOutput(resolvedInTypes, partnerType);
    return SocketTypes.intersect(forward, backward);
};

const queryDownstreamTypes = (node: RemainderNode, graphId: string, ctx: NodeTypes.MethodContext): SocketTypes.SocketRule | null => {
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

// --- Controls ---

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<RemainderDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "output");
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} label={"Output"}>
                <ValuePreview value={preview} />
            </SocketOut>
            <SocketIn node={node} socketId={"a"}>
                A
            </SocketIn>
            <SocketIn node={node} socketId={"b"}>
                B
            </SocketIn>
        </TypicalNode>
    );
};

// --- Evaluation ---

const dependsOn = (_node: NodeDefinitions.NodeFor<RemainderDefinition>, outSocket: "output", _deps: AllDeps): (keyof RemainderDefinition["inputs"])[] => {
    if (outSocket === "output") return ["a", "b"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<RemainderDefinition>, _inSocket: keyof RemainderDefinition["inputs"], _deps: AllDeps): (keyof RemainderDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<RemainderDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const aVal = context.resolve(node.id, "a");
        const bVal = context.resolve(node.id, "b");
        if (!aVal || !bVal) return null;
        const { a, b, unit } = extractPair(aVal.kind, aVal.data, bVal.kind, bVal.data);
        const outputKind = dominantKind(aVal.kind, bVal.kind);
        return wrapResult(b === 0 ? 0 : a % b, outputKind, unit);
    }
    return null;
};

// --- Lifecycle hooks ---

const setPayload = (nodeId: string, updates: Partial<RemainderDefinition["payload"]>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const current = ctx.getNode(graphId, nodeId);
    if (!current) return;
    ctx.setNode(graphId, nodeId, {
        ...current,
        payload: { ...current.payload, ...updates },
    });
};

const onConnect = (node: RemainderNode, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    const link = ctx.getLink(graphId, linkId);
    if (!link) return;

    if (direction === "in") {
        const socket = link.toSocket as "a" | "b";
        const upstreamType = queryUpstreamOutType(node, socket, graphId, ctx);
        const payloadKey = socket === "a" ? "connectedTypeA" : "connectedTypeB";

        setPayload(node.id, { [payloadKey]: upstreamType }, graphId, ctx);

        const otherSocket = socket === "a" ? "b" : "a";
        ctx.requestRefresh(graphId, node.id, otherSocket, "in", "constraintAdded");
        ctx.requestRefresh(graphId, node.id, "output", "out", "constraintAdded");
    } else {
        const currentNode = ctx.getNode(graphId, node.id) as RemainderNode | undefined;
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

const onDisconnect = (
    node: RemainderNode,
    link: { fromNode: string; fromSocket: string; toNode: string; toSocket: string },
    direction: "in" | "out",
    graphId: string,
    ctx: NodeTypes.MethodContext,
): void => {
    if (direction === "in") {
        const socket = link.toSocket as "a" | "b";
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

        const currentNode = ctx.getNode(graphId, node.id) as RemainderNode | undefined;
        if (!currentNode) return;
        const downstream = queryDownstreamTypes(currentNode, graphId, ctx);
        setPayload(node.id, { resolvedInTypes: downstream ?? SocketTypes.ANY }, graphId, ctx);

        ctx.requestRefresh(graphId, node.id, "a", "in", "constraintAdded");
        ctx.requestRefresh(graphId, node.id, "b", "in", "constraintAdded");
    }
};

const onRefreshRequest = (node: RemainderNode, socketId: string, side: "in" | "out", reason: NodeTypes.RefreshReason, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const currentNode = ctx.getNode(graphId, node.id) as RemainderNode | undefined;
    if (!currentNode) return;

    if (side === "in") {
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

// --- getSocketType ---

const getSocketType = (node: NodeDefinitions.NodeFor<RemainderDefinition>, socketId: string, _side: "in" | "out", _ctx: NodeTypes.MethodContext): SocketTypes.SocketRule => {
    const { connectedTypeA, connectedTypeB, resolvedInTypes } = node.payload;
    const effectiveA = effectiveInputType(connectedTypeA, connectedTypeB, resolvedInTypes);
    const effectiveB = effectiveInputType(connectedTypeB, connectedTypeA, resolvedInTypes);
    switch (socketId) {
        case "a":
            return effectiveA;
        case "b":
            return effectiveB;
        case "output":
            return computeOutputType(effectiveA, effectiveB);
        default:
            return NUMERIC_TYPES;
    }
};

export const RemainderType: NodeTypes.Type<"remainder", RemainderDefinition> = {
    type: "remainder",
    displayName: "Remainder",
    defaultLabel: "Remainder",
    iconNode: <NodeIcon shape={NODE_ICONS.percent} />,
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
    canInterject: numericCanInterject,
    onInterject: makeOnInterject("a", "output"),
};
