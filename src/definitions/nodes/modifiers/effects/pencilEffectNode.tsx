import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject } from "../../../helpers/nodeHelper";
import { NodeIcon, NODE_ICONS } from "../../../../components/Icon";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../../features/nodeview/slots";
import { IntegerInput } from "../../../../components/inputs/IntegerInput";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../../nodeTypes";
import { DataTypes } from "../../../dataTypes";
import { SocketTypes } from "../../../socketTypes";
import { Project } from "../../../../state/project";
import { Resolver } from "../../../../util/resolver";
import { NumericString } from "../../../datatypes/numericString";
import { FilterPrimitive } from "../../../shapeTypes";
import { signature, SignatureBuilder } from "../../../helpers/signatureBuilder";
import { SignatureEngine } from "../../../helpers/signatureEngine";

const def = signature({
    in: { input: "shape", seed: "integer" },
    out: { output: "shape" },
});

export type PencilEffectDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        seed: DataTypes.TypeOf<DataTypes.Integer>;
    }
>;

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
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"input"}>
                Input
            </SocketIn>
            <SocketIn node={node} socketId={"seed"} label={"Random Seed"}>
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

    const inputShape = context.resolve<DataTypes.Shape>(node.id, "input")?.data;
    if (!inputShape) return null;

    const seed = Math.max(0, Math.round(NumericString.Emptyable.asNumber(context.resolve<DataTypes.Integer>(node.id, "seed")?.data ?? node.payload.seed) ?? 0));

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

export const PencilEffectNodeType: NodeTypes.Type<"pencilEffect", PencilEffectDefinition> = {
    type: "pencilEffect",
    displayName: "Pencil",
    defaultLabel: "Pencil",
    iconNode: <NodeIcon shape={NODE_ICONS.pencil} />,
    flavour: "emphasis",
    category: "Modifiers",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
    canInterject: passthroughCanInterject(SocketTypes.of(DataTypes.SHAPE), SocketTypes.of(DataTypes.SHAPE)),
    onInterject: passthroughInterject("input", "output"),
};
