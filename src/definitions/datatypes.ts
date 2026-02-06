import { SVGObject } from "../types";
import { EmptyOr, NumericString } from "../util/misc";
import { Angle } from "./datatypes/angle";
import { Length } from "./datatypes/length";

type TypeRegistry = {
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

type TypeDef<K extends string, T, W extends { widget: string } = { widget: "none" }> = {
    key: K;
    type: T;
    widgets: W extends { widget: "none" } ? { widget: "none" } : { widget: "none" } | W;
};

type TheTypes = {
    [K in keyof TypeRegistry]: TypeDef<K & string, TypeRegistry[K][0], TypeRegistry[K][1] extends { widget: string } ? TypeRegistry[K][1] : { widget: "none" }>;
};

type GenericDefinition = {
    inputs: Record<string, DataTypes.Any>;
    outputs: Record<string, DataTypes.Any>;
    payload: Record<string, DataTypes.Any>;
};

// what widgets are allowed and what additional properties do they need, per datatype key.

// Helper: get keys of T where value is assignable to V
type KeysOfType<T, V> = { [K in keyof T]: T[K] extends V ? K : never }[keyof T];

// A typed slot for a specific data type key
type TypedSlot<D extends GenericDefinition, K extends keyof TheTypes> = {
    type: K;
    label: string;
} & TheTypes[K]["widgets"] &
    (
        | { socketIn: KeysOfType<D["inputs"], TheTypes[K]>; socketType?: SocketTypes.SocketTypeFor<K>; socketOut?: never }
        | { socketOut: KeysOfType<D["outputs"], TheTypes[K]>; socketIn?: never; socketType?: never }
        | { socketIn?: never; socketOut?: never; socketType?: never }
    ) &
    ({ property: KeysOfType<D["payload"], TheTypes[K]> } | { property?: never });

export namespace DataTypes {
    export type Keys = keyof TheTypes;
    export type DataTypeBy<K extends keyof TheTypes> = TheTypes[K];

    export type Any = TheTypes[keyof TheTypes];
    export type AnySlot = { [K in keyof TheTypes]: SlotOf<K> }[keyof TheTypes] | UniversalWidgets<GenericDefinition>;

    export type SlotOf<K extends keyof TheTypes> = {
        type: K;
        label: string;
    } & TheTypes[K]["widgets"] &
        (
            | { socketIn: string; socketType?: SocketTypes.SocketTypeFor<K>; socketOut?: never }
            | { socketOut: string; socketIn?: never; socketType?: never }
            | { socketIn?: never; socketOut?: never; socketType?: never }
        ) &
        ({ property: string } | { property?: never });

    export type KeyOf<O> = O extends TypeDef<infer K, infer _T, infer _W> ? K : never;
    export type TypeOf<O> = O extends TypeDef<infer _K, infer T, infer _W> ? T : never;
    export type WidgetOf<O> = O extends TypeDef<infer _K, infer _T, infer W> ? W : never;

    export type EvaluationOf<O> = O extends TypeDef<infer K, infer T, infer _W> ? { kind: K; data: T } : never;

    export type EvaluationBy<K extends keyof TypeRegistry> = { kind: K; data: TypeRegistry[K][0] };

    export type AnyEvaluation = { [K in Keys]: EvaluationBy<K> }[Keys];

    export type PayloadFor<D extends GenericDefinition> = { [K in keyof D["payload"]]: TypeOf<D["payload"][K]> };
    export type OutputFor<D extends GenericDefinition> = { [K in keyof D["outputs"]]: TypeOf<D["outputs"][K]> };

    type UniversalWidgets<D extends GenericDefinition> =
        | { type: "ui"; widget: "hr" }
        | { type: "ui"; widget: "heading"; label: string }
        | {
              type: "ui";
              widget: "accordion";
              label: string;
              start?: "open" | "closed";
              children: Exclude<SlotFor<D>, { type: "ui"; widget: "accordion" }>[]; /* todo: this should be an array of SlotFor<D> */
          };

    // SlotFor is the union of all typed slots plus universals
    export type SlotFor<D extends GenericDefinition> = UniversalWidgets<D> | { [K in Any["key"]]: TypedSlot<D, K> }[Any["key"]];

    export type SlotWithProperty<K extends keyof TheTypes> = DataTypes.SlotOf<K> & { property: string };
    export type SlotWidgetable = Exclude<AnySlot, { type: "ui" } | { widget: "none" }> & { property: string };
}

export type DataType<K extends keyof TheTypes> = TheTypes[K];

export namespace SocketTypes {
    // from socket type to possible datatypes
    // Runtime source of truth
    export const MAPPINGS = {
        // Concrete types map to themselves (as single-element tuples for consistency)
        string: ["string"],
        length: ["length"],
        shape: ["shape"],
        float: ["float"],
        integer: ["integer"],
        color: ["color"],
        enum: ["enum"],
        angle: ["angle"],
        "tokens<length>": ["tokens<length>"],
        // Abstract types map to multiple concrete types
        number: ["float", "integer", "angle"],
    } as const satisfies Record<string, readonly DataTypes.Keys[]>;

    // Compile-time check: ensure all DataTypes.Keys are present in MAPPINGS
    // This will error if you add a new datatype but forget to add it here
    type _AssertAllDataTypesPresent = DataTypes.Keys extends keyof typeof MAPPINGS ? true : "Missing DataTypes.Keys in MAPPINGS";
    const _assertCheck: _AssertAllDataTypesPresent = true;

    // Derive types from runtime
    export type Types = keyof typeof MAPPINGS;

    type SocketTypeMappings = {
        [K in Types]: (typeof MAPPINGS)[K][number];
    };

    export type SocketTypeFor<T extends DataTypes.Keys> = {
        [S in Types]: T extends SocketTypeMappings[S] ? S : never;
    }[Types];
}
