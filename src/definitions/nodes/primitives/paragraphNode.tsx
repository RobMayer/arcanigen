import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { BlockInput } from "../../../components/inputs/BlockInput";
import { Project } from "../../../state/project";

export type ParagraphDefinition = {
    inputs: {
        value: DataTypes.Use<"string">;
    };
    outputs: {
        output: DataTypes.Use<"string">;
        charCount: DataTypes.Use<"integer">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        value: DataTypes.TypeOf<DataTypes.Use<"string">>;
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<ParagraphDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"paragraph", ParagraphDefinition> => {
    return {
        id,
        in: {
            value: null,
        },
        out: {
            output: [],
            charCount: [],
        },
        payload: {
            label: "",
            value: "",
        },
        type: "paragraph",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ParagraphDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ParagraphDefinition>>) => {
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
                <BlockInput.WithModal value={node.payload.value} onCommit={(value) => handleUpdate({ value })} disabled={node.in.value !== null} title={"Edit Paragraph"} />
            </SocketIn>
            <SocketOut node={node} socketId={"charCount"}>
                Character Count
            </SocketOut>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<ParagraphDefinition>, outSocket: keyof ParagraphDefinition["outputs"], _deps: AllDeps): (keyof ParagraphDefinition["inputs"])[] => {
    if (outSocket === "output" || outSocket === "charCount") return ["value"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ParagraphDefinition>, inSocket: keyof ParagraphDefinition["inputs"], _deps: AllDeps): (keyof ParagraphDefinition["outputs"])[] => {
    if (inSocket === "value") return ["output", "charCount"];
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<ParagraphDefinition>, socket: keyof ParagraphDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const str = context.resolve<"string">(node.id, "value")?.data ?? node.payload.value;
    if (socket === "output") return { kind: "string", data: str };
    if (socket === "charCount") return { kind: "integer", data: `${str.length}` };
    return null;
};

const SOCKETTYPES_IN: { [key in keyof Required<ParagraphDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    value: { types: ["string"], mode: "or" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<ParagraphDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["string"], mode: "and" },
    charCount: { types: ["integer"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<ParagraphDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const ParagraphPrimitiveType: NodeTypes.Type<"paragraph", ParagraphDefinition> = {
    type: "paragraph",
    displayName: "Paragraph",
    defaultLabel: "Paragraph",
    iconNode: <NodeIcon shape={NODE_ICONS.paragraph} />,
    flavour: "accent",
    category: "Values",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    getSocketType,
};
