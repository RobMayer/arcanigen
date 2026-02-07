import { nanoid } from "nanoid";
import { ICONS } from "../../../components/Icon";
import { NodeCategory } from "../../../types";
import { ArcaneGraph } from "../../../util/structs/arcaneGraph";
import { DataType, DataTypes } from "../../datatypes";
import { AbstractNodeType, BuiltNodeOf } from "../abstractNode";
import { Resolver } from "../../../util/resolver";

type AngleDefinition = {
    inputs: {
        value: DataType<"angle">;
    };
    outputs: {
        output: DataType<"angle">;
    };
    payload: {
        label: DataType<"string">;
        value: DataType<"angle">;
        wraps: DataType<"boolean">;
    };
};

export const AnglePrimitiveType = new (class extends AbstractNodeType<AngleDefinition> {
    displayName = "Angle";
    defaultLabel = "Angle";
    iconNode = ICONS.Bolt;
    iconCard = ICONS.Bolt;
    category: NodeCategory = "primitive";
    create(input: Partial<DataTypes.PayloadFor<AngleDefinition>>, id: string = nanoid()): BuiltNodeOf<AngleDefinition> {
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
                wraps: false,
            },
            type: "angle",
        };
    }
    getSlots(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<AngleDefinition>>): DataTypes.SlotFor<AngleDefinition>[] {

        const wraps = node.payload.wraps;

        return [
            {
                label: "Output",
                type: "angle",
                socketOut: "output",
                widget: "none",
            },
            {
                label: "Value",
                type: "angle",
                socketIn: "value",
                widget: "input",
                property: "value",
                unbound: !wraps,
            },
            {
                label: "Wraps",
                type: "boolean",
                widget: "checkbox",
                text: "Wraps around",
                property: "wraps"
            },
        ];
    }
    dependsOn(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<AngleDefinition>>, outSocket: "output"): "value"[] {
        if (outSocket === "output") return ["value"];
        return [];
    }
    // todo: handle wrapping
    evaluate(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<AngleDefinition>>, socket: "output", context: Resolver.Context): DataTypes.AnyEvaluation | null {
        if (socket === "output") {
            const v = context.resolve<"angle">(node.id, "value")?.data ?? node.payload.value;
            if (v === "") {
                return null;
            }
            return {
                kind: "angle",
                data: v,
            };
        }
        return null;
    }
})("angle");
