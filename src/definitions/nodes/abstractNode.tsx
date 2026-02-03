import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { EvaluationPayload } from "../evaluation";
import { SlotOf } from "../slots";

export type BaseDefinition = {
    outputs: Record<string, EvaluationPayload<any>>;
    inputs: Record<string, any>;
    payload: {
        // [key: string]: any;
        label: string;
    };
};

const DEF = Symbol.for("definition");

export interface NodeType<D extends BaseDefinition = BaseDefinition> {
    create(input: Partial<D["payload"]>, id?: string): ArcaneGraph.NodeOf<D["payload"]>;
    getSlots(node: ArcaneGraph.NodeOf<BaseDefinition["payload"]>): SlotOf<D["payload"]>[];
    evaluate<K extends keyof D["outputs"]>(node: ArcaneGraph.NodeOf<BaseDefinition["payload"]>, socket: K, context: unknown): D["outputs"][K] | null;
    dependsOn<K extends keyof D["outputs"]>(node: ArcaneGraph.NodeOf<BaseDefinition["payload"]>, outSocket: K): (keyof D["inputs"])[];
}

export abstract class AbstractNodeType<D extends BaseDefinition> implements NodeType<D> {
    declare readonly [DEF]: D;

    abstract create(input: Partial<D["payload"]>, id?: string): ArcaneGraph.NodeOf<D["payload"]>;
    abstract getSlots(node: ArcaneGraph.NodeOf<BaseDefinition["payload"]>): SlotOf<D["payload"]>[];
    evaluate<K extends keyof D["outputs"]>(node: ArcaneGraph.NodeOf<BaseDefinition["payload"]>, socket: K, context: unknown): D["outputs"][K] | null {
        return null;
    }
    // will be used in cyclical validity checks: which in sockets impacts a given out socket.
    abstract dependsOn<K extends keyof D["outputs"]>(node: ArcaneGraph.NodeOf<BaseDefinition["payload"]>, outSocket: K): (keyof D["inputs"])[];
}

export type DefinitionOf<C> = C extends { [DEF]: infer P } ? P : never;
