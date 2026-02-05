import { NodeTypeRegistry } from "..";
import { IconDefinition } from "../../components/Icon";
import { NodeCategory } from "../../types";
import { Resolver } from "../../util/resolver";
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
    type: string;
    displayName: string;
    defaultLabel: string;
    iconNode: IconDefinition;
    iconCard: IconDefinition;
    category: NodeCategory;
    create(input: Partial<DataTypes.PayloadFor<D>>, id?: string): BuiltNodeOf<D>;
    getSlots(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<D>>): DataTypes.SlotFor<D>[];
    evaluate(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<D>>, socket: keyof D["outputs"], context: Resolver.Context): DataTypes.AnyEvaluation | null;
    dependsOn(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<D>>, outSocket: keyof D["outputs"]): (keyof D["inputs"])[];
}

export abstract class AbstractNodeType<D extends BaseDefinition> implements NodeType<D> {
    declare readonly [DEF]: D;

    type: string;
    constructor(type: string) {
        this.type = type;
    }

    abstract get displayName(): string;
    abstract get defaultLabel(): string;
    abstract get iconNode(): IconDefinition;
    abstract get iconCard(): IconDefinition;
    abstract get category(): NodeCategory;
    abstract create(input: Partial<DataTypes.PayloadFor<D>>, id?: string): BuiltNodeOf<D>;
    abstract getSlots(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<D>>): DataTypes.SlotFor<D>[];
    // i haven't really thought this out yet...

    evaluate(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<D>>, socket: keyof D["outputs"], context: Resolver.Context): DataTypes.AnyEvaluation | null {
        return null;
    }
    // will be used in cyclical validity checks: which in sockets impacts a given out socket.
    abstract dependsOn(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<D>>, outSocket: keyof D["outputs"]): (keyof D["inputs"])[];
}

export type DefinitionOf<C> = C extends { [DEF]: infer P } ? P : never;
