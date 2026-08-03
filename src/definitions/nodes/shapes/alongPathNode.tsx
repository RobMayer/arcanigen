import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { NumericString } from "../../datatypes/numericString";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { AngleInput } from "../../../components/inputs/AngleInput";

export type AlongPathDefinition = {
    inputs: {
        shape: DataTypes.Use<"shape">;
        path: DataTypes.Use<"path">;
        memberAlign: DataTypes.Use<"boolean">;
        memberRotation: DataTypes.Use<"angle">;
        overflowMode: DataTypes.Use<"enum">;
        offsetMode: DataTypes.Use<"enum">;
        offsetPercent: DataTypes.Use<"float" | "integer">;
        offsetLength: DataTypes.Use<"length">;
        offsetOrigin: DataTypes.Use<"enum">;
    };
    outputs: {
        output: DataTypes.Use<"shape">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        memberAlign: DataTypes.TypeOf<DataTypes.Use<"boolean">>;
        memberRotation: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        overflowMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        offsetMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        offsetPercent: DataTypes.TypeOf<DataTypes.Use<"float">>;
        offsetLength: DataTypes.TypeOf<DataTypes.Use<"length">>;
        offsetOrigin: DataTypes.TypeOf<DataTypes.Use<"enum">>;
    };
};

const OFFSET_MODE_OPTIONS = Enum.options(Enum.Common.offsetMode);
const OFFSET_ORIGIN_OPTIONS = Enum.options(Enum.Common.linearAlign);
const OVERFLOW_MODE_OPTIONS = Enum.options(Enum.Common.overflowMode);

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<AlongPathDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"alongPath", AlongPathDefinition> => {
    return {
        id,
        in: {
            shape: null,
            path: null,
            memberAlign: null,
            memberRotation: null,
            overflowMode: null,
            offsetMode: null,
            offsetPercent: null,
            offsetLength: null,
            offsetOrigin: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            memberAlign: true,
            memberRotation: "0",
            overflowMode: Enum.Common.overflowMode.CLAMP.value,
            offsetMode: Enum.Common.offsetMode.RELATIVE.value,
            offsetPercent: "0",
            offsetLength: "0px",
            offsetOrigin: Enum.Common.linearAlign.START.value,
            ...input,
        },
        type: "alongPath",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<AlongPathDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<AlongPathDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"shape"}>
                Shape
            </SocketIn>
            <SocketIn node={node} socketId={"path"}>
                Path
            </SocketIn>
            <SocketIn node={node} socketId={"memberAlign"}>
                <CheckBox checked={node.payload.memberAlign} onToggle={(memberAlign) => handleUpdate({ memberAlign })} disabled={node.in.memberAlign !== null}>
                    Align to Path
                </CheckBox>
            </SocketIn>
            <SocketIn node={node} socketId={"memberRotation"} label={"Member Rotation"}>
                <AngleInput.SliderInput value={node.payload.memberRotation} onCommit={(memberRotation) => handleUpdate({ memberRotation })} disabled={node.in.memberRotation !== null} />
            </SocketIn>
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
        </TypicalNode>
    );
};

const ALL_INPUTS: (keyof AlongPathDefinition["inputs"])[] = ["shape", "path", "memberAlign", "memberRotation", "overflowMode", "offsetMode", "offsetPercent", "offsetLength", "offsetOrigin"];

const dependsOn = (_node: NodeDefinitions.NodeFor<AlongPathDefinition>, _outSocket: keyof AlongPathDefinition["outputs"], _deps: AllDeps): (keyof AlongPathDefinition["inputs"])[] => {
    return ALL_INPUTS;
};

const contributesTo = (_node: NodeDefinitions.NodeFor<AlongPathDefinition>, _inSocket: keyof AlongPathDefinition["inputs"], _deps: AllDeps): (keyof AlongPathDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<AlongPathDefinition>, socket: keyof AlongPathDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const pathData = context.resolve<"path">(node.id, "path")?.data;
    if (!pathData) return null;

    const shapeData = context.resolve<"shape">(node.id, "shape")?.data;
    if (!shapeData) return null;

    const memberAlign = context.resolve<"boolean">(node.id, "memberAlign")?.data ?? node.payload.memberAlign ?? true;
    const memberRotation = NumericString.Emptyable.asNumber(context.resolve<"angle">(node.id, "memberRotation")?.data ?? node.payload.memberRotation) ?? 0;
    const overflowMode = Enum.resolve(context.resolve<"enum">(node.id, "overflowMode")?.data, Enum.Common.overflowMode) ?? node.payload.overflowMode;

    const offsetMode = Enum.resolve(context.resolve<"enum">(node.id, "offsetMode")?.data, Enum.Common.offsetMode) ?? node.payload.offsetMode;
    const offsetOrigin = Enum.resolve(context.resolve<"enum">(node.id, "offsetOrigin")?.data, Enum.Common.linearAlign) ?? node.payload.offsetOrigin;
    const originPct = [0, 50, 100][offsetOrigin] ?? 0;

    let distance: { percent: number; px: number };
    if (offsetMode === Enum.Common.offsetMode.RELATIVE.value) {
        const pct = NumericString.Emptyable.asNumber(context.resolve<"float" | "integer">(node.id, "offsetPercent")?.data ?? node.payload.offsetPercent) ?? 0;
        distance = { percent: originPct + pct, px: 0 };
    } else {
        const len = context.resolve<"length">(node.id, "offsetLength")?.data ?? node.payload.offsetLength;
        const lenNum = Length.Emptyable.asNumber(len) ?? 0;
        distance = { percent: originPct, px: lenNum };
    }

    return {
        kind: "shape",
        data: {
            type: "offsetPath",
            shape: shapeData,
            path: {
                d: pathData.d,
                distance,
                overflow: overflowMode === Enum.Common.overflowMode.WRAP.value ? "wrap" : "clamp",
                rotate: { auto: memberAlign, degrees: memberRotation },
            },
            transform: pathData.transform,
            preview: pathData.preview,
        },
    };
};

const SOCKETTYPES_IN: { [key in keyof Required<AlongPathDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    shape: { types: ["shape"], mode: "or" },
    path: { types: ["path"], mode: "or" },
    memberAlign: { types: ["boolean"], mode: "or" },
    memberRotation: { types: ["angle"], mode: "or" },
    overflowMode: { types: ["enum"], mode: "or" },
    offsetMode: { types: ["enum"], mode: "or" },
    offsetPercent: { types: ["float", "integer"], mode: "or" },
    offsetLength: { types: ["length"], mode: "or" },
    offsetOrigin: { types: ["enum"], mode: "or" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<AlongPathDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["shape"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<AlongPathDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const AlongPathNodeType: NodeTypes.Type<"alongPath", AlongPathDefinition> = {
    type: "alongPath",
    displayName: "Along Path",
    defaultLabel: "Along Path",
    iconNode: <Icon shape={NODE_ICONS.sequence} color={"var(--icon-flavour)"} />,
    category: "Collections",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
