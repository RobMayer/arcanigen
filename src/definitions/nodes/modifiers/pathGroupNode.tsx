import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketPair } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { PaperHelper } from "../../../util/paperHelper";
import { TransformPrefab } from "../../helpers/transformPrefab";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

// Collapses an array of paths into a single compound path (no boolean resolution — every subpath is
// kept). The array-native counterpart to Path Combine's join op, and the path analogue of Shape
// Group. The shared transform is carried on the output path's transform field, baked downstream.
const def = signature({
    in: {
        input: $.arrayOf("path"),
        ...TransformPrefab.SIG_IN,
    },
    out: { output: "path" },
});

export type PathGroupDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
    } & TransformPrefab.Definition["payload"]
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<PathGroupDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"pathGroup", PathGroupDefinition> => {
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
        type: "pathGroup",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PathGroupDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PathGroupDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketPair node={node} socketInId={"input"} socketOutId={"output"}>
                <span>Paths</span>
                <span>Output</span>
            </SocketPair>
            <TransformPrefab.Controls node={node} handleUpdate={handleUpdate} accordion />
        </TypicalNode>
    );
};

const GEOMETRY_INPUTS: (keyof PathGroupDefinition["inputs"])[] = ["input", "position", "rotation"];

const dependsOn = (_node: NodeDefinitions.NodeFor<PathGroupDefinition>, _outSocket: keyof PathGroupDefinition["outputs"], _deps: AllDeps): (keyof PathGroupDefinition["inputs"])[] => {
    return GEOMETRY_INPUTS;
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PathGroupDefinition>, _inSocket: keyof PathGroupDefinition["inputs"], _deps: AllDeps): (keyof PathGroupDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<PathGroupDefinition>, socket: keyof PathGroupDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const paths = context.resolve<DataTypes.ArrayOf<DataTypes.Path>>(node.id, "input")?.data ?? null;
    if (!paths) return null;

    const joined = PaperHelper.join(paths);
    if (!joined || joined.kind !== "path") return null;
    const joinedData = joined.data as DataTypes.TypeOf<DataTypes.Path>;

    // join bakes each member's own transform, so the result is in world space (transform ""). The
    // group-level transform rides the output's transform field, mirroring how Shape Group puts it on <g>.
    const [groupTransforms] = TransformPrefab.evaluate(node, context);
    return {
        kind: "path",
        data: { d: joinedData.d, transform: groupTransforms.join(" ") },
    };
};

export const PathGroupNodeType: NodeTypes.Type<"pathGroup", PathGroupDefinition> = {
    type: "pathGroup",
    displayName: "Path Group",
    defaultLabel: "Path Group",
    iconNode: <NodeIcon shape={NODE_ICONS.group} modifierIcon={NODE_ICONS.path} />,
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
