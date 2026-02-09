import { nanoid } from "nanoid";
import { ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { Slot, SocketIn } from "../../../features/nodeview/slots";
import { DataTypes, NodeDefinitions, NodeTypes } from "../../betterTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import SliderInput from "../../../components/inputs/SliderInput";
import { NumericString } from "../../datatypes/numericString";

export type DebugDefinition = {
    inputs: {
        input: DataTypes.Use<"float">;
    };
    outputs: never;
    payload: {
        label: DataTypes.Use<"string">;
        someFloat: DataTypes.Use<"float">;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<DebugDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"debug", DebugDefinition> => {
    return {
        id,
        in: {
            input: null,
        },
        out: {},
        payload: {
            label: "",
            someFloat: "0.5",
        },
        type: "debug",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<DebugDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const valueToRender = Project.useCachedInput(graphId, node, "input")?.data;

    const onValue = useCallback((v: NumericString.Type) => {
        console.log("onValue", v);
    }, []);

    const onCommit = useCallback((v: NumericString.Type) => {
        console.log("onCommit", v);
    }, []);

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketIn node={node} socketId={"input"} type={"float"} label={"Value"}>
                {valueToRender ?? "Nothing"}
            </SocketIn>
            <Slot label={"Some Float"}>
                <SliderInput value={node.payload.someFloat} onValue={onValue} onCommit={onCommit} />
            </Slot>
        </TypicalNode>
    );
};

const dependsOn = (node: NodeDefinitions.NodeFor<DebugDefinition>, outSocket: keyof DebugDefinition["outputs"]): (keyof DebugDefinition["inputs"])[] => {
    return [];
};
const evaluate = (node: NodeDefinitions.NodeFor<DebugDefinition>, socket: keyof DebugDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    return null;
};

export const DebugType: NodeTypes.Type<"debug", DebugDefinition> = {
    type: "debug",
    displayName: "Debug",
    defaultLabel: "Debug",
    iconNode: ICONS.Bug,
    iconCard: ICONS.Bug,
    category: "meta",
    evaluate,
    Controls,
    dependsOn,
    create,
};
