import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject } from "../../helpers/nodeHelper";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { SocketTypes } from "../../socketTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { ClippedShape, PathShape } from "../../shapeTypes";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { content: "shape", clip: "path", showClip: "boolean" },
    out: { output: "shape" },
});

export type ClipDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        showClip: boolean;
    }
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<ClipDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"clip", ClipDefinition> => {
    return {
        id,
        in: {
            content: null,
            clip: null,
            showClip: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            showClip: input.showClip ?? false,
        },
        type: "clip",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ClipDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ClipDefinition>>) => {
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
            <SocketIn node={node} socketId={"clip"}>
                Clip Path
            </SocketIn>
            <SocketIn node={node} socketId={"showClip"}>
                <CheckBox checked={node.payload.showClip} onToggle={(showClip) => handleUpdate({ showClip })} disabled={node.in.showClip !== null}>
                    Show Clip on Output
                </CheckBox>
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<ClipDefinition>, _outSocket: keyof ClipDefinition["outputs"], _deps: AllDeps): (keyof ClipDefinition["inputs"])[] => {
    return ["content", "clip", "showClip"];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ClipDefinition>, _inSocket: keyof ClipDefinition["inputs"], _deps: AllDeps): (keyof ClipDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<ClipDefinition>, socket: keyof ClipDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const contentShape = context.resolve<DataTypes.Shape>(node.id, "content")?.data ?? null;
        const clipPath = context.resolve<DataTypes.Path>(node.id, "clip")?.data ?? null;

        if (contentShape === null || clipPath === null) {
            return null;
        }

        const showClip = context.resolve<DataTypes.Boolean>(node.id, "showClip")?.data ?? node.payload.showClip;

        if (showClip) {
            const preview: PathShape = {
                type: "path",
                d: clipPath.d,
                paint: { fill: null, stroke: { color: "#ff00ff", width: 1, cap: "butt", join: "miter" } },
                transform: clipPath.transform,
                preview: clipPath.preview,
            };
            return { kind: "shape", data: preview };
        }

        const clipped: ClippedShape = {
            type: "clipped",
            content: contentShape,
            clipPath: clipPath.d,
            transform: "",
            preview: contentShape.preview,
        };

        return { kind: "shape", data: clipped };
    }

    return null;
};

export const ClipNodeType: NodeTypes.Type<"clip", ClipDefinition> = {
    type: "clip",
    displayName: "Clip",
    defaultLabel: "Clip",
    iconNode: <NodeIcon shape={NODE_ICONS.clip} />,
    flavour: "emphasis",
    category: "Modifiers",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
    canInterject: passthroughCanInterject(SocketTypes.of(DataTypes.SHAPE), SocketTypes.of(DataTypes.SHAPE)),
    onInterject: passthroughInterject("content", "output"),
};
