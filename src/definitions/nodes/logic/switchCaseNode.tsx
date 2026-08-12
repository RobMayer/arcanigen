import { nanoid } from "nanoid";
import { NodeIcon, ICONS, Icon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { TextInput } from "../../../components/inputs/TextInput";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { Resolver } from "../../../util/resolver";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    args: { C: $.each($.ANY), D: $.ANY },
    in: ({ C, D }) => ({ switch: "enum", "case_*": C, default: D }),
    out: ({ C, D }) => ({ result: $.oneOf(C, D) }),
});

export type SwitchCaseDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        cases: { label: string; socket: string }[];
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<SwitchCaseDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"switchCase", SwitchCaseDefinition> => {
    const s0: `case_${string}` = `case_${nanoid()}`;
    const s1: `case_${string}` = `case_${nanoid()}`;
    return {
        id,
        in: {
            switch: null,
            default: null,
            [s0]: null,
            [s1]: null,
        },
        out: {
            result: [],
        },
        payload: {
            label: "",
            cases: [
                { label: "", socket: s0 },
                { label: "", socket: s1 },
            ],
        },
        type: "switchCase",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<SwitchCaseDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const { alterNode, removeLinks } = Project.useMethods();

    const handleCaseLabelUpdate = useCallback(
        (socket: string, label: string) => {
            methods.update<NodeDefinitions.PayloadTypeOf<SwitchCaseDefinition>>({
                cases: node.payload.cases.map((c) => (c.socket === socket ? { ...c, label } : c)),
            });
        },
        [methods, node.payload.cases],
    );

    const handleAddCase = useCallback(() => {
        const socketId: `case_${string}` = `case_${nanoid()}`;
        alterNode(node.id, (n) => ({
            ...n,
            in: { ...n.in, [socketId]: null },
            payload: {
                ...n.payload,
                cases: [...(n.payload as SwitchCaseDefinition["payload"]).cases, { label: "", socket: socketId }],
            },
        }));
    }, [alterNode, node.id]);

    const handleRemoveCase = useCallback(
        (socket: string) => {
            const linkId = node.in[socket];
            if (linkId) {
                removeLinks(linkId);
            }
            alterNode(node.id, (n) => {
                const { [socket]: _, ...restIn } = n.in;
                return {
                    ...n,
                    in: restIn,
                    payload: {
                        ...n.payload,
                        cases: (n.payload as SwitchCaseDefinition["payload"]).cases.filter((c) => c.socket !== socket),
                    },
                };
            });
        },
        [alterNode, removeLinks, node.id, node.in],
    );

    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "result");
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"result"} label={"Result"}>
                <ValuePreview value={preview} />
            </SocketOut>
            <SocketIn node={node} socketId={"switch"}>
                Switch
            </SocketIn>
            <hr />
            <ActionButton onClick={handleAddCase} flavour={"accent"}>
                Add Case
            </ActionButton>
            {node.payload.cases.map((entry, idx) => (
                <SocketIn key={entry.socket} node={node} socketId={entry.socket as `case_${string}`}>
                    {idx}
                    <TextInput value={entry.label} onCommit={(label) => handleCaseLabelUpdate(entry.socket, label)} placeholder={`Case ${idx}`} />
                    <ActionButton.Lite onClick={() => handleRemoveCase(entry.socket)} flavour={"danger"}>
                        <Icon shape={ICONS.Close} />
                    </ActionButton.Lite>
                </SocketIn>
            ))}
            <hr />
            <SocketIn node={node} socketId={"default"}>
                Default
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (node: NodeDefinitions.NodeFor<SwitchCaseDefinition>, outSocket: keyof SwitchCaseDefinition["outputs"], _deps: AllDeps): (keyof SwitchCaseDefinition["inputs"])[] => {
    if (outSocket === "result") {
        return ["switch", "default", ...(node.payload.cases.map((c) => c.socket) as `case_${string}`[])];
    }
    return [];
};

const contributesTo = (node: NodeDefinitions.NodeFor<SwitchCaseDefinition>, inSocket: keyof SwitchCaseDefinition["inputs"], _deps: AllDeps): (keyof SwitchCaseDefinition["outputs"])[] => {
    if (inSocket === "switch" || inSocket === "default") {
        return ["result"];
    }
    if (typeof inSocket === "string" && inSocket.startsWith("case_")) {
        return ["result"];
    }
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<SwitchCaseDefinition>, socket: keyof SwitchCaseDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "result") {
        const switchVal = context.resolve<DataTypes.Enum>(node.id, "switch");
        if (switchVal === null) {
            return context.resolve(node.id, "default");
        }
        const switchIndex = Number(switchVal.data);

        if (switchIndex >= 0 && switchIndex < node.payload.cases.length) {
            const caseSocket = node.payload.cases[switchIndex].socket;
            return context.resolve(node.id, caseSocket);
        }

        // Fall through to default
        return context.resolve(node.id, "default");
    }
    return null;
};

export const SwitchCaseNodeType: NodeTypes.Type<"switchCase", SwitchCaseDefinition> = {
    type: "switchCase",
    displayName: "Switch Case",
    defaultLabel: "Switch Case",
    iconNode: <NodeIcon shape={NODE_ICONS.alt} />,
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
