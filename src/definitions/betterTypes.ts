/** JUST SKETCHING!!! */

/* Put registries here but don't export them */

namespace DataTypes {
    export type Any = unknown;
    export type Keys = unknown;

    export type Use<K extends Keys> = unknown; // get a specific datatype

    export type WidgetsOf<DT extends unknown> = unknown;
    export type DataOf<DT extends unknown> = unknown;
    export type KeyOf<DT extends unknown> = unknown;

    // this should let us chain like DataTypes.WidgetsOf<DataTypes.Use<"float">>;
}

namespace Slots {}

namespace NodeTypes {
    const DEF_KEY = Symbol.for("definition");

    export interface Any<D extends NodeDefinitions.Any = NodeDefinitions.Any> {
        [DEF_KEY]: D; // will eventually be the Definition generic.
        type: string; // would prefer to have a specific type for this, but I'm concrned about circular references.
        displayName: string;
        defaultLabel: string;
        iconNode: unknown;
        iconCard: unknown;
        category: unknown;
    }

    export abstract class Abstract {}
    export type Keys = unknown;
    export type DefinitionOf = unknown;
}

export namespace NodeDefinitions {
    export type Base = unknown;
    export type Any = unknown;

    export type PayloadOf = unknown;
    export type OutputsOf = unknown;
    export type InputsOf = unknown;

    export type BuiltNodeOf = unknown;

    export type SlotsFor = unknown;
}
