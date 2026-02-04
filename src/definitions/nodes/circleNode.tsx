import { nanoid } from "nanoid";
import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { AbstractNodeType } from "./abstractNode";
import { DataType, DataTypes } from "../datatypes";

type CircleDefinition = {
    inputs: {
        radius: DataType<"length">;
    };
    outputs: {
        output: DataType<"shape">;
    };
    payload: {
        label: DataType<"string">;
        radius: DataType<"length">;
    };
};

export const CircleNodeType = new (class extends AbstractNodeType<CircleDefinition> {
    create(input: Partial<DataTypes.PayloadFor<CircleDefinition>>, id: string = nanoid()): ArcaneGraph.NodeOf<DataTypes.PayloadFor<CircleDefinition>> {
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
                radius: `100px`,
            },
            type: "circle",
        };
    }
    getSlots(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<CircleDefinition>>): DataTypes.SlotFor<CircleDefinition>[] {
        return [
            {
                type: "shape",
                socketOut: "output",
                label: "Output",
                widget: "none",
            },
            {
                type: "length",
                socketIn: "radius",
                widget: "input",
                label: "Radius",
                property: "radius",
            },
        ];
    }
    dependsOn<K extends "output">(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<CircleDefinition>>, outSocket: K): "radius"[] {
        return [];
    }
})();
