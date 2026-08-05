import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { Project } from "../../../state/project";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { Length } from "../../datatypes/length";
import { Enum } from "../../datatypes/enum";
import { extractSingle } from "../math/numericMath";

const UNIT_OPTIONS = Enum.options(Enum.Common.lengthUnit);
const UNIT_FROM_ENUM: Length.Unit[] = ["px", "pt", "in", "mm", "cm"];

type LengthNode = NodeDefinitions.BuiltNodeOf<"length", LengthDefinition>;

export type LengthDefinition = {
    inputs: {
        value: DataTypes.Use<"length">;
        unit: DataTypes.Use<"enum">;
    };
    outputs: {
        output: DataTypes.Use<"length">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        value: DataTypes.TypeOf<DataTypes.Use<"length">>;
        castUnit: number;
        connectedKind: DataTypes.Kind | null;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<LengthDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"length", LengthDefinition> => {
    return {
        id,
        in: {
            value: null,
            unit: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            value: input.value ?? "0px",
            castUnit: input.castUnit ?? Enum.Common.lengthUnit.PX.value,
            connectedKind: null,
        },
        type: "length",
    };
};

const resolveCastUnit = (node: NodeDefinitions.NodeFor<LengthDefinition>, context: Resolver.Context): Length.Unit => {
    const unitVal = context.resolve(node.id, "unit");
    const unitData = unitVal ? (unitVal.kind === "integer" ? Number(unitVal.data) : (unitVal.data as number)) : undefined;
    const idx = Enum.resolve(unitData, Enum.Common.lengthUnit) ?? node.payload.castUnit;
    return UNIT_FROM_ENUM[idx] ?? "px";
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<LengthDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<LengthDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const isCasting = node.payload.connectedKind !== null && node.payload.connectedKind !== "length";

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"value"} label={"Value"}>
                <LengthInput value={node.payload.value} onCommit={(value) => handleUpdate({ value })} disabled={node.in.value !== null} />
            </SocketIn>
            <NodeAccordion label={"Conversion"} nodeId={node.id}>
                <SocketIn node={node} socketId={"unit"} label={"Unit"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.castUnit}`}
                        options={UNIT_OPTIONS}
                        onValue={(v) => handleUpdate({ castUnit: Number(v) })}
                        disabled={!isCasting || node.in.unit !== null}
                    />
                </SocketIn>
            </NodeAccordion>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<LengthDefinition>, outSocket: "output", _deps: AllDeps): (keyof LengthDefinition["inputs"])[] => {
    if (outSocket === "output") return ["value", "unit"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<LengthDefinition>, inSocket: keyof LengthDefinition["inputs"], _deps: AllDeps): (keyof LengthDefinition["outputs"])[] => {
    if (inSocket === "value" || inSocket === "unit") return ["output"];
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<LengthDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const val = context.resolve(node.id, "value");
        if (val) {
            if (val.kind === "length") return val;
            const { value } = extractSingle(val.kind, val.data);
            const unit = resolveCastUnit(node, context);
            return { kind: "length", data: `${value}${unit}` };
        }
        return { kind: "length", data: node.payload.value };
    }
    return null;
};

const SOCKETTYPES_IN: { [key in keyof Required<LengthDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    value: { types: ["float", "integer", "length"], mode: "or" },
    unit: { types: ["enum"], mode: "and" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<LengthDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["length"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<LengthDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

const setPayload = (nodeId: string, updates: Partial<LengthDefinition["payload"]>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const current = ctx.getNode(graphId, nodeId);
    if (!current) return;
    ctx.setNode(graphId, nodeId, {
        ...current,
        payload: { ...current.payload, ...updates },
    });
};

const onConnect = (node: LengthNode, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    if (direction !== "in") return;
    const link = ctx.getLink(graphId, linkId);
    if (!link || link.toSocket !== "value") return;
    const fromNode = ctx.getNode(graphId, link.fromNode);
    if (!fromNode) return;
    const st = NodeTypes.getSocketType(fromNode, link.fromSocket, "out", ctx);
    setPayload(node.id, { connectedKind: st.types[0] ?? null }, graphId, ctx);
};

const onDisconnect = (
    node: LengthNode,
    link: { fromNode: string; fromSocket: string; toNode: string; toSocket: string },
    direction: "in" | "out",
    graphId: string,
    ctx: NodeTypes.MethodContext,
): void => {
    if (direction !== "in") return;
    if (link.toSocket !== "value") return;
    setPayload(node.id, { connectedKind: null }, graphId, ctx);
};

export const LengthPrimitiveType: NodeTypes.Type<"length", LengthDefinition> = {
    type: "length",
    displayName: "Length",
    defaultLabel: "Length",
    iconNode: <NodeIcon shape={NODE_ICONS.length} />,
    flavour: "accent",
    category: "Values",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    getSocketType,
    onConnect,
    onDisconnect,
};
