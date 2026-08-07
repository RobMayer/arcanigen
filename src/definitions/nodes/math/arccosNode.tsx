import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject } from "../nodeHelpers";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut, ValuePreview } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { Project } from "../../../state/project";
import { extractSingle } from "./numericMath";
import { useGraphId } from "../../../state/graphId";

const DIMENSIONLESS_IN: SocketTypes.SocketRule = { types: ["float", "integer"], mode: "or" };
const ANGLE_OUT: SocketTypes.SocketRule = { types: ["angle"], mode: "or" };

export type ArccosDefinition = {
    inputs: {
        input: DataTypes.Use<"float">;
    };
    outputs: {
        output: DataTypes.Use<"angle">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        input: DataTypes.TypeOf<DataTypes.Use<"float">>;
    };
};

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<ArccosDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"arccos", ArccosDefinition> => {
    return {
        id,
        in: { input: null },
        out: { output: [] },
        payload: {
            label: "",
            input: input.input ?? "0",
        },
        type: "arccos",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ArccosDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();

    const preview = Project.useCachedOutput(graphId, node, "output");

    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ArccosDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

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

const dependsOn = (_node: NodeDefinitions.NodeFor<ArccosDefinition>, outSocket: "output", _deps: AllDeps): (keyof ArccosDefinition["inputs"])[] => {
    if (outSocket === "output") return ["input"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ArccosDefinition>, _inSocket: keyof ArccosDefinition["inputs"], _deps: AllDeps): (keyof ArccosDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<ArccosDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const val = context.resolve(node.id, "input");
        const kind = val?.kind ?? "float";
        const data = val?.data ?? node.payload.input;
        const { value } = extractSingle(kind, data);
        const clamped = Math.max(-1, Math.min(1, value));
        const degrees = (Math.acos(clamped) * 180) / Math.PI;
        return { kind: "angle", data: `${degrees}` };
    }
    return null;
};

const getSocketType = (_node: NodeDefinitions.NodeFor<ArccosDefinition>, socketId: string, _side: "in" | "out", _ctx: NodeTypes.MethodContext): SocketTypes.SocketRule => {
    switch (socketId) {
        case "input":
            return DIMENSIONLESS_IN;
        case "output":
            return ANGLE_OUT;
        default:
            return DIMENSIONLESS_IN;
    }
};

export const ArccosType: NodeTypes.Type<"arccos", ArccosDefinition> = {
    type: "arccos",
    displayName: "Arccos",
    defaultLabel: "Arccos",
    iconNode: <NodeIcon shape={NODE_ICONS.sine} />,
    flavour: "help",
    category: "Math",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    getSocketType,
    canInterject: passthroughCanInterject(DIMENSIONLESS_IN, ANGLE_OUT),
    onInterject: passthroughInterject("input", "output"),
};
