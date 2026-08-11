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
import { Angle } from "../../datatypes/angle";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { Dropdown } from "../../../components/inputs/Dropdown";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { IterationPrefab } from "../../helpers/iterationPrefab";
import { EmptyOr } from "../../../util/misc";
import { lerpAngle } from "../../../util/colorSpaces";
import styled from "styled-components";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const ANGLE_TRAVERSAL_OPTIONS = Enum.options(Enum.Common.angleTraversal);
const ANGLE_CONTINUITY_OPTIONS = Enum.options(Enum.Common.angleContinuity);

const def = signature({
    in: {
        sequence: "sequence",
        mode: "enum",
        reverseSequence: "boolean",
        startOffset: "integer",
        endOffset: "integer",
        samplePosition: $.oneOf("float", "integer"),
        angleTraversal: "enum",
        continuity: "enum",
        stops: $.arrayOf("stop:angle"),
        "stop_*": "stop:angle",
    },
    out: { sequencedOutput: "angle", sampledOutput: "angle", stopCount: "integer" },
});

export type AngleIterator2Definition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        angleTraversal: DataTypes.TypeOf<"enum">;
        continuity: DataTypes.TypeOf<"enum">;
        stops: { socket: string; value: EmptyOr<Angle.Type>; position: EmptyOr<NumericString.Type>; enabled: boolean }[];
    } & IterationPrefab.Definition["payload"]
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<AngleIterator2Definition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"angleIterator2", AngleIterator2Definition> => {
    const s0: `stop_${string}` = `stop_${nanoid()}`;
    const s1: `stop_${string}` = `stop_${nanoid()}`;
    return {
        id,
        in: {
            sequence: null,
            angleTraversal: null,
            continuity: null,
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
            angleTraversal: input.angleTraversal ?? Enum.Common.angleTraversal.CLOCKWISE.value,
            continuity: input.continuity ?? Enum.Common.angleContinuity.CONTINUOUS.value,
            mode: input.mode ?? Enum.Common.sequencerMode.CLAMP.value,
            reverseSequence: input.reverseSequence ?? false,
            startOffset: input.startOffset ?? "0",
            endOffset: input.endOffset ?? "0",
            samplePosition: input.samplePosition ?? "50",
            stops: input.stops ?? [
                { socket: s0, value: "0", position: "0", enabled: true },
                { socket: s1, value: "360", position: "100", enabled: true },
            ],
        },
        type: "angleIterator2",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<AngleIterator2Definition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const { alterNode, removeLinks } = Project.useMethods();

    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<AngleIterator2Definition>>) => {
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
                stops: [...(n.payload as AngleIterator2Definition["payload"]).stops, { socket, value: "180", position: "50", enabled: true }],
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
                        stops: (n.payload as AngleIterator2Definition["payload"]).stops.filter((s) => s.socket !== socket),
                    },
                };
            });
        },
        [alterNode, removeLinks, node.id, node.in],
    );

    const handleStopUpdate = useCallback(
        (socket: string, update: Partial<{ value: EmptyOr<Angle.Type>; position: EmptyOr<NumericString.Type>; enabled: boolean }>) => {
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
    const isContinuous = node.payload.continuity === Enum.Common.angleContinuity.CONTINUOUS.value && node.in.continuity === null;

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

            <NodeAccordion label={"Options"} nodeId={node.id} socketsIn="continuity|angleTraversal|mode|reverseSequence|startOffset|endOffset">
                <SocketIn node={node} socketId={"continuity"} label={"Continuity"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.continuity}`}
                        onValue={(v) => handleUpdate({ continuity: Number(v) })}
                        disabled={node.in.continuity !== null}
                        options={ANGLE_CONTINUITY_OPTIONS}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"angleTraversal"} label={"Traversal"}>
                    <Dropdown value={`${node.payload.angleTraversal}`} onValue={(v) => handleUpdate({ angleTraversal: Number(v) })} disabled={node.in.angleTraversal !== null || isContinuous}>
                        {ANGLE_TRAVERSAL_OPTIONS.map((each) => (
                            <option value={each.value} key={each.value}>
                                {each.label}
                            </option>
                        ))}
                    </Dropdown>
                </SocketIn>
                <IterationPrefab.Controls node={node} handleUpdate={handleUpdate} />
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
    entry: { socket: string; value: EmptyOr<Angle.Type>; position: EmptyOr<NumericString.Type>; enabled: boolean };
    node: NodeDefinitions.NodeFor<AngleIterator2Definition>;
    index: number;
    handleStopUpdate: (socket: string, update: Partial<{ value: EmptyOr<Angle.Type>; position: EmptyOr<NumericString.Type>; enabled: boolean }>) => void;
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
                    <AngleInput className={"stopValue"} value={entry.value} onCommit={(value) => handleStopUpdate(entry.socket, { value })} disabled={connected} unbound />
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
        flex: 1 1 0;
        width: 0;
        min-width: 0;
    }

    & > .stopPosition {
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

// Resolve the effective stops: the supersocket (an array<stop:angle>) overrides everything;
// otherwise fold each per-stop socket (a connected stop:angle) over its inline payload.
const resolveStops = (node: NodeDefinitions.NodeFor<AngleIterator2Definition>, context: Resolver.Context): { value: number; position: number; enabled: boolean }[] => {
    const supersocketEval = context.resolve<"array<stop:angle>">(node.id, "stops");
    if (supersocketEval) {
        return supersocketEval.data.map((s) => ({ value: s.value ?? 0, position: s.position ?? 0, enabled: s.enabled ?? true }));
    }

    const resolved: { value: number; position: number; enabled: boolean }[] = [];
    for (const entry of node.payload.stops) {
        const connected = context.resolve<"stop:angle">(node.id, entry.socket);
        if (connected) {
            resolved.push({
                value: connected.data.value ?? NumericString.Emptyable.asNumber(entry.value) ?? 0,
                position: connected.data.position ?? NumericString.Emptyable.asNumber(entry.position) ?? 0,
                enabled: connected.data.enabled ?? entry.enabled,
            });
        } else {
            resolved.push({
                value: NumericString.Emptyable.asNumber(entry.value) ?? 0,
                position: NumericString.Emptyable.asNumber(entry.position) ?? 0,
                enabled: entry.enabled,
            });
        }
    }
    return resolved;
};

const dependsOn = (node: NodeDefinitions.NodeFor<AngleIterator2Definition>, outSocket: keyof AngleIterator2Definition["outputs"], _deps: AllDeps): (keyof AngleIterator2Definition["inputs"])[] => {
    const stopSockets = node.payload.stops.map((s) => s.socket) as `stop_${string}`[];
    if (outSocket === "sequencedOutput") {
        return [...IterationPrefab.SEQUENCED_DEPS, "angleTraversal", "continuity", "stops", ...stopSockets];
    }
    if (outSocket === "sampledOutput") {
        return [...IterationPrefab.SAMPLED_DEPS, "angleTraversal", "continuity", "stops", ...stopSockets];
    }
    if (outSocket === "stopCount") {
        return ["stops", ...stopSockets];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<AngleIterator2Definition>, inSocket: keyof AngleIterator2Definition["inputs"], _deps: AllDeps): (keyof AngleIterator2Definition["outputs"])[] => {
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

const evaluate = (node: NodeDefinitions.NodeFor<AngleIterator2Definition>, socket: keyof AngleIterator2Definition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
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

    const traversal = Enum.resolve(context.resolve<"enum">(node.id, "angleTraversal")?.data, Enum.Common.angleTraversal) ?? node.payload.angleTraversal ?? Enum.Common.angleTraversal.CLOCKWISE.value;
    const continuity = Enum.resolve(context.resolve<"enum">(node.id, "continuity")?.data, Enum.Common.angleContinuity) ?? node.payload.continuity ?? Enum.Common.angleContinuity.CONTINUOUS.value;
    const cyclical = continuity === Enum.Common.angleContinuity.CYCLICAL.value;

    const active = resolveStops(node, context).filter((s) => s.enabled);
    if (active.length === 0) return null;
    active.sort((a, b) => a.position - b.position);

    // Cyclical segments wrap around the wheel (respecting traversal); continuous segments are plain
    // numeric lerps that preserve absolute magnitude (e.g. 0->720 sweeps two full turns).
    const lerp = cyclical ? (a: number, b: number, t: number) => lerpAngle(a, b, t, traversal) : (a: number, b: number, t: number) => a + (b - a) * t;

    const value = IterationPrefab.sampleStopsWith(active, position, lerp);
    return { kind: "angle", data: `${value}` };
};

// Supersocket override: connecting the whole array clears the now-hidden element family,
// then hands off to the engine (a no-op for this var-free def, kept for uniform wiring).
const onConnect = (node: NodeDefinitions.BuiltNodeOf<"angleIterator2", AngleIterator2Definition>, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
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

export const AngleIterator2NodeType: NodeTypes.Type<"angleIterator2", AngleIterator2Definition> = {
    type: "angleIterator2",
    displayName: "Angle Iterator",
    defaultLabel: "Angle Iterator",
    iconNode: <NodeIcon shape={NODE_ICONS.angle} modifierIcon={NODE_ICONS.loop} />,
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
