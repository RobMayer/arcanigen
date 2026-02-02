import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { EvaluationPayload } from "../evaluation";
import { SlotOf } from "../slots";

type BasePayload = {
    label?: string;
};

export abstract class AbstractNodetype<P extends BasePayload, O extends { [key: string]: EvaluationPayload<any> }> {
    declare readonly _PAYLOAD: P;
    declare readonly _OUTPUT: O;

    abstract create(input: Partial<P>): P;
    // todo: figure this out...
    abstract getSlots(node: ArcaneGraph.NodeOf<P>): SlotOf<P>[];
    evaluate<K extends keyof O>(node: ArcaneGraph.NodeOf<P>, socket: K, context: unknown): O[K] | null {
        return null;
    }
}
