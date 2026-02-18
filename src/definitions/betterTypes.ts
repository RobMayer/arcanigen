import { ReactNode } from "react";
import { SVGObject } from "../types";
import { EmptyOr } from "../util/misc";
import { ArcaneGraph } from "../util/structs/arcaneGraph";
import { Angle } from "./datatypes/angle";
import { Length } from "./datatypes/length";
import { Resolver } from "../util/resolver";
import { SubgraphDeps } from "../util/cycleDetection";
import { Flavour } from "../components/types";
import { InterfaceMember } from "../state/project/types";

export type { SubgraphDeps };
export type AllDeps = { [graphId: string]: SubgraphDeps };
import { ResultDefinition, ResultNodeType } from "./nodes/resultNode";
import { AngleDefinition, AnglePrimitiveType } from "./nodes/primitives/angleNode";
import { FloatDefinition, FloatPrimitiveType } from "./nodes/primitives/floatNode";
import { IntegerDefinition, IntegerPrimitiveType } from "./nodes/primitives/integerNode";
import { CircleDefinition, CircleNodeType } from "./nodes/shapes/circleNode";
import type { Project } from "../state/project";
import { DebugDefinition, DebugType } from "./nodes/debug/debugNode";
import { ShapePreviewDefinition, ShapePreviewType } from "./nodes/debug/shapePreviewNode";
import { FloatInputDefinition, FloatInputType } from "./nodes/interface/floatInputNode";
import { FloatOutputDefinition, FloatOutputType } from "./nodes/interface/floatOutputNode";
import { CustomDefinition, CustomNodeType } from "./nodes/interface/customNode";
import { AddFloatDefinition, AddFloatType } from "./nodes/math/addFloat";
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
import { SwitchCaseDefinition, SwitchCaseNodeType } from "./nodes/logic/switchCaseNode";
import { ConditionDefinition, ConditionNodeType } from "./nodes/logic/conditionNode";
import { LogicalNotDefinition, LogicalNotNodeType } from "./nodes/logic/logicalNotNode";
import { LogicalAndDefinition, LogicalAndNodeType } from "./nodes/logic/logicalAndNode";
import { LogicalOrDefinition, LogicalOrNodeType } from "./nodes/logic/logicalOrNode";
import { LogicalNandDefinition, LogicalNandNodeType } from "./nodes/logic/logicalNandNode";
import { LogicalNorDefinition, LogicalNorNodeType } from "./nodes/logic/logicalNorNode";
import { LogicalXorDefinition, LogicalXorNodeType } from "./nodes/logic/logicalXorNode";
import { LogicalXnorDefinition, LogicalXnorNodeType } from "./nodes/logic/logicalXnorNode";
import { RingDefinition, RingNodeType } from "./nodes/shapes/ringNode";
import { RectangleDefinition, RectangleNodeType } from "./nodes/shapes/rectangleNode";
import { PolygramDefinition, PolygramNodeType } from "./nodes/shapes/polygramNode";
import { PolyringDefinition, PolyringNodeType } from "./nodes/shapes/polyringNode";
import { KnotDefinition, KnotNodeType } from "./nodes/shapes/knotNode";
import { StarDefinition, StarNodeType } from "./nodes/shapes/starNode";
import { BurstDefinition, BurstNodeType } from "./nodes/shapes/burstNode";

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

        angle: AngleDefinition;
        float: FloatDefinition;
        integer: IntegerDefinition;

        //debug
        debug: DebugDefinition;
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
        custom: CustomDefinition;

        // math
        addFloat: AddFloatDefinition;
        distribution: DistributionNodeDefinition;

        // collections
        layerCompose: LayerComposeDefinition;
        layers: LayerDefinition;
        switchCase: SwitchCaseDefinition;
        condition: ConditionDefinition;
        logicalNot: LogicalNotDefinition;
        logicalAnd: LogicalAndDefinition;
        logicalOr: LogicalOrDefinition;
        logicalNand: LogicalNandDefinition;
        logicalNor: LogicalNorDefinition;
        logicalXor: LogicalXorDefinition;
        logicalXnor: LogicalXnorDefinition;
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

        layerCompose: LayerComposeNodeType,
        layers: LayerNodeType,
        float: FloatPrimitiveType,
        integer: IntegerPrimitiveType,
        angle: AnglePrimitiveType,
        debug: DebugType,
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
        custom: CustomNodeType,

        addFloat: AddFloatType,
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
        shape: SVGObject;
        color: Color.Type;
        "tokens<length>": string;
        distribution: { func: number; easing: number; intensity: EmptyOr<NumericString.Type> };
        layer: { shape: SVGObject | null; enabled: boolean | null; blend: number | null };
        "array<layer>": { shape: SVGObject | null; enabled: boolean | null; blend: number | null }[];
    };

    export const DATATYPE_LABELS: { [key in keyof DATATYPES]: string } = {
        string: "String",
        length: "Length",
        shape: "Shape",
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
        Math: "accent",
        Custom: "emphasis",
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
        removeLinks(graphId: string, ...linkIds: string[]): void;
        requestRefresh(graphId: string, nodeId: string, socketId: string, side: "in" | "out", reason: RefreshReason): void;
    }

    export interface Type<T extends Key, D extends NodeDefinitions.Generic = NodeDefinitions.Generic> {
        type: T;
        displayName: string;
        defaultLabel: string;
        iconNode: ReactNode;
        iconCard?: ReactNode;
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
        getSocketType: (node: NodeDefinitions.NodeFor<D>, socketId: string, side: "in" | "out", ctx: MethodContext) => string;
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

    export const list = () => Object.values(Registries.NODETYPES);

    export type Any = (typeof Registries.NODETYPES)[keyof typeof Registries.NODETYPES];
    export type DefinitionOf<T extends Any> = T extends Type<infer _t, infer D> ? D : never;
}

export namespace SocketTypes {
    // --- New set-based socket type system ---

    /** All concrete data types, sorted alphabetically for canonical ordering */
    export const ALL_TYPES: readonly DataTypes.Kind[] = (Object.keys(Registries.DATATYPE_LABELS) as DataTypes.Kind[]).sort();

    /** Empty set — unconstrained OUT ("no type yet"). ∅ ⊆ anything. */
    export const NONE = "";

    /** Full set — unconstrained IN (accepts everything). Auto-expands with new DataTypes. */
    export const ANY = ALL_TYPES.join(" ");

    /** Named presets */
    export const LAYER_OR_SHAPE = "layer shape";

    /** Parse a type string into an array of concrete DataTypes.Kind */
    export const parseSocketType = (type: string): readonly DataTypes.Kind[] => {
        if (type === "") return [];
        return type.split(" ") as DataTypes.Kind[];
    };

    /** Directional subset check: can this OUT connect to this IN? */
    export const canFlow = (outType: string, inType: string): boolean => {
        if (outType === "") return true;
        if (outType === inType) return true;
        const outTypes = parseSocketType(outType);
        const inTypes = parseSocketType(inType);
        return outTypes.every((t) => inTypes.includes(t));
    };

    /** Union two type strings (A ∪ B), maintaining canonical sort order */
    export const union = (a: string, b: string): string => {
        if (a === "") return b;
        if (b === "") return a;
        if (a === b) return a;
        const set = new Set([...a.split(" "), ...b.split(" ")]);
        return [...set].sort().join(" ");
    };

    /** Intersect two type strings (A ∩ B), maintaining canonical sort order */
    export const intersect = (a: string, b: string): string => {
        if (a === "" || b === "") return "";
        if (a === b) return a;
        const aSet = new Set(a.split(" "));
        return b
            .split(" ")
            .filter((t) => aSet.has(t))
            .sort()
            .join(" ");
    };
}
