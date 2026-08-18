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
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { value: "string" },
    out: { output: "string", charCount: "integer" },
});

export type StringDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        value: DataTypes.TypeOf<DataTypes.String>;
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<StringDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"string", StringDefinition> => {
    return {
        id,
        in: {
            value: null,
        },
        out: {
            output: [],
            charCount: [],
        },
        payload: {
            label: "",
            value: "",
        },
        type: "string",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<StringDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<StringDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketPair node={node} socketInId={"value"} socketOutId={"output"} label={"Value"}>
                <TextInput value={node.payload.value} onCommit={(value) => handleUpdate({ value })} disabled={node.in.value !== null} />
            </SocketPair>
            <SocketOut node={node} socketId={"charCount"}>
                Character Count
            </SocketOut>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<StringDefinition>, outSocket: keyof StringDefinition["outputs"], _deps: AllDeps): (keyof StringDefinition["inputs"])[] => {
    if (outSocket === "output" || outSocket === "charCount") return ["value"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<StringDefinition>, inSocket: keyof StringDefinition["inputs"], _deps: AllDeps): (keyof StringDefinition["outputs"])[] => {
    if (inSocket === "value") return ["output", "charCount"];
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<StringDefinition>, socket: keyof StringDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const str = context.resolve<DataTypes.String>(node.id, "value")?.data ?? node.payload.value;
    if (socket === "output") return { kind: "string", data: str };
    if (socket === "charCount") return { kind: "integer", data: `${str.length}` };
    return null;
};

export const StringPrimitiveType: NodeTypes.Type<"string", StringDefinition> = {
    type: "string",
    displayName: "String",
    defaultLabel: "String",
    iconNode: <NodeIcon shape={NODE_ICONS.text} />,
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
