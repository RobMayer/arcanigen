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
import { AngleInput } from "../../../../components/inputs/AngleInput";
import { RadioButton } from "../../../../components/buttons/RadioButton";
import { CheckBox } from "../../../../components/buttons/CheckBox";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../../nodeTypes";
import { DataTypes } from "../../../dataTypes";
import { SocketTypes } from "../../../socketTypes";
import { Project } from "../../../../state/project";
import { IntegerInput } from "../../../../components/inputs/IntegerInput";
import { NumericString } from "../../../datatypes/numericString";
import { deg2rad } from "../../../../util/misc";
import { TransformPrefab } from "../../../helpers/transformPrefab";
import { GroupShape } from "../../../shapeTypes";
import { signature, SignatureBuilder } from "../../../helpers/signatureBuilder";
import { SignatureEngine } from "../../../helpers/signatureEngine";

const def = signature({
    in: {
        input: "shape",
        // radial (ring) axis
        radialFit: "enum",
        radialReference: "length",
        radialWidth: "length",
        radialSpacing: "length",
        radialCount: "integer",
        radialDirection: "enum",
        radialJustify: "enum",
        // annular (angular) axis
        annularFit: "enum",
        annularReference: "angle",
        annularSweep: "angle",
        annularSpacing: "angle",
        annularCount: "integer",
        annularDirection: "enum",
        annularJustify: "enum",
        annularInclusiveEnd: "boolean",
        // shared
        sequenceOrder: "enum",
        memberAlign: "boolean",
        memberRotation: "angle",
        ...TransformPrefab.SIG_IN,
    },
    out: { output: "shape", cellSequence: "sequence", radialSequence: "sequence", annularSequence: "sequence" },
});

export type GridLayoutPolarDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        radialFit: DataTypes.TypeOf<DataTypes.Enum>;
        radialReference: DataTypes.TypeOf<DataTypes.Length>;
        radialWidth: DataTypes.TypeOf<DataTypes.Length>;
        radialSpacing: DataTypes.TypeOf<DataTypes.Length>;
        radialCount: DataTypes.TypeOf<DataTypes.Integer>;
        radialDirection: DataTypes.TypeOf<DataTypes.Enum>;
        radialJustify: DataTypes.TypeOf<DataTypes.Enum>;
        annularFit: DataTypes.TypeOf<DataTypes.Enum>;
        annularReference: DataTypes.TypeOf<DataTypes.Angle>;
        annularSweep: DataTypes.TypeOf<DataTypes.Angle>;
        annularSpacing: DataTypes.TypeOf<DataTypes.Angle>;
        annularCount: DataTypes.TypeOf<DataTypes.Integer>;
        annularDirection: DataTypes.TypeOf<DataTypes.Enum>;
        annularJustify: DataTypes.TypeOf<DataTypes.Enum>;
        annularInclusiveEnd: boolean;
        sequenceOrder: DataTypes.TypeOf<DataTypes.Enum>;
        memberAlign: boolean;
        memberRotation: DataTypes.TypeOf<DataTypes.Angle>;
    } & TransformPrefab.Definition["payload"]
>;

const FIT_OPTIONS = Enum.options(Enum.Common.fitCalcMode);
const JUSTIFY_OPTIONS = Enum.options(Enum.Common.gridJustify);
const RADIAL_DIR_OPTIONS = Enum.options(Enum.Common.gridDirectionRadial);
const ANNULAR_DIR_OPTIONS = Enum.options(Enum.Common.gridDirectionAnnular);
const ORDER_OPTIONS = Enum.options(Enum.Common.polarSequenceOrder);

const MAX_AXIS = 64;
const clampCount = (n: number): number => Math.max(1, Math.min(MAX_AXIS, Math.round(n)));

type AxisDirection = "POSITIVE" | "NEGATIVE" | "CENTER";

const directionOf = (key: string): AxisDirection => (key === "CENTER" ? "CENTER" : key === "OUTWARD" || key === "CLOCKWISE" ? "POSITIVE" : "NEGATIVE");

const solveAxis = (
    fitKey: keyof typeof Enum.Common.fitCalcMode,
    count: number,
    spacing: number,
    total: number,
    justifyKey: keyof typeof Enum.Common.gridJustify,
    closed: boolean,
    direction: AxisDirection,
): { n: number; offsets: number[] } => {
    const sp = Math.max(0, spacing);
    const tot = Math.max(0, total);

    let n: number;
    let step: number;

    switch (fitKey) {
        case "SPACING": {
            // Count + Total given -> Spacing derived
            n = clampCount(count);
            const gaps = closed ? n : n - 1;
            step = gaps > 0 ? tot / gaps : 0;
            break;
        }
        case "COUNT": {
            // Spacing + Total given -> Count derived
            const whole = sp > 0 ? Math.floor(tot / sp) : 0;
            n = clampCount(closed ? whole : whole + 1);
            const gaps = closed ? n : n - 1;
            step = justifyKey === "FILL" ? (gaps > 0 ? tot / gaps : 0) : sp;
            break;
        }
        case "TOTAL":
        default:
            // Count + Spacing given -> Total is emergent
            n = clampCount(count);
            step = sp;
            break;
    }

    const gaps = closed ? n : n - 1;
    const usedSpan = gaps * step;
    // TOTAL-derived has no separate window; the other modes anchor within the requested Total.
    const extent = fitKey === "TOTAL" ? usedSpan : tot;
    const slack = Math.max(0, extent - usedSpan);
    const justifyOffset = justifyKey === "START" ? 0 : justifyKey === "END" ? slack : slack / 2; // CENTER (and FILL, whose slack is 0)

    const offsets: number[] = [];
    for (let i = 0; i < n; i++) {
        const base = justifyOffset + i * step; // distance from the window's near edge
        offsets.push(direction === "CENTER" ? base - extent / 2 : direction === "NEGATIVE" ? -base : base);
    }
    return { n, offsets };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<GridLayoutPolarDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"gridLayoutPolar", GridLayoutPolarDefinition> => {
    return {
        id,
        in: {
            input: null,
            radialFit: null,
            radialReference: null,
            radialWidth: null,
            radialSpacing: null,
            radialCount: null,
            radialDirection: null,
            radialJustify: null,
            annularFit: null,
            annularReference: null,
            annularSweep: null,
            annularSpacing: null,
            annularCount: null,
            annularDirection: null,
            annularJustify: null,
            annularInclusiveEnd: null,
            sequenceOrder: null,
            memberAlign: null,
            memberRotation: null,
            // transforms
            position: null,
            rotation: null,
        },
        out: {
            output: [],
            cellSequence: [],
            radialSequence: [],
            annularSequence: [],
        },
        payload: {
            label: "",
            radialFit: input.radialFit ?? Enum.Common.fitCalcMode.TOTAL.value,
            radialReference: input.radialReference ?? "50px",
            radialWidth: input.radialWidth ?? "200px",
            radialSpacing: input.radialSpacing ?? "50px",
            radialCount: input.radialCount ?? "5",
            radialDirection: input.radialDirection ?? Enum.Common.gridDirectionRadial.OUTWARD.value,
            radialJustify: input.radialJustify ?? Enum.Common.gridJustify.CENTER.value,
            annularFit: input.annularFit ?? Enum.Common.fitCalcMode.TOTAL.value,
            annularReference: input.annularReference ?? "0deg",
            annularSweep: input.annularSweep ?? "360deg",
            annularSpacing: input.annularSpacing ?? "60deg",
            annularCount: input.annularCount ?? "6",
            annularDirection: input.annularDirection ?? Enum.Common.gridDirectionAnnular.CLOCKWISE.value,
            annularJustify: input.annularJustify ?? Enum.Common.gridJustify.CENTER.value,
            annularInclusiveEnd: input.annularInclusiveEnd ?? false,
            sequenceOrder: input.sequenceOrder ?? Enum.Common.polarSequenceOrder.RADIAL_MAJOR.value,
            memberAlign: input.memberAlign ?? false,
            memberRotation: input.memberRotation ?? "0deg",
            // transforms
            position: { ...TransformPrefab.POSITION_DEFAULT },
            rotation: "0deg",
        },
        type: "gridLayoutPolar",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<GridLayoutPolarDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<GridLayoutPolarDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    // Fit key is only known when the fit socket is unwired; when wired the mode is dynamic so value inputs stay live.
    const radialFit = node.in.radialFit === null ? Enum.keyOf(Enum.Common.fitCalcMode, node.payload.radialFit) : null;
    const annularFit = node.in.annularFit === null ? Enum.keyOf(Enum.Common.fitCalcMode, node.payload.annularFit) : null;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketOut node={node} socketId={"cellSequence"}>
                Cell Sequence
            </SocketOut>
            <SocketOut node={node} socketId={"radialSequence"}>
                Radial Sequence
            </SocketOut>
            <SocketOut node={node} socketId={"annularSequence"}>
                Annular Sequence
            </SocketOut>
            <SocketIn node={node} socketId={"input"}>
                Input
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"radialFit"} label={"Radial Auto Mode"}>
                <RadioButton.Group
                    options={FIT_OPTIONS}
                    value={`${node.payload.radialFit}`}
                    onValue={(v) => handleUpdate({ radialFit: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.radialFit !== null}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"radialReference"} label={"Reference Radius"}>
                <LengthInput value={node.payload.radialReference} onCommit={(radialReference) => handleUpdate({ radialReference })} disabled={node.in.radialReference !== null} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"radialWidth"} label={"Radial Width"}>
                <LengthInput
                    value={node.payload.radialWidth}
                    onCommit={(radialWidth) => handleUpdate({ radialWidth })}
                    disabled={node.in.radialWidth !== null || radialFit === "TOTAL"}
                    min={"0px"}
                    required
                />
            </SocketIn>
            <SocketIn node={node} socketId={"radialSpacing"} label={"Radial Spacing"}>
                <LengthInput
                    value={node.payload.radialSpacing}
                    onCommit={(radialSpacing) => handleUpdate({ radialSpacing })}
                    disabled={node.in.radialSpacing !== null || radialFit === "SPACING"}
                    min={"0px"}
                    required
                />
            </SocketIn>
            <SocketIn node={node} socketId={"radialCount"} label={"Radial Count"}>
                <IntegerInput.SliderInput
                    value={node.payload.radialCount}
                    onCommit={(radialCount) => handleUpdate({ radialCount })}
                    disabled={node.in.radialCount !== null || radialFit === "COUNT"}
                    min={"1"}
                    max={"64"}
                    required
                />
            </SocketIn>
            <SocketIn node={node} socketId={"radialDirection"} label={"Radial Direction"}>
                <RadioButton.Group
                    options={RADIAL_DIR_OPTIONS}
                    value={`${node.payload.radialDirection}`}
                    onValue={(v) => handleUpdate({ radialDirection: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.radialDirection !== null}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"radialJustify"} label={"Radial Justify"}>
                <RadioButton.Group
                    options={JUSTIFY_OPTIONS}
                    value={`${node.payload.radialJustify}`}
                    onValue={(v) => handleUpdate({ radialJustify: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.radialJustify !== null || (radialFit !== null && radialFit !== "COUNT")}
                />
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"annularFit"} label={"Annular Auto Mode"}>
                <RadioButton.Group
                    options={FIT_OPTIONS}
                    value={`${node.payload.annularFit}`}
                    onValue={(v) => handleUpdate({ annularFit: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.annularFit !== null}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"annularReference"} label={"Reference Angle"}>
                <AngleInput.SliderInput value={node.payload.annularReference} onCommit={(annularReference) => handleUpdate({ annularReference })} disabled={node.in.annularReference !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"annularSweep"} label={"Sweep"}>
                <AngleInput.SliderInput
                    value={node.payload.annularSweep}
                    onCommit={(annularSweep) => handleUpdate({ annularSweep })}
                    disabled={node.in.annularSweep !== null || annularFit === "TOTAL"}
                    unbound
                    min={0}
                    required
                />
            </SocketIn>
            <SocketIn node={node} socketId={"annularSpacing"} label={"Annular Spacing"}>
                <AngleInput.SliderInput
                    value={node.payload.annularSpacing}
                    onCommit={(annularSpacing) => handleUpdate({ annularSpacing })}
                    disabled={node.in.annularSpacing !== null || annularFit === "SPACING"}
                    required
                />
            </SocketIn>
            <SocketIn node={node} socketId={"annularCount"} label={"Annular Count"}>
                <IntegerInput.SliderInput
                    value={node.payload.annularCount}
                    onCommit={(annularCount) => handleUpdate({ annularCount })}
                    disabled={node.in.annularCount !== null || annularFit === "COUNT"}
                    min={"1"}
                    max={"64"}
                    required
                />
            </SocketIn>
            <SocketIn node={node} socketId={"annularDirection"} label={"Annular Direction"}>
                <RadioButton.Group
                    options={ANNULAR_DIR_OPTIONS}
                    value={`${node.payload.annularDirection}`}
                    onValue={(v) => handleUpdate({ annularDirection: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.annularDirection !== null}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"annularJustify"} label={"Annular Justify"}>
                <RadioButton.Group
                    options={JUSTIFY_OPTIONS}
                    value={`${node.payload.annularJustify}`}
                    onValue={(v) => handleUpdate({ annularJustify: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.annularJustify !== null || (annularFit !== null && annularFit !== "COUNT")}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"annularInclusiveEnd"}>
                <CheckBox checked={node.payload.annularInclusiveEnd} onToggle={(annularInclusiveEnd) => handleUpdate({ annularInclusiveEnd })} disabled={node.in.annularInclusiveEnd !== null}>
                    Inclusive End
                </CheckBox>
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"sequenceOrder"} label={"Sequence Order"}>
                <RadioButton.Group
                    options={ORDER_OPTIONS}
                    value={`${node.payload.sequenceOrder}`}
                    onValue={(v) => handleUpdate({ sequenceOrder: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.sequenceOrder !== null}
                />
            </SocketIn>
            <NodeAccordion nodeId={node.id} label={"Member"} socketsIn={"memberAlign|memberRotation"}>
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

const RADIAL_COUNT_INPUTS: (keyof GridLayoutPolarDefinition["inputs"])[] = ["radialFit", "radialCount", "radialSpacing", "radialWidth"];
const ANNULAR_COUNT_INPUTS: (keyof GridLayoutPolarDefinition["inputs"])[] = ["annularFit", "annularCount", "annularSpacing", "annularSweep", "annularInclusiveEnd"];
const GEOMETRY_INPUTS: (keyof GridLayoutPolarDefinition["inputs"])[] = [
    "input",
    "radialFit",
    "radialReference",
    "radialWidth",
    "radialSpacing",
    "radialCount",
    "radialDirection",
    "radialJustify",
    "annularFit",
    "annularReference",
    "annularSweep",
    "annularSpacing",
    "annularCount",
    "annularDirection",
    "annularJustify",
    "annularInclusiveEnd",
    "sequenceOrder",
    "memberAlign",
    "memberRotation",
    "position",
    "rotation",
];

const dependsOn = (_node: NodeDefinitions.NodeFor<GridLayoutPolarDefinition>, outSocket: keyof GridLayoutPolarDefinition["outputs"], _deps: AllDeps): (keyof GridLayoutPolarDefinition["inputs"])[] => {
    switch (outSocket) {
        case "output":
            return GEOMETRY_INPUTS;
        case "cellSequence":
            return [...RADIAL_COUNT_INPUTS, ...ANNULAR_COUNT_INPUTS];
        case "radialSequence":
            return RADIAL_COUNT_INPUTS;
        case "annularSequence":
            return ANNULAR_COUNT_INPUTS;
        default:
            return [];
    }
};

const contributesTo = (
    _node: NodeDefinitions.NodeFor<GridLayoutPolarDefinition>,
    inSocket: keyof GridLayoutPolarDefinition["inputs"],
    _deps: AllDeps,
): (keyof GridLayoutPolarDefinition["outputs"])[] => {
    if (RADIAL_COUNT_INPUTS.includes(inSocket)) {
        return ["output", "radialSequence", "cellSequence"];
    }
    if (ANNULAR_COUNT_INPUTS.includes(inSocket)) {
        return ["output", "annularSequence", "cellSequence"];
    }
    // input, references, directions, justify, sequenceOrder, member options, transforms -> rendered output only
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<GridLayoutPolarDefinition>, socket: keyof GridLayoutPolarDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    // Radial axis (rings never wrap -> always open/inclusive).
    const radialFit = Enum.keyOf(Enum.Common.fitCalcMode, context.resolve<DataTypes.Enum>(node.id, "radialFit")?.data ?? node.payload.radialFit);
    const radialCount = NumericString.Emptyable.asNumber(context.resolve<DataTypes.Integer>(node.id, "radialCount")?.data ?? node.payload.radialCount) ?? 1;
    const radialSpacing = Length.Emptyable.asNumber(context.resolve<DataTypes.Length>(node.id, "radialSpacing")?.data ?? node.payload.radialSpacing) ?? 0;
    const radialWidth = Length.Emptyable.asNumber(context.resolve<DataTypes.Length>(node.id, "radialWidth")?.data ?? node.payload.radialWidth) ?? 0;
    const radialJustify = Enum.keyOf(Enum.Common.gridJustify, context.resolve<DataTypes.Enum>(node.id, "radialJustify")?.data ?? node.payload.radialJustify);
    const radialDirection = directionOf(Enum.keyOf(Enum.Common.gridDirectionRadial, context.resolve<DataTypes.Enum>(node.id, "radialDirection")?.data ?? node.payload.radialDirection));
    const radialReference = Length.Emptyable.asNumber(context.resolve<DataTypes.Length>(node.id, "radialReference")?.data ?? node.payload.radialReference) ?? 0;
    const radial = solveAxis(radialFit, radialCount, radialSpacing, radialWidth, radialJustify, false, radialDirection);

    // Annular axis (closed = NOT inclusive end -> N gaps so a full 360 loop doesn't double the seam).
    const annularFit = Enum.keyOf(Enum.Common.fitCalcMode, context.resolve<DataTypes.Enum>(node.id, "annularFit")?.data ?? node.payload.annularFit);
    const annularCount = NumericString.Emptyable.asNumber(context.resolve<DataTypes.Integer>(node.id, "annularCount")?.data ?? node.payload.annularCount) ?? 1;
    const annularSpacing = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "annularSpacing")?.data ?? node.payload.annularSpacing) ?? 0;
    const annularSweep = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "annularSweep")?.data ?? node.payload.annularSweep) ?? 0;
    const annularJustify = Enum.keyOf(Enum.Common.gridJustify, context.resolve<DataTypes.Enum>(node.id, "annularJustify")?.data ?? node.payload.annularJustify);
    const annularDirection = directionOf(Enum.keyOf(Enum.Common.gridDirectionAnnular, context.resolve<DataTypes.Enum>(node.id, "annularDirection")?.data ?? node.payload.annularDirection));
    const annularReference = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "annularReference")?.data ?? node.payload.annularReference) ?? 0;
    const inclusiveEnd = context.resolve<DataTypes.Boolean>(node.id, "annularInclusiveEnd")?.data ?? node.payload.annularInclusiveEnd;
    const annular = solveAxis(annularFit, annularCount, annularSpacing, annularSweep, annularJustify, !inclusiveEnd, annularDirection);

    const nRadial = radial.n;
    const nAnnular = annular.n;

    if (socket === "radialSequence") {
        return { kind: "sequence", data: { senderId: node.id, outputSocket: "radialSequence", count: nRadial } };
    }
    if (socket === "annularSequence") {
        return { kind: "sequence", data: { senderId: node.id, outputSocket: "annularSequence", count: nAnnular } };
    }
    if (socket === "cellSequence") {
        return { kind: "sequence", data: { senderId: node.id, outputSocket: "cellSequence", count: nRadial * nAnnular } };
    }
    if (socket !== "output") return null;

    const radialMajor = Enum.keyOf(Enum.Common.polarSequenceOrder, context.resolve<DataTypes.Enum>(node.id, "sequenceOrder")?.data ?? node.payload.sequenceOrder) === "RADIAL_MAJOR";
    const memberAlign = context.resolve<DataTypes.Boolean>(node.id, "memberAlign")?.data ?? node.payload.memberAlign;
    const memberRotation = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "memberRotation")?.data ?? node.payload.memberRotation) ?? 0;

    const [groupTransforms] = TransformPrefab.evaluate(node, context);

    const children = [];
    for (let ri = 0; ri < nRadial; ri++) {
        for (let ai = 0; ai < nAnnular; ai++) {
            const cellIdx = radialMajor ? ri * nAnnular + ai : ai * nRadial + ri;
            const cursorData = {
                ...context.cursorData,
                [Resolver.cursorKey({ senderId: node.id, outputSocket: "cellSequence" })]: cellIdx,
                [Resolver.cursorKey({ senderId: node.id, outputSocket: "radialSequence" })]: ri,
                [Resolver.cursorKey({ senderId: node.id, outputSocket: "annularSequence" })]: ai,
            };
            const shape = context.resolve<DataTypes.Shape>(node.id, "input", cursorData)?.data ?? null;
            if (shape === null) continue;

            const radius = Math.max(0, radialReference + radial.offsets[ri]);
            const angle = annularReference + annular.offsets[ai];
            const angleDeg = angle - 90; // 0deg points up, matching the radial layout convention
            const angleRad = deg2rad(angleDeg);
            const vx = radius * Math.cos(angleRad);
            const vy = radius * Math.sin(angleRad);

            const childTransforms: string[] = [`translate(${vx}, ${vy})`];
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
    }

    const group: GroupShape = {
        type: "group",
        children,
        transform: groupTransforms.join(" "),
    };

    return { kind: "shape", data: group };
};

export const GridLayoutPolarNodeType: NodeTypes.Type<"gridLayoutPolar", GridLayoutPolarDefinition> = {
    type: "gridLayoutPolar",
    displayName: "Polar Layout",
    defaultLabel: "Polar Layout",
    iconNode: <NodeIcon shape={NODE_ICONS.gridPolar} modifierIcon={NODE_ICONS.modifiers.patternFor} />,
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
