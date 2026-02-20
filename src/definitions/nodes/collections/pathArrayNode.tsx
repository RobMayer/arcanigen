import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { NumericString } from "../../datatypes/numericString";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { OffsetPathShape } from "../../shapeTypes";
import { distroInterpolator } from "../../../util/misc";
import { GroupShape } from "../../shapeTypes";

export type PathArrayDefinition = {
    inputs: {
        input: DataTypes.Use<"shape">;
        path: DataTypes.Use<"path">;
        count: DataTypes.Use<"integer">;
        spacingMode: DataTypes.Use<"enum">;
        spacing: DataTypes.Use<"length">;
        overflowMode: DataTypes.Use<"enum">;
        offsetMode: DataTypes.Use<"enum">;
        offsetPercent: DataTypes.Use<"float" | "integer">;
        offsetLength: DataTypes.Use<"length">;
        offsetOrigin: DataTypes.Use<"enum">;
        padStart: DataTypes.Use<"length">;
        padEnd: DataTypes.Use<"length">;
        pointDistro: DataTypes.Use<"distribution">;
        skipFirst: DataTypes.Use<"boolean">;
        skipLast: DataTypes.Use<"boolean">;
        memberAlign: DataTypes.Use<"boolean">;
        memberRotation: DataTypes.Use<"angle">;
    };
    outputs: {
        output: DataTypes.Use<"shape">;
        sequence: DataTypes.Use<"sequence">;
    };
    payload: {
        label: string;
        count: DataTypes.TypeOf<DataTypes.Use<"integer">>;
        spacingMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        spacing: DataTypes.TypeOf<DataTypes.Use<"length">>;
        overflowMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        offsetMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        offsetPercent: DataTypes.TypeOf<DataTypes.Use<"float">>;
        offsetLength: DataTypes.TypeOf<DataTypes.Use<"length">>;
        offsetOrigin: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        padStart: DataTypes.TypeOf<DataTypes.Use<"length">>;
        padEnd: DataTypes.TypeOf<DataTypes.Use<"length">>;
        skipFirst: boolean;
        skipLast: boolean;
        memberAlign: boolean;
        memberRotation: DataTypes.TypeOf<DataTypes.Use<"angle">>;
    };
};

const SPACING_MODE_OPTIONS = Enum.options(Enum.Common.spacingMode);
const OVERFLOW_MODE_OPTIONS = Enum.options(Enum.Common.overflowMode);
const OFFSET_MODE_OPTIONS = Enum.options(Enum.Common.offsetMode);
const OFFSET_ORIGIN_OPTIONS = Enum.options(Enum.Common.offsetOrigin);

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<PathArrayDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"pathArray", PathArrayDefinition> => {
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
            spacingMode: Enum.Common.spacingMode.EVEN.value,
            spacing: "20px",
            overflowMode: Enum.Common.overflowMode.CLAMP.value,
            offsetMode: Enum.Common.offsetMode.RELATIVE.value,
            offsetPercent: "0",
            offsetLength: "0px",
            offsetOrigin: Enum.Common.offsetOrigin.START.value,
            padStart: "0px",
            padEnd: "0px",
            skipFirst: false,
            skipLast: false,
            memberAlign: true,
            memberRotation: "0",
            ...input,
        },
        type: "pathArray",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PathArrayDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PathArrayDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const isFixedSpacing = node.payload.spacingMode !== Enum.Common.spacingMode.EVEN.value;

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
            <SocketIn node={node} socketId={"path"} type={"path"} label={"Path"} />
            <SocketIn node={node} socketId={"count"} type={"integer"} label={"Count"}>
                <IntegerInput.SliderInput value={node.payload.count} onCommit={(count) => handleUpdate({ count })} disabled={node.in.count !== null} min={"1"} max={"64"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"spacingMode"} type={"enum"} label={"Spacing"}>
                <RadioButton.Group
                    orientation={"horizontal"}
                    value={`${node.payload.spacingMode}`}
                    onValue={(v) => handleUpdate({ spacingMode: Number(v) })}
                    disabled={node.in.spacingMode !== null}
                    options={SPACING_MODE_OPTIONS}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"spacing"} type={"length"} label={"Spacing"}>
                <LengthInput value={node.payload.spacing} onCommit={(spacing) => handleUpdate({ spacing })} disabled={node.in.spacing !== null || !isFixedSpacing} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"memberAlign"} type={"boolean"}>
                <CheckBox checked={node.payload.memberAlign} onToggle={(memberAlign) => handleUpdate({ memberAlign })} disabled={node.in.memberAlign !== null}>
                    Align to Path
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"memberRotation"} type={"angle"} label={"Member Rotation"}>
                <AngleInput.SliderInput value={node.payload.memberRotation} onCommit={(memberRotation) => handleUpdate({ memberRotation })} disabled={node.in.memberRotation !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"pointDistro"} type={"distribution"}>
                Distribution
            </SocketIn>
            <SocketIn node={node} socketId={"skipFirst"} type={"boolean"}>
                <CheckBox checked={node.payload.skipFirst} onToggle={(skipFirst) => handleUpdate({ skipFirst })} disabled={node.in.skipFirst !== null}>
                    Skip First
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"skipLast"} type={"boolean"}>
                <CheckBox checked={node.payload.skipLast} onToggle={(skipLast) => handleUpdate({ skipLast })} disabled={node.in.skipLast !== null}>
                    Skip Last
                </CheckBox>
            </SocketIn>
            <NodeAccordion nodeId={node.id} label={"Overflow & Offset"} socketsIn={"overflowMode|offsetMode|offsetPercent|offsetLength|offsetOrigin|padStart|padEnd"}>
                <SocketIn node={node} socketId={"overflowMode"} type={"enum"} label={"Overflow"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.overflowMode}`}
                        onValue={(v) => handleUpdate({ overflowMode: Number(v) })}
                        disabled={node.in.overflowMode !== null}
                        options={OVERFLOW_MODE_OPTIONS}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"offsetMode"} type={"enum"} label={"Offset Mode"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.offsetMode}`}
                        onValue={(v) => handleUpdate({ offsetMode: Number(v) })}
                        disabled={node.in.offsetMode !== null}
                        options={OFFSET_MODE_OPTIONS}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"offsetPercent"} type={"float integer"} label={"Offset %"}>
                    <DecimalInput.SliderInput
                        value={node.payload.offsetPercent}
                        onCommit={(offsetPercent) => handleUpdate({ offsetPercent })}
                        disabled={node.in.offsetPercent !== null || node.payload.offsetMode !== Enum.Common.offsetMode.RELATIVE.value}
                        min={-100}
                        max={100}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"offsetLength"} type={"length"} label={"Offset Length"}>
                    <LengthInput
                        value={node.payload.offsetLength}
                        onCommit={(offsetLength) => handleUpdate({ offsetLength })}
                        disabled={node.in.offsetLength !== null || node.payload.offsetMode !== Enum.Common.offsetMode.ABSOLUTE.value}
                        required
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"offsetOrigin"} type={"enum"} label={"Offset Origin"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.offsetOrigin}`}
                        onValue={(v) => handleUpdate({ offsetOrigin: Number(v) })}
                        disabled={node.in.offsetOrigin !== null}
                        options={OFFSET_ORIGIN_OPTIONS}
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"padStart"} type={"length"} label={"Pad Start"}>
                    <LengthInput value={node.payload.padStart} onCommit={(padStart) => handleUpdate({ padStart })} disabled={node.in.padStart !== null} min={"0px"} required />
                </SocketIn>
                <SocketIn node={node} socketId={"padEnd"} type={"length"} label={"Pad End"}>
                    <LengthInput value={node.payload.padEnd} onCommit={(padEnd) => handleUpdate({ padEnd })} disabled={node.in.padEnd !== null} min={"0px"} required />
                </SocketIn>
            </NodeAccordion>
        </TypicalNode>
    );
};

const ALL_INPUTS: (keyof PathArrayDefinition["inputs"])[] = [
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

const dependsOn = (_node: NodeDefinitions.NodeFor<PathArrayDefinition>, outSocket: keyof PathArrayDefinition["outputs"], _deps: AllDeps): (keyof PathArrayDefinition["inputs"])[] => {
    if (outSocket === "output") {
        return ALL_INPUTS;
    }
    if (outSocket === "sequence") {
        return ["count"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PathArrayDefinition>, inSocket: keyof PathArrayDefinition["inputs"], _deps: AllDeps): (keyof PathArrayDefinition["outputs"])[] => {
    if (inSocket === "count") {
        return ["output", "sequence"];
    }
    return ["output"];
};

const wrapDistance = (raw: string, overflowMode: number): string => {
    if (overflowMode === Enum.Common.overflowMode.WRAP.value) {
        return `mod(${raw}, 100%)`;
    }
    return `clamp(0%, ${raw}, 100%)`;
};

const evaluate = (node: NodeDefinitions.NodeFor<PathArrayDefinition>, socket: keyof PathArrayDefinition["outputs"], context: Resolver.Context, iteration?: number): DataTypes.AnyEval | null => {
    const countStr = context.resolve<"integer">(node.id, "count")?.data ?? node.payload.count;
    const count = NumericString.Emptyable.asNumber(countStr);
    if (count === null || count < 1) return null;

    if (socket === "sequence") {
        return { kind: "sequence", data: { count } };
    }

    if (socket !== "output") return null;

    const pathData = context.resolve<"path">(node.id, "path")?.data;
    if (!pathData) return null;

    // Resolve common parameters
    const spacingModeEnum = Enum.resolve(context.resolve<"enum">(node.id, "spacingMode")?.data, Enum.Common.spacingMode) ?? node.payload.spacingMode;
    const overflowModeEnum = Enum.resolve(context.resolve<"enum">(node.id, "overflowMode")?.data, Enum.Common.overflowMode) ?? node.payload.overflowMode;
    const memberAlign = context.resolve<"boolean">(node.id, "memberAlign")?.data ?? node.payload.memberAlign;
    const memberRotation = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "memberRotation")?.data ?? node.payload.memberRotation) ?? 0;
    const skipFirst = context.resolve<"boolean">(node.id, "skipFirst")?.data ?? node.payload.skipFirst;
    const skipLast = context.resolve<"boolean">(node.id, "skipLast")?.data ?? node.payload.skipLast;

    const padStartNum = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "padStart")?.data ?? node.payload.padStart) ?? 0;
    const padEndNum = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "padEnd")?.data ?? node.payload.padEnd) ?? 0;

    // Offset
    const offsetMode = Enum.resolve(context.resolve<"enum">(node.id, "offsetMode")?.data, Enum.Common.offsetMode) ?? node.payload.offsetMode;
    const offsetOrigin = Enum.resolve(context.resolve<"enum">(node.id, "offsetOrigin")?.data, Enum.Common.offsetOrigin) ?? node.payload.offsetOrigin;
    const originPct = ["0%", "50%", "100%"][offsetOrigin] ?? "0%";

    let offsetExpr: string;
    if (offsetMode === Enum.Common.offsetMode.RELATIVE.value) {
        const pct = NumericString.Emptyable.asNumber(context.resolve<"float" | "integer">(node.id, "offsetPercent")?.data ?? node.payload.offsetPercent) ?? 0;
        offsetExpr = pct !== 0 || originPct !== "0%" ? `${originPct} + ${pct}%` : "";
    } else {
        const lenNum = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "offsetLength")?.data ?? node.payload.offsetLength) ?? 0;
        offsetExpr = lenNum !== 0 || originPct !== "0%" ? `${originPct} + ${lenNum}px` : "";
    }

    // Distribution (only for Even mode)
    const distro = context.resolve<"distribution">(node.id, "pointDistro")?.data ?? { func: Enum.Common.distroFunctions.LINEAR.value, easing: Enum.Common.distroEasing.IN.value, intensity: "1" };
    const distroLerper = distroInterpolator(
        Enum.keyOf(Enum.Common.distroFunctions, distro.func),
        Enum.keyOf(Enum.Common.distroEasing, distro.easing),
        NumericString.Emptyable.asNumber(distro.intensity) ?? 1,
    );

    // Spacing
    const spacingNum = Length.Emptyable.asNumber(context.resolve<"length">(node.id, "spacing")?.data ?? node.payload.spacing) ?? 20;

    // Rotate string
    let rotate: string;
    if (memberAlign) {
        rotate = memberRotation !== 0 ? `auto ${memberRotation}deg` : "auto";
    } else {
        rotate = memberRotation !== 0 ? `${memberRotation}deg` : "0deg";
    }

    const children: OffsetPathShape[] = [];
    for (let i = 0; i < count; i++) {
        if (skipFirst && i === 0) continue;
        if (skipLast && i === count - 1) continue;

        const shape = context.resolve<"shape">(node.id, "input", i)?.data ?? null;
        if (shape === null) continue;

        // Compute spacing expression for this index
        let spacingExpr: string;

        if (spacingModeEnum === Enum.Common.spacingMode.EVEN.value) {
            const segments = count - 1;
            const t = segments > 0 ? distroLerper(i / segments) : 0.5;
            spacingExpr = `${padStartNum}px + ${t} * (100% - ${padStartNum}px - ${padEndNum}px)`;
        } else if (spacingModeEnum === Enum.Common.spacingMode.FIXED_START.value) {
            spacingExpr = `${padStartNum + i * spacingNum}px`;
        } else if (spacingModeEnum === Enum.Common.spacingMode.FIXED_CENTER.value) {
            const delta = (i - (count - 1) / 2) * spacingNum;
            spacingExpr = `50% + ${(padStartNum - padEndNum) / 2 + delta}px`;
        } else {
            // FixedEnd
            spacingExpr = `100% - ${padEndNum + (count - 1 - i) * spacingNum}px`;
        }

        // Combine spacing + offset
        const rawDistance = offsetExpr ? `${spacingExpr} + ${offsetExpr}` : spacingExpr;
        const finalDistance = `calc(${wrapDistance(rawDistance, overflowModeEnum)})`;

        children.push({
            type: "offsetPath",
            shape,
            path: {
                d: pathData.d,
                distance: finalDistance,
                rotate,
            },
            transform: pathData.transform ?? "",
            preview: pathData.preview,
        });
    }

    const group: GroupShape = {
        type: "group",
        children,
        transform: "",
        preview: pathData.preview,
    };

    return { kind: "shape", data: group };
};

const SOCKETTYPES_IN: { [key in keyof Required<PathArrayDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    input: { types: ["shape"], mode: "or" },
    path: { types: ["path"], mode: "or" },
    count: { types: ["integer"], mode: "or" },
    spacingMode: { types: ["enum"], mode: "or" },
    spacing: { types: ["length"], mode: "or" },
    overflowMode: { types: ["enum"], mode: "or" },
    offsetMode: { types: ["enum"], mode: "or" },
    offsetPercent: { types: ["float", "integer"], mode: "or" },
    offsetLength: { types: ["length"], mode: "or" },
    offsetOrigin: { types: ["enum"], mode: "or" },
    padStart: { types: ["length"], mode: "or" },
    padEnd: { types: ["length"], mode: "or" },
    pointDistro: { types: ["distribution"], mode: "or" },
    skipFirst: { types: ["boolean"], mode: "or" },
    skipLast: { types: ["boolean"], mode: "or" },
    memberAlign: { types: ["boolean"], mode: "or" },
    memberRotation: { types: ["angle"], mode: "or" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<PathArrayDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["shape"], mode: "and" },
    sequence: { types: ["sequence"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<PathArrayDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const PathArrayNodeType: NodeTypes.Type<"pathArray", PathArrayDefinition> = {
    type: "pathArray",
    displayName: "Path Array",
    defaultLabel: "Path Array",
    iconNode: <Icon shape={NODE_ICONS.pathArray.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.pathArray.Card} color={"var(--icon-flavour)"} />,
    category: "Collections",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
