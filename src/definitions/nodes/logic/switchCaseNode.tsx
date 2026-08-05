import { nanoid } from "nanoid";
import { NodeIcon, ICONS, Icon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { TextInput } from "../../../components/inputs/TextInput";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
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
        resolvedOutTypes: SocketTypes.SocketRule; // union of upstream OUT types on case INs. NONE = unconstrained
        resolvedInTypes: SocketTypes.SocketRule; // intersection of downstream IN types on result OUT. ANY = unconstrained
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
            resolvedOutTypes: SocketTypes.NONE,
            resolvedInTypes: SocketTypes.ANY,
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

    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "result");
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"result"} label={"Result"}>
                <ValuePreview value={preview} />
            </SocketOut>
            <SocketIn node={node} socketId={"switch"}>
                Switch
            </SocketIn>
            <hr />
            <ActionButton onClick={handleAddCase} flavour={"accent"}>
                Add Case
            </ActionButton>
            {node.payload.cases.map((entry, idx) => (
                <SocketIn key={entry.socket} node={node} socketId={entry.socket as `case_${string}`}>
                    {idx}
                    <TextInput value={entry.label} onCommit={(label) => handleCaseLabelUpdate(entry.socket, label)} placeholder={`Case ${idx}`} />
                    <ActionButton.Lite onClick={() => handleRemoveCase(entry.socket)} flavour={"danger"}>
                        <Icon shape={ICONS.Close} />
                    </ActionButton.Lite>
                </SocketIn>
            ))}
            <hr />
            <SocketIn node={node} socketId={"default"}>
                Default
            </SocketIn>
        </TypicalNode>
    );
};

// --- Helpers ---

/** Is this socket a case IN (default or case_*)? */
const isCaseInSocket = (socket: string, cases: SwitchCaseDefinition["payload"]["cases"]): boolean => {
    if (socket === "default") return true;
    return cases.some((c) => c.socket === socket);
};

type SCNode = NodeDefinitions.BuiltNodeOf<"switchCase", SwitchCaseDefinition>;
/** Query the SocketRule of the upstream neighbor connected to one of our IN sockets */
const queryUpstreamType = (node: SCNode, socketId: string, graphId: string, ctx: NodeTypes.MethodContext): SocketTypes.SocketRule | null => {
    const linkId = (node.in as Record<string, string | null>)[socketId];
    if (!linkId) return null;
    const link = ctx.getLink(graphId, linkId);
    if (!link) return null;
    const neighbor = ctx.getNode(graphId, link.fromNode);
    if (!neighbor) return null;
    return NodeTypes.getSocketType(neighbor, link.fromSocket, "out", ctx);
};

/** Query the intersection of all downstream neighbors' IN types connected to our result OUT */
const queryDownstreamTypes = (node: SCNode, graphId: string, ctx: NodeTypes.MethodContext): SocketTypes.SocketRule | null => {
    const linkIds = (node.out as Record<string, string[]>)["result"];
    if (!linkIds || linkIds.length === 0) return null;
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

/** Recompute resolvedOutTypes: union of all upstream OUT types on case INs */
const recomputeOutTypes = (node: SCNode, excludeSocket: string | null, graphId: string, ctx: NodeTypes.MethodContext): SocketTypes.SocketRule => {
    let result = SocketTypes.NONE;
    if (excludeSocket !== "default") {
        const t = queryUpstreamType(node, "default", graphId, ctx);
        if (t !== null) result = SocketTypes.union(result, t);
    }
    for (const c of node.payload.cases) {
        if (c.socket !== excludeSocket) {
            const t = queryUpstreamType(node, c.socket, graphId, ctx);
            if (t !== null) result = SocketTypes.union(result, t);
        }
    }
    return result;
};

/** Recompute resolvedInTypes: intersection of all downstream IN types on result OUT */
const recomputeInTypes = (node: SCNode, graphId: string, ctx: NodeTypes.MethodContext): SocketTypes.SocketRule => {
    const result = queryDownstreamTypes(node, graphId, ctx);
    return result ?? SocketTypes.ANY;
};

/** Write both constraint rules into the node's payload */
const setPayloadTypes = (nodeId: string, resolvedOutTypes: SocketTypes.SocketRule, resolvedInTypes: SocketTypes.SocketRule, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const n = ctx.getNode(graphId, nodeId);
    if (!n) return;
    ctx.setNode(graphId, nodeId, {
        ...n,
        payload: { ...n.payload, resolvedOutTypes, resolvedInTypes } as NodeDefinitions.NodeFor<NodeDefinitions.Any>["payload"],
    });
};

/** Propagate a refresh request to all case IN upstreams (default + case_*) */
const propagateToCaseIns = (nodeId: string, cases: SwitchCaseDefinition["payload"]["cases"], reason: NodeTypes.RefreshReason, graphId: string, ctx: NodeTypes.MethodContext): void => {
    ctx.requestRefresh(graphId, nodeId, "default", "in", reason);
    for (const c of cases) {
        ctx.requestRefresh(graphId, nodeId, c.socket, "in", reason);
    }
};

// --- Lifecycle hooks ---

const onConnect = (node: SCNode, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    const link = ctx.getLink(graphId, linkId);
    if (!link) return;
    const socket = direction === "out" ? link.fromSocket : link.toSocket;

    if (direction === "in" && isCaseInSocket(socket, node.payload.cases)) {
        // A case IN got connected — update resolvedOutTypes (union in upstream's OUT type)
        const upstreamType = queryUpstreamType(node, socket, graphId, ctx);
        if (upstreamType !== null && upstreamType.types.length > 0) {
            const newOutTypes = SocketTypes.union(node.payload.resolvedOutTypes, upstreamType);
            if (!SocketTypes.equals(newOutTypes, node.payload.resolvedOutTypes)) {
                setPayloadTypes(node.id, newOutTypes, node.payload.resolvedInTypes, graphId, ctx);
                ctx.requestRefresh(graphId, node.id, "result", "out", "constraintAdded");
            }
        }
    } else if (direction === "out" && socket === "result") {
        // Result OUT got connected — update resolvedInTypes (intersect with downstream's IN type)
        const downstreamTypes = queryDownstreamTypes(node, graphId, ctx);
        if (downstreamTypes !== null) {
            const newInTypes = SocketTypes.intersect(node.payload.resolvedInTypes, downstreamTypes);
            if (!SocketTypes.equals(newInTypes, node.payload.resolvedInTypes)) {
                setPayloadTypes(node.id, node.payload.resolvedOutTypes, newInTypes, graphId, ctx);
                propagateToCaseIns(node.id, node.payload.cases, "constraintAdded", graphId, ctx);
            }
        }
    }
};

const onDisconnect = (node: SCNode, link: ArcaneGraph.Link, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    const socket = direction === "out" ? link.fromSocket : link.toSocket;

    if (direction === "in" && isCaseInSocket(socket, node.payload.cases)) {
        // A case IN got disconnected — recompute resolvedOutTypes

        // Phase 1: propagate constraintRemoved downstream
        ctx.requestRefresh(graphId, node.id, "result", "out", "constraintRemoved");

        // Phase 2: recompute from remaining case INs (neighbors have settled from phase 1)
        const refreshedNode = ctx.getNode(graphId, node.id) as SCNode | undefined;
        if (!refreshedNode) return;
        const newOutTypes = recomputeOutTypes(refreshedNode, null, graphId, ctx);
        setPayloadTypes(node.id, newOutTypes, refreshedNode.payload.resolvedInTypes, graphId, ctx);

        // Phase 3: propagate constraintAdded downstream
        ctx.requestRefresh(graphId, node.id, "result", "out", "constraintAdded");
    } else if (direction === "out" && socket === "result") {
        // Result OUT got disconnected — recompute resolvedInTypes

        // Phase 1: propagate constraintRemoved to case IN upstreams
        propagateToCaseIns(node.id, node.payload.cases, "constraintRemoved", graphId, ctx);

        // Phase 2: recompute from remaining downstreams
        const refreshedNode = ctx.getNode(graphId, node.id) as SCNode | undefined;
        if (!refreshedNode) return;
        const newInTypes = recomputeInTypes(refreshedNode, graphId, ctx);
        setPayloadTypes(node.id, refreshedNode.payload.resolvedOutTypes, newInTypes, graphId, ctx);

        // Phase 3: propagate constraintAdded to case IN upstreams
        propagateToCaseIns(node.id, refreshedNode.payload.cases, "constraintAdded", graphId, ctx);
    }
};

const onRefreshRequest = (node: SCNode, socketId: string, side: "in" | "out", reason: NodeTypes.RefreshReason, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const currentNode = ctx.getNode(graphId, node.id) as SCNode | undefined;
    if (!currentNode) return;

    if (side === "in" && isCaseInSocket(socketId, currentNode.payload.cases)) {
        // Signal from upstream of a case IN — affects resolvedOutTypes
        if (reason === "constraintRemoved") {
            // Don't query back on socketId — recompute from all OTHER case INs
            const newOutTypes = recomputeOutTypes(currentNode, socketId, graphId, ctx);
            setPayloadTypes(node.id, newOutTypes, currentNode.payload.resolvedInTypes, graphId, ctx);
        } else {
            // constraintAdded — recompute from ALL case INs (sender has settled)
            const newOutTypes = recomputeOutTypes(currentNode, null, graphId, ctx);
            setPayloadTypes(node.id, newOutTypes, currentNode.payload.resolvedInTypes, graphId, ctx);
        }
        // Propagate to downstream (result OUT)
        ctx.requestRefresh(graphId, node.id, "result", "out", reason);
    } else if (side === "out" && socketId === "result") {
        // Signal from downstream of result OUT — affects resolvedInTypes
        const newInTypes = recomputeInTypes(currentNode, graphId, ctx);
        setPayloadTypes(node.id, currentNode.payload.resolvedOutTypes, newInTypes, graphId, ctx);
        // Propagate to case IN upstreams
        propagateToCaseIns(node.id, currentNode.payload.cases, reason, graphId, ctx);
    }
};

// --- Evaluation ---

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

const getSocketType = (node: NodeDefinitions.NodeFor<SwitchCaseDefinition>, socketId: string, side: "in" | "out", _ctx: NodeTypes.MethodContext): SocketTypes.SocketRule => {
    if (socketId === "switch" && side === "in") return SocketTypes.of("enum");
    if (socketId === "result" && side === "out") return node.payload.resolvedOutTypes;
    if (isCaseInSocket(socketId, node.payload.cases) && side === "in") return node.payload.resolvedInTypes;
    return SocketTypes.ANY;
};

export const SwitchCaseNodeType: NodeTypes.Type<"switchCase", SwitchCaseDefinition> = {
    type: "switchCase",
    displayName: "Switch Case",
    defaultLabel: "Switch Case",
    iconNode: <NodeIcon shape={NODE_ICONS.alt} />,
    flavour: "help",
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
