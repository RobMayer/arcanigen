import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { ColorHexInput } from "../../../components/inputs/ColorHexInput";
import { Project } from "../../../state/project";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { value: "color" },
    out: { output: "color" },
});

export type ColorDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<"string">;
        value: DataTypes.TypeOf<"color">;
    }
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<ColorDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"color", ColorDefinition> => {
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
            value: input.value ?? { r: 0, g: 0, b: 0, a: 1 },
        },
        type: "color",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ColorDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ColorDefinition>>) => {
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
                <ColorHexInput value={node.payload.value} onCommit={(value) => handleUpdate({ value })} required alpha disabled={node.in.value !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<ColorDefinition>, outSocket: "output", _deps: AllDeps): (keyof ColorDefinition["inputs"])[] => {
    if (outSocket === "output") return ["value"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ColorDefinition>, inSocket: keyof ColorDefinition["inputs"], _deps: AllDeps): (keyof ColorDefinition["outputs"])[] => {
    if (inSocket === "value") return ["output"];
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<ColorDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        return {
            kind: "color",
            data: context.resolve<"color">(node.id, "value")?.data ?? node.payload.value,
        };
    }
    return null;
};

export const ColorPrimitiveType: NodeTypes.Type<"color", ColorDefinition> = {
    type: "color",
    displayName: "Color",
    defaultLabel: "Color",
    iconNode: <NodeIcon shape={NODE_ICONS.color} />,
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
