import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, SocketPair } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { TextInput } from "../../../components/inputs/TextInput";
import { Project } from "../../../state/project";
import { Length } from "../../datatypes/length";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { value: "tokens:length" },
    out: { output: "tokens:length" },
});

export type TokensLengthDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        value: DataTypes.TypeOf<DataTypes.TokensLength>;
    }
>;

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
            <SocketPair node={node} socketInId={"value"} socketOutId={"output"} label={"Value"}>
                <TextInput value={node.payload.value} onCommit={(value) => handleUpdate({ value })} pattern={Length.TOKENS_REGEX} disabled={node.in.value !== null} />
            </SocketPair>
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
            kind: "tokens:length",
            data: context.resolve<DataTypes.TokensLength>(node.id, "value")?.data ?? node.payload.value,
        };
    }
    return null;
};

export const TokensLengthPrimitiveType: NodeTypes.Type<"tokensLength", TokensLengthDefinition> = {
    type: "tokensLength",
    displayName: "Tokens (Length)",
    defaultLabel: "Tokens (Length)",
    iconNode: <NodeIcon shape={NODE_ICONS.length} modifierIcon={NODE_ICONS.modifiers.tokenOf} />,
    flavour: "accent",
    category: "Values",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
