import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject } from "../../helpers/nodeHelper";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { SocketTypes } from "../../socketTypes";
import { ReactNode, useCallback } from "react";
import { TypicalNode } from "../../../features/nodeview/node";
import { SocketOut, SocketIn } from "../../../features/nodeview/slots";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { PaperHelper } from "../../../util/paperHelper";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { pathA: "path", pathB: "path", swap: "boolean" },
    out: { output: "path" },
});

export type PathSubtractDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        swap: boolean;
    }
>;

// interject-only rules (mirror the def's socket types)
const PATH_IN: SocketTypes.Term = SocketTypes.of(DataTypes.PATH);
const PATH_OUT: SocketTypes.Term = SocketTypes.of(DataTypes.PATH);

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<PathSubtractDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"pathSubtract", PathSubtractDefinition> => {
    return {
        id,
        in: {
            pathA: null,
            pathB: null,
            swap: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            swap: false,
        },
        type: "pathSubtract",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PathSubtractDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PathSubtractDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

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
            <SocketIn node={node} socketId={"swap"}>
                <CheckBox checked={node.payload.swap} onToggle={(swap) => handleUpdate({ swap })} disabled={node.in.swap !== null}>
                    Swap
                </CheckBox>
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<PathSubtractDefinition>, outSocket: keyof PathSubtractDefinition["outputs"], _deps: AllDeps): (keyof PathSubtractDefinition["inputs"])[] => {
    return ["pathA", "pathB", "swap"];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PathSubtractDefinition>, inSocket: keyof PathSubtractDefinition["inputs"], _deps: AllDeps): (keyof PathSubtractDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<PathSubtractDefinition>, socket: keyof PathSubtractDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const pathAData = context.resolve<DataTypes.Path>(node.id, "pathA")?.data;
    if (!pathAData) return null;

    const pathBData = context.resolve<DataTypes.Path>(node.id, "pathB")?.data;
    if (!pathBData) return null;

    const swap = context.resolve<DataTypes.Boolean>(node.id, "swap")?.data ?? node.payload.swap;
    return swap ? PaperHelper.subtract(pathBData, pathAData) : PaperHelper.subtract(pathAData, pathBData);
};

export const PathSubtractNodeType: NodeTypes.Type<"pathSubtract", PathSubtractDefinition> = {
    type: "pathSubtract",
    displayName: "Path Subtract",
    defaultLabel: "Path Subtract",
    iconNode: <NodeIcon shape={NODE_ICONS.pathSubtract} />,
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
