import { ReactNode } from "react";
import { Color, NodeCategory, SVGObject } from "../types";
import { EmptyOr, NumericString } from "../util/misc";
import { ArcaneGraph } from "../util/structs/arcaneGraph";
import { Angle } from "./datatypes/angle";
import { Length } from "./datatypes/length";
import { IconDefinition } from "../components/Icon";
import { Project } from "../state/project";
import { Resolver } from "../util/resolver";
import { Flavour } from "../components/types";

/* ============================================================================
   INTERNAL - Shared across namespaces but not exported
   ============================================================================ */

namespace Registries {
    // will eventually replace NodeRegistry
    export const NODETYPES = {} as const;

    const _CHECK = NODETYPES satisfies { [K in keyof typeof NODETYPES]: (typeof NODETYPES)[K] extends { type: K } ? (typeof NODETYPES)[K] : never };

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

namespace DataTypes {
    const KIND = Symbol.for("key");
    const TYPE = Symbol.for("type");

    type REG = { [K2 in Kinds]: { [KIND]: K2; [TYPE]: Registries.DATATYPES[K2] } };

    export type Kinds = keyof Registries.DATATYPES & {};
    export type Use<K extends Kinds> = REG[K];
    export type Any = Use<Kinds>;

    export type KeyOf<E extends Use<Kinds>> = E[typeof KIND];
    export type TypeOf<E extends Use<Kinds>> = E[typeof TYPE];

    export type EvalOf<E extends Use<Kinds>> = { [K in Kinds]: { kind: K; data: REG[K][typeof TYPE] } }[E[typeof KIND]];
    export type AnyEval = EvalOf<Any>;
    export type AnyType = TypeOf<Any>;
}

namespace NodeDefinitions {
    export type Any = {
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

    export type PayloadTypeOf<D extends Any> = { [K in keyof D["payload"]]: DataTypes.TypeOf<D["payload"][K]> };

    // Built node instance from a definition
    export type BuiltNodeOf<T extends NodeTypes.Keys, D extends Any> = ArcaneGraph.NodeOf<PayloadTypeOf<D>> & {
        type: T;
        in: { [K in keyof D["inputs"]]: string | null };
        out: { [K in keyof D["outputs"]]: string[] };
    };
}

namespace NodeTypes {
    export type Keys = keyof typeof Registries.NODETYPES;
    export interface Type<T extends Keys, D extends NodeDefinitions.Any = NodeDefinitions.Any> {
        type: T;
        displayName: string;
        defaultLabel: string;
        iconNode: IconDefinition;
        iconCard: IconDefinition;
        category: NodeCategory;
        create(input: Partial<NodeDefinitions.PayloadTypeOf<D>>, id?: string): NodeDefinitions.BuiltNodeOf<T, D>;
        Controls(props: { node: ArcaneGraph.NodeOf<NodeDefinitions.PayloadTypeOf<D>>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode;
        evaluate(node: ArcaneGraph.NodeOf<NodeDefinitions.PayloadTypeOf<D>>, socket: keyof D["outputs"], context: Resolver.Context): DataTypes.AnyEval | null;
        dependsOn(node: ArcaneGraph.NodeOf<NodeDefinitions.PayloadTypeOf<D>>, outSocket: keyof D["outputs"]): (keyof D["inputs"])[];
    }

    export type Any = Type<Keys, NodeDefinitions.Any>;
    export type DefinitionOf<T extends Any> = T extends Type<infer _t, infer D> ? D : never;
}

namespace SocketTypes {
    export const compatability = {
        ...(Object.keys(Registries.DATATYPE_FLAVOURS) as DataTypes.Kinds[]).reduce<{ [key in DataTypes.Kinds]: DataTypes.Kinds[] }>(
            (acc, each) => {
                acc[each] = [each];
                return acc;
            },
            {} as { [key in DataTypes.Kinds]: DataTypes.Kinds[] },
        ),
        ...Registries.SOCKET_COMPAT,
    };

    export type Any = (DataTypes.Kinds | keyof typeof Registries.SOCKET_COMPAT) & {};
    export type DataTypeOf<K extends Any> = K extends keyof typeof Registries.SOCKET_COMPAT
        ? DataTypes.Use<(typeof Registries.SOCKET_COMPAT)[K][number]>
        : K extends DataTypes.Kinds
          ? DataTypes.Use<K>
          : never;

    export type ForDataType<K extends DataTypes.Any> = {
        [S in Any]: DataTypes.KeyOf<K> extends (S extends keyof typeof Registries.SOCKET_COMPAT ? (typeof Registries.SOCKET_COMPAT)[S][number] : S) ? S : never;
    }[Any];
}
