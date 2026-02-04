import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { AbstractNodeType } from "./abstractNode";
import { nanoid } from "nanoid";
import { DataType, DataTypes } from "../datatypes";

type ResultDefinition = {
    outputs: never;
    inputs: {
        input: DataType<"shape">;
        w: DataType<"length">;
        h: DataType<"length">;
        x: DataType<"length">;
        y: DataType<"length">;
        color: DataType<"color">;
    };
    payload: {
        label: DataType<"string">;
        w: DataType<"length">;
        h: DataType<"length">;
        x: DataType<"length">;
        y: DataType<"length">;
        color: DataType<"color">;
    };
};

export const ResultNodeType = new (class extends AbstractNodeType<ResultDefinition> {
    create(input: Partial<DataTypes.PayloadFor<ResultDefinition>>, id: string = nanoid()): ArcaneGraph.NodeOf<DataTypes.PayloadFor<ResultDefinition>> {
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
                w: `800px`,
                h: `800px`,
                x: `0px`,
                y: `0px`,
                color: "#fff",
                label: "",
                ...input,
            },
            type: "result",
            id,
        };
    }
    getSlots(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<ResultDefinition>>): DataTypes.SlotFor<ResultDefinition>[] {
        return [
            {
                type: "shape",
                label: "Input",
                socketIn: "input",
                widget: "none",
            },
            {
                type: "ui",
                widget: "hr",
            },
            {
                label: "Canvas Width",
                type: "length",
                socketIn: "w",
                widget: "input",
                property: "w",
            },
            {
                label: "Canvas Height",
                type: "length",
                socketIn: "h",
                widget: "input",
                property: "h",
            },
            {
                label: "Origin X",
                type: "length",
                socketIn: "x",
                widget: "input",
                property: "x",
            },
            {
                label: "Origin Y",
                type: "length",
                socketIn: "y",
                widget: "input",
                property: "y",
            },
            {
                label: "Canvas Color",
                type: "color",
                socketIn: "color",
                widget: "hex",
                property: "color",
                nullable: true,
                alpha: true,
            },
        ];
    }
    dependsOn<K extends string | number | symbol>(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<ResultDefinition>>, outSocket: K): ("w" | "h" | "x" | "y" | "color")[] {
        return [];
    }
})();
