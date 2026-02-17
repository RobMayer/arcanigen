import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { NumericString } from "../../datatypes/numericString";
import { deg2rad, delerp, distroInterpolator, getDerivedRadius, getTrueRadius, lerp, range } from "../../../util/misc";
import { Stylings, Transforms } from "./abstract";

export type PolygonDefinition = {
    inputs: {
        pointCount: DataTypes.Use<"integer">;
        radius: DataTypes.Use<"length">;
        rScribe: DataTypes.Use<"enum">;
        pointDistro: DataTypes.Use<"distribution">;
        // distribution: DataTypes.Use<"distribution">;
    } & Stylings.Definition["inputs"] &
        Transforms.Definition["inputs"];
    outputs: {
        output: DataTypes.Use<"shape">;
        rInscribe: DataTypes.Use<"length">;
        rCircumscribe: DataTypes.Use<"length">;
        rMiddle: DataTypes.Use<"length">;

        eInscribe: DataTypes.Use<"length">;
        eCircumscribe: DataTypes.Use<"length">;
        eMiddle: DataTypes.Use<"length">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        pointCount: DataTypes.TypeOf<DataTypes.Use<"integer">>;
        rScribe: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        radius: DataTypes.TypeOf<DataTypes.Use<"length">>;
    } & Stylings.Definition["payload"] &
        Transforms.Definition["payload"];
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<PolygonDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"polygon", PolygonDefinition> => {
    return {
        id,
        in: {
            pointCount: null,
            pointDistro: null,
            rScribe: null,
            radius: null,

            strokeWidth: null,
            strokeColor: null,
            strokeDash: null,
            strokeDashOffset: null,
            strokeCap: null,
            fillColor: null,
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
            rInscribe: [],
            rCircumscribe: [],
            rMiddle: [],
            eInscribe: [],
            eCircumscribe: [],
            eMiddle: [],
        },
        payload: {
            label: "",
            pointCount: "3",
            rScribe: Enum.Common.scribeMode.Inscribe,
            radius: "100px",
            // stroke
            strokeWidth: "1px",
            strokeDash: "",
            strokeColor: { r: 0, g: 0, b: 0, a: 1 },
            strokeDashOffset: "0px",
            strokeCap: Enum.Common.strokeCap.Butt,
            // fill
            fillColor: null,
            // transforms
            positionMode: Enum.Common.positionMode.Cartesian,
            positionX: "0px",
            positionY: "0px",
            positionRadius: "0px",
            positionTheta: "0",
            rotation: "0",
        },
        type: "polygon",
    };
};

const SCRIBE_MODE_OPTIONS = Enum.options(Enum.Common.scribeMode);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PolygonDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PolygonDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"shape"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"pointCount"} type={"integer"} label={"Points"}>
                <IntegerInput.SliderInput
                    value={node.payload.pointCount}
                    onCommit={(pointCount) => handleUpdate({ pointCount })}
                    disabled={node.in.pointCount !== null}
                    min={"3"}
                    max={"64"}
                    required
                />
            </SocketIn>
            <SocketIn node={node} socketId={"radius"} type={"length"} label={"Radius"}>
                <LengthInput value={node.payload.radius} onCommit={(radius) => handleUpdate({ radius })} disabled={node.in.radius !== null} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"rScribe"} type={"enum"} label={"Scribe Mode"}>
                <RadioButton.Group
                    orientation={"vertical"}
                    value={`${node.payload.rScribe}`}
                    onValue={(v) => handleUpdate({ rScribe: Number(v) })}
                    disabled={node.in.rScribe !== null}
                    options={SCRIBE_MODE_OPTIONS}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"pointDistro"} type={"distribution"}>
                Distribution
            </SocketIn>
            <Stylings.Controls node={node} handleUpdate={handleUpdate} fill accordion />
            <Transforms.Controls node={node} handleUpdate={handleUpdate} accordion />
            <NodeAccordion nodeId={node.id} label={"Additional Outputs"} socketsOut={"rInscribe|rCircumscribe|rMiddle|eInscribe|eCircumscribe|eMiddle"}>
                <SocketOut node={node} socketId={"rInscribe"} type={"length"}>
                    Inscribe Radius
                </SocketOut>
                <SocketOut node={node} socketId={"rMiddle"} type={"length"}>
                    Middle Radius
                </SocketOut>
                <SocketOut node={node} socketId={"rCircumscribe"} type={"length"}>
                    Circumscribe Radius
                </SocketOut>
                <hr />
                <SocketOut node={node} socketId={"eInscribe"} type={"length"}>
                    Inscribe Effective
                </SocketOut>
                <SocketOut node={node} socketId={"eMiddle"} type={"length"}>
                    Middle Effective
                </SocketOut>
                <SocketOut node={node} socketId={"eCircumscribe"} type={"length"}>
                    Circumscribe Effective
                </SocketOut>
            </NodeAccordion>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<PolygonDefinition>, outSocket: keyof PolygonDefinition["outputs"], _deps: AllDeps): (keyof PolygonDefinition["inputs"])[] => {
    if (outSocket === "output") {
        // output shape depends on all inputs
        return [
            "pointCount",
            "pointDistro",
            "radius",
            "rScribe",
            "strokeWidth",
            "strokeColor",
            "strokeCap",
            "strokeDash",
            "strokeDashOffset",
            "fillColor",
            "positionMode",
            "positionX",
            "positionY",
            "positionRadius",
            "positionTheta",
            "rotation",
        ];
    }
    if (outSocket === "rInscribe" || outSocket === "rCircumscribe" || outSocket === "rMiddle") {
        // radius outputs depend on pointCount and radius only
        return ["pointCount", "radius"];
    }
    if (outSocket === "eInscribe" || outSocket === "eCircumscribe" || outSocket === "eMiddle") {
        // effective radius outputs depend on pointCount, radius, and rScribe
        return ["pointCount", "radius", "rScribe"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PolygonDefinition>, inSocket: keyof PolygonDefinition["inputs"], _deps: AllDeps): (keyof PolygonDefinition["outputs"])[] => {
    if (inSocket === "pointCount") {
        return ["output", "rInscribe", "rCircumscribe", "rMiddle", "eInscribe", "eCircumscribe", "eMiddle"];
    }
    if (inSocket === "radius") {
        return ["output", "rInscribe", "rCircumscribe", "rMiddle", "eInscribe", "eCircumscribe", "eMiddle"];
    }
    if (inSocket === "rScribe") {
        return ["output", "eInscribe", "eCircumscribe", "eMiddle"];
    }
    // all other inputs only affect the shape output
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<PolygonDefinition>, socket: keyof PolygonDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const radius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "radius")?.data ?? node.payload.radius, "0px")) ?? null;
        const pointCount = NumericString.Emptyable.asNumber(context.resolve<"integer">(node.id, "pointCount")?.data ?? node.payload.pointCount) ?? null;
        if (radius === null || pointCount === null) {
            return null;
        }

        const distro = context.resolve<"distribution">(node.id, "pointDistro")?.data ?? { func: Enum.Common.distroFunctions.Linear, easing: Enum.Common.distroEasing.In, intensity: "1" };

        const distroLerper = distroInterpolator(
            Enum.keyOf(Enum.Common.distroFunctions, distro.func),
            Enum.keyOf(Enum.Common.distroEasing, distro.easing),
            NumericString.Emptyable.asNumber(distro.intensity) ?? 1,
        );

        const scribeMode = Enum.keyOf(Enum.Common.scribeMode, context.resolve<"enum">(node.id, "rScribe")?.data ?? node.payload.rScribe ?? Enum.Common.scribeMode.Inscribe);

        const trueRadius = getTrueRadius(radius, scribeMode, pointCount);
        const points = range(pointCount).map((_, i) => {
            const coeff = lerp(delerp(i, 0, pointCount), 0, 360, distroLerper);
            return `${trueRadius * Math.cos(deg2rad(coeff - 90))},${trueRadius * Math.sin(deg2rad(coeff - 90))}`;
        });

        const attributes: Record<string, string> = {
            d: `M ${points[0]} ${points
                .slice(1)
                .map((e) => `L ${e}`)
                .join(" ")} Z`,
            ...Stylings.evaluate(node, context),
        };

        const [transforms, { translateX, translateY }] = Transforms.evaluate(node, context);

        const pathPreview = { x: -trueRadius, y: -trueRadius, w: 2 * trueRadius, h: 2 * trueRadius };

        const pathElement = {
            tag: "path" as const,
            attributes,
            children: [],
            preview: pathPreview,
        };

        // If we have transforms, wrap in a <g> element
        if (transforms.length > 0) {
            return {
                kind: "shape",
                data: {
                    tag: "g",
                    attributes: {
                        transform: transforms.join(" "),
                    },
                    children: [pathElement],
                    preview: { x: -trueRadius + translateX, y: -trueRadius + translateY, w: 2 * trueRadius, h: 2 * trueRadius },
                },
            };
        }

        return {
            kind: "shape",
            data: pathElement,
        };
    }

    const [radius, unit] = Length.Emptyable.parse(Length.Emptyable.max(context.resolve<"length">(node.id, "radius")?.data ?? node.payload.radius, "0px")) ?? [null, null];
    const pointCount = NumericString.Emptyable.asNumber(context.resolve<"integer">(node.id, "pointCount")?.data ?? node.payload.pointCount);
    if (radius === null || unit == null || pointCount === null) {
        return null;
    }
    if (socket === "rInscribe") {
        const outputRadius = getTrueRadius(radius, "Inscribe", pointCount);
        return { kind: "length", data: `${outputRadius}${unit}` };
    }
    if (socket === "rCircumscribe") {
        const outputRadius = getTrueRadius(radius, "Circumscribe", pointCount);
        return { kind: "length", data: `${outputRadius}${unit}` };
    }
    if (socket === "rMiddle") {
        const outputRadius = getTrueRadius(radius, "Middle", pointCount);
        return { kind: "length", data: `${outputRadius}${unit}` };
    }

    const scribeMode = Enum.keyOf(Enum.Common.scribeMode, context.resolve<"enum">(node.id, "rScribe")?.data ?? node.payload.rScribe ?? Enum.Common.scribeMode.Inscribe);
    const currentRadius = getTrueRadius(radius, scribeMode, pointCount);

    if (socket === "eInscribe") {
        const outputRadius = getDerivedRadius(currentRadius, "Inscribe", pointCount);
        return { kind: "length", data: `${outputRadius}${unit}` };
    }
    if (socket === "eCircumscribe") {
        const outputRadius = getDerivedRadius(currentRadius, "Circumscribe", pointCount);
        return { kind: "length", data: `${outputRadius}${unit}` };
    }
    if (socket === "eMiddle") {
        const outputRadius = getDerivedRadius(currentRadius, "Middle", pointCount);
        return { kind: "length", data: `${outputRadius}${unit}` };
    }

    return null;
};

const POLYGON_SOCKET_TYPES: Record<string, string> = {
    pointCount: "integer",
    radius: "length",
    rScribe: "enum",
    pointDistro: "distribution",
    strokeWidth: "length",
    strokeColor: "color",
    strokeCap: "enum",
    strokeDash: "tokens<length>",
    strokeDashOffset: "length",
    fillColor: "color",
    positionMode: "enum",
    positionX: "length",
    positionY: "length",
    positionRadius: "length",
    positionTheta: "angle",
    rotation: "angle",
    output: "shape",
    rInscribe: "length",
    rCircumscribe: "length",
    rMiddle: "length",
    eInscribe: "length",
    eCircumscribe: "length",
    eMiddle: "length",
};

const getSocketType = (_node: NodeDefinitions.NodeFor<PolygonDefinition>, socketId: string, _side: "in" | "out"): string => POLYGON_SOCKET_TYPES[socketId] ?? "float";

export const PolygonNodeType: NodeTypes.Type<"polygon", PolygonDefinition> = {
    type: "polygon",
    displayName: "Polygon",
    defaultLabel: "Polygon",
    iconNode: <Icon shape={NODE_ICONS.polygonShape.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.polygonShape.Card} color={"var(--icon-flavour)"} />,
    category: "Shapes",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
