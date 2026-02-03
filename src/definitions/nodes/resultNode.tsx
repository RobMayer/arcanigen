import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { AbstractNodeType, BaseDefinition } from "./abstractNode";
import { SlotOf } from "../slots";
import { nanoid } from "nanoid";
import { Length } from "../dtatypes";

type ResultDefinition = {
    outputs: never;
    inputs: {
        w: Length;
        h: Length;
        x: Length;
        y: Length;
        color: string;
    };
    payload: {
        label: string;
        w: number;
        h: number;
        x: number;
        y: number;
        color: string;
    };
};

export const ResultNodeType = new (class extends AbstractNodeType<ResultDefinition> {
    dependsOn<K extends ResultDefinition["outputs"]>(node: ArcaneGraph.NodeOf<BaseDefinition["payload"]>, outSocket: K): (keyof ResultDefinition["inputs"])[] {
        return [];
    }
    create(input: Partial<ResultDefinition["payload"]>, id: ArcaneGraph.NodeId = nanoid()): ArcaneGraph.NodeOf<ResultDefinition["payload"]> {
        return {
            in: {
                w: null,
                h: null,
                x: null,
                y: null,
                color: null,
            },
            out: {},
            payload: {
                w: 800,
                h: 800,
                x: 0,
                y: 0,
                color: "#fff",
                label: "",
                ...input,
            },
            type: "result",
            id,
        };
    }
    getSlots(node: ArcaneGraph.NodeOf<BaseDefinition["payload"]>): SlotOf<ResultDefinition["payload"]>[] {
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
})();
