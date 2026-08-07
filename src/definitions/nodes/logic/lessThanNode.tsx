import { nanoid } from "nanoid";
import { queryUpstreamOutType } from "../nodeHelpers";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { Resolver } from "../../../util/resolver";
import { NUMERIC_TYPES, extractPair } from "../math/numericMath";
import { BinaryComparisonDefinition, effectiveInputType, setPayload } from "./comparisonUtils";

export type LessThanDefinition = BinaryComparisonDefinition;

type LessThanNode = NodeDefinitions.BuiltNodeOf<"lessThan", LessThanDefinition>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<LessThanDefinition>>, id: string = nanoid()): LessThanNode => {
    return {
        id,
        in: { a: null, b: null },
        out: { output: [] },
        payload: {
            label: "",
            connectedTypeA: SocketTypes.NONE,
            connectedTypeB: SocketTypes.NONE,
        },
        type: "lessThan",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<LessThanDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
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

const dependsOn = (_node: NodeDefinitions.NodeFor<LessThanDefinition>, outSocket: "output", _deps: AllDeps): (keyof LessThanDefinition["inputs"])[] => {
    if (outSocket === "output") return ["a", "b"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<LessThanDefinition>, _inSocket: keyof LessThanDefinition["inputs"], _deps: AllDeps): (keyof LessThanDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<LessThanDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;
    const aVal = context.resolve(node.id, "a");
    const bVal = context.resolve(node.id, "b");
    if (!aVal || !bVal) return null;
    const { a, b } = extractPair(aVal.kind, aVal.data, bVal.kind, bVal.data);
    return { kind: "boolean", data: a < b };
};

// --- Lifecycle hooks ---

const onConnect = (node: LessThanNode, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
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
    node: LessThanNode,
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

const onRefreshRequest = (node: LessThanNode, socketId: string, side: "in" | "out", reason: NodeTypes.RefreshReason, graphId: string, ctx: NodeTypes.MethodContext): void => {
    if (side === "out") return;

    const currentNode = ctx.getNode(graphId, node.id) as LessThanNode | undefined;
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

const getSocketType = (node: NodeDefinitions.NodeFor<LessThanDefinition>, socketId: string, _side: "in" | "out", _ctx: NodeTypes.MethodContext): SocketTypes.SocketRule => {
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

export const LessThanNodeType: NodeTypes.Type<"lessThan", LessThanDefinition> = {
    type: "lessThan",
    displayName: "Less Than",
    defaultLabel: "Less Than",
    iconNode: <NodeIcon shape={NODE_ICONS.less} />,
    flavour: "help",
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
