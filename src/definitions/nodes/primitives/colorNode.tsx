import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes } from "../../betterTypes";
import { ColorHexInput } from "../../../components/inputs/ColorHexInput";
import { Project } from "../../../state/project";

export type ColorDefinition = {
    inputs: {
        value: DataTypes.Use<"color">;
    };
    outputs: {
        output: DataTypes.Use<"color">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        value: DataTypes.TypeOf<DataTypes.Use<"color">>;
    };
};

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
            <SocketOut node={node} socketId={"output"} type={"color"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"value"} type={"color"} label={"Value"}>
                <ColorHexInput value={node.payload.value} onCommit={(value) => handleUpdate({ value })} nullable alpha disabled={node.in.value !== null} />
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

const getSocketType = (_node: NodeDefinitions.NodeFor<ColorDefinition>, socketId: string, _side: "in" | "out"): string => {
    switch (socketId) {
        case "value":
            return "color";
        case "output":
            return "color";
        default:
            return "color";
    }
};

export const ColorPrimitiveType: NodeTypes.Type<"color", ColorDefinition> = {
    type: "color",
    displayName: "Color",
    defaultLabel: "Color",
    iconNode: <Icon shape={NODE_ICONS.colorValue.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.colorValue.Card} color={"var(--icon-flavour)"} />,
    category: "Primitives",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    getSocketType,
};
