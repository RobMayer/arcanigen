import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { TextInput } from "../../../components/inputs/TextInput";
import { Project } from "../../../state/project";

export type ConcatDefinition = {
    inputs: {
        a: DataTypes.Use<"string">;
        b: DataTypes.Use<"string">;
        separator: DataTypes.Use<"string">;
    };
    outputs: {
        output: DataTypes.Use<"string">;
        charCount: DataTypes.Use<"integer">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        a: DataTypes.TypeOf<DataTypes.Use<"string">>;
        b: DataTypes.TypeOf<DataTypes.Use<"string">>;
        separator: DataTypes.TypeOf<DataTypes.Use<"string">>;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<ConcatDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"concat", ConcatDefinition> => {
    return {
        id,
        in: {
            a: null,
            b: null,
            separator: null,
        },
        out: {
            output: [],
            charCount: [],
        },
        payload: {
            label: "",
            a: "",
            b: "",
            separator: "",
            ...input,
        },
        type: "concat",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ConcatDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ConcatDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"a"} label={"A"}>
                <TextInput value={node.payload.a} onCommit={(a) => handleUpdate({ a })} disabled={node.in.a !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"b"} label={"B"}>
                <TextInput value={node.payload.b} onCommit={(b) => handleUpdate({ b })} disabled={node.in.b !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"separator"} label={"Separator"}>
                <TextInput value={node.payload.separator} onCommit={(separator) => handleUpdate({ separator })} disabled={node.in.separator !== null} />
            </SocketIn>
            <SocketOut node={node} socketId={"charCount"}>
                Character Count
            </SocketOut>
        </TypicalNode>
    );
};

const ALL_INPUTS: (keyof ConcatDefinition["inputs"])[] = ["a", "b", "separator"];

const dependsOn = (_node: NodeDefinitions.NodeFor<ConcatDefinition>, _outSocket: keyof ConcatDefinition["outputs"], _deps: AllDeps): (keyof ConcatDefinition["inputs"])[] => {
    return ALL_INPUTS;
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ConcatDefinition>, _inSocket: keyof ConcatDefinition["inputs"], _deps: AllDeps): (keyof ConcatDefinition["outputs"])[] => {
    return ["output", "charCount"];
};

const evaluate = (node: NodeDefinitions.NodeFor<ConcatDefinition>, socket: keyof ConcatDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output" && socket !== "charCount") return null;

    const a = context.resolve<"string">(node.id, "a")?.data ?? node.payload.a ?? "";
    const b = context.resolve<"string">(node.id, "b")?.data ?? node.payload.b ?? "";
    const separator = context.resolve<"string">(node.id, "separator")?.data ?? node.payload.separator ?? "";

    const result = a + separator + b;
    if (socket === "output") return { kind: "string", data: result };
    return { kind: "integer", data: `${result.length}` };
};

const SOCKETTYPES_IN: { [key in keyof Required<ConcatDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    a: { types: ["string"], mode: "or" },
    b: { types: ["string"], mode: "or" },
    separator: { types: ["string"], mode: "or" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<ConcatDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["string"], mode: "and" },
    charCount: { types: ["integer"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<ConcatDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const ConcatNodeType: NodeTypes.Type<"concat", ConcatDefinition> = {
    type: "concat",
    displayName: "Concatenate",
    defaultLabel: "Concatenate",
    iconNode: <NodeIcon shape={NODE_ICONS.plus} />,
    category: "Math",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
