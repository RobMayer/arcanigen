import { nanoid } from "nanoid";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { ReactNode } from "react";
import { TypicalNode } from "../../../features/nodeview/node";
import { SocketOut, SocketIn } from "../../../features/nodeview/slots";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { PaperHelper } from "../../../util/paperHelper";

export type PathUnifyDefinition = {
    inputs: {
        pathA: DataTypes.Use<"path">;
        pathB: DataTypes.Use<"path">;
    };
    outputs: {
        output: DataTypes.Use<"path">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<PathUnifyDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"pathUnify", PathUnifyDefinition> => {
    return {
        id,
        in: {
            pathA: null,
            pathB: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
        },
        type: "pathUnify",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PathUnifyDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"pathA"}>
                Path A
            </SocketIn>
            <SocketIn node={node} socketId={"pathB"}>
                Path B
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<PathUnifyDefinition>, outSocket: keyof PathUnifyDefinition["outputs"], _deps: AllDeps): (keyof PathUnifyDefinition["inputs"])[] => {
    return ["pathA", "pathB"];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PathUnifyDefinition>, inSocket: keyof PathUnifyDefinition["inputs"], _deps: AllDeps): (keyof PathUnifyDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<PathUnifyDefinition>, socket: keyof PathUnifyDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const pathAData = context.resolve<"path">(node.id, "pathA")?.data;
    if (!pathAData) return null;

    const pathBData = context.resolve<"path">(node.id, "pathB")?.data;
    if (!pathBData) return null;

    return PaperHelper.unify(pathAData, pathBData);
};

const SOCKETTYPES_IN: { [key in keyof Required<PathUnifyDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    pathA: { types: ["path"], mode: "or" },
    pathB: { types: ["path"], mode: "or" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<PathUnifyDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["path"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<PathUnifyDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const PathUnitfyNodeType: NodeTypes.Type<"pathUnify", PathUnifyDefinition> = {
    type: "pathUnify",
    displayName: "Path Unify",
    defaultLabel: "Path Unify",
    iconNode: <Icon shape={NODE_ICONS.pathUnify} color={"var(--icon-flavour)"} />,
    category: "Math",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
