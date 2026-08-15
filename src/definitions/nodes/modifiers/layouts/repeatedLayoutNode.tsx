import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject } from "../../../helpers/nodeHelper";
import { NodeIcon, NODE_ICONS } from "../../../../components/Icon";
import { Resolver } from "../../../../util/resolver";
import { Enum } from "../../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../../nodeTypes";
import { DataTypes } from "../../../dataTypes";
import { SocketTypes } from "../../../socketTypes";
import { Project } from "../../../../state/project";
import { IntegerInput } from "../../../../components/inputs/IntegerInput";
import { NumericString } from "../../../datatypes/numericString";
import { TransformPrefab } from "../../../helpers/transformPrefab";
import { GroupShape } from "../../../shapeTypes";
import { signature, SignatureBuilder } from "../../../helpers/signatureBuilder";
import { SignatureEngine } from "../../../helpers/signatureEngine";

const def = signature({
    in: {
        input: "shape",
        count: "integer",
        ...TransformPrefab.SIG_IN,
    },
    out: { output: "shape", sequence: "sequence" },
});

export type RepeatedLayoutDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        count: DataTypes.TypeOf<DataTypes.Integer>;
    } & TransformPrefab.Definition["payload"]
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<RepeatedLayoutDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"repeatedLayout", RepeatedLayoutDefinition> => {
    return {
        id,
        in: {
            input: null,
            count: null,
            // transforms
            position: null,
            rotation: null,
        },
        out: {
            output: [],
            sequence: [],
        },
        payload: {
            label: "",
            count: input.count ?? "5",
            // transforms
            position: { ...TransformPrefab.POSITION_DEFAULT },
            rotation: "0deg",
        },
        type: "repeatedLayout",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<RepeatedLayoutDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<RepeatedLayoutDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketOut node={node} socketId={"sequence"}>
                Sequence
            </SocketOut>
            <SocketIn node={node} socketId={"input"}>
                Input
            </SocketIn>
            <SocketIn node={node} socketId={"count"} label={"Count"}>
                <IntegerInput.SliderInput value={node.payload.count} onCommit={(count) => handleUpdate({ count })} disabled={node.in.count !== null} min={"1"} max={"64"} required />
            </SocketIn>
            <TransformPrefab.Controls node={node} handleUpdate={handleUpdate} accordion />
        </TypicalNode>
    );
};

const GEOMETRY_INPUTS: (keyof RepeatedLayoutDefinition["inputs"])[] = ["input", "count", "position", "rotation"];

const dependsOn = (_node: NodeDefinitions.NodeFor<RepeatedLayoutDefinition>, outSocket: keyof RepeatedLayoutDefinition["outputs"], _deps: AllDeps): (keyof RepeatedLayoutDefinition["inputs"])[] => {
    if (outSocket === "output") {
        return GEOMETRY_INPUTS;
    }
    if (outSocket === "sequence") {
        return ["count"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<RepeatedLayoutDefinition>, inSocket: keyof RepeatedLayoutDefinition["inputs"], _deps: AllDeps): (keyof RepeatedLayoutDefinition["outputs"])[] => {
    if (inSocket === "count") {
        return ["output", "sequence"];
    }
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<RepeatedLayoutDefinition>, socket: keyof RepeatedLayoutDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const countStr = context.resolve<DataTypes.Integer>(node.id, "count")?.data ?? node.payload.count;
    const count = Math.round(Math.max(1, Math.min(64, NumericString.Emptyable.asNumber(countStr) ?? NaN)));
    if (!isFinite(count)) return null;

    if (socket === "sequence") {
        return { kind: "sequence", data: { senderId: node.id, count } };
    }

    if (socket !== "output") return null;

    const [groupTransforms] = TransformPrefab.evaluate(node, context);

    const children = [];
    for (let i = 0; i < count; i++) {
        const shape = context.resolve<DataTypes.Shape>(node.id, "input", { ...context.cursorData, [node.id]: i })?.data ?? null;
        if (shape === null) continue;
        children.push(shape);
    }

    // Preview is the union of the children's bounds.
    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
    for (const child of children) {
        minX = Math.min(minX, child.preview.x);
        minY = Math.min(minY, child.preview.y);
        maxX = Math.max(maxX, child.preview.x + child.preview.w);
        maxY = Math.max(maxY, child.preview.y + child.preview.h);
    }
    const preview = isFinite(minX) ? { x: minX, y: minY, w: maxX - minX, h: maxY - minY } : { x: 0, y: 0, w: 0, h: 0 };

    const group: GroupShape = {
        type: "group",
        children,
        transform: groupTransforms.join(" "),
        preview,
    };

    return { kind: "shape", data: group };
};

export const RepeatedLayoutNodeType: NodeTypes.Type<"repeatedLayout", RepeatedLayoutDefinition> = {
    type: "repeatedLayout",
    displayName: "Repeated Layout",
    defaultLabel: "Repeated Layout",
    iconNode: <NodeIcon shape={NODE_ICONS.loop} modifierIcon={NODE_ICONS.modifiers.patternFor} />,
    flavour: "emphasis",
    category: "Modifiers",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
    canInterject: passthroughCanInterject(SocketTypes.of(DataTypes.SHAPE), SocketTypes.of(DataTypes.SHAPE)),
    onInterject: passthroughInterject("input", "output"),
};
