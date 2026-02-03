import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { DataType, DataTypes } from "../datatypes";

export type BaseDefinition = {
    inputs: Record<string, DataTypes.Any>;
    outputs: Record<string, DataTypes.Any>;
    payload: {
        label: DataType<"string">;
    };
};

export type AnyDefinition = {
    inputs: Record<string, DataTypes.Any>;
    outputs: Record<string, DataTypes.Any>;
    payload: Record<string, DataTypes.Any>;
};

const DEF = Symbol.for("definition");

export interface NodeType<D extends BaseDefinition = BaseDefinition> {
    create(input: Partial<DataTypes.PayloadFor<D>>, id?: string): ArcaneGraph.NodeOf<DataTypes.PayloadFor<D>>;
    getSlots(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<D>>): DataTypes.SlotFor<D>[];
    evaluate<K extends keyof DataTypes.EvaluationOf<D>>(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<D>>, socket: K, context: unknown): DataTypes.EvaluationOf<D>[K] | null;
    dependsOn<K extends keyof D["outputs"]>(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<D>>, outSocket: K): (keyof D["inputs"])[];
}

export abstract class AbstractNodeType<D extends BaseDefinition> implements NodeType<D> {
    declare readonly [DEF]: D;

    abstract create(input: Partial<DataTypes.PayloadFor<D>>, id?: string): ArcaneGraph.NodeOf<DataTypes.PayloadFor<D>>;
    abstract getSlots(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<D>>): DataTypes.SlotFor<D>[];
    evaluate<K extends keyof DataTypes.EvaluationOf<D>>(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<D>>, socket: K, context: unknown): DataTypes.EvaluationOf<D>[K] | null {
        return null;
    }
    // will be used in cyclical validity checks: which in sockets impacts a given out socket.
    abstract dependsOn<K extends keyof D["outputs"]>(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<D>>, outSocket: K): (keyof D["inputs"])[];
}

export type DefinitionOf<C> = C extends { [DEF]: infer P } ? P : never;
