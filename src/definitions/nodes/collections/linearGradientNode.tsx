import { nanoid } from "nanoid";
import { Icon, ICONS, NODE_ICONS, NodeIcon } from "../../../components/Icon";
import { DragEvent, ReactNode, useCallback, useRef, useState } from "react";
import styled from "styled-components";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { NumericString } from "../../datatypes/numericString";
import { Enum } from "../../datatypes/enum";
import { Color } from "../../datatypes/color";
import { Length } from "../../datatypes/length";
import { ColorHexInput } from "../../../components/inputs/ColorHexInput";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { EmptyOr } from "../../../util/misc";
import { GradientPaint, GradientStop } from "../../shapeTypes";

const SPREAD_OPTIONS = Enum.options(Enum.Common.gradientSpread);
const FRAMING_OPTIONS = Enum.options(Enum.Common.framing);
const POSITION_MODE_OPTIONS = Enum.options(Enum.Common.positionMode);

type StopEntryData = { socket: string; value: Color.Type; position: EmptyOr<NumericString.Type>; enabled: boolean };

export type LinearGradientDefinition = {
    inputs: {
        stops: DataTypes.Use<"array<stop<color>>">;
        framing: DataTypes.Use<"enum">;
        spread: DataTypes.Use<"enum">;
        angle: DataTypes.Use<"angle">;
        startMode: DataTypes.Use<"enum">;
        startX: DataTypes.Use<"length">;
        startY: DataTypes.Use<"length">;
        startRadius: DataTypes.Use<"length">;
        startTheta: DataTypes.Use<"angle">;
        endMode: DataTypes.Use<"enum">;
        endX: DataTypes.Use<"length">;
        endY: DataTypes.Use<"length">;
        endRadius: DataTypes.Use<"length">;
        endTheta: DataTypes.Use<"angle">;
        [stopSocket: `stop_${string}`]: DataTypes.Use<"stop<color>">;
    };
    outputs: {
        output: DataTypes.Use<"gradient">;
        stopCount: DataTypes.Use<"integer">;
    };
    payload: {
        label: string;
        framing: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        spread: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        angle: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        startMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        startX: DataTypes.TypeOf<DataTypes.Use<"length">>;
        startY: DataTypes.TypeOf<DataTypes.Use<"length">>;
        startRadius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        startTheta: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        endMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        endX: DataTypes.TypeOf<DataTypes.Use<"length">>;
        endY: DataTypes.TypeOf<DataTypes.Use<"length">>;
        endRadius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        endTheta: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        stops: StopEntryData[];
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<LinearGradientDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"linearGradient", LinearGradientDefinition> => {
    const s0: `stop_${string}` = `stop_${nanoid()}`;
    const s1: `stop_${string}` = `stop_${nanoid()}`;
    return {
        id,
        in: {
            stops: null,
            framing: null,
            spread: null,
            angle: null,
            startMode: null,
            startX: null,
            startY: null,
            startRadius: null,
            startTheta: null,
            endMode: null,
            endX: null,
            endY: null,
            endRadius: null,
            endTheta: null,
            [s0]: null,
            [s1]: null,
        },
        out: {
            output: [],
            stopCount: [],
        },
        payload: {
            label: "",
            framing: input.framing ?? Enum.Common.framing.AUTO.value,
            spread: input.spread ?? Enum.Common.gradientSpread.PAD.value,
            angle: input.angle ?? "0",
            startMode: input.startMode ?? Enum.Common.positionMode.CARTESIAN.value,
            startX: input.startX ?? "0px",
            startY: input.startY ?? "0px",
            startRadius: input.startRadius ?? "0px",
            startTheta: input.startTheta ?? "0",
            endMode: input.endMode ?? Enum.Common.positionMode.CARTESIAN.value,
            endX: input.endX ?? "100px",
            endY: input.endY ?? "0px",
            endRadius: input.endRadius ?? "100px",
            endTheta: input.endTheta ?? "90",
            stops: input.stops ?? [
                { socket: s0, value: { r: 0, g: 0, b: 0, a: 1 }, position: "0", enabled: true },
                { socket: s1, value: { r: 1, g: 1, b: 1, a: 1 }, position: "100", enabled: true },
            ],
        },
        type: "linearGradient",
    };
};

const COORDINATE_SOCKETS = "framing|angle|startMode|startX|startY|startRadius|startTheta|endMode|endX|endY|endRadius|endTheta";

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<LinearGradientDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const { alterNode, removeLinks } = Project.useMethods();

    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<LinearGradientDefinition>>) => {
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
                stops: [...(n.payload as LinearGradientDefinition["payload"]).stops, { socket, value: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, position: "50", enabled: true }],
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
                        stops: (n.payload as LinearGradientDefinition["payload"]).stops.filter((s) => s.socket !== socket),
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

    // Auto/Manual gating (only decidable when framing isn't itself driven by a link).
    const framingAuto = node.payload.framing === Enum.Common.framing.AUTO.value && node.in.framing === null;
    const framingManual = node.payload.framing === Enum.Common.framing.MANUAL.value && node.in.framing === null;
    const startIsCartesian = node.payload.startMode === Enum.Common.positionMode.CARTESIAN.value && node.in.startMode === null;
    const startIsPolar = node.payload.startMode === Enum.Common.positionMode.POLAR.value && node.in.startMode === null;
    const endIsCartesian = node.payload.endMode === Enum.Common.positionMode.CARTESIAN.value && node.in.endMode === null;
    const endIsPolar = node.payload.endMode === Enum.Common.positionMode.POLAR.value && node.in.endMode === null;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Gradient
            </SocketOut>
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
            <NodeAccordion label={"Coordinates"} nodeId={node.id} socketsIn={COORDINATE_SOCKETS}>
                <SocketIn node={node} socketId={"framing"} label={"Framing"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.framing}`}
                        onValue={(v) => handleUpdate({ framing: Number(v) })}
                        disabled={node.in.framing !== null}
                        options={FRAMING_OPTIONS}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"angle"} label={"Angle"}>
                    <AngleInput.SliderInput value={node.payload.angle} onCommit={(angle) => handleUpdate({ angle })} disabled={node.in.angle !== null || framingManual} unbound />
                </SocketIn>
                <hr />
                <SocketIn node={node} socketId={"startMode"} label={"Start Mode"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.startMode}`}
                        onValue={(v) => handleUpdate({ startMode: Number(v) })}
                        disabled={node.in.startMode !== null || framingAuto}
                        options={POSITION_MODE_OPTIONS}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"startX"} label={"Start X"}>
                    <LengthInput value={node.payload.startX} onCommit={(startX) => handleUpdate({ startX })} disabled={node.in.startX !== null || framingAuto || startIsPolar} required />
                </SocketIn>
                <SocketIn node={node} socketId={"startY"} label={"Start Y"}>
                    <LengthInput value={node.payload.startY} onCommit={(startY) => handleUpdate({ startY })} disabled={node.in.startY !== null || framingAuto || startIsPolar} required />
                </SocketIn>
                <SocketIn node={node} socketId={"startRadius"} label={"Start Radius"}>
                    <LengthInput
                        value={node.payload.startRadius}
                        onCommit={(startRadius) => handleUpdate({ startRadius })}
                        disabled={node.in.startRadius !== null || framingAuto || startIsCartesian}
                        required
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"startTheta"} label={"Start Theta"}>
                    <AngleInput.SliderInput
                        value={node.payload.startTheta}
                        onCommit={(startTheta) => handleUpdate({ startTheta })}
                        disabled={node.in.startTheta !== null || framingAuto || startIsCartesian}
                    />
                </SocketIn>
                <hr />
                <SocketIn node={node} socketId={"endMode"} label={"End Mode"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.endMode}`}
                        onValue={(v) => handleUpdate({ endMode: Number(v) })}
                        disabled={node.in.endMode !== null || framingAuto}
                        options={POSITION_MODE_OPTIONS}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"endX"} label={"End X"}>
                    <LengthInput value={node.payload.endX} onCommit={(endX) => handleUpdate({ endX })} disabled={node.in.endX !== null || framingAuto || endIsPolar} required />
                </SocketIn>
                <SocketIn node={node} socketId={"endY"} label={"End Y"}>
                    <LengthInput value={node.payload.endY} onCommit={(endY) => handleUpdate({ endY })} disabled={node.in.endY !== null || framingAuto || endIsPolar} required />
                </SocketIn>
                <SocketIn node={node} socketId={"endRadius"} label={"End Radius"}>
                    <LengthInput value={node.payload.endRadius} onCommit={(endRadius) => handleUpdate({ endRadius })} disabled={node.in.endRadius !== null || framingAuto || endIsCartesian} required />
                </SocketIn>
                <SocketIn node={node} socketId={"endTheta"} label={"End Theta"}>
                    <AngleInput.SliderInput value={node.payload.endTheta} onCommit={(endTheta) => handleUpdate({ endTheta })} disabled={node.in.endTheta !== null || framingAuto || endIsCartesian} />
                </SocketIn>
            </NodeAccordion>
            <NodeAccordion label={"Additional Options"} nodeId={node.id} socketsIn={"spread"} socketsOut={"stopCount"}>
                <SocketIn node={node} socketId={"spread"} label={"Spread"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.spread}`}
                        onValue={(v) => handleUpdate({ spread: Number(v) })}
                        disabled={node.in.spread !== null}
                        options={SPREAD_OPTIONS}
                    />
                </SocketIn>
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
    node: NodeDefinitions.NodeFor<LinearGradientDefinition>;
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

// Resolve the effective stops: the supersocket (an array<stop<color>>) overrides everything;
// otherwise fold each per-stop socket (a connected stop<color>) over its inline payload.
const resolveStops = (node: NodeDefinitions.NodeFor<LinearGradientDefinition>, context: Resolver.Context): { value: Color.Type; position: number; enabled: boolean }[] => {
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

const toGradientStops = (resolved: { value: Color.Type; position: number; enabled: boolean }[]): GradientStop[] => {
    return resolved
        .filter((s): s is { value: NonNullable<Color.Type>; position: number; enabled: boolean } => s.enabled && s.value !== null)
        .sort((a, b) => a.position - b.position)
        .map((s) => ({
            color: Color.toHex(s.value).slice(0, 7), // "#RRGGBB", alpha peeled into opacity for renderer/export reliability
            opacity: s.value.a,
            position: Math.max(0, Math.min(1, s.position / 100)),
        }));
};

/** Angle convention: 0deg = top, CW positive (matches the Line shape). */
const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;

const resolvePoint = (mode: number, x: number, y: number, radius: number, theta: number): [number, number] => {
    if (mode === Enum.Common.positionMode.POLAR.value) {
        const t = toRad(theta);
        return [radius * Math.cos(t), radius * Math.sin(t)];
    }
    return [x, y];
};

const GEOMETRY_INPUTS: (keyof LinearGradientDefinition["inputs"])[] = [
    "framing",
    "angle",
    "startMode",
    "startX",
    "startY",
    "startRadius",
    "startTheta",
    "endMode",
    "endX",
    "endY",
    "endRadius",
    "endTheta",
];

const dependsOn = (node: NodeDefinitions.NodeFor<LinearGradientDefinition>, outSocket: keyof LinearGradientDefinition["outputs"], _deps: AllDeps): (keyof LinearGradientDefinition["inputs"])[] => {
    const stopSockets = node.payload.stops.map((s) => s.socket) as `stop_${string}`[];
    if (outSocket === "output") {
        return ["stops", "spread", ...GEOMETRY_INPUTS, ...stopSockets];
    }
    if (outSocket === "stopCount") {
        return ["stops", ...stopSockets];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<LinearGradientDefinition>, inSocket: keyof LinearGradientDefinition["inputs"], _deps: AllDeps): (keyof LinearGradientDefinition["outputs"])[] => {
    if (inSocket === "stops" || (typeof inSocket === "string" && inSocket.startsWith("stop_"))) {
        return ["output", "stopCount"];
    }
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<LinearGradientDefinition>, socket: keyof LinearGradientDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "stopCount") {
        return { kind: "integer", data: `${resolveStops(node, context).length}` };
    }

    if (socket !== "output") return null;

    const stops = toGradientStops(resolveStops(node, context));
    if (stops.length === 0) return null;

    const spreadIdx = Enum.resolve(context.resolve<"enum">(node.id, "spread")?.data, Enum.Common.gradientSpread) ?? node.payload.spread ?? 0;
    const spread = Resolver.EnumMappings.gradientSpread[spreadIdx] ?? "pad";
    const angle = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "angle")?.data ?? node.payload.angle) ?? 0;

    const framing = Enum.resolve(context.resolve<"enum">(node.id, "framing")?.data, Enum.Common.framing) ?? node.payload.framing ?? 0;

    const gradient: GradientPaint = {
        variant: "linear",
        units: framing === Enum.Common.framing.MANUAL.value ? "userSpaceOnUse" : "objectBoundingBox",
        stops,
        spread,
        angle,
    };

    if (gradient.units === "userSpaceOnUse") {
        const startMode = Enum.resolve(context.resolve<"enum">(node.id, "startMode")?.data, Enum.Common.positionMode) ?? node.payload.startMode;
        const startX = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "startX")?.data ?? node.payload.startX) ?? 0;
        const startY = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "startY")?.data ?? node.payload.startY) ?? 0;
        const startRadius = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "startRadius")?.data ?? node.payload.startRadius) ?? 0;
        const startTheta = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "startTheta")?.data ?? node.payload.startTheta) ?? 0;

        const endMode = Enum.resolve(context.resolve<"enum">(node.id, "endMode")?.data, Enum.Common.positionMode) ?? node.payload.endMode;
        const endX = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "endX")?.data ?? node.payload.endX) ?? 0;
        const endY = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "endY")?.data ?? node.payload.endY) ?? 0;
        const endRadius = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "endRadius")?.data ?? node.payload.endRadius) ?? 0;
        const endTheta = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "endTheta")?.data ?? node.payload.endTheta) ?? 0;

        const [x1, y1] = resolvePoint(startMode, startX, startY, startRadius, startTheta);
        const [x2, y2] = resolvePoint(endMode, endX, endY, endRadius, endTheta);
        gradient.linear = { x1, y1, x2, y2 };
    }

    return { kind: "gradient", data: gradient };
};

const SOCKETTYPES_IN: {
    [key in keyof Required<Omit<LinearGradientDefinition["inputs"], `stop_${string}`>>]: SocketTypes.SocketRule;
} = {
    stops: { types: ["array<stop<color>>"], mode: "or" },
    framing: { types: ["enum"], mode: "and" },
    spread: { types: ["enum"], mode: "and" },
    angle: { types: ["angle"], mode: "and" },
    startMode: { types: ["enum"], mode: "and" },
    startX: { types: ["length"], mode: "and" },
    startY: { types: ["length"], mode: "and" },
    startRadius: { types: ["length"], mode: "and" },
    startTheta: { types: ["angle"], mode: "and" },
    endMode: { types: ["enum"], mode: "and" },
    endX: { types: ["length"], mode: "and" },
    endY: { types: ["length"], mode: "and" },
    endRadius: { types: ["length"], mode: "and" },
    endTheta: { types: ["angle"], mode: "and" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<LinearGradientDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["gradient"], mode: "and" },
    stopCount: { types: ["integer"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<LinearGradientDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    if (side === "out") {
        return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
    if (socketId.startsWith("stop_")) {
        return { types: ["stop<color>"], mode: "or" };
    }
    return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
};

const onConnect = (node: NodeDefinitions.BuiltNodeOf<"linearGradient", LinearGradientDefinition>, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
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

export const LinearGradientNodeType: NodeTypes.Type<"linearGradient", LinearGradientDefinition> = {
    type: "linearGradient",
    displayName: "Linear Gradient",
    defaultLabel: "Linear Gradient",
    iconNode: <NodeIcon shape={NODE_ICONS.linearGradient} />,
    category: "Collections",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    onConnect,
    getSocketType,
};
