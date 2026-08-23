import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS, ICONS, Icon } from "../../../components/Icon";
import { DragEvent, ReactNode, useCallback, useRef, useState } from "react";
import styled from "styled-components";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { tokens: $.arrayOf("length"), "token_*": "length" },
    out: { output: "tokens:length", tokenCount: "integer", nonNullishCount: "integer" },
});

export type TokenizerLengthDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        tokens: { socket: string; value: DataTypes.TypeOf<DataTypes.Length> }[];
    }
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<TokenizerLengthDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"tokenizerLength", TokenizerLengthDefinition> => {
    const socketId: `token_${string}` = `token_${nanoid()}`;
    return {
        id,
        in: {
            tokens: null,
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
        (socket: string, update: Partial<{ value: DataTypes.TypeOf<DataTypes.Length> }>) => {
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

    const supersocketConnected = node.in.tokens != null;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"tokens"}>
                Tokens
            </SocketIn>
            {supersocketConnected ? null : (
                <>
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
                </>
            )}
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
        value: DataTypes.TypeOf<DataTypes.Length>;
    };
    node: NodeDefinitions.NodeFor<TokenizerLengthDefinition>;
    index: number;
    handleRemoveToken: (socket: string) => void;
    handleTokenUpdate: (socket: string, update: Partial<{ value: DataTypes.TypeOf<DataTypes.Length> }>) => void;
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

// Resolve the effective tokens: the supersocket (an array<length>) overrides everything; otherwise
// fold each per-token socket (a connected length) over its inline authoring field. May include empties.
const resolveTokens = (node: NodeDefinitions.NodeFor<TokenizerLengthDefinition>, context: Resolver.Context): DataTypes.TypeOf<DataTypes.Length>[] => {
    const supersocketEval = context.resolve<DataTypes.ArrayOf<DataTypes.Length>>(node.id, "tokens");
    if (supersocketEval) {
        return supersocketEval.data;
    }
    return node.payload.tokens.map((row) => {
        const linkId = node.in[row.socket];
        return linkId != null ? (context.resolve<DataTypes.Length>(node.id, row.socket)?.data ?? "") : row.value;
    });
};

const dependsOn = (node: NodeDefinitions.NodeFor<TokenizerLengthDefinition>, outSocket: keyof TokenizerLengthDefinition["outputs"], _deps: AllDeps): (keyof TokenizerLengthDefinition["inputs"])[] => {
    if (outSocket === "output" || outSocket === "nonNullishCount") {
        return ["tokens", ...(node.payload.tokens.map((t) => t.socket) as `token_${string}`[])];
    }
    // tokenCount is the row count when authored inline, or the supersocket array length when connected.
    return ["tokens"];
};

const contributesTo = (
    _node: NodeDefinitions.NodeFor<TokenizerLengthDefinition>,
    inSocket: keyof TokenizerLengthDefinition["inputs"],
    _deps: AllDeps,
): (keyof TokenizerLengthDefinition["outputs"])[] => {
    if (inSocket === "tokens") {
        return ["output", "tokenCount", "nonNullishCount"];
    }
    if (typeof inSocket === "string" && inSocket.startsWith("token_")) {
        return ["output", "nonNullishCount"];
    }
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<TokenizerLengthDefinition>, socket: keyof TokenizerLengthDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "tokenCount") {
        return { kind: "integer", data: `${resolveTokens(node, context).length}` };
    }

    if (socket === "output" || socket === "nonNullishCount") {
        // Empty/nullish tokens are skipped in both the joined output and the non-nullish tally.
        const parts = resolveTokens(node, context).filter((val) => val);

        if (socket === "nonNullishCount") {
            return { kind: "integer", data: `${parts.length}` };
        }
        return { kind: "tokens:length", data: parts.join(" ") };
    }

    return null;
};

// Supersocket override: connecting the whole `array<length>` clears the now-hidden per-token family,
// then hands off to the engine (a no-op for this var-free def, kept for uniform wiring).
const onConnect = (node: NodeDefinitions.BuiltNodeOf<"tokenizerLength", TokenizerLengthDefinition>, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    if (direction === "in") {
        const link = ctx.getLink(graphId, linkId);
        if (link && link.toSocket === "tokens") {
            const currentNode = ctx.getNode(graphId, node.id);
            if (currentNode) {
                const linkIdsToRemove: string[] = [];
                for (const [socketKey, socketLinkId] of Object.entries(currentNode.in)) {
                    if (socketKey.startsWith("token_") && socketLinkId !== null) {
                        linkIdsToRemove.push(socketLinkId);
                    }
                }
                if (linkIdsToRemove.length > 0) ctx.removeLinks(graphId, ...linkIdsToRemove);
            }
        }
    }
    SignatureEngine.onConnect(node, linkId, direction, graphId, ctx);
};

export const TokenizerLengthNodeType: NodeTypes.Type<"tokenizerLength", TokenizerLengthDefinition> = {
    type: "tokenizerLength",
    displayName: "Tokenzer (Length)",
    defaultLabel: "Tokenzer (Length)",
    iconNode: <NodeIcon shape={NODE_ICONS.length} modifierIcon={NODE_ICONS.modifiers.tokenizerFor} />,
    flavour: "help",
    category: "Math",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
    onConnect,
};
