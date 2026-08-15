import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { NumericString } from "../../datatypes/numericString";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

// --- Deterministic hash: (seed, source) -> uint32, well-distributed (mulberry32 finalizer). Same draw
// feeds both outputs. Source is keyed by the EXACT bits of its double, so any int OR float hashes cleanly
// and distinct sources are uncorrelated (pure hash, not smooth noise).
const mix = (x: number): number => {
    x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
    x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
    x = x ^ (x >>> 15);
    return x >>> 0;
};

const HASH_DV = new DataView(new ArrayBuffer(8));
const hash = (seed: number, source: number): number => {
    HASH_DV.setFloat64(0, source);
    let h = mix((seed >>> 0) ^ 0x9e3779b9);
    h = mix(h ^ HASH_DV.getUint32(0));
    h = mix(h ^ HASH_DV.getUint32(4));
    return h >>> 0;
};

const def = signature({
    in: { seed: "integer", source: $.oneOf("integer", "float"), min: $.oneOf("integer", "float"), max: $.oneOf("integer", "float") },
    out: { float: "float", integer: "integer" },
});

export type RandomDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        seed: DataTypes.TypeOf<DataTypes.Integer>;
        source: DataTypes.TypeOf<DataTypes.Float>;
        min: DataTypes.TypeOf<DataTypes.Float>;
        max: DataTypes.TypeOf<DataTypes.Float>;
    }
>;

type RandomNode = NodeDefinitions.BuiltNodeOf<"random", RandomDefinition>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<RandomDefinition>>, id: string = nanoid()): RandomNode => {
    return {
        id,
        in: { seed: null, source: null, min: null, max: null },
        out: { float: [], integer: [] },
        payload: {
            label: "",
            seed: `${Math.floor(Math.random() * 1000000)}`,
            source: "0",
            min: "0",
            max: "1",
        },
        type: "random",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<RandomDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const floatPreview = Project.useCachedOutput(graphId, node, "float");
    const integerPreview = Project.useCachedOutput(graphId, node, "integer");
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<RandomDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );
    const handleRandomize = useCallback(() => {
        handleUpdate({ seed: `${Math.floor(Math.random() * 1000000)}` });
    }, [handleUpdate]);

    const seedConnected = node.in.seed !== null;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"float"} label={"Float"}>
                <ValuePreview value={floatPreview} />
            </SocketOut>
            <SocketOut node={node} socketId={"integer"} label={"Integer"}>
                <ValuePreview value={integerPreview} />
            </SocketOut>
            <hr />
            <SocketIn node={node} socketId={"seed"} label={"Seed"}>
                <IntegerInput value={node.payload.seed} onCommit={(seed) => handleUpdate({ seed })} disabled={seedConnected} min={"0"} />
            </SocketIn>
            <ActionButton onClick={handleRandomize} flavour={"accent"} disabled={seedConnected}>
                Generate
            </ActionButton>
            <SocketIn node={node} socketId={"source"} label={"Source"}>
                <DecimalInput value={node.payload.source} onCommit={(source) => handleUpdate({ source })} disabled={node.in.source !== null} />
            </SocketIn>
            <NodeAccordion label={"Range"} nodeId={node.id} socketsIn={"min|max"}>
                <SocketIn node={node} socketId={"min"} label={"Min"}>
                    <DecimalInput value={node.payload.min} onCommit={(min) => handleUpdate({ min })} disabled={node.in.min !== null} />
                </SocketIn>
                <SocketIn node={node} socketId={"max"} label={"Max"}>
                    <DecimalInput value={node.payload.max} onCommit={(max) => handleUpdate({ max })} disabled={node.in.max !== null} />
                </SocketIn>
            </NodeAccordion>
        </TypicalNode>
    );
};

const GEN_INPUTS: (keyof RandomDefinition["inputs"])[] = ["seed", "source", "min", "max"];

const dependsOn = (_node: NodeDefinitions.NodeFor<RandomDefinition>, outSocket: keyof RandomDefinition["outputs"], _deps: AllDeps): (keyof RandomDefinition["inputs"])[] => {
    if (outSocket === "float" || outSocket === "integer") return GEN_INPUTS;
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<RandomDefinition>, _inSocket: keyof RandomDefinition["inputs"], _deps: AllDeps): (keyof RandomDefinition["outputs"])[] => {
    return ["float", "integer"];
};

const evaluate = (node: NodeDefinitions.NodeFor<RandomDefinition>, socket: keyof RandomDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const seed = NumericString.Emptyable.asNumber(context.resolve<DataTypes.Integer>(node.id, "seed")?.data ?? node.payload.seed) ?? 0;
    const source = NumericString.Emptyable.asNumber(context.resolve<DataTypes.Float>(node.id, "source")?.data ?? node.payload.source) ?? 0;
    const min = NumericString.Emptyable.asNumber(context.resolve<DataTypes.Float>(node.id, "min")?.data ?? node.payload.min) ?? 0;
    const max = NumericString.Emptyable.asNumber(context.resolve<DataTypes.Float>(node.id, "max")?.data ?? node.payload.max) ?? 1;

    const h = hash(seed, source);

    if (socket === "float") {
        // divide by 2^32 - 1 so t reaches 1 -> [min, max] closed
        const t = h / 4294967295;
        return { kind: "float", data: `${min + (max - min) * t}` };
    }
    if (socket === "integer") {
        let lo = Math.trunc(min);
        let hi = Math.trunc(max);
        if (lo > hi) [lo, hi] = [hi, lo];
        // half-open t here so floor() can't overflow past hi at t === 1
        const t = h / 4294967296;
        return { kind: "integer", data: `${lo + Math.floor(t * (hi - lo + 1))}` };
    }
    return null;
};

export const RandomNodeType: NodeTypes.Type<"random", RandomDefinition> = {
    type: "random",
    displayName: "Random",
    defaultLabel: "Random",
    iconNode: <NodeIcon shape={NODE_ICONS.random} />,
    flavour: "accent",
    category: "Values",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
