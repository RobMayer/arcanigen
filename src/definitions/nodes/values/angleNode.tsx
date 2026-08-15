import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { useGraphId } from "../../../state/graphId";
import { extractSingle } from "../../helpers/mathHelper";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { value: $.oneOf("angle", "float", "integer"), wraps: "boolean" },
    out: { output: "angle" },
});

export type AngleDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        value: DataTypes.TypeOf<DataTypes.Angle>;
        wraps: DataTypes.TypeOf<DataTypes.Boolean>;
    }
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<AngleDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"angle", AngleDefinition> => {
    return {
        id,
        in: {
            value: null,
            wraps: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            value: "0deg",
            wraps: false,
        },
        type: "angle",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<AngleDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const wraps = Project.useCachedInput(graphId, node, "wraps")?.data ?? node.payload.wraps;

    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<AngleDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"value"} label={"Value"}>
                <AngleInput.SliderInput value={node.payload.value} onCommit={(value) => handleUpdate({ value })} disabled={node.in.value !== null} unbound={!wraps} />
            </SocketIn>
            <SocketIn node={node} socketId={"wraps"} label={"Wraps"}>
                <CheckBox checked={node.payload.wraps} onToggle={(wraps) => handleUpdate({ wraps })} disabled={node.in.wraps !== null}>
                    Wraps value between 0-360
                </CheckBox>
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<AngleDefinition>, outSocket: "output", _deps: AllDeps): (keyof AngleDefinition["inputs"])[] => {
    if (outSocket === "output") return ["value"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<AngleDefinition>, inSocket: keyof AngleDefinition["inputs"], _deps: AllDeps): (keyof AngleDefinition["outputs"])[] => {
    if (inSocket === "value") return ["output"];
    return [];
};
const evaluate = (node: NodeDefinitions.NodeFor<AngleDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const val = context.resolve(node.id, "value");
        if (val) {
            if (val.kind === "angle") return val;
            const { value } = extractSingle(val.kind, val.data);
            return { kind: "angle", data: `${value}deg` };
        }
        return { kind: "angle", data: node.payload.value };
    }
    return null;
};

export const AnglePrimitiveType: NodeTypes.Type<"angle", AngleDefinition> = {
    type: "angle",
    displayName: "Angle",
    defaultLabel: "Angle",
    iconNode: <NodeIcon shape={NODE_ICONS.angle} />,
    flavour: "accent",
    category: "Values",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
