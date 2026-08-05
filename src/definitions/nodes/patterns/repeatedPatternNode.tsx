import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { NumericString } from "../../datatypes/numericString";
import { Transforms } from "../abstract";
import { GroupShape } from "../../shapeTypes";

export type RepeatedPatternDefinition = {
    inputs: {
        input: DataTypes.Use<"shape">;
        count: DataTypes.Use<"integer">;
    } & Transforms.Definition["inputs"];
    outputs: {
        output: DataTypes.Use<"shape">;
        sequence: DataTypes.Use<"sequence">;
    };
    payload: {
        label: string;
        count: DataTypes.TypeOf<DataTypes.Use<"integer">>;
    } & Transforms.Definition["payload"];
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<RepeatedPatternDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"repeatedPattern", RepeatedPatternDefinition> => {
    return {
        id,
        in: {
            input: null,
            count: null,
            // transforms
            positionMode: null,
            positionX: null,
            positionY: null,
            positionRadius: null,
            positionTheta: null,
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
            positionMode: Enum.Common.positionMode.CARTESIAN.value,
            positionX: "0px",
            positionY: "0px",
            positionRadius: "0px",
            positionTheta: "0",
            rotation: "0",
        },
        type: "repeatedPattern",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<RepeatedPatternDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<RepeatedPatternDefinition>>) => {
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
            <Transforms.Controls node={node} handleUpdate={handleUpdate} accordion />
        </TypicalNode>
    );
};

const GEOMETRY_INPUTS: (keyof RepeatedPatternDefinition["inputs"])[] = ["input", "count", "positionMode", "positionX", "positionY", "positionRadius", "positionTheta", "rotation"];

const dependsOn = (_node: NodeDefinitions.NodeFor<RepeatedPatternDefinition>, outSocket: keyof RepeatedPatternDefinition["outputs"], _deps: AllDeps): (keyof RepeatedPatternDefinition["inputs"])[] => {
    if (outSocket === "output") {
        return GEOMETRY_INPUTS;
    }
    if (outSocket === "sequence") {
        return ["count"];
    }
    return [];
};

const contributesTo = (
    _node: NodeDefinitions.NodeFor<RepeatedPatternDefinition>,
    inSocket: keyof RepeatedPatternDefinition["inputs"],
    _deps: AllDeps,
): (keyof RepeatedPatternDefinition["outputs"])[] => {
    if (inSocket === "count") {
        return ["output", "sequence"];
    }
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<RepeatedPatternDefinition>, socket: keyof RepeatedPatternDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const countStr = context.resolve<"integer">(node.id, "count")?.data ?? node.payload.count;
    const count = Math.round(Math.max(1, Math.min(64, NumericString.Emptyable.asNumber(countStr) ?? NaN)));
    if (!isFinite(count)) return null;

    if (socket === "sequence") {
        return { kind: "sequence", data: { senderId: node.id, count } };
    }

    if (socket !== "output") return null;

    const [groupTransforms] = Transforms.evaluate(node, context);

    const children = [];
    for (let i = 0; i < count; i++) {
        const shape = context.resolve<"shape">(node.id, "input", { ...context.sequenceData, [node.id]: i })?.data ?? null;
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

const SOCKETTYPES_IN: { [key in keyof Required<RepeatedPatternDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    input: { types: ["shape"], mode: "or" },
    count: { types: ["integer"], mode: "or" },
    ...Transforms.IN_SOCKET_TYPES,
};

const SOCKETTYPES_OUT: { [key in keyof Required<RepeatedPatternDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["shape"], mode: "and" },
    sequence: { types: ["sequence"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<RepeatedPatternDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const RepeatedPatternNodeType: NodeTypes.Type<"repeatedPattern", RepeatedPatternDefinition> = {
    type: "repeatedPattern",
    displayName: "Repeated Pattern",
    defaultLabel: "Repeated Pattern",
    iconNode: <Icon shape={NODE_ICONS.loop} color={"var(--icon-flavour)"} cutout={"scoop"} layer={NODE_ICONS.modifiers.patternFor} layerColor="#fff" />,
    category: "Collections",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
