import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { NumericString } from "../../datatypes/numericString";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { Resolver } from "../../../util/resolver";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

// At Index pulls a single element out of `source` by `index` -> the bare element `T` (the extract direction,
// mirroring Gather but for one entry). Negative indices count from the end (-1 = last). Out-of-range (after
// the negative wrap) yields a null entry.
const def = signature({
    args: { T: $.ANY },
    in: ({ T }) => ({ source: $.arrayOf(T), index: "integer" }),
    out: ({ T }) => ({ entry: T }),
});

export type AtIndexDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        index: DataTypes.TypeOf<DataTypes.Integer>;
    }
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<AtIndexDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"atIndex", AtIndexDefinition> => {
    return {
        id,
        in: { source: null, index: null },
        out: { entry: [] },
        payload: {
            label: "",
            index: "0",
            ...input,
        },
        type: "atIndex",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<AtIndexDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "entry");
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<AtIndexDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"entry"} label={"Entry"}>
                <ValuePreview value={preview} />
            </SocketOut>
            <hr />
            <SocketIn node={node} socketId={"source"} label={"Source"} />
            <SocketIn node={node} socketId={"index"} label={"Index"}>
                <IntegerInput value={node.payload.index} onCommit={(index) => handleUpdate({ index })} disabled={node.in.index !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<AtIndexDefinition>, outSocket: keyof AtIndexDefinition["outputs"], _deps: AllDeps): (keyof AtIndexDefinition["inputs"])[] => {
    if (outSocket === "entry") {
        return ["source", "index"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<AtIndexDefinition>, inSocket: keyof AtIndexDefinition["inputs"], _deps: AllDeps): (keyof AtIndexDefinition["outputs"])[] => {
    if (inSocket === "source" || inSocket === "index") {
        return ["entry"];
    }
    return [];
};

/** Unwrap one `array<...>` layer to its element kind string. */
const unwrapArray = (kind: string): string => (kind.startsWith("array<") && kind.endsWith(">") ? kind.slice("array<".length, -1) : kind);

const evaluate = (node: NodeDefinitions.NodeFor<AtIndexDefinition>, socket: keyof AtIndexDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "entry") return null;

    const source = context.resolve<DataTypes.ArrayOf<DataTypes.AnyKind>>(node.id, "source");
    if (!source) return null;
    const items = source.data;

    const raw = NumericString.Emptyable.asNumber(context.resolve<DataTypes.Integer>(node.id, "index")?.data ?? node.payload.index) ?? 0;
    let i = Math.trunc(raw);
    if (i < 0) i += items.length; // negative -> from the end
    if (i < 0 || i >= items.length) return null; // out of range -> null entry

    return { kind: unwrapArray(source.kind), data: items[i] };
};

export const AtIndexNodeType: NodeTypes.Type<"atIndex", AtIndexDefinition> = {
    type: "atIndex",
    displayName: "At Index",
    defaultLabel: "At Index",
    iconNode: <NodeIcon shape={NODE_ICONS.location} modifierIcon={NODE_ICONS.modifiers.arrayOf} />,
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
