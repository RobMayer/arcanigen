import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject } from "../../helpers/nodeHelper";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { SocketTypes } from "../../socketTypes";
import { ReactNode } from "react";
import { TypicalNode } from "../../../features/nodeview/node";
import { SocketOut, SocketIn } from "../../../features/nodeview/slots";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { PaperHelper } from "../../../util/paperHelper";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { pathA: "path", pathB: "path" },
    out: { output: "path" },
});

export type PathIntersectDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
    }
>;

// interject-only rules (mirror the def's socket types)
const PATH_IN: SocketTypes.Term = SocketTypes.of(DataTypes.PATH);
const PATH_OUT: SocketTypes.Term = SocketTypes.of(DataTypes.PATH);

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<PathIntersectDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"pathIntersect", PathIntersectDefinition> => {
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
        type: "pathIntersect",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PathIntersectDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
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

const dependsOn = (_node: NodeDefinitions.NodeFor<PathIntersectDefinition>, outSocket: keyof PathIntersectDefinition["outputs"], _deps: AllDeps): (keyof PathIntersectDefinition["inputs"])[] => {
    return ["pathA", "pathB"];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PathIntersectDefinition>, inSocket: keyof PathIntersectDefinition["inputs"], _deps: AllDeps): (keyof PathIntersectDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<PathIntersectDefinition>, socket: keyof PathIntersectDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const pathAData = context.resolve<DataTypes.Path>(node.id, "pathA")?.data;
    if (!pathAData) return null;

    const pathBData = context.resolve<DataTypes.Path>(node.id, "pathB")?.data;
    if (!pathBData) return null;

    return PaperHelper.intersect(pathAData, pathBData);
};

export const PathIntersectNodeType: NodeTypes.Type<"pathIntersect", PathIntersectDefinition> = {
    type: "pathIntersect",
    displayName: "Path Intersect",
    defaultLabel: "Path Intersect",
    iconNode: <NodeIcon shape={NODE_ICONS.pathIntersect} />,
    flavour: "help",
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
