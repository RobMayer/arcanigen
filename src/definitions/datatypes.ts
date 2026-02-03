type Length = {
    value: number;
    unit: "px" | "pt" | "in" | "cm" | "mm";
};

type TheSVG = {
    tag: "g" | "path" | "svg";
    children: TheSVG[];
    attributes: { [key: string]: string };
};

type TypeRegistry = {
    length: [Length, { widget: "input"; negative?: boolean }];
    shape: [TheSVG];
    float: [number, { widget: "input"; min?: number; max?: number; step?: number } | { widget: "slider"; min: number; max: number; step?: number }];
    integer: [number, { widget: "input"; min?: number; max?: number; step?: number } | { widget: "slider"; min: number; max: number; step?: number }];
    string: [string, { widget: "input"; pattern?: string }];
    color: [string, { widget: "hex"; nullable?: boolean; alpha?: boolean }];
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
    ({ socketIn: KeysOfType<D["inputs"], TheTypes[K]>; socketOut?: never } | { socketOut: KeysOfType<D["outputs"], TheTypes[K]>; socketIn?: never } | { socketIn?: never; socketOut?: never }) &
    ({ property: KeysOfType<D["payload"], TheTypes[K]> } | { property?: never });

export namespace DataTypes {
    export type Any = TheTypes[keyof TheTypes];
    export type AnySlot = { [K in keyof TheTypes]: SlotOf<K> }[keyof TheTypes] | UniversalWidgets<any>;

    export type SlotOf<K extends keyof TheTypes> = {
        type: K;
        label: string;
    } & TheTypes[K]["widgets"] &
        ({ socketIn: string; socketOut?: never } | { socketOut: string; socketIn?: never } | { socketIn?: never; socketOut?: never }) &
        ({ property: string } | { property?: never });

    export type KeyOf<O> = O extends TypeDef<infer K, infer _T, infer _W> ? K : never;
    export type TypeOf<O> = O extends TypeDef<infer _K, infer T, infer _W> ? T : never;
    export type WidgetOf<O> = O extends TypeDef<infer _K, infer _T, infer W> ? W : never;

    export type EvaluationOf<O> = O extends TypeDef<infer K, infer T, infer _W> ? { kind: K; data: T } : never;

    export type PayloadFor<D extends GenericDefinition> = { [K in keyof D["payload"]]: TypeOf<D["payload"][K]> };

    type UniversalWidgets<D extends GenericDefinition> = { type: "ui"; widget: "hr" } | { type: "ui"; widget: "accordion"; children: SlotFor<D>[] /* todo: this should be an array of SlotFor<D> */ };

    // SlotFor is the union of all typed slots plus universals
    export type SlotFor<D extends GenericDefinition> = UniversalWidgets<D> | { [K in Any["key"]]: TypedSlot<D, K> }[Any["key"]];

    export type SlotWithProperty<K extends keyof TheTypes> = DataTypes.SlotOf<K> & { property: string };
    export type SlotWidgetable = Exclude<AnySlot, { type: "ui" } | { widget: "none" }> & { property: string };
}

export type DataType<K extends keyof TheTypes> = TheTypes[K];
