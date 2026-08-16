import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { TransformPrefab } from "../../helpers/transformPrefab";
import { GroupShape } from "../../shapeTypes";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

// Collapses an array of shapes into a single shape: a <g> wrapping every member, with a shared
// transform. The array-native counterpart to the layout nodes (which build the same group from a
// looped single input). Preview is the union of the members' bounds.
const def = signature({
    in: {
        input: $.arrayOf("shape"),
        ...TransformPrefab.SIG_IN,
    },
    out: { output: "shape" },
});

export type ShapeGroupDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
    } & TransformPrefab.Definition["payload"]
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<ShapeGroupDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"shapeGroup", ShapeGroupDefinition> => {
    return {
        id,
        in: {
            input: null,
            // transforms
            position: null,
            rotation: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            // transforms
            position: { ...TransformPrefab.POSITION_DEFAULT },
            rotation: "0deg",
        },
        type: "shapeGroup",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ShapeGroupDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ShapeGroupDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"input"}>
                Shapes
            </SocketIn>
            <TransformPrefab.Controls node={node} handleUpdate={handleUpdate} accordion />
        </TypicalNode>
    );
};

const GEOMETRY_INPUTS: (keyof ShapeGroupDefinition["inputs"])[] = ["input", "position", "rotation"];

const dependsOn = (_node: NodeDefinitions.NodeFor<ShapeGroupDefinition>, _outSocket: keyof ShapeGroupDefinition["outputs"], _deps: AllDeps): (keyof ShapeGroupDefinition["inputs"])[] => {
    return GEOMETRY_INPUTS;
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ShapeGroupDefinition>, _inSocket: keyof ShapeGroupDefinition["inputs"], _deps: AllDeps): (keyof ShapeGroupDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<ShapeGroupDefinition>, socket: keyof ShapeGroupDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const shapes = context.resolve<DataTypes.ArrayOf<DataTypes.Shape>>(node.id, "input")?.data ?? null;
    if (!shapes) return null;

    const children = shapes.filter((s): s is DataTypes.TypeOf<DataTypes.Shape> => s !== null);
    if (children.length === 0) return null;

    const [groupTransforms] = TransformPrefab.evaluate(node, context);

    const group: GroupShape = {
        type: "group",
        children,
        transform: groupTransforms.join(" "),
    };

    return { kind: "shape", data: group };
};

export const ShapeGroupNodeType: NodeTypes.Type<"shapeGroup", ShapeGroupDefinition> = {
    type: "shapeGroup",
    displayName: "Shape Group",
    defaultLabel: "Shape Group",
    iconNode: <NodeIcon shape={NODE_ICONS.group} />,
    flavour: "emphasis",
    category: "Modifiers",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
