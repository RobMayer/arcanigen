import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { Project } from "../../../state/project";

export type LengthDefinition = {
    inputs: {
        value: DataTypes.Use<"length">;
    };
    outputs: {
        output: DataTypes.Use<"length">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        value: DataTypes.TypeOf<DataTypes.Use<"length">>;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<LengthDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"length", LengthDefinition> => {
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
            value: input.value ?? "0px",
        },
        type: "length",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<LengthDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<LengthDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"length"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"value"} type={"length"} label={"Value"}>
                <LengthInput value={node.payload.value} onCommit={(value) => handleUpdate({ value })} disabled={node.in.value !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<LengthDefinition>, outSocket: "output", _deps: AllDeps): (keyof LengthDefinition["inputs"])[] => {
    if (outSocket === "output") return ["value"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<LengthDefinition>, inSocket: keyof LengthDefinition["inputs"], _deps: AllDeps): (keyof LengthDefinition["outputs"])[] => {
    if (inSocket === "value") return ["output"];
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<LengthDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        return {
            kind: "length",
            data: context.resolve<"length">(node.id, "value")?.data ?? node.payload.value,
        };
    }
    return null;
};

const SOCKETTYPES_IN: { [key in keyof Required<LengthDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    value: { types: ["length"], mode: "or" },
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

export const LengthPrimitiveType: NodeTypes.Type<"length", LengthDefinition> = {
    type: "length",
    displayName: "Length",
    defaultLabel: "Length",
    iconNode: <Icon shape={NODE_ICONS.lengthValue.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.lengthValue.Card} color={"var(--icon-flavour)"} />,
    category: "Primitives",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    getSocketType,
};
