import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { EvaluationPayload } from "../evaluation";
import { SlotOf } from "../slots";

export type BasePayload = {
    label: string;
};

export abstract class AbstractNodetype<P extends BasePayload, O extends { [key: string]: EvaluationPayload<any> }> {
    declare readonly _PAYLOAD: P;
    declare readonly _OUTPUT: O;

    abstract create(input: Partial<P>, id?: string): ArcaneGraph.NodeOf<P>;
    abstract getSlots(node: ArcaneGraph.NodeOf<BasePayload>): SlotOf<P>[];
    evaluate<K extends keyof O>(node: ArcaneGraph.NodeOf<BasePayload>, socket: K, context: unknown): O[K] | null {
        return null;
    }
    // will be used in cyclical validity checks: which in sockets impacts a given out socket.
    abstract dependsOn<K extends keyof O>(node: ArcaneGraph.NodeOf<BasePayload>, outSocket: K): ArcaneGraph.SocketId[];
}

export type PayloadOf<C> = C extends { _PAYLOAD: infer P } ? P : never;
export type OutputOf<C> = C extends { _OUTPUT: infer O } ? O : never;
