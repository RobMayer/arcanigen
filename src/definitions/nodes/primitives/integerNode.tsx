import { nanoid } from "nanoid";
import { ICONS } from "../../../components/Icon";
import { ArcaneGraph } from "../../../util/structs/arcaneGraph";
import { DataType, DataTypes } from "../../datatypes";
import { BuiltNodeOf, NodeType } from "../abstractNode";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";
import { Project } from "../../../state/project";
import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import IntegerInput from "../../../components/inputs/IntegerInput";

type IntegerDefinition = {
    inputs: {
        value: DataType<"integer">;
    };
    outputs: {
        output: DataType<"integer">;
    };
    payload: {
        label: DataType<"string">;
        value: DataType<"integer">;
    };
};

const create = (input: Partial<DataTypes.PayloadFor<IntegerDefinition>>, id: string = nanoid()): BuiltNodeOf<IntegerDefinition> => {
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

const Controls = ({ node, methods }: { node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<IntegerDefinition>>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<DataTypes.PayloadFor<IntegerDefinition>>) => {
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
                <IntegerInput value={node.payload.value} onCommit={(value) => handleUpdate({ value })} disabled={node.in.value !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<IntegerDefinition>>, outSocket: "output"): "value"[] => {
    if (outSocket === "output") return ["value"];
    return [];
};
const evaluate = (node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<IntegerDefinition>>, socket: "output", context: Resolver.Context): DataTypes.AnyEvaluation | null => {
    if (socket === "output") {
        return {
            kind: "integer",
            data: context.resolve<"integer">(node.id, "value")?.data ?? node.payload.value,
        };
    }
    return null;
};

export const IntegerPrimitiveType: NodeType<IntegerDefinition> = {
    displayName: "Integer",
    defaultLabel: "Integer",
    iconNode: ICONS.Bolt,
    iconCard: ICONS.Bolt,
    category: "primitive",
    evaluate,
    Controls,
    dependsOn,
    type: "integer",
    create,
};
