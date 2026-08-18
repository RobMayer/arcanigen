import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, SocketPair } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { NumericString } from "../../datatypes/numericString";
import { PaperHelper } from "../../../util/paperHelper";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

// A single point sampled from a path plus its tangent heading. The offset controls mirror alongPath
// exactly (where along the path); it just returns the point+angle as DATA instead of placing a shape
// there. Compound paths sample as one concatenated length line (see PaperHelper.sampleMany).
const def = signature({
    in: {
        path: "path",
        overflowMode: "enum",
        offsetMode: "enum",
        offsetPercent: $.oneOf("float", "integer"),
        offsetLength: "length",
        offsetOrigin: "enum",
    },
    out: { point: "point", angle: "angle" },
});

export type PointOnPathDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
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

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<PointOnPathDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"pointOnPath", PointOnPathDefinition> => {
    return {
        id,
        in: {
            path: null,
            overflowMode: null,
            offsetMode: null,
            offsetPercent: null,
            offsetLength: null,
            offsetOrigin: null,
        },
        out: {
            point: [],
            angle: [],
        },
        payload: {
            label: "",
            overflowMode: Enum.Common.overflowMode.CLAMP.value,
            offsetMode: Enum.Common.offsetMode.RELATIVE.value,
            offsetPercent: "0",
            offsetLength: "0px",
            offsetOrigin: Enum.Common.linearAlign.START.value,
            ...input,
        },
        type: "pointOnPath",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PointOnPathDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PointOnPathDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketPair node={node} socketInId={"path"} socketOutId={"point"}>
                <span>Path</span>
                <span>Point</span>
            </SocketPair>
            <SocketOut node={node} socketId={"angle"}>
                Angle
            </SocketOut>
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

const ALL_INPUTS: (keyof PointOnPathDefinition["inputs"])[] = ["path", "overflowMode", "offsetMode", "offsetPercent", "offsetLength", "offsetOrigin"];

const dependsOn = (_node: NodeDefinitions.NodeFor<PointOnPathDefinition>, _outSocket: keyof PointOnPathDefinition["outputs"], _deps: AllDeps): (keyof PointOnPathDefinition["inputs"])[] => {
    return ALL_INPUTS;
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PointOnPathDefinition>, _inSocket: keyof PointOnPathDefinition["inputs"], _deps: AllDeps): (keyof PointOnPathDefinition["outputs"])[] => {
    return ["point", "angle"];
};

// Resolve the offset controls to the distance-along-path, exactly as alongPath does.
const resolveSample = (node: NodeDefinitions.NodeFor<PointOnPathDefinition>, context: Resolver.Context): PaperHelper.Sample | null => {
    const pathData = context.resolve<DataTypes.Path>(node.id, "path")?.data;
    if (!pathData) return null;

    const overflowMode = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "overflowMode")?.data, Enum.Common.overflowMode) ?? node.payload.overflowMode;
    const offsetMode = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "offsetMode")?.data, Enum.Common.offsetMode) ?? node.payload.offsetMode;
    const offsetOrigin = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "offsetOrigin")?.data, Enum.Common.linearAlign) ?? node.payload.offsetOrigin;
    const originPct = [0, 50, 100][offsetOrigin] ?? 0;

    let distance: PaperHelper.Distance;
    if (offsetMode === Enum.Common.offsetMode.RELATIVE.value) {
        const pct = NumericString.Emptyable.asNumber(context.resolve<DataTypes.Float | DataTypes.Integer>(node.id, "offsetPercent")?.data ?? node.payload.offsetPercent) ?? 0;
        distance = { percent: originPct + pct, px: 0 };
    } else {
        const lenNum = Length.Emptyable.asNumber(context.resolve<DataTypes.Length>(node.id, "offsetLength")?.data ?? node.payload.offsetLength) ?? 0;
        distance = { percent: originPct, px: lenNum };
    }

    const overflow = overflowMode === Enum.Common.overflowMode.WRAP.value ? "wrap" : "clamp";
    return PaperHelper.sampleAt(pathData, distance, overflow);
};

const evaluate = (node: NodeDefinitions.NodeFor<PointOnPathDefinition>, socket: keyof PointOnPathDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const sample = resolveSample(node, context);
    if (!sample) return null;

    if (socket === "point") {
        return { kind: "point", data: { x: sample.x, y: sample.y } };
    }
    if (socket === "angle") {
        return { kind: "angle", data: `${sample.angle}deg` };
    }
    return null;
};

export const PointOnPathNodeType: NodeTypes.Type<"pointOnPath", PointOnPathDefinition> = {
    type: "pointOnPath",
    displayName: "Point on Path",
    defaultLabel: "Point on Path",
    iconNode: <NodeIcon shape={NODE_ICONS.path} modifierIcon={NODE_ICONS.point} />,
    flavour: "accent",
    category: "Values",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
