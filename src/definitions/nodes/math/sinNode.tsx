import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { extractSingle, makeCanInterject, makeOnInterject } from "./numericMath";

const TRIG_IN: SocketTypes.SocketRule = { types: ["angle", "float", "integer"], mode: "or" };
const FLOAT_OUT: SocketTypes.SocketRule = { types: ["float"], mode: "or" };

export type SinDefinition = {
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

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<SinDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"sin", SinDefinition> => {
    return {
        id,
        in: { input: null },
        out: { output: [] },
        payload: {
            label: "",
            input: input.input ?? "0",
        },
        type: "sin",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<SinDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<SinDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const graphId = useGraphId();
    const preview = Project.useCachedOutput(graphId, node, "output");
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"} label={"Output"}>
                <ValuePreview value={preview} />
            </SocketOut>
            <SocketIn node={node} socketId={"input"} label={"Input"}>
                <DecimalInput value={node.payload.input} onCommit={(input) => handleUpdate({ input })} disabled={node.in.input !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<SinDefinition>, outSocket: "output", _deps: AllDeps): (keyof SinDefinition["inputs"])[] => {
    if (outSocket === "output") return ["input"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<SinDefinition>, _inSocket: keyof SinDefinition["inputs"], _deps: AllDeps): (keyof SinDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<SinDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const val = context.resolve(node.id, "input");
        const kind = val?.kind ?? "float";
        const data = val?.data ?? node.payload.input;
        const { value } = extractSingle(kind, data);
        const radians = kind === "angle" ? (value * Math.PI) / 180 : value;
        return { kind: "float", data: `${Math.sin(radians)}` };
    }
    return null;
};

const getSocketType = (_node: NodeDefinitions.NodeFor<SinDefinition>, socketId: string, _side: "in" | "out", _ctx: NodeTypes.MethodContext): SocketTypes.SocketRule => {
    switch (socketId) {
        case "input":
            return TRIG_IN;
        case "output":
            return FLOAT_OUT;
        default:
            return TRIG_IN;
    }
};

export const SinType: NodeTypes.Type<"sin", SinDefinition> = {
    type: "sin",
    displayName: "Sin",
    defaultLabel: "Sin",
    iconNode: <Icon shape={NODE_ICONS.sine} color={"var(--icon-flavour)"} />,
    category: "Math",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    getSocketType,
    canInterject: makeCanInterject(TRIG_IN, FLOAT_OUT),
    onInterject: makeOnInterject("input", "output"),
};
