import { nanoid } from "nanoid";
import { NODE_ICONS, ICONS, Icon } from "../../../components/Icon";
import { DragEvent, ReactNode, useCallback, useRef, useState } from "react";
import styled from "styled-components";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";

export type TokenizerLengthDefinition = {
    inputs: {
        [tokenSocket: `token_${string}`]: DataTypes.Use<"length">;
    };
    outputs: {
        output: DataTypes.Use<"tokens<length>">;
        tokenCount: DataTypes.Use<"integer">;
        nonNullishCount: DataTypes.Use<"integer">;
    };
    payload: {
        label: string;
        tokens: { socket: string; value: DataTypes.TypeOf<DataTypes.Use<"length">> }[];
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<TokenizerLengthDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"tokenizerLength", TokenizerLengthDefinition> => {
    const socketId: `token_${string}` = `token_${nanoid()}`;
    return {
        id,
        in: {
            [socketId]: null,
        },
        out: {
            output: [],
            tokenCount: [],
            nonNullishCount: [],
        },
        payload: {
            label: "",
            tokens: input.tokens ?? [{ socket: socketId, value: "" }],
        },
        type: "tokenizerLength",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<TokenizerLengthDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const { alterNode, removeLinks } = Project.useMethods();

    const handleTokenUpdate = useCallback(
        (socket: string, update: Partial<{ value: DataTypes.TypeOf<DataTypes.Use<"length">> }>) => {
            methods.update<NodeDefinitions.PayloadTypeOf<TokenizerLengthDefinition>>({
                tokens: node.payload.tokens.map((t) => (t.socket === socket ? { ...t, ...update } : t)),
            });
        },
        [methods, node.payload.tokens],
    );

    const handleAddToken = useCallback(() => {
        const socketId: `token_${string}` = `token_${nanoid()}`;
        alterNode(node.id, (n) => ({
            ...n,
            in: { ...n.in, [socketId]: null },
            payload: {
                ...n.payload,
                tokens: [...(n.payload as TokenizerLengthDefinition["payload"]).tokens, { socket: socketId, value: "" }],
            },
        }));
    }, [alterNode, node.id]);

    const handleRemoveToken = useCallback(
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
                        tokens: (n.payload as TokenizerLengthDefinition["payload"]).tokens.filter((t) => t.socket !== socket),
                    },
                };
            });
        },
        [alterNode, removeLinks, node.id, node.in],
    );

    const handleReorderToken = useCallback(
        (socketId: string, toIndex: number) => {
            methods.update<NodeDefinitions.PayloadTypeOf<TokenizerLengthDefinition>>({
                tokens: (() => {
                    const tokens = [...node.payload.tokens];
                    const fromIndex = tokens.findIndex((t) => t.socket === socketId);
                    if (fromIndex === -1 || fromIndex === toIndex) return tokens;
                    const [entry] = tokens.splice(fromIndex, 1);
                    tokens.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, entry);
                    return tokens;
                })(),
            });
        },
        [methods, node.payload.tokens],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <hr />
            <ActionButton onClick={handleAddToken} flavour={"accent"}>
                Add Token
            </ActionButton>
            {node.payload.tokens.map((entry, idx) => (
                <TokenEntry
                    entry={entry}
                    node={node}
                    key={entry.socket}
                    index={idx}
                    handleRemoveToken={handleRemoveToken}
                    handleTokenUpdate={handleTokenUpdate}
                    handleReorderToken={handleReorderToken}
                />
            ))}
            <hr />
            <NodeAccordion label="Additional Options" nodeId={node.id} socketsOut="tokenCount|nonNullishCount">
                <SocketOut node={node} socketId={"tokenCount"}>
                    Token Count
                </SocketOut>
                <SocketOut node={node} socketId={"nonNullishCount"}>
                    Non-Nullish Count
                </SocketOut>
            </NodeAccordion>
        </TypicalNode>
    );
};

const TOKEN_MIME = "application/x-tokenizer-length-socket";

const TokenEntry = ({
    entry,
    node,
    index,
    handleTokenUpdate,
    handleRemoveToken,
    handleReorderToken,
}: {
    entry: {
        socket: string;
        value: DataTypes.TypeOf<DataTypes.Use<"length">>;
    };
    node: NodeDefinitions.NodeFor<TokenizerLengthDefinition>;
    index: number;
    handleRemoveToken: (socket: string) => void;
    handleTokenUpdate: (socket: string, update: Partial<{ value: DataTypes.TypeOf<DataTypes.Use<"length">> }>) => void;
    handleReorderToken: (socketId: string, toIndex: number) => void;
}) => {
    const theLink = Project.useLink(node.in[entry.socket]);
    const [dropSide, setDropSide] = useState<"above" | "below" | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    // When a length is wired in, it overrides the inline value — freeze the field (mirrors the Length primitive).
    const overridden = theLink != null;

    const handleDragStart = useCallback(
        (e: DragEvent) => {
            e.dataTransfer.setDragImage(ref.current as Element, 0, 0);
            e.dataTransfer.setData(TOKEN_MIME, entry.socket);
            e.dataTransfer.effectAllowed = "move";
        },
        [entry.socket],
    );

    const handleDragOver = useCallback((e: DragEvent) => {
        if (!e.dataTransfer.types.includes(TOKEN_MIME)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const rect = ref.current?.getBoundingClientRect();
        if (rect) {
            setDropSide(e.clientY < rect.top + rect.height / 2 ? "above" : "below");
        }
    }, []);

    const handleDragLeave = useCallback(() => {
        setDropSide(null);
    }, []);

    const handleDrop = useCallback(
        (e: DragEvent) => {
            const socketId = e.dataTransfer.getData(TOKEN_MIME);
            if (socketId) {
                e.preventDefault();
                handleReorderToken(socketId, dropSide === "below" ? index + 1 : index);
            }
            setDropSide(null);
        },
        [handleReorderToken, index, dropSide],
    );

    const handleDragEnd = useCallback(() => {
        setDropSide(null);
    }, []);

    return (
        <TokenEntryWrapper ref={ref} data-state={dropSide ? `drop-${dropSide}` : undefined} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onDragEnd={handleDragEnd}>
            <SocketIn node={node} socketId={entry.socket as `token_${string}`}>
                <LengthInput value={entry.value} onCommit={(value) => handleTokenUpdate(entry.socket, { value })} disabled={overridden} />
                <DragGrip draggable onDragStart={handleDragStart}>
                    <Icon shape={ICONS.Caret.Vertical} />
                </DragGrip>
                <ActionButton.Lite onClick={() => handleRemoveToken(entry.socket)} flavour={"danger"}>
                    <Icon shape={ICONS.Close} />
                </ActionButton.Lite>
            </SocketIn>
        </TokenEntryWrapper>
    );
};

const TokenEntryWrapper = styled.div`
    position: relative;

    &[data-state="drop-above"]::before,
    &[data-state="drop-below"]::after {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        height: 2px;
        background: var(--flavour, #88f);
        pointer-events: none;
        z-index: 1;
    }
    &[data-state="drop-above"]::before {
        top: -1px;
    }
    &[data-state="drop-below"]::after {
        bottom: -1px;
    }
`;

const DragGrip = styled.div`
    cursor: grab;
    opacity: 0.4;
    display: grid;
    place-items: center;

    &:active {
        cursor: grabbing;
    }
    &:hover {
        opacity: 0.8;
    }
`;

const dependsOn = (node: NodeDefinitions.NodeFor<TokenizerLengthDefinition>, outSocket: keyof TokenizerLengthDefinition["outputs"], _deps: AllDeps): (keyof TokenizerLengthDefinition["inputs"])[] => {
    if (outSocket === "output" || outSocket === "nonNullishCount") {
        return node.payload.tokens.map((t) => t.socket) as `token_${string}`[];
    }
    // tokenCount is structural (row count), no input dependency.
    return [];
};

const contributesTo = (
    _node: NodeDefinitions.NodeFor<TokenizerLengthDefinition>,
    inSocket: keyof TokenizerLengthDefinition["inputs"],
    _deps: AllDeps,
): (keyof TokenizerLengthDefinition["outputs"])[] => {
    if (typeof inSocket === "string" && inSocket.startsWith("token_")) {
        return ["output", "nonNullishCount"];
    }
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<TokenizerLengthDefinition>, socket: keyof TokenizerLengthDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "tokenCount") {
        return { kind: "integer", data: `${node.payload.tokens.length}` };
    }

    if (socket === "output" || socket === "nonNullishCount") {
        const parts: string[] = [];
        for (const row of node.payload.tokens) {
            // Wired socket overrides the inline value; a null/empty result is skipped.
            const linkId = node.in[row.socket];
            const val = linkId != null ? (context.resolve<"length">(node.id, row.socket)?.data ?? null) : row.value;
            if (val) parts.push(val);
        }

        if (socket === "nonNullishCount") {
            return { kind: "integer", data: `${parts.length}` };
        }
        return { kind: "tokens<length>", data: parts.join(" ") };
    }

    return null;
};

const getSocketType = (_node: NodeDefinitions.NodeFor<TokenizerLengthDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    if (side === "out") {
        if (socketId === "tokenCount" || socketId === "nonNullishCount") {
            return { types: ["integer"], mode: "and" };
        }
        return { types: ["tokens<length>"], mode: "and" };
    }
    return { types: ["length"], mode: "or" };
};

export const TokenizerLengthNodeType: NodeTypes.Type<"tokenizerLength", TokenizerLengthDefinition> = {
    type: "tokenizerLength",
    displayName: "Tokenzer (Length)",
    defaultLabel: "Tokenzer (Length)",
    iconNode: <Icon shape={NODE_ICONS.length} color={"var(--icon-flavour)"} cutout={"scoop"} layer={NODE_ICONS.modifiers.tokenizerFor} layerColor="#fff" />,
    category: "Collections",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
