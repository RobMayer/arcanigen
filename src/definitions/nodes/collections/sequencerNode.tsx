import { nanoid } from "nanoid";
import { NODE_ICONS, Icon } from "../../../components/Icon";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { ICONS } from "../../../components/Icon";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { NumericString } from "../../datatypes/numericString";
import { EmptyOr } from "../../../util/misc";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { ArcaneGraph } from "../../../util/structs/arcaneGraph";

export type SequencerDefinition = {
    inputs: {
        sequence: DataTypes.Use<"sequence">;
        mode: DataTypes.Use<"enum">;
        reverseSequence: DataTypes.Use<"boolean">;
        reverseSteps: DataTypes.Use<"boolean">;
        offset: DataTypes.Use<"integer">;
        [step: `step_${string}`]: DataTypes.Any;
    };
    outputs: {
        output: DataTypes.Any;
    };
    payload: {
        label: string;
        mode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        reverseSequence: boolean;
        reverseSteps: boolean;
        offset: EmptyOr<NumericString.Type>;
        resolvedOutTypes: SocketTypes.SocketRule;
        resolvedInTypes: SocketTypes.SocketRule;
        steps: { socket: string }[];
    };
};

const SEQUENCER_MODE_OPTIONS = Enum.options(Enum.Common.sequencerMode);

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<SequencerDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"sequencer", SequencerDefinition> => {
    const s0: `step_${string}` = `step_${nanoid()}`;
    const s1: `step_${string}` = `step_${nanoid()}`;
    return {
        id,
        in: {
            sequence: null,
            mode: null,
            reverseSequence: null,
            reverseSteps: null,
            offset: null,
            [s0]: null,
            [s1]: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            mode: input.mode ?? Enum.Common.sequencerMode.WRAP.value,
            reverseSequence: input.reverseSequence ?? false,
            reverseSteps: input.reverseSteps ?? false,
            offset: input.offset ?? "0",
            resolvedOutTypes: SocketTypes.NONE,
            resolvedInTypes: SocketTypes.ANY,
            steps: [{ socket: s0 }, { socket: s1 }],
        },
        type: "sequencer",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<SequencerDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const { alterNode, removeLinks } = Project.useMethods();

    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<SequencerDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const handleAddStep = useCallback(() => {
        const socketId: `step_${string}` = `step_${nanoid()}`;
        alterNode(node.id, (n) => ({
            ...n,
            in: { ...n.in, [socketId]: null },
            payload: {
                ...n.payload,
                steps: [...(n.payload as SequencerDefinition["payload"]).steps, { socket: socketId }],
            },
        }));
    }, [alterNode, node.id]);

    const handleRemoveStep = useCallback(
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
                        steps: (n.payload as SequencerDefinition["payload"]).steps.filter((s) => s.socket !== socket),
                    },
                };
            });
        },
        [alterNode, removeLinks, node.id, node.in],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={SocketTypes.toCSS(node.payload.resolvedOutTypes)}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"sequence"} type={"sequence"}>
                Sequence
            </SocketIn>
            <ActionButton onClick={handleAddStep} flavour={"accent"}>
                Add Step
            </ActionButton>
            {node.payload.steps.map((entry, idx) => (
                <SocketIn key={entry.socket} node={node} socketId={entry.socket as `step_${string}`} type={SocketTypes.toCSS(node.payload.resolvedInTypes)}>
                    Step {idx}
                    <ActionButton.Lite onClick={() => handleRemoveStep(entry.socket)} flavour={"danger"}>
                        <Icon shape={ICONS.Close} />
                    </ActionButton.Lite>
                </SocketIn>
            ))}
            <NodeAccordion nodeId={node.id} label={"Options"} socketsIn="mode|reverseSequence|offset">
                <SocketIn node={node} socketId={"mode"} type={"enum"} label={"Mode"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.mode}`}
                        onValue={(v) => handleUpdate({ mode: Number(v) })}
                        disabled={node.in.mode !== null}
                        options={SEQUENCER_MODE_OPTIONS}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"reverseSequence"} type={"boolean"}>
                    <CheckBox checked={node.payload.reverseSequence} onToggle={(reverseSequence) => handleUpdate({ reverseSequence })} disabled={node.in.reverseSequence !== null}>
                        Reverse Sequence
                    </CheckBox>
                </SocketIn>
                <SocketIn node={node} socketId={"reverseSteps"} type={"boolean"}>
                    <CheckBox checked={node.payload.reverseSteps} onToggle={(reverseSteps) => handleUpdate({ reverseSteps })} disabled={node.in.reverseSteps !== null}>
                        Reverse Steps
                    </CheckBox>
                </SocketIn>
                <SocketIn node={node} socketId={"offset"} type={"integer"} label={"Offset"}>
                    <IntegerInput value={node.payload.offset} onCommit={(offset) => handleUpdate({ offset })} disabled={node.in.offset !== null} />
                </SocketIn>
            </NodeAccordion>
        </TypicalNode>
    );
};

const dependsOn = (node: NodeDefinitions.NodeFor<SequencerDefinition>, outSocket: keyof SequencerDefinition["outputs"], _deps: AllDeps): (keyof SequencerDefinition["inputs"])[] => {
    if (outSocket === "output") {
        return ["sequence", "mode", "reverseSequence", "reverseSteps", "offset", ...(node.payload.steps.map((s) => s.socket) as `step_${string}`[])];
    }
    return [];
};

const contributesTo = (node: NodeDefinitions.NodeFor<SequencerDefinition>, inSocket: keyof SequencerDefinition["inputs"], _deps: AllDeps): (keyof SequencerDefinition["outputs"])[] => {
    if (inSocket === "sequence" || inSocket === "mode" || inSocket === "reverseSequence" || inSocket === "reverseSteps" || inSocket === "offset") {
        return ["output"];
    }
    if (typeof inSocket === "string" && inSocket.startsWith("step_")) {
        return ["output"];
    }
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<SequencerDefinition>, socket: keyof SequencerDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const sequenceEval = context.resolve<"sequence">(node.id, "sequence");
    if (!sequenceEval) return null;

    const { senderId, count } = sequenceEval.data;
    if (count <= 0) return null;

    const socketCount = node.payload.steps.length;
    if (socketCount === 0) return null;

    const iter = context.sequenceData[senderId] ?? 0;

    const reverseSequence = context.resolve<"boolean">(node.id, "reverseSequence")?.data ?? node.payload.reverseSequence;
    const reverseSteps = context.resolve<"boolean">(node.id, "reverseSteps")?.data ?? node.payload.reverseSteps;
    const offsetStr = context.resolve<"integer">(node.id, "offset")?.data ?? node.payload.offset;
    const offset = offsetStr === "" ? 0 : parseInt(offsetStr, 10) || 0;
    const modeEnum = context.resolve<"enum">(node.id, "mode")?.data ?? node.payload.mode;
    const modeKey = Enum.keyOf(Enum.Common.sequencerMode, modeEnum);

    // Pipeline step 1: Reverse Sequence
    let idx = reverseSequence ? count - 1 - iter : iter;

    // Pipeline step 2: Offset
    idx = (((idx - offset) % count) + count) % count;

    // Pipeline step 3: Mode maps idx (0..count-1) → stepIdx (0..socketCount-1)
    let stepIdx: number | null;
    switch (modeKey) {
        case "WRAP":
            stepIdx = idx % socketCount;
            break;
        case "CLAMP":
            stepIdx = Math.min(idx, socketCount - 1);
            break;
        case "TRUNCATE":
            stepIdx = idx < socketCount ? idx : null;
            break;
        case "BOUNCE": {
            // ping-pong: [0,1,2,1,0,1,2,...]
            const cycle = socketCount > 1 ? 2 * (socketCount - 1) : 1;
            const pos = idx % cycle;
            stepIdx = pos < socketCount ? pos : cycle - pos;
            break;
        }
        default:
            stepIdx = idx % socketCount;
    }

    if (stepIdx === null) return null;

    // Pipeline step 4: Reverse Steps
    if (reverseSteps) {
        stepIdx = socketCount - 1 - stepIdx;
    }

    // Pipeline step 5: Resolve the step socket without this sequence's iteration
    const stepSocket = node.payload.steps[stepIdx]?.socket;
    if (!stepSocket) return null;

    const { [senderId]: _, ...restSeqData } = context.sequenceData;
    return context.resolve(node.id, stepSocket, restSeqData);
};

// --- Helpers ---

type SeqNode = NodeDefinitions.BuiltNodeOf<"sequencer", SequencerDefinition>;

const isStepSocket = (socket: string, steps: SequencerDefinition["payload"]["steps"]): boolean => {
    return steps.some((s) => s.socket === socket);
};

const queryUpstreamType = (node: SeqNode, socketId: string, graphId: string, ctx: NodeTypes.MethodContext): SocketTypes.SocketRule | null => {
    const linkId = (node.in as Record<string, string | null>)[socketId];
    if (!linkId) return null;
    const link = ctx.getLink(graphId, linkId);
    if (!link) return null;
    const neighbor = ctx.getNode(graphId, link.fromNode);
    if (!neighbor) return null;
    return NodeTypes.getSocketType(neighbor, link.fromSocket, "out", ctx);
};

const queryDownstreamTypes = (node: SeqNode, graphId: string, ctx: NodeTypes.MethodContext): SocketTypes.SocketRule | null => {
    const linkIds = (node.out as Record<string, string[]>)["output"];
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

const recomputeOutTypes = (node: SeqNode, excludeSocket: string | null, graphId: string, ctx: NodeTypes.MethodContext): SocketTypes.SocketRule => {
    let result = SocketTypes.NONE;
    for (const s of node.payload.steps) {
        if (s.socket !== excludeSocket) {
            const t = queryUpstreamType(node, s.socket, graphId, ctx);
            if (t !== null) result = SocketTypes.union(result, t);
        }
    }
    return result;
};

const recomputeInTypes = (node: SeqNode, graphId: string, ctx: NodeTypes.MethodContext): SocketTypes.SocketRule => {
    const result = queryDownstreamTypes(node, graphId, ctx);
    return result ?? SocketTypes.ANY;
};

const setPayloadTypes = (nodeId: string, resolvedOutTypes: SocketTypes.SocketRule, resolvedInTypes: SocketTypes.SocketRule, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const n = ctx.getNode(graphId, nodeId);
    if (!n) return;
    ctx.setNode(graphId, nodeId, {
        ...n,
        payload: { ...n.payload, resolvedOutTypes, resolvedInTypes } as NodeDefinitions.NodeFor<NodeDefinitions.Any>["payload"],
    });
};

const propagateToStepIns = (nodeId: string, steps: SequencerDefinition["payload"]["steps"], reason: NodeTypes.RefreshReason, graphId: string, ctx: NodeTypes.MethodContext): void => {
    for (const s of steps) {
        ctx.requestRefresh(graphId, nodeId, s.socket, "in", reason);
    }
};

// --- Lifecycle hooks ---

const onConnect = (node: SeqNode, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    const link = ctx.getLink(graphId, linkId);
    if (!link) return;
    const socket = direction === "out" ? link.fromSocket : link.toSocket;

    if (direction === "in" && isStepSocket(socket, node.payload.steps)) {
        const upstreamType = queryUpstreamType(node, socket, graphId, ctx);
        if (upstreamType !== null && upstreamType.types.length > 0) {
            const newOutTypes = SocketTypes.union(node.payload.resolvedOutTypes, upstreamType);
            if (!SocketTypes.equals(newOutTypes, node.payload.resolvedOutTypes)) {
                setPayloadTypes(node.id, newOutTypes, node.payload.resolvedInTypes, graphId, ctx);
                ctx.requestRefresh(graphId, node.id, "output", "out", "constraintAdded");
            }
        }
    } else if (direction === "out" && socket === "output") {
        const downstreamTypes = queryDownstreamTypes(node, graphId, ctx);
        if (downstreamTypes !== null) {
            const newInTypes = SocketTypes.intersect(node.payload.resolvedInTypes, downstreamTypes);
            if (!SocketTypes.equals(newInTypes, node.payload.resolvedInTypes)) {
                setPayloadTypes(node.id, node.payload.resolvedOutTypes, newInTypes, graphId, ctx);
                propagateToStepIns(node.id, node.payload.steps, "constraintAdded", graphId, ctx);
            }
        }
    }
};

const onDisconnect = (node: SeqNode, link: ArcaneGraph.Link, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    const socket = direction === "out" ? link.fromSocket : link.toSocket;

    if (direction === "in" && isStepSocket(socket, node.payload.steps)) {
        // Phase 1: propagate constraintRemoved downstream
        ctx.requestRefresh(graphId, node.id, "output", "out", "constraintRemoved");

        // Phase 2: recompute from remaining step INs
        const refreshedNode = ctx.getNode(graphId, node.id) as SeqNode | undefined;
        if (!refreshedNode) return;
        const newOutTypes = recomputeOutTypes(refreshedNode, null, graphId, ctx);
        setPayloadTypes(node.id, newOutTypes, refreshedNode.payload.resolvedInTypes, graphId, ctx);

        // Phase 3: propagate constraintAdded downstream
        ctx.requestRefresh(graphId, node.id, "output", "out", "constraintAdded");
    } else if (direction === "out" && socket === "output") {
        // Phase 1: propagate constraintRemoved to step IN upstreams
        propagateToStepIns(node.id, node.payload.steps, "constraintRemoved", graphId, ctx);

        // Phase 2: recompute from remaining downstreams
        const refreshedNode = ctx.getNode(graphId, node.id) as SeqNode | undefined;
        if (!refreshedNode) return;
        const newInTypes = recomputeInTypes(refreshedNode, graphId, ctx);
        setPayloadTypes(node.id, refreshedNode.payload.resolvedOutTypes, newInTypes, graphId, ctx);

        // Phase 3: propagate constraintAdded to step IN upstreams
        propagateToStepIns(node.id, refreshedNode.payload.steps, "constraintAdded", graphId, ctx);
    }
};

const onRefreshRequest = (node: SeqNode, socketId: string, side: "in" | "out", reason: NodeTypes.RefreshReason, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const currentNode = ctx.getNode(graphId, node.id) as SeqNode | undefined;
    if (!currentNode) return;

    if (side === "in" && isStepSocket(socketId, currentNode.payload.steps)) {
        if (reason === "constraintRemoved") {
            const newOutTypes = recomputeOutTypes(currentNode, socketId, graphId, ctx);
            setPayloadTypes(node.id, newOutTypes, currentNode.payload.resolvedInTypes, graphId, ctx);
        } else {
            const newOutTypes = recomputeOutTypes(currentNode, null, graphId, ctx);
            setPayloadTypes(node.id, newOutTypes, currentNode.payload.resolvedInTypes, graphId, ctx);
        }
        ctx.requestRefresh(graphId, node.id, "output", "out", reason);
    } else if (side === "out" && socketId === "output") {
        const newInTypes = recomputeInTypes(currentNode, graphId, ctx);
        setPayloadTypes(node.id, currentNode.payload.resolvedOutTypes, newInTypes, graphId, ctx);
        propagateToStepIns(node.id, currentNode.payload.steps, reason, graphId, ctx);
    }
};

// --- Socket types ---

const SOCKETTYPES_IN: { [key in keyof Required<Pick<SequencerDefinition["inputs"], "sequence" | "mode" | "reverseSequence" | "reverseSteps" | "offset">>]: SocketTypes.SocketRule } = {
    sequence: { types: ["sequence"], mode: "and" },
    mode: { types: ["enum"], mode: "and" },
    reverseSequence: { types: ["boolean"], mode: "and" },
    reverseSteps: { types: ["boolean"], mode: "and" },
    offset: { types: ["integer"], mode: "and" },
};

const getSocketType = (node: NodeDefinitions.NodeFor<SequencerDefinition>, socketId: string, side: "in" | "out", _ctx: NodeTypes.MethodContext): SocketTypes.SocketRule => {
    if (side === "out" && socketId === "output") return node.payload.resolvedOutTypes;
    if (side === "in" && socketId.startsWith("step_")) return node.payload.resolvedInTypes;
    return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
};

export const SequencerNodeType: NodeTypes.Type<"sequencer", SequencerDefinition> = {
    type: "sequencer",
    displayName: "Sequencer",
    defaultLabel: "Sequencer",
    iconNode: <Icon shape={NODE_ICONS.sequence.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.sequence.Card} color={"var(--icon-flavour)"} />,
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
