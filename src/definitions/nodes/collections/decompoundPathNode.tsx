import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { PaperHelper } from "../../../util/paperHelper";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

// Split a compound path into its individual subpaths. A plain (single-subpath) path passes through as
// a one-element array. Transforms are baked into the geometry on import, so every output path is in
// world space (matching From Crossings / Path Length).
const def = signature({
    in: { path: "path" },
    out: { output: $.arrayOf("path"), pathCount: "integer" },
});

export type DecompoundPathDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<DecompoundPathDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"decompoundPath", DecompoundPathDefinition> => {
    return {
        id,
        in: {
            path: null,
        },
        out: {
            output: [],
            pathCount: [],
        },
        payload: {
            label: "",
        },
        type: "decompoundPath",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<DecompoundPathDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Paths
            </SocketOut>
            <SocketIn node={node} socketId={"path"}>
                Path
            </SocketIn>
            <NodeAccordion label="Additional Options" nodeId={node.id} socketsOut="pathCount">
                <SocketOut node={node} socketId={"pathCount"}>
                    Path Count
                </SocketOut>
            </NodeAccordion>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<DecompoundPathDefinition>, outSocket: keyof DecompoundPathDefinition["outputs"], _deps: AllDeps): (keyof DecompoundPathDefinition["inputs"])[] => {
    if (outSocket === "output" || outSocket === "pathCount") {
        return ["path"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<DecompoundPathDefinition>, _inSocket: keyof DecompoundPathDefinition["inputs"], _deps: AllDeps): (keyof DecompoundPathDefinition["outputs"])[] => {
    return ["output", "pathCount"];
};

const resolvePaths = (node: NodeDefinitions.NodeFor<DecompoundPathDefinition>, context: Resolver.Context): DataTypes.TypeOf<DataTypes.Path>[] => {
    const pathData = context.resolve<DataTypes.Path>(node.id, "path")?.data ?? null;
    if (!pathData) return [];
    return PaperHelper.decompound(pathData) ?? [];
};

const evaluate = (node: NodeDefinitions.NodeFor<DecompoundPathDefinition>, socket: keyof DecompoundPathDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "pathCount") {
        return { kind: "integer", data: `${resolvePaths(node, context).length}` };
    }
    if (socket === "output") {
        return { kind: "array<path>", data: resolvePaths(node, context) };
    }
    return null;
};

export const DecompoundPathNodeType: NodeTypes.Type<"decompoundPath", DecompoundPathDefinition> = {
    type: "decompoundPath",
    displayName: "Decompound Path",
    defaultLabel: "Decompound Path",
    iconNode: <NodeIcon shape={NODE_ICONS.path} modifierIcon={NODE_ICONS.modifiers.arrayOf} />,
    flavour: "danger",
    category: "Values",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
