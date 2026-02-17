import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { Project } from "../../../state/project";
import { NumericString } from "../../datatypes/numericString";

export type AddFloatDefinition = {
    inputs: {
        a: DataTypes.Use<"float">;
        b: DataTypes.Use<"float">;
    };
    outputs: {
        output: DataTypes.Use<"float">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        a: DataTypes.TypeOf<DataTypes.Use<"float">>;
        b: DataTypes.TypeOf<DataTypes.Use<"float">>;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<AddFloatDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"addFloat", AddFloatDefinition> => {
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
            a: input.a ?? "0",
            b: input.b ?? "0",
        },
        type: "addFloat",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<AddFloatDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<AddFloatDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"float"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"a"} type={"float"} label={"A"}>
                <DecimalInput value={node.payload.a} onCommit={(a) => handleUpdate({ a })} disabled={node.in.a !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"b"} type={"float"} label={"B"}>
                <DecimalInput value={node.payload.b} onCommit={(b) => handleUpdate({ b })} disabled={node.in.b !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<AddFloatDefinition>, outSocket: "output", _deps: AllDeps): (keyof AddFloatDefinition["inputs"])[] => {
    if (outSocket === "output") return ["a", "b"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<AddFloatDefinition>, _inSocket: keyof AddFloatDefinition["inputs"], _deps: AllDeps): (keyof AddFloatDefinition["outputs"])[] => {
    // Both a and b contribute to output
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<AddFloatDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const a = context.resolve<"float">(node.id, "a")?.data ?? node.payload.a;
        const b = context.resolve<"float">(node.id, "b")?.data ?? node.payload.b;
        return {
            kind: "float",
            data: NumericString.add(NumericString.Emptyable.coalesce(a, 0), NumericString.Emptyable.coalesce(b, 0)),
        };
    }
    return null;
};

const getSocketType = (_node: NodeDefinitions.NodeFor<AddFloatDefinition>, socketId: string, _side: "in" | "out"): string => {
    switch (socketId) {
        case "a": return "float";
        case "b": return "float";
        case "output": return "float";
        default: return "float";
    }
};

export const AddFloatType: NodeTypes.Type<"addFloat", AddFloatDefinition> = {
    type: "addFloat",
    displayName: "Add",
    defaultLabel: "Add",
    iconNode: <Icon shape={NODE_ICONS.addValue.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.addValue.Card} color={"var(--icon-flavour)"} />,
    category: "Math",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    getSocketType,
};
