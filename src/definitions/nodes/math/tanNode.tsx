import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { Project } from "../../../state/project";
import { extractSingle } from "./numericMath";

const TRIG_IN: SocketTypes.SocketRule = { types: ["angle", "float", "integer"], mode: "or" };
const FLOAT_OUT: SocketTypes.SocketRule = { types: ["float"], mode: "or" };

export type TanDefinition = {
    inputs: {
        input: DataTypes.Use<"float">;
    };
    outputs: {
        output: DataTypes.Use<"float">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        input: DataTypes.TypeOf<DataTypes.Use<"float">>;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<TanDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"tan", TanDefinition> => {
    return {
        id,
        in: { input: null },
        out: { output: [] },
        payload: {
            label: "",
            input: input.input ?? "0",
        },
        type: "tan",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<TanDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<TanDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} type={"float"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"input"} type={"angle float integer"} label={"Input"}>
                <DecimalInput value={node.payload.input} onCommit={(input) => handleUpdate({ input })} disabled={node.in.input !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<TanDefinition>, outSocket: "output", _deps: AllDeps): (keyof TanDefinition["inputs"])[] => {
    if (outSocket === "output") return ["input"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<TanDefinition>, _inSocket: keyof TanDefinition["inputs"], _deps: AllDeps): (keyof TanDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<TanDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const val = context.resolve(node.id, "input");
        const kind = val?.kind ?? "float";
        const data = val?.data ?? node.payload.input;
        const { value } = extractSingle(kind, data);
        const radians = kind === "angle" ? (value * Math.PI) / 180 : value;
        return { kind: "float", data: `${Math.tan(radians)}` as `${number}` };
    }
    return null;
};

const getSocketType = (_node: NodeDefinitions.NodeFor<TanDefinition>, socketId: string, _side: "in" | "out", _ctx: NodeTypes.MethodContext): SocketTypes.SocketRule => {
    switch (socketId) {
        case "input":
            return TRIG_IN;
        case "output":
            return FLOAT_OUT;
        default:
            return TRIG_IN;
    }
};

export const TanType: NodeTypes.Type<"tan", TanDefinition> = {
    type: "tan",
    displayName: "Tan",
    defaultLabel: "Tan",
    iconNode: <Icon shape={NODE_ICONS.wave.Item} color={"var(--icon-flavour)"} />,
    iconCard: <Icon shape={NODE_ICONS.wave.Card} color={"var(--icon-flavour)"} />,
    category: "Math",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    getSocketType,
};
