import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { Resolver } from "../../../util/resolver";
import { NUMERIC_TYPES, constrainForPartner, queryUpstreamOutType, extractPair } from "../math/numericMath";

export type WithinDefinition = {
    inputs: {
        value: DataTypes.Use<"float">;
        target: DataTypes.Use<"float">;
        tolerance: DataTypes.Use<"float">;
    };
    outputs: {
        output: DataTypes.Use<"boolean">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        connectedTypeValue: SocketTypes.SocketRule;
        connectedTypeTarget: SocketTypes.SocketRule;
        connectedTypeTolerance: SocketTypes.SocketRule;
    };
};

type WithinNode = NodeDefinitions.BuiltNodeOf<"within", WithinDefinition>;

const INPUT_SOCKETS = ["value", "target", "tolerance"] as const;
type InputSocket = (typeof INPUT_SOCKETS)[number];

const PAYLOAD_KEYS: Record<InputSocket, keyof WithinDefinition["payload"]> = {
    value: "connectedTypeValue",
    target: "connectedTypeTarget",
    tolerance: "connectedTypeTolerance",
};

/** Compute the effective type for a socket based on its own and all partners' connected types */
const effectiveInputType = (own: SocketTypes.SocketRule, ...partners: SocketTypes.SocketRule[]): SocketTypes.SocketRule => {
    if (own.types.length > 0) return own;
    // Union all partner connected types, then constrain
    let combined = SocketTypes.NONE;
    for (const p of partners) {
        if (p.types.length > 0) {
            combined = combined.types.length === 0 ? p : SocketTypes.union(combined, p);
        }
    }
    return constrainForPartner(combined);
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<WithinDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"within", WithinDefinition> => {
    return {
        id,
        in: { value: null, target: null, tolerance: null },
        out: { output: [] },
        payload: {
            label: "",
            connectedTypeValue: SocketTypes.NONE,
            connectedTypeTarget: SocketTypes.NONE,
            connectedTypeTolerance: SocketTypes.NONE,
        },
        type: "within",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<WithinDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "output");
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} label={"Output"}>
                <ValuePreview value={preview} />
            </SocketOut>
            <SocketIn node={node} socketId={"value"}>
                Value
            </SocketIn>
            <SocketIn node={node} socketId={"target"}>
                Target
            </SocketIn>
            <SocketIn node={node} socketId={"tolerance"}>
                Tolerance
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<WithinDefinition>, outSocket: "output", _deps: AllDeps): (keyof WithinDefinition["inputs"])[] => {
    if (outSocket === "output") return ["value", "target", "tolerance"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<WithinDefinition>, _inSocket: keyof WithinDefinition["inputs"], _deps: AllDeps): (keyof WithinDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<WithinDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const valEval = context.resolve(node.id, "value");
    const tgtEval = context.resolve(node.id, "target");
    const tolEval = context.resolve(node.id, "tolerance");
    if (!valEval || !tgtEval || !tolEval) return null;

    // Extract value and target as a pair (handles length unit conversion)
    const { a: val, b: tgt } = extractPair(valEval.kind, valEval.data, tgtEval.kind, tgtEval.data);
    // Extract tolerance — also paired with value for unit conversion
    const { a: _, b: tol } = extractPair(valEval.kind, valEval.data, tolEval.kind, tolEval.data);

    return { kind: "boolean", data: Math.abs(val - tgt) <= tol };
};

// --- Lifecycle hooks ---

const setPayload = (nodeId: string, updates: Partial<WithinDefinition["payload"]>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const current = ctx.getNode(graphId, nodeId);
    if (!current) return;
    ctx.setNode(graphId, nodeId, {
        ...current,
        payload: { ...current.payload, ...updates },
    });
};

const otherSockets = (socket: InputSocket): InputSocket[] => INPUT_SOCKETS.filter((s) => s !== socket);

const onConnect = (node: WithinNode, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    if (direction === "out") return;
    const link = ctx.getLink(graphId, linkId);
    if (!link) return;

    const socket = link.toSocket as InputSocket;
    const upstreamType = queryUpstreamOutType(node, socket, graphId, ctx);
    setPayload(node.id, { [PAYLOAD_KEYS[socket]]: upstreamType }, graphId, ctx);

    for (const other of otherSockets(socket)) {
        ctx.requestRefresh(graphId, node.id, other, "in", "constraintAdded");
    }
};

const onDisconnect = (
    node: WithinNode,
    link: { fromNode: string; fromSocket: string; toNode: string; toSocket: string },
    direction: "in" | "out",
    graphId: string,
    ctx: NodeTypes.MethodContext,
): void => {
    if (direction === "out") return;

    const socket = link.toSocket as InputSocket;
    const others = otherSockets(socket);

    // Phase 1: constraintRemoved
    for (const other of others) {
        ctx.requestRefresh(graphId, node.id, other, "in", "constraintRemoved");
    }

    // Phase 2: update payload
    setPayload(node.id, { [PAYLOAD_KEYS[socket]]: SocketTypes.NONE }, graphId, ctx);

    // Phase 3: constraintAdded
    for (const other of others) {
        ctx.requestRefresh(graphId, node.id, other, "in", "constraintAdded");
    }
};

const onRefreshRequest = (node: WithinNode, socketId: string, side: "in" | "out", reason: NodeTypes.RefreshReason, graphId: string, ctx: NodeTypes.MethodContext): void => {
    if (side === "out") return;

    const currentNode = ctx.getNode(graphId, node.id) as WithinNode | undefined;
    if (!currentNode) return;

    const socket = socketId as InputSocket;
    const newUpstreamType = queryUpstreamOutType(currentNode, socketId, graphId, ctx);
    const oldType = currentNode.payload[PAYLOAD_KEYS[socket]] as SocketTypes.SocketRule;

    if (!SocketTypes.equals(newUpstreamType, oldType)) {
        setPayload(node.id, { [PAYLOAD_KEYS[socket]]: newUpstreamType }, graphId, ctx);

        for (const other of otherSockets(socket)) {
            ctx.requestRefresh(graphId, node.id, other, "in", reason);
        }
    }
};

// --- getSocketType ---

const getSocketType = (node: NodeDefinitions.NodeFor<WithinDefinition>, socketId: string, _side: "in" | "out", _ctx: NodeTypes.MethodContext): SocketTypes.SocketRule => {
    const { connectedTypeValue, connectedTypeTarget, connectedTypeTolerance } = node.payload;
    switch (socketId) {
        case "value":
            return effectiveInputType(connectedTypeValue, connectedTypeTarget, connectedTypeTolerance);
        case "target":
            return effectiveInputType(connectedTypeTarget, connectedTypeValue, connectedTypeTolerance);
        case "tolerance":
            return effectiveInputType(connectedTypeTolerance, connectedTypeValue, connectedTypeTarget);
        case "output":
            return SocketTypes.of("boolean");
        default:
            return NUMERIC_TYPES;
    }
};

export const WithinNodeType: NodeTypes.Type<"within", WithinDefinition> = {
    type: "within",
    displayName: "Within",
    defaultLabel: "Within",
    iconNode: <NodeIcon shape={NODE_ICONS.plusMinus} />,
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
