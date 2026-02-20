import { nanoid } from "nanoid";
import { Icon, ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { ShapePreview, SocketIn, Slot } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { ColorHexInput } from "../../../components/inputs/ColorHexInput";
import { Color } from "../../datatypes/color";

export type ShapePreviewDefinition = {
    inputs: {
        input: DataTypes.Use<"shape">;
    };
    outputs: never;
    payload: {
        label: string;
        backgroundColor: Color.Type;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<ShapePreviewDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"shapePreview", ShapePreviewDefinition> => {
    return {
        id,
        in: {
            input: null,
        },
        out: {},
        payload: {
            label: "",
            backgroundColor: Color.fromHex("#ffffffff"),
        },
        type: "shapePreview",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ShapePreviewDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const resolved = Project.useCachedInput(graphId, node, "input");
    const svgObject = resolved?.kind === "shape" ? resolved.data : null;

    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ShapePreviewDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketIn node={node} socketId={"input"} type={"shape"}>
                Shape
            </SocketIn>
            <ShapePreview shape={svgObject} color={node.payload.backgroundColor} />
            <Slot label={"Background"}>
                <ColorHexInput value={node.payload.backgroundColor} onCommit={(backgroundColor) => handleUpdate({ backgroundColor })} />
            </Slot>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<ShapePreviewDefinition>, _outSocket: keyof ShapePreviewDefinition["outputs"], _deps: AllDeps): (keyof ShapePreviewDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ShapePreviewDefinition>, _inSocket: keyof ShapePreviewDefinition["inputs"], _deps: AllDeps): (keyof ShapePreviewDefinition["outputs"])[] => {
    return [];
};

const evaluate = (_node: NodeDefinitions.NodeFor<ShapePreviewDefinition>, _socket: keyof ShapePreviewDefinition["outputs"], _context: Resolver.Context): DataTypes.AnyEval | null => {
    return null;
};

const SOCKETTYPES_IN: { [key in keyof Required<ShapePreviewDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    input: { types: ["shape"], mode: "or" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<ShapePreviewDefinition>, socketId: string, _side: "in" | "out"): SocketTypes.SocketRule => {
    return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
};

export const ShapePreviewType: NodeTypes.Type<"shapePreview", ShapePreviewDefinition> = {
    type: "shapePreview",
    displayName: "Preview",
    defaultLabel: "Preview",
    iconNode: <Icon shape={ICONS.Zoom} color={"var(--icon-flavour)"} />,
    category: "Meta",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    getSocketType,
};
