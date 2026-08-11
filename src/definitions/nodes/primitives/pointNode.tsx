import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { PointHelper } from "../../helpers/pointHelper";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { mode: "enum", x: "length", y: "length", radius: "length", theta: "angle" },
    out: { output: "point" },
});

export type PointDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<"string">;
        mode: DataTypes.TypeOf<"enum">;
        x: DataTypes.TypeOf<"length">;
        y: DataTypes.TypeOf<"length">;
        radius: DataTypes.TypeOf<"length">;
        theta: DataTypes.TypeOf<"angle">;
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<PointDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"point", PointDefinition> => {
    return {
        id,
        in: {
            mode: null,
            x: null,
            y: null,
            radius: null,
            theta: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            mode: Enum.Common.positionMode.CARTESIAN.value,
            x: "0px",
            y: "0px",
            radius: "100px",
            theta: "0",
        },
        type: "point",
    };
};

const POSITION_MODE_OPTIONS = Enum.options(Enum.Common.positionMode);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PointDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PointDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const isCartesian = node.payload.mode === Enum.Common.positionMode.CARTESIAN.value && node.in.mode === null;
    const isPolar = node.payload.mode === Enum.Common.positionMode.POLAR.value && node.in.mode === null;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"mode"} label={"Mode"}>
                <RadioButton.Group
                    options={POSITION_MODE_OPTIONS}
                    value={`${node.payload.mode}`}
                    onValue={(v) => handleUpdate({ mode: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.mode !== null}
                />
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"x"} label={"X"}>
                <LengthInput value={node.payload.x} onCommit={(x) => handleUpdate({ x })} disabled={node.in.x !== null || isPolar} required />
            </SocketIn>
            <SocketIn node={node} socketId={"y"} label={"Y"}>
                <LengthInput value={node.payload.y} onCommit={(y) => handleUpdate({ y })} disabled={node.in.y !== null || isPolar} required />
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"radius"} label={"Radius"}>
                <LengthInput value={node.payload.radius} onCommit={(radius) => handleUpdate({ radius })} disabled={node.in.radius !== null || isCartesian} required />
            </SocketIn>
            <SocketIn node={node} socketId={"theta"} label={"Theta"}>
                <AngleInput.SliderInput value={node.payload.theta} onCommit={(theta) => handleUpdate({ theta })} disabled={node.in.theta !== null || isCartesian} />
            </SocketIn>
        </TypicalNode>
    );
};

const GEOMETRY_INPUTS: (keyof PointDefinition["inputs"])[] = ["mode", "x", "y", "radius", "theta"];

const dependsOn = (_node: NodeDefinitions.NodeFor<PointDefinition>, outSocket: "output", _deps: AllDeps): (keyof PointDefinition["inputs"])[] => {
    if (outSocket === "output") return GEOMETRY_INPUTS;
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PointDefinition>, inSocket: keyof PointDefinition["inputs"], _deps: AllDeps): (keyof PointDefinition["outputs"])[] => {
    if (GEOMETRY_INPUTS.includes(inSocket)) return ["output"];
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<PointDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const mode = Enum.resolve(context.resolve<"enum">(node.id, "mode")?.data, Enum.Common.positionMode) ?? node.payload.mode ?? 0;
    const x = context.resolve<"length">(node.id, "x")?.data ?? node.payload.x;
    const y = context.resolve<"length">(node.id, "y")?.data ?? node.payload.y;
    const radius = context.resolve<"length">(node.id, "radius")?.data ?? node.payload.radius;
    const theta = context.resolve<"angle">(node.id, "theta")?.data ?? node.payload.theta;

    return { kind: "point", data: PointHelper.resolve(mode, x, y, radius, theta) };
};

export const PointPrimitiveType: NodeTypes.Type<"point", PointDefinition> = {
    type: "point",
    displayName: "Point",
    defaultLabel: "Point",
    iconNode: <NodeIcon shape={NODE_ICONS.point} />,
    flavour: "accent",
    category: "Values",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
