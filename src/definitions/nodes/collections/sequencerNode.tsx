import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS, Icon } from "../../../components/Icon";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { ActionButton } from "../../../components/buttons/ActionButton";
import { ICONS } from "../../../components/Icon";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { NumericString } from "../../datatypes/numericString";
import { EmptyOr } from "../../../util/misc";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    args: { S: $.each($.ANY) },
    in: ({ S }) => ({
        sequence: "sequence",
        mode: "enum",
        reverseSequence: "boolean",
        reverseSteps: "boolean",
        offset: "integer",
        "step_*": S,
    }),
    out: ({ S }) => ({ output: S }),
});

export type SequencerDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        mode: DataTypes.TypeOf<"enum">;
        reverseSequence: boolean;
        reverseSteps: boolean;
        offset: EmptyOr<NumericString.Type>;
        steps: { socket: string }[];
    }
>;

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
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"sequence"}>
                Sequence
            </SocketIn>
            <ActionButton onClick={handleAddStep} flavour={"accent"}>
                Add Step
            </ActionButton>
            {node.payload.steps.map((entry, idx) => (
                <SocketIn key={entry.socket} node={node} socketId={entry.socket as `step_${string}`}>
                    Step {idx}
                    <ActionButton.Lite onClick={() => handleRemoveStep(entry.socket)} flavour={"danger"}>
                        <Icon shape={ICONS.Close} />
                    </ActionButton.Lite>
                </SocketIn>
            ))}
            <NodeAccordion nodeId={node.id} label={"Options"} socketsIn="mode|reverseSequence|offset">
                <SocketIn node={node} socketId={"mode"} label={"Mode"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.mode}`}
                        onValue={(v) => handleUpdate({ mode: Number(v) })}
                        disabled={node.in.mode !== null}
                        options={SEQUENCER_MODE_OPTIONS}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"reverseSequence"}>
                    <CheckBox checked={node.payload.reverseSequence} onToggle={(reverseSequence) => handleUpdate({ reverseSequence })} disabled={node.in.reverseSequence !== null}>
                        Reverse Sequence
                    </CheckBox>
                </SocketIn>
                <SocketIn node={node} socketId={"reverseSteps"}>
                    <CheckBox checked={node.payload.reverseSteps} onToggle={(reverseSteps) => handleUpdate({ reverseSteps })} disabled={node.in.reverseSteps !== null}>
                        Reverse Steps
                    </CheckBox>
                </SocketIn>
                <SocketIn node={node} socketId={"offset"} label={"Offset"}>
                    <IntegerInput value={node.payload.offset} onCommit={(offset) => handleUpdate({ offset })} disabled={node.in.offset !== null} />
                </SocketIn>
            </NodeAccordion>
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

const evaluate = (node: NodeDefinitions.NodeFor<SequencerDefinition>, socket: keyof SequencerDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const sequenceEval = context.resolve<"sequence">(node.id, "sequence");
    if (!sequenceEval) return null;

    const { senderId, count } = sequenceEval.data;
    if (count <= 0) return null;

    const socketCount = node.payload.steps.length;
    if (socketCount === 0) return null;

    const iter = context.sequenceData[senderId] ?? 0;

    const reverseSequence = context.resolve<"boolean">(node.id, "reverseSequence")?.data ?? node.payload.reverseSequence;
    const reverseSteps = context.resolve<"boolean">(node.id, "reverseSteps")?.data ?? node.payload.reverseSteps;
    const offsetStr = context.resolve<"integer">(node.id, "offset")?.data ?? node.payload.offset;
    const offset = offsetStr === "" ? 0 : parseInt(offsetStr, 10) || 0;
    const modeEnum = context.resolve<"enum">(node.id, "mode")?.data ?? node.payload.mode;
    const modeKey = Enum.keyOf(Enum.Common.sequencerMode, modeEnum);

    // Pipeline step 1: Reverse Sequence
    let idx = reverseSequence ? count - 1 - iter : iter;

    // Pipeline step 2: Offset
    idx = (((idx + offset) % count) + count) % count;

    // Pipeline step 3: Mode maps idx (0..count-1) -> stepIdx (0..socketCount-1)
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

    // Pipeline step 5: Resolve the step socket without this sequence's iteration
    const stepSocket = node.payload.steps[stepIdx]?.socket;
    if (!stepSocket) return null;

    const { [senderId]: _, ...restSeqData } = context.sequenceData;
    return context.resolve(node.id, stepSocket, restSeqData);
};

export const SequencerNodeType: NodeTypes.Type<"sequencer", SequencerDefinition> = {
    type: "sequencer",
    displayName: "Sequencer",
    defaultLabel: "Sequencer",
    iconNode: <NodeIcon shape={NODE_ICONS.timeline} />,
    flavour: "danger",
    category: "Logic",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
