import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { Resolver } from "../../../util/resolver";
import { NUMERIC_TYPES, queryUpstreamOutType, extractPair } from "../math/numericMath";
import { BinaryComparisonDefinition, effectiveInputType, setPayload } from "./comparisonUtils";

export type GreaterThanDefinition = BinaryComparisonDefinition;

type GreaterThanNode = NodeDefinitions.BuiltNodeOf<"greaterThan", GreaterThanDefinition>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<GreaterThanDefinition>>, id: string = nanoid()): GreaterThanNode => {
    return {
        id,
        in: { a: null, b: null },
        out: { output: [] },
        payload: {
            label: "",
            connectedTypeA: SocketTypes.NONE,
            connectedTypeB: SocketTypes.NONE,
        },
        type: "greaterThan",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<GreaterThanDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
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

const dependsOn = (_node: NodeDefinitions.NodeFor<GreaterThanDefinition>, outSocket: "output", _deps: AllDeps): (keyof GreaterThanDefinition["inputs"])[] => {
    if (outSocket === "output") return ["a", "b"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<GreaterThanDefinition>, _inSocket: keyof GreaterThanDefinition["inputs"], _deps: AllDeps): (keyof GreaterThanDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<GreaterThanDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;
    const aVal = context.resolve(node.id, "a");
    const bVal = context.resolve(node.id, "b");
    if (!aVal || !bVal) return null;
    const { a, b } = extractPair(aVal.kind, aVal.data, bVal.kind, bVal.data);
    return { kind: "boolean", data: a > b };
};

// --- Lifecycle hooks ---

const onConnect = (node: GreaterThanNode, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    if (direction === "out") return;
    const link = ctx.getLink(graphId, linkId);
    if (!link) return;

    const socket = link.toSocket as "a" | "b";
    const upstreamType = queryUpstreamOutType(node, socket, graphId, ctx);
    const payloadKey = socket === "a" ? "connectedTypeA" : "connectedTypeB";

    setPayload(node.id, { [payloadKey]: upstreamType }, graphId, ctx);

    const otherSocket = socket === "a" ? "b" : "a";
    ctx.requestRefresh(graphId, node.id, otherSocket, "in", "constraintAdded");
};

const onDisconnect = (
    node: GreaterThanNode,
    link: { fromNode: string; fromSocket: string; toNode: string; toSocket: string },
    direction: "in" | "out",
    graphId: string,
    ctx: NodeTypes.MethodContext,
): void => {
    if (direction === "out") return;

    const socket = link.toSocket as "a" | "b";
    const otherSocket = socket === "a" ? "b" : "a";
    const payloadKey = socket === "a" ? "connectedTypeA" : "connectedTypeB";

    ctx.requestRefresh(graphId, node.id, otherSocket, "in", "constraintRemoved");
    setPayload(node.id, { [payloadKey]: SocketTypes.NONE }, graphId, ctx);
    ctx.requestRefresh(graphId, node.id, otherSocket, "in", "constraintAdded");
};

const onRefreshRequest = (node: GreaterThanNode, socketId: string, side: "in" | "out", reason: NodeTypes.RefreshReason, graphId: string, ctx: NodeTypes.MethodContext): void => {
    if (side === "out") return;

    const currentNode = ctx.getNode(graphId, node.id) as GreaterThanNode | undefined;
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

const getSocketType = (node: NodeDefinitions.NodeFor<GreaterThanDefinition>, socketId: string, _side: "in" | "out", _ctx: NodeTypes.MethodContext): SocketTypes.SocketRule => {
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

export const GreaterThanNodeType: NodeTypes.Type<"greaterThan", GreaterThanDefinition> = {
    type: "greaterThan",
    displayName: "Greater Than",
    defaultLabel: "Greater Than",
    iconNode: <NodeIcon shape={NODE_ICONS.greater} />,
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
