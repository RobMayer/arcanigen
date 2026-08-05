import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketOut } from "../../../features/nodeview/slots";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";

export type RandomSeedDefinition = {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    inputs: {};
    outputs: {
        output: DataTypes.Use<"integer">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        seed: DataTypes.TypeOf<DataTypes.Use<"integer">>;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<RandomSeedDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"randomSeed", RandomSeedDefinition> => {
    return {
        id,
        in: {},
        out: {
            output: [],
        },
        payload: {
            label: "",
            seed: `${Math.floor(Math.random() * 1000000)}`,
        },
        type: "randomSeed",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<RandomSeedDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<RandomSeedDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const handleRandomize = useCallback(() => {
        handleUpdate({ seed: `${Math.floor(Math.random() * 1000000)}` });
    }, [handleUpdate]);

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <IntegerInput value={node.payload.seed} onCommit={(seed) => handleUpdate({ seed })} min={"0"} />
            <ActionButton onClick={handleRandomize} flavour={"accent"}>
                Randomize
            </ActionButton>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<RandomSeedDefinition>, _outSocket: "output", _deps: AllDeps): never[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<RandomSeedDefinition>, _inSocket: never, _deps: AllDeps): (keyof RandomSeedDefinition["outputs"])[] => {
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<RandomSeedDefinition>, socket: "output", _context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        return { kind: "integer", data: node.payload.seed };
    }
    return null;
};

const SOCKETTYPES_OUT: { [key in keyof Required<RandomSeedDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["integer"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<RandomSeedDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    if (side === "out") return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    return { types: [], mode: "and" };
};

export const RandomSeedNodeType: NodeTypes.Type<"randomSeed", RandomSeedDefinition> = {
    type: "randomSeed",
    displayName: "Random Seed",
    defaultLabel: "Random Seed",
    iconNode: <NodeIcon shape={NODE_ICONS.random} />,
    flavour: "accent",
    category: "Values",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    getSocketType,
};
