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

// Filter is a loop END + DRIVER (like Map): pulled from downstream, it owns the `for` loop. For each index
// it injects `cursorData[senderId] = i` and re-resolves `keep` (a boolean predicate over the current
// element). Surviving elements are SUMMONED from the paired ForEach's `each` output by the bus's senderId
// -- there is no wire from ForEach.each to Filter, so it uses `context.resolveOutput`. `keptIndices` exposes
// the surviving positions (feed them + any co-indexed side-channel into a Gather to keep alignment).
const def = signature({
    args: { T: $.ANY },
    in: ({ T }) => ({ pipeline: $.loopFor(T), keep: "boolean" }),
    out: ({ T }) => ({ output: $.arrayOf(T), keptIndices: $.arrayOf("integer") }),
});

export type FilterDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
    }
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<FilterDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"filter", FilterDefinition> => {
    return {
        id,
        in: {
            pipeline: null,
            keep: null,
        },
        out: {
            output: [],
            keptIndices: [],
        },
        payload: {
            label: "",
            ...input,
        },
        type: "filter",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<FilterDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketIn node={node} socketId={"pipeline"}>
                Pipeline
            </SocketIn>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketOut node={node} socketId={"keptIndices"}>
                Kept Indices
            </SocketOut>
            <hr />
            <SocketIn node={node} socketId={"keep"}>
                Keep
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<FilterDefinition>, outSocket: keyof FilterDefinition["outputs"], _deps: AllDeps): (keyof FilterDefinition["inputs"])[] => {
    if (outSocket === "output" || outSocket === "keptIndices") {
        return ["pipeline", "keep"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<FilterDefinition>, inSocket: keyof FilterDefinition["inputs"], _deps: AllDeps): (keyof FilterDefinition["outputs"])[] => {
    if (inSocket === "pipeline" || inSocket === "keep") {
        return ["output", "keptIndices"];
    }
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<FilterDefinition>, socket: keyof FilterDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const pipeline = context.resolve<DataTypes.LoopFor<DataTypes.AnyKind>>(node.id, "pipeline");
    if (!pipeline) return null;
    const { senderId, count } = pipeline.data;

    const kept: number[] = [];
    for (let i = 0; i < count; i++) {
        const keepEval = context.resolve<DataTypes.Boolean>(node.id, "keep", { ...context.cursorData, [senderId]: i });
        if (keepEval?.data === true) kept.push(i);
    }

    if (socket === "keptIndices") {
        return { kind: "array<integer>", data: kept.map((i) => `${i}`) };
    }

    if (socket === "output") {
        // Summon each surviving element from the paired ForEach's `each` output ("each" is the loop-Start
        // element contract), driven onto the kept index. No wire connects ForEach.each to Filter.
        const items: unknown[] = [];
        let element = "any"; // element kind of the survivors (overwritten by the first real one)
        for (const i of kept) {
            const el = context.resolveOutput<DataTypes.AnyKind>(senderId, "each", { ...context.cursorData, [senderId]: i });
            if (!el) continue;
            element = el.kind;
            items.push(el.data);
        }
        return { kind: `array<${element}>`, data: items };
    }

    return null;
};

export const FilterNodeType: NodeTypes.Type<"filter", FilterDefinition> = {
    type: "filter",
    displayName: "Filter",
    defaultLabel: "Filter",
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
