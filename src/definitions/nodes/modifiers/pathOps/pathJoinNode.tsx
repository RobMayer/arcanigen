import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject } from "../../../helpers/nodeHelper";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../../nodeTypes";
import { DataTypes } from "../../../dataTypes";
import { SocketTypes } from "../../../socketTypes";
import { ReactNode } from "react";
import { TypicalNode } from "../../../../features/nodeview/node";
import { SocketOut, SocketIn } from "../../../../features/nodeview/slots";
import { Project } from "../../../../state/project";
import { Resolver } from "../../../../util/resolver";
import { NodeIcon, NODE_ICONS } from "../../../../components/Icon";
import { PaperHelper } from "../../../../util/paperHelper";
import { signature, SignatureBuilder } from "../../../helpers/signatureBuilder";
import { SignatureEngine } from "../../../helpers/signatureEngine";

const def = signature({
    in: { pathA: "path", pathB: "path" },
    out: { output: "path" },
});

export type PathJoinDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
    }
>;

// interject-only rules (mirror the def's socket types)
const PATH_IN: SocketTypes.Term = SocketTypes.of(DataTypes.PATH);
const PATH_OUT: SocketTypes.Term = SocketTypes.of(DataTypes.PATH);

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<PathJoinDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"pathJoin", PathJoinDefinition> => {
    return {
        id,
        in: {
            pathA: null,
            pathB: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
        },
        type: "pathJoin",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PathJoinDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"pathA"}>
                Path A
            </SocketIn>
            <SocketIn node={node} socketId={"pathB"}>
                Path B
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<PathJoinDefinition>, outSocket: keyof PathJoinDefinition["outputs"], _deps: AllDeps): (keyof PathJoinDefinition["inputs"])[] => {
    return ["pathA", "pathB"];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PathJoinDefinition>, inSocket: keyof PathJoinDefinition["inputs"], _deps: AllDeps): (keyof PathJoinDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<PathJoinDefinition>, socket: keyof PathJoinDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    // Join keeps both paths intact, so a single connected path is a valid result on its own.
    const pathAData = context.resolve<DataTypes.Path>(node.id, "pathA")?.data ?? null;
    const pathBData = context.resolve<DataTypes.Path>(node.id, "pathB")?.data ?? null;

    return PaperHelper.join([pathAData, pathBData]);
};

export const PathJoinNodeType: NodeTypes.Type<"pathJoin", PathJoinDefinition> = {
    type: "pathJoin",
    displayName: "Path Join",
    defaultLabel: "Path Join",
    iconNode: <NodeIcon shape={NODE_ICONS.pathJoin} />,
    flavour: "emphasis",
    category: "Modifiers",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
    canInterject: passthroughCanInterject(PATH_IN, PATH_OUT),
    onInterject: passthroughInterject("pathA", "output"),
};
