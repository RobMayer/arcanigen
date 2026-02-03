import { nanoid } from "nanoid";
import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { EvaluationPayload } from "../evaluation";
import { SlotOf } from "../slots";
import { AbstractNodetype, BasePayload } from "./abstractNode";

type CirclePayload = {
    label: string;
    // radius: Length;
};

type CircleOutput = {
    output: EvaluationPayload<"svg">;
};

export const CircleNodeType = new (class extends AbstractNodetype<CirclePayload, CircleOutput> {
    create(input: Partial<CirclePayload>, id: string = nanoid()): ArcaneGraph.NodeOf<CirclePayload> {
        return {
            id,
            in: {
                radius: null,
            },
            out: {
                output: [],
            },
            payload: {
                label: "",
            },
            type: "circle",
        };
    }
    getSlots(node: ArcaneGraph.NodeOf<BasePayload>): SlotOf<CirclePayload>[] {
        return [
            {
                type: "shape",
                socketOut: "output",
                label: "Output",
            },
        ];
    }
    dependsOn<K extends "output">(node: ArcaneGraph.NodeOf<BasePayload>, outSocket: K): ArcaneGraph.SocketId[] {
        return [];
    }
})();
