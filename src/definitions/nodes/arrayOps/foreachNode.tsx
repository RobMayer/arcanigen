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

// ForEach is the loop START: a passive source. It emits the `pipeline` bus (a loopFor cursor substrate,
// like `sequence`) plus the current element + index. It does NOT drive the loop -- the downstream End
// (Map/Filter) is the driver: it injects `cursorData[thisNodeId] = i` and re-resolves per iteration, so
// `each`/`index` read whatever index the driver currently has us on.
const def = signature({
    args: { N: $.ANY },
    in: ({ N }) => ({ input: $.arrayOf(N) }),
    out: ({ N }) => ({ each: N, index: "integer", pipeline: $.loopFor(N) }),
});

export type ForEachDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
    }
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<ForEachDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"forEach", ForEachDefinition> => {
    return {
        id,
        in: {
            input: null,
        },
        out: {
            each: [],
            index: [],
            pipeline: [],
        },
        payload: {
            label: "",
            ...input,
        },
        type: "forEach",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ForEachDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"pipeline"}>
                Pipeline
            </SocketOut>
            <SocketIn node={node} socketId={"input"}>
                Input
            </SocketIn>
            <hr />
            <SocketOut node={node} socketId={"each"}>
                Each
            </SocketOut>
            <SocketOut node={node} socketId={"index"}>
                Index
            </SocketOut>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<ForEachDefinition>, outSocket: keyof ForEachDefinition["outputs"], _deps: AllDeps): (keyof ForEachDefinition["inputs"])[] => {
    // `index` is a pure read of the driver-injected cursor -- no input wire feeds it.
    if (outSocket === "each" || outSocket === "pipeline") {
        return ["input"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ForEachDefinition>, inSocket: keyof ForEachDefinition["inputs"], _deps: AllDeps): (keyof ForEachDefinition["outputs"])[] => {
    if (inSocket === "input") {
        return ["each", "pipeline"];
    }
    return [];
};

/** Unwrap one `array<...>` layer to its element kind string (the loopFor/each element tag). */
const unwrapArray = (kind: string): string => (kind.startsWith("array<") && kind.endsWith(">") ? kind.slice("array<".length, -1) : kind);

const evaluate = (node: NodeDefinitions.NodeFor<ForEachDefinition>, socket: keyof ForEachDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const inputEval = context.resolve<DataTypes.ArrayOf<DataTypes.AnyKind>>(node.id, "input");
    const items = inputEval?.data ?? null;
    const element = inputEval ? unwrapArray(inputEval.kind) : "any";

    if (socket === "pipeline") {
        return { kind: `loopFor<${element}>`, data: { senderId: node.id, count: items?.length ?? 0 } };
    }

    const iter = context.cursorData[node.id] ?? 0;

    if (socket === "index") {
        return { kind: "integer", data: `${iter}` };
    }

    if (socket === "each") {
        if (!items || iter < 0 || iter >= items.length) return null;
        return { kind: element, data: items[iter] };
    }

    return null;
};

export const ForEachNodeType: NodeTypes.Type<"forEach", ForEachDefinition> = {
    type: "forEach",
    displayName: "For Each",
    defaultLabel: "For Each",
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
