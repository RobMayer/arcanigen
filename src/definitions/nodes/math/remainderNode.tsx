import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject, queryUpstreamOutType, commitSocketTypes } from "../../helpers/nodeHelper";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { TextInput } from "../../../components/inputs/TextInput";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { extractPair, dominantKind, wrapResult } from "../../helpers/mathHelper";
import { NumericKind } from "../../helpers/numericKind";
import { SocketTypes } from "../../socketTypes";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";

type PayloadType = {
    label: string;
    a: string;
    b: string;
};

// ESCAPE HATCH: remainder is asymmetric (float%length = invalid; length%length = length).
// A symmetric join lattice cannot express the dimensionless%dimensional=invalid constraint.
// This `def` is TYPE-ONLY (its `.instance` is unused) -- it exists solely to derive an honest Definition.
const def = signature({
    in: { a: $.NUMERIC, b: $.NUMERIC },
    out: { output: $.NUMERIC },
});

export type RemainderDefinition = SignatureBuilder.DefinitionFrom<typeof def, PayloadType>;

type RemainderNode = NodeDefinitions.BuiltNodeOf<"remainder", RemainderDefinition>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<RemainderDefinition>>, id: string = nanoid()): RemainderNode => {
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
            a: "0",
            b: "1",
        },
        type: "remainder",
    };
};

// --- type solver -------------------------------------------------------------------------------

const isDim = (k: string): boolean => k === "angle" || k === "length";

const NUM_KINDS = ["angle", "float", "integer", "length"] as const;

// Remainder output kind for a given (dividend, divisor) kind pair. Returns null for invalid combos.
// same-dim % same-dim -> same-dim (remainder preserves units); dim % dimensionless -> dim; reverse -> invalid.
const remainderOutputKind = (a: string, b: string): string | null => {
    const dimA = isDim(a);
    const dimB = isDim(b);
    if (dimA && dimB) return a === b ? a : null;
    if (dimB) return null;
    if (dimA) return a;
    return a === "float" || b === "float" ? "float" : "integer";
};

const toTerm = (kinds: Set<string>): SocketTypes.Term =>
    kinds.size === 0 ? SocketTypes.NONE : SocketTypes.set("or", ...[...kinds].sort().map((k) => SocketTypes.atom(k)));

const resolveRemainder = (node: RemainderNode, graphId: string, ctx: NodeTypes.MethodContext): { in: Record<string, SocketTypes.Term>; out: Record<string, SocketTypes.Term> } => {
    const aUp = queryUpstreamOutType(node, "a", graphId, ctx);
    const bUp = queryUpstreamOutType(node, "b", graphId, ctx);

    const aProj = SocketTypes.project(aUp);
    const bProj = SocketTypes.project(bUp);
    const aContrib = aProj.length > 0 ? new Set(aProj) : new Set([NumericKind.kindOf(node.payload.a)]);
    const bContrib = bProj.length > 0 ? new Set(bProj) : new Set([NumericKind.kindOf(node.payload.b)]);

    const outKinds = new Set<string>();
    for (const a of aContrib) {
        for (const b of bContrib) {
            const out = remainderOutputKind(a, b);
            if (out !== null) outKinds.add(out);
        }
    }

    const aRange = node.in.a !== null ? aContrib : new Set<string>(NUM_KINDS);
    const bRange = node.in.b !== null ? bContrib : new Set<string>(NUM_KINDS);

    const validA = new Set<string>();
    for (const a of aRange) {
        for (const b of bContrib) {
            if (remainderOutputKind(a, b) !== null) {
                validA.add(a);
                break;
            }
        }
    }
    const validB = new Set<string>();
    for (const b of bRange) {
        for (const a of aContrib) {
            if (remainderOutputKind(a, b) !== null) {
                validB.add(b);
                break;
            }
        }
    }

    return {
        in: { a: toTerm(validA), b: toTerm(validB) },
        out: { output: outKinds.size === 0 ? SocketTypes.INVALID : toTerm(outKinds) },
    };
};

type AnyRemainderNode = NodeDefinitions.NodeFor<RemainderDefinition>;

const recompute = (node: AnyRemainderNode, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const current = ctx.getNode(graphId, node.id) as RemainderNode | undefined;
    if (!current) return;
    commitSocketTypes(current, graphId, ctx, resolveRemainder(current, graphId, ctx));
};

const onConnect = (node: AnyRemainderNode, _linkId: string, _direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => recompute(node, graphId, ctx);
const onDisconnect = (node: AnyRemainderNode, _link: { fromNode: string; fromSocket: string; toNode: string; toSocket: string }, _direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void =>
    recompute(node, graphId, ctx);
const onRefreshRequest = (node: AnyRemainderNode, _socketId: string, _side: "in" | "out", _reason: NodeTypes.RefreshReason, graphId: string, ctx: NodeTypes.MethodContext): void => recompute(node, graphId, ctx);
const onPayloadChange = (node: AnyRemainderNode, _prev: PayloadType, graphId: string, ctx: NodeTypes.MethodContext): void => recompute(node, graphId, ctx);

const getSocketType = (node: AnyRemainderNode, socketId: string, side: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): SocketTypes.Term => {
    const stored = ctx.readSocketType(graphId, node.id, socketId, side);
    if (stored) return stored;
    switch (socketId) {
        case "a":
        case "b":
            return SocketTypes.NUMERIC;
        case "output": {
            const outKind = remainderOutputKind(NumericKind.kindOf(node.payload.a), NumericKind.kindOf(node.payload.b));
            return outKind !== null ? SocketTypes.atom(outKind) : SocketTypes.INVALID;
        }
        default:
            return side === "in" ? SocketTypes.ANY : SocketTypes.NONE;
    }
};

// --- UI ----------------------------------------------------------------------------------------

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<RemainderDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "output");
    const conflict = SocketTypes.isInvalid(Project.useSocketType(graphId, node, "output", "out"));
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<RemainderDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} label={"Output"}>
                <ValuePreview value={preview} />
            </SocketOut>
            <SocketIn node={node} socketId={"a"} label={"A"}>
                <TextInput value={node.payload.a} onCommit={(a) => handleUpdate({ a })} disabled={node.in.a !== null} pattern={NumericKind.PATTERN} invalid={conflict} />
            </SocketIn>
            <SocketIn node={node} socketId={"b"} label={"B"}>
                <TextInput value={node.payload.b} onCommit={(b) => handleUpdate({ b })} disabled={node.in.b !== null} pattern={NumericKind.PATTERN} invalid={conflict} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<RemainderDefinition>, outSocket: "output", _deps: AllDeps): (keyof RemainderDefinition["inputs"])[] => {
    if (outSocket === "output") return ["a", "b"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<RemainderDefinition>, _inSocket: keyof RemainderDefinition["inputs"], _deps: AllDeps): (keyof RemainderDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<RemainderDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const aVal = context.resolve(node.id, "a") ?? { kind: NumericKind.kindOf(node.payload.a), data: node.payload.a };
        const bVal = context.resolve(node.id, "b") ?? { kind: NumericKind.kindOf(node.payload.b), data: node.payload.b };
        const { a, b, unit } = extractPair(aVal.kind, aVal.data, bVal.kind, bVal.data);
        const outputKind = dominantKind(aVal.kind, bVal.kind);
        return wrapResult(b === 0 ? 0 : a % b, outputKind, unit);
    }
    return null;
};

export const RemainderType: NodeTypes.Type<"remainder", RemainderDefinition> = {
    type: "remainder",
    displayName: "Remainder",
    defaultLabel: "Remainder",
    iconNode: <NodeIcon shape={NODE_ICONS.percent} />,
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
    onPayloadChange,
    canInterject: passthroughCanInterject(SocketTypes.NUMERIC, SocketTypes.NUMERIC),
    onInterject: passthroughInterject("a", "output"),
};
