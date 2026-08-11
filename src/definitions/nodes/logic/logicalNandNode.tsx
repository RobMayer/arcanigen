import { nanoid } from "nanoid";
import { NodeIcon, ICONS, Icon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { Resolver } from "../../../util/resolver";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { "input_*": "boolean" },
    out: { output: "boolean" },
});

export type LogicalNandDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        inputs: string[];
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<LogicalNandDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"logicalNand", LogicalNandDefinition> => {
    const s0: `input_${string}` = `input_${nanoid()}`;
    const s1: `input_${string}` = `input_${nanoid()}`;
    return {
        id,
        in: { [s0]: null, [s1]: null },
        out: { output: [] },
        payload: { label: "", inputs: [s0, s1] },
        type: "logicalNand",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<LogicalNandDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const { alterNode, removeLinks } = Project.useMethods();

    const handleAddInput = useCallback(() => {
        const socketId: `input_${string}` = `input_${nanoid()}`;
        alterNode(node.id, (n) => ({
            ...n,
            in: { ...n.in, [socketId]: null },
            payload: {
                ...n.payload,
                inputs: [...(n.payload as LogicalNandDefinition["payload"]).inputs, socketId],
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
                        inputs: (n.payload as LogicalNandDefinition["payload"]).inputs.filter((s) => s !== socket),
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

const dependsOn = (node: NodeDefinitions.NodeFor<LogicalNandDefinition>, outSocket: keyof LogicalNandDefinition["outputs"], _deps: AllDeps): (keyof LogicalNandDefinition["inputs"])[] => {
    if (outSocket === "output") {
        return node.payload.inputs as `input_${string}`[];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<LogicalNandDefinition>, inSocket: keyof LogicalNandDefinition["inputs"], _deps: AllDeps): (keyof LogicalNandDefinition["outputs"])[] => {
    if (typeof inSocket === "string" && inSocket.startsWith("input_")) return ["output"];
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<LogicalNandDefinition>, socket: keyof LogicalNandDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        let result = true;
        for (const input of node.payload.inputs) {
            const val = context.resolve<"boolean">(node.id, input);
            if (val === null) return null;
            result = result && val.data;
        }
        return { kind: "boolean", data: !result };
    }
    return null;
};

export const LogicalNandNodeType: NodeTypes.Type<"logicalNand", LogicalNandDefinition> = {
    type: "logicalNand",
    displayName: "Nand",
    defaultLabel: "Nand",
    iconNode: <NodeIcon shape={NODE_ICONS.logicalNand} />,
    flavour: "help",
    category: "Logic",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
