import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { NumericString } from "../../datatypes/numericString";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

// Shuffle randomly permutes `source` -> array<T>, DETERMINISTICALLY by `seed` (same seed + array => same
// order). `shuffledIndices` is the permutation applied (feed into a Gather to keep a co-indexed side-channel
// aligned, like Filter.keptIndices). Fisher-Yates driven by a seeded mulberry32.
const def = signature({
    args: { T: $.ANY },
    in: ({ T }) => ({ source: $.arrayOf(T), seed: "integer" }),
    out: ({ T }) => ({ output: $.arrayOf(T), shuffledIndices: $.arrayOf("integer"), count: "integer" }),
});

export type ShuffleArrayDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        seed: DataTypes.TypeOf<DataTypes.Integer>;
    }
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<ShuffleArrayDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"shuffleArray", ShuffleArrayDefinition> => {
    return {
        id,
        in: { source: null, seed: null },
        out: { output: [], shuffledIndices: [], count: [] },
        payload: { label: "", seed: "0", ...input },
        type: "shuffleArray",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ShuffleArrayDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ShuffleArrayDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketOut node={node} socketId={"shuffledIndices"}>
                Shuffled Indices
            </SocketOut>
            <SocketOut node={node} socketId={"count"}>
                Count
            </SocketOut>
            <hr />
            <SocketIn node={node} socketId={"source"}>
                Source
            </SocketIn>
            <SocketIn node={node} socketId={"seed"} label={"Seed"}>
                <IntegerInput value={node.payload.seed} onCommit={(seed) => handleUpdate({ seed })} disabled={node.in.seed !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<ShuffleArrayDefinition>, outSocket: keyof ShuffleArrayDefinition["outputs"], _deps: AllDeps): (keyof ShuffleArrayDefinition["inputs"])[] => {
    if (outSocket === "output" || outSocket === "shuffledIndices" || outSocket === "count") return ["source", "seed"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ShuffleArrayDefinition>, _inSocket: keyof ShuffleArrayDefinition["inputs"], _deps: AllDeps): (keyof ShuffleArrayDefinition["outputs"])[] => {
    return ["output", "shuffledIndices", "count"];
};

/** Unwrap one `array<...>` layer to its element kind string. */
const unwrapArray = (kind: string): string => (kind.startsWith("array<") && kind.endsWith(">") ? kind.slice("array<".length, -1) : kind);

/** Seeded PRNG (mulberry32) -> a [0,1) stream. Deterministic per seed. */
const mulberry32 = (seed: number): (() => number) => {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

const evaluate = (node: NodeDefinitions.NodeFor<ShuffleArrayDefinition>, socket: keyof ShuffleArrayDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output" && socket !== "shuffledIndices" && socket !== "count") return null;

    const source = context.resolve<DataTypes.ArrayOf<DataTypes.AnyKind>>(node.id, "source");
    if (!source) return null;
    const items = source.data;
    const n = items.length;

    if (socket === "count") return { kind: "integer", data: `${n}` };

    const seed = Math.trunc(NumericString.Emptyable.asNumber(context.resolve<DataTypes.Integer>(node.id, "seed")?.data ?? node.payload.seed) ?? 0);

    // Fisher-Yates over the index list, seeded.
    const idx = Array.from({ length: n }, (_, i) => i);
    const rng = mulberry32(seed);
    for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [idx[i], idx[j]] = [idx[j], idx[i]];
    }

    if (socket === "shuffledIndices") {
        return { kind: "array<integer>", data: idx.map((i) => `${i}`) };
    }
    return { kind: `array<${unwrapArray(source.kind)}>`, data: idx.map((i) => items[i]) };
};

export const ShuffleArrayNodeType: NodeTypes.Type<"shuffleArray", ShuffleArrayDefinition> = {
    type: "shuffleArray",
    displayName: "Shuffle Array",
    defaultLabel: "Shuffle Array",
    iconNode: <NodeIcon shape={NODE_ICONS.array} />,
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
