import { nanoid } from "nanoid";
import { Icon, ICONS, NODE_ICONS, NodeIcon } from "../../../components/Icon";
import { DragEvent, ReactNode, useCallback, useRef, useState } from "react";
import styled from "styled-components";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut, SocketPair } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Angle } from "../../datatypes/angle";
import { Enum } from "../../datatypes/enum";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { LoopButton } from "../../../components/buttons/LoopButton";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { EmptyOr } from "../../../util/misc";
import { PointHelper } from "../../helpers/pointHelper";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

type PointEntryData = { socket: string; mode: number; x: EmptyOr<Length.Type>; y: EmptyOr<Length.Type>; radius: EmptyOr<Length.Type>; theta: EmptyOr<Angle.Type> };

const def = signature({
    in: { points: $.arrayOf("point"), "point_*": "point" },
    out: { output: $.arrayOf("point"), pointCount: "integer" },
});

export type PointArrayDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        points: PointEntryData[];
    }
>;

const newEntry = (socket: `point_${string}`, mode: number, x: EmptyOr<Length.Type>, y: EmptyOr<Length.Type>): PointEntryData => ({ socket, mode, x, y, radius: "100px", theta: "0deg" });

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<PointArrayDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"pointArray", PointArrayDefinition> => {
    const s0: `point_${string}` = `point_${nanoid()}`;
    const s1: `point_${string}` = `point_${nanoid()}`;
    return {
        id,
        in: {
            points: null,
            [s0]: null,
            [s1]: null,
        },
        out: {
            output: [],
            pointCount: [],
        },
        payload: {
            label: "",
            points: input.points ?? [newEntry(s0, Enum.Common.positionMode.CARTESIAN.value, "0px", "0px"), newEntry(s1, Enum.Common.positionMode.CARTESIAN.value, "100px", "0px")],
        },
        type: "pointArray",
    };
};

const MODE_OPTIONS = [
    { value: `${Enum.Common.positionMode.CARTESIAN.value}`, label: <Icon shape={ICONS.Coordinates.Cartesian} /> },
    { value: `${Enum.Common.positionMode.POLAR.value}`, label: <Icon shape={ICONS.Coordinates.Polar} /> },
];

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PointArrayDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const { alterNode, removeLinks } = Project.useMethods();

    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PointArrayDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const handleAddPoint = useCallback(() => {
        const entry = newEntry(`point_${nanoid()}`, Enum.Common.positionMode.CARTESIAN.value, "0px", "0px");
        alterNode(node.id, (n) => ({
            ...n,
            in: { ...n.in, [entry.socket]: null },
            payload: {
                ...n.payload,
                points: [...(n.payload as PointArrayDefinition["payload"]).points, entry],
            },
        }));
    }, [alterNode, node.id]);

    const handleRemovePoint = useCallback(
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
                        points: (n.payload as PointArrayDefinition["payload"]).points.filter((p) => p.socket !== socket),
                    },
                };
            });
        },
        [alterNode, removeLinks, node.id, node.in],
    );

    const handlePointUpdate = useCallback(
        (socket: string, update: Partial<PointEntryData>) => {
            handleUpdate({
                points: node.payload.points.map((p) => (p.socket === socket ? { ...p, ...update } : p)),
            });
        },
        [handleUpdate, node.payload.points],
    );

    const handleReorderPoint = useCallback(
        (socket: string, toIndex: number) => {
            handleUpdate({
                points: (() => {
                    const points = [...node.payload.points];
                    const fromIndex = points.findIndex((p) => p.socket === socket);
                    if (fromIndex === -1 || fromIndex === toIndex) return points;
                    const [entry] = points.splice(fromIndex, 1);
                    points.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, entry);
                    return points;
                })(),
            });
        },
        [handleUpdate, node.payload.points],
    );

    const supersocketConnected = node.in.points !== null;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketPair node={node} socketInId={"points"} socketOutId={"output"}>
                <span>Input</span>
                <span>Output</span>
            </SocketPair>
            {supersocketConnected ? null : (
                <>
                    <ActionButton onClick={handleAddPoint} flavour={"accent"}>
                        Add Point
                    </ActionButton>
                    {node.payload.points.map((entry, idx) => (
                        <PointEntry
                            key={entry.socket}
                            entry={entry}
                            node={node}
                            index={idx}
                            handlePointUpdate={handlePointUpdate}
                            handleRemovePoint={handleRemovePoint}
                            handleReorderPoint={handleReorderPoint}
                        />
                    ))}
                </>
            )}
            <NodeAccordion label="Additional Options" nodeId={node.id} socketsOut="pointCount">
                <SocketOut node={node} socketId={"pointCount"}>
                    Point Count
                </SocketOut>
            </NodeAccordion>
        </TypicalNode>
    );
};

const POINT_MIME = "application/x-point-socket";

const PointEntry = ({
    entry,
    node,
    index,
    handlePointUpdate,
    handleRemovePoint,
    handleReorderPoint,
}: {
    entry: PointEntryData;
    node: NodeDefinitions.NodeFor<PointArrayDefinition>;
    index: number;
    handlePointUpdate: (socket: string, update: Partial<PointEntryData>) => void;
    handleRemovePoint: (socket: string) => void;
    handleReorderPoint: (socket: string, toIndex: number) => void;
}) => {
    const [dropSide, setDropSide] = useState<"above" | "below" | null>(null);
    const ref = useRef<HTMLDivElement>(null);
    const connected = node.in[entry.socket] !== null;
    const isPolar = entry.mode === Enum.Common.positionMode.POLAR.value;

    const handleDragStart = useCallback(
        (e: DragEvent) => {
            e.dataTransfer.setDragImage(ref.current as Element, 0, 0);
            e.dataTransfer.setData(POINT_MIME, entry.socket);
            e.dataTransfer.effectAllowed = "move";
        },
        [entry.socket],
    );

    const handleDragOver = useCallback((e: DragEvent) => {
        if (!e.dataTransfer.types.includes(POINT_MIME)) return;
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
            const socket = e.dataTransfer.getData(POINT_MIME);
            if (socket) {
                e.preventDefault();
                handleReorderPoint(socket, dropSide === "below" ? index + 1 : index);
            }
            setDropSide(null);
        },
        [handleReorderPoint, index, dropSide],
    );

    const handleDragEnd = useCallback(() => setDropSide(null), []);

    return (
        <PointEntryWrapper ref={ref} data-state={dropSide ? `drop-${dropSide}` : undefined} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onDragEnd={handleDragEnd}>
            <SocketIn node={node} socketId={entry.socket as `point_${string}`}>
                <PointRow>
                    <LoopButton.Lite value={`${entry.mode}`} options={MODE_OPTIONS} onValue={(v) => handlePointUpdate(entry.socket, { mode: Number(v) })} disabled={connected} />
                    {isPolar ? (
                        <>
                            <LengthInput className={"pointField"} value={entry.radius} onCommit={(radius) => handlePointUpdate(entry.socket, { radius })} disabled={connected} required />
                            <AngleInput className={"pointField"} value={entry.theta} onCommit={(theta) => handlePointUpdate(entry.socket, { theta })} disabled={connected} />
                        </>
                    ) : (
                        <>
                            <LengthInput className={"pointField"} value={entry.x} onCommit={(x) => handlePointUpdate(entry.socket, { x })} disabled={connected} required />
                            <LengthInput className={"pointField"} value={entry.y} onCommit={(y) => handlePointUpdate(entry.socket, { y })} disabled={connected} required />
                        </>
                    )}
                    <DragGrip draggable onDragStart={handleDragStart}>
                        <Icon shape={ICONS.Caret.Vertical} />
                    </DragGrip>
                    <ActionButton.Lite onClick={() => handleRemovePoint(entry.socket)} flavour={"danger"}>
                        <Icon shape={ICONS.Close} />
                    </ActionButton.Lite>
                </PointRow>
            </SocketIn>
        </PointEntryWrapper>
    );
};

const PointRow = styled.div`
    display: flex;
    align-items: center;
    gap: 3px;
    width: 100%;

    & > .pointField {
        flex: 1 1 0;
        width: 0;
        min-width: 0;
    }
`;

const PointEntryWrapper = styled.div`
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

// Resolve the effective points: the supersocket (an array<point>) overrides everything; otherwise
// fold each per-point socket (a connected point) over its inline authoring fields.
const resolvePoints = (node: NodeDefinitions.NodeFor<PointArrayDefinition>, context: Resolver.Context): { x: number; y: number }[] => {
    const supersocketEval = context.resolve<DataTypes.ArrayOf<DataTypes.Point>>(node.id, "points");
    if (supersocketEval) {
        return supersocketEval.data.map((p) => ({ x: p.x, y: p.y }));
    }

    const resolved: { x: number; y: number }[] = [];
    for (const entry of node.payload.points) {
        const connected = context.resolve<DataTypes.Point>(node.id, entry.socket);
        if (connected) {
            resolved.push({ x: connected.data.x, y: connected.data.y });
        } else {
            resolved.push(PointHelper.resolve(entry.mode, entry.x, entry.y, entry.radius, entry.theta));
        }
    }
    return resolved;
};

const dependsOn = (node: NodeDefinitions.NodeFor<PointArrayDefinition>, outSocket: keyof PointArrayDefinition["outputs"], _deps: AllDeps): (keyof PointArrayDefinition["inputs"])[] => {
    const pointSockets = node.payload.points.map((p) => p.socket) as `point_${string}`[];
    if (outSocket === "output" || outSocket === "pointCount") {
        return ["points", ...pointSockets];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PointArrayDefinition>, _inSocket: keyof PointArrayDefinition["inputs"], _deps: AllDeps): (keyof PointArrayDefinition["outputs"])[] => {
    return ["output", "pointCount"];
};

const evaluate = (node: NodeDefinitions.NodeFor<PointArrayDefinition>, socket: keyof PointArrayDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "pointCount") {
        return { kind: "integer", data: `${resolvePoints(node, context).length}` };
    }
    if (socket === "output") {
        // Row order is meaningful here (unlike stops, which sort by position) — keep it as authored.
        return { kind: "array<point>", data: resolvePoints(node, context) };
    }
    return null;
};

// Supersocket override: connecting the whole `array<point>` clears the now-hidden element family,
// then hands off to the engine (a no-op for this var-free def, kept for uniform wiring).
const onConnect = (node: NodeDefinitions.BuiltNodeOf<"pointArray", PointArrayDefinition>, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    if (direction === "in") {
        const link = ctx.getLink(graphId, linkId);
        if (link && link.toSocket === "points") {
            const currentNode = ctx.getNode(graphId, node.id);
            if (currentNode) {
                const linkIdsToRemove: string[] = [];
                for (const [socketKey, socketLinkId] of Object.entries(currentNode.in)) {
                    if (socketKey.startsWith("point_") && socketLinkId !== null) {
                        linkIdsToRemove.push(socketLinkId);
                    }
                }
                if (linkIdsToRemove.length > 0) ctx.removeLinks(graphId, ...linkIdsToRemove);
            }
        }
    }
    SignatureEngine.onConnect(node, linkId, direction, graphId, ctx);
};

export const PointArrayNodeType: NodeTypes.Type<"pointArray", PointArrayDefinition> = {
    type: "pointArray",
    displayName: "Point Array",
    defaultLabel: "Point Array",
    iconNode: <NodeIcon shape={NODE_ICONS.point} modifierIcon={NODE_ICONS.modifiers.arrayOf} />,
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
