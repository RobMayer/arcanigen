import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { Project } from "../../../state/project";
import { extractSingle } from "../../helpers/mathHelper";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { value: $.oneOf("angle", "float", "integer", "length") },
    out: { output: "float" },
});

export type FloatDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<"string">;
        value: DataTypes.TypeOf<"float">;
    }
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<FloatDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"float", FloatDefinition> => {
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

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<FloatDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<FloatDefinition>>) => {
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
                <DecimalInput value={node.payload.value} onCommit={(value) => handleUpdate({ value })} disabled={node.in.value !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<FloatDefinition>, outSocket: "output", _deps: AllDeps): (keyof FloatDefinition["inputs"])[] => {
    if (outSocket === "output") return ["value"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<FloatDefinition>, inSocket: keyof FloatDefinition["inputs"], _deps: AllDeps): (keyof FloatDefinition["outputs"])[] => {
    if (inSocket === "value") return ["output"];
    return [];
};
const evaluate = (node: NodeDefinitions.NodeFor<FloatDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const val = context.resolve(node.id, "value");
        if (val) {
            if (val.kind === "float") return val;
            const { value } = extractSingle(val.kind, val.data);
            return { kind: "float", data: `${value}` };
        }
        return { kind: "float", data: node.payload.value };
    }
    return null;
};

export const FloatPrimitiveType: NodeTypes.Type<"float", FloatDefinition> = {
    type: "float",
    displayName: "Float",
    defaultLabel: "Float",
    iconNode: <NodeIcon shape={NODE_ICONS.num} />,
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
