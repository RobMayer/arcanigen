import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Stylings, Transforms } from "../abstract";

export type CircleDefinition = {
    inputs: {
        radius: DataTypes.Use<"length">;
    } & Stylings.Definition["inputs"] &
        Transforms.Definition["inputs"];
    outputs: {
        output: DataTypes.Use<"shape">;
        path: DataTypes.Use<"path">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        radius: DataTypes.TypeOf<DataTypes.Use<"length">>;
    } & Stylings.Definition["payload"] &
        Transforms.Definition["payload"];
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<CircleDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"circle", CircleDefinition> => {
    return {
        id,
        in: {
            radius: null,
            strokeWidth: null,
            strokeColor: null,
            strokeDash: null,
            strokeDashOffset: null,
            strokeCap: null,
            fillColor: null,
            paintOrder: null,
            opacity: null,
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
            path: [],
        },
        payload: {
            label: "",
            radius: "100px",
            // stroke
            strokeWidth: "1px",
            strokeDash: "",
            strokeColor: { r: 0, g: 0, b: 0, a: 1 },
            strokeDashOffset: "0px",
            strokeCap: Enum.Common.strokeCap.BUTT.value,
            // fill
            fillColor: { r: 0, g: 0, b: 0, a: 0 },
            paintOrder: 0,
            opacity: "100",
            // transforms
            positionMode: Enum.Common.positionMode.CARTESIAN.value,
            positionX: "0px",
            positionY: "0px",
            positionRadius: "0px",
            positionTheta: "0",
            rotation: "0",
        },
        type: "circle",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<CircleDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<CircleDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketOut node={node} socketId={"path"}>
                Path
            </SocketOut>
            <SocketIn node={node} socketId={"radius"} label={"Radius"}>
                <LengthInput value={node.payload.radius} onCommit={(radius) => handleUpdate({ radius })} disabled={node.in.radius !== null} min={"0px"} required />
            </SocketIn>

            <Stylings.Controls node={node} handleUpdate={handleUpdate} fill accordion />
            <Transforms.Controls node={node} handleUpdate={handleUpdate} accordion />
        </TypicalNode>
    );
};

const GEOMETRY_INPUTS: (keyof CircleDefinition["inputs"])[] = ["radius", "positionMode", "positionX", "positionY", "positionRadius", "positionTheta", "rotation"];
const STYLING_INPUTS: (keyof CircleDefinition["inputs"])[] = ["strokeWidth", "strokeColor", "strokeCap", "strokeDash", "strokeDashOffset", "fillColor", "paintOrder"];

const dependsOn = (_node: NodeDefinitions.NodeFor<CircleDefinition>, outSocket: keyof CircleDefinition["outputs"], _deps: AllDeps): (keyof CircleDefinition["inputs"])[] => {
    if (outSocket === "path") {
        return GEOMETRY_INPUTS;
    }
    return [...GEOMETRY_INPUTS, ...STYLING_INPUTS];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<CircleDefinition>, inSocket: keyof CircleDefinition["inputs"], _deps: AllDeps): (keyof CircleDefinition["outputs"])[] => {
    if (STYLING_INPUTS.includes(inSocket)) {
        return ["output"];
    }
    return ["output", "path"];
};

const evaluate = (node: NodeDefinitions.NodeFor<CircleDefinition>, socket: keyof CircleDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const radius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "radius")?.data ?? node.payload.radius, "0px"));
    if (!radius) {
        return null;
    }

    const d = `M 0,${-1 * radius} A ${radius},${radius} 0 0 1 0,${radius} A ${radius},${radius} 0 0 1 0,${radius * -1} z`;
    const [transforms, { translateX, translateY }] = Transforms.evaluate(node, context);

    if (socket === "path") {
        return {
            kind: "path",
            data: { d, transform: transforms.join(" "), preview: { x: -radius + translateX, y: -radius + translateY, w: 2 * radius, h: 2 * radius } },
        };
    }

    if (socket === "output") {
        return {
            kind: "shape",
            data: {
                type: "path",
                d,
                paint: Stylings.evaluate(node, context),
                transform: transforms.join(" "),
                preview: { x: -radius + translateX, y: -radius + translateY, w: 2 * radius, h: 2 * radius },
            },
        };
    }

    return null;
};

const SOCKETTYPES_IN: { [key in keyof Required<CircleDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    radius: { types: ["length"], mode: "or" },
    ...Stylings.IN_SOCKET_TYPES,
    ...Transforms.IN_SOCKET_TYPES,
};

const SOCKETTYPES_OUT: { [key in keyof Required<CircleDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["shape"], mode: "and" },
    path: { types: ["path"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<CircleDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const CircleNodeType: NodeTypes.Type<"circle", CircleDefinition> = {
    type: "circle",
    displayName: "Circle",
    defaultLabel: "Circle",
    iconNode: <NodeIcon shape={NODE_ICONS.shapeCircle} />,
    category: "Shapes",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
