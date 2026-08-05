import { nanoid } from "nanoid";
import { Icon, ICONS, NODE_ICONS, NodeIcon } from "../../../components/Icon";
import { DragEvent, ReactNode, useCallback, useRef, useState } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { NumericString } from "../../datatypes/numericString";
import { Enum } from "../../datatypes/enum";
import { Color } from "../../datatypes/color";
import { ColorHexInput } from "../../../components/inputs/ColorHexInput";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { Dropdown } from "../../../components/inputs/Dropdown";
import { interpolateColor } from "../../../util/colorSpaces";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { Iteration } from "../abstract";
import { EmptyOr } from "../../../util/misc";
import styled from "styled-components";

const COLOR_SPACE_OPTIONS = Enum.options(Enum.Common.colorSpace);
const ANGLE_TRAVERSAL_OPTIONS = Enum.options(Enum.Common.angleTraversal);

// Color spaces that have a hue component
const HUE_SPACES: Set<number> = new Set([
    Enum.Common.colorSpace.HSV.value,
    Enum.Common.colorSpace.HSL.value,
    Enum.Common.colorSpace.HWK.value,
    Enum.Common.colorSpace.HSI.value,
    Enum.Common.colorSpace.HCY.value,
    Enum.Common.colorSpace.OKLCH.value,
]);

export type ColorIterator2Definition = {
    inputs: {
        stops: DataTypes.Use<"array<stop<color>>">;
        colorSpace: DataTypes.Use<"enum">;
        angleTraversal: DataTypes.Use<"enum">;
        [stopSocket: `stop_${string}`]: DataTypes.Use<"stop<color>">;
    } & Iteration.Definition["inputs"];
    outputs: {
        sequencedOutput: DataTypes.Use<"color">;
        sampledOutput: DataTypes.Use<"color">;
        stopCount: DataTypes.Use<"integer">;
    };
    payload: {
        label: string;
        colorSpace: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        angleTraversal: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        stops: { socket: string; value: Color.Type; position: EmptyOr<NumericString.Type>; enabled: boolean }[];
    } & Iteration.Definition["payload"];
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<ColorIterator2Definition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"colorIterator2", ColorIterator2Definition> => {
    const s0: `stop_${string}` = `stop_${nanoid()}`;
    const s1: `stop_${string}` = `stop_${nanoid()}`;
    return {
        id,
        in: {
            sequence: null,
            colorSpace: null,
            angleTraversal: null,
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
            colorSpace: input.colorSpace ?? Enum.Common.colorSpace.RGB.value,
            angleTraversal: input.angleTraversal ?? Enum.Common.angleTraversal.CLOSEST_CW.value,
            mode: input.mode ?? Enum.Common.sequencerMode.CLAMP.value,
            reverseSequence: input.reverseSequence ?? false,
            startOffset: input.startOffset ?? "0",
            endOffset: input.endOffset ?? "0",
            samplePosition: input.samplePosition ?? "50",
            stops: input.stops ?? [
                { socket: s0, value: { r: 0, g: 0, b: 0, a: 1 }, position: "0", enabled: true },
                { socket: s1, value: { r: 1, g: 1, b: 1, a: 1 }, position: "100", enabled: true },
            ],
        },
        type: "colorIterator2",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ColorIterator2Definition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const { alterNode, removeLinks } = Project.useMethods();

    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ColorIterator2Definition>>) => {
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
                stops: [...(n.payload as ColorIterator2Definition["payload"]).stops, { socket, value: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, position: "50", enabled: true }],
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
                        stops: (n.payload as ColorIterator2Definition["payload"]).stops.filter((s) => s.socket !== socket),
                    },
                };
            });
        },
        [alterNode, removeLinks, node.id, node.in],
    );

    const handleStopUpdate = useCallback(
        (socket: string, update: Partial<{ value: Color.Type; position: EmptyOr<NumericString.Type>; enabled: boolean }>) => {
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
    const hueRelevant = HUE_SPACES.has(node.payload.colorSpace) && node.in.colorSpace === null;

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

            <NodeAccordion label={"Iteration Options"} nodeId={node.id} socketsIn="colorSpace|angleTraversal|mode|reverseSequence|startOffset|endOffset">
                <SocketIn node={node} socketId={"colorSpace"} label={"Color Space"}>
                    <Dropdown value={`${node.payload.colorSpace}`} onValue={(v) => handleUpdate({ colorSpace: Number(v) })} disabled={node.in.colorSpace !== null}>
                        {COLOR_SPACE_OPTIONS.map((each) => (
                            <option value={each.value} key={each.value}>
                                {each.label}
                            </option>
                        ))}
                    </Dropdown>
                </SocketIn>
                <SocketIn node={node} socketId={"angleTraversal"} label={"Hue Traversal"}>
                    <Dropdown value={`${node.payload.angleTraversal}`} onValue={(v) => handleUpdate({ angleTraversal: Number(v) })} disabled={node.in.angleTraversal !== null || !hueRelevant}>
                        {ANGLE_TRAVERSAL_OPTIONS.map((each) => (
                            <option value={each.value} key={each.value}>
                                {each.label}
                            </option>
                        ))}
                    </Dropdown>
                </SocketIn>
                <Iteration.Controls node={node} handleUpdate={handleUpdate} />
            </NodeAccordion>
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
    entry: { socket: string; value: Color.Type; position: EmptyOr<NumericString.Type>; enabled: boolean };
    node: NodeDefinitions.NodeFor<ColorIterator2Definition>;
    index: number;
    handleStopUpdate: (socket: string, update: Partial<{ value: Color.Type; position: EmptyOr<NumericString.Type>; enabled: boolean }>) => void;
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

// Resolve the effective stops: the supersocket (an array<stop<color>>) overrides everything;
// otherwise fold each per-stop socket (a connected stop<color>) over its inline payload.
const resolveStops = (node: NodeDefinitions.NodeFor<ColorIterator2Definition>, context: Resolver.Context): { value: Color.Type; position: number; enabled: boolean }[] => {
    const supersocketEval = context.resolve<"array<stop<color>>">(node.id, "stops");
    if (supersocketEval) {
        return supersocketEval.data.map((s) => ({ value: s.value, position: s.position ?? 0, enabled: s.enabled ?? true }));
    }

    const resolved: { value: Color.Type; position: number; enabled: boolean }[] = [];
    for (const entry of node.payload.stops) {
        const connected = context.resolve<"stop<color>">(node.id, entry.socket);
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

const dependsOn = (node: NodeDefinitions.NodeFor<ColorIterator2Definition>, outSocket: keyof ColorIterator2Definition["outputs"], _deps: AllDeps): (keyof ColorIterator2Definition["inputs"])[] => {
    const stopSockets = node.payload.stops.map((s) => s.socket) as `stop_${string}`[];
    if (outSocket === "sequencedOutput") {
        return [...Iteration.SEQUENCED_DEPS, "colorSpace", "angleTraversal", "stops", ...stopSockets];
    }
    if (outSocket === "sampledOutput") {
        return [...Iteration.SAMPLED_DEPS, "colorSpace", "angleTraversal", "stops", ...stopSockets];
    }
    if (outSocket === "stopCount") {
        return ["stops", ...stopSockets];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ColorIterator2Definition>, inSocket: keyof ColorIterator2Definition["inputs"], _deps: AllDeps): (keyof ColorIterator2Definition["outputs"])[] => {
    if (inSocket === "stops") {
        return ["sequencedOutput", "sampledOutput", "stopCount"];
    }
    if ((Iteration.SEQUENCED_DEPS as string[]).includes(inSocket as string)) {
        return ["sequencedOutput"];
    }
    if ((Iteration.SAMPLED_DEPS as string[]).includes(inSocket as string)) {
        return ["sampledOutput"];
    }
    if (typeof inSocket === "string" && inSocket.startsWith("stop_")) {
        return ["sequencedOutput", "sampledOutput", "stopCount"];
    }
    return ["sequencedOutput", "sampledOutput", "stopCount"];
};

const evaluate = (node: NodeDefinitions.NodeFor<ColorIterator2Definition>, socket: keyof ColorIterator2Definition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "stopCount") {
        return { kind: "integer", data: `${resolveStops(node, context).length}` };
    }

    let position: number;
    if (socket === "sequencedOutput") {
        const result = Iteration.evaluate(node, context);
        if (result === null) return null;
        position = result.t * 100;
    } else if (socket === "sampledOutput") {
        position = Iteration.resolveSamplePosition(node, context);
    } else {
        return null;
    }

    const colorSpaceValue = Enum.resolve(context.resolve<"enum">(node.id, "colorSpace")?.data, Enum.Common.colorSpace) ?? node.payload.colorSpace ?? 0;
    const angleTraversalValue = Enum.resolve(context.resolve<"enum">(node.id, "angleTraversal")?.data, Enum.Common.angleTraversal) ?? node.payload.angleTraversal ?? 0;

    const active = resolveStops(node, context).filter((s): s is { value: NonNullable<Color.Type>; position: number; enabled: boolean } => s.enabled && s.value !== null);
    if (active.length === 0) return null;
    active.sort((a, b) => a.position - b.position);

    const value = Iteration.sampleStopsWith(active, position, (a, b, t) => interpolateColor(a, b, t, colorSpaceValue, angleTraversalValue) as NonNullable<Color.Type>);
    return { kind: "color", data: value };
};

const SOCKETTYPES_IN: {
    [key in keyof Required<
        Pick<ColorIterator2Definition["inputs"], "sequence" | "colorSpace" | "angleTraversal" | "mode" | "reverseSequence" | "startOffset" | "endOffset" | "samplePosition" | "stops">
    >]: SocketTypes.SocketRule;
} = {
    ...Iteration.IN_SOCKET_TYPES,
    colorSpace: { types: ["enum"], mode: "and" },
    angleTraversal: { types: ["enum"], mode: "and" },
    stops: { types: ["array<stop<color>>"], mode: "or" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<ColorIterator2Definition["outputs"]>]: SocketTypes.SocketRule } = {
    sequencedOutput: { types: ["color"], mode: "and" },
    sampledOutput: { types: ["color"], mode: "and" },
    stopCount: { types: ["integer"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<ColorIterator2Definition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    if (side === "out") {
        return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
    if (socketId.startsWith("stop_")) {
        return { types: ["stop<color>"], mode: "or" };
    }
    return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
};

const onConnect = (node: NodeDefinitions.BuiltNodeOf<"colorIterator2", ColorIterator2Definition>, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    if (direction !== "in") return;

    const link = ctx.getLink(graphId, linkId);
    if (!link || link.toSocket !== "stops") return;

    const currentNode = ctx.getNode(graphId, node.id);
    if (!currentNode) return;
    const linkIdsToRemove: string[] = [];
    for (const [socketKey, socketLinkId] of Object.entries(currentNode.in)) {
        if (socketKey.startsWith("stop_") && socketLinkId !== null) {
            linkIdsToRemove.push(socketLinkId);
        }
    }
    if (linkIdsToRemove.length === 0) return;
    ctx.removeLinks(graphId, ...linkIdsToRemove);
};

export const ColorIterator2NodeType: NodeTypes.Type<"colorIterator2", ColorIterator2Definition> = {
    type: "colorIterator2",
    displayName: "Color Iterator",
    defaultLabel: "Color Iterator",
    iconNode: <NodeIcon shape={NODE_ICONS.color} modifierIcon={NODE_ICONS.loop} />,
    category: "Collections",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    onConnect,
    getSocketType,
};
