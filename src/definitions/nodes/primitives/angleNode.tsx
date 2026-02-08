import { nanoid } from "nanoid";
import { NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import AngleInput from "../../../components/inputs/AngleInput";
import { DataTypes, NodeDefinitions, NodeTypes } from "../../betterTypes";
import { Project } from "../../../state/project";

export type AngleDefinition = {
    inputs: {
        value: DataTypes.Use<"angle">;
    };
    outputs: {
        output: DataTypes.Use<"angle">;
    };
    payload: {
        label: DataTypes.Use<"string">;
        value: DataTypes.Use<"angle">;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<AngleDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"angle", AngleDefinition> => {
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

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<AngleDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<AngleDefinition>>) => {
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

const dependsOn = (node: NodeDefinitions.NodeFor<AngleDefinition>, outSocket: "output"): "value"[] => {
    if (outSocket === "output") return ["value"];
    return [];
};
const evaluate = (node: NodeDefinitions.NodeFor<AngleDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        return {
            kind: "angle",
            data: context.resolve<"angle">(node.id, "value")?.data ?? node.payload.value,
        };
    }
    return null;
};

export const AnglePrimitiveType: NodeTypes.Type<"angle", AngleDefinition> = {
    type: "angle",
    displayName: "Angle",
    defaultLabel: "Angle",
    iconNode: NODE_ICONS.angleValue.Item,
    iconCard: NODE_ICONS.angleValue.Card,
    category: "primitive",
    evaluate,
    Controls,
    dependsOn,
    create,
};
