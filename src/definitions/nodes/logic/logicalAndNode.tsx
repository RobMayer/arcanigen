import { nanoid } from "nanoid";
import { ICONS, Icon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { Resolver } from "../../../util/resolver";

export type LogicalAndDefinition = {
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

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<LogicalAndDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"logicalAnd", LogicalAndDefinition> => {
    const s0: `input_${string}` = `input_${nanoid()}`;
    const s1: `input_${string}` = `input_${nanoid()}`;
    return {
        id,
        in: { [s0]: null, [s1]: null },
        out: { output: [] },
        payload: { label: "", inputs: [s0, s1] },
        type: "logicalAnd",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<LogicalAndDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const { alterNode, removeLinks } = Project.useMethods();

    const handleAddInput = useCallback(() => {
        const socketId: `input_${string}` = `input_${nanoid()}`;
        alterNode(node.id, (n) => ({
            ...n,
            in: { ...n.in, [socketId]: null },
            payload: {
                ...n.payload,
                inputs: [...(n.payload as LogicalAndDefinition["payload"]).inputs, socketId],
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
                        inputs: (n.payload as LogicalAndDefinition["payload"]).inputs.filter((s) => s !== socket),
                    },
                };
            });
        },
        [alterNode, removeLinks, node.id, node.in],
    );

    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "output");
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} label={"Output"}>
                <ValuePreview value={preview} />
            </SocketOut>
            <hr />
            <ActionButton onClick={handleAddInput} flavour={"accent"}>
                Add Input
            </ActionButton>
            {node.payload.inputs.map((socket, idx) => (
                <SocketIn key={socket} node={node} socketId={socket as `input_${string}`}>
                    Input {idx + 1}
                    <ActionButton.Lite onClick={() => handleRemoveInput(socket)} flavour={"danger"}>
                        <Icon shape={ICONS.Close} />
                    </ActionButton.Lite>
                </SocketIn>
            ))}
        </TypicalNode>
    );
};

const dependsOn = (node: NodeDefinitions.NodeFor<LogicalAndDefinition>, outSocket: keyof LogicalAndDefinition["outputs"], _deps: AllDeps): (keyof LogicalAndDefinition["inputs"])[] => {
    if (outSocket === "output") {
        return node.payload.inputs as `input_${string}`[];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<LogicalAndDefinition>, inSocket: keyof LogicalAndDefinition["inputs"], _deps: AllDeps): (keyof LogicalAndDefinition["outputs"])[] => {
    if (typeof inSocket === "string" && inSocket.startsWith("input_")) return ["output"];
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<LogicalAndDefinition>, socket: keyof LogicalAndDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        let result = true;
        for (const input of node.payload.inputs) {
            const val = context.resolve<"boolean">(node.id, input);
            if (val === null) return null;
            result = result && val.data;
        }
        return { kind: "boolean", data: result };
    }
    return null;
};

const getSocketType = (_node: NodeDefinitions.NodeFor<LogicalAndDefinition>, _socketId: string, _side: "in" | "out"): SocketTypes.SocketRule => {
    return SocketTypes.of("boolean");
};

export const LogicalAndNodeType: NodeTypes.Type<"logicalAnd", LogicalAndDefinition> = {
    type: "logicalAnd",
    displayName: "And",
    defaultLabel: "And",
    iconNode: <Icon shape={NODE_ICONS.logicalAnd} color={"var(--icon-flavour)"} />,
    category: "Logic",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
