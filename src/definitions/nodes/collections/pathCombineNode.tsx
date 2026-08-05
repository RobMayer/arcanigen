import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS, ICONS, Icon } from "../../../components/Icon";
import { Enum } from "../../datatypes/enum";
import { DragEvent, ReactNode, useCallback, useRef, useState } from "react";
import styled from "styled-components";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { Dropdown } from "../../../components/inputs/Dropdown";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { ArcaneGraph } from "../../../util/structs/arcaneGraph";
import { PaperHelper } from "../../../util/paperHelper";

export type PathCombineDefinition = {
    inputs: {
        pathOps: DataTypes.Use<"array<pathOp>">;
        [pathSocket: `path_${string}`]: DataTypes.Use<"path" | "pathOp">;
    };
    outputs: {
        output: DataTypes.Use<"path">;
        pathOpArray: DataTypes.Use<"array<pathOp>">;
        operationCount: DataTypes.Use<"integer">;
        enabledCount: DataTypes.Use<"integer">;
    };
    payload: {
        label: string;
        paths: { socket: string; enabled: boolean; op: number }[];
    };
};

const OP_OPTIONS = Enum.options(Enum.Common.pathOp);

// Enum value (index) -> PaperHelper op kind. Order must match Enum.Common.pathOp.
const OP_KINDS: PaperHelper.PathOpKind[] = ["unify", "intersect", "exclude", "subtract", "inverseSubtract", "divide", "inverseDivide"];

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<PathCombineDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"pathCombine", PathCombineDefinition> => {
    const socketId: `path_${string}` = `path_${nanoid()}`;
    return {
        id,
        in: {
            pathOps: null,
            [socketId]: null,
        },
        out: {
            output: [],
            pathOpArray: [],
            operationCount: [],
            enabledCount: [],
        },
        payload: {
            label: "",
            paths: input.paths ?? [{ socket: socketId, enabled: true, op: Enum.Common.pathOp.UNIFY.value }],
        },
        type: "pathCombine",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PathCombineDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const { alterNode, removeLinks } = Project.useMethods();

    const handlePathUpdate = useCallback(
        (socket: string, update: Partial<{ enabled: boolean; op: number }>) => {
            methods.update<NodeDefinitions.PayloadTypeOf<PathCombineDefinition>>({
                paths: node.payload.paths.map((p) => (p.socket === socket ? { ...p, ...update } : p)),
            });
        },
        [methods, node.payload.paths],
    );

    const handleAddPath = useCallback(() => {
        const socketId: `path_${string}` = `path_${nanoid()}`;
        alterNode(node.id, (n) => ({
            ...n,
            in: { ...n.in, [socketId]: null },
            payload: {
                ...n.payload,
                paths: [...(n.payload as PathCombineDefinition["payload"]).paths, { socket: socketId, enabled: true, op: Enum.Common.pathOp.UNIFY.value }],
            },
        }));
    }, [alterNode, node.id]);

    const handleRemovePath = useCallback(
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
                        paths: (n.payload as PathCombineDefinition["payload"]).paths.filter((p) => p.socket !== socket),
                    },
                };
            });
        },
        [alterNode, removeLinks, node.id, node.in],
    );

    const handleReorderPath = useCallback(
        (socketId: string, toIndex: number) => {
            methods.update<NodeDefinitions.PayloadTypeOf<PathCombineDefinition>>({
                paths: (() => {
                    const paths = [...node.payload.paths];
                    const fromIndex = paths.findIndex((p) => p.socket === socketId);
                    if (fromIndex === -1 || fromIndex === toIndex) return paths;
                    const [entry] = paths.splice(fromIndex, 1);
                    paths.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, entry);
                    return paths;
                })(),
            });
        },
        [methods, node.payload.paths],
    );

    // The first enabled row seeds the accumulator, so its operation is meaningless — gray it out.
    const seedIndex = node.payload.paths.findIndex((p) => p.enabled);
    const supersocketConnected = node.in.pathOps !== null;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"pathOps"}>
                Path Ops
            </SocketIn>
            {supersocketConnected ? null : (
                <>
                    <hr />
                    <ActionButton onClick={handleAddPath} flavour={"accent"}>
                        Add Path
                    </ActionButton>
                    {node.payload.paths.map((entry, idx) => (
                        <PathEntry
                            entry={entry}
                            node={node}
                            key={entry.socket}
                            index={idx}
                            isSeed={idx === seedIndex}
                            handleRemovePath={handleRemovePath}
                            handlePathUpdate={handlePathUpdate}
                            handleReorderPath={handleReorderPath}
                        />
                    ))}
                </>
            )}
            <hr />
            <NodeAccordion label="Additional Options" nodeId={node.id} socketsOut="pathOpArray|operationCount|enabledCount">
                <SocketOut node={node} socketId={"pathOpArray"}>
                    Path Op Array
                </SocketOut>
                <SocketOut node={node} socketId={"operationCount"}>
                    Operation Count
                </SocketOut>
                <SocketOut node={node} socketId={"enabledCount"}>
                    Enabled Count
                </SocketOut>
            </NodeAccordion>
        </TypicalNode>
    );
};

const PATH_MIME = "application/x-pathcombine-socket";

const PathEntry = ({
    entry,
    node,
    index,
    isSeed,
    handlePathUpdate,
    handleRemovePath,
    handleReorderPath,
}: {
    entry: {
        socket: string;
        enabled: boolean;
        op: number;
    };
    node: NodeDefinitions.NodeFor<PathCombineDefinition>;
    index: number;
    isSeed: boolean;
    handleRemovePath: (socket: string) => void;
    handlePathUpdate: (
        socket: string,
        update: Partial<{
            enabled: boolean;
            op: number;
        }>,
    ) => void;
    handleReorderPath: (socketId: string, toIndex: number) => void;
}) => {
    const theLink = Project.useLink(node.in[entry.socket]);
    const [dropSide, setDropSide] = useState<"above" | "below" | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    // A connected pathOp carries its own op/enabled, so freeze the row's controls (mirrors Layers).
    const overridden = theLink?.type === "pathOp";

    const handleDragStart = useCallback(
        (e: DragEvent) => {
            e.dataTransfer.setDragImage(ref.current as Element, 0, 0);
            e.dataTransfer.setData(PATH_MIME, entry.socket);
            e.dataTransfer.effectAllowed = "move";
        },
        [entry.socket],
    );

    const handleDragOver = useCallback((e: DragEvent) => {
        if (!e.dataTransfer.types.includes(PATH_MIME)) return;
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
            const socketId = e.dataTransfer.getData(PATH_MIME);
            if (socketId) {
                e.preventDefault();
                handleReorderPath(socketId, dropSide === "below" ? index + 1 : index);
            }
            setDropSide(null);
        },
        [handleReorderPath, index, dropSide],
    );

    const handleDragEnd = useCallback(() => {
        setDropSide(null);
    }, []);

    return (
        <PathEntryWrapper ref={ref} data-state={dropSide ? `drop-${dropSide}` : undefined} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onDragEnd={handleDragEnd}>
            <SocketIn node={node} socketId={entry.socket as `path_${string}`}>
                <CheckBox checked={entry.enabled} onToggle={(enabled) => handlePathUpdate(entry.socket, { enabled })} disabled={overridden} />
                <Dropdown value={`${entry.op}`} onValue={(v) => handlePathUpdate(entry.socket, { op: Number(v) })} disabled={isSeed || overridden}>
                    {OP_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </Dropdown>
                <DragGrip draggable onDragStart={handleDragStart}>
                    <Icon shape={ICONS.Caret.Vertical} />
                </DragGrip>
                <ActionButton.Lite onClick={() => handleRemovePath(entry.socket)} flavour={"danger"}>
                    <Icon shape={ICONS.Close} />
                </ActionButton.Lite>
            </SocketIn>
        </PathEntryWrapper>
    );
};

const PathEntryWrapper = styled.div`
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

const onConnect = (node: NodeDefinitions.BuiltNodeOf<"pathCombine", PathCombineDefinition>, linkId: string, direction: "in" | "out", graphId: string, ctx: NodeTypes.MethodContext): void => {
    if (direction !== "in") return;

    // Only react when the supersocket itself is connected.
    const link = ctx.getLink(graphId, linkId);
    if (!link || link.toSocket !== "pathOps") return;

    // Clear all individual path_* links — the supersocket now drives the fold.
    const currentNode = ctx.getNode(graphId, node.id);
    if (!currentNode) return;
    const linkIdsToRemove: string[] = [];
    for (const [socketKey, socketLinkId] of Object.entries(currentNode.in)) {
        if (socketKey.startsWith("path_") && socketLinkId !== null) {
            linkIdsToRemove.push(socketLinkId);
        }
    }
    if (linkIdsToRemove.length === 0) return;
    ctx.removeLinks(graphId, ...linkIdsToRemove);
};

const dependsOn = (node: NodeDefinitions.NodeFor<PathCombineDefinition>, outSocket: keyof PathCombineDefinition["outputs"], _deps: AllDeps): (keyof PathCombineDefinition["inputs"])[] => {
    if (outSocket === "output" || outSocket === "pathOpArray") {
        return ["pathOps", ...(node.payload.paths.map((p) => p.socket) as `path_${string}`[])];
    }
    // Counts read the supersocket when connected, else the payload rows.
    return ["pathOps"];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PathCombineDefinition>, inSocket: keyof PathCombineDefinition["inputs"], _deps: AllDeps): (keyof PathCombineDefinition["outputs"])[] => {
    if (inSocket === "pathOps") {
        return ["output", "pathOpArray", "operationCount", "enabledCount"];
    }
    if (typeof inSocket === "string" && inSocket.startsWith("path_")) {
        return ["output", "pathOpArray"];
    }
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<PathCombineDefinition>, socket: keyof PathCombineDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "operationCount" || socket === "enabledCount") {
        const supersocketEval = context.resolve<"array<pathOp>">(node.id, "pathOps");
        const enabled = supersocketEval ? supersocketEval.data.filter((e) => e.enabled ?? true).length : node.payload.paths.filter((p) => p.enabled).length;
        // Every enabled entry past the seed applies one op, so operations = enabled − 1 (floored at 0).
        return {
            kind: "integer",
            data: `${socket === "enabledCount" ? enabled : Math.max(0, enabled - 1)}`,
        };
    }

    if (socket === "pathOpArray") {
        const supersocketEval = context.resolve<"array<pathOp>">(node.id, "pathOps");
        if (supersocketEval) {
            return { kind: "array<pathOp>", data: supersocketEval.data };
        }
        const pathOpData: { path: DataTypes.TypeOf<DataTypes.Use<"path">> | null; enabled: boolean | null; op: number | null }[] = [];
        for (const row of node.payload.paths) {
            const resolved = context.resolve<"pathOp">(node.id, row.socket) as DataTypes.AnyEval | null;
            if (resolved && resolved.kind === "pathOp") {
                pathOpData.push({ path: resolved.data.path, enabled: resolved.data.enabled ?? row.enabled, op: resolved.data.op ?? row.op });
            } else if (resolved && resolved.kind === "path") {
                pathOpData.push({ path: resolved.data, enabled: row.enabled, op: row.op });
            } else {
                pathOpData.push({ path: null, enabled: row.enabled, op: row.op });
            }
        }
        return { kind: "array<pathOp>", data: pathOpData };
    }

    if (socket !== "output") return null;

    const entries: { op: PaperHelper.PathOpKind; path: DataTypes.TypeOf<DataTypes.Use<"path">> | null }[] = [];

    // Supersocket path: fold the provided array<pathOp> directly.
    const supersocketEval = context.resolve<"array<pathOp>">(node.id, "pathOps");
    if (supersocketEval) {
        for (const entry of supersocketEval.data) {
            if (!(entry.enabled ?? true)) continue;
            entries.push({ op: OP_KINDS[entry.op ?? 0] ?? "unify", path: entry.path });
        }
    } else {
        // Individual rows: each socket may carry a bare path or a composed pathOp (which overrides op/enabled).
        for (const row of node.payload.paths) {
            const resolved = context.resolve<"pathOp">(node.id, row.socket) as DataTypes.AnyEval | null;

            let path: DataTypes.TypeOf<DataTypes.Use<"path">> | null;
            let enabled: boolean;
            let op: number;
            if (resolved && resolved.kind === "pathOp") {
                path = resolved.data.path;
                enabled = resolved.data.enabled ?? row.enabled;
                op = resolved.data.op ?? row.op;
            } else if (resolved && resolved.kind === "path") {
                path = resolved.data;
                enabled = row.enabled;
                op = row.op;
            } else {
                // unconnected — a null path is still a meaningful fold operand (passthrough)
                path = null;
                enabled = row.enabled;
                op = row.op;
            }

            if (!enabled) continue;
            entries.push({ op: OP_KINDS[op] ?? "unify", path });
        }
    }

    if (entries.length === 0) return null;
    return PaperHelper.combine(entries);
};

const getSocketType = (_node: NodeDefinitions.NodeFor<PathCombineDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    if (side === "out") {
        if (socketId === "operationCount" || socketId === "enabledCount") {
            return { types: ["integer"], mode: "and" };
        }
        if (socketId === "pathOpArray") {
            return { types: ["array<pathOp>"], mode: "and" };
        }
        return { types: ["path"], mode: "and" };
    }
    if (socketId === "pathOps") {
        return { types: ["array<pathOp>"], mode: "or" };
    }
    return { types: ["path", "pathOp"], mode: "or" };
};

const canInterject = (link: ArcaneGraph.Link, graphId: string, ctx: NodeTypes.MethodContext): boolean => {
    const fromNode = ctx.getNode(graphId, link.fromNode);
    const toNode = ctx.getNode(graphId, link.toNode);
    if (!fromNode || !toNode) return false;

    const sourceOut = NodeTypes.getSocketType(fromNode, link.fromSocket, "out", ctx);
    const destIn = NodeTypes.getSocketType(toNode, link.toSocket, "in", ctx);
    const pathIn: SocketTypes.SocketRule = { types: ["path"], mode: "or" };
    const pathOut: SocketTypes.SocketRule = { types: ["path"], mode: "and" };

    return SocketTypes.canFlow(sourceOut, pathIn) && SocketTypes.canFlow(pathOut, destIn);
};

const onInterject = (node: NodeDefinitions.BuiltNodeOf<"pathCombine", PathCombineDefinition>, link: ArcaneGraph.Link, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const firstSocket = node.payload.paths[0]?.socket;
    if (!firstSocket) return;

    ctx.removeLinks(graphId, link.id);
    ctx.connect(graphId, link.fromNode, node.id, link.fromSocket, firstSocket, link.type);
    ctx.connect(graphId, node.id, link.toNode, "output", link.toSocket, "path");
};

export const PathCombineNodeType: NodeTypes.Type<"pathCombine", PathCombineDefinition> = {
    type: "pathCombine",
    displayName: "Path Combine",
    defaultLabel: "Path Combine",
    iconNode: <NodeIcon shape={NODE_ICONS.combine} />,
    category: "Collections",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    onConnect,
    canInterject,
    onInterject,
    getSocketType,
};
