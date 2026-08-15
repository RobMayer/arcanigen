import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { StylingPrefab } from "../../helpers/stylingPrefab";
import { TransformPrefab } from "../../helpers/transformPrefab";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: {
        radius: "length",
        spread: "length",
        innerRadius: "length",
        outerRadius: "length",
        spanMode: "enum",
        spreadAlign: "enum",
        ...TransformPrefab.SIG_IN,
        ...StylingPrefab.SIG_IN,
        ...StylingPrefab.SIG_FILL,
    },
    out: { output: "shape", path: "path" },
});

export type RingDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        radius: DataTypes.TypeOf<DataTypes.Length>;
        spread: DataTypes.TypeOf<DataTypes.Length>;
        innerRadius: DataTypes.TypeOf<DataTypes.Length>;
        outerRadius: DataTypes.TypeOf<DataTypes.Length>;
        spanMode: DataTypes.TypeOf<DataTypes.Enum>;
        spreadAlign: DataTypes.TypeOf<DataTypes.Enum>;
    } & StylingPrefab.Definition["payload"] &
        TransformPrefab.Definition["payload"]
>;

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
            opacity: null,
            // transforms
            position: null,
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
            strokeCap: Enum.Common.strokeCap.BUTT.value,
            // fill
            fillColor: { r: 0, g: 0, b: 0, a: 0 },
            paintOrder: 0,
            opacity: "100",
            // transforms
            position: { ...TransformPrefab.POSITION_DEFAULT },
            rotation: "0deg",
        },
        type: "ring",
    };
};

const SPAN_MODE_OPTIONS = Enum.options(Enum.Common.spanMode);
const SPREAD_ALIGN_OPTIONS = Enum.options(Enum.Common.spreadAlign);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<RingDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<RingDefinition>>) => {
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
            <SocketIn node={node} socketId={"spanMode"} label={"Span Mode"}>
                <RadioButton.Group
                    options={SPAN_MODE_OPTIONS}
                    value={`${node.payload.spanMode}`}
                    onValue={(v) => handleUpdate({ spanMode: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.spanMode !== null}
                />
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"innerRadius"} label={"Inner Radius"}>
                <LengthInput
                    value={node.payload.innerRadius}
                    onCommit={(innerRadius) => handleUpdate({ innerRadius })}
                    disabled={node.in.innerRadius !== null || (node.payload.spanMode === 1 && node.in.spanMode === null)}
                    min={"0px"}
                    required
                />
            </SocketIn>
            <SocketIn node={node} socketId={"outerRadius"} label={"Outer Radius"}>
                <LengthInput
                    value={node.payload.outerRadius}
                    onCommit={(outerRadius) => handleUpdate({ outerRadius })}
                    disabled={node.in.outerRadius !== null || (node.payload.spanMode === 1 && node.in.spanMode === null)}
                    min={"0px"}
                    required
                />
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"radius"} label={"Radius"}>
                <LengthInput
                    value={node.payload.radius}
                    onCommit={(radius) => handleUpdate({ radius })}
                    disabled={node.in.radius !== null || (node.payload.spanMode === 0 && node.in.spanMode === null)}
                    min={"0px"}
                    required
                />
            </SocketIn>
            <SocketIn node={node} socketId={"spread"} label={"Spread"}>
                <LengthInput
                    value={node.payload.spread}
                    onCommit={(spread) => handleUpdate({ spread })}
                    disabled={node.in.radius !== null || (node.payload.spanMode === 0 && node.in.spanMode === null)}
                    min={"0px"}
                    required
                />
            </SocketIn>
            <SocketIn node={node} socketId={"spreadAlign"} label={"Spread Align"}>
                <RadioButton.Group
                    options={SPREAD_ALIGN_OPTIONS}
                    value={`${node.payload.spreadAlign}`}
                    onValue={(v) => handleUpdate({ spreadAlign: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.spreadAlign !== null || (node.payload.spanMode === 0 && node.in.spanMode === null)}
                />
            </SocketIn>
            <StylingPrefab.Controls node={node} handleUpdate={handleUpdate} fill accordion />
            <TransformPrefab.Controls node={node} handleUpdate={handleUpdate} accordion />
        </TypicalNode>
    );
};

const GEOMETRY_INPUTS: (keyof RingDefinition["inputs"])[] = [
    "radius",
    "spread",
    "spreadAlign",
    "spanMode",
    "innerRadius",
    "outerRadius",
    "position",
    "rotation",
];
const STYLING_INPUTS: (keyof RingDefinition["inputs"])[] = ["strokeWidth", "strokeColor", "strokeCap", "strokeDash", "strokeDashOffset", "fillColor", "paintOrder", "opacity"];

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
    const spanMode = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "spanMode")?.data, Enum.Common.spanMode) ?? node.payload.spanMode ?? 0;
    const innerRadius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "innerRadius")?.data ?? node.payload.innerRadius, "0px")) ?? 0;
    const outerRadius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "outerRadius")?.data ?? node.payload.outerRadius, "0px")) ?? 0;
    const radius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "radius")?.data ?? node.payload.radius, "0px")) ?? 0;
    const spread = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "spread")?.data ?? node.payload.spread, "0px")) ?? 0;
    const spreadAlign = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "spreadAlign")?.data, Enum.Common.spreadAlign) ?? node.payload.spreadAlign ?? 0;

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
    const [transforms, { translateX, translateY }] = TransformPrefab.evaluate(node, context);

    if (socket === "path") {
        return {
            kind: "path",
            data: { d, transform: transforms.join(" "), preview: { x: -rO + translateX, y: -rO + translateY, w: 2 * rO, h: 2 * rO } },
        };
    }

    if (socket === "output") {
        return {
            kind: "shape",
            data: {
                type: "path",
                d,
                paint: StylingPrefab.evaluate(node, context),
                transform: transforms.join(" "),
                preview: { x: -rO + translateX, y: -rO + translateY, w: 2 * rO, h: 2 * rO },
            },
        };
    }

    return null;
};

export const RingNodeType: NodeTypes.Type<"ring", RingDefinition> = {
    type: "ring",
    displayName: "Ring",
    defaultLabel: "Ring",
    iconNode: <NodeIcon shape={NODE_ICONS.shapeRing} />,
    flavour: "confirm",
    category: "Shapes",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
