import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";

export type SequenceIndexDefinition = {
    inputs: {
        sequence: DataTypes.Use<"sequence">;
    };
    outputs: {
        index: DataTypes.Use<"integer">;
        count: DataTypes.Use<"integer">;
    };
    payload: {
        label: string;
    };
};

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
            <SocketOut node={node} socketId={"count"}>
                Count
            </SocketOut>
            <SocketIn node={node} socketId={"sequence"}>
                Sequence
            </SocketIn>
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
    const sequenceEval = context.resolve<"sequence">(node.id, "sequence");
    if (!sequenceEval) return null;

    const { senderId, count } = sequenceEval.data;
    if (count <= 0) return null;

    if (socket === "count") {
        return { kind: "integer", data: `${count}` };
    }

    if (socket === "index") {
        const iter = context.sequenceData[senderId] ?? 0;
        return { kind: "integer", data: `${iter}` };
    }

    return null;
};

const SOCKETTYPES_IN: { [key in keyof Required<SequenceIndexDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    sequence: { types: ["sequence"], mode: "and" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<SequenceIndexDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    index: { types: ["integer"], mode: "and" },
    count: { types: ["integer"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<SequenceIndexDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const SequenceIndexNodeType: NodeTypes.Type<"sequenceIndex", SequenceIndexDefinition> = {
    type: "sequenceIndex",
    displayName: "Sequence Index",
    defaultLabel: "Sequence Index",
    iconNode: <NodeIcon shape={NODE_ICONS.timeline} modifierIcon={NODE_ICONS.num} />,
    flavour: "danger",
    category: "Logic",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
