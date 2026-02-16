import { nanoid } from "nanoid";
import { ICONS, Icon } from "../../../components/Icon";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { TextInput } from "../../../components/inputs/TextInput";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { ArcaneGraph } from "../../../util/structs/arcaneGraph";

export type SwitchCaseDefinition = {
    inputs: {
        switch: DataTypes.Use<"enum">;
        default: DataTypes.Any;
        [option: `case_${string}`]: DataTypes.Any;
    };
    outputs: {
        result: DataTypes.Any;
    };
    payload: {
        label: string;
        resolvedType: SocketTypes.Kind | null;
        cases: { label: string; socket: string }[];
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<SwitchCaseDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"switchCase", SwitchCaseDefinition> => {
    const s0: `case_${string}` = `case_${nanoid()}`;
    const s1: `case_${string}` = `case_${nanoid()}`;
    return {
        id,
        in: {
            switch: null,
            default: null,
            [s0]: null,
            [s1]: null,
        },
        out: {
            result: [],
        },
        payload: {
            label: "",
            resolvedType: null,
            cases: [
                { label: "", socket: s0 },
                { label: "", socket: s1 },
            ],
        },
        type: "switchCase",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<SwitchCaseDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const { alterNode, removeLinks } = Project.useMethods();

    const socketType = (node.payload.resolvedType ?? "any") as never;

    const handleCaseLabelUpdate = useCallback(
        (socket: string, label: string) => {
            methods.update<NodeDefinitions.PayloadTypeOf<SwitchCaseDefinition>>({
                cases: node.payload.cases.map((c) => (c.socket === socket ? { ...c, label } : c)),
            });
        },
        [methods, node.payload.cases],
    );

    const handleAddCase = useCallback(() => {
        const socketId: `case_${string}` = `case_${nanoid()}`;
        alterNode(node.id, (n) => ({
            ...n,
            in: { ...n.in, [socketId]: null },
            payload: {
                ...n.payload,
                cases: [...(n.payload as SwitchCaseDefinition["payload"]).cases, { label: "", socket: socketId }],
            },
        }));
    }, [alterNode, node.id]);

    const handleRemoveCase = useCallback(
        (socket: string) => {
            const linkId = node.in[socket];
            if (linkId) {
                removeLinks(linkId);
            }
            alterNode(node.id, (n) => {
                const { [socket]: _, ...restIn } = n.in;
                return {
                    ...n,
                    in: restIn,
                    payload: {
                        ...n.payload,
                        cases: (n.payload as SwitchCaseDefinition["payload"]).cases.filter((c) => c.socket !== socket),
                    },
                };
            });
        },
        [alterNode, removeLinks, node.id, node.in],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"result"} type={socketType}>
                Result
            </SocketOut>
            <SocketIn node={node} socketId={"switch"} type={"enum" as never}>
                Switch
            </SocketIn>
            <hr />
            <ActionButton onClick={handleAddCase} flavour={"accent"}>
                Add Case
            </ActionButton>
            {node.payload.cases.map((entry, idx) => (
                <SocketIn key={entry.socket} node={node} socketId={entry.socket as `case_${string}`} type={socketType}>
                    {idx}
                    <TextInput value={entry.label} onCommit={(label) => handleCaseLabelUpdate(entry.socket, label)} placeholder={`Case ${idx}`} />
                    <ActionButton.Lite onClick={() => handleRemoveCase(entry.socket)} flavour={"danger"}>
                        <Icon shape={ICONS.Close} />
                    </ActionButton.Lite>
                </SocketIn>
            ))}
            <hr />
            <SocketIn node={node} socketId={"default"} type={socketType}>
                Default
            </SocketIn>
        </TypicalNode>
    );
};

const isPolymorphicSocket = (socket: string, cases: SwitchCaseDefinition["payload"]["cases"]): boolean => {
    if (socket === "default" || socket === "result") return true;
    return cases.some((c) => c.socket === socket);
};

const queryNeighborType = (
    node: NodeDefinitions.BuiltNodeOf<"switchCase", SwitchCaseDefinition>,
    socketId: string,
    side: "in" | "out",
    graphId: string,
    ctx: NodeTypes.MethodContext,
): SocketTypes.Kind | null => {
    if (side === "in") {
        const linkId = (node.in as Record<string, string | null>)[socketId];
        if (!linkId) return null;
        const link = ctx.getLink(graphId, linkId);
        if (!link) return null;
        const neighbor = ctx.getNode(graphId, link.fromNode);
        if (!neighbor) return null;
        const neighborType = NodeTypes.get(neighbor.type);
        const st = (neighborType.getSocketType as (n: NodeDefinitions.NodeFor<NodeDefinitions.Any>, s: string, d: "in" | "out", c: NodeTypes.MethodContext) => SocketTypes.Kind)(neighbor, link.fromSocket, "out", ctx);
        return st !== "any" ? st : null;
    } else {
        const linkIds = (node.out as Record<string, string[]>)[socketId];
        if (!linkIds) return null;
        for (const linkId of linkIds) {
            const link = ctx.getLink(graphId, linkId);
            if (!link) continue;
            const neighbor = ctx.getNode(graphId, link.toNode);
            if (!neighbor) continue;
            const neighborType = NodeTypes.get(neighbor.type);
            const st = (neighborType.getSocketType as (n: NodeDefinitions.NodeFor<NodeDefinitions.Any>, s: string, d: "in" | "out", c: NodeTypes.MethodContext) => SocketTypes.Kind)(neighbor, link.toSocket, "in", ctx);
            if (st !== "any") return st;
        }
        return null;
    }
};

const scanAllPolymorphicNeighbors = (
    node: NodeDefinitions.BuiltNodeOf<"switchCase", SwitchCaseDefinition>,
    excludeSocket: string | null,
    excludeSide: "in" | "out" | null,
    graphId: string,
    ctx: NodeTypes.MethodContext,
): SocketTypes.Kind | null => {
    if (!(excludeSocket === "result" && excludeSide === "out")) {
        const t = queryNeighborType(node, "result", "out", graphId, ctx);
        if (t) return t;
    }
    if (!(excludeSocket === "default" && excludeSide === "in")) {
        const t = queryNeighborType(node, "default", "in", graphId, ctx);
        if (t) return t;
    }
    for (const c of node.payload.cases) {
        if (!(excludeSocket === c.socket && excludeSide === "in")) {
            const t = queryNeighborType(node, c.socket, "in", graphId, ctx);
            if (t) return t;
        }
    }
    return null;
};

const propagateRefresh = (
    nodeId: string,
    cases: SwitchCaseDefinition["payload"]["cases"],
    excludeSocket: string,
    excludeSide: "in" | "out",
    reason: NodeTypes.RefreshReason,
    graphId: string,
    ctx: NodeTypes.MethodContext,
): void => {
    if (!(excludeSocket === "result" && excludeSide === "out")) {
        ctx.requestRefresh(graphId, nodeId, "result", "out", reason);
    }
    if (!(excludeSocket === "default" && excludeSide === "in")) {
        ctx.requestRefresh(graphId, nodeId, "default", "in", reason);
    }
    for (const c of cases) {
        if (!(excludeSocket === c.socket && excludeSide === "in")) {
            ctx.requestRefresh(graphId, nodeId, c.socket, "in", reason);
        }
    }
};

const setResolvedType = (nodeId: string, resolvedType: SocketTypes.Kind | null, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const n = ctx.getNode(graphId, nodeId);
    if (!n) return;
    ctx.setNode(graphId, nodeId, { ...n, payload: { ...n.payload, resolvedType } as NodeDefinitions.NodeFor<NodeDefinitions.Any>["payload"] });
};

const onConnect = (
    node: NodeDefinitions.BuiltNodeOf<"switchCase", SwitchCaseDefinition>,
    linkId: string,
    direction: "in" | "out",
    graphId: string,
    ctx: NodeTypes.MethodContext,
): void => {
    const link = ctx.getLink(graphId, linkId);
    if (!link) return;

    const socket = direction === "out" ? link.fromSocket : link.toSocket;
    if (!isPolymorphicSocket(socket, node.payload.cases)) return;
    if (node.payload.resolvedType !== null) return;

    // Query the new neighbor's type
    const neighborType = queryNeighborType(node, socket, direction, graphId, ctx);
    if (!neighborType) return; // both "any" — no false constraint

    // Constrain and propagate
    setResolvedType(node.id, neighborType, graphId, ctx);
    propagateRefresh(node.id, node.payload.cases, socket, direction, "constraintAdded", graphId, ctx);
};

const onDisconnect = (
    node: NodeDefinitions.BuiltNodeOf<"switchCase", SwitchCaseDefinition>,
    link: ArcaneGraph.Link,
    direction: "in" | "out",
    graphId: string,
    ctx: NodeTypes.MethodContext,
): void => {
    const socket = direction === "out" ? link.fromSocket : link.toSocket;
    if (!isPolymorphicSocket(socket, node.payload.cases)) return;
    if (node.payload.resolvedType === null) return;

    // Phase 1: propagate "constraintRemoved" on other polymorphic sockets
    propagateRefresh(node.id, node.payload.cases, socket, direction, "constraintRemoved", graphId, ctx);

    // Phase 2: self-evaluate — query all remaining polymorphic neighbors (already settled from phase 1)
    const refreshedNode = ctx.getNode(graphId, node.id) as NodeDefinitions.BuiltNodeOf<"switchCase", SwitchCaseDefinition> | undefined;
    if (!refreshedNode) return;
    const foundType = scanAllPolymorphicNeighbors(refreshedNode, null, null, graphId, ctx);
    setResolvedType(node.id, foundType, graphId, ctx);

    // Phase 3: propagate "constraintAdded" on other polymorphic sockets (always runs)
    propagateRefresh(node.id, node.payload.cases, socket, direction, "constraintAdded", graphId, ctx);
};

const onRefreshRequest = (
    node: NodeDefinitions.BuiltNodeOf<"switchCase", SwitchCaseDefinition>,
    socketId: string,
    side: "in" | "out",
    reason: NodeTypes.RefreshReason,
    graphId: string,
    ctx: NodeTypes.MethodContext,
): void => {
    const currentNode = ctx.getNode(graphId, node.id) as NodeDefinitions.BuiltNodeOf<"switchCase", SwitchCaseDefinition> | undefined;
    if (!currentNode) return;

    if (reason === "constraintRemoved") {
        // Check all sockets EXCEPT the one the request came in on
        const foundType = scanAllPolymorphicNeighbors(currentNode, socketId, side, graphId, ctx);
        setResolvedType(node.id, foundType, graphId, ctx);
        // Propagate same reason on other polymorphic sockets
        propagateRefresh(node.id, currentNode.payload.cases, socketId, side, "constraintRemoved", graphId, ctx);
    } else {
        // "constraintAdded" — query ONLY the socket the request came in on
        const neighborType = queryNeighborType(currentNode, socketId, side, graphId, ctx);
        if (neighborType) {
            setResolvedType(node.id, neighborType, graphId, ctx);
        }
        // Propagate on other polymorphic sockets
        propagateRefresh(node.id, currentNode.payload.cases, socketId, side, "constraintAdded", graphId, ctx);
    }
};

const dependsOn = (node: NodeDefinitions.NodeFor<SwitchCaseDefinition>, outSocket: keyof SwitchCaseDefinition["outputs"], _deps: AllDeps): (keyof SwitchCaseDefinition["inputs"])[] => {
    if (outSocket === "result") {
        return ["switch", "default", ...(node.payload.cases.map((c) => c.socket) as `case_${string}`[])];
    }
    return [];
};

const contributesTo = (node: NodeDefinitions.NodeFor<SwitchCaseDefinition>, inSocket: keyof SwitchCaseDefinition["inputs"], _deps: AllDeps): (keyof SwitchCaseDefinition["outputs"])[] => {
    if (inSocket === "switch" || inSocket === "default") {
        return ["result"];
    }
    if (typeof inSocket === "string" && inSocket.startsWith("case_")) {
        return ["result"];
    }
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<SwitchCaseDefinition>, socket: keyof SwitchCaseDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "result") {
        const switchVal = context.resolve<"enum">(node.id, "switch");
        if (switchVal === null) {
            return context.resolve(node.id, "default");
        }
        const switchIndex = Number(switchVal.data);

        if (switchIndex >= 0 && switchIndex < node.payload.cases.length) {
            const caseSocket = node.payload.cases[switchIndex].socket;
            return context.resolve(node.id, caseSocket);
        }

        // Fall through to default
        return context.resolve(node.id, "default");
    }
    return null;
};

const getSocketType = (node: NodeDefinitions.NodeFor<SwitchCaseDefinition>, socketId: string, side: "in" | "out", _ctx: NodeTypes.MethodContext): SocketTypes.Kind => {
    if (side === "in" && socketId === "switch") return "enum";
    if (isPolymorphicSocket(socketId, node.payload.cases)) {
        return node.payload.resolvedType ?? "any";
    }
    return "any";
};

export const SwitchCaseNodeType: NodeTypes.Type<"switchCase", SwitchCaseDefinition> = {
    type: "switchCase",
    displayName: "Switch Case",
    defaultLabel: "Switch Case",
    iconNode: <Icon shape={ICONS.Option} color={"var(--icon-flavour)"} />,
    category: "Collections",
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
