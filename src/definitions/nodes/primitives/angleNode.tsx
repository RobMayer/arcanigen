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
import AngleInput from "../../../components/inputs/AngleInput";

type AngleDefinition = {
    inputs: {
        value: DataType<"angle">;
    };
    outputs: {
        output: DataType<"angle">;
    };
    payload: {
        label: DataType<"string">;
        value: DataType<"angle">;
    };
};

const create = (input: Partial<DataTypes.PayloadFor<AngleDefinition>>, id: string = nanoid()): BuiltNodeOf<AngleDefinition> => {
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
        type: "angle",
    };
};

const Controls = ({ node, methods }: { node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<AngleDefinition>>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<DataTypes.PayloadFor<AngleDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"angle"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"value"} type={"angle"} label={"Value"}>
                <AngleInput value={node.payload.value} onCommit={(value) => handleUpdate({ value })} disabled={node.in.value !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<AngleDefinition>>, outSocket: "output"): "value"[] => {
    if (outSocket === "output") return ["value"];
    return [];
};
const evaluate = (node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<AngleDefinition>>, socket: "output", context: Resolver.Context): DataTypes.AnyEvaluation | null => {
    if (socket === "output") {
        return {
            kind: "angle",
            data: context.resolve<"angle">(node.id, "value")?.data ?? node.payload.value,
        };
    }
    return null;
};

export const AnglePrimitiveType: NodeType<AngleDefinition> = {
    type: "angle",
    displayName: "Angle",
    defaultLabel: "Angle",
    iconNode: ICONS.Bolt,
    iconCard: ICONS.Bolt,
    category: "primitive",
    evaluate,
    Controls,
    dependsOn,
    create,
};
