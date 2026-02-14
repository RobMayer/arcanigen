import { nanoid } from "nanoid";
import { NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AngleInput } from "../../../components/inputs/AngleInput";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { CheckBox } from "../../../components/buttons/CheckBox";
import { useGraphId } from "../../../state/graphId";

export type AngleDefinition = {
    inputs: {
        value: DataTypes.Use<"angle">;
        wraps: DataTypes.Use<"boolean">;
    };
    outputs: {
        output: DataTypes.Use<"angle">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        value: DataTypes.TypeOf<DataTypes.Use<"angle">>;
        wraps: DataTypes.TypeOf<DataTypes.Use<"boolean">>;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<AngleDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"angle", AngleDefinition> => {
    return {
        id,
        in: {
            value: null,
            wraps: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            value: "0",
            wraps: false,
        },
        type: "angle",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<AngleDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const wraps = Project.useCachedInput(graphId, node, "wraps")?.data ?? node.payload.wraps;

    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<AngleDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"angle"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"value"} type={"angle"} label={"Value"}>
                <AngleInput.SliderInput value={node.payload.value} onCommit={(value) => handleUpdate({ value })} disabled={node.in.value !== null} unbound={!wraps} />
            </SocketIn>
            <SocketIn node={node} socketId={"wraps"} type={"boolean"} label={"Wraps"}>
                <CheckBox checked={node.payload.wraps} onToggle={(wraps) => handleUpdate({ wraps })} disabled={node.in.wraps !== null}>
                    Wraps value between 0-360
                </CheckBox>
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<AngleDefinition>, outSocket: "output", _deps: AllDeps): (keyof AngleDefinition["inputs"])[] => {
    if (outSocket === "output") return ["value"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<AngleDefinition>, inSocket: keyof AngleDefinition["inputs"], _deps: AllDeps): (keyof AngleDefinition["outputs"])[] => {
    if (inSocket === "value") return ["output"];
    return [];
};
const evaluate = (node: NodeDefinitions.NodeFor<AngleDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        return {
            kind: "angle",
            data: context.resolve<"angle">(node.id, "value")?.data ?? node.payload.value,
        };
    }
    return null;
};

export const AnglePrimitiveType: NodeTypes.Type<"angle", AngleDefinition> = {
    type: "angle",
    displayName: "Angle",
    defaultLabel: "Angle",
    iconNode: NODE_ICONS.angleValue.Item,
    iconCard: NODE_ICONS.angleValue.Card,
    category: "primitive",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
};
