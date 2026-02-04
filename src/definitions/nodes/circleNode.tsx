import { nanoid } from "nanoid";
import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { AbstractNodeType, BuiltNodeOf } from "./abstractNode";
import { DataType, DataTypes } from "../datatypes";
import { ICONS } from "../../components/Icon";
import { NodeCategory } from "../../types";

type CircleDefinition = {
    inputs: {
        radius: DataType<"length">;

        // stroke
        strokeWidth: DataType<"length">;
        strokeColor: DataType<"color">;
        strokeDashOffset: DataType<"length">;
        // fill
        fillColor: DataType<"color">;
    };
    outputs: {
        output: DataType<"shape">;
    };
    payload: {
        label: DataType<"string">;
        radius: DataType<"length">;

        // stroke
        strokeWidth: DataType<"length">;
        strokeColor: DataType<"color">;
        strokeDashOffset: DataType<"length">;
        // fill
        fillColor: DataType<"color">;
    };
};

export const CircleNodeType = new (class extends AbstractNodeType<CircleDefinition> {
    defaultLabel = "Circle";
    icon = ICONS.Bolt;
    category: NodeCategory = "shape";

    create(input: Partial<DataTypes.PayloadFor<CircleDefinition>>, id: string = nanoid()): BuiltNodeOf<CircleDefinition> {
        return {
            id,
            in: {
                radius: null,
                strokeWidth: null,
                strokeColor: null,
                strokeDashOffset: null,
                fillColor: null,
            },
            out: {
                output: [],
            },
            payload: {
                label: "",
                radius: "100px",
                // stroke
                strokeWidth: "1px",
                strokeColor: "#000000ff",
                strokeDashOffset: "0px",
                // fill
                fillColor: "none",
            },
            type: "circle",
        };
    }
    getSlots(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<CircleDefinition>>): DataTypes.SlotFor<CircleDefinition>[] {
        return [
            {
                label: "Output",
                type: "shape",
                socketOut: "output",
                widget: "none",
            },
            {
                label: "Radius",
                type: "length",
                socketIn: "radius",
                widget: "input",
                property: "radius",
            },
            {
                type: "ui",
                widget: "hr",
            },
            // stroke
            {
                label: "Stroke Color",
                type: "color",
                widget: "hex",
                socketIn: "strokeColor",
                property: "strokeColor",
                alpha: true,
                nullable: true,
            },
            {
                label: "Stroke Width",
                type: "length",
                widget: "input",
                socketIn: "strokeWidth",
                property: "strokeWidth",
            },
            {
                label: "Stroke Dash Offset",
                type: "length",
                widget: "input",
                socketIn: "strokeDashOffset",
                property: "strokeDashOffset",
            },
            // fill
            {
                label: "Fill Color",
                type: "color",
                widget: "hex",
                socketIn: "fillColor",
                property: "fillColor",
                alpha: true,
                nullable: true,
            },
        ];
    }
    dependsOn<K extends "output">(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<CircleDefinition>>, outSocket: K): "radius"[] {
        return [];
    }
})();
