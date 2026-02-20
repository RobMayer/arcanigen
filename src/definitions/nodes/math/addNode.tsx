import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { Project } from "../../../state/project";
import { NUMERIC_TYPES, constrainForPartner, computeOutputType, queryUpstreamOutType, extractPair, dominantKind, wrapResult } from "./numericMath";

export type AddDefinition = {
    inputs: {
        a: DataTypes.Use<"float">;
        b: DataTypes.Use<"float">;
    };
    outputs: {
        output: DataTypes.Use<"float">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        a: DataTypes.TypeOf<DataTypes.Use<"float">>;
        b: DataTypes.TypeOf<DataTypes.Use<"float">>;
        connectedTypeA: SocketTypes.SocketRule;
        connectedTypeB: SocketTypes.SocketRule;
    };
};

type AddNode = NodeDefinitions.BuiltNodeOf<"add", AddDefinition>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<AddDefinition>>, id: string = nanoid()): AddNode => {
    return {
        id,
        in: {
            a: null,
            b: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            a: input.a ?? "0",
            b: input.b ?? "0",
            connectedTypeA: SocketTypes.NONE,
            connectedTypeB: SocketTypes.NONE,
        },
        type: "add",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<AddDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<AddDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const typeA = node.payload.connectedTypeA.types.length > 0 ? node.payload.connectedTypeA : constrainForPartner(node.payload.connectedTypeB);
    const typeB = node.payload.connectedTypeB.types.length > 0 ? node.payload.connectedTypeB : constrainForPartner(node.payload.connectedTypeA);
    const typeOut = computeOutputType(typeA, typeB);

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={SocketTypes.toCSS(typeOut)}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"a"} type={SocketTypes.toCSS(typeA)} label={"A"}>
                <DecimalInput value={node.payload.a} onCommit={(a) => handleUpdate({ a })} disabled={node.in.a !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"b"} type={SocketTypes.toCSS(typeB)} label={"B"}>
                <DecimalInput value={node.payload.b} onCommit={(b) => handleUpdate({ b })} disabled={node.in.b !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<AddDefinition>, outSocket: "output", _deps: AllDeps): (keyof AddDefinition["inputs"])[] => {
    if (outSocket === "output") return ["a", "b"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<AddDefinition>, _inSocket: keyof AddDefinition["inputs"], _deps: AllDeps): (keyof AddDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<AddDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const aVal = context.resolve(node.id, "a");
        const bVal = context.resolve(node.id, "b");
        const aKind = aVal?.kind ?? "float";
        const bKind = bVal?.kind ?? "float";
        const aData = aVal?.data ?? node.payload.a;
        const bData = bVal?.data ?? node.payload.b;
        const { a, b, unit } = extractPair(aKind, aData, bKind, bData);
        const outputKind = dominantKind(aKind, bKind);
        return wrapResult(a + b, outputKind, unit);
    }
    return null;
};

// --- Lifecycle hooks for constraint propagation ---

const setPayload = (node: AddNode, updates: Partial<AddDefinition["payload"]>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const current = ctx.getNode(graphId, node.id);
    if (!current) return;
    ctx.setNode(graphId, node.id, {
        ...current,
        payload: { ...current.payload, ...updates } as NodeDefinitions.NodeFor<NodeDefinitions.Any>["payload"],
    });
};

const onConnect = (node: AddNode, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    if (direction !== "in") return;

    const link = ctx.getLink(graphId, linkId);
    if (!link) return;
    const socket = link.toSocket as "a" | "b";

    const upstreamType = queryUpstreamOutType(node, socket, graphId, ctx);
    const payloadKey = socket === "a" ? "connectedTypeA" : "connectedTypeB";

    setPayload(node, { [payloadKey]: upstreamType }, graphId, ctx);

    const otherSocket = socket === "a" ? "b" : "a";
    ctx.requestRefresh(graphId, node.id, otherSocket, "in", "constraintAdded");
    ctx.requestRefresh(graphId, node.id, "output", "out", "constraintAdded");
};

const onDisconnect = (node: AddNode, link: { fromNode: string; fromSocket: string; toNode: string; toSocket: string }, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    if (direction !== "in") return;

    const socket = link.toSocket as "a" | "b";
    const otherSocket = socket === "a" ? "b" : "a";
    const payloadKey = socket === "a" ? "connectedTypeA" : "connectedTypeB";

    // Phase 1: constraintRemoved
    ctx.requestRefresh(graphId, node.id, otherSocket, "in", "constraintRemoved");
    ctx.requestRefresh(graphId, node.id, "output", "out", "constraintRemoved");

    // Phase 2: update payload
    setPayload(node, { [payloadKey]: SocketTypes.NONE }, graphId, ctx);

    // Phase 3: constraintAdded
    ctx.requestRefresh(graphId, node.id, otherSocket, "in", "constraintAdded");
    ctx.requestRefresh(graphId, node.id, "output", "out", "constraintAdded");
};

const onRefreshRequest = (node: AddNode, socketId: string, side: "in" | "out", reason: NodeTypes.RefreshReason, graphId: string, ctx: NodeTypes.MethodContext): void => {
    if (side !== "in") return;

    const currentNode = ctx.getNode(graphId, node.id) as AddNode | undefined;
    if (!currentNode) return;

    const newUpstreamType = queryUpstreamOutType(currentNode, socketId, graphId, ctx);
    const payloadKey = socketId === "a" ? "connectedTypeA" : "connectedTypeB";
    const oldType = (currentNode.payload as Record<string, unknown>)[payloadKey] as SocketTypes.SocketRule;

    if (!SocketTypes.equals(newUpstreamType, oldType)) {
        setPayload(currentNode, { [payloadKey]: newUpstreamType }, graphId, ctx);

        const otherSocket = socketId === "a" ? "b" : "a";
        ctx.requestRefresh(graphId, node.id, otherSocket, "in", reason);
        ctx.requestRefresh(graphId, node.id, "output", "out", reason);
    }
};

// --- getSocketType ---

const getSocketType = (node: NodeDefinitions.NodeFor<AddDefinition>, socketId: string, _side: "in" | "out"): SocketTypes.SocketRule => {
    const { connectedTypeA, connectedTypeB } = node.payload;
    const effectiveA = connectedTypeA.types.length > 0 ? connectedTypeA : constrainForPartner(connectedTypeB);
    const effectiveB = connectedTypeB.types.length > 0 ? connectedTypeB : constrainForPartner(connectedTypeA);
    switch (socketId) {
        case "a":
            return effectiveA;
        case "b":
            return effectiveB;
        case "output":
            return computeOutputType(effectiveA, effectiveB);
        default:
            return NUMERIC_TYPES;
    }
};

export const AddType: NodeTypes.Type<"add", AddDefinition> = {
    type: "add",
    displayName: "Add",
    defaultLabel: "Add",
    iconNode: <Icon shape={NODE_ICONS.addValue.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.addValue.Card} color={"var(--icon-flavour)"} />,
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
