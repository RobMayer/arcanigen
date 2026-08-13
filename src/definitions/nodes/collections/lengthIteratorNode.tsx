import { nanoid } from "nanoid";
import { Icon, ICONS, NODE_ICONS, NodeIcon } from "../../../components/Icon";
import { DragEvent, ReactNode, useCallback, useRef, useState } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { NumericString } from "../../datatypes/numericString";
import { Enum } from "../../datatypes/enum";
import { Length } from "../../datatypes/length";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { IterationPrefab } from "../../helpers/iterationPrefab";
import { EmptyOr } from "../../../util/misc";
import styled from "styled-components";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: {
        sequence: "sequence",
        mode: "enum",
        reverseSequence: "boolean",
        startOffset: "integer",
        endOffset: "integer",
        samplePosition: $.oneOf("float", "integer"),
        stops: $.arrayOf("stop:length"),
        "stop_*": "stop:length",
    },
    out: { sequencedOutput: "length", sampledOutput: "length", stopCount: "integer" },
});

export type LengthIteratorDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        stops: { socket: string; value: DataTypes.TypeOf<DataTypes.Length>; position: EmptyOr<NumericString.Type>; enabled: boolean }[];
    } & IterationPrefab.Definition["payload"]
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<LengthIteratorDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"lengthIterator", LengthIteratorDefinition> => {
    const s0: `stop_${string}` = `stop_${nanoid()}`;
    const s1: `stop_${string}` = `stop_${nanoid()}`;
    return {
        id,
        in: {
            sequence: null,
            mode: null,
            reverseSequence: null,
            startOffset: null,
            endOffset: null,
            samplePosition: null,
            stops: null,
            [s0]: null,
            [s1]: null,
        },
        out: {
            sequencedOutput: [],
            sampledOutput: [],
            stopCount: [],
        },
        payload: {
            label: "",
            mode: input.mode ?? Enum.Common.sequencerMode.CLAMP.value,
            reverseSequence: input.reverseSequence ?? false,
            startOffset: input.startOffset ?? "0",
            endOffset: input.endOffset ?? "0",
            samplePosition: input.samplePosition ?? "50",
            stops: input.stops ?? [
                { socket: s0, value: "0px", position: "0", enabled: true },
                { socket: s1, value: "100px", position: "100", enabled: true },
            ],
        },
        type: "lengthIterator",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<LengthIteratorDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const { alterNode, removeLinks } = Project.useMethods();

    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<LengthIteratorDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const handleAddStop = useCallback(() => {
        const socket: `stop_${string}` = `stop_${nanoid()}`;
        alterNode(node.id, (n) => ({
            ...n,
            in: { ...n.in, [socket]: null },
            payload: {
                ...n.payload,
                stops: [...(n.payload as LengthIteratorDefinition["payload"]).stops, { socket, value: "50px", position: "50", enabled: true }],
            },
        }));
    }, [alterNode, node.id]);

    const handleRemoveStop = useCallback(
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
                        stops: (n.payload as LengthIteratorDefinition["payload"]).stops.filter((s) => s.socket !== socket),
                    },
                };
            });
        },
        [alterNode, removeLinks, node.id, node.in],
    );

    const handleStopUpdate = useCallback(
        (socket: string, update: Partial<{ value: DataTypes.TypeOf<DataTypes.Length>; position: EmptyOr<NumericString.Type>; enabled: boolean }>) => {
            handleUpdate({
                stops: node.payload.stops.map((s) => (s.socket === socket ? { ...s, ...update } : s)),
            });
        },
        [handleUpdate, node.payload.stops],
    );

    const handleReorderStop = useCallback(
        (socket: string, toIndex: number) => {
            handleUpdate({
                stops: (() => {
                    const stops = [...node.payload.stops];
                    const fromIndex = stops.findIndex((s) => s.socket === socket);
                    if (fromIndex === -1 || fromIndex === toIndex) return stops;
                    const [entry] = stops.splice(fromIndex, 1);
                    stops.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, entry);
                    return stops;
                })(),
            });
        },
        [handleUpdate, node.payload.stops],
    );

    const supersocketConnected = node.in.stops !== null;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"sequencedOutput"}>
                Sequenced Output
            </SocketOut>
            <SocketIn node={node} socketId={"sequence"}>
                Sequence
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"stops"}>
                Stops Input
            </SocketIn>
            {supersocketConnected ? null : (
                <>
                    <ActionButton onClick={handleAddStop} flavour={"accent"}>
                        Add Stop
                    </ActionButton>
                    {node.payload.stops.map((entry, idx) => (
                        <StopEntry
                            key={entry.socket}
                            entry={entry}
                            node={node}
                            index={idx}
                            handleStopUpdate={handleStopUpdate}
                            handleRemoveStop={handleRemoveStop}
                            handleReorderStop={handleReorderStop}
                        />
                    ))}
                </>
            )}

            <IterationPrefab.Controls node={node} handleUpdate={handleUpdate} accordion />
            <NodeAccordion label="Sample At" nodeId={node.id} socketsOut="sampledOutput" socketsIn={"samplePosition"}>
                <SocketOut node={node} socketId={"sampledOutput"}>
                    Sampled Output
                </SocketOut>
                <SocketIn node={node} socketId={"samplePosition"} label={"Sample Position"}>
                    <DecimalInput.SliderInput
                        value={node.payload.samplePosition}
                        onCommit={(samplePosition) => handleUpdate({ samplePosition })}
                        disabled={node.in.samplePosition !== null}
                        min={0}
                        max={100}
                    />
                </SocketIn>
            </NodeAccordion>
            <NodeAccordion label="Additional Options" nodeId={node.id} socketsOut="stopCount">
                <SocketOut node={node} socketId={"stopCount"}>
                    Stop Count
                </SocketOut>
            </NodeAccordion>
        </TypicalNode>
    );
};

const STOP_MIME = "application/x-stop-socket";

const StopEntry = ({
    entry,
    node,
    index,
    handleStopUpdate,
    handleRemoveStop,
    handleReorderStop,
}: {
    entry: { socket: string; value: DataTypes.TypeOf<DataTypes.Length>; position: EmptyOr<NumericString.Type>; enabled: boolean };
    node: NodeDefinitions.NodeFor<LengthIteratorDefinition>;
    index: number;
    handleStopUpdate: (socket: string, update: Partial<{ value: DataTypes.TypeOf<DataTypes.Length>; position: EmptyOr<NumericString.Type>; enabled: boolean }>) => void;
    handleRemoveStop: (socket: string) => void;
    handleReorderStop: (socket: string, toIndex: number) => void;
}) => {
    const [dropSide, setDropSide] = useState<"above" | "below" | null>(null);
    const ref = useRef<HTMLDivElement>(null);
    const connected = node.in[entry.socket] !== null;

    const handleDragStart = useCallback(
        (e: DragEvent) => {
            e.dataTransfer.setDragImage(ref.current as Element, 0, 0);
            e.dataTransfer.setData(STOP_MIME, entry.socket);
            e.dataTransfer.effectAllowed = "move";
        },
        [entry.socket],
    );

    const handleDragOver = useCallback((e: DragEvent) => {
        if (!e.dataTransfer.types.includes(STOP_MIME)) return;
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
            const socket = e.dataTransfer.getData(STOP_MIME);
            if (socket) {
                e.preventDefault();
                handleReorderStop(socket, dropSide === "below" ? index + 1 : index);
            }
            setDropSide(null);
        },
        [handleReorderStop, index, dropSide],
    );

    const handleDragEnd = useCallback(() => setDropSide(null), []);

    return (
        <StopEntryWrapper ref={ref} data-state={dropSide ? `drop-${dropSide}` : undefined} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onDragEnd={handleDragEnd}>
            <SocketIn node={node} socketId={entry.socket as `stop_${string}`}>
                <StopRow>
                    <CheckBox checked={entry.enabled} onToggle={(enabled) => handleStopUpdate(entry.socket, { enabled })} disabled={connected} />
                    <LengthInput value={entry.value} onCommit={(value) => handleStopUpdate(entry.socket, { value })} disabled={connected} />
                    <DecimalInput value={entry.position} onCommit={(position) => handleStopUpdate(entry.socket, { position })} disabled={connected} min={"0"} max={"100"} />
                    <DragGrip draggable onDragStart={handleDragStart}>
                        <Icon shape={ICONS.Caret.Vertical} />
                    </DragGrip>
                    <ActionButton.Lite onClick={() => handleRemoveStop(entry.socket)} flavour={"danger"}>
                        <Icon shape={ICONS.Close} />
                    </ActionButton.Lite>
                </StopRow>
            </SocketIn>
        </StopEntryWrapper>
    );
};

const StopRow = styled.div`
    display: flex;
    align-items: center;
    gap: 3px;
    width: 100%;

    & input[type="text"] {
        flex: 1 1 0;
        width: 0;
        min-width: 0;
    }
`;

const StopEntryWrapper = styled.div`
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

const resolveStops = (node: NodeDefinitions.NodeFor<LengthIteratorDefinition>, context: Resolver.Context): { value: string; position: number; enabled: boolean }[] => {
    const supersocketEval = context.resolve<DataTypes.ArrayOf<DataTypes.StopLength>>(node.id, "stops");
    if (supersocketEval) {
        return supersocketEval.data.map((s) => ({ value: s.value ?? "", position: s.position ?? 0, enabled: s.enabled ?? true }));
    }

    const resolved: { value: string; position: number; enabled: boolean }[] = [];
    for (const entry of node.payload.stops) {
        const connected = context.resolve<DataTypes.StopLength>(node.id, entry.socket);
        if (connected) {
            resolved.push({
                value: connected.data.value ?? entry.value,
                position: connected.data.position ?? NumericString.Emptyable.asNumber(entry.position) ?? 0,
                enabled: connected.data.enabled ?? entry.enabled,
            });
        } else {
            resolved.push({
                value: entry.value,
                position: NumericString.Emptyable.asNumber(entry.position) ?? 0,
                enabled: entry.enabled,
            });
        }
    }
    return resolved;
};

const dependsOn = (node: NodeDefinitions.NodeFor<LengthIteratorDefinition>, outSocket: keyof LengthIteratorDefinition["outputs"], _deps: AllDeps): (keyof LengthIteratorDefinition["inputs"])[] => {
    const stopSockets = node.payload.stops.map((s) => s.socket) as `stop_${string}`[];
    if (outSocket === "sequencedOutput") {
        return [...IterationPrefab.SEQUENCED_DEPS, "stops", ...stopSockets];
    }
    if (outSocket === "sampledOutput") {
        return [...IterationPrefab.SAMPLED_DEPS, "stops", ...stopSockets];
    }
    if (outSocket === "stopCount") {
        return ["stops", ...stopSockets];
    }
    return [];
};

const contributesTo = (
    _node: NodeDefinitions.NodeFor<LengthIteratorDefinition>,
    inSocket: keyof LengthIteratorDefinition["inputs"],
    _deps: AllDeps,
): (keyof LengthIteratorDefinition["outputs"])[] => {
    if (inSocket === "stops") {
        return ["sequencedOutput", "sampledOutput", "stopCount"];
    }
    if ((IterationPrefab.SEQUENCED_DEPS as string[]).includes(inSocket as string)) {
        return ["sequencedOutput"];
    }
    if ((IterationPrefab.SAMPLED_DEPS as string[]).includes(inSocket as string)) {
        return ["sampledOutput"];
    }
    if (typeof inSocket === "string" && inSocket.startsWith("stop_")) {
        return ["sequencedOutput", "sampledOutput", "stopCount"];
    }
    return ["sequencedOutput", "sampledOutput", "stopCount"];
};

const evaluate = (node: NodeDefinitions.NodeFor<LengthIteratorDefinition>, socket: keyof LengthIteratorDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "stopCount") {
        return { kind: "integer", data: `${resolveStops(node, context).length}` };
    }

    let position: number;
    if (socket === "sequencedOutput") {
        const result = IterationPrefab.evaluate(node, context);
        if (result === null) return null;
        position = result.t * 100;
    } else if (socket === "sampledOutput") {
        position = IterationPrefab.resolveSamplePosition(node, context);
    } else {
        return null;
    }

    const active = resolveStops(node, context).filter((s) => s.enabled);
    if (active.length === 0) return null;
    active.sort((a, b) => a.position - b.position);

    // Convert every stop to the first stop's unit, sample numerically, then reformat.
    const firstParsed = Length.parse(active[0].value);
    const unit = firstParsed ? firstParsed[1] : "px";
    const numeric = active.map((s) => {
        const parsed = Length.parse(s.value);
        if (!parsed) return { value: 0, position: s.position };
        if (parsed[1] === unit) return { value: parsed[0], position: s.position };
        const converted = Length.parse(Length.convert(s.value as Length.Type, unit));
        return { value: converted ? converted[0] : 0, position: s.position };
    });

    const value = IterationPrefab.sampleStopsWith(numeric, position, (a, b, t) => a + t * (b - a));
    return { kind: "length", data: `${value}${unit}` };
};

// Supersocket override: connecting the whole array clears the now-hidden element family,
// then hands off to the engine (a no-op for this var-free def, kept for uniform wiring).
const onConnect = (node: NodeDefinitions.BuiltNodeOf<"lengthIterator", LengthIteratorDefinition>, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    if (direction === "in") {
        const link = ctx.getLink(graphId, linkId);
        if (link && link.toSocket === "stops") {
            const currentNode = ctx.getNode(graphId, node.id);
            if (currentNode) {
                const linkIdsToRemove: string[] = [];
                for (const [socketKey, socketLinkId] of Object.entries(currentNode.in)) {
                    if (socketKey.startsWith("stop_") && socketLinkId !== null) {
                        linkIdsToRemove.push(socketLinkId);
                    }
                }
                if (linkIdsToRemove.length > 0) ctx.removeLinks(graphId, ...linkIdsToRemove);
            }
        }
    }
    SignatureEngine.onConnect(node, linkId, direction, graphId, ctx);
};

export const LengthIteratorNodeType: NodeTypes.Type<"lengthIterator", LengthIteratorDefinition> = {
    type: "lengthIterator",
    displayName: "Length Iterator",
    defaultLabel: "Length Iterator",
    iconNode: <NodeIcon shape={NODE_ICONS.length} modifierIcon={NODE_ICONS.loop} />,
    flavour: "danger",
    category: "Logic",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
    onConnect,
};
