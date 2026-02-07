import { ReactNode } from "react";
import { IconDefinition } from "../../components/Icon";
import { NodeCategory } from "../../types";
import { Resolver } from "../../util/resolver";
import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { DataType, DataTypes } from "../datatypes";
import { Project } from "../../state/project";

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

export type NodeType<D extends AnyDefinition = AnyDefinition> = {
    type: string;
    displayName: string;
    defaultLabel: string;
    iconNode: IconDefinition;
    iconCard: IconDefinition;
    category: NodeCategory;
    create(input: Partial<DataTypes.PayloadFor<D>>, id?: string): BuiltNodeOf<D>;
    Controls(props: { node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<D>>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode;
    evaluate(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<D>>, socket: keyof D["outputs"], context: Resolver.Context): DataTypes.AnyEvaluation | null;
    dependsOn(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<D>>, outSocket: keyof D["outputs"]): (keyof D["inputs"])[];
};

export type DefinitionOf<C extends NodeType<AnyDefinition>> = C extends NodeType<infer D> ? D : never;
