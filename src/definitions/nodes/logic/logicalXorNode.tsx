import { nanoid } from "nanoid";
import { ICONS, Icon } from "../../../components/Icon";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";

export type LogicalXorDefinition = {
    inputs: {
        [input: `input_${string}`]: DataTypes.Use<"boolean">;
    };
    outputs: {
        output: DataTypes.Use<"boolean">;
    };
    payload: {
        label: string;
        inputs: string[];
    };
};

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<LogicalXorDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"logicalXor", LogicalXorDefinition> => {
    const s0: `input_${string}` = `input_${nanoid()}`;
    const s1: `input_${string}` = `input_${nanoid()}`;
    return {
        id,
        in: { [s0]: null, [s1]: null },
        out: { output: [] },
        payload: { label: "", inputs: [s0, s1] },
        type: "logicalXor",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<LogicalXorDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const { alterNode, removeLinks } = Project.useMethods();

    const handleAddInput = useCallback(() => {
        const socketId: `input_${string}` = `input_${nanoid()}`;
        alterNode(node.id, (n) => ({
            ...n,
            in: { ...n.in, [socketId]: null },
            payload: {
                ...n.payload,
                inputs: [...(n.payload as LogicalXorDefinition["payload"]).inputs, socketId],
            },
        }));
    }, [alterNode, node.id]);

    const handleRemoveInput = useCallback(
        (socket: string) => {
            const linkId = node.in[socket];
            if (linkId) removeLinks(linkId);
            alterNode(node.id, (n) => {
                const { [socket]: _, ...restIn } = n.in;
                return {
                    ...n,
                    in: restIn,
                    payload: {
                        ...n.payload,
                        inputs: (n.payload as LogicalXorDefinition["payload"]).inputs.filter((s) => s !== socket),
                    },
                };
            });
        },
        [alterNode, removeLinks, node.id, node.in],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"boolean"}>
                Output
            </SocketOut>
            <hr />
            <ActionButton onClick={handleAddInput} flavour={"accent"}>
                Add Input
            </ActionButton>
            {node.payload.inputs.map((socket, idx) => (
                <SocketIn key={socket} node={node} socketId={socket as `input_${string}`} type={"boolean"}>
                    <span>Input {idx + 1}</span>
                    <ActionButton.Lite onClick={() => handleRemoveInput(socket)} flavour={"danger"}>
                        <Icon shape={ICONS.Close} />
                    </ActionButton.Lite>
                </SocketIn>
            ))}
        </TypicalNode>
    );
};

const dependsOn = (node: NodeDefinitions.NodeFor<LogicalXorDefinition>, outSocket: keyof LogicalXorDefinition["outputs"], _deps: AllDeps): (keyof LogicalXorDefinition["inputs"])[] => {
    if (outSocket === "output") {
        return node.payload.inputs as `input_${string}`[];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<LogicalXorDefinition>, inSocket: keyof LogicalXorDefinition["inputs"], _deps: AllDeps): (keyof LogicalXorDefinition["outputs"])[] => {
    if (typeof inSocket === "string" && inSocket.startsWith("input_")) return ["output"];
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<LogicalXorDefinition>, socket: keyof LogicalXorDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        let trueCount = 0;
        for (const input of node.payload.inputs) {
            const val = context.resolve<"boolean">(node.id, input);
            if (val === null) return null;
            if (val.data) trueCount++;
        }
        return { kind: "boolean", data: trueCount % 2 === 1 };
    }
    return null;
};

const getSocketType = (_node: NodeDefinitions.NodeFor<LogicalXorDefinition>, _socketId: string, _side: "in" | "out"): SocketTypes.SocketRule => {
    return SocketTypes.of("boolean");
};

export const LogicalXorNodeType: NodeTypes.Type<"logicalXor", LogicalXorDefinition> = {
    type: "logicalXor",
    displayName: "Xor",
    defaultLabel: "Xor",
    iconNode: <Icon shape={ICONS.Blank} color={"var(--icon-flavour)"} />,
    category: "Logic",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
