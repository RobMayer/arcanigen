import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { AbstractNodetype } from "./abstractNode";
import { EvaluationPayload } from "../evaluation";
import { SlotOf } from "../slots";

type ResultPayload = {
    label?: string;
    w: number;
    h: number;
    x: number;
    y: number;
    color: string;
};

type ResultOutput = {
    output: EvaluationPayload<"svg">;
};

export const ResultNodeType = new (class extends AbstractNodetype<ResultPayload, ResultOutput> {
    create(input: Partial<ResultPayload>): ResultPayload {
        return {
            w: 800,
            h: 800,
            x: 0,
            y: 0,
            color: "#fff",
            ...input,
        };
    }

    getSlots(node: ArcaneGraph.NodeOf<ResultPayload>): SlotOf<ResultPayload>[] {
        return [
            {
                type: "shape",
                label: "Input",
                socketIn: "input",
            },
            {
                label: "Canvas Width",
                type: "float",
                socketIn: "w",
                min: 0,
                step: 1,
                widget: "numberinput",
                defaultValue: 800,
                property: "w",
            },
            {
                label: "Canvas Height",
                type: "float",
                socketIn: "h",
                min: 0,
                step: 1,
                widget: "numberinput",
                defaultValue: 800,
                property: "h",
            },
            {
                label: "Origin X",
                type: "float",
                socketIn: "x",
                widget: "numberinput",
                defaultValue: 0,
                property: "x",
            },
            {
                label: "Origin Y",
                type: "float",
                socketIn: "y",
                widget: "numberinput",
                defaultValue: 0,
                property: "y",
            },
            {
                label: "Canvas Color",
                type: "color",
                socketIn: "color",
                widget: "color",
                property: "color",
                nullable: true,
                alpha: true,
            },
        ];
    }

    evaluate<const K extends keyof ResultOutput>(node: ArcaneGraph.NodeOf<ResultPayload>, socket: K, context: unknown): ResultOutput[K] | null {
        if (socket === "output") {
            const x = 0;
            const y = 0;
            const w = 0;
            const h = 0;
            return {
                type: "svg",
                tag: "svg",
                children: [],
                attributes: {
                    viewBox: `${x} ${y} ${w} ${h}`,
                },
            };
        }
        // null fallback
        return super.evaluate(node, socket, context);
    }
})();
