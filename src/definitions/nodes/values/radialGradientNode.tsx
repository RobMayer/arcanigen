import { nanoid } from "nanoid";
import { Icon, ICONS, NODE_ICONS, NodeIcon } from "../../../components/Icon";
import { DragEvent, ReactNode, useCallback, useRef, useState } from "react";
import styled from "styled-components";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut, SocketPair } from "../../../features/nodeview/slots";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { NumericString } from "../../datatypes/numericString";
import { Enum } from "../../datatypes/enum";
import { Color } from "../../datatypes/color";
import { Length } from "../../datatypes/length";
import { ColorHexInput } from "../../../components/inputs/ColorHexInput";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { PointInput } from "../../../components/inputs/PointInput";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { PointHelper } from "../../helpers/pointHelper";
import { EmptyOr } from "../../../util/misc";
import { GradientPaint, GradientStop } from "../../shapeTypes";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const SPREAD_OPTIONS = Enum.options(Enum.Common.gradientSpread);
const FRAMING_OPTIONS = Enum.options(Enum.Common.framing);
type StopEntryData = { socket: string; value: Color.Type; position: EmptyOr<NumericString.Type>; enabled: boolean };

const def = signature({
    in: {
        stops: $.arrayOf("stop:color"),
        framing: "enum",
        spread: "enum",
        centerPoint: "point",
        endRadius: "length",
        focalPoint: "point",
        startRadius: "length",
        "stop_*": "stop:color",
    },
    out: { output: "gradient", stopCount: "integer" },
});

export type RadialGradientDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        framing: DataTypes.TypeOf<DataTypes.Enum>;
        spread: DataTypes.TypeOf<DataTypes.Enum>;
        center: PointInput.Value;
        endRadius: DataTypes.TypeOf<DataTypes.Length>;
        startOffset: PointInput.Value;
        startRadius: DataTypes.TypeOf<DataTypes.Length>;
        stops: StopEntryData[];
    }
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<RadialGradientDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"radialGradient", RadialGradientDefinition> => {
    const s0: `stop_${string}` = `stop_${nanoid()}`;
    const s1: `stop_${string}` = `stop_${nanoid()}`;
    return {
        id,
        in: {
            stops: null,
            framing: null,
            spread: null,
            centerPoint: null,
            endRadius: null,
            focalPoint: null,
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
            center: input.center ?? { ...PointInput.DEFAULT },
            endRadius: input.endRadius ?? "100px",
            startOffset: input.startOffset ?? { ...PointInput.DEFAULT },
            startRadius: input.startRadius ?? "0px",
            stops: input.stops ?? [
                { socket: s0, value: { r: 0, g: 0, b: 0, a: 1 }, position: "0", enabled: true },
                { socket: s1, value: { r: 1, g: 1, b: 1, a: 1 }, position: "100", enabled: true },
            ],
        },
        type: "radialGradient",
    };
};

const COORDINATE_SOCKETS = "framing|centerPoint|endRadius|focalPoint|startRadius";

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
    const centerConnected = node.in.centerPoint !== null;
    const focalConnected = node.in.focalPoint !== null;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketPair node={node} socketInId={"stops"} socketOutId={"output"}>
                <span>Input</span>
                <span>Output</span>
            </SocketPair>
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
                <SocketIn node={node} socketId={"centerPoint"} label={"Center"}>
                    <PointInput value={node.payload.center} onChange={(v) => handleUpdate({ center: { ...node.payload.center, ...v } })} disabled={centerConnected || framingAuto} />
                </SocketIn>
                <SocketIn node={node} socketId={"endRadius"} label={"End Radius"}>
                    <LengthInput value={node.payload.endRadius} onCommit={(endRadius) => handleUpdate({ endRadius })} disabled={node.in.endRadius !== null || framingAuto} min={"0px"} required />
                </SocketIn>
                <hr />
                <SocketIn node={node} socketId={"focalPoint"} label={"Focus"}>
                    <PointInput value={node.payload.startOffset} onChange={(v) => handleUpdate({ startOffset: { ...node.payload.startOffset, ...v } })} disabled={focalConnected || framingAuto} />
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

// Resolve the effective stops: the supersocket (an array<stop:color>) overrides everything;
// otherwise fold each per-stop socket (a connected stop:color) over its inline payload.
const resolveStops = (node: NodeDefinitions.NodeFor<RadialGradientDefinition>, context: Resolver.Context): { value: Color.Type; position: number; enabled: boolean }[] => {
    const supersocketEval = context.resolve<DataTypes.ArrayOf<DataTypes.StopColor>>(node.id, "stops");
    if (supersocketEval) {
        return supersocketEval.data.map((s) => ({ value: s.value, position: s.position ?? 0, enabled: s.enabled ?? true }));
    }

    const resolved: { value: Color.Type; position: number; enabled: boolean }[] = [];
    for (const entry of node.payload.stops) {
        const connected = context.resolve<DataTypes.StopColor>(node.id, entry.socket);
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
const GEOMETRY_INPUTS: (keyof RadialGradientDefinition["inputs"])[] = ["framing", "centerPoint", "endRadius", "focalPoint", "startRadius"];

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

    const spreadIdx = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "spread")?.data, Enum.Common.gradientSpread) ?? node.payload.spread ?? 0;
    const spread = Resolver.EnumMappings.gradientSpread[spreadIdx] ?? "pad";

    const framing = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "framing")?.data, Enum.Common.framing) ?? node.payload.framing ?? 0;

    const gradient: GradientPaint = {
        variant: "radial",
        units: framing === Enum.Common.framing.MANUAL.value ? "userSpaceOnUse" : "objectBoundingBox",
        stops,
        spread,
        angle: 0,
    };

    if (gradient.units === "userSpaceOnUse") {
        const center = context.resolve<DataTypes.Point>(node.id, "centerPoint")?.data ?? PointHelper.fromAuthoring(node.payload.center);
        const centerX = center.x;
        const centerY = center.y;

        const endRadius = Length.Emptyable.asNumber(context.resolve<DataTypes.Length>(node.id, "endRadius")?.data ?? node.payload.endRadius) ?? 0;

        const offset = context.resolve<DataTypes.Point>(node.id, "focalPoint")?.data ?? PointHelper.fromAuthoring(node.payload.startOffset);

        const startRadius = Length.Emptyable.asNumber(context.resolve<DataTypes.Length>(node.id, "startRadius")?.data ?? node.payload.startRadius) ?? 0;

        gradient.radial = { cx: centerX, cy: centerY, r: endRadius, fx: centerX + offset.x, fy: centerY + offset.y, fr: startRadius };
    }

    return { kind: "gradient", data: gradient };
};

// Supersocket override: connecting the whole `array<stop:color>` clears the now-hidden element family,
// then hands off to the engine (a no-op for this var-free def, kept for uniform wiring).
const onConnect = (node: NodeDefinitions.BuiltNodeOf<"radialGradient", RadialGradientDefinition>, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
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

export const RadialGradientNodeType: NodeTypes.Type<"radialGradient", RadialGradientDefinition> = {
    type: "radialGradient",
    displayName: "Radial Gradient",
    defaultLabel: "Radial Gradient",
    iconNode: <NodeIcon shape={NODE_ICONS.radialGradient} />,
    flavour: "accent",
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
