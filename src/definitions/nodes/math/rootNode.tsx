import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject } from "../../helpers/nodeHelper";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { extractSingle, wrapResult } from "../../helpers/mathHelper";
import { SocketTypes } from "../../socketTypes";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    args: { N: $.NUMERIC },
    in: ({ N }) => ({ input: N, degree: $.oneOf("float", "integer") }),
    out: ({ N }) => ({ output: N }),
});

export type RootDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        degree: DataTypes.TypeOf<"float">;
    }
>;

type RootNode = NodeDefinitions.BuiltNodeOf<"root", RootDefinition>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<RootDefinition>>, id: string = nanoid()): RootNode => {
    return {
        id,
        in: { input: null, degree: null },
        out: { output: [] },
        payload: {
            label: "",
            degree: input.degree ?? "2",
        },
        type: "root",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<RootDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<RootDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "output");
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} label={"Output"}>
                <ValuePreview value={preview} />
            </SocketOut>
            <SocketIn node={node} socketId={"input"}>
                Input
            </SocketIn>
            <SocketIn node={node} socketId={"degree"} label={"Degree"}>
                <DecimalInput value={node.payload.degree} onCommit={(degree) => handleUpdate({ degree })} disabled={node.in.degree !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<RootDefinition>, outSocket: "output", _deps: AllDeps): (keyof RootDefinition["inputs"])[] => {
    if (outSocket === "output") return ["input", "degree"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<RootDefinition>, inSocket: keyof RootDefinition["inputs"], _deps: AllDeps): (keyof RootDefinition["outputs"])[] => {
    if (inSocket === "input" || inSocket === "degree") return ["output"];
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<RootDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const val = context.resolve(node.id, "input");
        if (!val) return null;
        const { value, unit } = extractSingle(val.kind, val.data);
        const degVal = context.resolve(node.id, "degree");
        const degData = degVal?.data ?? node.payload.degree;
        const { value: deg } = extractSingle(degVal?.kind ?? "float", degData);
        const result = deg === 0 ? 0 : Math.pow(value, 1 / deg);
        return wrapResult(result, val.kind, unit);
    }
    return null;
};

export const RootType: NodeTypes.Type<"root", RootDefinition> = {
    type: "root",
    displayName: "Root",
    defaultLabel: "Root",
    iconNode: <NodeIcon shape={NODE_ICONS.root} />,
    flavour: "help",
    category: "Math",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    signature: def.instance,
    ...SignatureEngine.hooks,
    canInterject: passthroughCanInterject(SocketTypes.NUMERIC, SocketTypes.NUMERIC),
    onInterject: passthroughInterject("input", "output"),
};
