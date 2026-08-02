import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { Resolver } from "../../../util/resolver";
import { NUMERIC_TYPES, constrainForPartner, queryUpstreamOutType, extractPair } from "../math/numericMath";

export type BetweenDefinition = {
    inputs: {
        value: DataTypes.Use<"float">;
        min: DataTypes.Use<"float">;
        max: DataTypes.Use<"float">;
    };
    outputs: {
        output: DataTypes.Use<"boolean">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        connectedTypeValue: SocketTypes.SocketRule;
        connectedTypeMin: SocketTypes.SocketRule;
        connectedTypeMax: SocketTypes.SocketRule;
    };
};

type BetweenNode = NodeDefinitions.BuiltNodeOf<"between", BetweenDefinition>;

const INPUT_SOCKETS = ["value", "min", "max"] as const;
type InputSocket = (typeof INPUT_SOCKETS)[number];

const PAYLOAD_KEYS: Record<InputSocket, keyof BetweenDefinition["payload"]> = {
    value: "connectedTypeValue",
    min: "connectedTypeMin",
    max: "connectedTypeMax",
};

/** Compute the effective type for a socket based on its own and all partners' connected types */
const effectiveInputType = (own: SocketTypes.SocketRule, ...partners: SocketTypes.SocketRule[]): SocketTypes.SocketRule => {
    if (own.types.length > 0) return own;
    let combined = SocketTypes.NONE;
    for (const p of partners) {
        if (p.types.length > 0) {
            combined = combined.types.length === 0 ? p : SocketTypes.union(combined, p);
        }
    }
    return constrainForPartner(combined);
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<BetweenDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"between", BetweenDefinition> => {
    return {
        id,
        in: { value: null, min: null, max: null },
        out: { output: [] },
        payload: {
            label: "",
            connectedTypeValue: SocketTypes.NONE,
            connectedTypeMin: SocketTypes.NONE,
            connectedTypeMax: SocketTypes.NONE,
        },
        type: "between",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<BetweenDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
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
            <SocketIn node={node} socketId={"min"}>
                Min
            </SocketIn>
            <SocketIn node={node} socketId={"max"}>
                Max
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<BetweenDefinition>, outSocket: "output", _deps: AllDeps): (keyof BetweenDefinition["inputs"])[] => {
    if (outSocket === "output") return ["value", "min", "max"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<BetweenDefinition>, _inSocket: keyof BetweenDefinition["inputs"], _deps: AllDeps): (keyof BetweenDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<BetweenDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const valEval = context.resolve(node.id, "value");
    const minEval = context.resolve(node.id, "min");
    const maxEval = context.resolve(node.id, "max");
    if (!valEval || !minEval || !maxEval) return null;

    // Extract value and min as a pair (handles length unit conversion)
    const { a: val, b: mn } = extractPair(valEval.kind, valEval.data, minEval.kind, minEval.data);
    // Extract value and max as a pair (same unit reference from value)
    const { b: mx } = extractPair(valEval.kind, valEval.data, maxEval.kind, maxEval.data);

    return { kind: "boolean", data: val >= mn && val <= mx };
};

// --- Lifecycle hooks ---

const setPayload = (nodeId: string, updates: Partial<BetweenDefinition["payload"]>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const current = ctx.getNode(graphId, nodeId);
    if (!current) return;
    ctx.setNode(graphId, nodeId, {
        ...current,
        payload: { ...current.payload, ...updates },
    });
};

const otherSockets = (socket: InputSocket): InputSocket[] => INPUT_SOCKETS.filter((s) => s !== socket);

const onConnect = (node: BetweenNode, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
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
    node: BetweenNode,
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

const onRefreshRequest = (node: BetweenNode, socketId: string, side: "in" | "out", reason: NodeTypes.RefreshReason, graphId: string, ctx: NodeTypes.MethodContext): void => {
    if (side === "out") return;

    const currentNode = ctx.getNode(graphId, node.id) as BetweenNode | undefined;
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

const getSocketType = (node: NodeDefinitions.NodeFor<BetweenDefinition>, socketId: string, _side: "in" | "out", _ctx: NodeTypes.MethodContext): SocketTypes.SocketRule => {
    const { connectedTypeValue, connectedTypeMin, connectedTypeMax } = node.payload;
    switch (socketId) {
        case "value":
            return effectiveInputType(connectedTypeValue, connectedTypeMin, connectedTypeMax);
        case "min":
            return effectiveInputType(connectedTypeMin, connectedTypeValue, connectedTypeMax);
        case "max":
            return effectiveInputType(connectedTypeMax, connectedTypeValue, connectedTypeMin);
        case "output":
            return SocketTypes.of("boolean");
        default:
            return NUMERIC_TYPES;
    }
};

export const BetweenNodeType: NodeTypes.Type<"between", BetweenDefinition> = {
    type: "between",
    displayName: "Between",
    defaultLabel: "Between",
    iconNode: <Icon shape={NODE_ICONS.tilde} color={"var(--icon-flavour)"} />,
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
