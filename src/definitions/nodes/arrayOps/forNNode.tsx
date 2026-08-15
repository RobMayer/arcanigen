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

// For N is a loop START like ForEach, but generated from a count instead of an input array -- the
// `for (i = 0; i < n; i++)` counterpart to ForEach's `arr.forEach(...)`. It emits the same `each`/`index`/
// `pipeline` shape so it's a drop-in for Map AND Filter (Filter summons the loop-start's `each` by senderId).
// For a bare count loop `each == index == i`; `each` exists to satisfy the loop-start summon contract.
const def = signature({
    in: { count: "integer" },
    out: { each: "integer", index: "integer", pipeline: $.loopFor("integer") },
});

export type ForNDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        count: DataTypes.TypeOf<DataTypes.Integer>;
    }
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<ForNDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"forN", ForNDefinition> => {
    return {
        id,
        in: { count: null },
        out: { each: [], index: [], pipeline: [] },
        payload: { label: "", count: "10", ...input },
        type: "forN",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ForNDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ForNDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"pipeline"}>
                Pipeline
            </SocketOut>
            <SocketIn node={node} socketId={"count"} label={"Count"}>
                <IntegerInput value={node.payload.count} onCommit={(count) => handleUpdate({ count })} disabled={node.in.count !== null} min={"0"} />
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

const dependsOn = (_node: NodeDefinitions.NodeFor<ForNDefinition>, outSocket: keyof ForNDefinition["outputs"], _deps: AllDeps): (keyof ForNDefinition["inputs"])[] => {
    // `index` is a pure read of the driver-injected cursor -- no input feeds it.
    if (outSocket === "each" || outSocket === "pipeline") {
        return ["count"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ForNDefinition>, inSocket: keyof ForNDefinition["inputs"], _deps: AllDeps): (keyof ForNDefinition["outputs"])[] => {
    if (inSocket === "count") {
        return ["each", "pipeline"];
    }
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<ForNDefinition>, socket: keyof ForNDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const raw = NumericString.Emptyable.asNumber(context.resolve<DataTypes.Integer>(node.id, "count")?.data ?? node.payload.count) ?? 0;
    const n = Math.max(0, Math.trunc(raw));

    if (socket === "pipeline") {
        return { kind: "loopFor<integer>", data: { senderId: node.id, count: n } };
    }

    const iter = context.cursorData[node.id] ?? 0;

    if (socket === "index") {
        return { kind: "integer", data: `${iter}` };
    }

    if (socket === "each") {
        if (iter < 0 || iter >= n) return null;
        return { kind: "integer", data: `${iter}` };
    }

    return null;
};

export const ForNNodeType: NodeTypes.Type<"forN", ForNDefinition> = {
    type: "forN",
    displayName: "For N",
    defaultLabel: "For N",
    iconNode: <NodeIcon shape={NODE_ICONS.num} />,
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
