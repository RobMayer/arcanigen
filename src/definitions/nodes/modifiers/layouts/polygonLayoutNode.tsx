import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject } from "../../../helpers/nodeHelper";
import { NodeIcon, NODE_ICONS } from "../../../../components/Icon";
import { Resolver } from "../../../../util/resolver";
import { Length } from "../../../datatypes/length";
import { Angle } from "../../../datatypes/angle";
import { Enum } from "../../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../../features/nodeview/node";
import { NodeAccordion, SocketIn, SocketOut, ValuePreview } from "../../../../features/nodeview/slots";
import { LengthInput } from "../../../../components/inputs/LengthInput";
import { RadioButton } from "../../../../components/buttons/RadioButton";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../../nodeTypes";
import { DataTypes } from "../../../dataTypes";
import { SocketTypes } from "../../../socketTypes";
import { Project } from "../../../../state/project";
import { useGraphId } from "../../../../state/graphId";
import { IntegerInput } from "../../../../components/inputs/IntegerInput";
import { NumericString } from "../../../datatypes/numericString";
import { deg2rad, delerp, distroInterpolator, getDerivedRadius, getTrueRadius, lerp } from "../../../../util/misc";
import { TransformPrefab } from "../../../helpers/transformPrefab";
import { CheckBox } from "../../../../components/buttons/CheckBox";
import { AngleInput } from "../../../../components/inputs/AngleInput";
import { GroupShape } from "../../../shapeTypes";
import { signature, SignatureBuilder } from "../../../helpers/signatureBuilder";
import { SignatureEngine } from "../../../helpers/signatureEngine";

const def = signature({
    in: {
        input: "shape",
        count: "integer",
        radius: "length",
        scribeMode: "enum",
        memberAlign: "boolean",
        memberRotation: "angle",
        pointDistro: "distribution",
        ...TransformPrefab.SIG_IN,
    },
    out: { output: "shape", sequence: "sequence", eCircumradius: "length", eApothem: "length" },
});

export type PolygonLayoutDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        count: DataTypes.TypeOf<DataTypes.Integer>;
        radius: DataTypes.TypeOf<DataTypes.Length>;
        scribeMode: DataTypes.TypeOf<DataTypes.Enum>;
        memberAlign: boolean;
        memberRotation: DataTypes.TypeOf<DataTypes.Angle>;
    } & TransformPrefab.Definition["payload"]
>;

const SCRIBE_MODE_OPTIONS = Enum.options(Enum.Common.scribeMode);

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<PolygonLayoutDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"polygonLayout", PolygonLayoutDefinition> => {
    return {
        id,
        in: {
            input: null,
            count: null,
            radius: null,
            scribeMode: null,
            memberAlign: null,
            memberRotation: null,
            pointDistro: null,
            // transforms
            position: null,
            rotation: null,
        },
        out: {
            output: [],
            sequence: [],
            eCircumradius: [],
            eApothem: [],
        },
        payload: {
            label: "",
            count: input.count ?? "5",
            radius: input.radius ?? "100px",
            scribeMode: input.scribeMode ?? Enum.Common.scribeMode.INSCRIBE.value,
            memberAlign: input.memberAlign ?? false,
            memberRotation: input.memberRotation ?? "0deg",
            // transforms
            position: { ...TransformPrefab.POSITION_DEFAULT },
            rotation: "0deg",
        },
        type: "polygonLayout",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<PolygonLayoutDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<PolygonLayoutDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const graphId = useGraphId();
    const previewCircumradius = Project.useCachedOutput(graphId, node, "eCircumradius");
    const previewApothem = Project.useCachedOutput(graphId, node, "eApothem");
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketOut node={node} socketId={"sequence"}>
                Sequence
            </SocketOut>
            <SocketIn node={node} socketId={"input"}>
                Input
            </SocketIn>
            <SocketIn node={node} socketId={"count"} label={"Count"}>
                <IntegerInput.SliderInput value={node.payload.count} onCommit={(count) => handleUpdate({ count })} disabled={node.in.count !== null} min={"3"} max={"64"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"radius"} label={"Radius"}>
                <LengthInput value={node.payload.radius} onCommit={(radius) => handleUpdate({ radius })} disabled={node.in.radius !== null} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"scribeMode"} label={"Scribe Mode"}>
                <RadioButton.Group
                    orientation={"horizontal"}
                    value={`${node.payload.scribeMode}`}
                    onValue={(v) => handleUpdate({ scribeMode: Number(v) })}
                    disabled={node.in.scribeMode !== null}
                    options={SCRIBE_MODE_OPTIONS}
                />
            </SocketIn>
            <NodeAccordion label={"More"} nodeId={node.id} socketsIn={"pointDistro|memberAlign|memberRotation"}>
                <SocketIn node={node} socketId={"pointDistro"}>
                    Angular Distribution
                </SocketIn>
                <SocketIn node={node} socketId={"memberAlign"}>
                    <CheckBox checked={node.payload.memberAlign} onToggle={(memberAlign) => handleUpdate({ memberAlign })} disabled={node.in.memberAlign !== null}>
                        Align to Path
                    </CheckBox>
                </SocketIn>
                <SocketIn node={node} socketId={"memberRotation"} label={"Member Rotation"}>
                    <AngleInput.SliderInput value={node.payload.memberRotation} onCommit={(memberRotation) => handleUpdate({ memberRotation })} disabled={node.in.memberRotation !== null} />
                </SocketIn>
            </NodeAccordion>
            <TransformPrefab.Controls node={node} handleUpdate={handleUpdate} accordion />
            <NodeAccordion nodeId={node.id} label={"Additional Options"} socketsOut={"eCircumradius|eApothem"}>
                <SocketOut node={node} socketId={"eCircumradius"} label={"Circumradius"}>
                    <ValuePreview value={previewCircumradius} />
                </SocketOut>
                <SocketOut node={node} socketId={"eApothem"} label={"Apothem"}>
                    <ValuePreview value={previewApothem} />
                </SocketOut>
            </NodeAccordion>
        </TypicalNode>
    );
};

const GEOMETRY_INPUTS: (keyof PolygonLayoutDefinition["inputs"])[] = [
    "input",
    "count",
    "radius",
    "scribeMode",
    "pointDistro",
    "memberAlign",
    "memberRotation",
    "position",
    "rotation",
];

const dependsOn = (_node: NodeDefinitions.NodeFor<PolygonLayoutDefinition>, outSocket: keyof PolygonLayoutDefinition["outputs"], _deps: AllDeps): (keyof PolygonLayoutDefinition["inputs"])[] => {
    if (outSocket === "output") {
        return GEOMETRY_INPUTS;
    }
    if (outSocket === "sequence") {
        return ["count"];
    }
    if (outSocket === "eCircumradius" || outSocket === "eApothem") {
        return ["count", "radius", "scribeMode"];
    }
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<PolygonLayoutDefinition>, inSocket: keyof PolygonLayoutDefinition["inputs"], _deps: AllDeps): (keyof PolygonLayoutDefinition["outputs"])[] => {
    if (inSocket === "count") {
        return ["output", "sequence", "eCircumradius", "eApothem"];
    }
    if (inSocket === "radius" || inSocket === "scribeMode") {
        return ["output", "eCircumradius", "eApothem"];
    }
    if (inSocket === "pointDistro") {
        return ["output"];
    }
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<PolygonLayoutDefinition>, socket: keyof PolygonLayoutDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const countStr = context.resolve<DataTypes.Integer>(node.id, "count")?.data ?? node.payload.count;
    const count = Math.round(Math.max(3, Math.min(64, NumericString.Emptyable.asNumber(countStr) ?? NaN)));
    if (!isFinite(count)) return null;

    if (socket === "sequence") {
        return { kind: "sequence", data: { senderId: node.id, outputSocket: "sequence", count } };
    }

    const radiusStr = context.resolve<DataTypes.Length>(node.id, "radius")?.data ?? node.payload.radius;
    const radius = Length.Emptyable.asNumber(Length.Emptyable.max(radiusStr, "0px"));
    if (radius === null) return null;

    const scribeMode = Enum.keyOf(Enum.Common.scribeMode, context.resolve<DataTypes.Enum>(node.id, "scribeMode")?.data ?? node.payload.scribeMode ?? Enum.Common.scribeMode.INSCRIBE.value);
    const trueRadius = getTrueRadius(radius, scribeMode, count);

    if (socket === "eCircumradius") {
        const [, unit] = Length.Emptyable.parse(Length.Emptyable.max(radiusStr, "0px")) ?? [null, null];
        if (unit === null) return null;
        return { kind: "length", data: `${getDerivedRadius(trueRadius, "CIRCUMSCRIBE", count)}${unit}` };
    }
    if (socket === "eApothem") {
        const [, unit] = Length.Emptyable.parse(Length.Emptyable.max(radiusStr, "0px")) ?? [null, null];
        if (unit === null) return null;
        return { kind: "length", data: `${getDerivedRadius(trueRadius, "INSCRIBE", count)}${unit}` };
    }

    if (socket === "output") {
        const distro = context.resolve<DataTypes.Distribution>(node.id, "pointDistro")?.data ?? { func: Enum.Common.distroFunctions.LINEAR.value, easing: Enum.Common.distroEasing.IN.value, intensity: "1" };
        const distroLerper = distroInterpolator(
            Enum.keyOf(Enum.Common.distroFunctions, distro.func),
            Enum.keyOf(Enum.Common.distroEasing, distro.easing),
            NumericString.Emptyable.asNumber(distro.intensity) ?? 1,
        );

        const memberAlign = context.resolve<DataTypes.Boolean>(node.id, "memberAlign")?.data ?? node.payload.memberAlign;
        const memberRotation = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "memberRotation")?.data ?? node.payload.memberRotation) ?? 0;

        const [groupTransforms] = TransformPrefab.evaluate(node, context);

        const children = [];
        for (let i = 0; i < count; i++) {
            const shape = context.resolve<DataTypes.Shape>(node.id, "input", { ...context.cursorData, [Resolver.cursorKey({ senderId: node.id, outputSocket: "sequence" })]: i })?.data ?? null;
            if (shape === null) continue;

            // Vertex angle with distribution applied, starting at top (-90°)
            const coeff = lerp(delerp(i, 0, count), 0, 360, distroLerper);
            const angleDeg = coeff - 90;
            const angleRad = deg2rad(angleDeg);
            const vx = trueRadius * Math.cos(angleRad);
            const vy = trueRadius * Math.sin(angleRad);

            const childTransforms: string[] = [];
            childTransforms.push(`translate(${vx}, ${vy})`);

            // Per-child rotation: alignment + memberRotation
            const alignAngle = memberAlign ? angleDeg + 90 : 0;
            const totalChildRotation = alignAngle + memberRotation;
            if (totalChildRotation !== 0) {
                childTransforms.push(`rotate(${totalChildRotation})`);
            }

            children.push({
                ...shape,
                transform: [childTransforms.join(" "), shape.transform].filter(Boolean).join(" "),
            });
        }

        const group: GroupShape = {
            type: "group",
            children,
            transform: groupTransforms.join(" "),
        };

        return { kind: "shape", data: group };
    }

    return null;
};

export const PolygonLayoutNodeType: NodeTypes.Type<"polygonLayout", PolygonLayoutDefinition> = {
    type: "polygonLayout",
    displayName: "Polygon Layout",
    defaultLabel: "Polygon Layout",
    iconNode: <NodeIcon shape={NODE_ICONS.shapePolygon} modifierIcon={NODE_ICONS.modifiers.patternFor} />,
    flavour: "emphasis",
    category: "Modifiers",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    signature: def.instance,
    ...SignatureEngine.hooks,
    canInterject: passthroughCanInterject(SocketTypes.of(DataTypes.SHAPE), SocketTypes.of(DataTypes.SHAPE)),
    onInterject: passthroughInterject("input", "output"),
};
