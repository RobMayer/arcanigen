import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { EvaluationPayload } from "../evaluation";
import { SlotOf } from "../slots";

type BasePayload = {
    label?: string;
};

export abstract class AbstractNodetype<P extends BasePayload, O extends { [key: string]: EvaluationPayload<any> }> {
    declare readonly _PAYLOAD: P;
    declare readonly _OUTPUT: O;

    abstract create(input: Partial<P>, id?: string): ArcaneGraph.NodeOf<P>;
    abstract getSlots(node: ArcaneGraph.NodeOf<P>): SlotOf<P>[];
    evaluate<K extends keyof O>(node: ArcaneGraph.NodeOf<P>, socket: K, context: unknown): O[K] | null {
        return null;
    }
    // will be used in cyclical validity checks: which in sockets impacts a given out socket.
    abstract dependsOn<K extends keyof O>(node: ArcaneGraph.NodeOf<P>, outSocket: K): ArcaneGraph.SocketId[];
}
