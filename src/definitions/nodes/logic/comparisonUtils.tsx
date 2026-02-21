import { nanoid } from "nanoid";
import { Icon } from "../../../components/Icon";
import { ICONS } from "../../../components/Icon";
import { ReactNode } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { NUMERIC_TYPES, constrainForPartner, queryUpstreamOutType, extractPair } from "../math/numericMath";

// --- Shared Definition ---

export type BinaryComparisonDefinition = {
    inputs: {
        a: DataTypes.Use<"float">;
        b: DataTypes.Use<"float">;
    };
    outputs: {
        output: DataTypes.Use<"boolean">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        connectedTypeA: SocketTypes.SocketRule;
        connectedTypeB: SocketTypes.SocketRule;
    };
};

// Use `any` for key param — factory is only called with registered type keys
type BinaryComparisonNode = NodeDefinitions.BuiltNodeOf<any, BinaryComparisonDefinition>;

// --- Helpers ---

/** Compute the effective type for an input socket given its connected type and the partner's connected type */
const effectiveInputType = (connectedType: SocketTypes.SocketRule, partnerType: SocketTypes.SocketRule): SocketTypes.SocketRule => {
    if (connectedType.types.length > 0) return connectedType;
    return constrainForPartner(partnerType);
};

const setPayload = (nodeId: string, updates: Partial<BinaryComparisonDefinition["payload"]>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const current = ctx.getNode(graphId, nodeId);
    if (!current) return;
    ctx.setNode(graphId, nodeId, {
        ...current,
        payload: { ...current.payload, ...updates } as NodeDefinitions.NodeFor<NodeDefinitions.Any>["payload"],
    });
};

// --- Factory ---

export const createBinaryComparisonNode = (config: {
    type: string;
    displayName: string;
    defaultLabel: string;
    compare: (a: number, b: number) => boolean;
}): NodeTypes.Type<any, BinaryComparisonDefinition> => {
    const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<BinaryComparisonDefinition>>, id: string = nanoid()): BinaryComparisonNode => {
        return {
            id,
            in: { a: null, b: null },
            out: { output: [] },
            payload: {
                label: "",
                connectedTypeA: SocketTypes.NONE,
                connectedTypeB: SocketTypes.NONE,
            },
            type: config.type as NodeTypes.Key,
        };
    };

    const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<BinaryComparisonDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
        const { connectedTypeA, connectedTypeB } = node.payload;
        const typeA = effectiveInputType(connectedTypeA, connectedTypeB);
        const typeB = effectiveInputType(connectedTypeB, connectedTypeA);

        return (
            <TypicalNode node={node} methods={methods}>
                <SocketOut node={node} socketId={"output"} type={"boolean"}>
                    Output
                </SocketOut>
                <SocketIn node={node} socketId={"a"} type={SocketTypes.toCSS(typeA)}>A</SocketIn>
                <SocketIn node={node} socketId={"b"} type={SocketTypes.toCSS(typeB)}>B</SocketIn>
            </TypicalNode>
        );
    };

    const dependsOn = (_node: NodeDefinitions.NodeFor<BinaryComparisonDefinition>, outSocket: "output", _deps: AllDeps): (keyof BinaryComparisonDefinition["inputs"])[] => {
        if (outSocket === "output") return ["a", "b"];
        return [];
    };

    const contributesTo = (_node: NodeDefinitions.NodeFor<BinaryComparisonDefinition>, _inSocket: keyof BinaryComparisonDefinition["inputs"], _deps: AllDeps): (keyof BinaryComparisonDefinition["outputs"])[] => {
        return ["output"];
    };

    const evaluate = (node: NodeDefinitions.NodeFor<BinaryComparisonDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
        if (socket === "output") {
            const aVal = context.resolve(node.id, "a");
            const bVal = context.resolve(node.id, "b");
            if (!aVal || !bVal) return null;
            const { a, b } = extractPair(aVal.kind, aVal.data, bVal.kind, bVal.data);
            return { kind: "boolean", data: config.compare(a, b) };
        }
        return null;
    };

    // --- Lifecycle hooks ---

    const onConnect = (node: BinaryComparisonNode, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
        if (direction === "out") return; // No backward propagation
        const link = ctx.getLink(graphId, linkId);
        if (!link) return;

        const socket = link.toSocket as "a" | "b";
        const upstreamType = queryUpstreamOutType(node, socket, graphId, ctx);
        const payloadKey = socket === "a" ? "connectedTypeA" : "connectedTypeB";

        setPayload(node.id, { [payloadKey]: upstreamType }, graphId, ctx);

        const otherSocket = socket === "a" ? "b" : "a";
        ctx.requestRefresh(graphId, node.id, otherSocket, "in", "constraintAdded");
    };

    const onDisconnect = (node: BinaryComparisonNode, link: { fromNode: string; fromSocket: string; toNode: string; toSocket: string }, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
        if (direction === "out") return; // No backward propagation

        const socket = link.toSocket as "a" | "b";
        const otherSocket = socket === "a" ? "b" : "a";
        const payloadKey = socket === "a" ? "connectedTypeA" : "connectedTypeB";

        // Phase 1: constraintRemoved
        ctx.requestRefresh(graphId, node.id, otherSocket, "in", "constraintRemoved");

        // Phase 2: update payload
        setPayload(node.id, { [payloadKey]: SocketTypes.NONE }, graphId, ctx);

        // Phase 3: constraintAdded
        ctx.requestRefresh(graphId, node.id, otherSocket, "in", "constraintAdded");
    };

    const onRefreshRequest = (node: BinaryComparisonNode, socketId: string, side: "in" | "out", reason: NodeTypes.RefreshReason, graphId: string, ctx: NodeTypes.MethodContext): void => {
        if (side === "out") return; // No backward propagation

        const currentNode = ctx.getNode(graphId, node.id) as BinaryComparisonNode | undefined;
        if (!currentNode) return;

        const newUpstreamType = queryUpstreamOutType(currentNode, socketId, graphId, ctx);
        const payloadKey = socketId === "a" ? "connectedTypeA" : "connectedTypeB";
        const oldType = socketId === "a" ? currentNode.payload.connectedTypeA : currentNode.payload.connectedTypeB;

        if (!SocketTypes.equals(newUpstreamType, oldType)) {
            setPayload(node.id, { [payloadKey]: newUpstreamType }, graphId, ctx);

            const otherSocket = socketId === "a" ? "b" : "a";
            ctx.requestRefresh(graphId, node.id, otherSocket, "in", reason);
        }
    };

    // --- getSocketType ---

    const getSocketType = (node: NodeDefinitions.NodeFor<BinaryComparisonDefinition>, socketId: string, _side: "in" | "out", _ctx: NodeTypes.MethodContext): SocketTypes.SocketRule => {
        const { connectedTypeA, connectedTypeB } = node.payload;
        switch (socketId) {
            case "a":
                return effectiveInputType(connectedTypeA, connectedTypeB);
            case "b":
                return effectiveInputType(connectedTypeB, connectedTypeA);
            case "output":
                return SocketTypes.of("boolean");
            default:
                return NUMERIC_TYPES;
        }
    };

    return {
        type: config.type,
        displayName: config.displayName,
        defaultLabel: config.defaultLabel,
        iconNode: <Icon shape={ICONS.Blank} color={"var(--icon-flavour)"} />,
        category: "Logic",
        create,
        dependsOn,
        contributesTo,
        evaluate,
        Controls,
        getSocketType,
        onConnect,
        onDisconnect,
        onRefreshRequest,
    };
};
