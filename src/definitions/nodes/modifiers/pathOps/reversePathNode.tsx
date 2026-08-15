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
import { NodeIcon, ICONS } from "../../../components/Icon";
import { PaperHelper } from "../../../util/paperHelper";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { path: "path" },
    out: { output: "path" },
});

export type ReversePathDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
    }
>;

// interject-only rules (mirror the def's socket types)
const PATH_IN: SocketTypes.Term = SocketTypes.of(DataTypes.PATH);
const PATH_OUT: SocketTypes.Term = SocketTypes.of(DataTypes.PATH);

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<ReversePathDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"reversePath", ReversePathDefinition> => {
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
        type: "reversePath",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ReversePathDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
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

const dependsOn = (_node: NodeDefinitions.NodeFor<ReversePathDefinition>, outSocket: keyof ReversePathDefinition["outputs"], _deps: AllDeps): (keyof ReversePathDefinition["inputs"])[] => {
    return ["path"];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ReversePathDefinition>, inSocket: keyof ReversePathDefinition["inputs"], _deps: AllDeps): (keyof ReversePathDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<ReversePathDefinition>, socket: keyof ReversePathDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const pathData = context.resolve<DataTypes.Path>(node.id, "path")?.data;
    if (!pathData) return null;

    const reversed = PaperHelper.reverseD(pathData.d);
    if (reversed === null) return null;

    // Reversing only flips winding direction — transform and bounds are unchanged, so preserve them.
    return {
        kind: "path",
        data: { d: reversed, transform: pathData.transform, preview: pathData.preview },
    };
};

export const ReversePathNodeType: NodeTypes.Type<"reversePath", ReversePathDefinition> = {
    type: "reversePath",
    displayName: "Reverse Path",
    defaultLabel: "Reverse Path",
    iconNode: <NodeIcon shape={ICONS.Media.FastBackward} />,
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
    onInterject: passthroughInterject("path", "output"),
};
