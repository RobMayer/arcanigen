import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject } from "../../helpers/nodeHelper";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { SocketTypes } from "../../socketTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { MaskedShape } from "../../shapeTypes";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { content: "shape", mask: "shape", showMask: "boolean", maskMode: "enum" },
    out: { output: "shape" },
});

export type MaskDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        showMask: boolean;
        maskMode: DataTypes.TypeOf<DataTypes.Enum>;
    }
>;

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
        const contentShape = context.resolve<DataTypes.Shape>(node.id, "content")?.data ?? null;
        const maskShape = context.resolve<DataTypes.Shape>(node.id, "mask")?.data ?? null;

        if (contentShape === null || maskShape === null) {
            return null;
        }

        const showMask = context.resolve<DataTypes.Boolean>(node.id, "showMask")?.data ?? node.payload.showMask;

        if (showMask) {
            return { kind: "shape", data: maskShape };
        }

        const maskModeEnum = context.resolve<DataTypes.Enum>(node.id, "maskMode")?.data ?? node.payload.maskMode;

        const mode = Enum.keyOf(Enum.Common.maskMode, maskModeEnum) === "LUMINANCE" ? "luminance" : "alpha";

        const masked: MaskedShape = {
            type: "masked",
            content: contentShape,
            mask: {
                shape: maskShape,
                mode,
            },
            transform: "",
        };

        return { kind: "shape", data: masked };
    }

    return null;
};

const SHAPE_RULE_IN: SocketTypes.Term = SocketTypes.of(DataTypes.SHAPE);
const SHAPE_RULE_OUT: SocketTypes.Term = SocketTypes.of(DataTypes.SHAPE);

export const MaskNodeType: NodeTypes.Type<"mask", MaskDefinition> = {
    type: "mask",
    displayName: "Mask",
    defaultLabel: "Mask",
    iconNode: <NodeIcon shape={NODE_ICONS.mask} />,
    flavour: "emphasis",
    category: "Modifiers",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
    canInterject: passthroughCanInterject(SHAPE_RULE_IN, SHAPE_RULE_OUT),
    onInterject: passthroughInterject("content", "output"),
};
