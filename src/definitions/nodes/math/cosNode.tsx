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
import { TextInput } from "../../../components/inputs/TextInput";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { extractSingle } from "../../helpers/mathHelper";
import { Angle } from "../../datatypes/angle";
import { NumericKind } from "../../helpers/numericKind";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { input: $.defaulted($.oneOf("angle", "float", "integer"), NumericKind.angleKindOf) },
    out: { output: "float" },
});

export type CosDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        input: string;
    }
>;

// interject-only rules (mirror the def's socket types)
const TRIG_IN: SocketTypes.Term = SocketTypes.or(DataTypes.ANGLE, DataTypes.FLOAT, DataTypes.INTEGER);
const FLOAT_OUT: SocketTypes.Term = SocketTypes.of(DataTypes.FLOAT);

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<CosDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"cos", CosDefinition> => {
    return {
        id,
        in: { input: null },
        out: { output: [] },
        payload: {
            label: "",
            input: input.input ?? "0",
        },
        type: "cos",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<CosDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<CosDefinition>>) => {
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
                <TextInput value={node.payload.input} onCommit={(input) => handleUpdate({ input })} disabled={node.in.input !== null} pattern={NumericKind.ANGLE_PATTERN} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<CosDefinition>, outSocket: "output", _deps: AllDeps): (keyof CosDefinition["inputs"])[] => {
    if (outSocket === "output") return ["input"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<CosDefinition>, _inSocket: keyof CosDefinition["inputs"], _deps: AllDeps): (keyof CosDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<CosDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const val = context.resolve(node.id, "input") ?? { kind: NumericKind.kindOf(node.payload.input), data: node.payload.input };
        const { value } = extractSingle(val.kind, val.data);
        const radians = val.kind === "angle" ? Angle.asRadians(val.data as Angle.Type) : value;
        return { kind: "float", data: `${Math.cos(radians)}` };
    }
    return null;
};

export const CosType: NodeTypes.Type<"cos", CosDefinition> = {
    type: "cos",
    displayName: "Cos",
    defaultLabel: "Cos",
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
