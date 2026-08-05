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

export type RadialGradientDefinition = {
    inputs: {
        stops: DataTypes.Use<"array<stop<color>>">;
        framing: DataTypes.Use<"enum">;
        spread: DataTypes.Use<"enum">;
        centerMode: DataTypes.Use<"enum">;
        centerX: DataTypes.Use<"length">;
        centerY: DataTypes.Use<"length">;
        centerRadius: DataTypes.Use<"length">;
        centerTheta: DataTypes.Use<"angle">;
        endRadius: DataTypes.Use<"length">;
        startOffsetMode: DataTypes.Use<"enum">;
        startOffsetX: DataTypes.Use<"length">;
        startOffsetY: DataTypes.Use<"length">;
        startOffsetRadius: DataTypes.Use<"length">;
        startOffsetTheta: DataTypes.Use<"angle">;
        startRadius: DataTypes.Use<"length">;
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
        centerMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        centerX: DataTypes.TypeOf<DataTypes.Use<"length">>;
        centerY: DataTypes.TypeOf<DataTypes.Use<"length">>;
        centerRadius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        centerTheta: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        endRadius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        startOffsetMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        startOffsetX: DataTypes.TypeOf<DataTypes.Use<"length">>;
        startOffsetY: DataTypes.TypeOf<DataTypes.Use<"length">>;
        startOffsetRadius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        startOffsetTheta: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        startRadius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        stops: StopEntryData[];
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<RadialGradientDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"radialGradient", RadialGradientDefinition> => {
    const s0: `stop_${string}` = `stop_${nanoid()}`;
    const s1: `stop_${string}` = `stop_${nanoid()}`;
    return {
        id,
        in: {
            stops: null,
            framing: null,
            spread: null,
            centerMode: null,
            centerX: null,
            centerY: null,
            centerRadius: null,
            centerTheta: null,
            endRadius: null,
            startOffsetMode: null,
            startOffsetX: null,
            startOffsetY: null,
            startOffsetRadius: null,
            startOffsetTheta: null,
            startRadius: null,
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
            centerMode: input.centerMode ?? Enum.Common.positionMode.CARTESIAN.value,
            centerX: input.centerX ?? "0px",
            centerY: input.centerY ?? "0px",
            centerRadius: input.centerRadius ?? "0px",
            centerTheta: input.centerTheta ?? "0",
            endRadius: input.endRadius ?? "100px",
            startOffsetMode: input.startOffsetMode ?? Enum.Common.positionMode.CARTESIAN.value,
            startOffsetX: input.startOffsetX ?? "0px",
            startOffsetY: input.startOffsetY ?? "0px",
            startOffsetRadius: input.startOffsetRadius ?? "0px",
            startOffsetTheta: input.startOffsetTheta ?? "0",
            startRadius: input.startRadius ?? "0px",
            stops: input.stops ?? [
                { socket: s0, value: { r: 0, g: 0, b: 0, a: 1 }, position: "0", enabled: true },
                { socket: s1, value: { r: 1, g: 1, b: 1, a: 1 }, position: "100", enabled: true },
            ],
        },
        type: "radialGradient",
    };
};

const COORDINATE_SOCKETS = "framing|centerMode|centerX|centerY|centerRadius|centerTheta|endRadius|startOffsetMode|startOffsetX|startOffsetY|startOffsetRadius|startOffsetTheta|startRadius";

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<RadialGradientDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const { alterNode, removeLinks } = Project.useMethods();

    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<RadialGradientDefinition>>) => {
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
                stops: [...(n.payload as RadialGradientDefinition["payload"]).stops, { socket, value: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, position: "50", enabled: true }],
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
                        stops: (n.payload as RadialGradientDefinition["payload"]).stops.filter((s) => s.socket !== socket),
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
    const centerIsCartesian = node.payload.centerMode === Enum.Common.positionMode.CARTESIAN.value && node.in.centerMode === null;
    const centerIsPolar = node.payload.centerMode === Enum.Common.positionMode.POLAR.value && node.in.centerMode === null;
    const offsetIsCartesian = node.payload.startOffsetMode === Enum.Common.positionMode.CARTESIAN.value && node.in.startOffsetMode === null;
    const offsetIsPolar = node.payload.startOffsetMode === Enum.Common.positionMode.POLAR.value && node.in.startOffsetMode === null;

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
                <hr />
                <SocketIn node={node} socketId={"centerMode"} label={"Center Mode"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.centerMode}`}
                        onValue={(v) => handleUpdate({ centerMode: Number(v) })}
                        disabled={node.in.centerMode !== null || framingAuto}
                        options={POSITION_MODE_OPTIONS}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"centerX"} label={"Center X"}>
                    <LengthInput value={node.payload.centerX} onCommit={(centerX) => handleUpdate({ centerX })} disabled={node.in.centerX !== null || framingAuto || centerIsPolar} required />
                </SocketIn>
                <SocketIn node={node} socketId={"centerY"} label={"Center Y"}>
                    <LengthInput value={node.payload.centerY} onCommit={(centerY) => handleUpdate({ centerY })} disabled={node.in.centerY !== null || framingAuto || centerIsPolar} required />
                </SocketIn>
                <SocketIn node={node} socketId={"centerRadius"} label={"Center Radius"}>
                    <LengthInput
                        value={node.payload.centerRadius}
                        onCommit={(centerRadius) => handleUpdate({ centerRadius })}
                        disabled={node.in.centerRadius !== null || framingAuto || centerIsCartesian}
                        required
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"centerTheta"} label={"Center Theta"}>
                    <AngleInput.SliderInput
                        value={node.payload.centerTheta}
                        onCommit={(centerTheta) => handleUpdate({ centerTheta })}
                        disabled={node.in.centerTheta !== null || framingAuto || centerIsCartesian}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"endRadius"} label={"End Radius"}>
                    <LengthInput value={node.payload.endRadius} onCommit={(endRadius) => handleUpdate({ endRadius })} disabled={node.in.endRadius !== null || framingAuto} min={"0px"} required />
                </SocketIn>
                <hr />
                <SocketIn node={node} socketId={"startOffsetMode"} label={"Start Offset Mode"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.startOffsetMode}`}
                        onValue={(v) => handleUpdate({ startOffsetMode: Number(v) })}
                        disabled={node.in.startOffsetMode !== null || framingAuto}
                        options={POSITION_MODE_OPTIONS}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"startOffsetX"} label={"Start Offset X"}>
                    <LengthInput
                        value={node.payload.startOffsetX}
                        onCommit={(startOffsetX) => handleUpdate({ startOffsetX })}
                        disabled={node.in.startOffsetX !== null || framingAuto || offsetIsPolar}
                        required
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"startOffsetY"} label={"Start Offset Y"}>
                    <LengthInput
                        value={node.payload.startOffsetY}
                        onCommit={(startOffsetY) => handleUpdate({ startOffsetY })}
                        disabled={node.in.startOffsetY !== null || framingAuto || offsetIsPolar}
                        required
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"startOffsetRadius"} label={"Start Offset Radius"}>
                    <LengthInput
                        value={node.payload.startOffsetRadius}
                        onCommit={(startOffsetRadius) => handleUpdate({ startOffsetRadius })}
                        disabled={node.in.startOffsetRadius !== null || framingAuto || offsetIsCartesian}
                        required
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"startOffsetTheta"} label={"Start Offset Theta"}>
                    <AngleInput.SliderInput
                        value={node.payload.startOffsetTheta}
                        onCommit={(startOffsetTheta) => handleUpdate({ startOffsetTheta })}
                        disabled={node.in.startOffsetTheta !== null || framingAuto || offsetIsCartesian}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"startRadius"} label={"Start Radius"}>
                    <LengthInput
                        value={node.payload.startRadius}
                        onCommit={(startRadius) => handleUpdate({ startRadius })}
                        disabled={node.in.startRadius !== null || framingAuto}
                        min={"0px"}
                        required
                    />
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
    node: NodeDefinitions.NodeFor<RadialGradientDefinition>;
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
const resolveStops = (node: NodeDefinitions.NodeFor<RadialGradientDefinition>, context: Resolver.Context): { value: Color.Type; position: number; enabled: boolean }[] => {
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

/** Angle convention: 0deg = top, CW positive (matches the Line/Circle shapes). */
const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;

const resolvePoint = (mode: number, x: number, y: number, radius: number, theta: number): [number, number] => {
    if (mode === Enum.Common.positionMode.POLAR.value) {
        const t = toRad(theta);
        return [radius * Math.cos(t), radius * Math.sin(t)];
    }
    return [x, y];
};

const GEOMETRY_INPUTS: (keyof RadialGradientDefinition["inputs"])[] = [
    "framing",
    "centerMode",
    "centerX",
    "centerY",
    "centerRadius",
    "centerTheta",
    "endRadius",
    "startOffsetMode",
    "startOffsetX",
    "startOffsetY",
    "startOffsetRadius",
    "startOffsetTheta",
    "startRadius",
];

const dependsOn = (node: NodeDefinitions.NodeFor<RadialGradientDefinition>, outSocket: keyof RadialGradientDefinition["outputs"], _deps: AllDeps): (keyof RadialGradientDefinition["inputs"])[] => {
    const stopSockets = node.payload.stops.map((s) => s.socket) as `stop_${string}`[];
    if (outSocket === "output") {
        return ["stops", "spread", ...GEOMETRY_INPUTS, ...stopSockets];
    }
    if (outSocket === "stopCount") {
        return ["stops", ...stopSockets];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<RadialGradientDefinition>, inSocket: keyof RadialGradientDefinition["inputs"], _deps: AllDeps): (keyof RadialGradientDefinition["outputs"])[] => {
    if (inSocket === "stops" || (typeof inSocket === "string" && inSocket.startsWith("stop_"))) {
        return ["output", "stopCount"];
    }
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<RadialGradientDefinition>, socket: keyof RadialGradientDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "stopCount") {
        return { kind: "integer", data: `${resolveStops(node, context).length}` };
    }

    if (socket !== "output") return null;

    const stops = toGradientStops(resolveStops(node, context));
    if (stops.length === 0) return null;

    const spreadIdx = Enum.resolve(context.resolve<"enum">(node.id, "spread")?.data, Enum.Common.gradientSpread) ?? node.payload.spread ?? 0;
    const spread = Resolver.EnumMappings.gradientSpread[spreadIdx] ?? "pad";

    const framing = Enum.resolve(context.resolve<"enum">(node.id, "framing")?.data, Enum.Common.framing) ?? node.payload.framing ?? 0;

    const gradient: GradientPaint = {
        variant: "radial",
        units: framing === Enum.Common.framing.MANUAL.value ? "userSpaceOnUse" : "objectBoundingBox",
        stops,
        spread,
        angle: 0,
    };

    if (gradient.units === "userSpaceOnUse") {
        const centerMode = Enum.resolve(context.resolve<"enum">(node.id, "centerMode")?.data, Enum.Common.positionMode) ?? node.payload.centerMode;
        const centerX = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "centerX")?.data ?? node.payload.centerX) ?? 0;
        const centerY = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "centerY")?.data ?? node.payload.centerY) ?? 0;
        const centerRadius = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "centerRadius")?.data ?? node.payload.centerRadius) ?? 0;
        const centerTheta = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "centerTheta")?.data ?? node.payload.centerTheta) ?? 0;

        const endRadius = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "endRadius")?.data ?? node.payload.endRadius) ?? 0;

        const offsetMode = Enum.resolve(context.resolve<"enum">(node.id, "startOffsetMode")?.data, Enum.Common.positionMode) ?? node.payload.startOffsetMode;
        const offsetX = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "startOffsetX")?.data ?? node.payload.startOffsetX) ?? 0;
        const offsetY = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "startOffsetY")?.data ?? node.payload.startOffsetY) ?? 0;
        const offsetRadius = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "startOffsetRadius")?.data ?? node.payload.startOffsetRadius) ?? 0;
        const offsetTheta = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "startOffsetTheta")?.data ?? node.payload.startOffsetTheta) ?? 0;

        const startRadius = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "startRadius")?.data ?? node.payload.startRadius) ?? 0;

        const [cx, cy] = resolvePoint(centerMode, centerX, centerY, centerRadius, centerTheta);
        const [dx, dy] = resolvePoint(offsetMode, offsetX, offsetY, offsetRadius, offsetTheta);
        gradient.radial = { cx, cy, r: endRadius, fx: cx + dx, fy: cy + dy, fr: startRadius };
    }

    return { kind: "gradient", data: gradient };
};

const SOCKETTYPES_IN: {
    [key in keyof Required<Omit<RadialGradientDefinition["inputs"], `stop_${string}`>>]: SocketTypes.SocketRule;
} = {
    stops: { types: ["array<stop<color>>"], mode: "or" },
    framing: { types: ["enum"], mode: "and" },
    spread: { types: ["enum"], mode: "and" },
    centerMode: { types: ["enum"], mode: "and" },
    centerX: { types: ["length"], mode: "and" },
    centerY: { types: ["length"], mode: "and" },
    centerRadius: { types: ["length"], mode: "and" },
    centerTheta: { types: ["angle"], mode: "and" },
    endRadius: { types: ["length"], mode: "and" },
    startOffsetMode: { types: ["enum"], mode: "and" },
    startOffsetX: { types: ["length"], mode: "and" },
    startOffsetY: { types: ["length"], mode: "and" },
    startOffsetRadius: { types: ["length"], mode: "and" },
    startOffsetTheta: { types: ["angle"], mode: "and" },
    startRadius: { types: ["length"], mode: "and" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<RadialGradientDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["gradient"], mode: "and" },
    stopCount: { types: ["integer"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<RadialGradientDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    if (side === "out") {
        return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
    if (socketId.startsWith("stop_")) {
        return { types: ["stop<color>"], mode: "or" };
    }
    return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
};

const onConnect = (node: NodeDefinitions.BuiltNodeOf<"radialGradient", RadialGradientDefinition>, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
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

export const RadialGradientNodeType: NodeTypes.Type<"radialGradient", RadialGradientDefinition> = {
    type: "radialGradient",
    displayName: "Radial Gradient",
    defaultLabel: "Radial Gradient",
    iconNode: <NodeIcon shape={NODE_ICONS.radialGradient} />,
    category: "Collections",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    onConnect,
    getSocketType,
};
