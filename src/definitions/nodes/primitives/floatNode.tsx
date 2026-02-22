import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { Project } from "../../../state/project";
import { extractSingle } from "../math/numericMath";

export type FloatDefinition = {
    inputs: {
        value: DataTypes.Use<"float">;
    };
    outputs: {
        output: DataTypes.Use<"float">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        value: DataTypes.TypeOf<DataTypes.Use<"float">>;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<FloatDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"float", FloatDefinition> => {
    return {
        id,
        in: {
            value: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            value: "0",
        },
        type: "float",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<FloatDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<FloatDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"value"} label={"Value"}>
                <DecimalInput value={node.payload.value} onCommit={(value) => handleUpdate({ value })} disabled={node.in.value !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<FloatDefinition>, outSocket: "output", _deps: AllDeps): (keyof FloatDefinition["inputs"])[] => {
    if (outSocket === "output") return ["value"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<FloatDefinition>, inSocket: keyof FloatDefinition["inputs"], _deps: AllDeps): (keyof FloatDefinition["outputs"])[] => {
    if (inSocket === "value") return ["output"];
    return [];
};
const evaluate = (node: NodeDefinitions.NodeFor<FloatDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const val = context.resolve(node.id, "value");
        if (val) {
            if (val.kind === "float") return val;
            const { value } = extractSingle(val.kind, val.data);
            return { kind: "float", data: `${value}` };
        }
        return { kind: "float", data: node.payload.value };
    }
    return null;
};

const SOCKETTYPES_IN: { [key in keyof Required<FloatDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    value: { types: ["angle", "float", "integer", "length"], mode: "or" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<FloatDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["float"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<FloatDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const FloatPrimitiveType: NodeTypes.Type<"float", FloatDefinition> = {
    type: "float",
    displayName: "Float",
    defaultLabel: "Float",
    iconNode: <Icon shape={NODE_ICONS.numericValue.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.numericValue.Card} color={"var(--icon-flavour)"} />,
    category: "Primitives",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    getSocketType,
};
