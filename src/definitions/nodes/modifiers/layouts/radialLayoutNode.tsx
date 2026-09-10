import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject } from "../../../helpers/nodeHelper";
import { NodeIcon, NODE_ICONS } from "../../../../components/Icon";
import { Resolver } from "../../../../util/resolver";
import { Length } from "../../../datatypes/length";
import { Angle } from "../../../datatypes/angle";
import { Enum } from "../../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../../features/nodeview/slots";
import { LengthInput } from "../../../../components/inputs/LengthInput";
import { RadioButton } from "../../../../components/buttons/RadioButton";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../../nodeTypes";
import { DataTypes } from "../../../dataTypes";
import { SocketTypes } from "../../../socketTypes";
import { Project } from "../../../../state/project";
import { IntegerInput } from "../../../../components/inputs/IntegerInput";
import { NumericString } from "../../../datatypes/numericString";
import { deg2rad, delerp, distroInterpolator, lerp } from "../../../../util/misc";
import { TransformPrefab } from "../../../helpers/transformPrefab";
import { CheckBox } from "../../../../components/buttons/CheckBox";
import { AngleInput } from "../../../../components/inputs/AngleInput";
import { GroupShape } from "../../../shapeTypes";
import { signature, SignatureBuilder } from "../../../helpers/signatureBuilder";
import { SignatureEngine } from "../../../helpers/signatureEngine";

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
        thetaDirection: "angle",
        thetaSpread: "angle",
        flexSolveMode: "enum",
        thetaStep: "angle",
        flexJustify: "enum",
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
        thetaDirection: DataTypes.TypeOf<DataTypes.Angle>;
        thetaSpread: DataTypes.TypeOf<DataTypes.Angle>;
        flexSolveMode: DataTypes.TypeOf<DataTypes.Enum>;
        thetaStep: DataTypes.TypeOf<DataTypes.Angle>;
        flexJustify: DataTypes.TypeOf<DataTypes.Enum>;
        thetaInclusive: boolean;
        memberAlign: boolean;
        memberRotation: DataTypes.TypeOf<DataTypes.Angle>;
    } & TransformPrefab.Definition["payload"]
>;

const ARC_MODE_OPTIONS = Enum.options(Enum.Common.arcMode);
const FLEX_SOLVE_OPTIONS = Enum.options(Enum.Common.flexSolveMode);
const FLEX_JUSTIFY_OPTIONS = Enum.options(Enum.Common.flexJustify);

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
            thetaDirection: null,
            thetaSpread: null,
            flexSolveMode: null,
            thetaStep: null,
            flexJustify: null,
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
            thetaDirection: input.thetaDirection ?? "0deg",
            thetaSpread: input.thetaSpread ?? "90deg",
            flexSolveMode: input.flexSolveMode ?? Enum.Common.flexSolveMode.SPACING.value,
            thetaStep: input.thetaStep ?? "30deg",
            flexJustify: input.flexJustify ?? Enum.Common.flexJustify.AROUND.value,
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
    const isDirectionSpread = node.payload.arcMode === Enum.Common.arcMode.DIRECTION_SPREAD.value && node.in.arcMode === null;
    const isSpacingMode = node.payload.flexSolveMode === Enum.Common.flexSolveMode.COUNT.value && node.in.flexSolveMode === null;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"input"}>
                Shape
            </SocketIn>
            <SocketOut node={node} socketId={"sequence"}>
                Sequence
            </SocketOut>
            <SocketIn node={node} socketId={"radius"} label={"Radius"}>
                <LengthInput value={node.payload.radius} onCommit={(radius) => handleUpdate({ radius })} disabled={node.in.radius !== null} min={"0px"} required />
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"flexSolveMode"} label={"Solve For"}>
                <RadioButton.Group options={FLEX_SOLVE_OPTIONS} value={`${node.payload.flexSolveMode}`} onValue={(v) => handleUpdate({ flexSolveMode: Number(v) })} orientation={"horizontal"} disabled={node.in.flexSolveMode !== null} />
            </SocketIn>
            <NodeAccordion nodeId={node.id} socketsIn="count|thetaInclusive" label="By Count">
                <SocketIn node={node} socketId={"count"} label={"Count"}>
                    <IntegerInput.SliderInput value={node.payload.count} onCommit={(count) => handleUpdate({ count })} disabled={node.in.count !== null || isSpacingMode} min={"1"} max={"64"} required />
                </SocketIn>
                <SocketIn node={node} socketId={"thetaInclusive"}>
                    <CheckBox checked={node.payload.thetaInclusive} onToggle={(thetaInclusive) => handleUpdate({ thetaInclusive })} disabled={node.in.thetaInclusive !== null || isSpacingMode}>
                        Inclusive End
                    </CheckBox>
                </SocketIn>
            </NodeAccordion>
            <NodeAccordion nodeId={node.id} socketsIn={"thetaStep|flexJustify"} label={"By Step"}>
                <SocketIn node={node} socketId={"thetaStep"} label={"Step"}>
                    <AngleInput value={node.payload.thetaStep} onCommit={(thetaStep) => handleUpdate({ thetaStep })} disabled={node.in.thetaStep !== null || !isSpacingMode} unbound min={0} max={360} />
                </SocketIn>
                <SocketIn node={node} socketId={"flexJustify"} label={"Justify"}>
                    <RadioButton.Group options={FLEX_JUSTIFY_OPTIONS} value={`${node.payload.flexJustify}`} onValue={(v) => handleUpdate({ flexJustify: Number(v) })} orientation={"vertical"} disabled={node.in.flexJustify !== null || !isSpacingMode} />
                </SocketIn>
            </NodeAccordion>
            <hr />
            <SocketIn node={node} socketId={"arcMode"} label={"Arc Mode"}>
                <RadioButton.Group
                    options={ARC_MODE_OPTIONS}
                    value={`${node.payload.arcMode}`}
                    onValue={(v) => handleUpdate({ arcMode: Number(v) })}
                    orientation={"vertical"}
                    disabled={node.in.arcMode !== null}
                />
            </SocketIn>
            <NodeAccordion label={"Start/Sweep"} nodeId={node.id} socketsIn="thetaStart|sweep">
                <SocketIn node={node} socketId={"thetaStart"} label={"Start"}>
                    <AngleInput.SliderInput value={node.payload.thetaStart} onCommit={(thetaStart) => handleUpdate({ thetaStart })} disabled={node.in.thetaStart !== null || isFromTo || isDirectionSpread} unbound />
                </SocketIn>
                <SocketIn node={node} socketId={"sweep"} label={"Sweep"}>
                    <AngleInput value={node.payload.sweep} onCommit={(sweep) => handleUpdate({ sweep })} disabled={node.in.sweep !== null || isFromTo || isDirectionSpread} unbound min={-360} max={360} />
                </SocketIn>
            </NodeAccordion>
            <NodeAccordion label={"From/To"} nodeId={node.id} socketsIn="thetaFrom|thetaTo">
                <SocketIn node={node} socketId={"thetaFrom"} label={"From"}>
                    <AngleInput.SliderInput value={node.payload.thetaFrom} onCommit={(thetaFrom) => handleUpdate({ thetaFrom })} disabled={node.in.thetaFrom !== null || isStartSweep || isDirectionSpread} unbound />
                </SocketIn>
                <SocketIn node={node} socketId={"thetaTo"} label={"To"}>
                    <AngleInput.SliderInput value={node.payload.thetaTo} onCommit={(thetaTo) => handleUpdate({ thetaTo })} disabled={node.in.thetaTo !== null || isStartSweep || isDirectionSpread} unbound />
                </SocketIn>
            </NodeAccordion>
            <NodeAccordion label={"Direction/Spread"} nodeId={node.id} socketsIn="thetaDirection|thetaSpread">
                <SocketIn node={node} socketId={"thetaDirection"} label={"Direction"}>
                    <AngleInput.SliderInput value={node.payload.thetaDirection} onCommit={(thetaDirection) => handleUpdate({ thetaDirection })} disabled={node.in.thetaDirection !== null || !isDirectionSpread} unbound />
                </SocketIn>
                <SocketIn node={node} socketId={"thetaSpread"} label={"Spread"}>
                    <AngleInput value={node.payload.thetaSpread} onCommit={(thetaSpread) => handleUpdate({ thetaSpread })} disabled={node.in.thetaSpread !== null || !isDirectionSpread} unbound min={-360} max={360} />
                </SocketIn>
            </NodeAccordion>
            <hr />
            <NodeAccordion nodeId={node.id} label={"More"} socketsIn={"thetaCurve|memberAlign|memberRotation"}>
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

const SEQUENCE_INPUTS: (keyof RadialLayoutDefinition["inputs"])[] = [
    "count",
    "arcMode",
    "thetaStart",
    "sweep",
    "thetaFrom",
    "thetaTo",
    "thetaDirection",
    "thetaSpread",
    "flexSolveMode",
    "thetaStep",
    "flexJustify",
];
const GEOMETRY_INPUTS: (keyof RadialLayoutDefinition["inputs"])[] = [
    "input",
    ...SEQUENCE_INPUTS,
    "radius",
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
        return SEQUENCE_INPUTS;
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<RadialLayoutDefinition>, inSocket: keyof RadialLayoutDefinition["inputs"], _deps: AllDeps): (keyof RadialLayoutDefinition["outputs"])[] => {
    if (SEQUENCE_INPUTS.includes(inSocket)) {
        return ["output", "sequence"];
    }
    return ["output"];
};

const solveArcCount = (available: number, step: number, justify: keyof typeof Enum.Common.flexJustify): { count: number; shift: number; step: number } => {
    if (step <= 0 || available <= 0) return { count: 0, shift: 0, step };
    const n = Math.floor(available / step);
    if (n <= 0) return { count: 0, shift: 0, step };
    switch (justify) {
        case "START":
            return { count: n, shift: 0, step };
        case "END": {
            const remainder = available - (n - 1) * step;
            return { count: n, shift: remainder - step, step };
        }
        case "CENTER": {
            const used = (n - 1) * step;
            return { count: n, shift: (available - used) / 2, step };
        }
        case "BETWEEN": {
            const derivedStep = n > 1 ? available / (n - 1) : 0;
            return { count: n, shift: 0, step: derivedStep };
        }
        case "AROUND": {
            const derivedStep = available / n;
            return { count: n, shift: derivedStep / 2, step: derivedStep };
        }
    }
};

const resolveLayout = (node: NodeDefinitions.NodeFor<RadialLayoutDefinition>, context: Resolver.Context): { count: number; angleAt: (i: number) => number } | null => {
    const arcMode = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "arcMode")?.data, Enum.Common.arcMode) ?? node.payload.arcMode ?? 0;

    let effectiveStart: number;
    let effectiveSweep: number;

    if (arcMode === Enum.Common.arcMode.DIRECTION_SPREAD.value) {
        const dir = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "thetaDirection")?.data ?? node.payload.thetaDirection) ?? 0;
        const spr = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "thetaSpread")?.data ?? node.payload.thetaSpread) ?? 0;
        effectiveStart = dir - spr / 2;
        effectiveSweep = spr;
    } else if (arcMode === Enum.Common.arcMode.FROM_TO.value) {
        const from = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "thetaFrom")?.data ?? node.payload.thetaFrom) ?? 0;
        const to = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "thetaTo")?.data ?? node.payload.thetaTo) ?? 0;
        effectiveStart = from;
        effectiveSweep = to - from;
    } else {
        effectiveStart = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "thetaStart")?.data ?? node.payload.thetaStart) ?? 0;
        effectiveSweep = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "sweep")?.data ?? node.payload.sweep) ?? 0;
    }

    const flexSolveModeEnum = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "flexSolveMode")?.data, Enum.Common.flexSolveMode) ?? node.payload.flexSolveMode ?? 0;
    const isSpacingMode = flexSolveModeEnum === Enum.Common.flexSolveMode.COUNT.value;

    if (isSpacingMode) {
        const thetaStepRaw = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "thetaStep")?.data ?? node.payload.thetaStep) ?? 30;
        const available = Math.abs(effectiveSweep);
        const justifyKey = Enum.keyOf(Enum.Common.flexJustify, context.resolve<DataTypes.Enum>(node.id, "flexJustify")?.data ?? node.payload.flexJustify);
        const solved = solveArcCount(available, Math.abs(thetaStepRaw), justifyKey);
        if (solved.count <= 0) return null;
        const sign = effectiveSweep >= 0 ? 1 : -1;
        const shiftDeg = sign * solved.shift;
        const stepDeg = sign * solved.step;
        return { count: solved.count, angleAt: (i: number) => effectiveStart + shiftDeg + i * stepDeg };
    } else {
        const countStr = context.resolve<DataTypes.Integer>(node.id, "count")?.data ?? node.payload.count;
        const count = Math.round(Math.max(1, Math.min(64, NumericString.Emptyable.asNumber(countStr) ?? NaN)));
        if (!isFinite(count)) return null;
        const thetaInclusive = context.resolve<DataTypes.Boolean>(node.id, "thetaInclusive")?.data ?? node.payload.thetaInclusive ?? false;
        const distro = context.resolve<DataTypes.Distribution>(node.id, "thetaCurve")?.data ?? {
            func: Enum.Common.distroFunctions.LINEAR.value,
            easing: Enum.Common.distroEasing.IN.value,
            intensity: "1",
        };
        const distroLerper = distroInterpolator(
            Enum.keyOf(Enum.Common.distroFunctions, distro.func),
            Enum.keyOf(Enum.Common.distroEasing, distro.easing),
            NumericString.Emptyable.asNumber(distro.intensity) ?? 1,
        );
        const denominator = thetaInclusive ? Math.max(1, count - 1) : count;
        return {
            count,
            angleAt: (i: number) => {
                const coeff = delerp(i, 0, denominator);
                return lerp(coeff, effectiveStart, effectiveStart + effectiveSweep, distroLerper);
            },
        };
    }
};

const evaluate = (node: NodeDefinitions.NodeFor<RadialLayoutDefinition>, socket: keyof RadialLayoutDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const layout = resolveLayout(node, context);
    if (!layout) return null;

    if (socket === "sequence") {
        return { kind: "sequence", data: { senderId: node.id, outputSocket: "sequence", count: layout.count } };
    }

    if (socket !== "output") return null;

    const radius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "radius")?.data ?? node.payload.radius, "0px")) ?? 0;
    const memberAlign = context.resolve<DataTypes.Boolean>(node.id, "memberAlign")?.data ?? node.payload.memberAlign;
    const memberRotation = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "memberRotation")?.data ?? node.payload.memberRotation) ?? 0;
    const [groupTransforms] = TransformPrefab.evaluate(node, context);

    const children = [];
    for (let i = 0; i < layout.count; i++) {
        const shape = context.resolve<DataTypes.Shape>(node.id, "input", { ...context.cursorData, [Resolver.cursorKey({ senderId: node.id, outputSocket: "sequence" })]: i })?.data ?? null;
        if (shape === null) continue;

        const angle = layout.angleAt(i);
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
