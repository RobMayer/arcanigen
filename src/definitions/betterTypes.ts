import { ReactNode } from "react";
import { Color, NodeCategory, SVGObject } from "../types";
import { EmptyOr, NumericString } from "../util/misc";
import { ArcaneGraph } from "../util/structs/arcaneGraph";
import { Angle } from "./datatypes/angle";
import { Length } from "./datatypes/length";
import { IconDefinition } from "../components/Icon";
import { Resolver } from "../util/resolver";
import { Flavour } from "../components/types";
import { ResultDefinition, ResultNodeType } from "./nodes/resultNode";
import { AngleDefinition, AnglePrimitiveType } from "./nodes/primitives/angleNode";
import { FloatDefinition, FloatPrimitiveType } from "./nodes/primitives/floatNode";
import { IntegerDefinition, IntegerPrimitiveType } from "./nodes/primitives/integerNode";
import { CircleDefinition, CircleNodeType } from "./nodes/shapes/circleNode";
import { Project } from "../state/project";
import { DebugDefinition, DebugType } from "./nodes/debug/debugNode";
import { FloatInputDefinition, FloatInputType } from "./nodes/interface/floatInputNode";
import { FloatOutputDefinition, FloatOutputType } from "./nodes/interface/floatOutputNode";
import { CustomDefinition, CustomNodeType } from "./nodes/interface/customNode";

/* ============================================================================
   INTERNAL - Shared across namespaces but not exported
   ============================================================================ */

namespace Registries {
    // will eventually replace NodeRegistry
    export type NODEDEFINITIONS = {
        result: ResultDefinition;
        circle: CircleDefinition;
        angle: AngleDefinition;
        float: FloatDefinition;
        integer: IntegerDefinition;

        //debug
        debug: DebugDefinition;

        // subgraph interfaces
        floatInput: FloatInputDefinition;
        floatOutput: FloatOutputDefinition;
        custom: CustomDefinition;
    };

    export const NODETYPES: { [K in keyof NODEDEFINITIONS]: NodeTypes.Type<K, NODEDEFINITIONS[K]> } = {
        result: ResultNodeType,
        circle: CircleNodeType,
        float: FloatPrimitiveType,
        integer: IntegerPrimitiveType,
        angle: AnglePrimitiveType,
        debug: DebugType,

        floatInput: FloatInputType,
        floatOutput: FloatOutputType,
        custom: CustomNodeType,
    } as const;

    export type DATATYPES = {
        length: EmptyOr<Length.Type>;
        shape: SVGObject;
        float: EmptyOr<NumericString>;
        integer: EmptyOr<NumericString>;
        string: string;
        color: EmptyOr<Color>;
        enum: number;
        "tokens<length>": string;
        angle: EmptyOr<Angle.Type>;
        boolean: boolean;
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
    };

    export const SOCKET_COMPAT = {
        number: ["integer", "float", "angle"],
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
        // compound
        number: "accent",
    };
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
        payload: Record<string, DataTypes.Any>;
    };

    // Base definition requiring a label in payload
    export type Base = {
        inputs: Record<string, DataTypes.Any>;
        outputs: Record<string, DataTypes.Any>;
        payload: {
            label: DataTypes.Use<"string">;
        };
    };

    export type PayloadTypeOf<D extends Generic> = { [K in keyof D["payload"]]: DataTypes.TypeOf<D["payload"][K]> };

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

    /** State snapshot passed to lifecycle hooks */
    export type HookState = {
        nodes: { [graphId: string]: { [nodeId: string]: NodeDefinitions.NodeFor<NodeDefinitions.Any> } };
        links: { [graphId: string]: { [linkId: string]: ArcaneGraph.Link } };
        inputs: { [graphId: string]: string[] };
        outputs: { [graphId: string]: string[] };
        users: { [graphId: string]: { node: string; scope: string }[] };
    };

    export interface Type<T extends Key, D extends NodeDefinitions.Generic = NodeDefinitions.Generic> {
        type: T;
        displayName: string;
        defaultLabel: string;
        iconNode: IconDefinition;
        iconCard: IconDefinition;
        category: NodeCategory;
        create: (input: Partial<NodeDefinitions.PayloadTypeOf<D>>, id?: string) => NodeDefinitions.BuiltNodeOf<T, D>;
        Controls: (props: { node: NodeDefinitions.NodeFor<D>; methods: ReturnType<typeof Project.useNode>[1] }) => ReactNode;
        evaluate: (node: NodeDefinitions.NodeFor<D>, socket: keyof D["outputs"], context: Resolver.Context) => DataTypes.AnyEval | null;
        dependsOn: (node: NodeDefinitions.NodeFor<D>, outSocket: keyof D["outputs"]) => (keyof D["inputs"])[];
        onCreate?: (node: NodeDefinitions.BuiltNodeOf<T, D>, state: HookState, graphId: string) => HookState;
        onDelete?: (node: NodeDefinitions.BuiltNodeOf<T, D>, state: HookState, graphId: string) => HookState;
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
