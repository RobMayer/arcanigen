import { nanoid } from "nanoid";
import { NODE_ICONS, Icon, ICONS } from "../../../components/Icon";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { NumericString } from "../../datatypes/numericString";
import { EmptyOr } from "../../../util/misc";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { Color } from "../../datatypes/color";
import { ColorHexInput } from "../../../components/inputs/ColorHexInput";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { Dropdown } from "../../../components/inputs/Dropdown";
import { interpolateColor } from "../../../util/colorSpaces";
import styled from "styled-components";

const COLOR_SPACE_OPTIONS = Enum.options(Enum.Common.colorSpace);
const ANGLE_TRAVERSAL_OPTIONS = Enum.options(Enum.Common.angleTraversal);
const MODE_OPTIONS = Enum.options(Enum.Common.sequencerMode);

// Color spaces that have a hue component
const HUE_SPACES: Set<number> = new Set([
    Enum.Common.colorSpace.HSV.value,
    Enum.Common.colorSpace.HSL.value,
    Enum.Common.colorSpace.HWK.value,
    Enum.Common.colorSpace.HSI.value,
    Enum.Common.colorSpace.HCY.value,
    Enum.Common.colorSpace.OKLCH.value,
]);

export type ColorIteratorDefinition = {
    inputs: {
        sequence: DataTypes.Use<"sequence">;
        colorSpace: DataTypes.Use<"enum">;
        angleTraversal: DataTypes.Use<"enum">;
        mode: DataTypes.Use<"enum">;
        reverseSequence: DataTypes.Use<"boolean">;
        startOffset: DataTypes.Use<"integer">;
        endOffset: DataTypes.Use<"integer">;
        [color: `color_${string}`]: DataTypes.Use<"color">;
        [pos: `pos_${string}`]: DataTypes.Use<"float">;
    };
    outputs: {
        output: DataTypes.Use<"color">;
    };
    payload: {
        label: string;
        colorSpace: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        angleTraversal: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        mode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        reverseSequence: boolean;
        startOffset: EmptyOr<NumericString.Type>;
        endOffset: EmptyOr<NumericString.Type>;
        stops: { id: string; color: Color.Type; position: EmptyOr<NumericString.Type> }[];
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<ColorIteratorDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"colorIterator", ColorIteratorDefinition> => {
    const s0 = nanoid();
    const s1 = nanoid();
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
            [`color_${s0}`]: null,
            [`pos_${s0}`]: null,
            [`color_${s1}`]: null,
            [`pos_${s1}`]: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            colorSpace: input.colorSpace ?? Enum.Common.colorSpace.RGB.value,
            angleTraversal: input.angleTraversal ?? Enum.Common.angleTraversal.CLOSEST_CW.value,
            mode: input.mode ?? Enum.Common.sequencerMode.CLAMP.value,
            reverseSequence: input.reverseSequence ?? false,
            startOffset: input.startOffset ?? "0",
            endOffset: input.endOffset ?? "0",
            stops: [
                { id: s0, color: { r: 0, g: 0, b: 0, a: 1 }, position: "0" },
                { id: s1, color: { r: 1, g: 1, b: 1, a: 1 }, position: "100" },
            ],
        },
        type: "colorIterator",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ColorIteratorDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const { alterNode, removeLinks } = Project.useMethods();

    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ColorIteratorDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const handleAddStop = useCallback(() => {
        const stopId = nanoid();
        alterNode(node.id, (n) => ({
            ...n,
            in: { ...n.in, [`color_${stopId}`]: null, [`pos_${stopId}`]: null },
            payload: {
                ...n.payload,
                stops: [...(n.payload as ColorIteratorDefinition["payload"]).stops, { id: stopId, color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, position: "50" }],
            },
        }));
    }, [alterNode, node.id]);

    const handleRemoveStop = useCallback(
        (stopId: string) => {
            const colorLinkId = node.in[`color_${stopId}`];
            const posLinkId = node.in[`pos_${stopId}`];
            const linksToRemove = [colorLinkId, posLinkId].filter((id): id is string => id !== null);
            if (linksToRemove.length > 0) {
                removeLinks(...linksToRemove);
            }
            alterNode(node.id, (n) => {
                const { [`color_${stopId}`]: _c, [`pos_${stopId}`]: _p, ...restIn } = n.in;
                return {
                    ...n,
                    in: restIn,
                    payload: {
                        ...n.payload,
                        stops: (n.payload as ColorIteratorDefinition["payload"]).stops.filter((s) => s.id !== stopId),
                    },
                };
            });
        },
        [alterNode, removeLinks, node.id, node.in],
    );

    const handleStopColor = useCallback(
        (stopId: string, color: Color.Type) => {
            handleUpdate({
                stops: node.payload.stops.map((s) => (s.id === stopId ? { ...s, color } : s)),
            });
        },
        [handleUpdate, node.payload.stops],
    );

    const handleStopPosition = useCallback(
        (stopId: string, position: EmptyOr<NumericString.Type>) => {
            handleUpdate({
                stops: node.payload.stops.map((s) => (s.id === stopId ? { ...s, position } : s)),
            });
        },
        [handleUpdate, node.payload.stops],
    );

    const hueRelevant = HUE_SPACES.has(node.payload.colorSpace) && node.in.colorSpace === null;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"color"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"sequence"} type={"sequence"}>
                Sequence
            </SocketIn>

            <hr />
            <ActionButton onClick={handleAddStop} flavour={"accent"}>
                Add Stop
            </ActionButton>
            {node.payload.stops.map((stop, idx) => (
                <StopEntry key={stop.id}>
                    <SocketIn node={node} socketId={`color_${stop.id}`} type={"color"} label={`Stop ${idx}`} data-part="color">
                        <ColorHexInput value={stop.color} onCommit={(color) => handleStopColor(stop.id, color)} disabled={node.in[`color_${stop.id}`] !== null} alpha nullable />
                    </SocketIn>
                    <SocketIn node={node} socketId={`pos_${stop.id}`} type={"float"} data-part="position">
                        <DecimalInput value={stop.position} onCommit={(position) => handleStopPosition(stop.id, position)} disabled={node.in[`pos_${stop.id}`] !== null} min={"0"} max={"100"} />
                    </SocketIn>
                    <ActionButton.Lite onClick={() => handleRemoveStop(stop.id)} flavour={"danger"} data-part="remove">
                        <Icon shape={ICONS.Close} />
                    </ActionButton.Lite>
                </StopEntry>
            ))}
            <NodeAccordion label={"Options"} nodeId={node.id} socketsIn="colorSpace|angleTraversal|mode|reverseSequence|startOffset|endOffset">
                <SocketIn node={node} socketId={"colorSpace"} type={"enum"} label={"Color Space"}>
                    <Dropdown value={`${node.payload.colorSpace}`} onValue={(v) => handleUpdate({ colorSpace: Number(v) })} disabled={node.in.colorSpace !== null}>
                        {COLOR_SPACE_OPTIONS.map((each) => (
                            <option value={each.value} key={each.value}>
                                {each.label}
                            </option>
                        ))}
                    </Dropdown>
                </SocketIn>
                <SocketIn node={node} socketId={"angleTraversal"} type={"enum"} label={"Hue Traversal"}>
                    <Dropdown value={`${node.payload.angleTraversal}`} onValue={(v) => handleUpdate({ angleTraversal: Number(v) })} disabled={node.in.angleTraversal !== null || !hueRelevant}>
                        {ANGLE_TRAVERSAL_OPTIONS.map((each) => (
                            <option value={each.value} key={each.value}>
                                {each.label}
                            </option>
                        ))}
                    </Dropdown>
                </SocketIn>
                <SocketIn node={node} socketId={"mode"} type={"enum"} label={"Mode"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.mode}`}
                        onValue={(v) => handleUpdate({ mode: Number(v) })}
                        disabled={node.in.mode !== null}
                        options={MODE_OPTIONS}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"reverseSequence"} type={"boolean"}>
                    <CheckBox checked={node.payload.reverseSequence} onToggle={(reverseSequence) => handleUpdate({ reverseSequence })} disabled={node.in.reverseSequence !== null}>
                        Reverse Sequence
                    </CheckBox>
                </SocketIn>
                <SocketIn node={node} socketId={"startOffset"} type={"integer"} label={"Start Offset"}>
                    <IntegerInput value={node.payload.startOffset} onCommit={(startOffset) => handleUpdate({ startOffset })} disabled={node.in.startOffset !== null} />
                </SocketIn>
                <SocketIn node={node} socketId={"endOffset"} type={"integer"} label={"End Offset"}>
                    <IntegerInput value={node.payload.endOffset} onCommit={(endOffset) => handleUpdate({ endOffset })} disabled={node.in.endOffset !== null} />
                </SocketIn>
            </NodeAccordion>
        </TypicalNode>
    );
};

const StopEntry = styled.div`
    display: grid;
    gap: 0px 4px;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    grid-template-areas:
        "color remove"
        "position remove";
    align-items: center;
    & > [data-part="color"] {
        grid-area: color;
    }
    & > [data-part="position"] {
        grid-area: position;
    }
    & > [data-part="remove"] {
        grid-area: remove;
    }
`;

const dependsOn = (node: NodeDefinitions.NodeFor<ColorIteratorDefinition>, outSocket: keyof ColorIteratorDefinition["outputs"], _deps: AllDeps): (keyof ColorIteratorDefinition["inputs"])[] => {
    if (outSocket === "output") {
        const stopSockets = node.payload.stops.flatMap((s) => [`color_${s.id}`, `pos_${s.id}`]) as (keyof ColorIteratorDefinition["inputs"])[];
        return ["sequence", "colorSpace", "angleTraversal", "mode", "reverseSequence", "startOffset", "endOffset", ...stopSockets];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ColorIteratorDefinition>, _inSocket: keyof ColorIteratorDefinition["inputs"], _deps: AllDeps): (keyof ColorIteratorDefinition["outputs"])[] => {
    return ["output"];
};

const sampleGradient = (resolved: { color: NonNullable<Color.Type>; position: number }[], position: number, colorSpaceValue: number, angleTraversalValue: number): DataTypes.AnyEval | null => {
    // Single stop — just return it
    if (resolved.length === 1) {
        return { kind: "color", data: resolved[0].color };
    }

    // Clamp to range
    if (position <= resolved[0].position) {
        return { kind: "color", data: resolved[0].color };
    }
    if (position >= resolved[resolved.length - 1].position) {
        return { kind: "color", data: resolved[resolved.length - 1].color };
    }

    // Find bracketing stops
    let lo = 0;
    for (let i = 1; i < resolved.length; i++) {
        if (resolved[i].position >= position) {
            lo = i - 1;
            break;
        }
    }
    const hi = lo + 1;

    const range = resolved[hi].position - resolved[lo].position;
    const localT = range === 0 ? 0 : (position - resolved[lo].position) / range;

    const result = interpolateColor(resolved[lo].color, resolved[hi].color, localT, colorSpaceValue, angleTraversalValue);

    return { kind: "color", data: result };
};

const evaluate = (node: NodeDefinitions.NodeFor<ColorIteratorDefinition>, socket: keyof ColorIteratorDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const sequenceEval = context.resolve<"sequence">(node.id, "sequence");
    if (!sequenceEval) return null;

    const { senderId, count } = sequenceEval.data;
    if (count <= 0) return null;

    const stops = node.payload.stops;
    if (stops.length === 0) return null;

    // Resolve sequence manipulation parameters
    const reverseSequence = context.resolve<"boolean">(node.id, "reverseSequence")?.data ?? node.payload.reverseSequence;
    const startOffsetStr = context.resolve<"integer">(node.id, "startOffset")?.data ?? node.payload.startOffset;
    const endOffsetStr = context.resolve<"integer">(node.id, "endOffset")?.data ?? node.payload.endOffset;
    const startOffset = startOffsetStr === "" ? 0 : parseInt(startOffsetStr as string, 10) || 0;
    const endOffset = endOffsetStr === "" ? 0 : parseInt(endOffsetStr as string, 10) || 0;
    const modeEnum = context.resolve<"enum">(node.id, "mode")?.data ?? node.payload.mode;
    const modeKey = Enum.keyOf(Enum.Common.sequencerMode, modeEnum);

    let iter = context.sequenceData[senderId] ?? 0;

    // Step 1: Reverse sequence
    if (reverseSequence) {
        iter = count - 1 - iter;
    }

    // Step 2: Compute effective range
    const effectiveStart = startOffset;
    const effectiveEnd = count - 1 + endOffset;
    const effectiveCount = effectiveEnd - effectiveStart + 1;
    if (effectiveCount <= 0) return null;

    // Step 3: Map iter to position within effective range, applying mode for out-of-range
    let effectiveIdx = iter - effectiveStart;
    if (effectiveIdx < 0 || effectiveIdx >= effectiveCount) {
        switch (modeKey) {
            case "CLAMP":
                effectiveIdx = Math.max(0, Math.min(effectiveIdx, effectiveCount - 1));
                break;
            case "WRAP":
                effectiveIdx = ((effectiveIdx % effectiveCount) + effectiveCount) % effectiveCount;
                break;
            case "BOUNCE": {
                const cycle = effectiveCount > 1 ? 2 * (effectiveCount - 1) : 1;
                const pos = ((effectiveIdx % cycle) + cycle) % cycle;
                effectiveIdx = pos < effectiveCount ? pos : cycle - pos;
                break;
            }
            case "TRUNCATE":
                return null;
            default:
                effectiveIdx = Math.max(0, Math.min(effectiveIdx, effectiveCount - 1));
        }
    }

    // Step 4: Compute t (0..1) → position (0..100)
    const t = effectiveCount <= 1 ? 0 : effectiveIdx / (effectiveCount - 1);
    const position = t * 100;

    // Resolve color space and hue traversal
    const colorSpaceValue = Enum.resolve(context.resolve<"enum">(node.id, "colorSpace")?.data, Enum.Common.colorSpace) ?? node.payload.colorSpace ?? 0;
    const angleTraversalValue = Enum.resolve(context.resolve<"enum">(node.id, "angleTraversal")?.data, Enum.Common.angleTraversal) ?? node.payload.angleTraversal ?? 0;

    // Resolve all stops: color + position
    const resolved: { color: NonNullable<Color.Type>; position: number }[] = [];
    for (const stop of stops) {
        const color = context.resolve<"color">(node.id, `color_${stop.id}`)?.data ?? stop.color;
        if (color === null) continue;
        const posStr = context.resolve<"float">(node.id, `pos_${stop.id}`)?.data ?? stop.position;
        const pos = NumericString.Emptyable.asNumber(posStr) ?? 0;
        resolved.push({ color, position: pos });
    }

    if (resolved.length === 0) return null;

    // Sort by position
    resolved.sort((a, b) => a.position - b.position);

    return sampleGradient(resolved, position, colorSpaceValue, angleTraversalValue);
};

const SOCKETTYPES_IN: {
    [key in keyof Required<Pick<ColorIteratorDefinition["inputs"], "sequence" | "colorSpace" | "angleTraversal" | "mode" | "reverseSequence" | "startOffset" | "endOffset">>]: SocketTypes.SocketRule;
} = {
    sequence: { types: ["sequence"], mode: "and" },
    colorSpace: { types: ["enum"], mode: "and" },
    angleTraversal: { types: ["enum"], mode: "and" },
    mode: { types: ["enum"], mode: "and" },
    reverseSequence: { types: ["boolean"], mode: "and" },
    startOffset: { types: ["integer"], mode: "and" },
    endOffset: { types: ["integer"], mode: "and" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<ColorIteratorDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["color"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<ColorIteratorDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    if (side === "out") {
        return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
    if (socketId.startsWith("color_")) {
        return { types: ["color"], mode: "and" };
    }
    if (socketId.startsWith("pos_")) {
        return { types: ["float"], mode: "and" };
    }
    return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
};

export const ColorIteratorNodeType: NodeTypes.Type<"colorIterator", ColorIteratorDefinition> = {
    type: "colorIterator",
    displayName: "Color Iterator",
    defaultLabel: "Color Iterator",
    iconNode: <Icon shape={NODE_ICONS.colorValue.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.colorValue.Card} color={"var(--icon-flavour)"} />,
    category: "Collections",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
