import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { Resolver } from "../../../util/resolver";
import { SignatureEngine } from "../../helpers/signatureEngine";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";

const def = signature({
    args: { T: $.ANY, E: $.ANY },
    in: ({ T, E }) => ({ if: "boolean", then: T, else: E }),
    out: ({ T, E }) => ({ result: $.oneOf(T, E) }),
});

export type ConditionDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        if: boolean;
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<ConditionDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"condition", ConditionDefinition> => {
    return {
        id,
        in: {
            if: null,
            then: null,
            else: null,
        },
        out: {
            result: [],
        },
        payload: {
            label: "",
            if: true,
        },
        type: "condition",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ConditionDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ConditionDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "result");
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"result"} label={"Result"}>
                <ValuePreview value={preview} />
            </SocketOut>
            <SocketIn node={node} socketId={"if"}>
                <CheckBox checked={node.payload.if} onToggle={(v) => handleUpdate({ if: v })} disabled={node.in.if !== null}>
                    If
                </CheckBox>
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"then"}>
                Then
            </SocketIn>
            <SocketIn node={node} socketId={"else"}>
                Else
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<ConditionDefinition>, outSocket: keyof ConditionDefinition["outputs"], _deps: AllDeps): (keyof ConditionDefinition["inputs"])[] => {
    if (outSocket === "result") {
        return ["if", "then", "else"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ConditionDefinition>, inSocket: keyof ConditionDefinition["inputs"], _deps: AllDeps): (keyof ConditionDefinition["outputs"])[] => {
    if (inSocket === "if" || inSocket === "then" || inSocket === "else") {
        return ["result"];
    }
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<ConditionDefinition>, socket: keyof ConditionDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "result") {
        const condition = context.resolve<"boolean">(node.id, "if");
        const value = condition !== null ? condition.data : node.payload.if;
        return value ? context.resolve(node.id, "then") : context.resolve(node.id, "else");
    }
    return null;
};

export const ConditionNodeType: NodeTypes.Type<"condition", ConditionDefinition> = {
    type: "condition",
    displayName: "Condition",
    defaultLabel: "Condition",
    iconNode: <NodeIcon shape={NODE_ICONS.option} />,
    flavour: "help",
    category: "Logic",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
