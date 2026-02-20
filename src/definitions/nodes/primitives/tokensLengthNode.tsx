import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { TextInput } from "../../../components/inputs/TextInput";
import { Project } from "../../../state/project";
import { Length } from "../../datatypes/length";

export type TokensLengthDefinition = {
    inputs: {
        value: DataTypes.Use<"tokens<length>">;
    };
    outputs: {
        output: DataTypes.Use<"tokens<length>">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        value: DataTypes.TypeOf<DataTypes.Use<"tokens<length>">>;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<TokensLengthDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"tokensLength", TokensLengthDefinition> => {
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
            value: input.value ?? "",
        },
        type: "tokensLength",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<TokensLengthDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<TokensLengthDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"tokens<length>"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"value"} type={"tokens<length>"} label={"Value"}>
                <TextInput value={node.payload.value} onCommit={(value) => handleUpdate({ value })} pattern={Length.TOKENS_REGEX} disabled={node.in.value !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<TokensLengthDefinition>, outSocket: "output", _deps: AllDeps): (keyof TokensLengthDefinition["inputs"])[] => {
    if (outSocket === "output") return ["value"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<TokensLengthDefinition>, inSocket: keyof TokensLengthDefinition["inputs"], _deps: AllDeps): (keyof TokensLengthDefinition["outputs"])[] => {
    if (inSocket === "value") return ["output"];
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<TokensLengthDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        return {
            kind: "tokens<length>",
            data: context.resolve<"tokens<length>">(node.id, "value")?.data ?? node.payload.value,
        };
    }
    return null;
};

const SOCKETTYPES_IN: { [key in keyof Required<TokensLengthDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    value: { types: ["tokens<length>"], mode: "or" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<TokensLengthDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["tokens<length>"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<TokensLengthDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const TokensLengthPrimitiveType: NodeTypes.Type<"tokensLength", TokensLengthDefinition> = {
    type: "tokensLength",
    displayName: "Tokens (Length)",
    defaultLabel: "Tokens (Length)",
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
