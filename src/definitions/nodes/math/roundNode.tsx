import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject, queryUpstreamOutType, commitSocketTypes } from "../../helpers/nodeHelper";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { SocketTypes } from "../../socketTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { extractSingle, wrapResult, applyRounding } from "../../helpers/mathHelper";
import { Enum } from "../../datatypes/enum";
import { Dropdown } from "../../../components/inputs/Dropdown";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";

const ROUNDING_MODE_OPTIONS = Enum.options(Enum.Common.roundingMode);

// ESCAPE HATCH: round's output kind is the input's kind with `float ↦ integer` remapped — a relational
// (out = f(in)) map the builder vocabulary can't express, so `getSocketType` below stays hand-rolled.
// This `def` is TYPE-ONLY (its `.instance` is unused; the node does NOT spread SignatureEngine.hooks) —
// it exists solely to derive an HONEST Definition: input accepts NUMERIC, output is the result of the
// remap `{integer, angle, length}`.
const def = signature({
    in: { input: $.NUMERIC, mode: "enum" },
    out: { output: $.oneOf("integer", "angle", "length") },
});

export type RoundDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        mode: number;
    }
>;

type RoundNode = NodeDefinitions.BuiltNodeOf<"round", RoundDefinition>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<RoundDefinition>>, id: string = nanoid()): RoundNode => {
    return {
        id,
        in: { input: null, mode: null },
        out: { output: [] },
        payload: {
            label: "",
            mode: input.mode ?? Enum.Common.roundingMode.HALF_EXPAND.value,
        },
        type: "round",
    };
};

const effectiveInputType = (connectedType: SocketTypes.Term, resolvedInTypes: SocketTypes.Term): SocketTypes.Term => {
    if (SocketTypes.project(connectedType).length > 0) return connectedType;
    return SocketTypes.intersect(SocketTypes.NUMERIC, resolvedInTypes);
};

// The escape-hatch remap: project the input kinds, rewrite float ↦ integer, rebuild as a same-mode Term set.
const roundedOutputType = (inputType: SocketTypes.Term): SocketTypes.Term => {
    return SocketTypes.set(SocketTypes.projectMode(inputType), ...SocketTypes.project(inputType).map((t) => SocketTypes.atom(t === "float" ? "integer" : t)));
};

const queryDownstreamTypes = (node: RoundNode, graphId: string, ctx: NodeTypes.MethodContext): SocketTypes.Term | null => {
    const linkIds = node.out.output;
    if (linkIds.length === 0) return null;
    let result: SocketTypes.Term | null = null;
    for (const linkId of linkIds) {
        const link = ctx.getLink(graphId, linkId);
        if (!link) continue;
        const neighbor = ctx.getNode(graphId, link.toNode);
        if (!neighbor) continue;
        const st = NodeTypes.getSocketType(neighbor, link.toSocket, "in", graphId, ctx);
        result = result === null ? st : SocketTypes.intersect(result, st);
    }
    return result;
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<RoundDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<RoundDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "output");
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} label={"Output"}>
                <ValuePreview value={preview} />
            </SocketOut>
            <SocketIn node={node} socketId={"input"}>
                Input
            </SocketIn>
            <SocketIn node={node} socketId={"mode"} label={"Mode"}>
                <Dropdown value={`${node.payload.mode}`} onValue={(v) => handleUpdate({ mode: Number(v) })} disabled={node.in.mode !== null}>
                    {ROUNDING_MODE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </Dropdown>
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<RoundDefinition>, outSocket: "output", _deps: AllDeps): (keyof RoundDefinition["inputs"])[] => {
    if (outSocket === "output") return ["input", "mode"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<RoundDefinition>, inSocket: keyof RoundDefinition["inputs"], _deps: AllDeps): (keyof RoundDefinition["outputs"])[] => {
    if (inSocket === "input" || inSocket === "mode") return ["output"];
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<RoundDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const val = context.resolve(node.id, "input");
        if (!val) return null;
        const { value, unit } = extractSingle(val.kind, val.data);
        const mode = Enum.resolve(context.resolve<"enum">(node.id, "mode")?.data, Enum.Common.roundingMode) ?? node.payload.mode;
        const outputKind = val.kind === "float" ? "integer" : val.kind;
        return wrapResult(applyRounding(value, mode), outputKind, unit);
    }
    return null;
};

const ENUM_IN: SocketTypes.Term = SocketTypes.of("enum");
const OUTPUT_DEFAULT: SocketTypes.Term = roundedOutputType(SocketTypes.NUMERIC);

// Resolve every socket's concrete type from the live graph: the input adopts its upstream's kind
// (or, absent one, whatever the downstream consumers allow, clamped to NUMERIC); the output is that
// with float -> integer remapped. Recomputed on every hook and stashed in the socket-type cache.
const resolveRound = (node: RoundNode, graphId: string, ctx: NodeTypes.MethodContext): { in: Record<string, SocketTypes.Term>; out: Record<string, SocketTypes.Term> } => {
    const connectedType = queryUpstreamOutType(node, "input", graphId, ctx);
    const downstream = queryDownstreamTypes(node, graphId, ctx);
    const inType = effectiveInputType(connectedType, downstream ?? SocketTypes.ANY);
    return { in: { input: inType, mode: ENUM_IN }, out: { output: roundedOutputType(inType) } };
};

const recompute = (node: RoundNode, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const current = ctx.getNode(graphId, node.id) as RoundNode | undefined;
    if (!current) return;
    commitSocketTypes(current, graphId, ctx, resolveRound(current, graphId, ctx));
};

const onConnect = (node: RoundNode, _linkId: string, _direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => recompute(node, graphId, ctx);
const onDisconnect = (
    node: RoundNode,
    _link: { fromNode: string; fromSocket: string; toNode: string; toSocket: string },
    _direction: "in" | "out",
    graphId: string,
    ctx: NodeTypes.MethodContext,
): void => recompute(node, graphId, ctx);
const onRefreshRequest = (node: RoundNode, _socketId: string, _side: "in" | "out", _reason: NodeTypes.RefreshReason, graphId: string, ctx: NodeTypes.MethodContext): void =>
    recompute(node, graphId, ctx);

const getSocketType = (node: NodeDefinitions.NodeFor<RoundDefinition>, socketId: string, side: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): SocketTypes.Term => {
    const stored = ctx.readSocketType(graphId, node.id, socketId, side);
    if (stored) return stored;
    // Unsolved (fresh node / post-load, before any hook fired): the def's honest declared types.
    switch (socketId) {
        case "input":
            return SocketTypes.NUMERIC;
        case "output":
            return OUTPUT_DEFAULT;
        case "mode":
            return ENUM_IN;
        default:
            return side === "in" ? SocketTypes.ANY : SocketTypes.NONE;
    }
};

export const RoundType: NodeTypes.Type<"round", RoundDefinition> = {
    type: "round",
    displayName: "Round",
    defaultLabel: "Round",
    iconNode: <NodeIcon shape={NODE_ICONS.round} />,
    flavour: "help",
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
    canInterject: passthroughCanInterject(SocketTypes.NUMERIC, SocketTypes.NUMERIC),
    onInterject: passthroughInterject("input", "output"),
};
