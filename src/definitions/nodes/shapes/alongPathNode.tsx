import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { NumericString } from "../../datatypes/numericString";
import { CheckBox } from "../../../components/buttons/CheckBox";


export type AlongPathDefinition = {
    inputs: {
        shape: DataTypes.Use<"shape">;
        path: DataTypes.Use<"path">;
        alignToPath: DataTypes.Use<"boolean">;
        offsetMode: DataTypes.Use<"enum">;
        offsetPercent: DataTypes.Use<"float">;
        offsetLength: DataTypes.Use<"length">;
        offsetOrigin: DataTypes.Use<"enum">;
    };
    outputs: {
        output: DataTypes.Use<"shape">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        alignToPath: DataTypes.TypeOf<DataTypes.Use<"boolean">>;
        offsetMode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        offsetPercent: DataTypes.TypeOf<DataTypes.Use<"float">>;
        offsetLength: DataTypes.TypeOf<DataTypes.Use<"length">>;
        offsetOrigin: DataTypes.TypeOf<DataTypes.Use<"enum">>;
    };
};

const OFFSET_MODE_OPTIONS = Enum.options(Enum.Common.offsetMode);
const OFFSET_ORIGIN_OPTIONS = Enum.options(Enum.Common.offsetOrigin);

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<AlongPathDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"alongPath", AlongPathDefinition> => {
    return {
        id,
        in: {
            shape: null,
            path: null,
            alignToPath: null,
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
            alignToPath: true,
            offsetMode: Enum.Common.offsetMode.Relative,
            offsetPercent: "0",
            offsetLength: "0px",
            offsetOrigin: Enum.Common.offsetOrigin.Start,
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
            <SocketOut node={node} socketId={"output"} type={"shape"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"shape"} type={"shape"} label={"Shape"} />
            <SocketIn node={node} socketId={"path"} type={"path"} label={"Path"} />
            <SocketIn node={node} socketId={"alignToPath"} type={"boolean"}>
                <CheckBox checked={node.payload.alignToPath} onToggle={(alignToPath) => handleUpdate({ alignToPath })} disabled={node.in.alignToPath !== null}>
                    Align to Path
                </CheckBox>
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
            <SocketIn node={node} socketId={"offsetPercent"} type={"float"} label={"Offset %"}>
                <DecimalInput.SliderInput
                    value={node.payload.offsetPercent}
                    onCommit={(offsetPercent) => handleUpdate({ offsetPercent })}
                    disabled={node.in.offsetPercent !== null || node.payload.offsetMode !== Enum.Common.offsetMode.Relative}
                    min={-100}
                    max={100}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"offsetLength"} type={"length"} label={"Offset Length"}>
                <LengthInput
                    value={node.payload.offsetLength}
                    onCommit={(offsetLength) => handleUpdate({ offsetLength })}
                    disabled={node.in.offsetLength !== null || node.payload.offsetMode !== Enum.Common.offsetMode.Absolute}
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
        </TypicalNode>
    );
};

const ALL_INPUTS: (keyof AlongPathDefinition["inputs"])[] = ["shape", "path", "alignToPath", "offsetMode", "offsetPercent", "offsetLength", "offsetOrigin"];

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

    const alignToPath = context.resolve<"boolean">(node.id, "alignToPath")?.data ?? node.payload.alignToPath ?? true;

    const offsetMode = context.resolve<"enum">(node.id, "offsetMode")?.data ?? node.payload.offsetMode;
    const offsetOrigin = context.resolve<"enum">(node.id, "offsetOrigin")?.data ?? node.payload.offsetOrigin;
    const originPct = ["0%", "50%", "100%"][offsetOrigin] ?? "0%";

    let offsetDistance: string;
    if (offsetMode === Enum.Common.offsetMode.Relative) {
        const pct = NumericString.Emptyable.asNumber(context.resolve<"float">(node.id, "offsetPercent")?.data ?? node.payload.offsetPercent) ?? 0;
        offsetDistance = `calc(clamp(0%, ${originPct} + ${pct}%, 100%))`;
    } else {
        const len = context.resolve<"length">(node.id, "offsetLength")?.data ?? node.payload.offsetLength;
        const lenNum = Length.Emptyable.asNumber(len) ?? 0;
        offsetDistance = `calc(clamp(0%, ${originPct} + ${lenNum}px, 100%))`;
    }

    return {
        kind: "shape",
        data: {
            type: "offsetPath",
            shape: shapeData,
            path: {
                d: pathData.d,
                distance: offsetDistance,
                rotate: alignToPath ? "auto" : "0deg",
            },
            transform: pathData.transform,
            preview: pathData.preview,
        },
    };
};

const ALONGPATH_SOCKET_TYPES: Record<string, string> = {
    shape: "shape",
    path: "path",
    alignToPath: "boolean",
    offsetMode: "enum",
    offsetPercent: "float",
    offsetLength: "length",
    offsetOrigin: "enum",
    output: "shape",
};

const getSocketType = (_node: NodeDefinitions.NodeFor<AlongPathDefinition>, socketId: string, _side: "in" | "out"): string => ALONGPATH_SOCKET_TYPES[socketId] ?? "float";

export const AlongPathNodeType: NodeTypes.Type<"alongPath", AlongPathDefinition> = {
    type: "alongPath",
    displayName: "Along Path",
    defaultLabel: "Along Path",
    iconNode: <Icon shape={NODE_ICONS.alongPath.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.alongPath.Card} color={"var(--icon-flavour)"} />,
    category: "Shapes",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
