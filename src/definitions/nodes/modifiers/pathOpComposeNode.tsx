import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, SocketPair } from "../../../features/nodeview/slots";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { Dropdown } from "../../../components/inputs/Dropdown";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { path: "path", enabled: "boolean", op: "enum" },
    out: { output: "pathOp" },
});

export type PathOpComposeDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        enabled: boolean;
        op: DataTypes.TypeOf<DataTypes.Enum>;
    }
>;

const OP_OPTIONS = Enum.options(Enum.Common.pathOp);

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<PathOpComposeDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"pathOpCompose", PathOpComposeDefinition> => {
    return {
        id,
        in: {
            path: null,
            enabled: null,
            op: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            enabled: input.enabled ?? true,
            op: input.op ?? Enum.Common.pathOp.UNIFY.value,
        },
        type: "pathOpCompose",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PathOpComposeDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PathOpComposeDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketPair node={node} socketInId={"path"} socketOutId={"output"}>
                <span>Path</span>
                <span>Output</span>
            </SocketPair>
            <SocketIn node={node} socketId={"enabled"}>
                <CheckBox checked={node.payload.enabled} onToggle={(enabled) => handleUpdate({ enabled })} disabled={node.in.enabled !== null}>
                    Enabled
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"op"} label={"Operation"}>
                <Dropdown value={`${node.payload.op}`} onValue={(v) => handleUpdate({ op: Number(v) })} disabled={node.in.op !== null}>
                    {OP_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </Dropdown>
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<PathOpComposeDefinition>, _outSocket: keyof PathOpComposeDefinition["outputs"], _deps: AllDeps): (keyof PathOpComposeDefinition["inputs"])[] => {
    return ["path", "enabled", "op"];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PathOpComposeDefinition>, _inSocket: keyof PathOpComposeDefinition["inputs"], _deps: AllDeps): (keyof PathOpComposeDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<PathOpComposeDefinition>, socket: keyof PathOpComposeDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        // Unlike Compose Layer (which drops a null shape), we emit the pathOp even with a null path —
        // a null path is a meaningful operand in Path Combine's fold (the passthrough case).
        const path = context.resolve<DataTypes.Path>(node.id, "path")?.data ?? null;
        const enabled = context.resolve<DataTypes.Boolean>(node.id, "enabled")?.data ?? node.payload.enabled;
        const op = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "op")?.data, Enum.Common.pathOp) ?? node.payload.op;

        return {
            kind: "pathOp",
            data: { path, enabled, op },
        };
    }

    return null;
};

export const PathOpComposeNodeType: NodeTypes.Type<"pathOpCompose", PathOpComposeDefinition> = {
    type: "pathOpCompose",
    displayName: "Compose Path Op",
    defaultLabel: "Compose Path Op",
    iconNode: <NodeIcon shape={NODE_ICONS.combine} modifierIcon={NODE_ICONS.modifiers.joinOf} />,
    flavour: "emphasis",
    category: "Modifiers",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
