import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { Length } from "../../datatypes/length";
import { Enum } from "../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { PointInput } from "../../../components/inputs/PointInput";
import { LengthInput } from "../../../components/inputs/LengthInput";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { StylingPrefab } from "../../helpers/stylingPrefab";
import { TransformPrefab } from "../../helpers/transformPrefab";
import { PointHelper } from "../../helpers/pointHelper";
import { BandHelper } from "../../helpers/bandHelper";
import { signature, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

// The "banded" counterpart to Line (circle -> ring, polygon -> polyring, line -> banded line): the
// centerline is given a start/end width and turned into a filled region. The two side edges ("legs")
// are the common external tangents to a circle at each endpoint (radius = half-width); Offset mode
// falls back to plain perpendicular offsets. Each end is closed by a bandCap built from that same
// circle (Butt = tangent-point chord, Round = the arc, Point = the nose, Square = legs extended to
// the nose tangent line). When one end circle swallows the other we just emit the larger circle.
const def = signature({
    in: {
        startPoint: "point",
        endPoint: "point",
        startWidth: "length",
        endWidth: "length",
        bandMode: "enum",
        startCap: "enum",
        endCap: "enum",
        ...TransformPrefab.SIG_IN,
        ...StylingPrefab.SIG_IN,
        ...StylingPrefab.SIG_FILL,
        ...StylingPrefab.SIG_JOIN,
    },
    out: { output: "shape", path: "path", centerline: "path" },
});

export type BandedLineDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        start: PointInput.Value;
        end: PointInput.Value;
        startWidth: DataTypes.TypeOf<DataTypes.Length>;
        endWidth: DataTypes.TypeOf<DataTypes.Length>;
        bandMode: DataTypes.TypeOf<DataTypes.Enum>;
        startCap: DataTypes.TypeOf<DataTypes.Enum>;
        endCap: DataTypes.TypeOf<DataTypes.Enum>;
    } & StylingPrefab.Definition["payload"] &
        TransformPrefab.Definition["payload"]
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<BandedLineDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"bandedLine", BandedLineDefinition> => {
    return {
        id,
        in: {
            startPoint: null,
            endPoint: null,
            startWidth: null,
            endWidth: null,
            bandMode: null,
            startCap: null,
            endCap: null,

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
            position: null,
            rotation: null,
        },
        out: {
            output: [],
            path: [],
            centerline: [],
        },
        payload: {
            label: "",
            start: { ...PointInput.DEFAULT },
            end: { mode: Enum.Common.positionMode.CARTESIAN.value, x: "100px", y: "0px", radius: "100px", theta: "90deg" },
            startWidth: "20px",
            endWidth: "20px",
            bandMode: Enum.Common.bandMode.TANGENT.value,
            startCap: Enum.Common.bandCap.BUTT.value,
            endCap: Enum.Common.bandCap.BUTT.value,
            // stroke
            strokeWidth: "1px",
            strokeDash: "",
            strokeColor: { r: 0, g: 0, b: 0, a: 1 },
            strokeDashOffset: "0px",
            strokeCap: Enum.Common.strokeCap.BUTT.value,
            strokeJoin: Enum.Common.strokeJoin.MITER.value,
            // fill
            fillColor: { r: 0, g: 0, b: 0, a: 1 },
            paintOrder: 0,
            opacity: "100",
            // transforms
            position: { ...TransformPrefab.POSITION_DEFAULT },
            rotation: "0deg",
        },
        type: "bandedLine",
    };
};

const BAND_MODE_OPTIONS = Enum.options(Enum.Common.bandMode);
const BAND_CAP_OPTIONS = Enum.options(Enum.Common.bandCap);

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<BandedLineDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<BandedLineDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const startConnected = node.in.startPoint !== null;
    const endConnected = node.in.endPoint !== null;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketOut node={node} socketId={"path"}>
                Path
            </SocketOut>
            <SocketOut node={node} socketId={"centerline"}>
                Centerline
            </SocketOut>

            <SocketIn node={node} socketId={"startPoint"} label={"Start Point"}>
                <PointInput value={node.payload.start} onChange={(v) => handleUpdate({ start: { ...node.payload.start, ...v } })} disabled={startConnected} />
            </SocketIn>

            <SocketIn node={node} socketId={"endPoint"} label={"End Point"}>
                <PointInput value={node.payload.end} onChange={(v) => handleUpdate({ end: { ...node.payload.end, ...v } })} disabled={endConnected} />
            </SocketIn>

            <hr />
            <SocketIn node={node} socketId={"startWidth"} label={"Start Width"}>
                <LengthInput value={node.payload.startWidth} onCommit={(startWidth) => handleUpdate({ startWidth })} disabled={node.in.startWidth !== null} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"endWidth"} label={"End Width"}>
                <LengthInput value={node.payload.endWidth} onCommit={(endWidth) => handleUpdate({ endWidth })} disabled={node.in.endWidth !== null} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"bandMode"} label={"Band Mode"}>
                <RadioButton.Group
                    options={BAND_MODE_OPTIONS}
                    value={`${node.payload.bandMode}`}
                    onValue={(v) => handleUpdate({ bandMode: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.bandMode !== null}
                />
            </SocketIn>

            <hr />
            <SocketIn node={node} socketId={"startCap"} label={"Start Cap"}>
                <RadioButton.Group
                    options={BAND_CAP_OPTIONS}
                    value={`${node.payload.startCap}`}
                    onValue={(v) => handleUpdate({ startCap: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.startCap !== null}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"endCap"} label={"End Cap"}>
                <RadioButton.Group
                    options={BAND_CAP_OPTIONS}
                    value={`${node.payload.endCap}`}
                    onValue={(v) => handleUpdate({ endCap: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.endCap !== null}
                />
            </SocketIn>

            <StylingPrefab.Controls node={node} handleUpdate={handleUpdate} fill join accordion />
            <TransformPrefab.Controls node={node} handleUpdate={handleUpdate} accordion />
        </TypicalNode>
    );
};

const CENTERLINE_INPUTS: (keyof BandedLineDefinition["inputs"])[] = ["startPoint", "endPoint", "position", "rotation"];
const BAND_INPUTS: (keyof BandedLineDefinition["inputs"])[] = ["startWidth", "endWidth", "bandMode", "startCap", "endCap"];
const GEOMETRY_INPUTS: (keyof BandedLineDefinition["inputs"])[] = [...CENTERLINE_INPUTS, ...BAND_INPUTS];
const STYLING_INPUTS: (keyof BandedLineDefinition["inputs"])[] = ["strokeWidth", "strokeColor", "strokeCap", "strokeJoin", "strokeDash", "strokeDashOffset", "fillColor", "paintOrder", "opacity"];

const dependsOn = (_node: NodeDefinitions.NodeFor<BandedLineDefinition>, outSocket: keyof BandedLineDefinition["outputs"], _deps: AllDeps): (keyof BandedLineDefinition["inputs"])[] => {
    if (outSocket === "centerline") {
        return CENTERLINE_INPUTS;
    }
    if (outSocket === "path") {
        return GEOMETRY_INPUTS;
    }
    return [...GEOMETRY_INPUTS, ...STYLING_INPUTS];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<BandedLineDefinition>, inSocket: keyof BandedLineDefinition["inputs"], _deps: AllDeps): (keyof BandedLineDefinition["outputs"])[] => {
    if (STYLING_INPUTS.includes(inSocket)) {
        return ["output"];
    }
    if (BAND_INPUTS.includes(inSocket)) {
        return ["output", "path"];
    }
    return ["output", "path", "centerline"];
};

const evaluate = (node: NodeDefinitions.NodeFor<BandedLineDefinition>, socket: keyof BandedLineDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const start = context.resolve<DataTypes.Point>(node.id, "startPoint")?.data ?? PointHelper.fromAuthoring(node.payload.start);
    const end = context.resolve<DataTypes.Point>(node.id, "endPoint")?.data ?? PointHelper.fromAuthoring(node.payload.end);

    const [transforms] = TransformPrefab.evaluate(node, context);

    if (socket === "centerline") {
        if (start.x === end.x && start.y === end.y) return null;
        return {
            kind: "path",
            data: { d: `M ${start.x},${start.y} L ${end.x},${end.y}`, transform: transforms.join(" ") },
        };
    }

    const startWidth = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "startWidth")?.data ?? node.payload.startWidth, "0px")) ?? 0;
    const endWidth = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<DataTypes.Length>(node.id, "endWidth")?.data ?? node.payload.endWidth, "0px")) ?? 0;
    const bandMode = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "bandMode")?.data, Enum.Common.bandMode) ?? node.payload.bandMode ?? 0;
    const startCap = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "startCap")?.data, Enum.Common.bandCap) ?? node.payload.startCap ?? 0;
    const endCap = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "endCap")?.data, Enum.Common.bandCap) ?? node.payload.endCap ?? 0;

    const d = BandHelper.buildPath(start, end, startWidth, endWidth, bandMode, startCap, endCap);
    if (d === null) return null;

    if (socket === "path") {
        return {
            kind: "path",
            data: { d, transform: transforms.join(" ") },
        };
    }

    if (socket === "output") {
        return {
            kind: "shape",
            data: {
                type: "path",
                d,
                paint: StylingPrefab.evaluate(node, context),
                transform: transforms.join(" "),
            },
        };
    }

    return null;
};

export const BandedLineNodeType: NodeTypes.Type<"bandedLine", BandedLineDefinition> = {
    type: "bandedLine",
    displayName: "Banded Line",
    defaultLabel: "Banded Line",
    iconNode: <NodeIcon shape={NODE_ICONS.shapeBandedLine} />,
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
