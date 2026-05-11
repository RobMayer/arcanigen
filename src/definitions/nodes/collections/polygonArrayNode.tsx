import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { NumericString } from "../../datatypes/numericString";
import { deg2rad, delerp, distroInterpolator, getDerivedRadius, getTrueRadius, lerp } from "../../../util/misc";
import { Transforms } from "../abstract";
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
            scribeMode: input.scribeMode ?? Enum.Common.scribeMode.INSCRIBE.value,
            memberAlign: input.memberAlign ?? false,
            memberRotation: input.memberRotation ?? "0",
            // transforms
            positionMode: Enum.Common.positionMode.CARTESIAN.value,
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

    const graphId = useGraphId();
    const previewCircumradius = Project.useCachedOutput(graphId, node, "eCircumradius");
    const previewApothem = Project.useCachedOutput(graphId, node, "eApothem");
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
                <IntegerInput.SliderInput value={node.payload.count} onCommit={(count) => handleUpdate({ count })} disabled={node.in.count !== null} min={"3"} max={"64"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"radius"} label={"Radius"}>
                <LengthInput value={node.payload.radius} onCommit={(radius) => handleUpdate({ radius })} disabled={node.in.radius !== null} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"scribeMode"} label={"Scribe Mode"}>
                <RadioButton.Group
                    orientation={"horizontal"}
                    value={`${node.payload.scribeMode}`}
                    onValue={(v) => handleUpdate({ scribeMode: Number(v) })}
                    disabled={node.in.scribeMode !== null}
                    options={SCRIBE_MODE_OPTIONS}
                />
            </SocketIn>
            <NodeAccordion label={"More"} nodeId={node.id} socketsIn={"pointDistro|memberAlign|memberRotation"}>
                <SocketIn node={node} socketId={"pointDistro"}>
                    Angular Distribution
                </SocketIn>
                <SocketIn node={node} socketId={"memberAlign"}>
                    <CheckBox checked={node.payload.memberAlign} onToggle={(memberAlign) => handleUpdate({ memberAlign })} disabled={node.in.memberAlign !== null}>
                        Align to Path
                    </CheckBox>
                </SocketIn>
                <SocketIn node={node} socketId={"memberRotation"} label={"Member Rotation"}>
                    <AngleInput.SliderInput value={node.payload.memberRotation} onCommit={(memberRotation) => handleUpdate({ memberRotation })} disabled={node.in.memberRotation !== null} />
                </SocketIn>
            </NodeAccordion>
            <Transforms.Controls node={node} handleUpdate={handleUpdate} accordion />
            <NodeAccordion nodeId={node.id} label={"Additional Outputs"} socketsOut={"eCircumradius|eApothem"}>
                <SocketOut node={node} socketId={"eCircumradius"} label={"Circumradius"}>
                    <ValuePreview value={previewCircumradius} />
                </SocketOut>
                <SocketOut node={node} socketId={"eApothem"} label={"Apothem"}>
                    <ValuePreview value={previewApothem} />
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

const evaluate = (node: NodeDefinitions.NodeFor<PolygonArrayDefinition>, socket: keyof PolygonArrayDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const countStr = context.resolve<"integer">(node.id, "count")?.data ?? node.payload.count;
    const count = Math.round(Math.max(3, Math.min(64, NumericString.Emptyable.asNumber(countStr) ?? NaN)));
    if (!isFinite(count)) return null;

    if (socket === "sequence") {
        return { kind: "sequence", data: { senderId: node.id, count } };
    }

    const radiusStr = context.resolve<"length">(node.id, "radius")?.data ?? node.payload.radius;
    const radius = Length.Emptyable.asNumber(Length.Emptyable.max(radiusStr, "0px"));
    if (radius === null) return null;

    const scribeMode = Enum.keyOf(Enum.Common.scribeMode, context.resolve<"enum">(node.id, "scribeMode")?.data ?? node.payload.scribeMode ?? Enum.Common.scribeMode.INSCRIBE.value);
    const trueRadius = getTrueRadius(radius, scribeMode, count);

    if (socket === "eCircumradius") {
        const [, unit] = Length.Emptyable.parse(Length.Emptyable.max(radiusStr, "0px")) ?? [null, null];
        if (unit === null) return null;
        return { kind: "length", data: `${getDerivedRadius(trueRadius, "CIRCUMSCRIBE", count)}${unit}` };
    }
    if (socket === "eApothem") {
        const [, unit] = Length.Emptyable.parse(Length.Emptyable.max(radiusStr, "0px")) ?? [null, null];
        if (unit === null) return null;
        return { kind: "length", data: `${getDerivedRadius(trueRadius, "INSCRIBE", count)}${unit}` };
    }

    if (socket === "output") {
        const distro = context.resolve<"distribution">(node.id, "pointDistro")?.data ?? { func: Enum.Common.distroFunctions.LINEAR.value, easing: Enum.Common.distroEasing.IN.value, intensity: "1" };
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
            const shape = context.resolve<"shape">(node.id, "input", { ...context.sequenceData, [node.id]: i })?.data ?? null;
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

const SOCKETTYPES_IN: { [key in keyof Required<PolygonArrayDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    input: { types: ["shape"], mode: "or" },
    count: { types: ["integer"], mode: "or" },
    radius: { types: ["length"], mode: "or" },
    scribeMode: { types: ["enum"], mode: "or" },
    memberAlign: { types: ["boolean"], mode: "or" },
    memberRotation: { types: ["angle"], mode: "or" },
    pointDistro: { types: ["distribution"], mode: "or" },
    ...Transforms.IN_SOCKET_TYPES,
};

const SOCKETTYPES_OUT: { [key in keyof Required<PolygonArrayDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["shape"], mode: "and" },
    sequence: { types: ["sequence"], mode: "and" },
    eCircumradius: { types: ["length"], mode: "and" },
    eApothem: { types: ["length"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<PolygonArrayDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const PolygonArrayNodeType: NodeTypes.Type<"polygonArray", PolygonArrayDefinition> = {
    type: "polygonArray",
    displayName: "Polygon Array",
    defaultLabel: "Polygon Array",
    iconNode: <Icon shape={NODE_ICONS.squareArrangement} color={"var(--icon-flavour)"} />,
    category: "Collections",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
