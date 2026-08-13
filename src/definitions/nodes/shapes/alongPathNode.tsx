import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject } from "../../helpers/nodeHelper";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Angle } from "../../datatypes/angle";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { SocketTypes } from "../../socketTypes";
import { Project } from "../../../state/project";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { NumericString } from "../../datatypes/numericString";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: {
        shape: "shape",
        path: "path",
        memberAlign: "boolean",
        memberRotation: "angle",
        overflowMode: "enum",
        offsetMode: "enum",
        offsetPercent: $.oneOf("float", "integer"),
        offsetLength: "length",
        offsetOrigin: "enum",
    },
    out: { output: "shape" },
});

export type AlongPathDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        memberAlign: DataTypes.TypeOf<DataTypes.Boolean>;
        memberRotation: DataTypes.TypeOf<DataTypes.Angle>;
        overflowMode: DataTypes.TypeOf<DataTypes.Enum>;
        offsetMode: DataTypes.TypeOf<DataTypes.Enum>;
        offsetPercent: DataTypes.TypeOf<DataTypes.Float>;
        offsetLength: DataTypes.TypeOf<DataTypes.Length>;
        offsetOrigin: DataTypes.TypeOf<DataTypes.Enum>;
    }
>;

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
            memberRotation: "0deg",
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

    const pathData = context.resolve<DataTypes.Path>(node.id, "path")?.data;
    if (!pathData) return null;

    const shapeData = context.resolve<DataTypes.Shape>(node.id, "shape")?.data;
    if (!shapeData) return null;

    const memberAlign = context.resolve<DataTypes.Boolean>(node.id, "memberAlign")?.data ?? node.payload.memberAlign ?? true;
    const memberRotation = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "memberRotation")?.data ?? node.payload.memberRotation) ?? 0;
    const overflowMode = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "overflowMode")?.data, Enum.Common.overflowMode) ?? node.payload.overflowMode;

    const offsetMode = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "offsetMode")?.data, Enum.Common.offsetMode) ?? node.payload.offsetMode;
    const offsetOrigin = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "offsetOrigin")?.data, Enum.Common.linearAlign) ?? node.payload.offsetOrigin;
    const originPct = [0, 50, 100][offsetOrigin] ?? 0;

    let distance: { percent: number; px: number };
    if (offsetMode === Enum.Common.offsetMode.RELATIVE.value) {
        const pct = NumericString.Emptyable.asNumber(context.resolve<DataTypes.Float | DataTypes.Integer>(node.id, "offsetPercent")?.data ?? node.payload.offsetPercent) ?? 0;
        distance = { percent: originPct + pct, px: 0 };
    } else {
        const len = context.resolve<DataTypes.Length>(node.id, "offsetLength")?.data ?? node.payload.offsetLength;
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

export const AlongPathNodeType: NodeTypes.Type<"alongPath", AlongPathDefinition> = {
    type: "alongPath",
    displayName: "Along Path",
    defaultLabel: "Along Path",
    iconNode: <NodeIcon shape={NODE_ICONS.sequence} />,
    flavour: "danger",
    category: "Modifiers",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
    canInterject: passthroughCanInterject(SocketTypes.of(DataTypes.SHAPE), SocketTypes.of(DataTypes.SHAPE)),
    onInterject: passthroughInterject("shape", "output"),
};
