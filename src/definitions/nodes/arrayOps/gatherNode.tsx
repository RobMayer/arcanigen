import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

// Gather re-indexes `source` by `indices` -> a new array of the picked elements. Not a loop node (no bus,
// no driver): a plain pure map. Pairs with Filter.keptIndices to pull a co-indexed side-channel back into
// alignment. Out-of-range / invalid indices are SKIPPED (arrays stay null-free; whole-array consumers
// assume non-null elements). keptIndices never goes out of range, so alignment holds in that flow.
const def = signature({
    args: { T: $.ANY },
    in: ({ T }) => ({ source: $.arrayOf(T), indices: $.arrayOf("integer") }),
    out: ({ T }) => ({ output: $.arrayOf(T) }),
});

export type GatherDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
    }
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<GatherDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"gather", GatherDefinition> => {
    return {
        id,
        in: {
            source: null,
            indices: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            ...input,
        },
        type: "gather",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<GatherDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"source"}>
                Source
            </SocketIn>
            <SocketIn node={node} socketId={"indices"}>
                Indices
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<GatherDefinition>, outSocket: keyof GatherDefinition["outputs"], _deps: AllDeps): (keyof GatherDefinition["inputs"])[] => {
    if (outSocket === "output") {
        return ["source", "indices"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<GatherDefinition>, inSocket: keyof GatherDefinition["inputs"], _deps: AllDeps): (keyof GatherDefinition["outputs"])[] => {
    if (inSocket === "source" || inSocket === "indices") {
        return ["output"];
    }
    return [];
};

/** Unwrap one `array<...>` layer to its element kind string. */
const unwrapArray = (kind: string): string => (kind.startsWith("array<") && kind.endsWith(">") ? kind.slice("array<".length, -1) : kind);

const evaluate = (node: NodeDefinitions.NodeFor<GatherDefinition>, socket: keyof GatherDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const source = context.resolve<DataTypes.ArrayOf<DataTypes.AnyKind>>(node.id, "source");
    const indices = context.resolve<DataTypes.ArrayOf<DataTypes.Integer>>(node.id, "indices");
    if (!source || !indices) return null;

    const items = source.data;
    const out: unknown[] = [];
    for (const raw of indices.data) {
        if (raw === "") continue; // missing index
        const i = Number(raw);
        if (!Number.isInteger(i) || i < 0 || i >= items.length) continue; // out-of-range / invalid -> skip
        out.push(items[i]);
    }

    return { kind: `array<${unwrapArray(source.kind)}>`, data: out };
};

export const GatherNodeType: NodeTypes.Type<"gather", GatherDefinition> = {
    type: "gather",
    displayName: "Gather",
    defaultLabel: "Gather",
    iconNode: <NodeIcon shape={NODE_ICONS.array} />,
    flavour: "danger",
    category: "Math",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
