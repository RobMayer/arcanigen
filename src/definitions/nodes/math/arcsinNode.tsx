import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { Project } from "../../../state/project";
import { extractSingle, makeCanInterject, makeOnInterject } from "./numericMath";

const DIMENSIONLESS_IN: SocketTypes.SocketRule = { types: ["float", "integer"], mode: "or" };
const ANGLE_OUT: SocketTypes.SocketRule = { types: ["angle"], mode: "or" };

export type ArcsinDefinition = {
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

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<ArcsinDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"arcsin", ArcsinDefinition> => {
    return {
        id,
        in: { input: null },
        out: { output: [] },
        payload: {
            label: "",
            input: input.input ?? "0",
        },
        type: "arcsin",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<ArcsinDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<ArcsinDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"input"} label={"Input"}>
                <DecimalInput value={node.payload.input} onCommit={(input) => handleUpdate({ input })} disabled={node.in.input !== null} />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<ArcsinDefinition>, outSocket: "output", _deps: AllDeps): (keyof ArcsinDefinition["inputs"])[] => {
    if (outSocket === "output") return ["input"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<ArcsinDefinition>, _inSocket: keyof ArcsinDefinition["inputs"], _deps: AllDeps): (keyof ArcsinDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<ArcsinDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket === "output") {
        const val = context.resolve(node.id, "input");
        const kind = val?.kind ?? "float";
        const data = val?.data ?? node.payload.input;
        const { value } = extractSingle(kind, data);
        const clamped = Math.max(-1, Math.min(1, value));
        const degrees = (Math.asin(clamped) * 180) / Math.PI;
        return { kind: "angle", data: `${degrees}` };
    }
    return null;
};

const getSocketType = (_node: NodeDefinitions.NodeFor<ArcsinDefinition>, socketId: string, _side: "in" | "out", _ctx: NodeTypes.MethodContext): SocketTypes.SocketRule => {
    switch (socketId) {
        case "input":
            return DIMENSIONLESS_IN;
        case "output":
            return ANGLE_OUT;
        default:
            return DIMENSIONLESS_IN;
    }
};

export const ArcsinType: NodeTypes.Type<"arcsin", ArcsinDefinition> = {
    type: "arcsin",
    displayName: "Arcsin",
    defaultLabel: "Arcsin",
    iconNode: <Icon shape={NODE_ICONS.sine} color={"var(--icon-flavour)"} />,
    category: "Math",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    getSocketType,
    canInterject: makeCanInterject(DIMENSIONLESS_IN, ANGLE_OUT),
    onInterject: makeOnInterject("input", "output"),
};
