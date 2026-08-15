import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject } from "../../helpers/nodeHelper";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Angle } from "../../datatypes/angle";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { SocketTypes } from "../../socketTypes";
import { Project } from "../../../state/project";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { NumericString } from "../../datatypes/numericString";
import { deg2rad, delerp, distroInterpolator, lerp } from "../../../util/misc";
import { TransformPrefab } from "../../helpers/transformPrefab";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { GroupShape } from "../../shapeTypes";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: {
        input: "shape",
        count: "integer",
        radius: "length",
        arcMode: "enum",
        thetaStart: "angle",
        sweep: "angle",
        thetaFrom: "angle",
        thetaTo: "angle",
        thetaInclusive: "boolean",
        thetaCurve: "distribution",
        memberAlign: "boolean",
        memberRotation: "angle",
        ...TransformPrefab.SIG_IN,
    },
    out: { output: "shape", sequence: "sequence" },
});

export type RadialLayoutDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        count: DataTypes.TypeOf<DataTypes.Integer>;
        radius: DataTypes.TypeOf<DataTypes.Length>;
        arcMode: DataTypes.TypeOf<DataTypes.Enum>;
        thetaStart: DataTypes.TypeOf<DataTypes.Angle>;
        sweep: DataTypes.TypeOf<DataTypes.Angle>;
        thetaFrom: DataTypes.TypeOf<DataTypes.Angle>;
        thetaTo: DataTypes.TypeOf<DataTypes.Angle>;
        thetaInclusive: boolean;
        memberAlign: boolean;
        memberRotation: DataTypes.TypeOf<DataTypes.Angle>;
    } & TransformPrefab.Definition["payload"]
>;

const ARC_MODE_OPTIONS = Enum.options(Enum.Common.arcMode);

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<RadialLayoutDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"radialLayout", RadialLayoutDefinition> => {
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
            radius: input.radius ?? "100px",
            arcMode: input.arcMode ?? Enum.Common.arcMode.START_SWEEP.value,
            thetaStart: input.thetaStart ?? "0deg",
            sweep: input.sweep ?? "360deg",
            thetaFrom: input.thetaFrom ?? "0deg",
            thetaTo: input.thetaTo ?? "360deg",
            thetaInclusive: input.thetaInclusive ?? false,
            memberAlign: input.memberAlign ?? false,
            memberRotation: input.memberRotation ?? "0deg",
            // transforms
            position: { ...TransformPrefab.POSITION_DEFAULT },
            rotation: "0deg",
        },
        type: "radialLayout",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<RadialLayoutDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<RadialLayoutDefinition>>) => {
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
            <TransformPrefab.Controls node={node} handleUpdate={handleUpdate} accordion />
        </TypicalNode>
    );
};

const GEOMETRY_INPUTS: (keyof RadialLayoutDefinition["inputs"])[] = [
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
    "position",
    "rotation",
];

const dependsOn = (_node: NodeDefinitions.NodeFor<RadialLayoutDefinition>, outSocket: keyof RadialLayoutDefinition["outputs"], _deps: AllDeps): (keyof RadialLayoutDefinition["inputs"])[] => {
    if (outSocket === "output") {
        return GEOMETRY_INPUTS;
    }
    if (outSocket === "sequence") {
        return ["count"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<RadialLayoutDefinition>, inSocket: keyof RadialLayoutDefinition["inputs"], _deps: AllDeps): (keyof RadialLayoutDefinition["outputs"])[] => {
    if (inSocket === "count") {
        return ["output", "sequence"];
    }
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<RadialLayoutDefinition>, socket: keyof RadialLayoutDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const countStr = context.resolve<DataTypes.Integer>(node.id, "count")?.data ?? node.payload.count;
    const count = Math.round(Math.max(1, Math.min(64, NumericString.Emptyable.asNumber(countStr) ?? NaN)));
    if (!isFinite(count)) return null;

    if (socket === "sequence") {
        return { kind: "sequence", data: { senderId: node.id, count } };
    }

    if (socket !== "output") return null;

    const radius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "radius")?.data ?? node.payload.radius, "0px")) ?? 0;

    const arcMode = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "arcMode")?.data, Enum.Common.arcMode) ?? node.payload.arcMode ?? 0;

    let effectiveStart: number;
    let effectiveSweep: number;

    if (arcMode === Enum.Common.arcMode.FROM_TO.value) {
        const from = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "thetaFrom")?.data ?? node.payload.thetaFrom) ?? 0;
        const to = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "thetaTo")?.data ?? node.payload.thetaTo) ?? 0;
        effectiveStart = from;
        effectiveSweep = to - from;
    } else {
        effectiveStart = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "thetaStart")?.data ?? node.payload.thetaStart) ?? 0;
        effectiveSweep = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "sweep")?.data ?? node.payload.sweep) ?? 0;
    }

    const thetaInclusive = context.resolve<DataTypes.Boolean>(node.id, "thetaInclusive")?.data ?? node.payload.thetaInclusive ?? false;

    const distro = context.resolve<DataTypes.Distribution>(node.id, "thetaCurve")?.data ?? { func: Enum.Common.distroFunctions.LINEAR.value, easing: Enum.Common.distroEasing.IN.value, intensity: "1" };
    const distroLerper = distroInterpolator(
        Enum.keyOf(Enum.Common.distroFunctions, distro.func),
        Enum.keyOf(Enum.Common.distroEasing, distro.easing),
        NumericString.Emptyable.asNumber(distro.intensity) ?? 1,
    );

    const memberAlign = context.resolve<DataTypes.Boolean>(node.id, "memberAlign")?.data ?? node.payload.memberAlign;
    const memberRotation = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "memberRotation")?.data ?? node.payload.memberRotation) ?? 0;

    const [groupTransforms, { translateX, translateY }] = TransformPrefab.evaluate(node, context);

    const denominator = thetaInclusive ? Math.max(1, count - 1) : count;

    const children = [];
    for (let i = 0; i < count; i++) {
        const shape = context.resolve<DataTypes.Shape>(node.id, "input", { ...context.cursorData, [node.id]: i })?.data ?? null;
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

export const RadialLayoutNodeType: NodeTypes.Type<"radialLayout", RadialLayoutDefinition> = {
    type: "radialLayout",
    displayName: "Radial Layout",
    defaultLabel: "Radial Layout",
    iconNode: <NodeIcon shape={NODE_ICONS.shapeArc} modifierIcon={NODE_ICONS.modifiers.patternFor} />,
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
