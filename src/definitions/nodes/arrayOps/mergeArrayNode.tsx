import { nanoid } from "nanoid";
import { Icon, ICONS, NODE_ICONS, NodeIcon } from "../../../components/Icon";
import { DragEvent, ReactNode, useCallback, useRef, useState } from "react";
import styled from "styled-components";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { Resolver } from "../../../util/resolver";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

// Merge concatenates a dynamic number of `array<T>` inputs (in socket order) into one `array<T>`. `T` is a
// plain (shared) var referenced by the `input_*` family, so every live input socket COLLAPSES to the same
// element type: connect an `array<integer>` and the remaining sockets only accept `array<integer>` -- no
// mixing `array<integer>` with `array<length>`. Disconnected inputs contribute nothing.
const def = signature({
    args: { T: $.ANY },
    in: ({ T }) => ({ "input_*": $.arrayOf(T) }),
    out: ({ T }) => ({ output: $.arrayOf(T), count: "integer" }),
});

export type MergeArrayDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        inputs: string[];
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<MergeArrayDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"mergeArray", MergeArrayDefinition> => {
    const s0: `input_${string}` = `input_${nanoid()}`;
    const s1: `input_${string}` = `input_${nanoid()}`;
    return {
        id,
        in: { [s0]: null, [s1]: null },
        out: { output: [], count: [] },
        payload: { label: "", inputs: [s0, s1] },
        type: "mergeArray",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<MergeArrayDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const { alterNode, removeLinks } = Project.useMethods();

    const handleAddInput = useCallback(() => {
        const socket: `input_${string}` = `input_${nanoid()}`;
        alterNode(node.id, (n) => ({
            ...n,
            in: { ...n.in, [socket]: null },
            payload: {
                ...n.payload,
                inputs: [...(n.payload as MergeArrayDefinition["payload"]).inputs, socket],
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
                        inputs: (n.payload as MergeArrayDefinition["payload"]).inputs.filter((s) => s !== socket),
                    },
                };
            });
        },
        [alterNode, removeLinks, node.id, node.in],
    );

    const handleReorderInput = useCallback(
        (socket: string, toIndex: number) => {
            methods.update<NodeDefinitions.PayloadTypeOf<MergeArrayDefinition>>({
                inputs: (() => {
                    const inputs = [...node.payload.inputs];
                    const fromIndex = inputs.indexOf(socket);
                    if (fromIndex === -1 || fromIndex === toIndex) return inputs;
                    const [entry] = inputs.splice(fromIndex, 1);
                    inputs.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, entry);
                    return inputs;
                })(),
            });
        },
        [methods, node.payload.inputs],
    );

    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "output");

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                <ValuePreview value={preview} />
            </SocketOut>
            <SocketOut node={node} socketId={"count"}>
                Count
            </SocketOut>
            <hr />
            <ActionButton onClick={handleAddInput} flavour={"accent"}>
                Add Input
            </ActionButton>
            {node.payload.inputs.map((socket, idx) => (
                <InputEntry key={socket} socket={socket} node={node} index={idx} handleRemoveInput={handleRemoveInput} handleReorderInput={handleReorderInput} />
            ))}
        </TypicalNode>
    );
};

const INPUT_MIME = "application/x-merge-array-socket";

const InputEntry = ({
    socket,
    node,
    index,
    handleRemoveInput,
    handleReorderInput,
}: {
    socket: string;
    node: NodeDefinitions.NodeFor<MergeArrayDefinition>;
    index: number;
    handleRemoveInput: (socket: string) => void;
    handleReorderInput: (socket: string, toIndex: number) => void;
}) => {
    const [dropSide, setDropSide] = useState<"above" | "below" | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    const handleDragStart = useCallback(
        (e: DragEvent) => {
            e.dataTransfer.setDragImage(ref.current as Element, 0, 0);
            e.dataTransfer.setData(INPUT_MIME, socket);
            e.dataTransfer.effectAllowed = "move";
        },
        [socket],
    );

    const handleDragOver = useCallback((e: DragEvent) => {
        if (!e.dataTransfer.types.includes(INPUT_MIME)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const rect = ref.current?.getBoundingClientRect();
        if (rect) {
            setDropSide(e.clientY < rect.top + rect.height / 2 ? "above" : "below");
        }
    }, []);

    const handleDragLeave = useCallback(() => setDropSide(null), []);

    const handleDrop = useCallback(
        (e: DragEvent) => {
            const dragged = e.dataTransfer.getData(INPUT_MIME);
            if (dragged) {
                e.preventDefault();
                handleReorderInput(dragged, dropSide === "below" ? index + 1 : index);
            }
            setDropSide(null);
        },
        [handleReorderInput, index, dropSide],
    );

    const handleDragEnd = useCallback(() => setDropSide(null), []);

    return (
        <InputEntryWrapper ref={ref} data-state={dropSide ? `drop-${dropSide}` : undefined} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onDragEnd={handleDragEnd}>
            <SocketIn node={node} socketId={socket as `input_${string}`}>
                <InputRow>
                    <span className={"inputLabel"}>Input {index + 1}</span>
                    <DragGrip draggable onDragStart={handleDragStart}>
                        <Icon shape={ICONS.Caret.Vertical} />
                    </DragGrip>
                    <ActionButton.Lite onClick={() => handleRemoveInput(socket)} flavour={"danger"}>
                        <Icon shape={ICONS.Close} />
                    </ActionButton.Lite>
                </InputRow>
            </SocketIn>
        </InputEntryWrapper>
    );
};

const InputRow = styled.div`
    display: flex;
    align-items: center;
    gap: 3px;
    width: 100%;

    & > .inputLabel {
        flex: 1 1 0;
        min-width: 0;
    }
`;

const InputEntryWrapper = styled.div`
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

const dependsOn = (node: NodeDefinitions.NodeFor<MergeArrayDefinition>, outSocket: keyof MergeArrayDefinition["outputs"], _deps: AllDeps): (keyof MergeArrayDefinition["inputs"])[] => {
    if (outSocket === "output" || outSocket === "count") {
        return node.payload.inputs as `input_${string}`[];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<MergeArrayDefinition>, inSocket: keyof MergeArrayDefinition["inputs"], _deps: AllDeps): (keyof MergeArrayDefinition["outputs"])[] => {
    if (typeof inSocket === "string" && inSocket.startsWith("input_")) return ["output", "count"];
    return [];
};

/** Unwrap one `array<...>` layer to its element kind string. */
const unwrapArray = (kind: string): string => (kind.startsWith("array<") && kind.endsWith(">") ? kind.slice("array<".length, -1) : kind);

const evaluate = (node: NodeDefinitions.NodeFor<MergeArrayDefinition>, socket: keyof MergeArrayDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output" && socket !== "count") return null;

    const out: unknown[] = [];
    let elementKind: string | null = null;
    for (const input of node.payload.inputs) {
        const arr = context.resolve<DataTypes.ArrayOf<DataTypes.AnyKind>>(node.id, input);
        if (!arr) continue; // disconnected input -> contributes nothing
        if (elementKind === null) elementKind = unwrapArray(arr.kind);
        out.push(...arr.data);
    }
    if (elementKind === null) return null; // nothing connected -> no element type to emit

    if (socket === "count") return { kind: "integer", data: `${out.length}` };
    return { kind: `array<${elementKind}>`, data: out };
};

export const MergeArrayNodeType: NodeTypes.Type<"mergeArray", MergeArrayDefinition> = {
    type: "mergeArray",
    displayName: "Merge Array",
    defaultLabel: "Merge Array",
    iconNode: <NodeIcon shape={NODE_ICONS.ampersand} modifierIcon={NODE_ICONS.modifiers.arrayOf} />,
    flavour: "danger",
    category: "Math",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
