import { nanoid } from "nanoid";
import { Enum } from "../../datatypes/enum";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { ReactNode, useCallback } from "react";
import { TypicalNode } from "../../../features/nodeview/node";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { Dropdown } from "../../../components/inputs/Dropdown";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { NumericString } from "../../datatypes/numericString";

export type DistributionNodeDefinition = {
    inputs: {
        func: DataTypes.Use<"enum">;
        easing: DataTypes.Use<"enum">;
        intensity: DataTypes.Use<"float" | "integer">;
    };
    outputs: {
        output: DataTypes.Use<"distribution">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        func: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        easing: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        intensity: DataTypes.TypeOf<DataTypes.Use<"float">>;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<DistributionNodeDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"distribution", DistributionNodeDefinition> => {
    return {
        id,
        in: {
            func: null,
            easing: null,
            intensity: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            func: input.func ?? 0,
            easing: input.easing ?? 0,
            intensity: input.intensity ?? "100",
        },
        type: "distribution",
    };
};

const FUNCTION_OPTIONS = [
    { label: "Linear (n)", value: 0 },
    { label: "Quadratic (n²)", value: 1 },
    { label: "Cubic (n³)", value: 2 },
    { label: "Exponential (2ⁿ)", value: 3 },
    { label: "Sinusoidal (sin(n))", value: 4 },
    { label: "Rootic (√n)", value: 5 },
    { label: "Circular (1-√(1-n²))", value: 6 },
];

const EASING_OPTIONS = [
    { label: "In", value: "0" },
    { label: "Out", value: "1" },
    { label: "In-Out", value: "2" },
    { label: "Out-In", value: "3" },
];

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<DistributionNodeDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<DistributionNodeDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"distribution"}>
                Output
            </SocketOut>
            <hr />
            <SocketIn node={node} socketId={"func"} type={"enum"} label={"Function"}>
                <Dropdown value={`${node.payload.func}`} onValue={(func) => handleUpdate({ func: Number(func) })} disabled={node.in.func !== null}>
                    {FUNCTION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </Dropdown>
            </SocketIn>
            <SocketIn node={node} socketId={"easing"} type={"enum"} label={"Easing"}>
                <RadioButton.Group
                    orientation={"horizontal"}
                    value={`${node.payload.easing}`}
                    onValue={(easing) => handleUpdate({ easing: Number(easing) })}
                    disabled={node.in.easing !== null}
                    options={EASING_OPTIONS}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"intensity"} type={"float integer"} label={"Intensity"}>
                <DecimalInput.SliderInput
                    value={node.payload.intensity}
                    onCommit={(intensity) => handleUpdate({ intensity })}
                    disabled={node.in.intensity !== null}
                    min={"0"}
                    max={"100"}
                    step={"0.01"}
                    snap={"0.01"}
                />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<DistributionNodeDefinition>, outSocket: "output", _deps: AllDeps): (keyof DistributionNodeDefinition["inputs"])[] => {
    if (outSocket === "output") return ["func", "easing", "intensity"];
    return [];
};

const contributesTo = (
    _node: NodeDefinitions.NodeFor<DistributionNodeDefinition>,
    _inSocket: keyof DistributionNodeDefinition["inputs"],
    _deps: AllDeps,
): (keyof DistributionNodeDefinition["outputs"])[] => {
    // Both a and b contribute to output
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<DistributionNodeDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const func = Enum.resolve(context.resolve<"enum">(node.id, "func")?.data, Enum.Common.distroFunctions) ?? node.payload.func;
        const easing = Enum.resolve(context.resolve<"enum">(node.id, "easing")?.data, Enum.Common.distroEasing) ?? node.payload.easing;
        const intensity = NumericString.Emptyable.asNumber(context.resolve<"float" | "integer">(node.id, "intensity")?.data ?? node.payload.intensity) ?? 100;
        return {
            kind: "distribution",
            data: { func, easing, intensity: `${intensity / 100}` },
        };
    }
    return null;
};

const SOCKETTYPES_IN: { [key in keyof Required<DistributionNodeDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    func: { types: ["enum"], mode: "or" },
    easing: { types: ["enum"], mode: "or" },
    intensity: { types: ["float", "integer"], mode: "or" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<DistributionNodeDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["distribution"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<DistributionNodeDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const DistributionNodeType: NodeTypes.Type<"distribution", DistributionNodeDefinition> = {
    type: "distribution",
    displayName: "Distribution",
    defaultLabel: "Distribution",
    iconNode: <Icon shape={NODE_ICONS.curveValue.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.curveValue.Card} color={"var(--icon-flavour)"} />,
    category: "Math",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    getSocketType,
};
