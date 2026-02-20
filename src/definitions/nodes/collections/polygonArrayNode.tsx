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
import { deg2rad, delerp, distroInterpolator, getDerivedRadius, getTrueRadius, lerp } from "../../../util/misc";
import { Transforms } from "../shapes/abstract";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { GroupShape } from "../../shapeTypes";

export type PolygonArrayDefinition = {
    inputs: {
        input: DataTypes.Use<"shape">;
        count: DataTypes.Use<"integer">;
        radius: DataTypes.Use<"length">;
        scribeMode: DataTypes.Use<"enum">;
        memberAlign: DataTypes.Use<"boolean">;
        memberRotation: DataTypes.Use<"angle">;
        pointDistro: DataTypes.Use<"distribution">;
    } & Transforms.Definition["inputs"];
    outputs: {
        output: DataTypes.Use<"shape">;
        sequence: DataTypes.Use<"sequence">;
        eCircumradius: DataTypes.Use<"length">;
        eApothem: DataTypes.Use<"length">;
    };
    payload: {
        label: string;
        count: DataTypes.TypeOf<DataTypes.Use<"integer">>;
        radius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        scribeMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        memberAlign: boolean;
        memberRotation: DataTypes.TypeOf<DataTypes.Use<"angle">>;
    } & Transforms.Definition["payload"];
};

const SCRIBE_MODE_OPTIONS = Enum.options(Enum.Common.scribeMode);

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<PolygonArrayDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"polygonArray", PolygonArrayDefinition> => {
    return {
        id,
        in: {
            input: null,
            count: null,
            radius: null,
            scribeMode: null,
            memberAlign: null,
            memberRotation: null,
            pointDistro: null,
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
            eCircumradius: [],
            eApothem: [],
        },
        payload: {
            label: "",
            count: input.count ?? "5",
            radius: input.radius ?? "100px",
            scribeMode: input.scribeMode ?? Enum.Common.scribeMode.Inscribe,
            memberAlign: input.memberAlign ?? false,
            memberRotation: input.memberRotation ?? "0",
            // transforms
            positionMode: Enum.Common.positionMode.Cartesian,
            positionX: "0px",
            positionY: "0px",
            positionRadius: "0px",
            positionTheta: "0",
            rotation: "0",
        },
        type: "polygonArray",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PolygonArrayDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PolygonArrayDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"shape"}>
                Output
            </SocketOut>
            <SocketOut node={node} socketId={"sequence"} type={"sequence"}>
                Sequence
            </SocketOut>
            <SocketIn node={node} socketId={"input"} type={"shape"}>
                Input
            </SocketIn>
            <SocketIn node={node} socketId={"count"} type={"integer"} label={"Count"}>
                <IntegerInput.SliderInput value={node.payload.count} onCommit={(count) => handleUpdate({ count })} disabled={node.in.count !== null} min={"3"} max={"64"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"radius"} type={"length"} label={"Radius"}>
                <LengthInput value={node.payload.radius} onCommit={(radius) => handleUpdate({ radius })} disabled={node.in.radius !== null} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"scribeMode"} type={"enum"} label={"Scribe Mode"}>
                <RadioButton.Group
                    orientation={"horizontal"}
                    value={`${node.payload.scribeMode}`}
                    onValue={(v) => handleUpdate({ scribeMode: Number(v) })}
                    disabled={node.in.scribeMode !== null}
                    options={SCRIBE_MODE_OPTIONS}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"pointDistro"} type={"distribution"}>
                Angular Distribution
            </SocketIn>
            <SocketIn node={node} socketId={"memberAlign"} type={"boolean"}>
                <CheckBox checked={node.payload.memberAlign} onToggle={(memberAlign) => handleUpdate({ memberAlign })} disabled={node.in.memberAlign !== null}>
                    Align to Path
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"memberRotation"} type={"angle"} label={"Member Rotation"}>
                <AngleInput.SliderInput value={node.payload.memberRotation} onCommit={(memberRotation) => handleUpdate({ memberRotation })} disabled={node.in.memberRotation !== null} />
            </SocketIn>
            <Transforms.Controls node={node} handleUpdate={handleUpdate} accordion />
            <NodeAccordion nodeId={node.id} label={"Additional Outputs"} socketsOut={"eCircumradius|eApothem"}>
                <SocketOut node={node} socketId={"eCircumradius"} type={"length"}>
                    Circumradius
                </SocketOut>
                <SocketOut node={node} socketId={"eApothem"} type={"length"}>
                    Apothem
                </SocketOut>
            </NodeAccordion>
        </TypicalNode>
    );
};

const GEOMETRY_INPUTS: (keyof PolygonArrayDefinition["inputs"])[] = [
    "input",
    "count",
    "radius",
    "scribeMode",
    "pointDistro",
    "memberAlign",
    "memberRotation",
    "positionMode",
    "positionX",
    "positionY",
    "positionRadius",
    "positionTheta",
    "rotation",
];

const dependsOn = (_node: NodeDefinitions.NodeFor<PolygonArrayDefinition>, outSocket: keyof PolygonArrayDefinition["outputs"], _deps: AllDeps): (keyof PolygonArrayDefinition["inputs"])[] => {
    if (outSocket === "output") {
        return GEOMETRY_INPUTS;
    }
    if (outSocket === "sequence") {
        return ["count"];
    }
    if (outSocket === "eCircumradius" || outSocket === "eApothem") {
        return ["count", "radius", "scribeMode"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PolygonArrayDefinition>, inSocket: keyof PolygonArrayDefinition["inputs"], _deps: AllDeps): (keyof PolygonArrayDefinition["outputs"])[] => {
    if (inSocket === "count") {
        return ["output", "sequence", "eCircumradius", "eApothem"];
    }
    if (inSocket === "radius" || inSocket === "scribeMode") {
        return ["output", "eCircumradius", "eApothem"];
    }
    if (inSocket === "pointDistro") {
        return ["output"];
    }
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<PolygonArrayDefinition>, socket: keyof PolygonArrayDefinition["outputs"], context: Resolver.Context, iteration?: number): DataTypes.AnyEval | null => {
    const countStr = context.resolve<"integer">(node.id, "count")?.data ?? node.payload.count;
    const count = NumericString.Emptyable.asNumber(countStr);
    if (count === null || count < 3) return null;

    if (socket === "sequence") {
        return { kind: "sequence", data: { count } };
    }

    const radiusStr = context.resolve<"length">(node.id, "radius")?.data ?? node.payload.radius;
    const radius = Length.Emptyable.asNumber(Length.Emptyable.max(radiusStr, "0px"));
    if (radius === null) return null;

    const scribeMode = Enum.keyOf(Enum.Common.scribeMode, context.resolve<"enum">(node.id, "scribeMode")?.data ?? node.payload.scribeMode ?? Enum.Common.scribeMode.Inscribe);
    const trueRadius = getTrueRadius(radius, scribeMode, count);

    if (socket === "eCircumradius") {
        const [, unit] = Length.Emptyable.parse(Length.Emptyable.max(radiusStr, "0px")) ?? [null, null];
        if (unit === null) return null;
        return { kind: "length", data: `${getDerivedRadius(trueRadius, "Circumscribe", count)}${unit}` };
    }
    if (socket === "eApothem") {
        const [, unit] = Length.Emptyable.parse(Length.Emptyable.max(radiusStr, "0px")) ?? [null, null];
        if (unit === null) return null;
        return { kind: "length", data: `${getDerivedRadius(trueRadius, "Inscribe", count)}${unit}` };
    }

    if (socket === "output") {
        const distro = context.resolve<"distribution">(node.id, "pointDistro")?.data ?? { func: Enum.Common.distroFunctions.Linear, easing: Enum.Common.distroEasing.In, intensity: "1" };
        const distroLerper = distroInterpolator(
            Enum.keyOf(Enum.Common.distroFunctions, distro.func),
            Enum.keyOf(Enum.Common.distroEasing, distro.easing),
            NumericString.Emptyable.asNumber(distro.intensity) ?? 1,
        );

        const memberAlign = context.resolve<"boolean">(node.id, "memberAlign")?.data ?? node.payload.memberAlign;
        const memberRotation = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "memberRotation")?.data ?? node.payload.memberRotation) ?? 0;

        const [groupTransforms, { translateX, translateY }] = Transforms.evaluate(node, context);

        const children = [];
        for (let i = 0; i < count; i++) {
            const shape = context.resolve<"shape">(node.id, "input", i)?.data ?? null;
            if (shape === null) continue;

            // Vertex angle with distribution applied, starting at top (-90°)
            const coeff = lerp(delerp(i, 0, count), 0, 360, distroLerper);
            const angleDeg = coeff - 90;
            const angleRad = deg2rad(angleDeg);
            const vx = trueRadius * Math.cos(angleRad);
            const vy = trueRadius * Math.sin(angleRad);

            const childTransforms: string[] = [];
            childTransforms.push(`translate(${vx}, ${vy})`);

            // Per-child rotation: alignment + memberRotation
            const alignAngle = memberAlign ? angleDeg + 90 : 0;
            const totalChildRotation = alignAngle + memberRotation;
            if (totalChildRotation !== 0) {
                childTransforms.push(`rotate(${totalChildRotation})`);
            }

            children.push({
                ...shape,
                transform: [childTransforms.join(" "), shape.transform].filter(Boolean).join(" "),
            });
        }

        const group: GroupShape = {
            type: "group",
            children,
            transform: groupTransforms.join(" "),
            preview: { x: -trueRadius + translateX, y: -trueRadius + translateY, w: 2 * trueRadius, h: 2 * trueRadius },
        };

        return { kind: "shape", data: group };
    }

    return null;
};

const POLYGON_ARRAY_SOCKET_TYPES: Record<string, string> = {
    input: "shape",
    count: "integer",
    radius: "length",
    scribeMode: "enum",
    memberAlign: "boolean",
    memberRotation: "angle",
    pointDistro: "distribution",
    positionMode: "enum",
    positionX: "length",
    positionY: "length",
    positionRadius: "length",
    positionTheta: "angle",
    rotation: "angle",
    output: "shape",
    sequence: "sequence",
    eCircumradius: "length",
    eApothem: "length",
};

const getSocketType = (_node: NodeDefinitions.NodeFor<PolygonArrayDefinition>, socketId: string, _side: "in" | "out"): string => POLYGON_ARRAY_SOCKET_TYPES[socketId] ?? "shape";

export const PolygonArrayNodeType: NodeTypes.Type<"polygonArray", PolygonArrayDefinition> = {
    type: "polygonArray",
    displayName: "Polygon Array",
    defaultLabel: "Polygon Array",
    iconNode: <Icon shape={NODE_ICONS.vertexArray.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.vertexArray.Card} color={"var(--icon-flavour)"} />,
    category: "Collections",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
