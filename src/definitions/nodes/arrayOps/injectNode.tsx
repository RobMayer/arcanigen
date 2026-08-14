import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { Enum } from "../../datatypes/enum";
import { NumericString } from "../../datatypes/numericString";
import { EmptyOr } from "../../../util/misc";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

// Inject inserts one `element` into `source` at an anchor + side (the element-level insert). `anchor` picks
// a real element (negative counts from the end), `side` picks which side of it -> no fencepost, length-free:
// default `after -1` appends (push), `before 0` prepends (unshift). Anchor clamps to the ends. `T` is shared
// between the array element and the standalone element, so they must match.
const def = signature({
    args: { T: $.ANY },
    in: ({ T }) => ({ source: $.arrayOf(T), element: T, anchor: "integer", side: "enum" }),
    out: ({ T }) => ({ output: $.arrayOf(T), count: "integer" }),
});

export type InjectDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        anchor: DataTypes.TypeOf<DataTypes.Integer>;
        side: DataTypes.TypeOf<DataTypes.Enum>;
    }
>;

const SIDE_OPTIONS = Enum.options(Enum.Common.injectSide);

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<InjectDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"inject", InjectDefinition> => {
    return {
        id,
        in: { source: null, element: null, anchor: null, side: null },
        out: { output: [], count: [] },
        payload: {
            label: "",
            anchor: "-1",
            side: Enum.Common.injectSide.AFTER.value, // default = push (after the last element)
            ...input,
        },
        type: "inject",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<InjectDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<InjectDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketOut node={node} socketId={"count"}>
                Count
            </SocketOut>
            <SocketIn node={node} socketId={"source"} label={"Source"} />
            <SocketIn node={node} socketId={"element"} label={"Element"} />
            <SocketIn node={node} socketId={"anchor"} label={"Anchor"}>
                <IntegerInput value={node.payload.anchor} onCommit={(anchor) => handleUpdate({ anchor })} disabled={node.in.anchor !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"side"} label={"Side"}>
                <RadioButton.Group
                    orientation={"horizontal"}
                    value={`${node.payload.side}`}
                    onValue={(v) => handleUpdate({ side: Number(v) })}
                    disabled={node.in.side !== null}
                    options={SIDE_OPTIONS}
                />
            </SocketIn>
        </TypicalNode>
    );
};

const ALL_INPUTS: (keyof InjectDefinition["inputs"])[] = ["source", "element", "anchor", "side"];

const dependsOn = (_node: NodeDefinitions.NodeFor<InjectDefinition>, outSocket: keyof InjectDefinition["outputs"], _deps: AllDeps): (keyof InjectDefinition["inputs"])[] => {
    if (outSocket === "output" || outSocket === "count") return ALL_INPUTS;
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<InjectDefinition>, _inSocket: keyof InjectDefinition["inputs"], _deps: AllDeps): (keyof InjectDefinition["outputs"])[] => {
    return ["output", "count"];
};

/** Unwrap one `array<...>` layer to its element kind string. */
const unwrapArray = (kind: string): string => (kind.startsWith("array<") && kind.endsWith(">") ? kind.slice("array<".length, -1) : kind);

const evaluate = (node: NodeDefinitions.NodeFor<InjectDefinition>, socket: keyof InjectDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output" && socket !== "count") return null;

    const source = context.resolve<DataTypes.ArrayOf<DataTypes.AnyKind>>(node.id, "source");
    if (!source) return null;
    const items = source.data;
    const outKind = `array<${unwrapArray(source.kind)}>`;

    const element = context.resolve<DataTypes.AnyKind>(node.id, "element");
    const n = items.length;

    let data: unknown[];
    if (!element) {
        data = [...items]; // nothing to inject -> passthrough
    } else if (n === 0) {
        data = [element.data];
    } else {
        const anchorRaw = Math.round(NumericString.Emptyable.asNumber(context.resolve<DataTypes.Integer>(node.id, "anchor")?.data ?? node.payload.anchor) ?? -1);
        const side = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "side")?.data, Enum.Common.injectSide) ?? node.payload.side;

        let a = anchorRaw < 0 ? n + anchorRaw : anchorRaw;
        a = Math.max(0, Math.min(n - 1, a)); // clamp to a real element
        const p = side === Enum.Common.injectSide.AFTER.value ? a + 1 : a;
        data = [...items.slice(0, p), element.data, ...items.slice(p)];
    }

    if (socket === "count") return { kind: "integer", data: `${data.length}` };
    return { kind: outKind, data };
};

export const InjectNodeType: NodeTypes.Type<"inject", InjectDefinition> = {
    type: "inject",
    displayName: "Inject",
    defaultLabel: "Inject",
    iconNode: <NodeIcon shape={NODE_ICONS.plus} modifierIcon={NODE_ICONS.modifiers.arrayOf} />,
    flavour: "danger",
    category: "Math",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
