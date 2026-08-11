import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { Project } from "../../../state/project";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { value: "boolean" },
    out: { output: "boolean" },
});

export type BooleanDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<"string">;
        value: DataTypes.TypeOf<"boolean">;
    }
>;

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

export const BooleanPrimitiveType: NodeTypes.Type<"boolean", BooleanDefinition> = {
    type: "boolean",
    displayName: "Boolean",
    defaultLabel: "Boolean",
    iconNode: <NodeIcon shape={NODE_ICONS.power} />,
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
