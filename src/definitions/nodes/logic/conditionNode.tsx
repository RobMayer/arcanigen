import { nanoid } from "nanoid";
import { ICONS, Icon } from "../../../components/Icon";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { ArcaneGraph } from "../../../util/structs/arcaneGraph";

export type ConditionDefinition = {
    inputs: {
        if: DataTypes.Use<"boolean">;
        then: DataTypes.Any;
        else: DataTypes.Any;
    };
    outputs: {
        result: DataTypes.Any;
    };
    payload: {
        label: string;
        if: boolean;
        resolvedOutTypes: string;
        resolvedInTypes: string;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<ConditionDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"condition", ConditionDefinition> => {
    return {
        id,
        in: {
            if: null,
            then: null,
            else: null,
        },
        out: {
            result: [],
        },
        payload: {
            label: "",
            if: true,
            resolvedOutTypes: SocketTypes.NONE,
            resolvedInTypes: SocketTypes.ANY,
        },
        type: "condition",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ConditionDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const outType = node.payload.resolvedOutTypes;
    const inType = node.payload.resolvedInTypes;

    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ConditionDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"result"} type={outType}>
                Result
            </SocketOut>
            <SocketIn node={node} socketId={"if"} type={"boolean"}>
                <CheckBox checked={node.payload.if} onToggle={(v) => handleUpdate({ if: v })} disabled={node.in.if !== null}>
                    If
                </CheckBox>
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"then"} type={inType}>
                Then
            </SocketIn>
            <SocketIn node={node} socketId={"else"} type={inType}>
                Else
            </SocketIn>
        </TypicalNode>
    );
};

// --- Helpers ---

const BRANCH_SOCKETS = ["then", "else"] as const;

/** Is this socket a branch IN (then or else)? */
const isBranchSocket = (socket: string): socket is "then" | "else" => {
    return socket === "then" || socket === "else";
};

type CNode = NodeDefinitions.BuiltNodeOf<"condition", ConditionDefinition>;
type GetSocketType = (n: NodeDefinitions.NodeFor<NodeDefinitions.Any>, s: string, d: "in" | "out", c: NodeTypes.MethodContext) => string;

/** Query the type string of the upstream neighbor connected to one of our IN sockets */
const queryUpstreamType = (node: CNode, socketId: string, graphId: string, ctx: NodeTypes.MethodContext): string | null => {
    const linkId = (node.in as Record<string, string | null>)[socketId];
    if (!linkId) return null;
    const link = ctx.getLink(graphId, linkId);
    if (!link) return null;
    const neighbor = ctx.getNode(graphId, link.fromNode);
    if (!neighbor) return null;
    const neighborType = NodeTypes.get(neighbor.type);
    return (neighborType.getSocketType as GetSocketType)(neighbor, link.fromSocket, "out", ctx);
};

/** Query the intersection of all downstream neighbors' IN types connected to our result OUT */
const queryDownstreamTypes = (node: CNode, graphId: string, ctx: NodeTypes.MethodContext): string | null => {
    const linkIds = (node.out as Record<string, string[]>)["result"];
    if (!linkIds || linkIds.length === 0) return null;
    let result: string | null = null;
    for (const linkId of linkIds) {
        const link = ctx.getLink(graphId, linkId);
        if (!link) continue;
        const neighbor = ctx.getNode(graphId, link.toNode);
        if (!neighbor) continue;
        const neighborType = NodeTypes.get(neighbor.type);
        const st = (neighborType.getSocketType as GetSocketType)(neighbor, link.toSocket, "in", ctx);
        result = result === null ? st : SocketTypes.intersect(result, st);
    }
    return result;
};

/** Recompute resolvedOutTypes: union of all upstream OUT types on branch INs */
const recomputeOutTypes = (node: CNode, excludeSocket: string | null, graphId: string, ctx: NodeTypes.MethodContext): string => {
    let result = SocketTypes.NONE;
    for (const socket of BRANCH_SOCKETS) {
        if (socket !== excludeSocket) {
            const t = queryUpstreamType(node, socket, graphId, ctx);
            if (t !== null) result = SocketTypes.union(result, t);
        }
    }
    return result;
};

/** Recompute resolvedInTypes: intersection of all downstream IN types on result OUT */
const recomputeInTypes = (node: CNode, graphId: string, ctx: NodeTypes.MethodContext): string => {
    const result = queryDownstreamTypes(node, graphId, ctx);
    return result ?? SocketTypes.ANY;
};

/** Write both constraint strings into the node's payload */
const setPayloadTypes = (nodeId: string, resolvedOutTypes: string, resolvedInTypes: string, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const n = ctx.getNode(graphId, nodeId);
    if (!n) return;
    ctx.setNode(graphId, nodeId, {
        ...n,
        payload: { ...n.payload, resolvedOutTypes, resolvedInTypes } as NodeDefinitions.NodeFor<NodeDefinitions.Any>["payload"],
    });
};

/** Propagate a refresh request to both branch IN upstreams */
const propagateToBranchIns = (nodeId: string, reason: NodeTypes.RefreshReason, graphId: string, ctx: NodeTypes.MethodContext): void => {
    for (const socket of BRANCH_SOCKETS) {
        ctx.requestRefresh(graphId, nodeId, socket, "in", reason);
    }
};

// --- Lifecycle hooks ---

const onConnect = (node: CNode, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    const link = ctx.getLink(graphId, linkId);
    if (!link) return;
    const socket = direction === "out" ? link.fromSocket : link.toSocket;

    if (direction === "in" && isBranchSocket(socket)) {
        // A branch IN got connected — update resolvedOutTypes (union in upstream's OUT type)
        const upstreamType = queryUpstreamType(node, socket, graphId, ctx);
        if (upstreamType !== null && upstreamType !== SocketTypes.NONE) {
            const newOutTypes = SocketTypes.union(node.payload.resolvedOutTypes, upstreamType);
            if (newOutTypes !== node.payload.resolvedOutTypes) {
                setPayloadTypes(node.id, newOutTypes, node.payload.resolvedInTypes, graphId, ctx);
                ctx.requestRefresh(graphId, node.id, "result", "out", "constraintAdded");
            }
        }
    } else if (direction === "out" && socket === "result") {
        // Result OUT got connected — update resolvedInTypes (intersect with downstream's IN type)
        const downstreamTypes = queryDownstreamTypes(node, graphId, ctx);
        if (downstreamTypes !== null) {
            const newInTypes = SocketTypes.intersect(node.payload.resolvedInTypes, downstreamTypes);
            if (newInTypes !== node.payload.resolvedInTypes) {
                setPayloadTypes(node.id, node.payload.resolvedOutTypes, newInTypes, graphId, ctx);
                propagateToBranchIns(node.id, "constraintAdded", graphId, ctx);
            }
        }
    }
};

const onDisconnect = (node: CNode, link: ArcaneGraph.Link, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    const socket = direction === "out" ? link.fromSocket : link.toSocket;

    if (direction === "in" && isBranchSocket(socket)) {
        // A branch IN got disconnected — recompute resolvedOutTypes

        // Phase 1: propagate constraintRemoved downstream
        ctx.requestRefresh(graphId, node.id, "result", "out", "constraintRemoved");

        // Phase 2: recompute from remaining branch INs (neighbors have settled from phase 1)
        const refreshedNode = ctx.getNode(graphId, node.id) as CNode | undefined;
        if (!refreshedNode) return;
        const newOutTypes = recomputeOutTypes(refreshedNode, null, graphId, ctx);
        setPayloadTypes(node.id, newOutTypes, refreshedNode.payload.resolvedInTypes, graphId, ctx);

        // Phase 3: propagate constraintAdded downstream
        ctx.requestRefresh(graphId, node.id, "result", "out", "constraintAdded");
    } else if (direction === "out" && socket === "result") {
        // Result OUT got disconnected — recompute resolvedInTypes

        // Phase 1: propagate constraintRemoved to branch IN upstreams
        propagateToBranchIns(node.id, "constraintRemoved", graphId, ctx);

        // Phase 2: recompute from remaining downstreams
        const refreshedNode = ctx.getNode(graphId, node.id) as CNode | undefined;
        if (!refreshedNode) return;
        const newInTypes = recomputeInTypes(refreshedNode, graphId, ctx);
        setPayloadTypes(node.id, refreshedNode.payload.resolvedOutTypes, newInTypes, graphId, ctx);

        // Phase 3: propagate constraintAdded to branch IN upstreams
        propagateToBranchIns(node.id, "constraintAdded", graphId, ctx);
    }
};

const onRefreshRequest = (node: CNode, socketId: string, side: "in" | "out", reason: NodeTypes.RefreshReason, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const currentNode = ctx.getNode(graphId, node.id) as CNode | undefined;
    if (!currentNode) return;

    if (side === "in" && isBranchSocket(socketId)) {
        // Signal from upstream of a branch IN — affects resolvedOutTypes
        if (reason === "constraintRemoved") {
            const newOutTypes = recomputeOutTypes(currentNode, socketId, graphId, ctx);
            setPayloadTypes(node.id, newOutTypes, currentNode.payload.resolvedInTypes, graphId, ctx);
        } else {
            const newOutTypes = recomputeOutTypes(currentNode, null, graphId, ctx);
            setPayloadTypes(node.id, newOutTypes, currentNode.payload.resolvedInTypes, graphId, ctx);
        }
        ctx.requestRefresh(graphId, node.id, "result", "out", reason);
    } else if (side === "out" && socketId === "result") {
        // Signal from downstream of result OUT — affects resolvedInTypes
        const newInTypes = recomputeInTypes(currentNode, graphId, ctx);
        setPayloadTypes(node.id, currentNode.payload.resolvedOutTypes, newInTypes, graphId, ctx);
        propagateToBranchIns(node.id, reason, graphId, ctx);
    }
};

// --- Evaluation ---

const dependsOn = (_node: NodeDefinitions.NodeFor<ConditionDefinition>, outSocket: keyof ConditionDefinition["outputs"], _deps: AllDeps): (keyof ConditionDefinition["inputs"])[] => {
    if (outSocket === "result") {
        return ["if", "then", "else"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ConditionDefinition>, inSocket: keyof ConditionDefinition["inputs"], _deps: AllDeps): (keyof ConditionDefinition["outputs"])[] => {
    if (inSocket === "if" || inSocket === "then" || inSocket === "else") {
        return ["result"];
    }
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<ConditionDefinition>, socket: keyof ConditionDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "result") {
        const condition = context.resolve<"boolean">(node.id, "if");
        const value = condition !== null ? condition.data : node.payload.if;
        return value ? context.resolve(node.id, "then") : context.resolve(node.id, "else");
    }
    return null;
};

const getSocketType = (node: NodeDefinitions.NodeFor<ConditionDefinition>, socketId: string, side: "in" | "out", _ctx: NodeTypes.MethodContext): string => {
    if (socketId === "if" && side === "in") return "boolean";
    if (socketId === "result" && side === "out") return node.payload.resolvedOutTypes;
    if (isBranchSocket(socketId) && side === "in") return node.payload.resolvedInTypes;
    return SocketTypes.ANY;
};

export const ConditionNodeType: NodeTypes.Type<"condition", ConditionDefinition> = {
    type: "condition",
    displayName: "Condition",
    defaultLabel: "Condition",
    iconNode: <Icon shape={ICONS.Option} color={"var(--icon-flavour)"} />,
    category: "Logic",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    onConnect,
    onDisconnect,
    onRefreshRequest,
    getSocketType,
};
