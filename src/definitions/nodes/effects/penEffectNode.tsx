import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { SliderInput } from "../../../components/inputs/SliderInput";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { NumericString } from "../../datatypes/numericString";
import { Length } from "../../datatypes/length";
import { FilterPrimitive } from "../../shapeTypes";
import { makeCanInterject, makeOnInterject } from "../math/numericMath";

export type PenEffectDefinition = {
    inputs: {
        input: DataTypes.Use<"shape">;
        nib: DataTypes.Use<"length">;
        seed: DataTypes.Use<"integer">;
        smudge: DataTypes.Use<"float">;
        jitter: DataTypes.Use<"float">;
    };
    outputs: {
        output: DataTypes.Use<"shape">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        nib: DataTypes.TypeOf<DataTypes.Use<"length">>;
        seed: DataTypes.TypeOf<DataTypes.Use<"integer">>;
        smudge: DataTypes.TypeOf<DataTypes.Use<"float">>;
        jitter: DataTypes.TypeOf<DataTypes.Use<"float">>;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<PenEffectDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"penEffect", PenEffectDefinition> => {
    return {
        id,
        in: { input: null, nib: null, seed: null, smudge: null, jitter: null },
        out: { output: [] },
        payload: {
            label: "",
            nib: "2pt",
            seed: `${Math.floor(Math.random() * 1000)}`,
            smudge: "0.2",
            jitter: "0.5",
        },
        type: "penEffect",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PenEffectDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PenEffectDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"input"}>
                Input
            </SocketIn>
            <SocketIn node={node} socketId={"nib"} label={"Pen Nib"}>
                <LengthInput value={node.payload.nib} onCommit={(nib) => handleUpdate({ nib })} disabled={node.in.nib !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"smudge"} label={"Smudge"}>
                <SliderInput value={node.payload.smudge} onCommit={(smudge) => handleUpdate({ smudge })} disabled={node.in.smudge !== null} min={"0"} max={"1"} step={"0.001"} />
            </SocketIn>
            <SocketIn node={node} socketId={"jitter"} label={"Jitter"}>
                <SliderInput value={node.payload.jitter} onCommit={(jitter) => handleUpdate({ jitter })} disabled={node.in.jitter !== null} min={"0"} max={"1"} step={"0.001"} />
            </SocketIn>
            <SocketIn node={node} socketId={"seed"} label={"Random Seed"}>
                <IntegerInput value={node.payload.seed} onCommit={(seed) => handleUpdate({ seed })} disabled={node.in.seed !== null} min={"0"} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<PenEffectDefinition>, outSocket: "output", _deps: AllDeps): (keyof PenEffectDefinition["inputs"])[] => {
    if (outSocket === "output") return ["input", "nib", "seed", "smudge", "jitter"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PenEffectDefinition>, _inSocket: keyof PenEffectDefinition["inputs"], _deps: AllDeps): (keyof PenEffectDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<PenEffectDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const inputShape = context.resolve<"shape">(node.id, "input")?.data;
    if (!inputShape) return null;

    const seed = NumericString.Emptyable.asNumber(context.resolve<"integer">(node.id, "seed")?.data ?? node.payload.seed) ?? 0;
    const nibPx = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "nib")?.data ?? node.payload.nib) ?? 0;
    const smudge = NumericString.Emptyable.asNumber(context.resolve<"float">(node.id, "smudge")?.data ?? node.payload.smudge) ?? 0;
    const jitter = NumericString.Emptyable.asNumber(context.resolve<"float">(node.id, "jitter")?.data ?? node.payload.jitter) ?? 0;

    const nibRadius = nibPx / 4;

    const filter: FilterPrimitive[] = [
        { tag: "feTurbulence", attrs: { type: "fractalNoise", baseFrequency: 1, numOctaves: 20, result: "fractal", seed, stitchTiles: "stitch" } },
        { tag: "feGaussianBlur", attrs: { stdDeviation: 0.75, result: "fractal" } },
        { tag: "feMorphology", attrs: { in: "SourceGraphic", radius: nibRadius, operator: "dilate" } },
        { tag: "feDisplacementMap", attrs: { in2: "fractal", scale: 5 + jitter * 15, xChannelSelector: "R", yChannelSelector: "G" } },
        { tag: "feGaussianBlur", attrs: { stdDeviation: smudge, result: "fractal" } },
        { tag: "feMorphology", attrs: { radius: nibRadius, operator: "erode" } },
        { tag: "feBlend", attrs: { in2: "SourceGraphic" } },
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

const SOCKETTYPES_IN: { [key in keyof PenEffectDefinition["inputs"]]: SocketTypes.SocketRule } = {
    input: { types: ["shape"], mode: "and" },
    nib: { types: ["length"], mode: "and" },
    seed: { types: ["integer"], mode: "and" },
    smudge: { types: ["float"], mode: "and" },
    jitter: { types: ["float"], mode: "and" },
};

const SOCKETTYPES_OUT: { [key in keyof PenEffectDefinition["outputs"]]: SocketTypes.SocketRule } = {
    output: { types: ["shape"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<PenEffectDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    if (side === "out") return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT] ?? { types: ["shape"], mode: "and" };
    return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN] ?? { types: ["shape"], mode: "and" };
};

export const PenEffectNodeType: NodeTypes.Type<"penEffect", PenEffectDefinition> = {
    type: "penEffect",
    displayName: "Pen Stroke",
    defaultLabel: "Pen Stroke",
    iconNode: <Icon shape={NODE_ICONS.pen} color={"var(--icon-flavour)"} />,
    category: "Effects",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
    canInterject: makeCanInterject(SOCKETTYPES_IN.input, SOCKETTYPES_OUT.output),
    onInterject: makeOnInterject("input", "output"),
};
