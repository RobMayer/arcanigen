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
    in: { path: "path" },
    out: { output: "path" },
});

export type PathHealNodeDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
    }
>;

// interject-only rules (mirror the def's socket types)
const PATH_IN: SocketTypes.Term = SocketTypes.of(DataTypes.PATH);
const PATH_OUT: SocketTypes.Term = SocketTypes.of(DataTypes.PATH);

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<PathHealNodeDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"pathHeal", PathHealNodeDefinition> => {
    return {
        id,
        in: {
            path: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
        },
        type: "pathHeal",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PathHealNodeDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"path"}>
                Input
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<PathHealNodeDefinition>, outSocket: keyof PathHealNodeDefinition["outputs"], _deps: AllDeps): (keyof PathHealNodeDefinition["inputs"])[] => {
    return ["path"];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PathHealNodeDefinition>, inSocket: keyof PathHealNodeDefinition["inputs"], _deps: AllDeps): (keyof PathHealNodeDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<PathHealNodeDefinition>, socket: keyof PathHealNodeDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const pathData = context.resolve<DataTypes.Path>(node.id, "path")?.data;
    if (!pathData) return null;

    return PaperHelper.heal(pathData);
};

export const PathHealNodeType: NodeTypes.Type<"pathHeal", PathHealNodeDefinition> = {
    type: "pathHeal",
    displayName: "Path Heal",
    defaultLabel: "Path Heal",
    iconNode: <NodeIcon shape={NODE_ICONS.pathHeal} />,
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
    onInterject: passthroughInterject("path", "output"),
};
