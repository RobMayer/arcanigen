import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { EvaluationPayload } from "../evaluation";
import { SlotOf } from "../slots";
import { AbstractNodetype } from "./abstractNode";

type CirclePayload = {
    label?: string;
    w: number;
    h: number;
    x: number;
    y: number;
    color: string;
};

type CircleOutput = {
    output: EvaluationPayload<"svg">;
};

export const CircleNodeType = new (class extends AbstractNodetype<CirclePayload, CircleOutput> {
    create(input: Partial<CirclePayload>, id?: string): ArcaneGraph.NodeOf<CirclePayload> {
        throw new Error("Method not implemented.");
    }
    getSlots(node: ArcaneGraph.NodeOf<CirclePayload>): SlotOf<CirclePayload>[] {
        throw new Error("Method not implemented.");
    }
    dependsOn<K extends "output">(node: ArcaneGraph.NodeOf<CirclePayload>, outSocket: K): ArcaneGraph.SocketId[] {
        throw new Error("Method not implemented.");
    }
})();
