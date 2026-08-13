import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { StylingPrefab } from "../../helpers/stylingPrefab";
import { TransformPrefab } from "../../helpers/transformPrefab";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

const def = signature({
    in: {
        path: "path",
        ...TransformPrefab.SIG_IN,
        ...StylingPrefab.SIG_IN,
        ...StylingPrefab.SIG_FILL,
        ...StylingPrefab.SIG_JOIN,
    },
    out: { output: "shape" },
});

export type FromPathDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
    } & StylingPrefab.Definition["payload"] &
        TransformPrefab.Definition["payload"]
>;

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<FromPathDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"fromPath", FromPathDefinition> => {
    return {
        id,
        in: {
            path: null,
            strokeWidth: null,
            strokeColor: null,
            strokeDash: null,
            strokeDashOffset: null,
            strokeCap: null,
            strokeJoin: null,
            fillColor: null,
            paintOrder: null,
            opacity: null,
            // transforms
            positionMode: null,
            positionX: null,
            positionY: null,
            positionRadius: null,
            positionTheta: null,
            rotation: null,
        },
        out: {
            output: [],
        },
        payload: {
            label: "",
            // stroke
            strokeWidth: "1px",
            strokeDash: "",
            strokeColor: { r: 0, g: 0, b: 0, a: 1 },
            strokeDashOffset: "0px",
            strokeCap: Enum.Common.strokeCap.BUTT.value,
            // fill
            fillColor: { r: 0, g: 0, b: 0, a: 0 },
            strokeJoin: 0,
            paintOrder: 0,
            opacity: "100",
            // transforms
            positionMode: Enum.Common.positionMode.CARTESIAN.value,
            positionX: "0px",
            positionY: "0px",
            positionRadius: "0px",
            positionTheta: "0deg",
            rotation: "0deg",
        },
        type: "fromPath",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<FromPathDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<FromPathDefinition>>) => {
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
            <StylingPrefab.Controls node={node} handleUpdate={handleUpdate} fill join accordion />
            <TransformPrefab.Controls node={node} handleUpdate={handleUpdate} accordion />
        </TypicalNode>
    );
};

const GEOMETRY_INPUTS: (keyof FromPathDefinition["inputs"])[] = ["path", "positionMode", "positionX", "positionY", "positionRadius", "positionTheta", "rotation"];
const STYLING_INPUTS: (keyof FromPathDefinition["inputs"])[] = ["strokeWidth", "strokeColor", "strokeCap", "strokeDash", "strokeDashOffset", "fillColor", "paintOrder"];

const dependsOn = (_node: NodeDefinitions.NodeFor<FromPathDefinition>, outSocket: keyof FromPathDefinition["outputs"], _deps: AllDeps): (keyof FromPathDefinition["inputs"])[] => {
    if (outSocket === "output") {
        return [...GEOMETRY_INPUTS, ...STYLING_INPUTS];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<FromPathDefinition>, _inSocket: keyof FromPathDefinition["inputs"], _deps: AllDeps): (keyof FromPathDefinition["outputs"])[] => {
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<FromPathDefinition>, socket: keyof FromPathDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output") return null;

    const pathVal = context.resolve<DataTypes.Path>(node.id, "path");
    if (!pathVal) return null;

    const { d, transform: inputTransform, preview } = pathVal.data;
    const [transforms, { translateX, translateY }] = TransformPrefab.evaluate(node, context);

    // Combine input path's transform with this node's transforms
    const allTransforms = [inputTransform, ...transforms].filter(Boolean).join(" ");

    return {
        kind: "shape",
        data: {
            type: "path",
            d,
            paint: StylingPrefab.evaluate(node, context),
            transform: allTransforms,
            preview: { x: preview.x + translateX, y: preview.y + translateY, w: preview.w, h: preview.h },
        },
    };
};

export const FromPathNodeType: NodeTypes.Type<"fromPath", FromPathDefinition> = {
    type: "fromPath",
    displayName: "From Path",
    defaultLabel: "From Path",
    iconNode: <NodeIcon shape={NODE_ICONS.path} />,
    flavour: "confirm",
    category: "Shapes",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
