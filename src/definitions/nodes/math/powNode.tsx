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

export type PowDefinition = {
    inputs: {
        input: DataTypes.Use<"float">;
        exponent: DataTypes.Use<"float">;
    };
    outputs: {
        output: DataTypes.Use<"float">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        exponent: DataTypes.TypeOf<DataTypes.Use<"float">>;
        connectedType: SocketTypes.SocketRule;
        resolvedInTypes: SocketTypes.SocketRule;
    };
};

type PowNode = NodeDefinitions.BuiltNodeOf<"pow", PowDefinition>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<PowDefinition>>, id: string = nanoid()): PowNode => {
    return {
        id,
        in: { input: null, exponent: null },
        out: { output: [] },
        payload: {
            label: "",
            exponent: input.exponent ?? "2",
            connectedType: SocketTypes.NONE,
            resolvedInTypes: SocketTypes.ANY,
        },
        type: "pow",
    };
};

const effectiveInputType = (connectedType: SocketTypes.SocketRule, resolvedInTypes: SocketTypes.SocketRule): SocketTypes.SocketRule => {
    if (connectedType.types.length > 0) return connectedType;
    return SocketTypes.intersect(NUMERIC_TYPES, resolvedInTypes);
};

const queryDownstreamTypes = (node: PowNode, graphId: string, ctx: NodeTypes.MethodContext): SocketTypes.SocketRule | null => {
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

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PowDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PowDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"input"}>
                Input
            </SocketIn>
            <SocketIn node={node} socketId={"exponent"} label={"Exponent"}>
                <DecimalInput value={node.payload.exponent} onCommit={(exponent) => handleUpdate({ exponent })} disabled={node.in.exponent !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<PowDefinition>, outSocket: "output", _deps: AllDeps): (keyof PowDefinition["inputs"])[] => {
    if (outSocket === "output") return ["input", "exponent"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PowDefinition>, inSocket: keyof PowDefinition["inputs"], _deps: AllDeps): (keyof PowDefinition["outputs"])[] => {
    if (inSocket === "input" || inSocket === "exponent") return ["output"];
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<PowDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const val = context.resolve(node.id, "input");
        if (!val) return null;
        const { value, unit } = extractSingle(val.kind, val.data);
        const expVal = context.resolve(node.id, "exponent");
        const expData = expVal?.data ?? node.payload.exponent;
        const { value: exp } = extractSingle(expVal?.kind ?? "float", expData);
        return wrapResult(Math.pow(value, exp), val.kind, unit);
    }
    return null;
};

const setPayload = (nodeId: string, updates: Partial<PowDefinition["payload"]>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const current = ctx.getNode(graphId, nodeId);
    if (!current) return;
    ctx.setNode(graphId, nodeId, {
        ...current,
        payload: { ...current.payload, ...updates } as NodeDefinitions.NodeFor<NodeDefinitions.Any>["payload"],
    });
};

const onConnect = (node: PowNode, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    const link = ctx.getLink(graphId, linkId);
    if (!link) return;

    if (direction === "in") {
        if (link.toSocket === "exponent") return;
        const upstreamType = queryUpstreamOutType(node, "input", graphId, ctx);
        setPayload(node.id, { connectedType: upstreamType }, graphId, ctx);
        ctx.requestRefresh(graphId, node.id, "output", "out", "constraintAdded");
    } else {
        const currentNode = ctx.getNode(graphId, node.id) as PowNode | undefined;
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

const onDisconnect = (
    node: PowNode,
    link: { fromNode: string; fromSocket: string; toNode: string; toSocket: string },
    direction: "in" | "out",
    graphId: string,
    ctx: NodeTypes.MethodContext,
): void => {
    if (direction === "in") {
        if (link.toSocket === "exponent") return;
        ctx.requestRefresh(graphId, node.id, "output", "out", "constraintRemoved");
        setPayload(node.id, { connectedType: SocketTypes.NONE }, graphId, ctx);
        ctx.requestRefresh(graphId, node.id, "output", "out", "constraintAdded");
    } else {
        ctx.requestRefresh(graphId, node.id, "input", "in", "constraintRemoved");
        const currentNode = ctx.getNode(graphId, node.id) as PowNode | undefined;
        if (!currentNode) return;
        const downstream = queryDownstreamTypes(currentNode, graphId, ctx);
        setPayload(node.id, { resolvedInTypes: downstream ?? SocketTypes.ANY }, graphId, ctx);
        ctx.requestRefresh(graphId, node.id, "input", "in", "constraintAdded");
    }
};

const onRefreshRequest = (node: PowNode, socketId: string, side: "in" | "out", reason: NodeTypes.RefreshReason, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const currentNode = ctx.getNode(graphId, node.id) as PowNode | undefined;
    if (!currentNode) return;

    if (side === "in") {
        if (socketId === "exponent") return;
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

const DIMENSIONLESS_IN: SocketTypes.SocketRule = { types: ["float", "integer"], mode: "or" };

const getSocketType = (node: NodeDefinitions.NodeFor<PowDefinition>, socketId: string, _side: "in" | "out", _ctx: NodeTypes.MethodContext): SocketTypes.SocketRule => {
    const inType = effectiveInputType(node.payload.connectedType, node.payload.resolvedInTypes);
    switch (socketId) {
        case "input":
            return inType;
        case "output":
            return inType;
        case "exponent":
            return DIMENSIONLESS_IN;
        default:
            return NUMERIC_TYPES;
    }
};

export const PowType: NodeTypes.Type<"pow", PowDefinition> = {
    type: "pow",
    displayName: "Pow",
    defaultLabel: "Pow",
    iconNode: <Icon shape={NODE_ICONS.pow} color={"var(--icon-flavour)"} />,
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
