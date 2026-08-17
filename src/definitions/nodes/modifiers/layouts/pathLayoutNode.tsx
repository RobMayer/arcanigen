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
import { AllDeps, NodeDefinitions, NodeTypes } from "../../../nodeTypes";
import { DataTypes } from "../../../dataTypes";
import { SocketTypes } from "../../../socketTypes";
import { Project } from "../../../../state/project";
import { RadioButton } from "../../../../components/buttons/RadioButton";
import { DecimalInput } from "../../../../components/inputs/DecimalInput";
import { NumericString } from "../../../datatypes/numericString";
import { CheckBox } from "../../../../components/buttons/CheckBox";
import { AngleInput } from "../../../../components/inputs/AngleInput";
import { IntegerInput } from "../../../../components/inputs/IntegerInput";
import { OffsetPathShape } from "../../../shapeTypes";
import { distroInterpolator } from "../../../../util/misc";
import { GroupShape } from "../../../shapeTypes";
import { signature, $, SignatureBuilder } from "../../../helpers/signatureBuilder";
import { SignatureEngine } from "../../../helpers/signatureEngine";

const def = signature({
    in: {
        input: "shape",
        path: "path",
        count: "integer",
        spacingMode: "enum",
        spacing: "length",
        overflowMode: "enum",
        offsetMode: "enum",
        offsetPercent: $.oneOf("float", "integer"),
        offsetLength: "length",
        offsetOrigin: "enum",
        padStart: "length",
        padEnd: "length",
        pointDistro: "distribution",
        skipFirst: "boolean",
        skipLast: "boolean",
        memberAlign: "boolean",
        memberRotation: "angle",
    },
    out: { output: "shape", sequence: "sequence" },
});

export type PathLayoutDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
        count: DataTypes.TypeOf<DataTypes.Integer>;
        spacingMode: DataTypes.TypeOf<DataTypes.Enum>;
        spacing: DataTypes.TypeOf<DataTypes.Length>;
        overflowMode: DataTypes.TypeOf<DataTypes.Enum>;
        offsetMode: DataTypes.TypeOf<DataTypes.Enum>;
        offsetPercent: DataTypes.TypeOf<DataTypes.Float>;
        offsetLength: DataTypes.TypeOf<DataTypes.Length>;
        offsetOrigin: DataTypes.TypeOf<DataTypes.Enum>;
        padStart: DataTypes.TypeOf<DataTypes.Length>;
        padEnd: DataTypes.TypeOf<DataTypes.Length>;
        skipFirst: boolean;
        skipLast: boolean;
        memberAlign: boolean;
        memberRotation: DataTypes.TypeOf<DataTypes.Angle>;
    }
>;

const SPACING_MODE_OPTIONS = Enum.options(Enum.Common.spacingMode);
const OVERFLOW_MODE_OPTIONS = Enum.options(Enum.Common.overflowMode);
const OFFSET_MODE_OPTIONS = Enum.options(Enum.Common.offsetMode);
const OFFSET_ORIGIN_OPTIONS = Enum.options(Enum.Common.linearAlign);

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<PathLayoutDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"pathLayout", PathLayoutDefinition> => {
    return {
        id,
        in: {
            input: null,
            path: null,
            count: null,
            spacingMode: null,
            spacing: null,
            overflowMode: null,
            offsetMode: null,
            offsetPercent: null,
            offsetLength: null,
            offsetOrigin: null,
            padStart: null,
            padEnd: null,
            pointDistro: null,
            skipFirst: null,
            skipLast: null,
            memberAlign: null,
            memberRotation: null,
        },
        out: {
            output: [],
            sequence: [],
        },
        payload: {
            label: "",
            count: "5",
            spacingMode: Enum.Common.spacingMode.SPACE_BETWEEN.value,
            spacing: "20px",
            overflowMode: Enum.Common.overflowMode.CLAMP.value,
            offsetMode: Enum.Common.offsetMode.RELATIVE.value,
            offsetPercent: "0",
            offsetLength: "0px",
            offsetOrigin: Enum.Common.linearAlign.START.value,
            padStart: "0px",
            padEnd: "0px",
            skipFirst: false,
            skipLast: false,
            memberAlign: true,
            memberRotation: "0deg",
            ...input,
        },
        type: "pathLayout",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PathLayoutDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PathLayoutDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const isFixedSpacing =
        node.payload.spacingMode !== Enum.Common.spacingMode.SPACE_BETWEEN.value &&
        node.payload.spacingMode !== Enum.Common.spacingMode.SPACE_AROUND.value &&
        node.payload.spacingMode !== Enum.Common.spacingMode.SPACE_AFTER.value &&
        node.payload.spacingMode !== Enum.Common.spacingMode.SPACE_BEFORE.value;

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
            <SocketIn node={node} socketId={"path"}>
                Path
            </SocketIn>
            <SocketIn node={node} socketId={"count"} label={"Count"}>
                <IntegerInput.SliderInput value={node.payload.count} onCommit={(count) => handleUpdate({ count })} disabled={node.in.count !== null} min={"1"} max={"64"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"spacingMode"} label={"Spacing"}>
                <RadioButton.Group
                    orientation={"vertical"}
                    value={`${node.payload.spacingMode}`}
                    onValue={(v) => handleUpdate({ spacingMode: Number(v) })}
                    disabled={node.in.spacingMode !== null}
                    options={SPACING_MODE_OPTIONS}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"spacing"} label={"Spacing"}>
                <LengthInput value={node.payload.spacing} onCommit={(spacing) => handleUpdate({ spacing })} disabled={node.in.spacing !== null || !isFixedSpacing} min={"0px"} required />
            </SocketIn>
            <NodeAccordion label={"More"} nodeId={node.id} socketsIn={"memberAlign|memberRotation|skipFirst|skipList"}>
                <SocketIn node={node} socketId={"memberAlign"}>
                    <CheckBox checked={node.payload.memberAlign} onToggle={(memberAlign) => handleUpdate({ memberAlign })} disabled={node.in.memberAlign !== null}>
                        Align to Path
                    </CheckBox>
                </SocketIn>
                <SocketIn node={node} socketId={"memberRotation"} label={"Member Rotation"}>
                    <AngleInput.SliderInput value={node.payload.memberRotation} onCommit={(memberRotation) => handleUpdate({ memberRotation })} disabled={node.in.memberRotation !== null} />
                </SocketIn>
                <SocketIn node={node} socketId={"pointDistro"}>
                    Distribution
                </SocketIn>
                <SocketIn node={node} socketId={"skipFirst"}>
                    <CheckBox checked={node.payload.skipFirst} onToggle={(skipFirst) => handleUpdate({ skipFirst })} disabled={node.in.skipFirst !== null}>
                        Skip First
                    </CheckBox>
                </SocketIn>
                <SocketIn node={node} socketId={"skipLast"}>
                    <CheckBox checked={node.payload.skipLast} onToggle={(skipLast) => handleUpdate({ skipLast })} disabled={node.in.skipLast !== null}>
                        Skip Last
                    </CheckBox>
                </SocketIn>
            </NodeAccordion>
            <NodeAccordion nodeId={node.id} label={"Overflow & Offset"} socketsIn={"overflowMode|offsetMode|offsetPercent|offsetLength|offsetOrigin|padStart|padEnd"}>
                <SocketIn node={node} socketId={"overflowMode"} label={"Overflow"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.overflowMode}`}
                        onValue={(v) => handleUpdate({ overflowMode: Number(v) })}
                        disabled={node.in.overflowMode !== null}
                        options={OVERFLOW_MODE_OPTIONS}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"offsetMode"} label={"Offset Mode"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.offsetMode}`}
                        onValue={(v) => handleUpdate({ offsetMode: Number(v) })}
                        disabled={node.in.offsetMode !== null}
                        options={OFFSET_MODE_OPTIONS}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"offsetPercent"} label={"Offset %"}>
                    <DecimalInput.SliderInput
                        value={node.payload.offsetPercent}
                        onCommit={(offsetPercent) => handleUpdate({ offsetPercent })}
                        disabled={node.in.offsetPercent !== null || node.payload.offsetMode !== Enum.Common.offsetMode.RELATIVE.value}
                        min={-100}
                        max={100}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"offsetLength"} label={"Offset Length"}>
                    <LengthInput
                        value={node.payload.offsetLength}
                        onCommit={(offsetLength) => handleUpdate({ offsetLength })}
                        disabled={node.in.offsetLength !== null || node.payload.offsetMode !== Enum.Common.offsetMode.ABSOLUTE.value}
                        required
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"offsetOrigin"} label={"Offset Origin"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.offsetOrigin}`}
                        onValue={(v) => handleUpdate({ offsetOrigin: Number(v) })}
                        disabled={node.in.offsetOrigin !== null}
                        options={OFFSET_ORIGIN_OPTIONS}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"padStart"} label={"Pad Start"}>
                    <LengthInput value={node.payload.padStart} onCommit={(padStart) => handleUpdate({ padStart })} disabled={node.in.padStart !== null} min={"0px"} required />
                </SocketIn>
                <SocketIn node={node} socketId={"padEnd"} label={"Pad End"}>
                    <LengthInput value={node.payload.padEnd} onCommit={(padEnd) => handleUpdate({ padEnd })} disabled={node.in.padEnd !== null} min={"0px"} required />
                </SocketIn>
            </NodeAccordion>
        </TypicalNode>
    );
};

const ALL_INPUTS: (keyof PathLayoutDefinition["inputs"])[] = [
    "input",
    "path",
    "count",
    "spacingMode",
    "spacing",
    "overflowMode",
    "offsetMode",
    "offsetPercent",
    "offsetLength",
    "offsetOrigin",
    "padStart",
    "padEnd",
    "pointDistro",
    "skipFirst",
    "skipLast",
    "memberAlign",
    "memberRotation",
];

const dependsOn = (_node: NodeDefinitions.NodeFor<PathLayoutDefinition>, outSocket: keyof PathLayoutDefinition["outputs"], _deps: AllDeps): (keyof PathLayoutDefinition["inputs"])[] => {
    if (outSocket === "output") {
        return ALL_INPUTS;
    }
    if (outSocket === "sequence") {
        return ["count"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PathLayoutDefinition>, inSocket: keyof PathLayoutDefinition["inputs"], _deps: AllDeps): (keyof PathLayoutDefinition["outputs"])[] => {
    if (inSocket === "count") {
        return ["output", "sequence"];
    }
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<PathLayoutDefinition>, socket: keyof PathLayoutDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const countStr = context.resolve<DataTypes.Integer>(node.id, "count")?.data ?? node.payload.count;
    const count = Math.round(Math.max(1, Math.min(64, NumericString.Emptyable.asNumber(countStr) ?? NaN)));
    if (!isFinite(count)) return null;

    if (socket === "sequence") {
        return { kind: "sequence", data: { senderId: node.id, outputSocket: "sequence", count } };
    }

    if (socket !== "output") return null;

    const pathData = context.resolve<DataTypes.Path>(node.id, "path")?.data;
    if (!pathData) return null;

    const spacingModeEnum = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "spacingMode")?.data, Enum.Common.spacingMode) ?? node.payload.spacingMode;
    const overflowModeEnum = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "overflowMode")?.data, Enum.Common.overflowMode) ?? node.payload.overflowMode;
    const memberAlign = context.resolve<DataTypes.Boolean>(node.id, "memberAlign")?.data ?? node.payload.memberAlign;
    const memberRotation = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "memberRotation")?.data ?? node.payload.memberRotation) ?? 0;
    const skipFirst = context.resolve<DataTypes.Boolean>(node.id, "skipFirst")?.data ?? node.payload.skipFirst;
    const skipLast = context.resolve<DataTypes.Boolean>(node.id, "skipLast")?.data ?? node.payload.skipLast;

    const padStartNum = Length.Emptyable.asNumber(context.resolve<DataTypes.Length>(node.id, "padStart")?.data ?? node.payload.padStart) ?? 0;
    const padEndNum = Length.Emptyable.asNumber(context.resolve<DataTypes.Length>(node.id, "padEnd")?.data ?? node.payload.padEnd) ?? 0;

    const offsetMode = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "offsetMode")?.data, Enum.Common.offsetMode) ?? node.payload.offsetMode;
    const offsetOrigin = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "offsetOrigin")?.data, Enum.Common.linearAlign) ?? node.payload.offsetOrigin;
    const originPct = [0, 50, 100][offsetOrigin] ?? 0;

    let offset: { percent: number; px: number };
    if (offsetMode === Enum.Common.offsetMode.RELATIVE.value) {
        const pct = NumericString.Emptyable.asNumber(context.resolve<DataTypes.Float | DataTypes.Integer>(node.id, "offsetPercent")?.data ?? node.payload.offsetPercent) ?? 0;
        offset = { percent: originPct + pct, px: 0 };
    } else {
        const lenNum = Length.Emptyable.asNumber(context.resolve<DataTypes.Length>(node.id, "offsetLength")?.data ?? node.payload.offsetLength) ?? 0;
        offset = { percent: originPct, px: lenNum };
    }

    // Distribution (only for Even mode)
    const distro = context.resolve<DataTypes.Distribution>(node.id, "pointDistro")?.data ?? { func: Enum.Common.distroFunctions.LINEAR.value, easing: Enum.Common.distroEasing.IN.value, intensity: "1" };
    const distroLerper = distroInterpolator(
        Enum.keyOf(Enum.Common.distroFunctions, distro.func),
        Enum.keyOf(Enum.Common.distroEasing, distro.easing),
        NumericString.Emptyable.asNumber(distro.intensity) ?? 1,
    );

    const spacingNum = Length.Emptyable.asNumber(context.resolve<DataTypes.Length>(node.id, "spacing")?.data ?? node.payload.spacing) ?? 20;

    const overflow: "clamp" | "wrap" = overflowModeEnum === Enum.Common.overflowMode.WRAP.value ? "wrap" : "clamp";
    const rotate = { auto: memberAlign, degrees: memberRotation };

    const children: OffsetPathShape[] = [];
    for (let i = 0; i < count; i++) {
        if (skipFirst && i === 0) continue;
        if (skipLast && i === count - 1) continue;

        const shape = context.resolve<DataTypes.Shape>(node.id, "input", { ...context.cursorData, [Resolver.cursorKey({ senderId: node.id, outputSocket: "sequence" })]: i })?.data ?? null;
        if (shape === null) continue;

        let spacing: { percent: number; px: number };

        if (spacingModeEnum === Enum.Common.spacingMode.SPACE_BETWEEN.value) {
            const segments = count - 1;
            const t = segments > 0 ? distroLerper(i / segments) : 0.5;
            spacing = { percent: t * 100, px: padStartNum * (1 - t) - padEndNum * t };
        } else if (spacingModeEnum === Enum.Common.spacingMode.SPACE_AROUND.value) {
            const t = count > 0 ? distroLerper((i + 0.5) / count) : 0.5;
            spacing = { percent: t * 100, px: padStartNum * (1 - t) - padEndNum * t };
        } else if (spacingModeEnum === Enum.Common.spacingMode.SPACE_AFTER.value) {
            const t = count > 0 ? distroLerper(i / count) : 0;
            spacing = { percent: t * 100, px: padStartNum * (1 - t) - padEndNum * t };
        } else if (spacingModeEnum === Enum.Common.spacingMode.SPACE_BEFORE.value) {
            const t = count > 0 ? distroLerper((i + 1) / count) : 1;
            spacing = { percent: t * 100, px: padStartNum * (1 - t) - padEndNum * t };
        } else if (spacingModeEnum === Enum.Common.spacingMode.FIXED_START.value) {
            spacing = { percent: 0, px: padStartNum + i * spacingNum };
        } else if (spacingModeEnum === Enum.Common.spacingMode.FIXED_CENTER.value) {
            const delta = (i - (count - 1) / 2) * spacingNum;
            spacing = { percent: 50, px: (padStartNum - padEndNum) / 2 + delta };
        } else {
            // FixedEnd
            spacing = { percent: 100, px: -(padEndNum + (count - 1 - i) * spacingNum) };
        }

        const distance = { percent: spacing.percent + offset.percent, px: spacing.px + offset.px };

        children.push({
            type: "offsetPath",
            shape,
            path: {
                d: pathData.d,
                distance,
                overflow,
                rotate,
            },
            transform: pathData.transform ?? "",
        });
    }

    const group: GroupShape = {
        type: "group",
        children,
        transform: "",
    };

    return { kind: "shape", data: group };
};

export const PathLayoutNodeType: NodeTypes.Type<"pathLayout", PathLayoutDefinition> = {
    type: "pathLayout",
    displayName: "Path Layout",
    defaultLabel: "Path Layout",
    iconNode: <NodeIcon shape={NODE_ICONS.path} modifierIcon={NODE_ICONS.modifiers.patternFor} />,
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
