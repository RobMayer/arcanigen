import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { DecimalInput } from "../../../components/inputs/DecimalInput";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { PaperHelper } from "../../../util/paperHelper";
import { NumericString } from "../../datatypes/numericString";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: { path: "path", sampleAt: $.oneOf("float", "integer") },
    out: { output: "length" },
});

export type PathLengthDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<"string">;
        sampleAt: DataTypes.TypeOf<"float">;
    }
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<PathLengthDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"pathLength", PathLengthDefinition> => {
    return {
        id,
        in: {
            path: null,
            sampleAt: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            sampleAt: input.sampleAt ?? "100",
        },
        type: "pathLength",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PathLengthDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PathLengthDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"path"}>
                Path
            </SocketIn>
            <SocketIn node={node} socketId={"sampleAt"} label={"Sample At (%)"}>
                <DecimalInput.SliderInput
                    value={node.payload.sampleAt}
                    onCommit={(sampleAt) => handleUpdate({ sampleAt })}
                    disabled={node.in.sampleAt !== null}
                    required
                    min={0}
                    max={100}
                    snap={0.001}
                />
            </SocketIn>
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<PathLengthDefinition>, outSocket: "output", _deps: AllDeps): (keyof PathLengthDefinition["inputs"])[] => {
    if (outSocket === "output") return ["path", "sampleAt"];
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PathLengthDefinition>, inSocket: keyof PathLengthDefinition["inputs"], _deps: AllDeps): (keyof PathLengthDefinition["outputs"])[] => {
    if (inSocket === "path" || inSocket === "sampleAt") return ["output"];
    return [];
};

const evaluate = (node: NodeDefinitions.NodeFor<PathLengthDefinition>, socket: "output", context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const pathData = context.resolve<"path">(node.id, "path")?.data;
    if (!pathData) return null;

    const total = PaperHelper.pathLength(pathData);
    if (total === null) return null;

    const pct = NumericString.Emptyable.asNumber(context.resolve<"float" | "integer">(node.id, "sampleAt")?.data ?? node.payload.sampleAt) ?? 100;
    const frac = Math.max(0, Math.min(100, pct)) / 100;

    return {
        kind: "length",
        data: `${Number((total * frac).toFixed(6))}px`,
    };
};

export const PathLengthNodeType: NodeTypes.Type<"pathLength", PathLengthDefinition> = {
    type: "pathLength",
    displayName: "Path Length",
    defaultLabel: "Path Length",
    iconNode: <NodeIcon shape={NODE_ICONS.length} />,
    flavour: "help",
    category: "Math",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
