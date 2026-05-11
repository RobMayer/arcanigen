import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { Resolver } from "../../../util/resolver";
import { NUMERIC_TYPES, queryUpstreamOutType, extractPair } from "../math/numericMath";
import { BinaryComparisonDefinition, effectiveInputType, setPayload } from "./comparisonUtils";

export type GreaterOrEqualDefinition = BinaryComparisonDefinition;

type GreaterOrEqualNode = NodeDefinitions.BuiltNodeOf<"greaterOrEqual", GreaterOrEqualDefinition>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<GreaterOrEqualDefinition>>, id: string = nanoid()): GreaterOrEqualNode => {
    return {
        id,
        in: { a: null, b: null },
        out: { output: [] },
        payload: {
            label: "",
            connectedTypeA: SocketTypes.NONE,
            connectedTypeB: SocketTypes.NONE,
        },
        type: "greaterOrEqual",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<GreaterOrEqualDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
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

const dependsOn = (_node: NodeDefinitions.NodeFor<GreaterOrEqualDefinition>, outSocket: "output", _deps: AllDeps): (keyof GreaterOrEqualDefinition["inputs"])[] => {
    if (outSocket === "output") return ["a", "b"];
    return [];
};

const contributesTo = (
    _node: NodeDefinitions.NodeFor<GreaterOrEqualDefinition>,
    _inSocket: keyof GreaterOrEqualDefinition["inputs"],
    _deps: AllDeps,
): (keyof GreaterOrEqualDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<GreaterOrEqualDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;
    const aVal = context.resolve(node.id, "a");
    const bVal = context.resolve(node.id, "b");
    if (!aVal || !bVal) return null;
    const { a, b } = extractPair(aVal.kind, aVal.data, bVal.kind, bVal.data);
    return { kind: "boolean", data: a >= b };
};

// --- Lifecycle hooks ---

const onConnect = (node: GreaterOrEqualNode, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
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
    node: GreaterOrEqualNode,
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

const onRefreshRequest = (node: GreaterOrEqualNode, socketId: string, side: "in" | "out", reason: NodeTypes.RefreshReason, graphId: string, ctx: NodeTypes.MethodContext): void => {
    if (side === "out") return;

    const currentNode = ctx.getNode(graphId, node.id) as GreaterOrEqualNode | undefined;
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

const getSocketType = (node: NodeDefinitions.NodeFor<GreaterOrEqualDefinition>, socketId: string, _side: "in" | "out", _ctx: NodeTypes.MethodContext): SocketTypes.SocketRule => {
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

export const GreaterOrEqualNodeType: NodeTypes.Type<"greaterOrEqual", GreaterOrEqualDefinition> = {
    type: "greaterOrEqual",
    displayName: "Greater or Equal",
    defaultLabel: "Greater or Equal",
    iconNode: <Icon shape={NODE_ICONS.greaterEqual} color={"var(--icon-flavour)"} />,
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
