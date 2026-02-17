import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { Project } from "../../../state/project";

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
            <SocketOut node={node} socketId={"output"} type={"float"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"value"} type={"float"} label={"Value"}>
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
        return {
            kind: "float",
            data: context.resolve<"float">(node.id, "value")?.data ?? node.payload.value,
        };
    }
    return null;
};

const getSocketType = (_node: NodeDefinitions.NodeFor<FloatDefinition>, socketId: string, _side: "in" | "out"): string => {
    switch (socketId) {
        case "value": return "float";
        case "output": return "float";
        default: return "float";
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
