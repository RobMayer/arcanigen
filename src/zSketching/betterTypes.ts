/** JUST SKETCHING!!! */

import { Length } from "../definitions/datatypes/length";
import { SVGObject } from "../types";
import { EmptyOr, NumericString } from "../util/misc";
import { ArcaneGraph } from "../util/structs/arcaneGraph";

/* Put registries here so that any namespace can acces them, but don't export them */

const NODETYPE_REGISTRY = {} as const;

type DATATYPE_REGISTRY = {
    length: [EmptyOr<Length.Type>, { widget: "input"; min?: Length.Type; max?: Length.Type; nullable?: boolean }];
    shape: [SVGObject];
    float: [EmptyOr<NumericString>, { widget: "input"; min?: number; max?: number; step?: number; precision?: number } | { widget: "slider"; min: number; max: number; step?: number }];
    integer: [EmptyOr<NumericString>, { widget: "input"; min?: number; max?: number; step?: number } | { widget: "slider"; min: number; max: number; step?: number }];
    string: [string, { widget: "input"; pattern?: string }];
    color: [string, { widget: "hex"; nullable?: boolean; alpha?: boolean }];
    enum: [number, { options: string[] } & ({ widget: "dropdown" } | { widget: "radiobox" | "radiobutton"; orientation?: "horizontal" | "vertical" })];
    "tokens<length>": [string, { widget: "input"; sep?: string; negative?: boolean; nullable?: boolean }];
    angle: [EmptyOr<Angle.Type>, { widget: "input"; min?: number; max?: number; unbound?: boolean; step?: number; nullable?: boolean }];
};

type EXTRA_WIDGET_REGISTRY = {
    hr: { type: "ui"; widget: "hr" };
    heading: { type: "ui"; widget: "heading"; label: string };
    accordion: {
        type: "ui";
        widget: "accordion";
        label: string;
        start?: "open" | "closed";
        children: Exclude<Slots.Any, { type: "ui"; widget: "accordion" }>[]; /* todo: this should be an array of SlotFor<D> */
    };
};

const CROSS_SOCKET_COMPAT = {
    number: ["float", "integer", "angle"],
} as const satisfies { [key: string]: DataTypes.Keys[] };

// do not export this one
namespace Registries {
    export type DT = {
        [K in keyof DATATYPE_REGISTRY]: DTEntry<K & string, DATATYPE_REGISTRY[K][0], DATATYPE_REGISTRY[K][1] extends { widget: string } ? DATATYPE_REGISTRY[K][1] : { widget: "none" }>;
    };

    export type DTEntry<K extends string, T, W extends { widget: string } = { widget: "none" }> = {
        key: K;
        type: T;
        widgets: W extends { widget: "none" } ? { widget: "none" } : { widget: "none" } | W;
    };
}

namespace DataTypes {
    export type Any = Registries.DT[Keys];
    export type Keys = keyof Registries.DT;

    // get a specific datatype, by key
    export type Use<K extends Keys> = Registries.DT[K];

    // this should let us chain like DataTypes.WidgetsOf<DataTypes.Use<"float">>;
    // reverse lookup
    export type KeyOf<DT extends Any> = DT extends Registries.DTEntry<infer K, infer _T, infer _W> ? K : never;
    // the actuall datatype: "enum" -> number, "length" -> EmptyOr<Length.Type>
    export type TypeOf<DT extends Any> = DT extends Registries.DTEntry<infer _K, infer T, infer _W> ? T : never;
    // possible widgets of this type
    export type WidgetOf<DT extends Any> = DT extends Registries.DTEntry<infer _K, infer _T, infer W> ? W : never;

    export type ArtifactOf<DT extends Any> = DT extends Registries.DTEntry<infer K, infer T, infer _W> ? { kind: K; data: T } : never;

    export type SlotFor<DT extends Any> = {
        type: KeyOf<DT>;
        label: string;
    } & WidgetOf<DT> &
        (
            | { socketIn: string; socketType?: Sockets.ForDataType<DT>; socketOut?: never }
            | { socketOut: string; socketIn?: never; socketType?: never }
            | { socketIn?: never; socketOut?: never; socketType?: never }
        ) &
        ({ property: string } | { property?: never });
}

namespace Artifacts {
    export type ForDataType<DT extends DataTypes.Any> = unknown;
    export type ForNodeType<NT extends NodeTypes.Any> = unknown;
}

namespace Widgets {
    export type ForDataType<DT extends DataTypes.Any> = unknown;
    export type ForNodeType<NT extends NodeTypes.Any> = unknown;
}

namespace Sockets {
    export type ForDataType<DT extends DataTypes.Any> = unknown;
}

namespace Slots {
    // export type Any = {[K in keyof DATATYPE_REGISTRY]: }
}

namespace NodeTypes {
    const DEF_KEY = Symbol.for("definition");

    export interface Any<D extends NodeDefinitions.Any = NodeDefinitions.Any> {
        readonly [DEF_KEY]: D;
        type: Keys; // would prefer to have a specific type for this, but I'm concrned about circular references.
        displayName: string;
        defaultLabel: string;
        iconNode: unknown;
        iconCard: unknown;
        category: unknown;
    }

    export abstract class Abstract<D extends NodeDefinitions.Base> implements Any<D> {
        declare readonly [DEF_KEY]: D;
        abstract type: Keys; // would prefer to have a specific type for this, but I'm concrned about circular references.
        abstract displayName: string;
        abstract defaultLabel: string;
        abstract iconNode: unknown;
        abstract iconCard: unknown;
        abstract category: unknown;

        abstract create(input: Partial<NodeDefinitions.PayloadValue<D>>, id?: string): NodeDefinitions.BuiltNodeOf<D>;
        abstract dependsOn(node: ArcaneGraph.NodeOf<NodeDefinitions.PayloadOf<D>>, outSocket: keyof NodeDefinitions.OutputsOf<D>): (keyof NodeDefinitions.InputsOf<D>)[];
    }
    export type Keys = keyof typeof NODETYPE_REGISTRY;
    export type DefinitionOf<NT extends Any> = NT[typeof DEF_KEY];
}

export namespace NodeDefinitions {
    export type Any = {
        inputs: Record<string, DataTypes.Any>;
        outputs: Record<string, DataTypes.Any>;
        payload: Record<string, DataTypes.Any>;
    };
    export type Base = {
        inputs: Record<string, DataTypes.Any>;
        outputs: Record<string, DataTypes.Any>;
        payload: {
            label: DataTypes.Use<"string">;
        };
    };

    export type PayloadOf<D extends Any> = D["payload"];
    export type OutputsOf<D extends Any> = D["outputs"];
    export type InputsOf<D extends Any> = D["inputs"];
    export type PayloadValue<D extends Any> = { [K in keyof D["payload"]]: DataTypes.TypeOf<D["payload"][K]> };

    export type BuiltNodeOf<D extends Any> = ArcaneGraph.NodeOf<PayloadValue<D>> & {
        in: { [K in keyof D["inputs"]]: string | null };
        out: { [K in keyof D["outputs"]]: string[] };
    };

    export type SlotsFor = unknown;
}
