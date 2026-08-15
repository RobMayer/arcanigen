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

// Range emits `[0, 1, ..., count-1]` as an array<integer>. The dead-simple index generator: for anything
// fancier (start/step/mapped values) feed it through Map.
const def = signature({
    in: { count: "integer" },
    out: { output: $.arrayOf("integer") },
});

export type RangeDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        count: DataTypes.TypeOf<DataTypes.Integer>;
    }
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<RangeDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"range", RangeDefinition> => {
    return {
        id,
        in: { count: null },
        out: { output: [] },
        payload: { label: "", count: "10", ...input },
        type: "range",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<RangeDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<RangeDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"count"} label={"Count"}>
                <IntegerInput value={node.payload.count} onCommit={(count) => handleUpdate({ count })} disabled={node.in.count !== null} min={"0"} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<RangeDefinition>, outSocket: keyof RangeDefinition["outputs"], _deps: AllDeps): (keyof RangeDefinition["inputs"])[] => {
    if (outSocket === "output") return ["count"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<RangeDefinition>, inSocket: keyof RangeDefinition["inputs"], _deps: AllDeps): (keyof RangeDefinition["outputs"])[] => {
    if (inSocket === "count") return ["output"];
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<RangeDefinition>, socket: keyof RangeDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;
    const raw = NumericString.Emptyable.asNumber(context.resolve<DataTypes.Integer>(node.id, "count")?.data ?? node.payload.count) ?? 0;
    const n = Math.max(0, Math.trunc(raw));
    return { kind: "array<integer>", data: Array.from({ length: n }, (_, i) => `${i}`) };
};

export const RangeNodeType: NodeTypes.Type<"range", RangeDefinition> = {
    type: "range",
    displayName: "Range",
    defaultLabel: "Range",
    iconNode: <NodeIcon shape={NODE_ICONS.num} modifierIcon={NODE_ICONS.modifiers.arrayOf} />,
    flavour: "danger",
    category: "Values",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
