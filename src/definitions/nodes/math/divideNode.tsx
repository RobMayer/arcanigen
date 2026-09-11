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

// ESCAPE HATCH: division is asymmetric (float/length = invalid; length/length = float, not length).
// Neither the Scale lattice nor any symmetric join can express this, so getSocketType is hand-rolled.
// This `def` is TYPE-ONLY (its `.instance` is unused) -- it exists solely to derive an honest Definition.
const def = signature({
    in: { a: $.NUMERIC, b: $.NUMERIC },
    out: { output: $.NUMERIC },
});

export type DivideDefinition = SignatureBuilder.DefinitionFrom<typeof def, PayloadType>;

type DivideNode = NodeDefinitions.BuiltNodeOf<"divide", DivideDefinition>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<DivideDefinition>>, id: string = nanoid()): DivideNode => {
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
            a: "1",
            b: "1",
        },
        type: "divide",
    };
};

// --- type solver -------------------------------------------------------------------------------

const isDim = (k: string): boolean => k === "angle" || k === "length";

const NUM_KINDS = ["angle", "float", "integer", "length"] as const;

// Division output kind for a given (numerator, denominator) kind pair. Returns null for invalid combos.
// same-dim / same-dim -> float (unit cancellation); dim / dimensionless -> dim; reverse -> invalid.
const divideOutputKind = (a: string, b: string): string | null => {
    const dimA = isDim(a);
    const dimB = isDim(b);
    if (dimA && dimB) return a === b ? "float" : null;
    if (dimB) return null;
    if (dimA) return a;
    return a === "float" || b === "float" ? "float" : "integer";
};

const toTerm = (kinds: Set<string>): SocketTypes.Term =>
    kinds.size === 0 ? SocketTypes.NONE : SocketTypes.set("or", ...[...kinds].sort().map((k) => SocketTypes.atom(k)));

const resolveDivide = (node: DivideNode, graphId: string, ctx: NodeTypes.MethodContext): { in: Record<string, SocketTypes.Term>; out: Record<string, SocketTypes.Term> } => {
    const aUp = queryUpstreamOutType(node, "a", graphId, ctx);
    const bUp = queryUpstreamOutType(node, "b", graphId, ctx);

    // What each input CONTRIBUTES to output kind resolution.
    // Connected -> upstream projection; disconnected -> field-derived kind (grounds the output).
    const aProj = SocketTypes.project(aUp);
    const bProj = SocketTypes.project(bUp);
    const aContrib = aProj.length > 0 ? new Set(aProj) : new Set([NumericKind.kindOf(node.payload.a)]);
    const bContrib = bProj.length > 0 ? new Set(bProj) : new Set([NumericKind.kindOf(node.payload.b)]);

    // Output: all non-null results from the cross-product of contributions.
    const outKinds = new Set<string>();
    for (const a of aContrib) {
        for (const b of bContrib) {
            const out = divideOutputKind(a, b);
            if (out !== null) outKinds.add(out);
        }
    }

    // Input accept range:
    // Connected -> show what the upstream provides (already pinned by aContrib).
    // Disconnected -> all NUM_KINDS valid against the other socket's contribution.
    const aRange = node.in.a !== null ? aContrib : new Set<string>(NUM_KINDS);
    const bRange = node.in.b !== null ? bContrib : new Set<string>(NUM_KINDS);

    const validA = new Set<string>();
    for (const a of aRange) {
        for (const b of bContrib) {
            if (divideOutputKind(a, b) !== null) {
                validA.add(a);
                break;
            }
        }
    }
    const validB = new Set<string>();
    for (const b of bRange) {
        for (const a of aContrib) {
            if (divideOutputKind(a, b) !== null) {
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

type AnyDivideNode = NodeDefinitions.NodeFor<DivideDefinition>;

const recompute = (node: AnyDivideNode, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const current = ctx.getNode(graphId, node.id) as DivideNode | undefined;
    if (!current) return;
    commitSocketTypes(current, graphId, ctx, resolveDivide(current, graphId, ctx));
};

const onConnect = (node: AnyDivideNode, _linkId: string, _direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => recompute(node, graphId, ctx);
const onDisconnect = (node: AnyDivideNode, _link: { fromNode: string; fromSocket: string; toNode: string; toSocket: string }, _direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void =>
    recompute(node, graphId, ctx);
const onRefreshRequest = (node: AnyDivideNode, _socketId: string, _side: "in" | "out", _reason: NodeTypes.RefreshReason, graphId: string, ctx: NodeTypes.MethodContext): void => recompute(node, graphId, ctx);
const onPayloadChange = (node: AnyDivideNode, _prev: PayloadType, graphId: string, ctx: NodeTypes.MethodContext): void => recompute(node, graphId, ctx);

const getSocketType = (node: AnyDivideNode, socketId: string, side: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): SocketTypes.Term => {
    const stored = ctx.readSocketType(graphId, node.id, socketId, side);
    if (stored) return stored;
    // Unsolved (fresh node / post-load, before any hook fired): honest pre-solve defaults.
    switch (socketId) {
        case "a":
        case "b":
            return SocketTypes.NUMERIC;
        case "output": {
            const outKind = divideOutputKind(NumericKind.kindOf(node.payload.a), NumericKind.kindOf(node.payload.b));
            return outKind !== null ? SocketTypes.atom(outKind) : SocketTypes.INVALID;
        }
        default:
            return side === "in" ? SocketTypes.ANY : SocketTypes.NONE;
    }
};

// --- UI ----------------------------------------------------------------------------------------

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<DivideDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "output");
    const conflict = SocketTypes.isInvalid(Project.useSocketType(graphId, node, "output", "out"));
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<DivideDefinition>>) => {
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

const dependsOn = (_node: NodeDefinitions.NodeFor<DivideDefinition>, outSocket: "output", _deps: AllDeps): (keyof DivideDefinition["inputs"])[] => {
    if (outSocket === "output") return ["a", "b"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<DivideDefinition>, _inSocket: keyof DivideDefinition["inputs"], _deps: AllDeps): (keyof DivideDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<DivideDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const aVal = context.resolve(node.id, "a") ?? { kind: NumericKind.kindOf(node.payload.a), data: node.payload.a };
        const bVal = context.resolve(node.id, "b") ?? { kind: NumericKind.kindOf(node.payload.b), data: node.payload.b };
        const { a, b, unit } = extractPair(aVal.kind, aVal.data, bVal.kind, bVal.data);
        // Same-dimension division cancels units -> float with no unit (e.g. 100px / 30px = 3.33).
        const sameDim = isDim(aVal.kind) && aVal.kind === bVal.kind;
        const outputKind = sameDim ? "float" : dominantKind(aVal.kind, bVal.kind);
        return wrapResult(b === 0 ? 0 : a / b, outputKind, sameDim ? null : unit);
    }
    return null;
};

export const DivideType: NodeTypes.Type<"divide", DivideDefinition> = {
    type: "divide",
    displayName: "Divide",
    defaultLabel: "Divide",
    iconNode: <NodeIcon shape={NODE_ICONS.divide} />,
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
