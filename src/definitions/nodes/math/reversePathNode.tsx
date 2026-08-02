import { nanoid } from "nanoid";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { ReactNode } from "react";
import { TypicalNode } from "../../../features/nodeview/node";
import { SocketOut, SocketIn } from "../../../features/nodeview/slots";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { Icon, ICONS } from "../../../components/Icon";
import { PaperHelper } from "../../../util/paperHelper";
import { makeCanInterject, makeOnInterject } from "./numericMath";

export type ReversePathDefinition = {
    inputs: {
        path: DataTypes.Use<"path">;
    };
    outputs: {
        output: DataTypes.Use<"path">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<ReversePathDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"reversePath", ReversePathDefinition> => {
    return {
        id,
        in: {
            path: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
        },
        type: "reversePath",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ReversePathDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"path"}>
                Input
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<ReversePathDefinition>, outSocket: keyof ReversePathDefinition["outputs"], _deps: AllDeps): (keyof ReversePathDefinition["inputs"])[] => {
    return ["path"];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ReversePathDefinition>, inSocket: keyof ReversePathDefinition["inputs"], _deps: AllDeps): (keyof ReversePathDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<ReversePathDefinition>, socket: keyof ReversePathDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const pathData = context.resolve<"path">(node.id, "path")?.data;
    if (!pathData) return null;

    const reversed = PaperHelper.reverseD(pathData.d);
    if (reversed === null) return null;

    // Reversing only flips winding direction — transform and bounds are unchanged, so preserve them.
    return {
        kind: "path",
        data: { d: reversed, transform: pathData.transform, preview: pathData.preview },
    };
};

const SOCKETTYPES_IN: { [key in keyof Required<ReversePathDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    path: { types: ["path"], mode: "or" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<ReversePathDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["path"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<ReversePathDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const ReversePathNodeType: NodeTypes.Type<"reversePath", ReversePathDefinition> = {
    type: "reversePath",
    displayName: "Reverse Path",
    defaultLabel: "Reverse Path",
    iconNode: <Icon shape={ICONS.Media.FastBackward} color={"var(--icon-flavour)"} />,
    category: "Math",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
    canInterject: makeCanInterject(SOCKETTYPES_IN.path, SOCKETTYPES_OUT.output),
    onInterject: makeOnInterject("path", "output"),
};
