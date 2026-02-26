import { ReactNode } from "react";
import { SVGPath } from "../types";
import { Shape } from "./shapeTypes";
import { EmptyOr } from "../util/misc";
import { ArcaneGraph } from "../util/structs/arcaneGraph";
import { Angle } from "./datatypes/angle";
import { Length } from "./datatypes/length";
import { Resolver } from "../util/resolver";
import { SubgraphDeps } from "../util/cycleDetection";
import { Flavour } from "../components/types";
import { InterfaceMember } from "../state/project/types";
import { ResultDefinition, ResultNodeType } from "./nodes/resultNode";
import { AngleDefinition, AnglePrimitiveType } from "./nodes/primitives/angleNode";
import { BooleanDefinition, BooleanPrimitiveType } from "./nodes/primitives/booleanNode";
import { ColorDefinition, ColorPrimitiveType } from "./nodes/primitives/colorNode";
import { EnumDefinition as EnumPrimDefinition, EnumPrimitiveType } from "./nodes/primitives/enumNode";
import { FloatDefinition, FloatPrimitiveType } from "./nodes/primitives/floatNode";
import { IntegerDefinition, IntegerPrimitiveType } from "./nodes/primitives/integerNode";
import { LengthDefinition, LengthPrimitiveType } from "./nodes/primitives/lengthNode";
import { TokensLengthDefinition, TokensLengthPrimitiveType } from "./nodes/primitives/tokensLengthNode";
import { CircleDefinition, CircleNodeType } from "./nodes/shapes/circleNode";
import type { Project } from "../state/project";
import { ShapePreviewDefinition, ShapePreviewType } from "./nodes/debug/shapePreviewNode";
import { FloatInputDefinition, FloatInputType } from "./nodes/interface/floatInputNode";
import { FloatOutputDefinition, FloatOutputType } from "./nodes/interface/floatOutputNode";
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
import { NumericString } from "./datatypes/numericString";
import { Color } from "./datatypes/color";
import { PolygonDefinition, PolygonNodeType } from "./nodes/shapes/polygonNode";
import { LayerComposeDefinition, LayerComposeNodeType } from "./nodes/collections/layerComposeNode";
import { LayerDefinition, LayerNodeType } from "./nodes/collections/layerNode";
import { DistributionNodeType, DistributionNodeDefinition } from "./nodes/math/distributionNode";
import { IntegerInputDefinition, IntegerInputType } from "./nodes/interface/integerInputNode";
import { IntegerOutputDefinition, IntegerOutputType } from "./nodes/interface/integerOutputNode";
import { AngleInputDefinition, AngleInputType } from "./nodes/interface/angleInputNode";
import { AngleOutputDefinition, AngleOutputType } from "./nodes/interface/angleOutputNode";
import { LengthInputDefinition, LengthInputType } from "./nodes/interface/lengthInputNode";
import { LengthOutputDefinition, LengthOutputType } from "./nodes/interface/lengthOutputNode";
import { ShapeInputDefinition, ShapeInputType } from "./nodes/interface/shapeInputNode";
import { ShapeOutputDefinition, ShapeOutputType } from "./nodes/interface/shapeOutputNode";
import { ColorInputDefinition, ColorInputType } from "./nodes/interface/colorInputNode";
import { ColorOutputDefinition, ColorOutputType } from "./nodes/interface/colorOutputNode";
import { BooleanInputDefinition, BooleanInputType } from "./nodes/interface/booleanInputNode";
import { BooleanOutputDefinition, BooleanOutputType } from "./nodes/interface/booleanOutputNode";
import { EnumInputDefinition, EnumInputType } from "./nodes/interface/enumInputNode";
import { EnumOutputDefinition, EnumOutputType } from "./nodes/interface/enumOutputNode";
import { StringInputDefinition, StringInputType } from "./nodes/interface/stringInputNode";
import { StringOutputDefinition, StringOutputType } from "./nodes/interface/stringOutputNode";
import { TokensLengthInputDefinition, TokensLengthInputType } from "./nodes/interface/tokensLengthInputNode";
import { TokensLengthOutputDefinition, TokensLengthOutputType } from "./nodes/interface/tokensLengthOutputNode";
import { ArrayLayerInputDefinition, ArrayLayerInputType } from "./nodes/interface/arrayLayerInputNode";
import { ArrayLayerOutputDefinition, ArrayLayerOutputType } from "./nodes/interface/arrayLayerOutputNode";
import { DistributionInputDefinition, DistributionInputType } from "./nodes/interface/distributionInputNode";
import { DistributionOutputDefinition, DistributionOutputType } from "./nodes/interface/distributionOutputNode";
import { SequenceInputDefinition, SequenceInputType } from "./nodes/interface/sequenceInputNode";
import { SequenceOutputDefinition, SequenceOutputType } from "./nodes/interface/sequenceOutputNode";
import { PathInputDefinition, PathInputType } from "./nodes/interface/pathInputNode";
import { PathOutputDefinition, PathOutputType } from "./nodes/interface/pathOutputNode";
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
import { LineDefinition, LineNodeType } from "./nodes/shapes/lineNode";
import { TextPathDefinition, TextPathNodeType } from "./nodes/shapes/textNode";
import { AlongPathDefinition, AlongPathNodeType } from "./nodes/shapes/alongPathNode";
import { GlyphDefinition, GlyphNodeType } from "./nodes/shapes/glyphNode";
import { MaskDefinition, MaskNodeType } from "./nodes/collections/maskNode";
import { ClipDefinition, ClipNodeType } from "./nodes/collections/clipNode";
import { SequencerDefinition, SequencerNodeType } from "./nodes/collections/sequencerNode";
import { PolygonArrayDefinition, PolygonArrayNodeType } from "./nodes/collections/polygonArrayNode";
import { RadialArrayDefinition, RadialArrayNodeType } from "./nodes/collections/radialArrayNode";
import { PathArrayDefinition, PathArrayNodeType } from "./nodes/collections/pathArrayNode";
import { ColorIteratorDefinition, ColorIteratorNodeType } from "./nodes/collections/colorIteratorNode";
import { RestyleDefinition, RestyleNodeType } from "./nodes/collections/restyleNode";
import { FloatIteratorDefinition, FloatIteratorNodeType } from "./nodes/collections/floatIteratorNode";
import { IntegerIteratorDefinition, IntegerIteratorNodeType } from "./nodes/collections/integerIteratorNode";
import { LengthIteratorDefinition, LengthIteratorNodeType } from "./nodes/collections/lengthIteratorNode";
import { AngleIteratorDefinition, AngleIteratorNodeType } from "./nodes/collections/angleIteratorNode";
import { TransformDefinition, TransformType } from "./nodes/shapes/transformNode";
import { PencilEffectDefinition, PencilEffectNodeType } from "./nodes/effects/pencilEffectNode";
import { PenEffectDefinition, PenEffectNodeType } from "./nodes/effects/penEffectNode";
import { BrushEffectDefinition, BrushEffectNodeType } from "./nodes/effects/brushEffectNode";
import { GlowEffectDefinition, GlowEffectNodeType } from "./nodes/effects/glowEffectNode";
import { RandomSeedDefinition, RandomSeedNodeType } from "./nodes/primitives/randomSeedNode";
import { NotesDefinition, NotesNodeType } from "./nodes/meta/notesNode";
import { PathUnifyDefinition, PathUnitfyNodeType } from "./nodes/math/pathUnifyNode";
import { FromPathDefinition, FromPathNodeType } from "./nodes/shapes/fromPathNode";
import { PathSubtractDefinition, PathSubtractNodeType } from "./nodes/math/pathSubtractNode";
import { PathExcludeDefinition, PathExcludeNodeType } from "./nodes/math/pathExcludeNode";
import { PathIntersectDefinition, PathIntersectNodeType } from "./nodes/math/pathIntersectNode";
import { PathHealNodeDefinition, PathHealNodeType } from "./nodes/math/pathHealNode";
import { PathDivideDefinition, PathDivideNodeType } from "./nodes/math/pathDivideNode";
import { ContainerDefinition, ContainerNodeType } from "./nodes/meta/containerNode";

export type { SubgraphDeps };
export type AllDeps = { [graphId: string]: SubgraphDeps };

/* ============================================================================
   INTERNAL - Shared across namespaces but not exported
   ============================================================================ */

namespace Registries {
    // will eventually replace NodeRegistry
    export type NODEDEFINITIONS = {
        result: ResultDefinition;

        circle: CircleDefinition;
        polygon: PolygonDefinition;
        polygram: PolygramDefinition;
        ring: RingDefinition;
        rectangle: RectangleDefinition;
        polyring: PolyringDefinition;
        knot: KnotDefinition;
        star: StarDefinition;
        burst: BurstDefinition;
        arc: ArcDefinition;
        spiral: SpiralDefinition;
        line: LineDefinition;
        textPath: TextPathDefinition;
        alongPath: AlongPathDefinition;
        glyph: GlyphDefinition;
        transform: TransformDefinition;
        fromPath: FromPathDefinition;

        angle: AngleDefinition;
        boolean: BooleanDefinition;
        color: ColorDefinition;
        enum: EnumPrimDefinition;
        float: FloatDefinition;
        integer: IntegerDefinition;
        length: LengthDefinition;
        tokensLength: TokensLengthDefinition;
        randomSeed: RandomSeedDefinition;

        // meta
        notes: NotesDefinition;
        container: ContainerDefinition;

        //debug
        shapePreview: ShapePreviewDefinition;

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
        colorOutput: ColorOutputDefinition;
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
        negate: NegateDefinition;
        reciprocal: ReciprocalDefinition;
        abs: AbsDefinition;
        round: RoundDefinition;
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

        // collections
        layerCompose: LayerComposeDefinition;
        layers: LayerDefinition;
        mask: MaskDefinition;
        clip: ClipDefinition;
        sequencer: SequencerDefinition;
        polygonArray: PolygonArrayDefinition;
        radialArray: RadialArrayDefinition;
        pathArray: PathArrayDefinition;
        colorIterator: ColorIteratorDefinition;
        floatIterator: FloatIteratorDefinition;
        integerIterator: IntegerIteratorDefinition;
        lengthIterator: LengthIteratorDefinition;
        angleIterator: AngleIteratorDefinition;
        restyle: RestyleDefinition;
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
        pathSubtract: PathSubtractDefinition;
        pathExclude: PathExcludeDefinition;
        pathIntersect: PathIntersectDefinition;
        pathHeal: PathHealNodeDefinition;
        pathDivide: PathDivideDefinition;

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
        polygram: PolygramNodeType,
        ring: RingNodeType,
        polyring: PolyringNodeType,
        knot: KnotNodeType,
        star: StarNodeType,
        burst: BurstNodeType,
        rectangle: RectangleNodeType,
        arc: ArcNodeType,
        spiral: SpiralNodeType,
        line: LineNodeType,
        textPath: TextPathNodeType,
        alongPath: AlongPathNodeType,
        glyph: GlyphNodeType,
        transform: TransformType,
        fromPath: FromPathNodeType,

        layerCompose: LayerComposeNodeType,
        layers: LayerNodeType,
        mask: MaskNodeType,
        clip: ClipNodeType,
        sequencer: SequencerNodeType,
        polygonArray: PolygonArrayNodeType,
        radialArray: RadialArrayNodeType,
        pathArray: PathArrayNodeType,
        colorIterator: ColorIteratorNodeType,
        floatIterator: FloatIteratorNodeType,
        integerIterator: IntegerIteratorNodeType,
        lengthIterator: LengthIteratorNodeType,
        angleIterator: AngleIteratorNodeType,
        restyle: RestyleNodeType,
        float: FloatPrimitiveType,
        integer: IntegerPrimitiveType,
        angle: AnglePrimitiveType,
        boolean: BooleanPrimitiveType,
        color: ColorPrimitiveType,
        enum: EnumPrimitiveType,
        length: LengthPrimitiveType,
        tokensLength: TokensLengthPrimitiveType,
        randomSeed: RandomSeedNodeType,
        notes: NotesNodeType,
        container: ContainerNodeType,
        shapePreview: ShapePreviewType,

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
        colorOutput: ColorOutputType,
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
        negate: NegateType,
        reciprocal: ReciprocalType,
        abs: AbsType,
        round: RoundType,
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
        pathSubtract: PathSubtractNodeType,
        pathExclude: PathExcludeNodeType,
        pathIntersect: PathIntersectNodeType,
        pathHeal: PathHealNodeType,
        pathDivide: PathDivideNodeType,

        pencilEffect: PencilEffectNodeType,
        penEffect: PenEffectNodeType,
        brushEffect: BrushEffectNodeType,
        glowEffect: GlowEffectNodeType,
    } as const;

    export type DATATYPES = {
        // primitives
        float: EmptyOr<NumericString.Type>;
        integer: EmptyOr<NumericString.Type>;
        string: string;
        enum: number;
        angle: EmptyOr<Angle.Type>;
        boolean: boolean;

        length: EmptyOr<Length.Type>;
        shape: Shape;
        path: SVGPath;
        color: Color.Type;
        "tokens<length>": string;
        distribution: { func: number; easing: number; intensity: EmptyOr<NumericString.Type> };
        layer: { shape: Shape | null; enabled: boolean | null; blend: number | null };
        "array<layer>": { shape: Shape | null; enabled: boolean | null; blend: number | null }[];
        sequence: { senderId: string; count: number };
    };

    export const DATATYPE_LABELS: { [key in keyof DATATYPES]: string } = {
        string: "String",
        length: "Length",
        shape: "Shape",
        path: "Path",
        float: "Float",
        integer: "Integer",
        color: "Color",
        enum: "Enum",
        angle: "Angle",
        boolean: "Boolean",
        "tokens<length>": "Lengths",
        layer: "Layer",
        "array<layer>": "Layer Array",
        distribution: "Distribution",
        sequence: "Sequence",
    };

    export const NODECAT_FLAVOURS = {
        Result: "emphasis",
        Outputs: "emphasis",
        Logic: "help",
        Inputs: "emphasis",
        Primitives: "accent",
        Collections: "danger",
        Shapes: "confirm",
        Meta: "emphasis",
        Math: "help",
        Effects: "emphasis",
        Custom: "info",
    } as const satisfies { [key: string]: Flavour };
}

export namespace DataTypes {
    const KIND = Symbol.for("key");
    const TYPE = Symbol.for("type");

    type REG = { [K2 in Kind]: { [KIND]: K2; [TYPE]: Registries.DATATYPES[K2] } };

    export type Kind = keyof Registries.DATATYPES & {};
    export type Use<K extends Kind> = REG[K];

    export type Any = Use<Kind>;

    export type KeyOf<E extends Use<Kind>> = E[typeof KIND];
    export type TypeOf<E extends Use<Kind>> = E[typeof TYPE];

    export type EvalOf<E extends Use<Kind>> = { [K in Kind]: { kind: K; data: REG[K][typeof TYPE] } }[E[typeof KIND]];
    export type AnyEval = EvalOf<Any>;
    export type AnyType = TypeOf<Any>;
}

export namespace NodeDefinitions {
    export type Any = Registries.NODEDEFINITIONS[keyof Registries.NODEDEFINITIONS];

    export type Generic = {
        inputs: Record<string, DataTypes.Any>;
        outputs: Record<string, DataTypes.Any>;
        payload: Record<string, unknown>;
    };

    // Base definition requiring a label in payload
    export type Base = {
        inputs: Record<string, DataTypes.Any>;
        outputs: Record<string, DataTypes.Any>;
        payload: {
            label: string;
        };
    };

    export type PayloadTypeOf<D extends Generic> = { [K in keyof D["payload"]]: D["payload"][K] };

    export type NodeFor<D extends Generic> = ArcaneGraph.NodeOf<PayloadTypeOf<D>>;

    // Built node instance from a definition
    export type BuiltNodeOf<T extends NodeTypes.Key, D extends Generic> = ArcaneGraph.NodeOf<PayloadTypeOf<D>> & {
        type: T;
        in: { [K in keyof D["inputs"]]: string | null };
        out: { [K in keyof D["outputs"]]: string[] };
    };
}

export namespace NodeTypes {
    export type Key = keyof typeof Registries.NODETYPES;
    export type Use<K extends Key> = (typeof Registries.NODETYPES)[K];

    export const CATEGORY_FLAVOURS = Registries.NODECAT_FLAVOURS;

    export type Category = keyof typeof Registries.NODECAT_FLAVOURS;

    export type RefreshReason = "constraintAdded" | "constraintRemoved";

    /** Interface for lifecycle hook context — provides state access and mutation operations */
    export interface MethodContext {
        // State reads
        getNode(graphId: string, nodeId: string): NodeDefinitions.NodeFor<NodeDefinitions.Any> | undefined;
        getLink(graphId: string, linkId: string): ArcaneGraph.Link | undefined;
        getNodesForGraph(graphId: string): { [nodeId: string]: NodeDefinitions.NodeFor<NodeDefinitions.Any> };
        getLinksForGraph(graphId: string): { [linkId: string]: ArcaneGraph.Link };
        getInterfaces(graphId: string): InterfaceMember[];
        getUsers(graphId: string): { node: string; scope: string }[];
        // Low-level mutations (no hooks fired)
        setNode(graphId: string, nodeId: string, node: NodeDefinitions.NodeFor<NodeDefinitions.Any>): void;
        setInterfaces(graphId: string, interfaces: InterfaceMember[]): void;
        setUsers(graphId: string, users: { node: string; scope: string }[]): void;
        // High-level operations (fire hooks, rebuild cache)
        connect(graphId: string, fromNode: string, toNode: string, fromSocket: string, toSocket: string, type: string): void;
        removeLinks(graphId: string, ...linkIds: string[]): void;
        requestRefresh(graphId: string, nodeId: string, socketId: string, side: "in" | "out", reason: RefreshReason): void;
    }

    export interface Type<T extends Key, D extends NodeDefinitions.Generic = NodeDefinitions.Generic> {
        type: T;
        displayName: string;
        defaultLabel: string;
        iconNode: ReactNode;
        category: Category;
        create: (input: Partial<NodeDefinitions.PayloadTypeOf<D>>, id?: string) => NodeDefinitions.BuiltNodeOf<T, D>;
        Controls: (props: { node: NodeDefinitions.NodeFor<D>; methods: ReturnType<typeof Project.useNode>[1] }) => ReactNode;
        evaluate: (node: NodeDefinitions.NodeFor<D>, socket: keyof D["outputs"], context: Resolver.Context) => DataTypes.AnyEval | null;
        dependsOn: (node: NodeDefinitions.NodeFor<D>, outSocket: keyof D["outputs"], deps: AllDeps) => (keyof D["inputs"])[];
        contributesTo: (node: NodeDefinitions.NodeFor<D>, inSocket: keyof D["inputs"], deps: AllDeps) => (keyof D["outputs"])[];
        onCreate?: (node: NodeDefinitions.BuiltNodeOf<T, D>, graphId: string, ctx: MethodContext) => void;
        onDelete?: (node: NodeDefinitions.BuiltNodeOf<T, D>, graphId: string, ctx: MethodContext) => void;
        onConnect?: (node: NodeDefinitions.BuiltNodeOf<T, D>, linkId: string, direction: "in" | "out", graphId: string, ctx: MethodContext) => void;
        onDisconnect?: (node: NodeDefinitions.BuiltNodeOf<T, D>, link: ArcaneGraph.Link, direction: "in" | "out", graphId: string, ctx: MethodContext) => void;
        onPayloadChange?: (node: NodeDefinitions.NodeFor<D>, prev: D["payload"], graphId: string, ctx: MethodContext) => void;
        onRefreshRequest?: (node: NodeDefinitions.BuiltNodeOf<T, D>, socketId: string, side: "in" | "out", reason: RefreshReason, graphId: string, ctx: MethodContext) => void;
        canInterject?: (link: ArcaneGraph.Link, graphId: string, ctx: MethodContext) => boolean;
        onInterject?: (node: NodeDefinitions.BuiltNodeOf<T, D>, link: ArcaneGraph.Link, graphId: string, ctx: MethodContext) => void;
        getSocketType: (node: NodeDefinitions.NodeFor<D>, socketId: string, side: "in" | "out", ctx: MethodContext) => SocketTypes.SocketRule;
        clone?: (node: NodeDefinitions.BuiltNodeOf<T, D>) => NodeDefinitions.BuiltNodeOf<T, D>;
    }

    export const get = <K extends Key>(key: K): (typeof Registries.NODETYPES)[K] => {
        return Registries.NODETYPES[key];
    };

    export const getControls = <K extends Key>(key: K) => {
        return Registries.NODETYPES[key].Controls;
    };

    export const getEvaluator = <K extends Key>(key: K) => {
        return Registries.NODETYPES[key].evaluate;
    };

    export const getSocketType = (node: NodeDefinitions.NodeFor<NodeDefinitions.Any>, socketId: string, side: "in" | "out", ctx: MethodContext): SocketTypes.SocketRule => {
        return (get(node.type).getSocketType as (n: typeof node, s: string, d: "in" | "out", c: MethodContext) => SocketTypes.SocketRule)(node, socketId, side, ctx);
    };

    export const list = () => Object.values(Registries.NODETYPES);

    export type Any = (typeof Registries.NODETYPES)[keyof typeof Registries.NODETYPES];
    export type DefinitionOf<T extends Any> = T extends Type<infer _t, infer D> ? D : never;
}

export namespace SocketTypes {
    // --- Socket rule system ---

    /** A socket's type constraint: which DataTypes.Kind values it handles, and whether it's conjunctive or disjunctive */
    export type SocketRule = { types: DataTypes.Kind[]; mode: "and" | "or" };

    /** All concrete data types, sorted alphabetically for canonical ordering */
    export const ALL_TYPES: readonly DataTypes.Kind[] = (Object.keys(Registries.DATATYPE_LABELS) as DataTypes.Kind[]).sort();

    /** Empty set — unconstrained OUT ("no type yet"). */
    export const NONE: SocketRule = { types: [], mode: "and" };

    /** Full set — unconstrained IN (accepts everything). Auto-expands with new DataTypes. */
    export const ANY: SocketRule = { types: [...ALL_TYPES], mode: "and" };

    /** Named presets */
    export const LAYER_OR_SHAPE: SocketRule = { types: ["layer", "shape"], mode: "and" };

    /** Create a single-type rule (mode is irrelevant for single types) */
    export const of = (kind: DataTypes.Kind): SocketRule => ({ types: [kind], mode: "and" });

    /** Create a conjunctive rule — "all of these" */
    export const and = (...kinds: DataTypes.Kind[]): SocketRule => ({ types: [...kinds].sort(), mode: "and" });

    /** Create a disjunctive rule — "one of these" */
    export const or = (...kinds: DataTypes.Kind[]): SocketRule => ({ types: [...kinds].sort(), mode: "or" });

    /** Convert a SocketRule to a CSS-friendly string for the Socket type prop */
    export const toCSS = (rule: SocketRule): string => rule.types.join(" ");

    /** Directional compatibility check: can this OUT connect to this IN? */
    export const canFlow = (outRule: SocketRule, inRule: SocketRule): boolean => {
        if (outRule.types.length === 0) return true;
        if (outRule.mode === "or") {
            // Disjunctive: at least one OUT kind must be accepted by IN
            return outRule.types.some((t) => inRule.types.includes(t));
        }
        // Conjunctive: every OUT kind must be accepted by IN
        return outRule.types.every((t) => inRule.types.includes(t));
    };

    /** Pick a representative DataTypes.Kind for the link type (cosmetic — wire color) */
    export const representativeKind = (out: SocketRule, inp: SocketRule): string => {
        if (out.types.length > 0) return out.types[0];
        if (inp.types.length > 0) return inp.types[0];
        return "float";
    };

    /** Union two rules (A ∪ B), maintaining canonical sort order. Mode propagates from first operand. */
    export const union = (a: SocketRule, b: SocketRule): SocketRule => {
        if (a.types.length === 0) return b;
        if (b.types.length === 0) return a;
        const set = new Set<DataTypes.Kind>([...a.types, ...b.types]);
        return { types: [...set].sort(), mode: a.mode };
    };

    /** Intersect two rules (A ∩ B), maintaining canonical sort order. Mode propagates from first operand. */
    export const intersect = (a: SocketRule, b: SocketRule): SocketRule => {
        if (a.types.length === 0 || b.types.length === 0) return { types: [], mode: a.mode };
        const bSet = new Set(b.types);
        return { types: a.types.filter((t) => bSet.has(t)).sort(), mode: a.mode };
    };

    /** Structural equality check for two SocketRules */
    export const equals = (a: SocketRule, b: SocketRule): boolean => {
        return a.mode === b.mode && a.types.length === b.types.length && a.types.every((t, i) => t === b.types[i]);
    };
}
