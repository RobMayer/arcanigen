import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { Project } from "../../../state/project";

export type IntegerDefinition = {
    inputs: {
        value: DataTypes.Use<"integer">;
    };
    outputs: {
        output: DataTypes.Use<"integer">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        value: DataTypes.TypeOf<DataTypes.Use<"integer">>;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<IntegerDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"integer", IntegerDefinition> => {
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

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"integer"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"value"} type={"integer"} label={"Value"}>
                <DecimalInput value={node.payload.value} onCommit={(value) => handleUpdate({ value })} disabled={node.in.value !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<IntegerDefinition>, outSocket: "output", _deps: AllDeps): (keyof IntegerDefinition["inputs"])[] => {
    if (outSocket === "output") return ["value"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<IntegerDefinition>, inSocket: keyof IntegerDefinition["inputs"], _deps: AllDeps): (keyof IntegerDefinition["outputs"])[] => {
    if (inSocket === "value") return ["output"];
    return [];
};
const evaluate = (node: NodeDefinitions.NodeFor<IntegerDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        return {
            kind: "integer",
            data: context.resolve<"integer">(node.id, "value")?.data ?? node.payload.value,
        };
    }
    return null;
};

const getSocketType = (_node: NodeDefinitions.NodeFor<IntegerDefinition>, socketId: string, _side: "in" | "out"): string => {
    switch (socketId) {
        case "value": return "integer";
        case "output": return "integer";
        default: return "integer";
    }
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
};
