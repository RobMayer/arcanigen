import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { Resolver } from "../../../util/resolver";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

// Array Count reports the element count of any array -> integer. The element type is irrelevant (it never
// reaches the output), so the input is a bare `array<any>` with no shared var.
const def = signature({
    in: { source: $.arrayOf($.ANY) },
    out: { count: "integer" },
});

export type ArrayCountDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
    }
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<ArrayCountDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"arrayCount", ArrayCountDefinition> => {
    return {
        id,
        in: { source: null },
        out: { count: [] },
        payload: { label: "", ...input },
        type: "arrayCount",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ArrayCountDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const countPreview = Project.useCachedOutput(graphId, node, "count");

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"count"} label={"Count"}>
                <ValuePreview value={countPreview} />
            </SocketOut>
            <hr />
            <SocketIn node={node} socketId={"source"} label={"Source"} />
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<ArrayCountDefinition>, outSocket: keyof ArrayCountDefinition["outputs"], _deps: AllDeps): (keyof ArrayCountDefinition["inputs"])[] => {
    if (outSocket === "count") return ["source"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ArrayCountDefinition>, inSocket: keyof ArrayCountDefinition["inputs"], _deps: AllDeps): (keyof ArrayCountDefinition["outputs"])[] => {
    if (inSocket === "source") return ["count"];
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<ArrayCountDefinition>, socket: keyof ArrayCountDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "count") return null;
    const source = context.resolve<DataTypes.ArrayOf<DataTypes.AnyKind>>(node.id, "source");
    if (!source) return null;
    return { kind: "integer", data: `${source.data.length}` };
};

export const ArrayCountNodeType: NodeTypes.Type<"arrayCount", ArrayCountDefinition> = {
    type: "arrayCount",
    displayName: "Array Count",
    defaultLabel: "Array Count",
    iconNode: <NodeIcon shape={NODE_ICONS.num} modifierIcon={NODE_ICONS.modifiers.arrayOf} />,
    flavour: "danger",
    category: "Collection Ops",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
