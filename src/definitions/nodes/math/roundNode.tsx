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
import { Enum } from "../../datatypes/enum";
import { Dropdown } from "../../../components/inputs/Dropdown";

const ROUNDING_MODE_OPTIONS = Enum.options(Enum.Common.roundingMode);

export type RoundDefinition = {
    inputs: {
        input: DataTypes.Use<"float">;
        mode: DataTypes.Use<"enum">;
    };
    outputs: {
        output: DataTypes.Use<"float">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        input: DataTypes.TypeOf<DataTypes.Use<"float">>;
        mode: number;
        connectedType: SocketTypes.SocketRule;
        resolvedInTypes: SocketTypes.SocketRule;
    };
};

type RoundNode = NodeDefinitions.BuiltNodeOf<"round", RoundDefinition>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<RoundDefinition>>, id: string = nanoid()): RoundNode => {
    return {
        id,
        in: { input: null, mode: null },
        out: { output: [] },
        payload: {
            label: "",
            input: input.input ?? "0",
            mode: input.mode ?? Enum.Common.roundingMode["Half Expand"],
            connectedType: SocketTypes.NONE,
            resolvedInTypes: SocketTypes.ANY,
        },
        type: "round",
    };
};

const effectiveInputType = (connectedType: SocketTypes.SocketRule, resolvedInTypes: SocketTypes.SocketRule): SocketTypes.SocketRule => {
    if (connectedType.types.length > 0) return connectedType;
    return SocketTypes.intersect(NUMERIC_TYPES, resolvedInTypes);
};

const roundedOutputType = (inputType: SocketTypes.SocketRule): SocketTypes.SocketRule => {
    return { types: inputType.types.map((t) => (t === "float" ? "integer" : t)) as DataTypes.Kind[], mode: inputType.mode };
};

const queryDownstreamTypes = (node: RoundNode, graphId: string, ctx: NodeTypes.MethodContext): SocketTypes.SocketRule | null => {
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

const applyRounding = (value: number, mode: number): number => {
    switch (mode) {
        case Enum.Common.roundingMode.Ceil:
            return Math.ceil(value);
        case Enum.Common.roundingMode.Floor:
            return Math.floor(value);
        case Enum.Common.roundingMode.Truncate:
            return Math.trunc(value);
        case Enum.Common.roundingMode.Expand:
            return value >= 0 ? Math.ceil(value) : Math.floor(value);
        case Enum.Common.roundingMode["Half Ceil"]:
            return Math.round(value);
        case Enum.Common.roundingMode["Half Floor"]:
            return -Math.round(-value);
        case Enum.Common.roundingMode["Half Truncate"]: {
            const rounded = Math.round(Math.abs(value));
            const abs = Math.abs(value);
            const frac = abs - Math.floor(abs);
            if (frac === 0.5) return value >= 0 ? Math.floor(value) : Math.ceil(value);
            return Math.round(value);
        }
        case Enum.Common.roundingMode["Half Expand"]: {
            const abs = Math.abs(value);
            const frac = abs - Math.floor(abs);
            if (frac === 0.5) return value >= 0 ? Math.ceil(value) : Math.floor(value);
            return Math.round(value);
        }
        default:
            return Math.round(value);
    }
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<RoundDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<RoundDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const inType = effectiveInputType(node.payload.connectedType, node.payload.resolvedInTypes);
    const outType = roundedOutputType(inType);

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={SocketTypes.toCSS(outType)}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"input"} type={SocketTypes.toCSS(inType)} label={"Input"}>
                <DecimalInput value={node.payload.input} onCommit={(input) => handleUpdate({ input })} disabled={node.in.input !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"mode"} type={"enum"} label={"Mode"}>
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
        const kind = val?.kind ?? "float";
        const data = val?.data ?? node.payload.input;
        const { value, unit } = extractSingle(kind, data);
        const mode = Enum.resolve(context.resolve<"enum">(node.id, "mode")?.data, Enum.Common.roundingMode) ?? node.payload.mode;
        const outputKind = kind === "float" ? "integer" : kind;
        return wrapResult(applyRounding(value, mode), outputKind, unit);
    }
    return null;
};

const setPayload = (nodeId: string, updates: Partial<RoundDefinition["payload"]>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const current = ctx.getNode(graphId, nodeId);
    if (!current) return;
    ctx.setNode(graphId, nodeId, {
        ...current,
        payload: { ...current.payload, ...updates } as NodeDefinitions.NodeFor<NodeDefinitions.Any>["payload"],
    });
};

const onConnect = (node: RoundNode, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    const link = ctx.getLink(graphId, linkId);
    if (!link) return;

    if (direction === "in") {
        if (link.toSocket === "mode") return;
        const upstreamType = queryUpstreamOutType(node, "input", graphId, ctx);
        setPayload(node.id, { connectedType: upstreamType }, graphId, ctx);
        ctx.requestRefresh(graphId, node.id, "output", "out", "constraintAdded");
    } else {
        const currentNode = ctx.getNode(graphId, node.id) as RoundNode | undefined;
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

const onDisconnect = (node: RoundNode, link: { fromNode: string; fromSocket: string; toNode: string; toSocket: string }, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    if (direction === "in") {
        if (link.toSocket === "mode") return;
        ctx.requestRefresh(graphId, node.id, "output", "out", "constraintRemoved");
        setPayload(node.id, { connectedType: SocketTypes.NONE }, graphId, ctx);
        ctx.requestRefresh(graphId, node.id, "output", "out", "constraintAdded");
    } else {
        ctx.requestRefresh(graphId, node.id, "input", "in", "constraintRemoved");
        const currentNode = ctx.getNode(graphId, node.id) as RoundNode | undefined;
        if (!currentNode) return;
        const downstream = queryDownstreamTypes(currentNode, graphId, ctx);
        setPayload(node.id, { resolvedInTypes: downstream ?? SocketTypes.ANY }, graphId, ctx);
        ctx.requestRefresh(graphId, node.id, "input", "in", "constraintAdded");
    }
};

const onRefreshRequest = (node: RoundNode, socketId: string, side: "in" | "out", reason: NodeTypes.RefreshReason, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const currentNode = ctx.getNode(graphId, node.id) as RoundNode | undefined;
    if (!currentNode) return;

    if (side === "in") {
        if (socketId === "mode") return;
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

const ENUM_IN: SocketTypes.SocketRule = { types: ["enum"], mode: "or" };

const getSocketType = (node: NodeDefinitions.NodeFor<RoundDefinition>, socketId: string, _side: "in" | "out", _ctx: NodeTypes.MethodContext): SocketTypes.SocketRule => {
    const inType = effectiveInputType(node.payload.connectedType, node.payload.resolvedInTypes);
    switch (socketId) {
        case "input":
            return inType;
        case "output":
            return roundedOutputType(inType);
        case "mode":
            return ENUM_IN;
        default:
            return NUMERIC_TYPES;
    }
};

export const RoundType: NodeTypes.Type<"round", RoundDefinition> = {
    type: "round",
    displayName: "Round",
    defaultLabel: "Round",
    iconNode: <Icon shape={NODE_ICONS.roundValue.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.roundValue.Card} color={"var(--icon-flavour)"} />,
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
