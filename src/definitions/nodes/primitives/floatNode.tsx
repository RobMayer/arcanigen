import { nanoid } from "nanoid";
import { ICONS } from "../../../components/Icon";
import { NodeCategory } from "../../../types";
import { ArcaneGraph } from "../../../util/structs/arcaneGraph";
import { DataType, DataTypes } from "../../datatypes";
import { AbstractNodeType, BuiltNodeOf } from "../abstractNode";
import { Resolver } from "../../../util/resolver";

type FloatDefinition = {
    inputs: {
        value: DataType<"float">;
    };
    outputs: {
        output: DataType<"float">;
    };
    payload: {
        label: DataType<"string">;
        value: DataType<"float">;
    };
};

export const FloatPrimitiveType = new (class extends AbstractNodeType<FloatDefinition> {
    displayName = "Float";
    defaultLabel = "Float";
    iconNode = ICONS.Bolt;
    iconCard = ICONS.Bolt;
    category: NodeCategory = "primitive";
    create(input: Partial<DataTypes.PayloadFor<FloatDefinition>>, id: string = nanoid()): BuiltNodeOf<FloatDefinition> {
        return {
            id,
            in: {
                value: null,
            },
            out: {
                output: [],
            },
            payload: {
                label: "",
                value: "0",
            },
            type: "float",
        };
    }
    getSlots(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<FloatDefinition>>): DataTypes.SlotFor<FloatDefinition>[] {
        return [
            {
                label: "Output",
                type: "float",
                socketOut: "output",
                widget: "none",
            },
            {
                label: "Value",
                type: "float",
                socketIn: "value",
                widget: "input",
                property: "value",
            },
        ];
    }
    dependsOn(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<FloatDefinition>>, outSocket: "output"): "value"[] {
        if (outSocket === "output") return ["value"];
        return [];
    }
    evaluate(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<FloatDefinition>>, socket: "output", context: Resolver.Context): DataTypes.AnyEvaluation | null {
        if (socket === "output") {
            return {
                kind: "float",
                data: context.resolve<"float">(node.id, "value")?.data ?? node.payload.value,
            };
        }
        return null;
    }
})("float");
