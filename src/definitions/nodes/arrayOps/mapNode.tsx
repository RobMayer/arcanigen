import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { ReactNode } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { Resolver } from "../../../util/resolver";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

// Map is a loop END, and the DRIVER: because eval is pull-based, Map is pulled from downstream, so it owns
// the `for` loop. It reads the `pipeline` bus to learn the START (senderId) + iteration count, then for each
// i injects `cursorData[senderId] = i` and re-resolves its `result` body -- collecting one value per
// iteration into an `array<R>`. The paired ForEach just reads whatever index we've injected.
const def = signature({
    args: { R: $.ANY },
    in: ({ R }) => ({ pipeline: $.loopFor($.ANY), result: R }),
    out: ({ R }) => ({ output: $.arrayOf(R) }),
});

export type MapDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
    }
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<MapDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"map", MapDefinition> => {
    return {
        id,
        in: {
            pipeline: null,
            result: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            ...input,
        },
        type: "map",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<MapDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketIn node={node} socketId={"pipeline"}>
                Pipeline
            </SocketIn>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <hr />
            <SocketIn node={node} socketId={"result"}>
                Result
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<MapDefinition>, outSocket: keyof MapDefinition["outputs"], _deps: AllDeps): (keyof MapDefinition["inputs"])[] => {
    if (outSocket === "output") {
        return ["pipeline", "result"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<MapDefinition>, inSocket: keyof MapDefinition["inputs"], _deps: AllDeps): (keyof MapDefinition["outputs"])[] => {
    if (inSocket === "pipeline" || inSocket === "result") {
        return ["output"];
    }
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<MapDefinition>, socket: keyof MapDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const pipeline = context.resolve<DataTypes.LoopFor<DataTypes.AnyKind>>(node.id, "pipeline");
    if (!pipeline) return null;
    const { senderId, count } = pipeline.data;

    const items: unknown[] = [];
    let element = "any"; // element kind of the collected results (overwritten by the first real one)

    for (let i = 0; i < count; i++) {
        // Drive the paired ForEach onto index i, then pull this iteration's transformed value.
        const r = context.resolve<DataTypes.AnyKind>(node.id, "result", { ...context.cursorData, [senderId]: i });
        if (!r) continue;
        element = r.kind;
        items.push(r.data);
    }

    return { kind: `array<${element}>`, data: items };
};

export const MapNodeType: NodeTypes.Type<"map", MapDefinition> = {
    type: "map",
    displayName: "Map",
    defaultLabel: "Map",
    iconNode: <NodeIcon shape={NODE_ICONS.array} />,
    flavour: "danger",
    category: "Math",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
