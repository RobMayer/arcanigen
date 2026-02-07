import { nanoid } from "nanoid";
import { ICONS } from "../../../components/Icon";
import { ArcaneGraph } from "../../../util/structs/arcaneGraph";
import { DataType, DataTypes } from "../../datatypes";
import { BuiltNodeOf, NodeType } from "../abstractNode";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";
import { Project } from "../../../state/project";
import { TypicalNode } from "../../../features/nodeview/node";
import DecimalInput from "../../../components/inputs/DecimalInput";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";

type FloatDefinition = {
    inputs: {
        value: DataType<"float">;
    };
    outputs: {
        output: DataType<"float">;
    };
    payload: {
        label: DataType<"string">;
        value: DataType<"float">;
    };
};

const create = (input: Partial<DataTypes.PayloadFor<FloatDefinition>>, id: string = nanoid()): BuiltNodeOf<FloatDefinition> => {
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

const Controls = ({ node, methods }: { node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<FloatDefinition>>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<DataTypes.PayloadFor<FloatDefinition>>) => {
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
const dependsOn = (node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<FloatDefinition>>, outSocket: "output"): "value"[] => {
    if (outSocket === "output") return ["value"];
    return [];
};
const evaluate = (node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<FloatDefinition>>, socket: "output", context: Resolver.Context): DataTypes.AnyEvaluation | null => {
    if (socket === "output") {
        return {
            kind: "float",
            data: context.resolve<"float">(node.id, "value")?.data ?? node.payload.value,
        };
    }
    return null;
};

export const FloatPrimitiveType: NodeType<FloatDefinition> = {
    displayName: "Float",
    defaultLabel: "Float",
    iconNode: ICONS.Bolt,
    iconCard: ICONS.Bolt,
    category: "primitive",
    evaluate,
    Controls,
    dependsOn,
    type: "float",
    create,
};
