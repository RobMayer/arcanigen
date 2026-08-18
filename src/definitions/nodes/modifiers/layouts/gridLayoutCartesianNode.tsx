import { nanoid } from "nanoid";
import { passthroughCanInterject, passthroughInterject } from "../../../helpers/nodeHelper";
import { NodeIcon, NODE_ICONS } from "../../../../components/Icon";
import { Resolver } from "../../../../util/resolver";
import { Length } from "../../../datatypes/length";
import { Enum } from "../../../datatypes/enum";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../../features/nodeview/slots";
import { LengthInput } from "../../../../components/inputs/LengthInput";
import { RadioButton } from "../../../../components/buttons/RadioButton";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../../nodeTypes";
import { DataTypes } from "../../../dataTypes";
import { SocketTypes } from "../../../socketTypes";
import { Project } from "../../../../state/project";
import { IntegerInput } from "../../../../components/inputs/IntegerInput";
import { NumericString } from "../../../datatypes/numericString";
import { TransformPrefab } from "../../../helpers/transformPrefab";
import { GroupShape } from "../../../shapeTypes";
import { signature, SignatureBuilder } from "../../../helpers/signatureBuilder";
import { SignatureEngine } from "../../../helpers/signatureEngine";

const def = signature({
    in: {
        input: "shape",
        columnFit: "enum",
        columnCount: "integer",
        columnSpacing: "length",
        columnTotal: "length",
        columnJustify: "enum",
        columnAnchor: "enum",
        rowFit: "enum",
        rowCount: "integer",
        rowSpacing: "length",
        rowTotal: "length",
        rowJustify: "enum",
        rowAnchor: "enum",
        sequenceOrder: "enum",
        ...TransformPrefab.SIG_IN,
    },
    out: { output: "shape", cellSequence: "sequence", rowSequence: "sequence", columnSequence: "sequence" },
});

export type GridLayoutCartesianDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: DataTypes.TypeOf<DataTypes.String>;
        columnFit: DataTypes.TypeOf<DataTypes.Enum>;
        columnCount: DataTypes.TypeOf<DataTypes.Integer>;
        columnSpacing: DataTypes.TypeOf<DataTypes.Length>;
        columnTotal: DataTypes.TypeOf<DataTypes.Length>;
        columnJustify: DataTypes.TypeOf<DataTypes.Enum>;
        columnAnchor: DataTypes.TypeOf<DataTypes.Enum>;
        rowFit: DataTypes.TypeOf<DataTypes.Enum>;
        rowCount: DataTypes.TypeOf<DataTypes.Integer>;
        rowSpacing: DataTypes.TypeOf<DataTypes.Length>;
        rowTotal: DataTypes.TypeOf<DataTypes.Length>;
        rowJustify: DataTypes.TypeOf<DataTypes.Enum>;
        rowAnchor: DataTypes.TypeOf<DataTypes.Enum>;
        sequenceOrder: DataTypes.TypeOf<DataTypes.Enum>;
    } & TransformPrefab.Definition["payload"]
>;

const FIT_OPTIONS = Enum.options(Enum.Common.fitCalcMode);
const JUSTIFY_OPTIONS = Enum.options(Enum.Common.gridJustify);
const ANCHOR_OPTIONS = Enum.options(Enum.Common.linearAlign);
const ORDER_OPTIONS = Enum.options(Enum.Common.gridSequenceOrder);

const MAX_AXIS = 64;
const clampCount = (n: number): number => Math.max(1, Math.min(MAX_AXIS, Math.round(n)));

const solveAxis = (
    fitKey: keyof typeof Enum.Common.fitCalcMode,
    count: number,
    spacing: number,
    total: number,
    justifyKey: keyof typeof Enum.Common.gridJustify,
    alignKey: keyof typeof Enum.Common.linearAlign,
): { n: number; positions: number[] } => {
    const sp = Math.max(0, spacing);
    const tot = Math.max(0, total);

    let n: number;
    let step: number;
    let shift = 0; // Justify offset within the total extent

    switch (fitKey) {
        case "SPACING":
            n = clampCount(count);
            step = n > 1 ? tot / (n - 1) : 0;
            break;

        case "COUNT": {
            n = clampCount(sp > 0 ? Math.floor(tot / sp) + 1 : 1);

            if (justifyKey === "FILL") {
                step = n > 1 ? tot / (n - 1) : 0;
            } else {
                step = sp;

                const slack = tot - (n - 1) * step;
                shift = justifyKey === "START" ? -slack / 2 : justifyKey === "END" ? slack / 2 : 0;
            }

            break;
        }

        case "TOTAL":
        default:
            n = clampCount(count);
            step = sp;
            break;
    }

    // The extent used for anchoring.
    // TOTAL has an emergent extent; all other modes use the
    // explicitly supplied total.
    const extent = fitKey === "TOTAL" ? (n - 1) * step : tot;

    const anchorShift = alignKey === "START" ? extent / 2 : alignKey === "END" ? -extent / 2 : 0;

    const positions: number[] = [];

    for (let i = 0; i < n; i++) {
        positions.push((i - (n - 1) / 2) * step + shift + anchorShift);
    }

    return { n, positions };
};

const create = (
    input: Partial<NodeDefinitions.PayloadTypeOf<GridLayoutCartesianDefinition>>,
    id: string = nanoid(),
): NodeDefinitions.BuiltNodeOf<"gridLayoutCartesian", GridLayoutCartesianDefinition> => {
    return {
        id,
        in: {
            input: null,
            columnFit: null,
            columnCount: null,
            columnSpacing: null,
            columnTotal: null,
            columnJustify: null,
            columnAnchor: null,
            rowFit: null,
            rowCount: null,
            rowSpacing: null,
            rowTotal: null,
            rowJustify: null,
            rowAnchor: null,
            sequenceOrder: null,
            // transforms
            position: null,
            rotation: null,
        },
        out: {
            output: [],
            cellSequence: [],
            rowSequence: [],
            columnSequence: [],
        },
        payload: {
            label: "",
            columnFit: input.columnFit ?? Enum.Common.fitCalcMode.TOTAL.value,
            columnCount: input.columnCount ?? "5",
            columnSpacing: input.columnSpacing ?? "100px",
            columnTotal: input.columnTotal ?? "500px",
            columnJustify: input.columnJustify ?? Enum.Common.gridJustify.CENTER.value,
            columnAnchor: input.columnAnchor ?? Enum.Common.linearAlign.CENTER.value,
            rowFit: input.rowFit ?? Enum.Common.fitCalcMode.TOTAL.value,
            rowCount: input.rowCount ?? "5",
            rowSpacing: input.rowSpacing ?? "100px",
            rowTotal: input.rowTotal ?? "500px",
            rowJustify: input.rowJustify ?? Enum.Common.gridJustify.CENTER.value,
            rowAnchor: input.rowAnchor ?? Enum.Common.linearAlign.CENTER.value,
            sequenceOrder: input.sequenceOrder ?? Enum.Common.gridSequenceOrder.ROW_MAJOR.value,
            // transforms
            position: { ...TransformPrefab.POSITION_DEFAULT },
            rotation: "0deg",
        },
        type: "gridLayoutCartesian",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<GridLayoutCartesianDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<GridLayoutCartesianDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    // Only known when the fit socket is unwired; when wired the mode is dynamic so we leave value inputs live.
    const colFit = node.in.columnFit === null ? Enum.keyOf(Enum.Common.fitCalcMode, node.payload.columnFit) : null;
    const rowFit = node.in.rowFit === null ? Enum.keyOf(Enum.Common.fitCalcMode, node.payload.rowFit) : null;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"input"}>
                Shape
            </SocketIn>
            <hr />
            <SocketOut node={node} socketId={"cellSequence"}>
                Cell Sequence
            </SocketOut>
            <SocketOut node={node} socketId={"rowSequence"}>
                Row Sequence
            </SocketOut>
            <SocketOut node={node} socketId={"columnSequence"}>
                Column Sequence
            </SocketOut>
            <hr />
            <SocketIn node={node} socketId={"columnFit"} label={"Column Auto Mode"}>
                <RadioButton.Group
                    options={FIT_OPTIONS}
                    value={`${node.payload.columnFit}`}
                    onValue={(v) => handleUpdate({ columnFit: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.columnFit !== null}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"columnCount"} label={"Column Count"}>
                <IntegerInput.SliderInput
                    value={node.payload.columnCount}
                    onCommit={(columnCount) => handleUpdate({ columnCount })}
                    disabled={node.in.columnCount !== null || colFit === "COUNT"}
                    min={"1"}
                    max={"64"}
                    required
                />
            </SocketIn>
            <SocketIn node={node} socketId={"columnSpacing"} label={"Column Spacing"}>
                <LengthInput
                    value={node.payload.columnSpacing}
                    onCommit={(columnSpacing) => handleUpdate({ columnSpacing })}
                    disabled={node.in.columnSpacing !== null || colFit === "SPACING"}
                    min={"0px"}
                    required
                />
            </SocketIn>
            <SocketIn node={node} socketId={"columnTotal"} label={"Column Total"}>
                <LengthInput
                    value={node.payload.columnTotal}
                    onCommit={(columnTotal) => handleUpdate({ columnTotal })}
                    disabled={node.in.columnTotal !== null || colFit === "TOTAL"}
                    min={"0px"}
                    required
                />
            </SocketIn>
            <SocketIn node={node} socketId={"columnJustify"} label={"Column Justify"}>
                <RadioButton.Group
                    options={JUSTIFY_OPTIONS}
                    value={`${node.payload.columnJustify}`}
                    onValue={(v) => handleUpdate({ columnJustify: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.columnJustify !== null || (colFit !== null && colFit !== "COUNT")}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"columnAnchor"} label={"Column Anchor"}>
                <RadioButton.Group
                    options={ANCHOR_OPTIONS}
                    value={`${node.payload.columnAnchor}`}
                    onValue={(v) => handleUpdate({ columnAnchor: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.columnAnchor !== null}
                />
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"rowFit"} label={"Row Auto Mode"}>
                <RadioButton.Group
                    options={FIT_OPTIONS}
                    value={`${node.payload.rowFit}`}
                    onValue={(v) => handleUpdate({ rowFit: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.rowFit !== null}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"rowCount"} label={"Row Count"}>
                <IntegerInput.SliderInput
                    value={node.payload.rowCount}
                    onCommit={(rowCount) => handleUpdate({ rowCount })}
                    disabled={node.in.rowCount !== null || rowFit === "COUNT"}
                    min={"1"}
                    max={"64"}
                    required
                />
            </SocketIn>
            <SocketIn node={node} socketId={"rowSpacing"} label={"Row Spacing"}>
                <LengthInput
                    value={node.payload.rowSpacing}
                    onCommit={(rowSpacing) => handleUpdate({ rowSpacing })}
                    disabled={node.in.rowSpacing !== null || rowFit === "SPACING"}
                    min={"0px"}
                    required
                />
            </SocketIn>
            <SocketIn node={node} socketId={"rowTotal"} label={"Row Total"}>
                <LengthInput value={node.payload.rowTotal} onCommit={(rowTotal) => handleUpdate({ rowTotal })} disabled={node.in.rowTotal !== null || rowFit === "TOTAL"} min={"0px"} required />
            </SocketIn>
            <SocketIn node={node} socketId={"rowJustify"} label={"Row Justify"}>
                <RadioButton.Group
                    options={JUSTIFY_OPTIONS}
                    value={`${node.payload.rowJustify}`}
                    onValue={(v) => handleUpdate({ rowJustify: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.rowJustify !== null || (rowFit !== null && rowFit !== "COUNT")}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"rowAnchor"} label={"Row Anchor"}>
                <RadioButton.Group
                    options={ANCHOR_OPTIONS}
                    value={`${node.payload.rowAnchor}`}
                    onValue={(v) => handleUpdate({ rowAnchor: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.rowAnchor !== null}
                />
            </SocketIn>
            <hr />
            <SocketIn node={node} socketId={"sequenceOrder"} label={"Sequence Order"}>
                <RadioButton.Group
                    options={ORDER_OPTIONS}
                    value={`${node.payload.sequenceOrder}`}
                    onValue={(v) => handleUpdate({ sequenceOrder: Number(v) })}
                    orientation={"horizontal"}
                    disabled={node.in.sequenceOrder !== null}
                />
            </SocketIn>
            <TransformPrefab.Controls node={node} handleUpdate={handleUpdate} accordion />
        </TypicalNode>
    );
};

const COLUMN_COUNT_INPUTS: (keyof GridLayoutCartesianDefinition["inputs"])[] = ["columnFit", "columnCount", "columnSpacing", "columnTotal"];
const ROW_COUNT_INPUTS: (keyof GridLayoutCartesianDefinition["inputs"])[] = ["rowFit", "rowCount", "rowSpacing", "rowTotal"];
const GEOMETRY_INPUTS: (keyof GridLayoutCartesianDefinition["inputs"])[] = [
    "input",
    "columnFit",
    "columnCount",
    "columnSpacing",
    "columnTotal",
    "columnJustify",
    "columnAnchor",
    "rowFit",
    "rowCount",
    "rowSpacing",
    "rowTotal",
    "rowJustify",
    "rowAnchor",
    "sequenceOrder",
    "position",
    "rotation",
];

const dependsOn = (
    _node: NodeDefinitions.NodeFor<GridLayoutCartesianDefinition>,
    outSocket: keyof GridLayoutCartesianDefinition["outputs"],
    _deps: AllDeps,
): (keyof GridLayoutCartesianDefinition["inputs"])[] => {
    switch (outSocket) {
        case "output":
            return GEOMETRY_INPUTS;
        case "cellSequence":
            return [...COLUMN_COUNT_INPUTS, ...ROW_COUNT_INPUTS];
        case "columnSequence":
            return COLUMN_COUNT_INPUTS;
        case "rowSequence":
            return ROW_COUNT_INPUTS;
        default:
            return [];
    }
};

const contributesTo = (
    _node: NodeDefinitions.NodeFor<GridLayoutCartesianDefinition>,
    inSocket: keyof GridLayoutCartesianDefinition["inputs"],
    _deps: AllDeps,
): (keyof GridLayoutCartesianDefinition["outputs"])[] => {
    if (COLUMN_COUNT_INPUTS.includes(inSocket)) {
        return ["output", "columnSequence", "cellSequence"];
    }
    if (ROW_COUNT_INPUTS.includes(inSocket)) {
        return ["output", "rowSequence", "cellSequence"];
    }
    // input, justify (both axes), sequenceOrder, and transforms affect the rendered output only
    return ["output"];
};

const evaluate = (node: NodeDefinitions.NodeFor<GridLayoutCartesianDefinition>, socket: keyof GridLayoutCartesianDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    const colFit = Enum.keyOf(Enum.Common.fitCalcMode, context.resolve<DataTypes.Enum>(node.id, "columnFit")?.data ?? node.payload.columnFit);
    const colCount = NumericString.Emptyable.asNumber(context.resolve<DataTypes.Integer>(node.id, "columnCount")?.data ?? node.payload.columnCount) ?? 1;
    const colSpacing = Length.Emptyable.asNumber(context.resolve<DataTypes.Length>(node.id, "columnSpacing")?.data ?? node.payload.columnSpacing) ?? 0;
    const colTotal = Length.Emptyable.asNumber(context.resolve<DataTypes.Length>(node.id, "columnTotal")?.data ?? node.payload.columnTotal) ?? 0;
    const colJustify = Enum.keyOf(Enum.Common.gridJustify, context.resolve<DataTypes.Enum>(node.id, "columnJustify")?.data ?? node.payload.columnJustify);
    const colAnchor = Enum.keyOf(Enum.Common.linearAlign, context.resolve<DataTypes.Enum>(node.id, "columnAnchor")?.data ?? node.payload.columnAnchor);
    const colAxis = solveAxis(colFit, colCount, colSpacing, colTotal, colJustify, colAnchor);

    const rowFit = Enum.keyOf(Enum.Common.fitCalcMode, context.resolve<DataTypes.Enum>(node.id, "rowFit")?.data ?? node.payload.rowFit);
    const rowCount = NumericString.Emptyable.asNumber(context.resolve<DataTypes.Integer>(node.id, "rowCount")?.data ?? node.payload.rowCount) ?? 1;
    const rowSpacing = Length.Emptyable.asNumber(context.resolve<DataTypes.Length>(node.id, "rowSpacing")?.data ?? node.payload.rowSpacing) ?? 0;
    const rowTotal = Length.Emptyable.asNumber(context.resolve<DataTypes.Length>(node.id, "rowTotal")?.data ?? node.payload.rowTotal) ?? 0;
    const rowJustify = Enum.keyOf(Enum.Common.gridJustify, context.resolve<DataTypes.Enum>(node.id, "rowJustify")?.data ?? node.payload.rowJustify);
    const rowAnchor = Enum.keyOf(Enum.Common.linearAlign, context.resolve<DataTypes.Enum>(node.id, "rowAnchor")?.data ?? node.payload.rowAnchor);
    const rowAxis = solveAxis(rowFit, rowCount, rowSpacing, rowTotal, rowJustify, rowAnchor);

    const nCols = colAxis.n;
    const nRows = rowAxis.n;

    if (socket === "columnSequence") {
        return { kind: "sequence", data: { senderId: node.id, outputSocket: "columnSequence", count: nCols } };
    }
    if (socket === "rowSequence") {
        return { kind: "sequence", data: { senderId: node.id, outputSocket: "rowSequence", count: nRows } };
    }
    if (socket === "cellSequence") {
        return { kind: "sequence", data: { senderId: node.id, outputSocket: "cellSequence", count: nCols * nRows } };
    }
    if (socket !== "output") return null;

    const columnMajor = Enum.keyOf(Enum.Common.gridSequenceOrder, context.resolve<DataTypes.Enum>(node.id, "sequenceOrder")?.data ?? node.payload.sequenceOrder) === "COLUMN_MAJOR";

    const [groupTransforms] = TransformPrefab.evaluate(node, context);

    const children = [];
    for (let row = 0; row < nRows; row++) {
        for (let col = 0; col < nCols; col++) {
            const cellIdx = columnMajor ? col * nRows + row : row * nCols + col;
            const cursorData = {
                ...context.cursorData,
                [Resolver.cursorKey({ senderId: node.id, outputSocket: "cellSequence" })]: cellIdx,
                [Resolver.cursorKey({ senderId: node.id, outputSocket: "rowSequence" })]: row,
                [Resolver.cursorKey({ senderId: node.id, outputSocket: "columnSequence" })]: col,
            };
            const shape = context.resolve<DataTypes.Shape>(node.id, "input", cursorData)?.data ?? null;
            if (shape === null) continue;

            const tx = colAxis.positions[col];
            const ty = rowAxis.positions[row];
            children.push({
                ...shape,
                transform: [`translate(${tx}, ${ty})`, shape.transform].filter(Boolean).join(" "),
            });
        }
    }

    const group: GroupShape = {
        type: "group",
        children,
        transform: groupTransforms.join(" "),
    };

    return { kind: "shape", data: group };
};

export const GridLayoutCartesianNodeType: NodeTypes.Type<"gridLayoutCartesian", GridLayoutCartesianDefinition> = {
    type: "gridLayoutCartesian",
    displayName: "Cartesian Layout",
    defaultLabel: "Cartesian Layout",
    iconNode: <NodeIcon shape={NODE_ICONS.gridCartesian} modifierIcon={NODE_ICONS.modifiers.patternFor} />,
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
