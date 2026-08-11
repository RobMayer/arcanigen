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
    in: { input: $.oneOf("float", "integer") },
    out: { output: "angle" },
});

export type ArctanDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        input: DataTypes.TypeOf<"float">;
    }
>;

// interject-only rules (mirror the def's socket types)
const DIMENSIONLESS_IN: SocketTypes.Term = SocketTypes.or("float", "integer");
const ANGLE_OUT: SocketTypes.Term = SocketTypes.of("angle");

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<ArctanDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"arctan", ArctanDefinition> => {
    return {
        id,
        in: { input: null },
        out: { output: [] },
        payload: {
            label: "",
            input: input.input ?? "0",
        },
        type: "arctan",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ArctanDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ArctanDefinition>>) => {
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

const dependsOn = (_node: NodeDefinitions.NodeFor<ArctanDefinition>, outSocket: "output", _deps: AllDeps): (keyof ArctanDefinition["inputs"])[] => {
    if (outSocket === "output") return ["input"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ArctanDefinition>, _inSocket: keyof ArctanDefinition["inputs"], _deps: AllDeps): (keyof ArctanDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<ArctanDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const val = context.resolve(node.id, "input");
        const kind = val?.kind ?? "float";
        const data = val?.data ?? node.payload.input;
        const { value } = extractSingle(kind, data);
        const degrees = (Math.atan(value) * 180) / Math.PI;
        return { kind: "angle", data: `${degrees}` };
    }
    return null;
};

export const ArctanType: NodeTypes.Type<"arctan", ArctanDefinition> = {
    type: "arctan",
    displayName: "Arctan",
    defaultLabel: "Arctan",
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
