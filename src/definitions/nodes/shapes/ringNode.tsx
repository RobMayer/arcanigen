import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { Stylings, Transforms } from "./abstract";
import { RadioButton } from "../../../components/buttons/RadioButton";

export type RingDefinition = {
    inputs: {
        radius: DataTypes.Use<"length">;
        spread: DataTypes.Use<"length">;
        innerRadius: DataTypes.Use<"length">;
        outerRadius: DataTypes.Use<"length">;
        spanMode: DataTypes.Use<"enum">;
        spreadAlign: DataTypes.Use<"enum">;
    } & Stylings.Definition["inputs"] &
        Transforms.Definition["inputs"];
    outputs: {
        output: DataTypes.Use<"shape">;
        path: DataTypes.Use<"path">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        radius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        spread: DataTypes.TypeOf<DataTypes.Use<"length">>;
        innerRadius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        outerRadius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        spanMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        spreadAlign: DataTypes.TypeOf<DataTypes.Use<"enum">>;
    } & Stylings.Definition["payload"] &
        Transforms.Definition["payload"];
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<RingDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"ring", RingDefinition> => {
    return {
        id,
        in: {
            radius: null,
            spread: null,
            innerRadius: null,
            outerRadius: null,
            spanMode: null,
            spreadAlign: null,

            strokeWidth: null,
            strokeColor: null,
            strokeDash: null,
            strokeDashOffset: null,
            strokeCap: null,
            fillColor: null,
            paintOrder: null,
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

            spread: "20px",
            innerRadius: "90px",
            outerRadius: "110px",
            spanMode: 0,
            spreadAlign: 0,

            // stroke
            strokeWidth: "1px",
            strokeDash: "",
            strokeColor: { r: 0, g: 0, b: 0, a: 1 },
            strokeDashOffset: "0px",
            strokeCap: Enum.Common.strokeCap.Butt,
            // fill
            fillColor: null,
            paintOrder: 0,
            // transforms
            positionMode: Enum.Common.positionMode.Cartesian,
            positionX: "0px",
            positionY: "0px",
            positionRadius: "0px",
            positionTheta: "0",
            rotation: "0",
        },
        type: "ring",
    };
};

const SPAN_MODE_OPTIONS = [
    { value: "0", label: "Inner / Outer" },
    { value: "1", label: "Spread" },
];

const SPREAD_ALIGN_OPTIONS = [
    { value: "0", label: "Center" },
    { value: "1", label: "Inward" },
    { value: "2", label: "Outward" },
];

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<RingDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<RingDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"shape"}>
                Output
            </SocketOut>
            <SocketOut node={node} socketId={"path"} type={"path"}>
                Path
            </SocketOut>
            <SocketIn node={node} socketId={"spanMode"} type={"enum"} label={"Span Mode"}>
                <RadioButton.Group
                    options={SPAN_MODE_OPTIONS}
                    value={`${node.payload.spanMode}`}
                    onValue={(v) => handleUpdate({ spanMode: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.spanMode !== null}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"innerRadius"} type={"length"} label={"Inner Radius"}>
                <LengthInput
                    value={node.payload.innerRadius}
                    onCommit={(innerRadius) => handleUpdate({ innerRadius })}
                    disabled={node.in.innerRadius !== null || (node.payload.spanMode === 1 && node.in.spanMode === null)}
                    min={"0px"}
                    required
                />
            </SocketIn>
            <SocketIn node={node} socketId={"outerRadius"} type={"length"} label={"Outer Radius"}>
                <LengthInput
                    value={node.payload.outerRadius}
                    onCommit={(outerRadius) => handleUpdate({ outerRadius })}
                    disabled={node.in.outerRadius !== null || (node.payload.spanMode === 1 && node.in.spanMode === null)}
                    min={"0px"}
                    required
                />
            </SocketIn>
            <SocketIn node={node} socketId={"radius"} type={"length"} label={"Radius"}>
                <LengthInput
                    value={node.payload.radius}
                    onCommit={(radius) => handleUpdate({ radius })}
                    disabled={node.in.radius !== null || (node.payload.spanMode === 0 && node.in.spanMode === null)}
                    min={"0px"}
                    required
                />
            </SocketIn>
            <SocketIn node={node} socketId={"spread"} type={"length"} label={"Spread"}>
                <LengthInput
                    value={node.payload.spread}
                    onCommit={(spread) => handleUpdate({ spread })}
                    disabled={node.in.radius !== null || (node.payload.spanMode === 0 && node.in.spanMode === null)}
                    min={"0px"}
                    required
                />
            </SocketIn>
            <SocketIn node={node} socketId={"spreadAlign"} type={"enum"} label={"Spread Align"}>
                <RadioButton.Group
                    options={SPREAD_ALIGN_OPTIONS}
                    value={`${node.payload.spreadAlign}`}
                    onValue={(v) => handleUpdate({ spreadAlign: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.spreadAlign !== null || (node.payload.spanMode === 0 && node.in.spanMode === null)}
                />
            </SocketIn>
            <Stylings.Controls node={node} handleUpdate={handleUpdate} fill accordion />
            <Transforms.Controls node={node} handleUpdate={handleUpdate} accordion />
        </TypicalNode>
    );
};

const GEOMETRY_INPUTS: (keyof RingDefinition["inputs"])[] = ["radius", "spread", "spreadAlign", "spanMode", "innerRadius", "outerRadius", "positionMode", "positionX", "positionY", "positionRadius", "positionTheta", "rotation"];
const STYLING_INPUTS: (keyof RingDefinition["inputs"])[] = ["strokeWidth", "strokeColor", "strokeCap", "strokeDash", "strokeDashOffset", "fillColor", "paintOrder"];

const dependsOn = (_node: NodeDefinitions.NodeFor<RingDefinition>, outSocket: keyof RingDefinition["outputs"], _deps: AllDeps): (keyof RingDefinition["inputs"])[] => {
    if (outSocket === "path") {
        return GEOMETRY_INPUTS;
    }
    return [...GEOMETRY_INPUTS, ...STYLING_INPUTS];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<RingDefinition>, inSocket: keyof RingDefinition["inputs"], _deps: AllDeps): (keyof RingDefinition["outputs"])[] => {
    if (STYLING_INPUTS.includes(inSocket)) {
        return ["output"];
    }
    return ["output", "path"];
};

const evaluate = (node: NodeDefinitions.NodeFor<RingDefinition>, socket: keyof RingDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const spanMode = context.resolve<"enum">(node.id, "spanMode")?.data ?? node.payload.spanMode ?? 0;
    const innerRadius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "innerRadius")?.data ?? node.payload.innerRadius, "0px")) ?? 0;
    const outerRadius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "outerRadius")?.data ?? node.payload.outerRadius, "0px")) ?? 0;
    const radius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "radius")?.data ?? node.payload.radius, "0px")) ?? 0;
    const spread = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "spread")?.data ?? node.payload.spread, "0px")) ?? 0;
    const spreadAlign = context.resolve<"enum">(node.id, "spreadAlign")?.data ?? node.payload.spreadAlign ?? 0;

    if (spanMode === 0 && (!innerRadius || !outerRadius)) {
        return null;
    }
    if (spanMode === 1 && (!radius || !spread)) {
        return null;
    }

    let rI = innerRadius;
    let rO = outerRadius;

    if (spanMode === 1) {
        switch (spreadAlign) {
            case 0:
                {
                    rO = radius + spread / 2;
                    rI = radius - spread / 2;
                }
                break;
            case 1:
                {
                    rO = radius;
                    rI = radius - spread;
                }
                break;
            case 2:
                {
                    rO = radius + spread;
                    rI = radius;
                }
                break;
        }
    }

    const d = `M ${rO},0 A ${rO},${rO} 0 0,0 ${-rO},0 A ${rO},${rO} 0 0,0 ${rO},0 z M ${rI},0 A ${rI},${rI} 0 0,1 ${-rI},0 A ${rI},${rI} 0 0,1 ${rI},0 z`;
    const [transforms, { translateX, translateY }] = Transforms.evaluate(node, context);

    if (socket === "path") {
        return {
            kind: "path",
            data: { d, transform: transforms.join(" "), preview: { x: -rO + translateX, y: -rO + translateY, w: 2 * rO, h: 2 * rO } },
        };
    }

    if (socket === "output") {
        const attributes: Record<string, string> = {
            ...Stylings.evaluate(node, context),
            d,
        };

        return {
            kind: "shape",
            data: {
                transform: transforms.join(" "),
                tag: "path",
                attributes,
                children: [],
                preview: { x: -rO + translateX, y: -rO + translateY, w: 2 * rO, h: 2 * rO },
            },
        };
    }

    return null;
};

const RING_SOCKET_TYPES: Record<string, string> = {
    radius: "length",
    spread: "length",
    innerRadius: "length",
    outerRadius: "length",
    spanMode: "enum",
    spreadAlign: "enum",
    strokeWidth: "length",
    strokeColor: "color",
    strokeCap: "enum",
    strokeDash: "tokens<length>",
    strokeDashOffset: "length",
    fillColor: "color",
    paintOrder: "enum",
    positionMode: "enum",
    positionX: "length",
    positionY: "length",
    positionRadius: "length",
    positionTheta: "angle",
    rotation: "angle",
    output: "shape",
    path: "path",
};

const getSocketType = (_node: NodeDefinitions.NodeFor<RingDefinition>, socketId: string, _side: "in" | "out"): string => RING_SOCKET_TYPES[socketId] ?? "float";

export const RingNodeType: NodeTypes.Type<"ring", RingDefinition> = {
    type: "ring",
    displayName: "Ring",
    defaultLabel: "Ring",
    iconNode: <Icon shape={NODE_ICONS.ringShape.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.ringShape.Card} color={"var(--icon-flavour)"} />,
    category: "Shapes",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
