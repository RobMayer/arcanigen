import { nanoid } from "nanoid";
import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { EvaluationPayload } from "../evaluation";
import { SlotOf } from "../slots";
import { AbstractNodetype, BasePayload } from "./abstractNode";
import { MainGraph } from "../../state/maingraph";

type CirclePayload = {
    label: string;
};

type CircleOutput = {
    output: EvaluationPayload<"svg">;
};

export const CircleNodeType = new (class extends AbstractNodetype<CirclePayload, CircleOutput> {
    create(input: Partial<CirclePayload>, id: string = nanoid()): ArcaneGraph.NodeOf<CirclePayload> {
        return {
            id,
            in: {},
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
        return [];
    }
    dependsOn<K extends "output">(node: ArcaneGraph.NodeOf<BasePayload>, outSocket: K): ArcaneGraph.SocketId[] {
        return [];
    }
})();
