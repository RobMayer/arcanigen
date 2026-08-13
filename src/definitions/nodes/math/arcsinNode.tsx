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
    in: { input: $.defaulted($.oneOf("float", "integer"), "float") },
    out: { output: "angle" },
});

export type ArcsinDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        input: DataTypes.TypeOf<DataTypes.Float>;
    }
>;

// interject-only rules (mirror the def's socket types)
const DIMENSIONLESS_IN: SocketTypes.Term = SocketTypes.or(DataTypes.FLOAT, DataTypes.INTEGER);
const ANGLE_OUT: SocketTypes.Term = SocketTypes.of(DataTypes.ANGLE);

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<ArcsinDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"arcsin", ArcsinDefinition> => {
    return {
        id,
        in: { input: null },
        out: { output: [] },
        payload: {
            label: "",
            input: input.input ?? "0",
        },
        type: "arcsin",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ArcsinDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ArcsinDefinition>>) => {
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

const dependsOn = (_node: NodeDefinitions.NodeFor<ArcsinDefinition>, outSocket: "output", _deps: AllDeps): (keyof ArcsinDefinition["inputs"])[] => {
    if (outSocket === "output") return ["input"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ArcsinDefinition>, _inSocket: keyof ArcsinDefinition["inputs"], _deps: AllDeps): (keyof ArcsinDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<ArcsinDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const val = context.resolve(node.id, "input") ?? { kind: "float", data: node.payload.input };
        const { value } = extractSingle(val.kind, val.data);
        const clamped = Math.max(-1, Math.min(1, value));
        const degrees = (Math.asin(clamped) * 180) / Math.PI;
        return { kind: "angle", data: `${degrees}` };
    }
    return null;
};

export const ArcsinType: NodeTypes.Type<"arcsin", ArcsinDefinition> = {
    type: "arcsin",
    displayName: "Arcsin",
    defaultLabel: "Arcsin",
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
    canInterject: passthroughCanInterject(DIMENSIONLESS_IN, ANGLE_OUT),
    onInterject: passthroughInterject("input", "output"),
};
