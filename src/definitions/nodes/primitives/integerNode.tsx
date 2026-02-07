import { nanoid } from "nanoid";
import { ICONS } from "../../../components/Icon";
import { NodeCategory } from "../../../types";
import { ArcaneGraph } from "../../../util/structs/arcaneGraph";
import { DataType, DataTypes } from "../../datatypes";
import { AbstractNodeType, BuiltNodeOf } from "../abstractNode";
import { Resolver } from "../../../util/resolver";

type IntegerDefinition = {
    inputs: {
        value: DataType<"integer">;
    };
    outputs: {
        output: DataType<"integer">;
    };
    payload: {
        label: DataType<"string">;
        value: DataType<"integer">;
    };
};

export const IntegerPrimitiveType = new (class extends AbstractNodeType<IntegerDefinition> {
    displayName = "Integer";
    defaultLabel = "Integer";
    iconNode = ICONS.Bolt;
    iconCard = ICONS.Bolt;
    category: NodeCategory = "primitive";
    create(input: Partial<DataTypes.PayloadFor<IntegerDefinition>>, id: string = nanoid()): BuiltNodeOf<IntegerDefinition> {
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
            type: "integer",
        };
    }
    getSlots(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<IntegerDefinition>>): DataTypes.SlotFor<IntegerDefinition>[] {
        return [
            {
                label: "Output",
                type: "integer",
                socketOut: "output",
                widget: "none",
            },
            {
                label: "Value",
                type: "integer",
                socketIn: "value",
                widget: "input",
                property: "value",
            },
        ];
    }
    dependsOn(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<IntegerDefinition>>, outSocket: "output"): "value"[] {
        if (outSocket === "output") return ["value"];
        return [];
    }
    evaluate(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<IntegerDefinition>>, socket: "output", context: Resolver.Context): DataTypes.AnyEvaluation | null {
        if (socket === "output") {
            return {
                kind: "integer",
                data: context.resolve<"integer">(node.id, "value")?.data ?? node.payload.value,
            };
        }
        return null;
    }
})("integer");
