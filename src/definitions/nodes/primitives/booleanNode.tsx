import { nanoid } from "nanoid";
import { ICONS, Icon } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { Project } from "../../../state/project";

export type BooleanDefinition = {
    inputs: {
        value: DataTypes.Use<"boolean">;
    };
    outputs: {
        output: DataTypes.Use<"boolean">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        value: DataTypes.TypeOf<DataTypes.Use<"boolean">>;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<BooleanDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"boolean", BooleanDefinition> => {
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
            value: input.value ?? false,
        },
        type: "boolean",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<BooleanDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<BooleanDefinition>>) => {
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
                <CheckBox checked={node.payload.value} onToggle={(value) => handleUpdate({ value })} disabled={node.in.value !== null}>
                    Value
                </CheckBox>
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<BooleanDefinition>, outSocket: "output", _deps: AllDeps): (keyof BooleanDefinition["inputs"])[] => {
    if (outSocket === "output") return ["value"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<BooleanDefinition>, inSocket: keyof BooleanDefinition["inputs"], _deps: AllDeps): (keyof BooleanDefinition["outputs"])[] => {
    if (inSocket === "value") return ["output"];
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<BooleanDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        return {
            kind: "boolean",
            data: context.resolve<"boolean">(node.id, "value")?.data ?? node.payload.value,
        };
    }
    return null;
};

const SOCKETTYPES_IN: { [key in keyof Required<BooleanDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    value: { types: ["boolean"], mode: "or" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<BooleanDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["boolean"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<BooleanDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const BooleanPrimitiveType: NodeTypes.Type<"boolean", BooleanDefinition> = {
    type: "boolean",
    displayName: "Boolean",
    defaultLabel: "Boolean",
    iconNode: <Icon shape={ICONS.Check} color={"var(--icon-flavour)"} />,
    category: "Primitives",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    getSocketType,
};
