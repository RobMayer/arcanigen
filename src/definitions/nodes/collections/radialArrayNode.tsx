import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
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

export type RadialArrayDefinition = {
    inputs: {
        input: DataTypes.Use<"shape">;
        count: DataTypes.Use<"integer">;
        radius: DataTypes.Use<"length">;
        thetaMode: DataTypes.Use<"enum">;
        thetaStart: DataTypes.Use<"angle">;
        thetaEnd: DataTypes.Use<"angle">;
        thetaSteps: DataTypes.Use<"angle">;
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
        thetaMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        thetaStart: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        thetaEnd: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        thetaSteps: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        thetaInclusive: boolean;
        memberAlign: boolean;
        memberRotation: DataTypes.TypeOf<DataTypes.Use<"angle">>;
    } & Transforms.Definition["payload"];
};

const THETA_MODE_OPTIONS = Enum.options(Enum.Common.thetaMode);

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<RadialArrayDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"radialArray", RadialArrayDefinition> => {
    return {
        id,
        in: {
            input: null,
            count: null,
            radius: null,
            thetaMode: null,
            thetaStart: null,
            thetaEnd: null,
            thetaSteps: null,
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
            thetaMode: input.thetaMode ?? Enum.Common.thetaMode.INCREMENTAL.value,
            thetaStart: input.thetaStart ?? "0",
            thetaEnd: input.thetaEnd ?? "360",
            thetaSteps: input.thetaSteps ?? "72",
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
        type: "radialArray",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<RadialArrayDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<RadialArrayDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const isStartStop = node.payload.thetaMode === Enum.Common.thetaMode.START_STOP.value && node.in.thetaMode === null;
    const isIncremental = node.payload.thetaMode === Enum.Common.thetaMode.INCREMENTAL.value && node.in.thetaMode === null;

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
                <IntegerInput.SliderInput value={node.payload.count} onCommit={(count) => handleUpdate({ count })} disabled={node.in.count !== null} min={"1"} max={"64"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"radius"} type={"length"} label={"Radius"}>
                <LengthInput value={node.payload.radius} onCommit={(radius) => handleUpdate({ radius })} disabled={node.in.radius !== null} min={"0px"} required />
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"thetaMode"} type={"enum"} label={"Theta Mode"}>
                <RadioButton.Group
                    options={THETA_MODE_OPTIONS}
                    value={`${node.payload.thetaMode}`}
                    onValue={(v) => handleUpdate({ thetaMode: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.thetaMode !== null}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"thetaStart"} type={"angle"} label={"Start Theta"}>
                <AngleInput.SliderInput value={node.payload.thetaStart} onCommit={(thetaStart) => handleUpdate({ thetaStart })} disabled={node.in.thetaStart !== null || isIncremental} unbound />
            </SocketIn>
            <SocketIn node={node} socketId={"thetaEnd"} type={"angle"} label={"End Theta"}>
                <AngleInput.SliderInput value={node.payload.thetaEnd} onCommit={(thetaEnd) => handleUpdate({ thetaEnd })} disabled={node.in.thetaEnd !== null || isIncremental} unbound />
            </SocketIn>
            <SocketIn node={node} socketId={"thetaInclusive"} type={"boolean"}>
                <CheckBox checked={node.payload.thetaInclusive} onToggle={(thetaInclusive) => handleUpdate({ thetaInclusive })} disabled={node.in.thetaInclusive !== null || isIncremental}>
                    Inclusive End
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"thetaSteps"} type={"angle"} label={"Step Theta"}>
                <AngleInput.SliderInput value={node.payload.thetaSteps} onCommit={(thetaSteps) => handleUpdate({ thetaSteps })} disabled={node.in.thetaSteps !== null || isStartStop} unbound />
            </SocketIn>
            <SocketIn node={node} socketId={"thetaCurve"} type={"distribution"}>
                Angular Distribution
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"memberAlign"} type={"boolean"}>
                <CheckBox checked={node.payload.memberAlign} onToggle={(memberAlign) => handleUpdate({ memberAlign })} disabled={node.in.memberAlign !== null}>
                    Align to Radius
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"memberRotation"} type={"angle"} label={"Member Rotation"}>
                <AngleInput.SliderInput value={node.payload.memberRotation} onCommit={(memberRotation) => handleUpdate({ memberRotation })} disabled={node.in.memberRotation !== null} />
            </SocketIn>
            <Transforms.Controls node={node} handleUpdate={handleUpdate} accordion />
        </TypicalNode>
    );
};

const GEOMETRY_INPUTS: (keyof RadialArrayDefinition["inputs"])[] = [
    "input",
    "count",
    "radius",
    "thetaMode",
    "thetaStart",
    "thetaEnd",
    "thetaSteps",
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

const dependsOn = (_node: NodeDefinitions.NodeFor<RadialArrayDefinition>, outSocket: keyof RadialArrayDefinition["outputs"], _deps: AllDeps): (keyof RadialArrayDefinition["inputs"])[] => {
    if (outSocket === "output") {
        return GEOMETRY_INPUTS;
    }
    if (outSocket === "sequence") {
        return ["count"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<RadialArrayDefinition>, inSocket: keyof RadialArrayDefinition["inputs"], _deps: AllDeps): (keyof RadialArrayDefinition["outputs"])[] => {
    if (inSocket === "count") {
        return ["output", "sequence"];
    }
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<RadialArrayDefinition>, socket: keyof RadialArrayDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const countStr = context.resolve<"integer">(node.id, "count")?.data ?? node.payload.count;
    const count = NumericString.Emptyable.asNumber(countStr);
    if (count === null || count < 1) return null;

    if (socket === "sequence") {
        return { kind: "sequence", data: { senderId: node.id, count } };
    }

    if (socket !== "output") return null;

    const radius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "radius")?.data ?? node.payload.radius, "0px")) ?? 0;

    const thetaMode = Enum.resolve(context.resolve<"enum">(node.id, "thetaMode")?.data, Enum.Common.thetaMode) ?? node.payload.thetaMode ?? 0;
    const thetaStart = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "thetaStart")?.data ?? node.payload.thetaStart) ?? 0;
    const thetaEnd = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "thetaEnd")?.data ?? node.payload.thetaEnd) ?? 0;
    const thetaSteps = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "thetaSteps")?.data ?? node.payload.thetaSteps) ?? 0;
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
        const angle = thetaMode === Enum.Common.thetaMode.START_STOP.value ? lerp(coeff, thetaStart, thetaEnd, distroLerper) : lerp(coeff, 0, count * thetaSteps, distroLerper);
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

const SOCKETTYPES_IN: { [key in keyof Required<RadialArrayDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    input: { types: ["shape"], mode: "or" },
    count: { types: ["integer"], mode: "or" },
    radius: { types: ["length"], mode: "or" },
    thetaMode: { types: ["enum"], mode: "or" },
    thetaStart: { types: ["angle"], mode: "or" },
    thetaEnd: { types: ["angle"], mode: "or" },
    thetaSteps: { types: ["angle"], mode: "or" },
    thetaInclusive: { types: ["boolean"], mode: "or" },
    thetaCurve: { types: ["distribution"], mode: "or" },
    memberAlign: { types: ["boolean"], mode: "or" },
    memberRotation: { types: ["angle"], mode: "or" },
    ...Transforms.IN_SOCKET_TYPES,
};

const SOCKETTYPES_OUT: { [key in keyof Required<RadialArrayDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["shape"], mode: "and" },
    sequence: { types: ["sequence"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<RadialArrayDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const RadialArrayNodeType: NodeTypes.Type<"radialArray", RadialArrayDefinition> = {
    type: "radialArray",
    displayName: "Radial Array",
    defaultLabel: "Radial Array",
    iconNode: <Icon shape={NODE_ICONS.repeatArray.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.repeatArray.Card} color={"var(--icon-flavour)"} />,
    category: "Collections",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
