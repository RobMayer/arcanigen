import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { makeCanInterject, makeOnInterject } from "../math/numericMath";
import { MaskedShape } from "../../shapeTypes";

export type MaskDefinition = {
    inputs: {
        content: DataTypes.Use<"shape">;
        mask: DataTypes.Use<"shape">;
        showMask: DataTypes.Use<"boolean">;
        maskMode: DataTypes.Use<"enum">;
    };
    outputs: {
        output: DataTypes.Use<"shape">;
    };
    payload: {
        label: string;
        showMask: boolean;
        maskMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
    };
};

const MASK_MODE_OPTIONS = Enum.options(Enum.Common.maskMode);

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<MaskDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"mask", MaskDefinition> => {
    return {
        id,
        in: {
            content: null,
            mask: null,
            showMask: null,
            maskMode: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            showMask: input.showMask ?? false,
            maskMode: input.maskMode ?? Enum.Common.maskMode.LUMINANCE.value,
        },
        type: "mask",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<MaskDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<MaskDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"content"}>
                Content
            </SocketIn>
            <SocketIn node={node} socketId={"mask"}>
                Mask
            </SocketIn>
            <SocketIn node={node} socketId={"showMask"}>
                <CheckBox checked={node.payload.showMask} onToggle={(showMask) => handleUpdate({ showMask })} disabled={node.in.showMask !== null}>
                    Show Mask on Output
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"maskMode"} label={"Mask Mode"}>
                <RadioButton.Group
                    orientation={"horizontal"}
                    value={`${node.payload.maskMode}`}
                    onValue={(v) => handleUpdate({ maskMode: Number(v) })}
                    disabled={node.in.maskMode !== null}
                    options={MASK_MODE_OPTIONS}
                />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<MaskDefinition>, _outSocket: keyof MaskDefinition["outputs"], _deps: AllDeps): (keyof MaskDefinition["inputs"])[] => {
    return ["content", "mask", "showMask", "maskMode"];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<MaskDefinition>, _inSocket: keyof MaskDefinition["inputs"], _deps: AllDeps): (keyof MaskDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<MaskDefinition>, socket: keyof MaskDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const contentShape = context.resolve<"shape">(node.id, "content")?.data ?? null;
        const maskShape = context.resolve<"shape">(node.id, "mask")?.data ?? null;

        if (contentShape === null || maskShape === null) {
            return null;
        }

        const showMask = context.resolve<"boolean">(node.id, "showMask")?.data ?? node.payload.showMask;

        if (showMask) {
            return { kind: "shape", data: maskShape };
        }

        const maskModeEnum = context.resolve<"enum">(node.id, "maskMode")?.data ?? node.payload.maskMode;

        const mode = Enum.keyOf(Enum.Common.maskMode, maskModeEnum) === "LUMINANCE" ? "luminance" : "alpha";

        const masked: MaskedShape = {
            type: "masked",
            content: contentShape,
            mask: {
                shape: maskShape,
                mode,
            },
            transform: "",
            preview: contentShape.preview,
        };

        return { kind: "shape", data: masked };
    }

    return null;
};

const SOCKETTYPES_IN: { [key in keyof Required<MaskDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    content: { types: ["shape"], mode: "or" },
    mask: { types: ["shape"], mode: "or" },
    showMask: { types: ["boolean"], mode: "or" },
    maskMode: { types: ["enum"], mode: "or" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<MaskDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["shape"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<MaskDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

const SHAPE_RULE_IN: SocketTypes.SocketRule = { types: ["shape"], mode: "or" };
const SHAPE_RULE_OUT: SocketTypes.SocketRule = { types: ["shape"], mode: "and" };

export const MaskNodeType: NodeTypes.Type<"mask", MaskDefinition> = {
    type: "mask",
    displayName: "Mask",
    defaultLabel: "Mask",
    iconNode: <Icon shape={NODE_ICONS.mask} color={"var(--icon-flavour)"} />,
    category: "Collections",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
    canInterject: makeCanInterject(SHAPE_RULE_IN, SHAPE_RULE_OUT),
    onInterject: makeOnInterject("content", "output"),
};
