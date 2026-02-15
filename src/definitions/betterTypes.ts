import { ReactNode } from "react";
import { SVGObject } from "../types";
import { EmptyOr } from "../util/misc";
import { ArcaneGraph } from "../util/structs/arcaneGraph";
import { Angle } from "./datatypes/angle";
import { Length } from "./datatypes/length";
import { IconDefinition } from "../components/Icon";
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
import { Project } from "../state/project";
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

/* ============================================================================
   INTERNAL - Shared across namespaces but not exported
   ============================================================================ */

namespace Registries {
    // will eventually replace NodeRegistry
    export type NODEDEFINITIONS = {
        result: ResultDefinition;
        circle: CircleDefinition;
        polygon: PolygonDefinition;
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
        custom: CustomDefinition;

        // math
        addFloat: AddFloatDefinition;
        distribution: DistributionNodeDefinition;

        // collections
        layerCompose: LayerComposeDefinition;
        layers: LayerDefinition;
    };

    export const NODETYPES: { [K in keyof NODEDEFINITIONS]: NodeTypes.Type<K, NODEDEFINITIONS[K]> } = {
        result: ResultNodeType,
        circle: CircleNodeType,
        polygon: PolygonNodeType,
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
        custom: CustomNodeType,

        addFloat: AddFloatType,
        distribution: DistributionNodeType,
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

    export const DATATYPE_FLAVOURS: { [key in keyof DATATYPES]: Flavour } = {
        string: "accent",
        length: "accent",
        shape: "confirm",
        float: "accent",
        integer: "accent",
        color: "accent",
        enum: "accent",
        angle: "accent",
        boolean: "accent",
        "tokens<length>": "accent",
        layer: "danger",
        "array<layer>": "danger",
        distribution: "info",
    };

    export const SOCKET_COMPAT = {
        layerOrShape: ["shape", "layer"],
    } as const satisfies Record<string, (keyof DATATYPES)[]>;

    export const SOCKETTYPE_FLAVOURS: { [key in keyof typeof SOCKET_COMPAT | keyof DATATYPES]: Flavour } = {
        string: "accent",
        length: "accent",
        shape: "confirm",
        float: "accent",
        integer: "accent",
        color: "accent",
        enum: "accent",
        angle: "accent",
        boolean: "accent",
        "tokens<length>": "accent",
        "array<layer>": "danger",
        layer: "confirm",
        distribution: "info",
        // compound
        layerOrShape: "confirm",
    };

    export const NODECAT_FLAVOURS = {
        Result: "emphasis",
        Outputs: "emphasis",
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
    export type Compat<C extends keyof typeof Registries.SOCKET_COMPAT> = Use<(typeof Registries.SOCKET_COMPAT)[C][number]>;

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

    /** State snapshot passed to lifecycle hooks */
    export type HookState = {
        nodes: { [graphId: string]: { [nodeId: string]: NodeDefinitions.NodeFor<NodeDefinitions.Any> } };
        links: { [graphId: string]: { [linkId: string]: ArcaneGraph.Link } };
        interfaces: { [graphId: string]: InterfaceMember[] };
        users: { [graphId: string]: { node: string; scope: string }[] };
    };

    export interface Type<T extends Key, D extends NodeDefinitions.Generic = NodeDefinitions.Generic> {
        type: T;
        displayName: string;
        defaultLabel: string;
        iconNode: IconDefinition;
        iconCard: IconDefinition;
        category: Category;
        create: (input: Partial<NodeDefinitions.PayloadTypeOf<D>>, id?: string) => NodeDefinitions.BuiltNodeOf<T, D>;
        Controls: (props: { node: NodeDefinitions.NodeFor<D>; methods: ReturnType<typeof Project.useNode>[1] }) => ReactNode;
        evaluate: (node: NodeDefinitions.NodeFor<D>, socket: keyof D["outputs"], context: Resolver.Context) => DataTypes.AnyEval | null;
        dependsOn: (node: NodeDefinitions.NodeFor<D>, outSocket: keyof D["outputs"], deps: AllDeps) => (keyof D["inputs"])[];
        contributesTo: (node: NodeDefinitions.NodeFor<D>, inSocket: keyof D["inputs"], deps: AllDeps) => (keyof D["outputs"])[];
        onCreate?: (node: NodeDefinitions.BuiltNodeOf<T, D>, state: HookState, graphId: string) => HookState;
        onDelete?: (node: NodeDefinitions.BuiltNodeOf<T, D>, state: HookState, graphId: string) => HookState;
        onConnect?: (node: NodeDefinitions.BuiltNodeOf<T, D>, linkId: string, direction: "in" | "out", state: HookState, graphId: string) => HookState;
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
    export const FLAVOURS = Registries.SOCKETTYPE_FLAVOURS;

    export const COMPAT = {
        ...(Object.keys(Registries.DATATYPE_FLAVOURS) as DataTypes.Kind[]).reduce<{ [key in DataTypes.Kind]: DataTypes.Kind[] }>(
            (acc, each) => {
                acc[each] = [each];
                return acc;
            },
            {} as { [key in DataTypes.Kind]: DataTypes.Kind[] },
        ),
        ...Registries.SOCKET_COMPAT,
    };

    export type Kind = (DataTypes.Kind | keyof typeof Registries.SOCKET_COMPAT) & {};
    export type DataTypeOf<K extends Kind> = K extends keyof typeof Registries.SOCKET_COMPAT
        ? DataTypes.Use<(typeof Registries.SOCKET_COMPAT)[K][number]>
        : K extends DataTypes.Kind
          ? DataTypes.Use<K>
          : never;

    export type ForDataType<K extends DataTypes.Any> = {
        [S in Kind]: DataTypes.KeyOf<K> extends (S extends keyof typeof Registries.SOCKET_COMPAT ? (typeof Registries.SOCKET_COMPAT)[S][number] : S) ? S : never;
    }[Kind];
}
