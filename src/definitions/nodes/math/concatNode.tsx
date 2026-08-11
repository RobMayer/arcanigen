import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { TextInput } from "../../../components/inputs/TextInput";
import { Project } from "../../../state/project";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { a: "string", b: "string", separator: "string" },
    out: { output: "string", charCount: "integer" },
});

export type ConcatDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<"string">;
        a: DataTypes.TypeOf<"string">;
        b: DataTypes.TypeOf<"string">;
        separator: DataTypes.TypeOf<"string">;
    }
>;

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

export const ConcatNodeType: NodeTypes.Type<"concat", ConcatDefinition> = {
    type: "concat",
    displayName: "Concatenate",
    defaultLabel: "Concatenate",
    iconNode: <NodeIcon shape={NODE_ICONS.plus} />,
    flavour: "help",
    category: "Math",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
