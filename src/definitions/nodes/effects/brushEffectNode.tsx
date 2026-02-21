import { nanoid } from "nanoid";
import { Icon, ICONS } from "../../../components/Icon";
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
import { EmptyOr } from "../../../util/misc";

export type BrushEffectDefinition = {
    inputs: {
        input: DataTypes.Use<"shape">;
        brushTip: DataTypes.Use<"length">;
        seed: DataTypes.Use<"integer">;
        shake: DataTypes.Use<"float">;
    };
    outputs: {
        output: DataTypes.Use<"shape">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        brushTip: DataTypes.TypeOf<DataTypes.Use<"length">>;
        seed: DataTypes.TypeOf<DataTypes.Use<"integer">>;
        shake: DataTypes.TypeOf<DataTypes.Use<"float">>;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<BrushEffectDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"brushEffect", BrushEffectDefinition> => {
    return {
        id,
        in: { input: null, brushTip: null, seed: null, shake: null },
        out: { output: [] },
        payload: {
            label: "",
            brushTip: "2pt",
            seed: `${Math.floor(Math.random() * 1000)}`,
            shake: "0.2",
        },
        type: "brushEffect",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<BrushEffectDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<BrushEffectDefinition>>) => {
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
            <SocketIn node={node} socketId={"brushTip"} type={"length"} label={"Brush Tip"}>
                <LengthInput value={node.payload.brushTip} onCommit={(brushTip) => handleUpdate({ brushTip })} disabled={node.in.brushTip !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"shake"} type={"float"} label={"Shake"}>
                <SliderInput value={node.payload.shake} onCommit={(shake) => handleUpdate({ shake })} disabled={node.in.shake !== null} min={"0"} max={"1"} step={"0.001"} />
            </SocketIn>
            <SocketIn node={node} socketId={"seed"} type={"integer"} label={"Random Seed"}>
                <IntegerInput value={node.payload.seed} onCommit={(seed) => handleUpdate({ seed })} disabled={node.in.seed !== null} min={"0"} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<BrushEffectDefinition>, outSocket: "output", _deps: AllDeps): (keyof BrushEffectDefinition["inputs"])[] => {
    if (outSocket === "output") return ["input", "brushTip", "seed", "shake"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<BrushEffectDefinition>, _inSocket: keyof BrushEffectDefinition["inputs"], _deps: AllDeps): (keyof BrushEffectDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<BrushEffectDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const inputShape = context.resolve<"shape">(node.id, "input")?.data;
    if (!inputShape) return null;

    const seed = NumericString.Emptyable.asNumber(context.resolve<"integer">(node.id, "seed")?.data ?? node.payload.seed) ?? 0;
    const tipPx = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "brushTip")?.data ?? node.payload.brushTip) ?? 0;
    const shake = NumericString.Emptyable.asNumber(context.resolve<"float">(node.id, "shake")?.data ?? node.payload.shake) ?? 0;

    const tipRadius = tipPx / 4;
    const shakeScale = shake * 10;

    const filter: FilterPrimitive[] = [
        // Initial blur + alpha reduction of source
        { tag: "feGaussianBlur", attrs: { stdDeviation: 0.5 } },
        { tag: "feColorMatrix", attrs: { result: "out_prime", type: "matrix", values: "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.5 0" } },

        // Three fractal noise layers at different frequencies
        { tag: "feTurbulence", attrs: { type: "fractalNoise", baseFrequency: 0.01, numOctaves: 1, seed, result: "fractal1" } },
        { tag: "feTurbulence", attrs: { type: "fractalNoise", baseFrequency: 0.02, numOctaves: 1, seed: seed + 900, result: "fractal2" } },
        { tag: "feTurbulence", attrs: { type: "fractalNoise", baseFrequency: 0.04, numOctaves: 1, seed: seed + 15007, result: "fractal3" } },

        // Layer 1: displace → dilate → blur → erode → reduce alpha
        { tag: "feDisplacementMap", attrs: { in: "SourceGraphic", in2: "fractal1", scale: shakeScale, xChannelSelector: "G", yChannelSelector: "R" } },
        { tag: "feMorphology", attrs: { radius: tipRadius, operator: "dilate" } },
        { tag: "feGaussianBlur", attrs: { stdDeviation: 0.5 } },
        { tag: "feMorphology", attrs: { radius: tipRadius, operator: "erode" } },
        { tag: "feColorMatrix", attrs: { result: "out_1", type: "matrix", values: "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.5 0" } },

        // Layer 2: displace → dilate → blur → erode → reduce alpha
        { tag: "feDisplacementMap", attrs: { in: "SourceGraphic", in2: "fractal2", scale: shakeScale, xChannelSelector: "B", yChannelSelector: "G" } },
        { tag: "feMorphology", attrs: { radius: tipRadius, operator: "dilate" } },
        { tag: "feGaussianBlur", attrs: { stdDeviation: 0.5 } },
        { tag: "feMorphology", attrs: { radius: tipRadius, operator: "erode" } },
        { tag: "feColorMatrix", attrs: { result: "out_2", type: "matrix", values: "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.5 0" } },

        // Layer 3: displace → dilate → blur → erode → reduce alpha
        { tag: "feDisplacementMap", attrs: { in: "SourceGraphic", in2: "fractal3", scale: shakeScale, xChannelSelector: "G", yChannelSelector: "R" } },
        { tag: "feMorphology", attrs: { radius: tipRadius, operator: "dilate" } },
        { tag: "feGaussianBlur", attrs: { stdDeviation: 0.5 } },
        { tag: "feMorphology", attrs: { radius: tipRadius, operator: "erode" } },
        { tag: "feColorMatrix", attrs: { result: "out_3", type: "matrix", values: "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.5 0" } },

        // Blend all layers together
        { tag: "feBlend", attrs: { in2: "out_1", mode: "multiply" } },
        { tag: "feBlend", attrs: { in2: "out_2", mode: "multiply" } },
        { tag: "feBlend", attrs: { in2: "out_prime", mode: "multiply" } },
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

const SOCKETTYPES_IN: { [key in keyof BrushEffectDefinition["inputs"]]: SocketTypes.SocketRule } = {
    input: { types: ["shape"], mode: "and" },
    brushTip: { types: ["length"], mode: "and" },
    seed: { types: ["integer"], mode: "and" },
    shake: { types: ["float"], mode: "and" },
};

const SOCKETTYPES_OUT: { [key in keyof BrushEffectDefinition["outputs"]]: SocketTypes.SocketRule } = {
    output: { types: ["shape"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<BrushEffectDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    if (side === "out") return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT] ?? { types: ["shape"], mode: "and" };
    return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN] ?? { types: ["shape"], mode: "and" };
};

export const BrushEffectNodeType: NodeTypes.Type<"brushEffect", BrushEffectDefinition> = {
    type: "brushEffect",
    displayName: "Brush Stroke",
    defaultLabel: "Brush Stroke",
    iconNode: <Icon shape={ICONS.Blank} color={"var(--icon-flavour)"} />,
    category: "Effects",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
