import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { Dropdown } from "../../../components/inputs/Dropdown";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";

export type PathOpComposeDefinition = {
    inputs: {
        path: DataTypes.Use<"path">;
        enabled: DataTypes.Use<"boolean">;
        op: DataTypes.Use<"enum">;
    };
    outputs: {
        output: DataTypes.Use<"pathOp">;
    };
    payload: {
        label: string;
        enabled: boolean;
        op: DataTypes.TypeOf<DataTypes.Use<"enum">>;
    };
};

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
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"path"}>
                Path
            </SocketIn>
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
        const path = context.resolve<"path">(node.id, "path")?.data ?? null;
        const enabled = context.resolve<"boolean">(node.id, "enabled")?.data ?? node.payload.enabled;
        const op = Enum.resolve(context.resolve<"enum">(node.id, "op")?.data, Enum.Common.pathOp) ?? node.payload.op;

        return {
            kind: "pathOp",
            data: { path, enabled, op },
        };
    }

    return null;
};

const SOCKETTYPES_IN: { [key in keyof Required<PathOpComposeDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    path: { types: ["path"], mode: "or" },
    enabled: { types: ["boolean"], mode: "or" },
    op: { types: ["enum"], mode: "or" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<PathOpComposeDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["pathOp"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<PathOpComposeDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const PathOpComposeNodeType: NodeTypes.Type<"pathOpCompose", PathOpComposeDefinition> = {
    type: "pathOpCompose",
    displayName: "Compose Path Op",
    defaultLabel: "Compose Path Op",
    iconNode: <Icon shape={NODE_ICONS.combineCompose} color={"var(--icon-flavour)"} />,
    category: "Collections",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
