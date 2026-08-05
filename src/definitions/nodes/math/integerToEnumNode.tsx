import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { Resolver } from "../../../util/resolver";
import { extractSingle } from "./numericMath";

export type IntegerToEnumDefinition = {
    inputs: {
        input: DataTypes.Use<"integer">;
    };
    outputs: {
        output: DataTypes.Use<"enum">;
    };
    payload: {
        label: string;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<IntegerToEnumDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"integerToEnum", IntegerToEnumDefinition> => {
    return {
        id,
        in: { input: null },
        out: { output: [] },
        payload: { label: "" },
        type: "integerToEnum",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<IntegerToEnumDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "output");
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} label={"Output"}>
                <ValuePreview value={preview} />
            </SocketOut>
            <SocketIn node={node} socketId={"input"}>
                Input
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<IntegerToEnumDefinition>, outSocket: keyof IntegerToEnumDefinition["outputs"], _deps: AllDeps): (keyof IntegerToEnumDefinition["inputs"])[] => {
    if (outSocket === "output") return ["input"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<IntegerToEnumDefinition>, inSocket: keyof IntegerToEnumDefinition["inputs"], _deps: AllDeps): (keyof IntegerToEnumDefinition["outputs"])[] => {
    if (inSocket === "input") return ["output"];
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<IntegerToEnumDefinition>, socket: keyof IntegerToEnumDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const input = context.resolve<"integer">(node.id, "input");
        if (input === null) return null;
        const { value } = extractSingle(input.kind, input.data);
        return { kind: "enum", data: Math.trunc(value) };
    }
    return null;
};

const getSocketType = (_node: NodeDefinitions.NodeFor<IntegerToEnumDefinition>, socketId: string, _side: "in" | "out"): SocketTypes.SocketRule => {
    switch (socketId) {
        case "input":
            return SocketTypes.of("integer");
        case "output":
            return SocketTypes.of("enum");
        default:
            return SocketTypes.NONE;
    }
};

export const IntegerToEnumNodeType: NodeTypes.Type<"integerToEnum", IntegerToEnumDefinition> = {
    type: "integerToEnum",
    displayName: "Integer to Enum",
    defaultLabel: "Int → Enum",
    iconNode: <NodeIcon shape={NODE_ICONS.convert} />,
    flavour: "help",
    category: "Math",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
