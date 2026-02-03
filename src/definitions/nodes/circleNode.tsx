import { nanoid } from "nanoid";
import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { EvaluationPayload } from "../evaluation";
import { SlotOf } from "../slots";
import { AbstractNodeType, BaseDefinition } from "./abstractNode";
import { Length } from "../dtatypes";

type CircleDefinition = {
    inputs: {
        radius: Length;
    };
    outputs: {
        output: EvaluationPayload<"svg">;
    };
    payload: {
        label: string;
        radius: Length;
    };
};

export const CircleNodeType = new (class extends AbstractNodeType<CircleDefinition> {
    create(input: Partial<CircleDefinition["payload"]>, id: string = nanoid()): ArcaneGraph.NodeOf<CircleDefinition["payload"]> {
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
                radius: {
                    value: 100,
                    unit: "px",
                },
            },
            type: "circle",
        };
    }
    getSlots(node: ArcaneGraph.NodeOf<BaseDefinition["payload"]>): SlotOf<CircleDefinition["payload"]>[] {
        return [
            {
                type: "shape",
                socketOut: "output",
                label: "Output",
            },
            {
                type: "length",
                socketIn: "radius",
                widget: "length",
                label: "Radius",
                property: "radius",
            },
        ];
    }
    dependsOn<K extends keyof CircleDefinition["outputs"]>(node: ArcaneGraph.NodeOf<BaseDefinition["payload"]>, outSocket: K): (keyof CircleDefinition["inputs"])[] {
        return [];
    }
})();
