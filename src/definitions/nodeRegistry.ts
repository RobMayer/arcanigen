import type { NodeTypes } from "./nodeTypes";

import { ResultDefinition, ResultNodeType } from "./nodes/resultNode";
import { AngleDefinition, AnglePrimitiveType } from "./nodes/values/angleNode";
import { PointDefinition, PointPrimitiveType } from "./nodes/values/pointNode";
import { BooleanDefinition, BooleanPrimitiveType } from "./nodes/values/booleanNode";
import { ColorDefinition, ColorPrimitiveType } from "./nodes/values/colorNode";
import { ColorSplitDefinition, ColorSplitNodeType } from "./nodes/math/colorSplitNode";
import { ColorJoinDefinition, ColorJoinNodeType } from "./nodes/math/colorJoinNode";
import { EnumDefinition as EnumPrimDefinition, EnumPrimitiveType } from "./nodes/values/enumNode";
import { FloatDefinition, FloatPrimitiveType } from "./nodes/values/floatNode";
import { StringDefinition, StringPrimitiveType } from "./nodes/values/stringNode";
import { ParagraphDefinition, ParagraphPrimitiveType } from "./nodes/values/paragraphNode";
import { SubstringDefinition, SubstringNodeType } from "./nodes/math/substringNode";
import { ConcatDefinition, ConcatNodeType } from "./nodes/math/concatNode";
import { IntegerDefinition, IntegerPrimitiveType } from "./nodes/values/integerNode";
import { LengthDefinition, LengthPrimitiveType } from "./nodes/values/lengthNode";
import { TokensLengthDefinition, TokensLengthPrimitiveType } from "./nodes/values/tokensLengthNode";
import { CircleDefinition, CircleNodeType } from "./nodes/shapes/circleNode";
import { ShapePreviewDefinition, ShapePreviewType } from "./nodes/meta/shapePreviewNode";
import { DebugDefinition, DebugNodeType } from "./nodes/meta/debugNode";
import { FloatInputDefinition, FloatInputType } from "./nodes/interface/inputs/floatInputNode";
import { FloatOutputDefinition, FloatOutputType } from "./nodes/interface/outputs/floatOutputNode";
import { CustomDefinition, CustomNodeType } from "./nodes/interface/customNode";
import { AddDefinition, AddType } from "./nodes/math/addNode";
import { SubtractDefinition, SubtractType } from "./nodes/math/subtractNode";
import { MultiplyDefinition, MultiplyType } from "./nodes/math/multiplyNode";
import { DivideDefinition, DivideType } from "./nodes/math/divideNode";
import { ModuloDefinition, ModuloType } from "./nodes/math/moduloNode";
import { RemainderDefinition, RemainderType } from "./nodes/math/remainderNode";
import { NegateDefinition, NegateType } from "./nodes/math/negateNode";
import { ReciprocalDefinition, ReciprocalType } from "./nodes/math/reciprocalNode";
import { AbsDefinition, AbsType } from "./nodes/math/absNode";
import { RoundDefinition, RoundType } from "./nodes/math/roundNode";
import { IntegerToEnumDefinition, IntegerToEnumNodeType } from "./nodes/math/integerToEnumNode";
import { SinDefinition, SinType } from "./nodes/math/sinNode";
import { CosDefinition, CosType } from "./nodes/math/cosNode";
import { TanDefinition, TanType } from "./nodes/math/tanNode";
import { ArcsinDefinition, ArcsinType } from "./nodes/math/arcsinNode";
import { ArccosDefinition, ArccosType } from "./nodes/math/arccosNode";
import { ArctanDefinition, ArctanType } from "./nodes/math/arctanNode";
import { MinDefinition, MinType } from "./nodes/math/minNode";
import { MaxDefinition, MaxType } from "./nodes/math/maxNode";
import { ClampDefinition, ClampType } from "./nodes/math/clampNode";
import { LerpDefinition, LerpType } from "./nodes/math/lerpNode";
import { PowDefinition, PowType } from "./nodes/math/powNode";
import { RootDefinition, RootType } from "./nodes/math/rootNode";
import { PolygonDefinition, PolygonNodeType } from "./nodes/shapes/polygonNode";
import { PolylineDefinition, PolylineNodeType } from "./nodes/shapes/polylineNode";
import { LayerComposeDefinition, LayerComposeNodeType } from "./nodes/modifiers/layerComposeNode";
import { PathOpComposeDefinition, PathOpComposeNodeType } from "./nodes/modifiers/pathOpComposeNode";
import { TokenizerLengthDefinition, TokenizerLengthNodeType } from "./nodes/math/tokenizerLengthNode";
import { LayerDefinition, LayerNodeType } from "./nodes/modifiers/layerNode";
import { DistributionNodeType, DistributionNodeDefinition } from "./nodes/values/distributionNode";
import { PointAddDefinition, PointAddType } from "./nodes/math/pointAddNode";
import { PointSubtractDefinition, PointSubtractType } from "./nodes/math/pointSubtractNode";
import { PointScaleDefinition, PointScaleType } from "./nodes/math/pointScaleNode";
import { PointDisplaceDefinition, PointDisplaceType } from "./nodes/math/pointDisplaceNode";
import { PointRotateDefinition, PointRotateType } from "./nodes/math/pointRotateNode";
import { PointHadamardDefinition, PointHadamardType } from "./nodes/math/pointHadamardNode";
import { PointComplexDefinition, PointComplexType } from "./nodes/math/pointComplexNode";
import { PointDotDefinition, PointDotType } from "./nodes/math/pointDotNode";
import { PointWedgeDefinition, PointWedgeType } from "./nodes/math/pointWedgeNode";
import { PointLerpDefinition, PointLerpType } from "./nodes/math/pointLerpNode";
import { PointDistanceDefinition, PointDistanceType } from "./nodes/math/pointDistanceNode";
import { PointSplitDefinition, PointSplitType } from "./nodes/math/pointSplitNode";
import { IntegerInputDefinition, IntegerInputType } from "./nodes/interface/inputs/integerInputNode";
import { IntegerOutputDefinition, IntegerOutputType } from "./nodes/interface/outputs/integerOutputNode";
import { AngleInputDefinition, AngleInputType } from "./nodes/interface/inputs/angleInputNode";
import { AngleOutputDefinition, AngleOutputType } from "./nodes/interface/outputs/angleOutputNode";
import { LengthInputDefinition, LengthInputType } from "./nodes/interface/inputs/lengthInputNode";
import { LengthOutputDefinition, LengthOutputType } from "./nodes/interface/outputs/lengthOutputNode";
import { ShapeInputDefinition, ShapeInputType } from "./nodes/interface/inputs/shapeInputNode";
import { ShapeOutputDefinition, ShapeOutputType } from "./nodes/interface/outputs/shapeOutputNode";
import { ColorInputDefinition, ColorInputType } from "./nodes/interface/inputs/colorInputNode";
import { PaintInputDefinition, PaintInputType } from "./nodes/interface/inputs/paintInputNode";
import { ColorOutputDefinition, ColorOutputType } from "./nodes/interface/outputs/colorOutputNode";
import { PointInputDefinition, PointInputType } from "./nodes/interface/inputs/pointInputNode";
import { PointOutputDefinition, PointOutputType } from "./nodes/interface/outputs/pointOutputNode";
import { BooleanInputDefinition, BooleanInputType } from "./nodes/interface/inputs/booleanInputNode";
import { BooleanOutputDefinition, BooleanOutputType } from "./nodes/interface/outputs/booleanOutputNode";
import { EnumInputDefinition, EnumInputType } from "./nodes/interface/inputs/enumInputNode";
import { EnumOutputDefinition, EnumOutputType } from "./nodes/interface/outputs/enumOutputNode";
import { StringInputDefinition, StringInputType } from "./nodes/interface/inputs/stringInputNode";
import { StringOutputDefinition, StringOutputType } from "./nodes/interface/outputs/stringOutputNode";
import { TokensLengthInputDefinition, TokensLengthInputType } from "./nodes/interface/inputs/tokensLengthInputNode";
import { TokensLengthOutputDefinition, TokensLengthOutputType } from "./nodes/interface/outputs/tokensLengthOutputNode";
import { ArrayLayerInputDefinition, ArrayLayerInputType } from "./nodes/interface/inputs/arrayLayerInputNode";
import { ArrayLayerOutputDefinition, ArrayLayerOutputType } from "./nodes/interface/outputs/arrayLayerOutputNode";
import { ArrayPathOpInputDefinition, ArrayPathOpInputType } from "./nodes/interface/inputs/arrayPathOpInputNode";
import { ArrayPathOpOutputDefinition, ArrayPathOpOutputType } from "./nodes/interface/outputs/arrayPathOpOutputNode";
import { LayerInputDefinition, LayerInputType } from "./nodes/interface/inputs/layerInputNode";
import { LayerOutputDefinition, LayerOutputType } from "./nodes/interface/outputs/layerOutputNode";
import { PathOpInputDefinition, PathOpInputType } from "./nodes/interface/inputs/pathOpInputNode";
import { PathOpOutputDefinition, PathOpOutputType } from "./nodes/interface/outputs/pathOpOutputNode";
import { StopColorInputDefinition, StopColorInputType } from "./nodes/interface/inputs/stopColorInputNode";
import { StopColorOutputDefinition, StopColorOutputType } from "./nodes/interface/outputs/stopColorOutputNode";
import { ArrayStopColorInputDefinition, ArrayStopColorInputType } from "./nodes/interface/inputs/arrayStopColorInputNode";
import { ArrayStopColorOutputDefinition, ArrayStopColorOutputType } from "./nodes/interface/outputs/arrayStopColorOutputNode";
import { StopFloatInputDefinition, StopFloatInputType } from "./nodes/interface/inputs/stopFloatInputNode";
import { StopFloatOutputDefinition, StopFloatOutputType } from "./nodes/interface/outputs/stopFloatOutputNode";
import { ArrayStopFloatInputDefinition, ArrayStopFloatInputType } from "./nodes/interface/inputs/arrayStopFloatInputNode";
import { ArrayStopFloatOutputDefinition, ArrayStopFloatOutputType } from "./nodes/interface/outputs/arrayStopFloatOutputNode";
import { StopAngleInputDefinition, StopAngleInputType } from "./nodes/interface/inputs/stopAngleInputNode";
import { StopAngleOutputDefinition, StopAngleOutputType } from "./nodes/interface/outputs/stopAngleOutputNode";
import { ArrayStopAngleInputDefinition, ArrayStopAngleInputType } from "./nodes/interface/inputs/arrayStopAngleInputNode";
import { ArrayStopAngleOutputDefinition, ArrayStopAngleOutputType } from "./nodes/interface/outputs/arrayStopAngleOutputNode";
import { ArrayAngleInputDefinition, ArrayAngleInputType } from "./nodes/interface/inputs/arrayAngleInputNode";
import { ArrayAngleOutputDefinition, ArrayAngleOutputType } from "./nodes/interface/outputs/arrayAngleOutputNode";
import { ArrayIntegerInputDefinition, ArrayIntegerInputType } from "./nodes/interface/inputs/arrayIntegerInputNode";
import { ArrayIntegerOutputDefinition, ArrayIntegerOutputType } from "./nodes/interface/outputs/arrayIntegerOutputNode";
import { ArrayFloatInputDefinition, ArrayFloatInputType } from "./nodes/interface/inputs/arrayFloatInputNode";
import { ArrayFloatOutputDefinition, ArrayFloatOutputType } from "./nodes/interface/outputs/arrayFloatOutputNode";
import { ArrayLengthInputDefinition, ArrayLengthInputType } from "./nodes/interface/inputs/arrayLengthInputNode";
import { ArrayLengthOutputDefinition, ArrayLengthOutputType } from "./nodes/interface/outputs/arrayLengthOutputNode";
import { ArrayColorInputDefinition, ArrayColorInputType } from "./nodes/interface/inputs/arrayColorInputNode";
import { ArrayColorOutputDefinition, ArrayColorOutputType } from "./nodes/interface/outputs/arrayColorOutputNode";
import { ArrayBooleanInputDefinition, ArrayBooleanInputType } from "./nodes/interface/inputs/arrayBooleanInputNode";
import { ArrayBooleanOutputDefinition, ArrayBooleanOutputType } from "./nodes/interface/outputs/arrayBooleanOutputNode";
import { StopIntegerInputDefinition, StopIntegerInputType } from "./nodes/interface/inputs/stopIntegerInputNode";
import { StopIntegerOutputDefinition, StopIntegerOutputType } from "./nodes/interface/outputs/stopIntegerOutputNode";
import { ArrayStopIntegerInputDefinition, ArrayStopIntegerInputType } from "./nodes/interface/inputs/arrayStopIntegerInputNode";
import { ArrayStopIntegerOutputDefinition, ArrayStopIntegerOutputType } from "./nodes/interface/outputs/arrayStopIntegerOutputNode";
import { StopLengthInputDefinition, StopLengthInputType } from "./nodes/interface/inputs/stopLengthInputNode";
import { StopLengthOutputDefinition, StopLengthOutputType } from "./nodes/interface/outputs/stopLengthOutputNode";
import { ArrayStopLengthInputDefinition, ArrayStopLengthInputType } from "./nodes/interface/inputs/arrayStopLengthInputNode";
import { ArrayStopLengthOutputDefinition, ArrayStopLengthOutputType } from "./nodes/interface/outputs/arrayStopLengthOutputNode";
import { DistributionInputDefinition, DistributionInputType } from "./nodes/interface/inputs/distributionInputNode";
import { DistributionOutputDefinition, DistributionOutputType } from "./nodes/interface/outputs/distributionOutputNode";
import { SequenceInputDefinition, SequenceInputType } from "./nodes/interface/inputs/sequenceInputNode";
import { SequenceOutputDefinition, SequenceOutputType } from "./nodes/interface/outputs/sequenceOutputNode";
import { PathInputDefinition, PathInputType } from "./nodes/interface/inputs/pathInputNode";
import { PathOutputDefinition, PathOutputType } from "./nodes/interface/outputs/pathOutputNode";
import { SwitchCaseDefinition, SwitchCaseNodeType } from "./nodes/logic/switchCaseNode";
import { ConditionDefinition, ConditionNodeType } from "./nodes/logic/conditionNode";
import { LogicalNotDefinition, LogicalNotNodeType } from "./nodes/logic/logicalNotNode";
import { LogicalAndDefinition, LogicalAndNodeType } from "./nodes/logic/logicalAndNode";
import { LogicalOrDefinition, LogicalOrNodeType } from "./nodes/logic/logicalOrNode";
import { LogicalNandDefinition, LogicalNandNodeType } from "./nodes/logic/logicalNandNode";
import { LogicalNorDefinition, LogicalNorNodeType } from "./nodes/logic/logicalNorNode";
import { LogicalXorDefinition, LogicalXorNodeType } from "./nodes/logic/logicalXorNode";
import { LogicalXnorDefinition, LogicalXnorNodeType } from "./nodes/logic/logicalXnorNode";
import { EqualDefinition, EqualNodeType } from "./nodes/logic/equalNode";
import { GreaterThanDefinition, GreaterThanNodeType } from "./nodes/logic/greaterThanNode";
import { GreaterOrEqualDefinition, GreaterOrEqualNodeType } from "./nodes/logic/greaterOrEqualNode";
import { LessThanDefinition, LessThanNodeType } from "./nodes/logic/lessThanNode";
import { LessOrEqualDefinition, LessOrEqualNodeType } from "./nodes/logic/lessOrEqualNode";
import { WithinDefinition, WithinNodeType } from "./nodes/logic/withinNode";
import { BetweenDefinition, BetweenNodeType } from "./nodes/logic/betweenNode";
import { IsNullishDefinition, IsNullishNodeType } from "./nodes/logic/isNullishNode";
import { RingDefinition, RingNodeType } from "./nodes/shapes/ringNode";
import { RectangleDefinition, RectangleNodeType } from "./nodes/shapes/rectangleNode";
import { PolygramDefinition, PolygramNodeType } from "./nodes/shapes/polygramNode";
import { PolyringDefinition, PolyringNodeType } from "./nodes/shapes/polyringNode";
import { KnotDefinition, KnotNodeType } from "./nodes/shapes/knotNode";
import { StarDefinition, StarNodeType } from "./nodes/shapes/starNode";
import { BurstDefinition, BurstNodeType } from "./nodes/shapes/burstNode";
import { ArcDefinition, ArcNodeType } from "./nodes/shapes/arcNode";
import { SpiralDefinition, SpiralNodeType } from "./nodes/shapes/spiralNode";
import { SpirographDefinition, SpirographNodeType } from "./nodes/shapes/spirographNode";
import { SpiroringDefinition, SpiroringNodeType } from "./nodes/shapes/spiroringNode";
import { LineDefinition, LineNodeType } from "./nodes/shapes/lineNode";
import { BandedLineDefinition, BandedLineNodeType } from "./nodes/shapes/bandedLineNode";
import { BandedBurstDefinition, BandedBurstNodeType } from "./nodes/shapes/bandedBurstNode";
import { BandedArcDefinition, BandedArcNodeType } from "./nodes/shapes/bandedArcNode";
import { BandedStarDefinition, BandedStarNodeType } from "./nodes/shapes/bandedStarNode";
import { TextPathDefinition, TextPathNodeType } from "./nodes/shapes/textPathNode";
import { TextDefinition, TextNodeType } from "./nodes/shapes/textNode";
import { AlongPathDefinition, AlongPathNodeType } from "./nodes/modifiers/alongPathNode";
import { GlyphDefinition, GlyphNodeType } from "./nodes/shapes/glyphNode";
import { MaskDefinition, MaskNodeType } from "./nodes/modifiers/maskNode";
import { ClipDefinition, ClipNodeType } from "./nodes/modifiers/clipNode";
import { SequencerDefinition, SequencerNodeType } from "./nodes/collectionOps/sequencerNode";
import { PolygonLayoutDefinition, PolygonLayoutNodeType } from "./nodes/modifiers/layouts/polygonLayoutNode";
import { RadialLayoutDefinition, RadialLayoutNodeType } from "./nodes/modifiers/layouts/radialLayoutNode";
import { GridLayoutCartesianDefinition, GridLayoutCartesianNodeType } from "./nodes/modifiers/layouts/gridLayoutCartesianNode";
import { GridLayoutPolarDefinition, GridLayoutPolarNodeType } from "./nodes/modifiers/layouts/gridLayoutPolarNode";
import { RepeatedLayoutDefinition, RepeatedLayoutNodeType } from "./nodes/modifiers/layouts/repeatedLayoutNode";
import { SequenceIndexDefinition, SequenceIndexNodeType } from "./nodes/collectionOps/sequenceIndexNode";
import { PathLayoutDefinition, PathLayoutNodeType } from "./nodes/modifiers/layouts/pathLayoutNode";
import { ScatterLayoutDefinition, ScatterLayoutNodeType } from "./nodes/modifiers/layouts/scatterLayoutNode";
import { ForEachDefinition, ForEachNodeType } from "./nodes/collectionOps/foreachNode";
import { MapDefinition, MapNodeType } from "./nodes/collectionOps/mapNode";
import { FilterDefinition, FilterNodeType } from "./nodes/collectionOps/filterNode";
import { GatherDefinition, GatherNodeType } from "./nodes/collectionOps/gatherNode";
import { MergeArrayDefinition, MergeArrayNodeType } from "./nodes/collectionOps/mergeArrayNode";
import { AtIndexDefinition, AtIndexNodeType } from "./nodes/collectionOps/atIndexNode";
import { ReverseDefinition, ReverseNodeType } from "./nodes/collectionOps/reverseNode";
import { SliceDefinition, SliceNodeType } from "./nodes/collectionOps/sliceNode";
import { InjectDefinition, InjectNodeType } from "./nodes/collectionOps/injectNode";
import { PluckDefinition, PluckNodeType } from "./nodes/collectionOps/pluckNode";
import { SpliceDefinition, SpliceNodeType } from "./nodes/collectionOps/spliceNode";
import { ArrayCountDefinition, ArrayCountNodeType } from "./nodes/collectionOps/arrayCountNode";
import { ReplaceDefinition, ReplaceNodeType } from "./nodes/collectionOps/replaceNode";
import { RotateArrayDefinition, RotateArrayNodeType } from "./nodes/collectionOps/rotateArrayNode";
import { ShuffleArrayDefinition, ShuffleArrayNodeType } from "./nodes/collectionOps/shuffleArrayNode";
import { ForNDefinition, ForNNodeType } from "./nodes/collectionOps/forNNode";
import { ColorIteratorDefinition, ColorIteratorNodeType } from "./nodes/collectionOps/colorIteratorNode";
import { ColorStopBreakoutDefinition, ColorStopNodeType } from "./nodes/values/colorStopNode";
import { ColorStopArrayDefinition, ColorStopArrayNodeType } from "./nodes/values/colorStopArrayNode";
import { FloatStopArrayDefinition, FloatStopArrayNodeType } from "./nodes/values/floatStopArrayNode";
import { AngleStopArrayDefinition, AngleStopArrayNodeType } from "./nodes/values/angleStopArrayNode";
import { PointArrayDefinition, PointArrayNodeType } from "./nodes/values/pointArrayNode";
import { AngleArrayDefinition, AngleArrayNodeType } from "./nodes/values/angleArrayNode";
import { IntegerArrayDefinition, IntegerArrayNodeType } from "./nodes/values/integerArrayNode";
import { FloatArrayDefinition, FloatArrayNodeType } from "./nodes/values/floatArrayNode";
import { LengthArrayDefinition, LengthArrayNodeType } from "./nodes/values/lengthArrayNode";
import { ColorArrayDefinition, ColorArrayNodeType } from "./nodes/values/colorArrayNode";
import { BooleanArrayDefinition, BooleanArrayNodeType } from "./nodes/values/booleanArrayNode";
import { ArrayDefinition, ArrayNodeType } from "./nodes/values/arrayNode";
import { FromCrossingsDefinition, FromCrossingsNodeType } from "./nodes/values/fromCrossingsNode";
import { PointOnPathDefinition, PointOnPathNodeType } from "./nodes/values/pointOnPathNode";
import { PointsOnPathDefinition, PointsOnPathNodeType } from "./nodes/values/pointsOnPathNode";
import { DecompoundPathDefinition, DecompoundPathNodeType } from "./nodes/values/decompoundPathNode";
import { ShapeGroupDefinition, ShapeGroupNodeType } from "./nodes/modifiers/shapeGroupNode";
import { IntegerStopArrayDefinition, IntegerStopArrayNodeType } from "./nodes/values/integerStopArrayNode";
import { LengthStopArrayDefinition, LengthStopArrayNodeType } from "./nodes/values/lengthStopArrayNode";
import { RestyleDefinition, RestyleNodeType } from "./nodes/modifiers/restyleNode";
import { LinearGradientDefinition, LinearGradientNodeType } from "./nodes/values/linearGradientNode";
import { RadialGradientDefinition, RadialGradientNodeType } from "./nodes/values/radialGradientNode";
import { FloatIteratorDefinition, FloatIteratorNodeType } from "./nodes/collectionOps/floatIteratorNode";
import { StopFloatBreakoutDefinition, FloatStopNodeType } from "./nodes/values/floatStopNode";
import { IntegerIteratorDefinition, IntegerIteratorNodeType } from "./nodes/collectionOps/integerIteratorNode";
import { IntegerStopBreakoutDefinition, IntegerStopNodeType } from "./nodes/values/integerStopNode";
import { LengthIteratorDefinition, LengthIteratorNodeType } from "./nodes/collectionOps/lengthIteratorNode";
import { LengthStopBreakoutDefinition, LengthStopNodeType } from "./nodes/values/lengthStopNode";
import { AngleIteratorDefinition, AngleIteratorNodeType } from "./nodes/collectionOps/angleIteratorNode";
import { AngleStopBreakoutDefinition, AngleStopNodeType } from "./nodes/values/angleStopNode";
import { TransformDefinition, TransformType } from "./nodes/modifiers/transformNode";
import { PencilEffectDefinition, PencilEffectNodeType } from "./nodes/modifiers/effects/pencilEffectNode";
import { PenEffectDefinition, PenEffectNodeType } from "./nodes/modifiers/effects/penEffectNode";
import { BrushEffectDefinition, BrushEffectNodeType } from "./nodes/modifiers/effects/brushEffectNode";
import { GlowEffectDefinition, GlowEffectNodeType } from "./nodes/modifiers/effects/glowEffectNode";
import { RandomSeedDefinition, RandomSeedNodeType } from "./nodes/values/randomSeedNode";
import { RandomDefinition, RandomNodeType } from "./nodes/values/randomNode";
import { NotesDefinition, NotesNodeType } from "./nodes/meta/notesNode";
import { PathUnifyDefinition, PathUnitfyNodeType } from "./nodes/modifiers/pathOps/pathUnifyNode";
import { PathJoinDefinition, PathJoinNodeType } from "./nodes/modifiers/pathOps/pathJoinNode";
import { FromPathDefinition, FromPathNodeType } from "./nodes/shapes/fromPathNode";
import { PathSubtractDefinition, PathSubtractNodeType } from "./nodes/modifiers/pathOps/pathSubtractNode";
import { PathExcludeDefinition, PathExcludeNodeType } from "./nodes/modifiers/pathOps/pathExcludeNode";
import { PathIntersectDefinition, PathIntersectNodeType } from "./nodes/modifiers/pathOps/pathIntersectNode";
import { PathHealNodeDefinition, PathHealNodeType } from "./nodes/modifiers/pathOps/pathHealNode";
import { ReversePathDefinition, ReversePathNodeType } from "./nodes/modifiers/pathOps/reversePathNode";
import { PathLengthDefinition, PathLengthNodeType } from "./nodes/math/pathLengthNode";
import { PathDivideDefinition, PathDivideNodeType } from "./nodes/modifiers/pathOps/pathDivideNode";
import { PathCombineDefinition, PathCombineNodeType } from "./nodes/modifiers/pathCombineNode";
import { ContainerDefinition, ContainerNodeType } from "./nodes/meta/containerNode";
import { PatchDefinition, PatchNodeType } from "./nodes/meta/patchNode";
import { ArrayPointInputDefinition, ArrayPointInputType } from "./nodes/interface/inputs/arrayPointInputNode";
import { ArrayPointOutputDefinition, ArrayPointOutputType } from "./nodes/interface/outputs/arrayPointOutputNode";

export namespace Registries {
    export type NODEDEFINITIONS = {
        result: ResultDefinition;

        circle: CircleDefinition;
        polygon: PolygonDefinition;
        polyline: PolylineDefinition;
        polygram: PolygramDefinition;
        ring: RingDefinition;
        rectangle: RectangleDefinition;
        polyring: PolyringDefinition;
        knot: KnotDefinition;
        star: StarDefinition;
        burst: BurstDefinition;
        arc: ArcDefinition;
        spiral: SpiralDefinition;
        spirograph: SpirographDefinition;
        spiroring: SpiroringDefinition;
        line: LineDefinition;
        bandedLine: BandedLineDefinition;
        bandedBurst: BandedBurstDefinition;
        bandedArc: BandedArcDefinition;
        bandedStar: BandedStarDefinition;
        textPath: TextPathDefinition;
        text: TextDefinition;
        alongPath: AlongPathDefinition;
        glyph: GlyphDefinition;
        transform: TransformDefinition;
        fromPath: FromPathDefinition;

        angle: AngleDefinition;
        boolean: BooleanDefinition;
        color: ColorDefinition;
        colorSplit: ColorSplitDefinition;
        colorJoin: ColorJoinDefinition;
        enum: EnumPrimDefinition;
        float: FloatDefinition;
        string: StringDefinition;
        paragraph: ParagraphDefinition;
        integer: IntegerDefinition;
        length: LengthDefinition;
        tokensLength: TokensLengthDefinition;
        randomSeed: RandomSeedDefinition;
        random: RandomDefinition;
        point: PointDefinition;

        // meta
        notes: NotesDefinition;
        container: ContainerDefinition;
        patch: PatchDefinition;

        //debug
        shapePreview: ShapePreviewDefinition;
        debug: DebugDefinition;

        // subgraph interfaces
        floatInput: FloatInputDefinition;
        floatOutput: FloatOutputDefinition;
        integerInput: IntegerInputDefinition;
        integerOutput: IntegerOutputDefinition;
        angleInput: AngleInputDefinition;
        angleOutput: AngleOutputDefinition;
        lengthInput: LengthInputDefinition;
        lengthOutput: LengthOutputDefinition;
        shapeInput: ShapeInputDefinition;
        shapeOutput: ShapeOutputDefinition;
        colorInput: ColorInputDefinition;
        paintInput: PaintInputDefinition;
        colorOutput: ColorOutputDefinition;
        pointInput: PointInputDefinition;
        pointOutput: PointOutputDefinition;
        booleanInput: BooleanInputDefinition;
        booleanOutput: BooleanOutputDefinition;
        enumInput: EnumInputDefinition;
        enumOutput: EnumOutputDefinition;
        stringInput: StringInputDefinition;
        stringOutput: StringOutputDefinition;
        tokensLengthInput: TokensLengthInputDefinition;
        tokensLengthOutput: TokensLengthOutputDefinition;
        arrayLayerInput: ArrayLayerInputDefinition;
        arrayLayerOutput: ArrayLayerOutputDefinition;
        arrayPathOpInput: ArrayPathOpInputDefinition;
        arrayPathOpOutput: ArrayPathOpOutputDefinition;
        layerInput: LayerInputDefinition;
        layerOutput: LayerOutputDefinition;
        pathOpInput: PathOpInputDefinition;
        pathOpOutput: PathOpOutputDefinition;
        stopColorInput: StopColorInputDefinition;
        stopColorOutput: StopColorOutputDefinition;
        arrayStopColorInput: ArrayStopColorInputDefinition;
        arrayStopColorOutput: ArrayStopColorOutputDefinition;
        stopFloatInput: StopFloatInputDefinition;
        stopFloatOutput: StopFloatOutputDefinition;
        arrayStopFloatInput: ArrayStopFloatInputDefinition;
        arrayStopFloatOutput: ArrayStopFloatOutputDefinition;
        stopAngleInput: StopAngleInputDefinition;
        stopAngleOutput: StopAngleOutputDefinition;
        arrayStopAngleInput: ArrayStopAngleInputDefinition;
        arrayStopAngleOutput: ArrayStopAngleOutputDefinition;
        arrayAngleInput: ArrayAngleInputDefinition;
        arrayAngleOutput: ArrayAngleOutputDefinition;
        arrayIntegerInput: ArrayIntegerInputDefinition;
        arrayIntegerOutput: ArrayIntegerOutputDefinition;
        arrayFloatInput: ArrayFloatInputDefinition;
        arrayFloatOutput: ArrayFloatOutputDefinition;
        arrayPointInput: ArrayPointInputDefinition;
        arrayPointOutput: ArrayPointOutputDefinition;
        arrayLengthInput: ArrayLengthInputDefinition;
        arrayLengthOutput: ArrayLengthOutputDefinition;
        arrayColorInput: ArrayColorInputDefinition;
        arrayColorOutput: ArrayColorOutputDefinition;
        arrayBooleanInput: ArrayBooleanInputDefinition;
        arrayBooleanOutput: ArrayBooleanOutputDefinition;
        stopIntegerInput: StopIntegerInputDefinition;
        stopIntegerOutput: StopIntegerOutputDefinition;
        arrayStopIntegerInput: ArrayStopIntegerInputDefinition;
        arrayStopIntegerOutput: ArrayStopIntegerOutputDefinition;
        stopLengthInput: StopLengthInputDefinition;
        stopLengthOutput: StopLengthOutputDefinition;
        arrayStopLengthInput: ArrayStopLengthInputDefinition;
        arrayStopLengthOutput: ArrayStopLengthOutputDefinition;
        distributionInput: DistributionInputDefinition;
        distributionOutput: DistributionOutputDefinition;
        sequenceInput: SequenceInputDefinition;
        sequenceOutput: SequenceOutputDefinition;
        pathInput: PathInputDefinition;
        pathOutput: PathOutputDefinition;
        custom: CustomDefinition;

        // math
        add: AddDefinition;
        subtract: SubtractDefinition;
        multiply: MultiplyDefinition;
        divide: DivideDefinition;
        modulo: ModuloDefinition;
        remainder: RemainderDefinition;
        substring: SubstringDefinition;
        concat: ConcatDefinition;
        negate: NegateDefinition;
        reciprocal: ReciprocalDefinition;
        abs: AbsDefinition;
        round: RoundDefinition;
        integerToEnum: IntegerToEnumDefinition;
        sin: SinDefinition;
        cos: CosDefinition;
        tan: TanDefinition;
        arcsin: ArcsinDefinition;
        arccos: ArccosDefinition;
        arctan: ArctanDefinition;
        min: MinDefinition;
        max: MaxDefinition;
        clamp: ClampDefinition;
        lerp: LerpDefinition;
        pow: PowDefinition;
        root: RootDefinition;
        distribution: DistributionNodeDefinition;

        // point math
        pointAdd: PointAddDefinition;
        pointSubtract: PointSubtractDefinition;
        pointScale: PointScaleDefinition;
        pointDisplace: PointDisplaceDefinition;
        pointRotate: PointRotateDefinition;
        pointHadamard: PointHadamardDefinition;
        pointComplex: PointComplexDefinition;
        pointDot: PointDotDefinition;
        pointWedge: PointWedgeDefinition;
        pointLerp: PointLerpDefinition;
        pointDistance: PointDistanceDefinition;
        pointSplit: PointSplitDefinition;

        // collections
        layerCompose: LayerComposeDefinition;
        pathOpCompose: PathOpComposeDefinition;
        tokenizerLength: TokenizerLengthDefinition;
        layers: LayerDefinition;
        mask: MaskDefinition;
        clip: ClipDefinition;
        sequencer: SequencerDefinition;
        polygonLayout: PolygonLayoutDefinition;
        radialLayout: RadialLayoutDefinition;
        gridLayoutCartesian: GridLayoutCartesianDefinition;
        gridLayoutPolar: GridLayoutPolarDefinition;
        repeatedLayout: RepeatedLayoutDefinition;
        sequenceIndex: SequenceIndexDefinition;
        pathLayout: PathLayoutDefinition;
        scatterLayout: ScatterLayoutDefinition;
        forEach: ForEachDefinition;
        map: MapDefinition;
        filter: FilterDefinition;
        gather: GatherDefinition;
        mergeArray: MergeArrayDefinition;
        atIndex: AtIndexDefinition;
        reverse: ReverseDefinition;
        slice: SliceDefinition;
        inject: InjectDefinition;
        pluck: PluckDefinition;
        splice: SpliceDefinition;
        arrayCount: ArrayCountDefinition;
        replace: ReplaceDefinition;
        rotateArray: RotateArrayDefinition;
        shuffleArray: ShuffleArrayDefinition;
        forN: ForNDefinition;
        colorIterator: ColorIteratorDefinition;
        colorStop: ColorStopBreakoutDefinition;
        colorStopArray: ColorStopArrayDefinition;
        floatStopArray: FloatStopArrayDefinition;
        angleStopArray: AngleStopArrayDefinition;
        pointArray: PointArrayDefinition;
        angleArray: AngleArrayDefinition;
        integerArray: IntegerArrayDefinition;
        floatArray: FloatArrayDefinition;
        lengthArray: LengthArrayDefinition;
        colorArray: ColorArrayDefinition;
        booleanArray: BooleanArrayDefinition;
        array: ArrayDefinition;
        fromCrossings: FromCrossingsDefinition;
        pointOnPath: PointOnPathDefinition;
        pointsOnPath: PointsOnPathDefinition;
        decompoundPath: DecompoundPathDefinition;
        shapeGroup: ShapeGroupDefinition;
        integerStopArray: IntegerStopArrayDefinition;
        lengthStopArray: LengthStopArrayDefinition;
        floatIterator: FloatIteratorDefinition;
        floatStop: StopFloatBreakoutDefinition;
        integerIterator: IntegerIteratorDefinition;
        integerStop: IntegerStopBreakoutDefinition;
        lengthIterator: LengthIteratorDefinition;
        lengthStop: LengthStopBreakoutDefinition;
        angleIterator: AngleIteratorDefinition;
        angleStop: AngleStopBreakoutDefinition;
        restyle: RestyleDefinition;
        linearGradient: LinearGradientDefinition;
        radialGradient: RadialGradientDefinition;
        switchCase: SwitchCaseDefinition;
        condition: ConditionDefinition;
        logicalNot: LogicalNotDefinition;
        logicalAnd: LogicalAndDefinition;
        logicalOr: LogicalOrDefinition;
        logicalNand: LogicalNandDefinition;
        logicalNor: LogicalNorDefinition;
        logicalXor: LogicalXorDefinition;
        logicalXnor: LogicalXnorDefinition;
        equal: EqualDefinition;
        greaterThan: GreaterThanDefinition;
        greaterOrEqual: GreaterOrEqualDefinition;
        lessThan: LessThanDefinition;
        lessOrEqual: LessOrEqualDefinition;
        within: WithinDefinition;
        between: BetweenDefinition;
        isNullish: IsNullishDefinition;

        pathUnify: PathUnifyDefinition;
        pathJoin: PathJoinDefinition;
        pathSubtract: PathSubtractDefinition;
        pathExclude: PathExcludeDefinition;
        pathIntersect: PathIntersectDefinition;
        pathHeal: PathHealNodeDefinition;
        pathLength: PathLengthDefinition;
        reversePath: ReversePathDefinition;
        pathDivide: PathDivideDefinition;
        pathCombine: PathCombineDefinition;

        // effects
        pencilEffect: PencilEffectDefinition;
        penEffect: PenEffectDefinition;
        brushEffect: BrushEffectDefinition;
        glowEffect: GlowEffectDefinition;
    };

    export const NODETYPES: { [K in keyof NODEDEFINITIONS]: NodeTypes.Type<K, NODEDEFINITIONS[K]> } = {
        result: ResultNodeType,
        circle: CircleNodeType,
        polygon: PolygonNodeType,
        polyline: PolylineNodeType,
        polygram: PolygramNodeType,
        ring: RingNodeType,
        polyring: PolyringNodeType,
        knot: KnotNodeType,
        star: StarNodeType,
        burst: BurstNodeType,
        rectangle: RectangleNodeType,
        arc: ArcNodeType,
        spiral: SpiralNodeType,
        spirograph: SpirographNodeType,
        spiroring: SpiroringNodeType,
        line: LineNodeType,
        bandedLine: BandedLineNodeType,
        bandedBurst: BandedBurstNodeType,
        bandedArc: BandedArcNodeType,
        bandedStar: BandedStarNodeType,
        textPath: TextPathNodeType,
        text: TextNodeType,
        alongPath: AlongPathNodeType,
        glyph: GlyphNodeType,
        transform: TransformType,
        fromPath: FromPathNodeType,

        layerCompose: LayerComposeNodeType,
        pathOpCompose: PathOpComposeNodeType,
        tokenizerLength: TokenizerLengthNodeType,
        layers: LayerNodeType,
        mask: MaskNodeType,
        clip: ClipNodeType,
        sequencer: SequencerNodeType,
        polygonLayout: PolygonLayoutNodeType,
        radialLayout: RadialLayoutNodeType,
        gridLayoutCartesian: GridLayoutCartesianNodeType,
        gridLayoutPolar: GridLayoutPolarNodeType,
        repeatedLayout: RepeatedLayoutNodeType,
        sequenceIndex: SequenceIndexNodeType,
        pathLayout: PathLayoutNodeType,
        scatterLayout: ScatterLayoutNodeType,
        forEach: ForEachNodeType,
        map: MapNodeType,
        filter: FilterNodeType,
        gather: GatherNodeType,
        mergeArray: MergeArrayNodeType,
        atIndex: AtIndexNodeType,
        reverse: ReverseNodeType,
        slice: SliceNodeType,
        inject: InjectNodeType,
        pluck: PluckNodeType,
        splice: SpliceNodeType,
        arrayCount: ArrayCountNodeType,
        replace: ReplaceNodeType,
        rotateArray: RotateArrayNodeType,
        shuffleArray: ShuffleArrayNodeType,
        forN: ForNNodeType,
        colorIterator: ColorIteratorNodeType,
        colorStop: ColorStopNodeType,
        colorStopArray: ColorStopArrayNodeType,
        floatStopArray: FloatStopArrayNodeType,
        angleStopArray: AngleStopArrayNodeType,
        pointArray: PointArrayNodeType,
        angleArray: AngleArrayNodeType,
        integerArray: IntegerArrayNodeType,
        floatArray: FloatArrayNodeType,
        lengthArray: LengthArrayNodeType,
        colorArray: ColorArrayNodeType,
        booleanArray: BooleanArrayNodeType,
        array: ArrayNodeType,
        fromCrossings: FromCrossingsNodeType,
        pointOnPath: PointOnPathNodeType,
        pointsOnPath: PointsOnPathNodeType,
        decompoundPath: DecompoundPathNodeType,
        shapeGroup: ShapeGroupNodeType,
        integerStopArray: IntegerStopArrayNodeType,
        lengthStopArray: LengthStopArrayNodeType,
        floatIterator: FloatIteratorNodeType,
        floatStop: FloatStopNodeType,
        integerIterator: IntegerIteratorNodeType,
        integerStop: IntegerStopNodeType,
        lengthIterator: LengthIteratorNodeType,
        lengthStop: LengthStopNodeType,
        angleIterator: AngleIteratorNodeType,
        angleStop: AngleStopNodeType,
        restyle: RestyleNodeType,
        linearGradient: LinearGradientNodeType,
        radialGradient: RadialGradientNodeType,
        float: FloatPrimitiveType,
        string: StringPrimitiveType,
        paragraph: ParagraphPrimitiveType,
        integer: IntegerPrimitiveType,
        angle: AnglePrimitiveType,
        boolean: BooleanPrimitiveType,
        color: ColorPrimitiveType,
        colorSplit: ColorSplitNodeType,
        colorJoin: ColorJoinNodeType,
        enum: EnumPrimitiveType,
        length: LengthPrimitiveType,
        tokensLength: TokensLengthPrimitiveType,
        randomSeed: RandomSeedNodeType,
        random: RandomNodeType,
        point: PointPrimitiveType,
        notes: NotesNodeType,
        container: ContainerNodeType,
        patch: PatchNodeType,
        shapePreview: ShapePreviewType,
        debug: DebugNodeType,

        floatInput: FloatInputType,
        floatOutput: FloatOutputType,
        integerInput: IntegerInputType,
        integerOutput: IntegerOutputType,
        angleInput: AngleInputType,
        angleOutput: AngleOutputType,
        lengthInput: LengthInputType,
        lengthOutput: LengthOutputType,
        shapeInput: ShapeInputType,
        shapeOutput: ShapeOutputType,
        colorInput: ColorInputType,
        paintInput: PaintInputType,
        colorOutput: ColorOutputType,
        pointInput: PointInputType,
        pointOutput: PointOutputType,
        booleanInput: BooleanInputType,
        booleanOutput: BooleanOutputType,
        enumInput: EnumInputType,
        enumOutput: EnumOutputType,
        stringInput: StringInputType,
        stringOutput: StringOutputType,
        tokensLengthInput: TokensLengthInputType,
        tokensLengthOutput: TokensLengthOutputType,
        arrayLayerInput: ArrayLayerInputType,
        arrayLayerOutput: ArrayLayerOutputType,
        arrayPathOpInput: ArrayPathOpInputType,
        arrayPathOpOutput: ArrayPathOpOutputType,
        layerInput: LayerInputType,
        layerOutput: LayerOutputType,
        pathOpInput: PathOpInputType,
        pathOpOutput: PathOpOutputType,
        stopColorInput: StopColorInputType,
        stopColorOutput: StopColorOutputType,
        arrayStopColorInput: ArrayStopColorInputType,
        arrayStopColorOutput: ArrayStopColorOutputType,
        stopFloatInput: StopFloatInputType,
        stopFloatOutput: StopFloatOutputType,
        arrayStopFloatInput: ArrayStopFloatInputType,
        arrayStopFloatOutput: ArrayStopFloatOutputType,
        stopAngleInput: StopAngleInputType,
        stopAngleOutput: StopAngleOutputType,
        arrayStopAngleInput: ArrayStopAngleInputType,
        arrayStopAngleOutput: ArrayStopAngleOutputType,
        arrayAngleInput: ArrayAngleInputType,
        arrayAngleOutput: ArrayAngleOutputType,
        arrayIntegerInput: ArrayIntegerInputType,
        arrayIntegerOutput: ArrayIntegerOutputType,
        arrayFloatInput: ArrayFloatInputType,
        arrayFloatOutput: ArrayFloatOutputType,
        arrayPointInput: ArrayPointInputType,
        arrayPointOutput: ArrayPointOutputType,
        arrayLengthInput: ArrayLengthInputType,
        arrayLengthOutput: ArrayLengthOutputType,
        arrayColorInput: ArrayColorInputType,
        arrayColorOutput: ArrayColorOutputType,
        arrayBooleanInput: ArrayBooleanInputType,
        arrayBooleanOutput: ArrayBooleanOutputType,
        stopIntegerInput: StopIntegerInputType,
        stopIntegerOutput: StopIntegerOutputType,
        arrayStopIntegerInput: ArrayStopIntegerInputType,
        arrayStopIntegerOutput: ArrayStopIntegerOutputType,
        stopLengthInput: StopLengthInputType,
        stopLengthOutput: StopLengthOutputType,
        arrayStopLengthInput: ArrayStopLengthInputType,
        arrayStopLengthOutput: ArrayStopLengthOutputType,
        distributionInput: DistributionInputType,
        distributionOutput: DistributionOutputType,
        sequenceInput: SequenceInputType,
        sequenceOutput: SequenceOutputType,
        pathInput: PathInputType,
        pathOutput: PathOutputType,
        custom: CustomNodeType,

        add: AddType,
        subtract: SubtractType,
        multiply: MultiplyType,
        divide: DivideType,
        modulo: ModuloType,
        remainder: RemainderType,
        substring: SubstringNodeType,
        concat: ConcatNodeType,
        negate: NegateType,
        reciprocal: ReciprocalType,
        abs: AbsType,
        round: RoundType,
        integerToEnum: IntegerToEnumNodeType,
        sin: SinType,
        cos: CosType,
        tan: TanType,
        arcsin: ArcsinType,
        arccos: ArccosType,
        arctan: ArctanType,
        min: MinType,
        max: MaxType,
        clamp: ClampType,
        lerp: LerpType,
        pow: PowType,
        root: RootType,
        distribution: DistributionNodeType,

        pointAdd: PointAddType,
        pointSubtract: PointSubtractType,
        pointScale: PointScaleType,
        pointDisplace: PointDisplaceType,
        pointRotate: PointRotateType,
        pointHadamard: PointHadamardType,
        pointComplex: PointComplexType,
        pointDot: PointDotType,
        pointWedge: PointWedgeType,
        pointLerp: PointLerpType,
        pointDistance: PointDistanceType,
        pointSplit: PointSplitType,
        switchCase: SwitchCaseNodeType,
        condition: ConditionNodeType,
        logicalNot: LogicalNotNodeType,
        logicalAnd: LogicalAndNodeType,
        logicalOr: LogicalOrNodeType,
        logicalNand: LogicalNandNodeType,
        logicalNor: LogicalNorNodeType,
        logicalXor: LogicalXorNodeType,
        logicalXnor: LogicalXnorNodeType,
        equal: EqualNodeType,
        greaterThan: GreaterThanNodeType,
        greaterOrEqual: GreaterOrEqualNodeType,
        lessThan: LessThanNodeType,
        lessOrEqual: LessOrEqualNodeType,
        within: WithinNodeType,
        between: BetweenNodeType,
        isNullish: IsNullishNodeType,

        pathUnify: PathUnitfyNodeType,
        pathJoin: PathJoinNodeType,
        pathSubtract: PathSubtractNodeType,
        pathExclude: PathExcludeNodeType,
        pathIntersect: PathIntersectNodeType,
        pathHeal: PathHealNodeType,
        pathLength: PathLengthNodeType,
        reversePath: ReversePathNodeType,
        pathDivide: PathDivideNodeType,
        pathCombine: PathCombineNodeType,

        pencilEffect: PencilEffectNodeType,
        penEffect: PenEffectNodeType,
        brushEffect: BrushEffectNodeType,
        glowEffect: GlowEffectNodeType,
    } as const;

    // The datatype-kind registry (kinds + value types) now lives in `kinds.ts`, computed structurally
    // (`Kind`/`KindType`) from a single atomic-leaf source — see `DataTypes` below, which re-exports it.

    // Categories are decoupled from colour: a node's colour comes from its own `flavour`.
    // This is just the set of category names (Custom is the transient subgraph bucket).
    export const NODE_CATEGORIES = ["Result", "Outputs", "Inputs", "Logic", "Collection Ops", "Math", "Values", "Modifiers", "Shapes", "Meta", "Custom"] as const;
}
