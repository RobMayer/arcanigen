import { nanoid } from "nanoid";
import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { AbstractNodeType, BuiltNodeOf } from "./abstractNode";
import { DataType, DataTypes } from "../datatypes";
import { ICONS } from "../../components/Icon";
import { NodeCategory } from "../../types";
import { Resolver } from "../../util/resolver";
import { Length } from "../datatypes/length";

type CircleDefinition = {
    inputs: {
        radius: DataType<"length">;

        // stroke
        strokeWidth: DataType<"length">;
        strokeColor: DataType<"color">;
        strokeCap: DataType<"enum">;
        strokeDash: DataType<"tokens<length>">;
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
        strokeCap: DataType<"enum">;
        strokeDash: DataType<"tokens<length>">;
        strokeDashOffset: DataType<"length">;
        // fill
        fillColor: DataType<"color">;
    };
};

export const CircleNodeType = new (class extends AbstractNodeType<CircleDefinition> {
    displayName = "Circle";
    defaultLabel = "Circle";
    iconNode = ICONS.Bolt;
    iconCard = ICONS.Bolt;
    category: NodeCategory = "shape";

    constructor() {
        super("circle");
    }

    create(input: Partial<DataTypes.PayloadFor<CircleDefinition>>, id: string = nanoid()): BuiltNodeOf<CircleDefinition> {
        return {
            id,
            in: {
                radius: null,
                strokeWidth: null,
                strokeColor: null,
                strokeDash: null,
                strokeDashOffset: null,
                strokeCap: null,
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
                strokeDash: "",
                strokeColor: "#000000ff",
                strokeDashOffset: "0px",
                strokeCap: 0,
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
                label: "Styling",
                type: "ui",
                widget: "accordion",
                children: [
                    {
                        label: "Stroke",
                        type: "ui",
                        widget: "heading",
                    },
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
                        label: "Stroke Cap",
                        type: "enum",
                        widget: "radiobutton",
                        orientation: "horizontal",
                        socketIn: "strokeCap",
                        property: "strokeCap",
                        options: ["Butt", "Square", "Round"],
                    },
                    {
                        label: "Stroke Dash",
                        type: "tokens<length>",
                        widget: "input",
                        socketIn: "strokeDash",
                        property: "strokeDash",
                        nullable: true,
                    },
                    {
                        label: "Stroke Dash Offset",
                        type: "length",
                        widget: "input",
                        socketIn: "strokeDashOffset",
                        property: "strokeDashOffset",
                    },
                    {
                        label: "Fill",
                        type: "ui",
                        widget: "heading",
                    },
                    {
                        label: "Fill Color",
                        type: "color",
                        widget: "hex",
                        socketIn: "fillColor",
                        property: "fillColor",
                        alpha: true,
                        nullable: true,
                    },
                ],
            },
        ];
    }
    dependsOn(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<CircleDefinition>>, outSocket: keyof CircleDefinition["outputs"]): (keyof CircleDefinition["inputs"])[] {
        return [];
    }

    evaluate(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<CircleDefinition>>, socket: keyof CircleDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEvaluation | null {
        if (socket === "output") {
            const r = Length.Emptyable.asNumber(Length.Emptyable.constrain(context.resolve<"length">(node.id, "radius")?.data ?? node.payload.radius, ">0px"));
            if (!r) {
                return null;
            }
            return {
                kind: "shape",
                data: {
                    tag: "path",
                    attributes: {
                        d: `M 0,${-1 * r} A ${r},${r} 0 0 1 0,${r} A ${r},${r} 0 0 1 0,${r * -1}`,
                    },
                    children: [],
                },
            };
        }

        return null;
    }
})();
