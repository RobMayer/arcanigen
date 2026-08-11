import { nanoid } from "nanoid";
import { Icon, ICONS, NODE_ICONS, NodeIcon } from "../../../components/Icon";
import { DragEvent, ReactNode, useCallback, useRef, useState } from "react";
import styled from "styled-components";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { NumericString } from "../../datatypes/numericString";
import { Color } from "../../datatypes/color";
import { ColorHexInput } from "../../../components/inputs/ColorHexInput";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { EmptyOr } from "../../../util/misc";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

type StopEntryData = { socket: string; value: Color.Type; position: EmptyOr<NumericString.Type>; enabled: boolean };

const def = signature({
    in: { stops: $.arrayOf("stop:color"), "stop_*": "stop:color" },
    out: { output: $.arrayOf("stop:color"), stopCount: "integer" },
});

export type ColorStopArrayDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        stops: StopEntryData[];
    }
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<ColorStopArrayDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"colorStopArray", ColorStopArrayDefinition> => {
    const s0: `stop_${string}` = `stop_${nanoid()}`;
    const s1: `stop_${string}` = `stop_${nanoid()}`;
    return {
        id,
        in: {
            stops: null,
            [s0]: null,
            [s1]: null,
        },
        out: {
            output: [],
            stopCount: [],
        },
        payload: {
            label: "",
            stops: input.stops ?? [
                { socket: s0, value: { r: 0, g: 0, b: 0, a: 1 }, position: "0", enabled: true },
                { socket: s1, value: { r: 1, g: 1, b: 1, a: 1 }, position: "100", enabled: true },
            ],
        },
        type: "colorStopArray",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ColorStopArrayDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const { alterNode, removeLinks } = Project.useMethods();

    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ColorStopArrayDefinition>>) => {
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
                stops: [...(n.payload as ColorStopArrayDefinition["payload"]).stops, { socket, value: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, position: "50", enabled: true }],
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
                        stops: (n.payload as ColorStopArrayDefinition["payload"]).stops.filter((s) => s.socket !== socket),
                    },
                };
            });
        },
        [alterNode, removeLinks, node.id, node.in],
    );

    const handleStopUpdate = useCallback(
        (socket: string, update: Partial<StopEntryData>) => {
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
            <SocketOut node={node} socketId={"output"}>
                Stops
            </SocketOut>
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
    entry: StopEntryData;
    node: NodeDefinitions.NodeFor<ColorStopArrayDefinition>;
    index: number;
    handleStopUpdate: (socket: string, update: Partial<StopEntryData>) => void;
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
                    <ColorHexInput className={"stopValue"} value={entry.value} onCommit={(value) => handleStopUpdate(entry.socket, { value })} disabled={connected} alpha />
                    <DecimalInput className={"stopPosition"} value={entry.position} onCommit={(position) => handleStopUpdate(entry.socket, { position })} disabled={connected} min={"0"} max={"100"} />
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

    & > .stopValue {
        flex: 3.5 1 0;
        width: 0;
        min-width: 0;
    }

    & > .stopValue [data-part="swatch"] {
        flex-basis: 0.5lh;
        aspect-ratio: auto;
    }

    & .stopPosition {
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

// Resolve the effective stops: the supersocket (an array<stop:color>) overrides everything;
// otherwise fold each per-stop socket (a connected stop:color) over its inline payload.
const resolveStops = (node: NodeDefinitions.NodeFor<ColorStopArrayDefinition>, context: Resolver.Context): { value: Color.Type; position: number; enabled: boolean }[] => {
    const supersocketEval = context.resolve<"array<stop:color>">(node.id, "stops");
    if (supersocketEval) {
        return supersocketEval.data.map((s) => ({ value: s.value, position: s.position ?? 0, enabled: s.enabled ?? true }));
    }

    const resolved: { value: Color.Type; position: number; enabled: boolean }[] = [];
    for (const entry of node.payload.stops) {
        const connected = context.resolve<"stop:color">(node.id, entry.socket);
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

const dependsOn = (node: NodeDefinitions.NodeFor<ColorStopArrayDefinition>, outSocket: keyof ColorStopArrayDefinition["outputs"], _deps: AllDeps): (keyof ColorStopArrayDefinition["inputs"])[] => {
    const stopSockets = node.payload.stops.map((s) => s.socket) as `stop_${string}`[];
    if (outSocket === "output" || outSocket === "stopCount") {
        return ["stops", ...stopSockets];
    }
    return [];
};

const contributesTo = (
    _node: NodeDefinitions.NodeFor<ColorStopArrayDefinition>,
    _inSocket: keyof ColorStopArrayDefinition["inputs"],
    _deps: AllDeps,
): (keyof ColorStopArrayDefinition["outputs"])[] => {
    return ["output", "stopCount"];
};

const evaluate = (node: NodeDefinitions.NodeFor<ColorStopArrayDefinition>, socket: keyof ColorStopArrayDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "stopCount") {
        return { kind: "integer", data: `${resolveStops(node, context).length}` };
    }
    if (socket === "output") {
        const stops = resolveStops(node, context).sort((a, b) => a.position - b.position);
        return { kind: "array<stop:color>", data: stops.map((s) => ({ value: s.value, position: s.position, enabled: s.enabled })) };
    }
    return null;
};

// Supersocket override: connecting the whole `array<stop:color>` clears the now-hidden element family,
// then hands off to the engine (a no-op for this var-free def, kept for uniform wiring).
const onConnect = (node: NodeDefinitions.BuiltNodeOf<"colorStopArray", ColorStopArrayDefinition>, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
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

export const ColorStopArrayNodeType: NodeTypes.Type<"colorStopArray", ColorStopArrayDefinition> = {
    type: "colorStopArray",
    displayName: "Color Stop Array",
    defaultLabel: "Color Stop Array",
    iconNode: <NodeIcon shape={NODE_ICONS.color} modifierIcon={NODE_ICONS.modifiers.arrayOfStopOf} />,
    flavour: "danger",
    category: "Values",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
    onConnect,
};
