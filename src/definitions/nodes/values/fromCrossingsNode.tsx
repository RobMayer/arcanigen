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

const def = signature({
    in: { path: "path" },
    out: { output: $.arrayOf("point"), pointCount: "integer" },
});

export type FromCrossingsDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<FromCrossingsDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"fromCrossings", FromCrossingsDefinition> => {
    return {
        id,
        in: {
            path: null,
        },
        out: {
            output: [],
            pointCount: [],
        },
        payload: {
            label: "",
        },
        type: "fromCrossings",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<FromCrossingsDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Points
            </SocketOut>
            <SocketIn node={node} socketId={"path"}>
                Path
            </SocketIn>
            <NodeAccordion label="Additional Options" nodeId={node.id} socketsOut="pointCount">
                <SocketOut node={node} socketId={"pointCount"}>
                    Point Count
                </SocketOut>
            </NodeAccordion>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<FromCrossingsDefinition>, outSocket: keyof FromCrossingsDefinition["outputs"], _deps: AllDeps): (keyof FromCrossingsDefinition["inputs"])[] => {
    if (outSocket === "output" || outSocket === "pointCount") {
        return ["path"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<FromCrossingsDefinition>, _inSocket: keyof FromCrossingsDefinition["inputs"], _deps: AllDeps): (keyof FromCrossingsDefinition["outputs"])[] => {
    return ["output", "pointCount"];
};

// The path's self-crossings, in world space. A single input path is intentional — combine multiple
// paths upstream with Path Join so crossings between them surface as self-crossings here.
const resolvePoints = (node: NodeDefinitions.NodeFor<FromCrossingsDefinition>, context: Resolver.Context): { x: number; y: number }[] => {
    const pathData = context.resolve<DataTypes.Path>(node.id, "path")?.data ?? null;
    if (!pathData) return [];
    return PaperHelper.crossings(pathData) ?? [];
};

const evaluate = (node: NodeDefinitions.NodeFor<FromCrossingsDefinition>, socket: keyof FromCrossingsDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "pointCount") {
        return { kind: "integer", data: `${resolvePoints(node, context).length}` };
    }
    if (socket === "output") {
        return { kind: "array<point>", data: resolvePoints(node, context) };
    }
    return null;
};

export const FromCrossingsNodeType: NodeTypes.Type<"fromCrossings", FromCrossingsDefinition> = {
    type: "fromCrossings",
    displayName: "From Crossings",
    defaultLabel: "From Crossings",
    iconNode: <NodeIcon shape={NODE_ICONS.point} modifierIcon={NODE_ICONS.modifiers.arrayOf} />,
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
