import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject } from "../../helpers/nodeHelper";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { SocketTypes } from "../../socketTypes";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { extractSingle } from "../../helpers/mathHelper";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { input: $.oneOf("angle", "float", "integer") },
    out: { output: "float" },
});

export type SinDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        input: DataTypes.TypeOf<DataTypes.Float>;
    }
>;

// interject-only rules (mirror the def's socket types)
const TRIG_IN: SocketTypes.Term = SocketTypes.or(DataTypes.ANGLE, DataTypes.FLOAT, DataTypes.INTEGER);
const FLOAT_OUT: SocketTypes.Term = SocketTypes.of(DataTypes.FLOAT);

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<SinDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"sin", SinDefinition> => {
    return {
        id,
        in: { input: null },
        out: { output: [] },
        payload: {
            label: "",
            input: input.input ?? "0",
        },
        type: "sin",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<SinDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<SinDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "output");
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} label={"Output"}>
                <ValuePreview value={preview} />
            </SocketOut>
            <SocketIn node={node} socketId={"input"} label={"Input"}>
                <DecimalInput value={node.payload.input} onCommit={(input) => handleUpdate({ input })} disabled={node.in.input !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<SinDefinition>, outSocket: "output", _deps: AllDeps): (keyof SinDefinition["inputs"])[] => {
    if (outSocket === "output") return ["input"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<SinDefinition>, _inSocket: keyof SinDefinition["inputs"], _deps: AllDeps): (keyof SinDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<SinDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const val = context.resolve(node.id, "input");
        const kind = val?.kind ?? "float";
        const data = val?.data ?? node.payload.input;
        const { value } = extractSingle(kind, data);
        const radians = kind === "angle" ? (value * Math.PI) / 180 : value;
        return { kind: "float", data: `${Math.sin(radians)}` };
    }
    return null;
};

export const SinType: NodeTypes.Type<"sin", SinDefinition> = {
    type: "sin",
    displayName: "Sin",
    defaultLabel: "Sin",
    iconNode: <NodeIcon shape={NODE_ICONS.sine} />,
    flavour: "help",
    category: "Math",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    signature: def.instance,
    ...SignatureEngine.hooks,
    canInterject: passthroughCanInterject(TRIG_IN, FLOAT_OUT),
    onInterject: passthroughInterject("input", "output"),
};
