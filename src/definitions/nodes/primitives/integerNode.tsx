import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { Project } from "../../../state/project";
import { Enum } from "../../datatypes/enum";
import { extractSingle, applyRounding } from "../math/numericMath";
import { Dropdown } from "../../../components/inputs/Dropdown";

const ROUNDING_MODE_OPTIONS = Enum.options(Enum.Common.roundingMode);

type IntegerNode = NodeDefinitions.BuiltNodeOf<"integer", IntegerDefinition>;

export type IntegerDefinition = {
    inputs: {
        value: DataTypes.Use<"integer">;
        mode: DataTypes.Use<"enum">;
    };
    outputs: {
        output: DataTypes.Use<"integer">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        value: DataTypes.TypeOf<DataTypes.Use<"integer">>;
        roundingMode: number;
        connectedKind: DataTypes.Kind | null;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<IntegerDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"integer", IntegerDefinition> => {
    return {
        id,
        in: {
            value: null,
            mode: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            value: "0",
            roundingMode: input.roundingMode ?? Enum.Common.roundingMode.HALF_EXPAND.value,
            connectedKind: null,
        },
        type: "integer",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<IntegerDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<IntegerDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const isCasting = node.payload.connectedKind !== null && node.payload.connectedKind !== "integer";

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"value"} label={"Value"}>
                <DecimalInput value={node.payload.value} onCommit={(value) => handleUpdate({ value })} disabled={node.in.value !== null} />
            </SocketIn>
            <NodeAccordion label={"Conversion"} nodeId={node.id}>
                <SocketIn node={node} socketId={"mode"} label={"Rounding"}>
                    <Dropdown value={`${node.payload.roundingMode}`} onValue={(v) => handleUpdate({ roundingMode: Number(v) })} disabled={node.in.mode !== null || !isCasting}>
                        {ROUNDING_MODE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </Dropdown>
                </SocketIn>
            </NodeAccordion>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<IntegerDefinition>, outSocket: "output", _deps: AllDeps): (keyof IntegerDefinition["inputs"])[] => {
    if (outSocket === "output") return ["value", "mode"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<IntegerDefinition>, inSocket: keyof IntegerDefinition["inputs"], _deps: AllDeps): (keyof IntegerDefinition["outputs"])[] => {
    if (inSocket === "value" || inSocket === "mode") return ["output"];
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<IntegerDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const val = context.resolve(node.id, "value");
        if (val) {
            if (val.kind === "integer") return val;
            const { value } = extractSingle(val.kind, val.data);
            const modeVal = context.resolve(node.id, "mode");
            const modeData = modeVal ? (modeVal.kind === "integer" ? Number(modeVal.data) : (modeVal.data as number)) : undefined;
            const mode = Enum.resolve(modeData, Enum.Common.roundingMode) ?? node.payload.roundingMode;
            const rounded = applyRounding(value, mode);
            return { kind: "integer", data: `${rounded}` };
        }
        return { kind: "integer", data: node.payload.value };
    }
    return null;
};

const SOCKETTYPES_IN: { [key in keyof Required<IntegerDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    value: { types: ["angle", "float", "integer", "length"], mode: "or" },
    mode: { types: ["enum", "integer"], mode: "or" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<IntegerDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["integer"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<IntegerDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

const setPayload = (nodeId: string, updates: Partial<IntegerDefinition["payload"]>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const current = ctx.getNode(graphId, nodeId);
    if (!current) return;
    ctx.setNode(graphId, nodeId, {
        ...current,
        payload: { ...current.payload, ...updates } as NodeDefinitions.NodeFor<NodeDefinitions.Any>["payload"],
    });
};

const onConnect = (node: IntegerNode, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    if (direction !== "in") return;
    const link = ctx.getLink(graphId, linkId);
    if (!link || link.toSocket !== "value") return;
    const fromNode = ctx.getNode(graphId, link.fromNode);
    if (!fromNode) return;
    const st = NodeTypes.getSocketType(fromNode, link.fromSocket, "out", ctx);
    setPayload(node.id, { connectedKind: st.types[0] ?? null }, graphId, ctx);
};

const onDisconnect = (
    node: IntegerNode,
    link: { fromNode: string; fromSocket: string; toNode: string; toSocket: string },
    direction: "in" | "out",
    graphId: string,
    ctx: NodeTypes.MethodContext,
): void => {
    if (direction !== "in") return;
    if (link.toSocket !== "value") return;
    setPayload(node.id, { connectedKind: null }, graphId, ctx);
};

export const IntegerPrimitiveType: NodeTypes.Type<"integer", IntegerDefinition> = {
    type: "integer",
    displayName: "Integer",
    defaultLabel: "Integer",
    iconNode: <Icon shape={NODE_ICONS.numericValue.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.numericValue.Card} color={"var(--icon-flavour)"} />,
    category: "Primitives",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    getSocketType,
    onConnect,
    onDisconnect,
};
