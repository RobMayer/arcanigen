import { nanoid } from "nanoid";
import { Icon, ICONS } from "../../../components/Icon";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { NumericString } from "../../datatypes/numericString";
import { FilterPrimitive } from "../../shapeTypes";

export type PencilEffectDefinition = {
    inputs: {
        input: DataTypes.Use<"shape">;
        seed: DataTypes.Use<"integer">;
    };
    outputs: {
        output: DataTypes.Use<"shape">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        seed: DataTypes.TypeOf<DataTypes.Use<"integer">>;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<PencilEffectDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"pencilEffect", PencilEffectDefinition> => {
    return {
        id,
        in: { input: null, seed: null },
        out: { output: [] },
        payload: {
            label: "",
            seed: `${Math.floor(Math.random() * 1000)}`,
        },
        type: "pencilEffect",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PencilEffectDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PencilEffectDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"shape"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"input"} type={"shape"}>
                Input
            </SocketIn>
            <SocketIn node={node} socketId={"seed"} type={"integer"} label={"Random Seed"}>
                <IntegerInput value={node.payload.seed} onCommit={(seed) => handleUpdate({ seed })} disabled={node.in.seed !== null} min={"0"} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<PencilEffectDefinition>, outSocket: "output", _deps: AllDeps): (keyof PencilEffectDefinition["inputs"])[] => {
    if (outSocket === "output") return ["input", "seed"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PencilEffectDefinition>, _inSocket: keyof PencilEffectDefinition["inputs"], _deps: AllDeps): (keyof PencilEffectDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<PencilEffectDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const inputShape = context.resolve<"shape">(node.id, "input")?.data;
    if (!inputShape) return null;

    const seed = NumericString.Emptyable.asNumber(context.resolve<"integer">(node.id, "seed")?.data ?? node.payload.seed) ?? 0;

    const filter: FilterPrimitive[] = [
        { tag: "feTurbulence", attrs: { type: "fractalNoise", baseFrequency: 1, numOctaves: 8, stitchTiles: "stitch", result: "f1", seed } },
        { tag: "feColorMatrix", attrs: { type: "matrix", values: "0 0 0 0 0, 0 0 0 0 0, 0 0 0 0 0, 0 0 0 -1.5 1.5", result: "f2" } },
        { tag: "feComposite", attrs: { operator: "in", in2: "f2", in: "SourceGraphic", result: "f3" } },
        { tag: "feTurbulence", attrs: { type: "fractalNoise", baseFrequency: 1.2, numOctaves: 3, result: "noise", seed: seed + 500 } },
        { tag: "feDisplacementMap", attrs: { xChannelSelector: "R", yChannelSelector: "G", scale: 2.5, in: "f3", result: "f4" } },
    ];

    return {
        kind: "shape",
        data: {
            type: "filtered",
            content: inputShape,
            filter,
            transform: "",
            preview: inputShape.preview,
        },
    };
};

const SOCKETTYPES_IN: { [key in keyof PencilEffectDefinition["inputs"]]: SocketTypes.SocketRule } = {
    input: { types: ["shape"], mode: "and" },
    seed: { types: ["integer"], mode: "and" },
};

const SOCKETTYPES_OUT: { [key in keyof PencilEffectDefinition["outputs"]]: SocketTypes.SocketRule } = {
    output: { types: ["shape"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<PencilEffectDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    if (side === "out") return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT] ?? { types: ["shape"], mode: "and" };
    return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN] ?? { types: ["shape"], mode: "and" };
};

export const PencilEffectNodeType: NodeTypes.Type<"pencilEffect", PencilEffectDefinition> = {
    type: "pencilEffect",
    displayName: "Pencil",
    defaultLabel: "Pencil",
    iconNode: <Icon shape={ICONS.Blank} color={"var(--icon-flavour)"} />,
    category: "Effects",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
