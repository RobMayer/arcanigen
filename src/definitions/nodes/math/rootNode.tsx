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

export type RootDefinition = {
    inputs: {
        input: DataTypes.Use<"float">;
        degree: DataTypes.Use<"float">;
    };
    outputs: {
        output: DataTypes.Use<"float">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        degree: DataTypes.TypeOf<DataTypes.Use<"float">>;
        connectedType: SocketTypes.SocketRule;
        resolvedInTypes: SocketTypes.SocketRule;
    };
};

type RootNode = NodeDefinitions.BuiltNodeOf<"root", RootDefinition>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<RootDefinition>>, id: string = nanoid()): RootNode => {
    return {
        id,
        in: { input: null, degree: null },
        out: { output: [] },
        payload: {
            label: "",
            degree: input.degree ?? "2",
            connectedType: SocketTypes.NONE,
            resolvedInTypes: SocketTypes.ANY,
        },
        type: "root",
    };
};

const effectiveInputType = (connectedType: SocketTypes.SocketRule, resolvedInTypes: SocketTypes.SocketRule): SocketTypes.SocketRule => {
    if (connectedType.types.length > 0) return connectedType;
    return SocketTypes.intersect(NUMERIC_TYPES, resolvedInTypes);
};

const queryDownstreamTypes = (node: RootNode, graphId: string, ctx: NodeTypes.MethodContext): SocketTypes.SocketRule | null => {
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

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<RootDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<RootDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"input"}>Input</SocketIn>
            <SocketIn node={node} socketId={"degree"} label={"Degree"}>
                <DecimalInput value={node.payload.degree} onCommit={(degree) => handleUpdate({ degree })} disabled={node.in.degree !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<RootDefinition>, outSocket: "output", _deps: AllDeps): (keyof RootDefinition["inputs"])[] => {
    if (outSocket === "output") return ["input", "degree"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<RootDefinition>, inSocket: keyof RootDefinition["inputs"], _deps: AllDeps): (keyof RootDefinition["outputs"])[] => {
    if (inSocket === "input" || inSocket === "degree") return ["output"];
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<RootDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const val = context.resolve(node.id, "input");
        if (!val) return null;
        const { value, unit } = extractSingle(val.kind, val.data);
        const degVal = context.resolve(node.id, "degree");
        const degData = degVal?.data ?? node.payload.degree;
        const { value: deg } = extractSingle(degVal?.kind ?? "float", degData);
        const result = deg === 0 ? 0 : Math.pow(value, 1 / deg);
        return wrapResult(result, val.kind, unit);
    }
    return null;
};

const setPayload = (nodeId: string, updates: Partial<RootDefinition["payload"]>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const current = ctx.getNode(graphId, nodeId);
    if (!current) return;
    ctx.setNode(graphId, nodeId, {
        ...current,
        payload: { ...current.payload, ...updates } as NodeDefinitions.NodeFor<NodeDefinitions.Any>["payload"],
    });
};

const onConnect = (node: RootNode, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    const link = ctx.getLink(graphId, linkId);
    if (!link) return;

    if (direction === "in") {
        if (link.toSocket === "degree") return;
        const upstreamType = queryUpstreamOutType(node, "input", graphId, ctx);
        setPayload(node.id, { connectedType: upstreamType }, graphId, ctx);
        ctx.requestRefresh(graphId, node.id, "output", "out", "constraintAdded");
    } else {
        const currentNode = ctx.getNode(graphId, node.id) as RootNode | undefined;
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

const onDisconnect = (node: RootNode, link: { fromNode: string; fromSocket: string; toNode: string; toSocket: string }, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    if (direction === "in") {
        if (link.toSocket === "degree") return;
        ctx.requestRefresh(graphId, node.id, "output", "out", "constraintRemoved");
        setPayload(node.id, { connectedType: SocketTypes.NONE }, graphId, ctx);
        ctx.requestRefresh(graphId, node.id, "output", "out", "constraintAdded");
    } else {
        ctx.requestRefresh(graphId, node.id, "input", "in", "constraintRemoved");
        const currentNode = ctx.getNode(graphId, node.id) as RootNode | undefined;
        if (!currentNode) return;
        const downstream = queryDownstreamTypes(currentNode, graphId, ctx);
        setPayload(node.id, { resolvedInTypes: downstream ?? SocketTypes.ANY }, graphId, ctx);
        ctx.requestRefresh(graphId, node.id, "input", "in", "constraintAdded");
    }
};

const onRefreshRequest = (node: RootNode, socketId: string, side: "in" | "out", reason: NodeTypes.RefreshReason, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const currentNode = ctx.getNode(graphId, node.id) as RootNode | undefined;
    if (!currentNode) return;

    if (side === "in") {
        if (socketId === "degree") return;
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

const getSocketType = (node: NodeDefinitions.NodeFor<RootDefinition>, socketId: string, _side: "in" | "out", _ctx: NodeTypes.MethodContext): SocketTypes.SocketRule => {
    const inType = effectiveInputType(node.payload.connectedType, node.payload.resolvedInTypes);
    switch (socketId) {
        case "input":
            return inType;
        case "output":
            return inType;
        case "degree":
            return DIMENSIONLESS_IN;
        default:
            return NUMERIC_TYPES;
    }
};

export const RootType: NodeTypes.Type<"root", RootDefinition> = {
    type: "root",
    displayName: "Root",
    defaultLabel: "Root",
    iconNode: <Icon shape={NODE_ICONS.numericValue.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.numericValue.Card} color={"var(--icon-flavour)"} />,
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
