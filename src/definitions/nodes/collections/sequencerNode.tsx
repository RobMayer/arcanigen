import { nanoid } from "nanoid";
import { NODE_ICONS, Icon } from "../../../components/Icon";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { ICONS } from "../../../components/Icon";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { NumericString } from "../../datatypes/numericString";
import { EmptyOr } from "../../../util/misc";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";

export type SequencerDefinition = {
    inputs: {
        sequence: DataTypes.Use<"sequence">;
        mode: DataTypes.Use<"enum">;
        reverseSequence: DataTypes.Use<"boolean">;
        reverseSteps: DataTypes.Use<"boolean">;
        offset: DataTypes.Use<"integer">;
        [step: `step_${string}`]: DataTypes.Use<"shape">;
    };
    outputs: {
        output: DataTypes.Use<"shape">;
    };
    payload: {
        label: string;
        mode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        reverseSequence: boolean;
        reverseSteps: boolean;
        offset: EmptyOr<NumericString.Type>;
        steps: { socket: string }[];
    };
};

const SEQUENCER_MODE_OPTIONS = Enum.options(Enum.Common.sequencerMode);

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<SequencerDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"sequencer", SequencerDefinition> => {
    const s0: `step_${string}` = `step_${nanoid()}`;
    const s1: `step_${string}` = `step_${nanoid()}`;
    return {
        id,
        in: {
            sequence: null,
            mode: null,
            reverseSequence: null,
            reverseSteps: null,
            offset: null,
            [s0]: null,
            [s1]: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            mode: input.mode ?? Enum.Common.sequencerMode.WRAP.value,
            reverseSequence: input.reverseSequence ?? false,
            reverseSteps: input.reverseSteps ?? false,
            offset: input.offset ?? "0",
            steps: [{ socket: s0 }, { socket: s1 }],
        },
        type: "sequencer",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<SequencerDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const { alterNode, removeLinks } = Project.useMethods();

    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<SequencerDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const handleAddStep = useCallback(() => {
        const socketId: `step_${string}` = `step_${nanoid()}`;
        alterNode(node.id, (n) => ({
            ...n,
            in: { ...n.in, [socketId]: null },
            payload: {
                ...n.payload,
                steps: [...(n.payload as SequencerDefinition["payload"]).steps, { socket: socketId }],
            },
        }));
    }, [alterNode, node.id]);

    const handleRemoveStep = useCallback(
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
                        steps: (n.payload as SequencerDefinition["payload"]).steps.filter((s) => s.socket !== socket),
                    },
                };
            });
        },
        [alterNode, removeLinks, node.id, node.in],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"shape"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"sequence"} type={"sequence"}>
                Sequence
            </SocketIn>
            <SocketIn node={node} socketId={"mode"} type={"enum"} label={"Mode"}>
                <RadioButton.Group
                    orientation={"horizontal"}
                    value={`${node.payload.mode}`}
                    onValue={(v) => handleUpdate({ mode: Number(v) })}
                    disabled={node.in.mode !== null}
                    options={SEQUENCER_MODE_OPTIONS}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"reverseSequence"} type={"boolean"}>
                <CheckBox checked={node.payload.reverseSequence} onToggle={(reverseSequence) => handleUpdate({ reverseSequence })} disabled={node.in.reverseSequence !== null}>
                    Reverse Sequence
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"reverseSteps"} type={"boolean"}>
                <CheckBox checked={node.payload.reverseSteps} onToggle={(reverseSteps) => handleUpdate({ reverseSteps })} disabled={node.in.reverseSteps !== null}>
                    Reverse Steps
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"offset"} type={"integer"} label={"Offset"}>
                <IntegerInput value={node.payload.offset} onCommit={(offset) => handleUpdate({ offset })} disabled={node.in.offset !== null} />
            </SocketIn>
            <hr />
            <ActionButton onClick={handleAddStep} flavour={"accent"}>
                Add Step
            </ActionButton>
            {node.payload.steps.map((entry, idx) => (
                <SocketIn key={entry.socket} node={node} socketId={entry.socket as `step_${string}`} type={"shape"}>
                    Step {idx}
                    <ActionButton.Lite onClick={() => handleRemoveStep(entry.socket)} flavour={"danger"}>
                        <Icon shape={ICONS.Close} />
                    </ActionButton.Lite>
                </SocketIn>
            ))}
        </TypicalNode>
    );
};

const dependsOn = (node: NodeDefinitions.NodeFor<SequencerDefinition>, outSocket: keyof SequencerDefinition["outputs"], _deps: AllDeps): (keyof SequencerDefinition["inputs"])[] => {
    if (outSocket === "output") {
        return ["sequence", "mode", "reverseSequence", "reverseSteps", "offset", ...(node.payload.steps.map((s) => s.socket) as `step_${string}`[])];
    }
    return [];
};

const contributesTo = (node: NodeDefinitions.NodeFor<SequencerDefinition>, inSocket: keyof SequencerDefinition["inputs"], _deps: AllDeps): (keyof SequencerDefinition["outputs"])[] => {
    if (inSocket === "sequence" || inSocket === "mode" || inSocket === "reverseSequence" || inSocket === "reverseSteps" || inSocket === "offset") {
        return ["output"];
    }
    if (typeof inSocket === "string" && inSocket.startsWith("step_")) {
        return ["output"];
    }
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<SequencerDefinition>, socket: keyof SequencerDefinition["outputs"], context: Resolver.Context, iteration?: number): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const sequenceEval = context.resolve<"sequence">(node.id, "sequence");
    if (!sequenceEval) return null;

    const count = sequenceEval.data.count;
    if (count <= 0) return null;

    const socketCount = node.payload.steps.length;
    if (socketCount === 0) return null;

    const iter = iteration ?? 0;

    const reverseSequence = context.resolve<"boolean">(node.id, "reverseSequence")?.data ?? node.payload.reverseSequence;
    const reverseSteps = context.resolve<"boolean">(node.id, "reverseSteps")?.data ?? node.payload.reverseSteps;
    const offsetStr = context.resolve<"integer">(node.id, "offset")?.data ?? node.payload.offset;
    const offset = offsetStr === "" ? 0 : parseInt(offsetStr, 10) || 0;
    const modeEnum = context.resolve<"enum">(node.id, "mode")?.data ?? node.payload.mode;
    const modeKey = Enum.keyOf(Enum.Common.sequencerMode, modeEnum);

    // Pipeline step 1: Reverse Sequence
    let idx = reverseSequence ? count - 1 - iter : iter;

    // Pipeline step 2: Offset
    idx = (((idx - offset) % count) + count) % count;

    // Pipeline step 3: Mode maps idx (0..count-1) → stepIdx (0..socketCount-1)
    let stepIdx: number | null;
    switch (modeKey) {
        case "WRAP":
            stepIdx = idx % socketCount;
            break;
        case "CLAMP":
            stepIdx = Math.min(idx, socketCount - 1);
            break;
        case "TRUNCATE":
            stepIdx = idx < socketCount ? idx : null;
            break;
        case "BOUNCE": {
            // ping-pong: [0,1,2,1,0,1,2,...]
            const cycle = socketCount > 1 ? 2 * (socketCount - 1) : 1;
            const pos = idx % cycle;
            stepIdx = pos < socketCount ? pos : cycle - pos;
            break;
        }
        default:
            stepIdx = idx % socketCount;
    }

    if (stepIdx === null) return null;

    // Pipeline step 4: Reverse Steps
    if (reverseSteps) {
        stepIdx = socketCount - 1 - stepIdx;
    }

    // Pipeline step 5: Resolve the step socket at iteration 0
    const stepSocket = node.payload.steps[stepIdx]?.socket;
    if (!stepSocket) return null;

    return context.resolve<"shape">(node.id, stepSocket, 0);
};

const SOCKETTYPES_IN: { [key in keyof Required<SequencerDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    mode: { types: ["enum"], mode: "and" },
    reverseSequence: { types: ["boolean"], mode: "and" },
    reverseSteps: { types: ["boolean"], mode: "and" },
    offset: { types: ["integer"], mode: "and" },
    sequence: { types: ["sequence"], mode: "and" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<SequencerDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["shape"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<SequencerDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    if (side === "out") {
        return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
    if (socketId.startsWith("step_")) {
        return { types: ["shape"], mode: "and" };
    }
    return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
};

export const SequencerNodeType: NodeTypes.Type<"sequencer", SequencerDefinition> = {
    type: "sequencer",
    displayName: "Sequencer",
    defaultLabel: "Sequencer",
    iconNode: <Icon shape={NODE_ICONS.sequence.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.sequence.Card} color={"var(--icon-flavour)"} />,
    category: "Collections",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
