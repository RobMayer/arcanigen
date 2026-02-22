import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { Dropdown } from "../../../components/inputs/Dropdown";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";

export type LayerComposeDefinition = {
    inputs: {
        shape: DataTypes.Use<"shape">;
        enabled: DataTypes.Use<"boolean">;
        blend: DataTypes.Use<"enum">;
    };
    outputs: {
        output: DataTypes.Use<"layer">;
    };
    payload: {
        label: string;
        enabled: boolean;
        blend: DataTypes.TypeOf<DataTypes.Use<"enum">>;
    };
};

const BLEND_MODE_OPTIONS = Enum.options(Enum.Common.blendMode);

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<LayerComposeDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"layerCompose", LayerComposeDefinition> => {
    return {
        id,
        in: {
            shape: null,
            enabled: null,
            blend: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            enabled: input.enabled ?? true,
            blend: input.blend ?? Enum.Common.blendMode.NORMAL.value,
        },
        type: "layerCompose",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<LayerComposeDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<LayerComposeDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"shape"}>
                Shape
            </SocketIn>
            <SocketIn node={node} socketId={"enabled"}>
                <CheckBox checked={node.payload.enabled} onToggle={(enabled) => handleUpdate({ enabled })} disabled={node.in.enabled !== null}>
                    Enabled
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"blend"} label={"Blend Mode"}>
                <Dropdown value={`${node.payload.blend}`} onValue={(v) => handleUpdate({ blend: Number(v) })} disabled={node.in.blend !== null}>
                    {BLEND_MODE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </Dropdown>
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<LayerComposeDefinition>, _outSocket: keyof LayerComposeDefinition["outputs"], _deps: AllDeps): (keyof LayerComposeDefinition["inputs"])[] => {
    return ["shape", "enabled", "blend"];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<LayerComposeDefinition>, _inSocket: keyof LayerComposeDefinition["inputs"], _deps: AllDeps): (keyof LayerComposeDefinition["outputs"])[] => {
    // All inputs contribute to output
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<LayerComposeDefinition>, socket: keyof LayerComposeDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const shapeEval = context.resolve<"shape">(node.id, "shape");
        const shape = shapeEval?.data ?? null;

        if (shape === null) {
            return null;
        }

        const enabled = context.resolve<"boolean">(node.id, "enabled")?.data ?? node.payload.enabled;
        const blend = Enum.resolve(context.resolve<"enum">(node.id, "blend")?.data, Enum.Common.blendMode) ?? node.payload.blend;

        return {
            kind: "layer",
            data: { shape, enabled, blend },
        };
    }

    return null;
};

const SOCKETTYPES_IN: { [key in keyof Required<LayerComposeDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    shape: { types: ["shape"], mode: "or" },
    enabled: { types: ["boolean"], mode: "or" },
    blend: { types: ["enum"], mode: "or" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<LayerComposeDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["layer"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<LayerComposeDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const LayerComposeNodeType: NodeTypes.Type<"layerCompose", LayerComposeDefinition> = {
    type: "layerCompose",
    displayName: "Compose Layer",
    defaultLabel: "Compose Layer",
    iconNode: <Icon shape={NODE_ICONS.layerCompose} color={"var(--icon-flavour)"} />,
    category: "Collections",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
