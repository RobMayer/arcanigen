import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { Project } from "../../../state/project";
import { NUMERIC_TYPES, queryUpstreamOutType, extractSingle, wrapResult } from "./numericMath";

export type ReciprocalDefinition = {
    inputs: {
        input: DataTypes.Use<"float">;
    };
    outputs: {
        output: DataTypes.Use<"float">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        input: DataTypes.TypeOf<DataTypes.Use<"float">>;
        connectedType: SocketTypes.SocketRule;
        resolvedInTypes: SocketTypes.SocketRule;
    };
};

type ReciprocalNode = NodeDefinitions.BuiltNodeOf<"reciprocal", ReciprocalDefinition>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<ReciprocalDefinition>>, id: string = nanoid()): ReciprocalNode => {
    return {
        id,
        in: { input: null },
        out: { output: [] },
        payload: {
            label: "",
            input: input.input ?? "1",
            connectedType: SocketTypes.NONE,
            resolvedInTypes: SocketTypes.ANY,
        },
        type: "reciprocal",
    };
};

const effectiveType = (connectedType: SocketTypes.SocketRule, resolvedInTypes: SocketTypes.SocketRule): SocketTypes.SocketRule => {
    if (connectedType.types.length > 0) return connectedType;
    return SocketTypes.intersect(NUMERIC_TYPES, resolvedInTypes);
};

const queryDownstreamTypes = (node: ReciprocalNode, graphId: string, ctx: NodeTypes.MethodContext): SocketTypes.SocketRule | null => {
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

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ReciprocalDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ReciprocalDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const t = effectiveType(node.payload.connectedType, node.payload.resolvedInTypes);

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={SocketTypes.toCSS(t)}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"input"} type={SocketTypes.toCSS(t)} label={"Input"}>
                <DecimalInput value={node.payload.input} onCommit={(input) => handleUpdate({ input })} disabled={node.in.input !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<ReciprocalDefinition>, outSocket: "output", _deps: AllDeps): (keyof ReciprocalDefinition["inputs"])[] => {
    if (outSocket === "output") return ["input"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ReciprocalDefinition>, _inSocket: keyof ReciprocalDefinition["inputs"], _deps: AllDeps): (keyof ReciprocalDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<ReciprocalDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const val = context.resolve(node.id, "input");
        const kind = val?.kind ?? "float";
        const data = val?.data ?? node.payload.input;
        const { value, unit } = extractSingle(kind, data);
        return wrapResult(value === 0 ? 0 : 1 / value, kind, unit);
    }
    return null;
};

const setPayload = (nodeId: string, updates: Partial<ReciprocalDefinition["payload"]>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const current = ctx.getNode(graphId, nodeId);
    if (!current) return;
    ctx.setNode(graphId, nodeId, {
        ...current,
        payload: { ...current.payload, ...updates } as NodeDefinitions.NodeFor<NodeDefinitions.Any>["payload"],
    });
};

const onConnect = (node: ReciprocalNode, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    const link = ctx.getLink(graphId, linkId);
    if (!link) return;

    if (direction === "in") {
        const upstreamType = queryUpstreamOutType(node, "input", graphId, ctx);
        setPayload(node.id, { connectedType: upstreamType }, graphId, ctx);
        ctx.requestRefresh(graphId, node.id, "output", "out", "constraintAdded");
    } else {
        const currentNode = ctx.getNode(graphId, node.id) as ReciprocalNode | undefined;
        if (!currentNode) return;
        const downstreamTypes = queryDownstreamTypes(currentNode, graphId, ctx);
        if (downstreamTypes !== null) {
            const newInTypes = SocketTypes.intersect(currentNode.payload.resolvedInTypes, downstreamTypes);
            if (!SocketTypes.equals(newInTypes, currentNode.payload.resolvedInTypes)) {
                setPayload(node.id, { resolvedInTypes: newInTypes }, graphId, ctx);
                ctx.requestRefresh(graphId, node.id, "input", "in", "constraintAdded");
            }
        }
    }
};

const onDisconnect = (node: ReciprocalNode, link: { fromNode: string; fromSocket: string; toNode: string; toSocket: string }, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    if (direction === "in") {
        ctx.requestRefresh(graphId, node.id, "output", "out", "constraintRemoved");
        setPayload(node.id, { connectedType: SocketTypes.NONE }, graphId, ctx);
        ctx.requestRefresh(graphId, node.id, "output", "out", "constraintAdded");
    } else {
        ctx.requestRefresh(graphId, node.id, "input", "in", "constraintRemoved");
        const currentNode = ctx.getNode(graphId, node.id) as ReciprocalNode | undefined;
        if (!currentNode) return;
        const downstream = queryDownstreamTypes(currentNode, graphId, ctx);
        setPayload(node.id, { resolvedInTypes: downstream ?? SocketTypes.ANY }, graphId, ctx);
        ctx.requestRefresh(graphId, node.id, "input", "in", "constraintAdded");
    }
};

const onRefreshRequest = (node: ReciprocalNode, socketId: string, side: "in" | "out", reason: NodeTypes.RefreshReason, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const currentNode = ctx.getNode(graphId, node.id) as ReciprocalNode | undefined;
    if (!currentNode) return;

    if (side === "in") {
        const newUpstreamType = queryUpstreamOutType(currentNode, socketId, graphId, ctx);
        if (!SocketTypes.equals(newUpstreamType, currentNode.payload.connectedType)) {
            setPayload(node.id, { connectedType: newUpstreamType }, graphId, ctx);
            ctx.requestRefresh(graphId, node.id, "output", "out", reason);
        }
    } else {
        const newInTypes = queryDownstreamTypes(currentNode, graphId, ctx) ?? SocketTypes.ANY;
        if (!SocketTypes.equals(newInTypes, currentNode.payload.resolvedInTypes)) {
            setPayload(node.id, { resolvedInTypes: newInTypes }, graphId, ctx);
            ctx.requestRefresh(graphId, node.id, "input", "in", reason);
        }
    }
};

const getSocketType = (node: NodeDefinitions.NodeFor<ReciprocalDefinition>, socketId: string, _side: "in" | "out", _ctx: NodeTypes.MethodContext): SocketTypes.SocketRule => {
    const t = effectiveType(node.payload.connectedType, node.payload.resolvedInTypes);
    switch (socketId) {
        case "input":
        case "output":
            return t;
        default:
            return NUMERIC_TYPES;
    }
};

export const ReciprocalType: NodeTypes.Type<"reciprocal", ReciprocalDefinition> = {
    type: "reciprocal",
    displayName: "Reciprocal",
    defaultLabel: "Reciprocal",
    iconNode: <Icon shape={NODE_ICONS.divValue.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.divValue.Card} color={"var(--icon-flavour)"} />,
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
