import { IconDefinition } from "../../components/Icon";
import { NodeCategory } from "../../types";
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

export type BuiltNodeOf<D extends AnyDefinition> = ArcaneGraph.NodeOf<DataTypes.PayloadFor<D>> & {
    in: { [K in keyof D["inputs"]]: string | null };
    out: { [K in keyof D["outputs"]]: string[] };
};

const DEF = Symbol.for("definition");

export interface NodeType<D extends AnyDefinition = AnyDefinition> {
    defaultLabel: string;
    icon: IconDefinition;
    category: NodeCategory;
    create(input: Partial<DataTypes.PayloadFor<D>>, id?: string): BuiltNodeOf<D>;
    getSlots(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<D>>): DataTypes.SlotFor<D>[];
    evaluate<K extends keyof DataTypes.EvaluationOf<D>>(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<D>>, socket: K, context: unknown): DataTypes.EvaluationOf<D>[K] | null;
    dependsOn<K extends keyof D["outputs"]>(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<D>>, outSocket: K): (keyof D["inputs"])[];
}

export abstract class AbstractNodeType<D extends BaseDefinition> implements NodeType<D> {
    declare readonly [DEF]: D;

    abstract get defaultLabel(): string;
    abstract get icon(): IconDefinition;
    abstract get category(): NodeCategory;
    abstract create(input: Partial<DataTypes.PayloadFor<D>>, id?: string): BuiltNodeOf<D>;
    abstract getSlots(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<D>>): DataTypes.SlotFor<D>[];
    evaluate<K extends keyof DataTypes.EvaluationOf<D>>(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<D>>, socket: K, context: unknown): DataTypes.EvaluationOf<D>[K] | null {
        return null;
    }
    // will be used in cyclical validity checks: which in sockets impacts a given out socket.
    abstract dependsOn<K extends keyof D["outputs"]>(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<D>>, outSocket: K): (keyof D["inputs"])[];
}

export type DefinitionOf<C> = C extends { [DEF]: infer P } ? P : never;
