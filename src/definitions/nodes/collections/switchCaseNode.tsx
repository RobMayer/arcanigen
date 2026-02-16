import { nanoid } from "nanoid";
import { ICONS, Icon } from "../../../components/Icon";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { TextInput } from "../../../components/inputs/TextInput";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { ArcaneGraph } from "../../../util/structs/arcaneGraph";

export type SwitchCaseDefinition = {
    inputs: {
        switch: DataTypes.Use<"enum">;
        default: DataTypes.Any;
        [option: `case_${string}`]: DataTypes.Any;
    };
    outputs: {
        result: DataTypes.Any;
    };
    payload: {
        label: string;
        resolvedType: DataTypes.Kind | null;
        cases: { label: string; socket: string }[];
    };
};

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
            resolvedType: null,
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

    const socketType = (node.payload.resolvedType ?? "any") as never;

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

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"result"} type={socketType}>
                Result
            </SocketOut>
            <SocketIn node={node} socketId={"switch"} type={"enum" as never}>
                Switch
            </SocketIn>
            <hr />
            <ActionButton onClick={handleAddCase} flavour={"accent"}>
                Add Case
            </ActionButton>
            {node.payload.cases.map((entry, idx) => (
                <SocketIn key={entry.socket} node={node} socketId={entry.socket as `case_${string}`} type={socketType}>
                    {idx}
                    <TextInput value={entry.label} onCommit={(label) => handleCaseLabelUpdate(entry.socket, label)} placeholder={`Case ${idx}`} />
                    <ActionButton.Lite onClick={() => handleRemoveCase(entry.socket)} flavour={"danger"}>
                        <Icon shape={ICONS.Close} />
                    </ActionButton.Lite>
                </SocketIn>
            ))}
            <hr />
            <SocketIn node={node} socketId={"default"} type={socketType}>
                Default
            </SocketIn>
        </TypicalNode>
    );
};

const isPolymorphicSocket = (socket: string, cases: SwitchCaseDefinition["payload"]["cases"]): boolean => {
    if (socket === "default" || socket === "result") return true;
    return cases.some((c) => c.socket === socket);
};

const onConnect = (
    node: NodeDefinitions.BuiltNodeOf<"switchCase", SwitchCaseDefinition>,
    linkId: string,
    direction: "in" | "out",
    state: NodeTypes.HookState,
    graphId: string,
): NodeTypes.HookState => {
    const link = state.links[graphId][linkId];
    if (!link) return state;

    const socket = direction === "out" ? link.fromSocket : link.toSocket;
    if (!isPolymorphicSocket(socket, node.payload.cases)) return state;

    if (node.payload.resolvedType !== null) return state;

    // Constrain to the link's agreed type
    const currentNode = state.nodes[graphId][node.id];
    const payload = { ...currentNode.payload, resolvedType: link.type } as NodeDefinitions.NodeFor<NodeDefinitions.Any>["payload"];
    return {
        ...state,
        nodes: {
            ...state.nodes,
            [graphId]: { ...state.nodes[graphId], [node.id]: { ...currentNode, payload } },
        },
    };
};

const onDisconnect = (
    node: NodeDefinitions.BuiltNodeOf<"switchCase", SwitchCaseDefinition>,
    link: ArcaneGraph.Link,
    direction: "in" | "out",
    state: NodeTypes.HookState,
    graphId: string,
): NodeTypes.HookState => {
    const socket = direction === "out" ? link.fromSocket : link.toSocket;
    const currentNode = state.nodes[graphId][node.id] as NodeDefinitions.BuiltNodeOf<"switchCase", SwitchCaseDefinition>;
    if (!currentNode) return state;

    if (!isPolymorphicSocket(socket, currentNode.payload.cases)) return state;
    if (currentNode.payload.resolvedType === null) return state;

    // Check if any polymorphic socket still has a connection
    if ((currentNode.out as Record<string, string[]>)["result"]?.length > 0) return state;
    if ((currentNode.in as Record<string, string | null>)["default"] !== null) return state;
    for (const c of currentNode.payload.cases) {
        if ((currentNode.in as Record<string, string | null>)[c.socket] !== null) return state;
    }

    // No polymorphic connections remain — unconstrain
    const payload = { ...currentNode.payload, resolvedType: null } as NodeDefinitions.NodeFor<NodeDefinitions.Any>["payload"];
    return {
        ...state,
        nodes: {
            ...state.nodes,
            [graphId]: { ...state.nodes[graphId], [node.id]: { ...currentNode, payload } },
        },
    };
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
        const switchVal = context.resolve<"enum">(node.id, "switch");
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
    iconNode: <Icon shape={ICONS.Option} color={"var(--icon-flavour)"} />,
    category: "Collections",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    onConnect,
    onDisconnect,
};
