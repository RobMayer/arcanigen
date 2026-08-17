import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { sequence: "sequence" },
    out: { index: "integer", count: "integer" },
});

export type SequenceIndexDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<SequenceIndexDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"sequenceIndex", SequenceIndexDefinition> => {
    return {
        id,
        in: {
            sequence: null,
        },
        out: {
            index: [],
            count: [],
        },
        payload: {
            label: "",
        },
        type: "sequenceIndex",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<SequenceIndexDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"index"}>
                Index
            </SocketOut>
            <SocketIn node={node} socketId={"sequence"}>
                Sequence
            </SocketIn>
            <hr />
            <SocketOut node={node} socketId={"count"}>
                Count
            </SocketOut>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<SequenceIndexDefinition>, outSocket: keyof SequenceIndexDefinition["outputs"], _deps: AllDeps): (keyof SequenceIndexDefinition["inputs"])[] => {
    if (outSocket === "index" || outSocket === "count") {
        return ["sequence"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<SequenceIndexDefinition>, inSocket: keyof SequenceIndexDefinition["inputs"], _deps: AllDeps): (keyof SequenceIndexDefinition["outputs"])[] => {
    if (inSocket === "sequence") {
        return ["index", "count"];
    }
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<SequenceIndexDefinition>, socket: keyof SequenceIndexDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const sequenceEval = context.resolve<DataTypes.Sequence>(node.id, "sequence");
    if (!sequenceEval) return null;

    const { count } = sequenceEval.data;
    if (count <= 0) return null;

    if (socket === "count") {
        return { kind: "integer", data: `${count}` };
    }

    if (socket === "index") {
        const iter = context.cursorData[Resolver.cursorKey(sequenceEval.data)] ?? 0;
        return { kind: "integer", data: `${iter}` };
    }

    return null;
};

export const SequenceIndexNodeType: NodeTypes.Type<"sequenceIndex", SequenceIndexDefinition> = {
    type: "sequenceIndex",
    displayName: "Sequence Index",
    defaultLabel: "Sequence Index",
    iconNode: <NodeIcon shape={NODE_ICONS.timeline} modifierIcon={NODE_ICONS.num} />,
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
