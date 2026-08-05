import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { NumericString } from "../../datatypes/numericString";
import { deg2rad, delerp, distroInterpolator, lerp } from "../../../util/misc";
import { Transforms } from "../abstract";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { GroupShape } from "../../shapeTypes";

export type RadialPatternDefinition = {
    inputs: {
        input: DataTypes.Use<"shape">;
        count: DataTypes.Use<"integer">;
        radius: DataTypes.Use<"length">;
        arcMode: DataTypes.Use<"enum">;
        thetaStart: DataTypes.Use<"angle">;
        sweep: DataTypes.Use<"angle">;
        thetaFrom: DataTypes.Use<"angle">;
        thetaTo: DataTypes.Use<"angle">;
        thetaInclusive: DataTypes.Use<"boolean">;
        thetaCurve: DataTypes.Use<"distribution">;
        memberAlign: DataTypes.Use<"boolean">;
        memberRotation: DataTypes.Use<"angle">;
    } & Transforms.Definition["inputs"];
    outputs: {
        output: DataTypes.Use<"shape">;
        sequence: DataTypes.Use<"sequence">;
    };
    payload: {
        label: string;
        count: DataTypes.TypeOf<DataTypes.Use<"integer">>;
        radius: DataTypes.TypeOf<DataTypes.Use<"length">>;
        arcMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        thetaStart: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        sweep: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        thetaFrom: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        thetaTo: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        thetaInclusive: boolean;
        memberAlign: boolean;
        memberRotation: DataTypes.TypeOf<DataTypes.Use<"angle">>;
    } & Transforms.Definition["payload"];
};

const ARC_MODE_OPTIONS = Enum.options(Enum.Common.arcMode);

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<RadialPatternDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"radialPattern", RadialPatternDefinition> => {
    return {
        id,
        in: {
            input: null,
            count: null,
            radius: null,
            arcMode: null,
            thetaStart: null,
            sweep: null,
            thetaFrom: null,
            thetaTo: null,
            thetaInclusive: null,
            thetaCurve: null,
            memberAlign: null,
            memberRotation: null,
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
            radius: input.radius ?? "100px",
            arcMode: input.arcMode ?? Enum.Common.arcMode.START_SWEEP.value,
            thetaStart: input.thetaStart ?? "0",
            sweep: input.sweep ?? "360",
            thetaFrom: input.thetaFrom ?? "0",
            thetaTo: input.thetaTo ?? "360",
            thetaInclusive: input.thetaInclusive ?? false,
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
        type: "radialPattern",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<RadialPatternDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<RadialPatternDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const isStartSweep = node.payload.arcMode === Enum.Common.arcMode.START_SWEEP.value && node.in.arcMode === null;
    const isFromTo = node.payload.arcMode === Enum.Common.arcMode.FROM_TO.value && node.in.arcMode === null;

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
            <SocketIn node={node} socketId={"radius"} label={"Radius"}>
                <LengthInput value={node.payload.radius} onCommit={(radius) => handleUpdate({ radius })} disabled={node.in.radius !== null} min={"0px"} required />
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"arcMode"} label={"Arc Mode"}>
                <RadioButton.Group
                    options={ARC_MODE_OPTIONS}
                    value={`${node.payload.arcMode}`}
                    onValue={(v) => handleUpdate({ arcMode: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.arcMode !== null}
                />
            </SocketIn>

            <SocketIn node={node} socketId={"thetaStart"} label={"Start"}>
                <AngleInput.SliderInput value={node.payload.thetaStart} onCommit={(thetaStart) => handleUpdate({ thetaStart })} disabled={node.in.thetaStart !== null || isFromTo} unbound />
            </SocketIn>
            <SocketIn node={node} socketId={"sweep"} label={"Sweep"}>
                <AngleInput.SliderInput value={node.payload.sweep} onCommit={(sweep) => handleUpdate({ sweep })} disabled={node.in.sweep !== null || isFromTo} unbound min={-360} max={360} />
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"thetaFrom"} label={"From"}>
                <AngleInput.SliderInput value={node.payload.thetaFrom} onCommit={(thetaFrom) => handleUpdate({ thetaFrom })} disabled={node.in.thetaFrom !== null || isStartSweep} unbound />
            </SocketIn>
            <SocketIn node={node} socketId={"thetaTo"} label={"To"}>
                <AngleInput.SliderInput value={node.payload.thetaTo} onCommit={(thetaTo) => handleUpdate({ thetaTo })} disabled={node.in.thetaTo !== null || isStartSweep} unbound />
            </SocketIn>
            <NodeAccordion nodeId={node.id} label={"More"} socketsIn={"thetaInclusive|thetaCurve|memberAlign|memberRotation"}>
                <SocketIn node={node} socketId={"thetaInclusive"}>
                    <CheckBox checked={node.payload.thetaInclusive} onToggle={(thetaInclusive) => handleUpdate({ thetaInclusive })} disabled={node.in.thetaInclusive !== null}>
                        Inclusive End
                    </CheckBox>
                </SocketIn>
                <SocketIn node={node} socketId={"thetaCurve"}>
                    Angular Distribution
                </SocketIn>
                <hr />
                <SocketIn node={node} socketId={"memberAlign"}>
                    <CheckBox checked={node.payload.memberAlign} onToggle={(memberAlign) => handleUpdate({ memberAlign })} disabled={node.in.memberAlign !== null}>
                        Align to Radius
                    </CheckBox>
                </SocketIn>
                <SocketIn node={node} socketId={"memberRotation"} label={"Member Rotation"}>
                    <AngleInput.SliderInput value={node.payload.memberRotation} onCommit={(memberRotation) => handleUpdate({ memberRotation })} disabled={node.in.memberRotation !== null} />
                </SocketIn>
            </NodeAccordion>
            <Transforms.Controls node={node} handleUpdate={handleUpdate} accordion />
        </TypicalNode>
    );
};

const GEOMETRY_INPUTS: (keyof RadialPatternDefinition["inputs"])[] = [
    "input",
    "count",
    "radius",
    "arcMode",
    "thetaStart",
    "sweep",
    "thetaFrom",
    "thetaTo",
    "thetaInclusive",
    "thetaCurve",
    "memberAlign",
    "memberRotation",
    "positionMode",
    "positionX",
    "positionY",
    "positionRadius",
    "positionTheta",
    "rotation",
];

const dependsOn = (_node: NodeDefinitions.NodeFor<RadialPatternDefinition>, outSocket: keyof RadialPatternDefinition["outputs"], _deps: AllDeps): (keyof RadialPatternDefinition["inputs"])[] => {
    if (outSocket === "output") {
        return GEOMETRY_INPUTS;
    }
    if (outSocket === "sequence") {
        return ["count"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<RadialPatternDefinition>, inSocket: keyof RadialPatternDefinition["inputs"], _deps: AllDeps): (keyof RadialPatternDefinition["outputs"])[] => {
    if (inSocket === "count") {
        return ["output", "sequence"];
    }
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<RadialPatternDefinition>, socket: keyof RadialPatternDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const countStr = context.resolve<"integer">(node.id, "count")?.data ?? node.payload.count;
    const count = Math.round(Math.max(1, Math.min(64, NumericString.Emptyable.asNumber(countStr) ?? NaN)));
    if (!isFinite(count)) return null;

    if (socket === "sequence") {
        return { kind: "sequence", data: { senderId: node.id, count } };
    }

    if (socket !== "output") return null;

    const radius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "radius")?.data ?? node.payload.radius, "0px")) ?? 0;

    const arcMode = Enum.resolve(context.resolve<"enum">(node.id, "arcMode")?.data, Enum.Common.arcMode) ?? node.payload.arcMode ?? 0;

    let effectiveStart: number;
    let effectiveSweep: number;

    if (arcMode === Enum.Common.arcMode.FROM_TO.value) {
        const from = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "thetaFrom")?.data ?? node.payload.thetaFrom) ?? 0;
        const to = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "thetaTo")?.data ?? node.payload.thetaTo) ?? 0;
        effectiveStart = from;
        effectiveSweep = to - from;
    } else {
        effectiveStart = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "thetaStart")?.data ?? node.payload.thetaStart) ?? 0;
        effectiveSweep = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "sweep")?.data ?? node.payload.sweep) ?? 0;
    }

    const thetaInclusive = context.resolve<"boolean">(node.id, "thetaInclusive")?.data ?? node.payload.thetaInclusive ?? false;

    const distro = context.resolve<"distribution">(node.id, "thetaCurve")?.data ?? { func: Enum.Common.distroFunctions.LINEAR.value, easing: Enum.Common.distroEasing.IN.value, intensity: "1" };
    const distroLerper = distroInterpolator(
        Enum.keyOf(Enum.Common.distroFunctions, distro.func),
        Enum.keyOf(Enum.Common.distroEasing, distro.easing),
        NumericString.Emptyable.asNumber(distro.intensity) ?? 1,
    );

    const memberAlign = context.resolve<"boolean">(node.id, "memberAlign")?.data ?? node.payload.memberAlign;
    const memberRotation = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "memberRotation")?.data ?? node.payload.memberRotation) ?? 0;

    const [groupTransforms, { translateX, translateY }] = Transforms.evaluate(node, context);

    const denominator = thetaInclusive ? Math.max(1, count - 1) : count;

    const children = [];
    for (let i = 0; i < count; i++) {
        const shape = context.resolve<"shape">(node.id, "input", { ...context.sequenceData, [node.id]: i })?.data ?? null;
        if (shape === null) continue;

        const coeff = delerp(i, 0, denominator);
        const angle = lerp(coeff, effectiveStart, effectiveStart + effectiveSweep, distroLerper);
        const angleDeg = angle - 90;
        const angleRad = deg2rad(angleDeg);
        const vx = radius * Math.cos(angleRad);
        const vy = radius * Math.sin(angleRad);

        const childTransforms: string[] = [];
        childTransforms.push(`translate(${vx}, ${vy})`);

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
        preview: { x: -radius + translateX, y: -radius + translateY, w: 2 * radius, h: 2 * radius },
    };

    return { kind: "shape", data: group };
};

const SOCKETTYPES_IN: { [key in keyof Required<RadialPatternDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    input: { types: ["shape"], mode: "or" },
    count: { types: ["integer"], mode: "or" },
    radius: { types: ["length"], mode: "or" },
    arcMode: { types: ["enum"], mode: "or" },
    thetaStart: { types: ["angle"], mode: "or" },
    sweep: { types: ["angle"], mode: "or" },
    thetaFrom: { types: ["angle"], mode: "or" },
    thetaTo: { types: ["angle"], mode: "or" },
    thetaInclusive: { types: ["boolean"], mode: "or" },
    thetaCurve: { types: ["distribution"], mode: "or" },
    memberAlign: { types: ["boolean"], mode: "or" },
    memberRotation: { types: ["angle"], mode: "or" },
    ...Transforms.IN_SOCKET_TYPES,
};

const SOCKETTYPES_OUT: { [key in keyof Required<RadialPatternDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["shape"], mode: "and" },
    sequence: { types: ["sequence"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<RadialPatternDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const RadialPatternNodeType: NodeTypes.Type<"radialPattern", RadialPatternDefinition> = {
    type: "radialPattern",
    displayName: "Radial Pattern",
    defaultLabel: "Radial Pattern",
    iconNode: <NodeIcon shape={NODE_ICONS.shapeArc} modifierIcon={NODE_ICONS.modifiers.patternFor} />,
    flavour: "danger",
    category: "Modifiers",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
