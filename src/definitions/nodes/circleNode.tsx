import { nanoid } from "nanoid";
import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { AbstractNodeType, BuiltNodeOf } from "./abstractNode";
import { DataType, DataTypes } from "../datatypes";
import { ICONS } from "../../components/Icon";
import { NodeCategory } from "../../types";
import { Resolver } from "../../util/resolver";
import { Length } from "../datatypes/length";
import { Enum } from "../datatypes/enum";

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

        // transforms
        positionMode: DataType<"enum">,
        positionX: DataType<"length">,
        positionY: DataType<"length">,
        positionRadius: DataType<"length">,
        // positionTheta: DataType<"angle">,
        // rotation: DataType<"angle">,

    };
    outputs: {
        output: DataType<"shape">;
    };
    payload: {
        label: DataType<"string">;
        test: DataType<"float">;
        radius: DataType<"length">;

        // stroke
        strokeWidth: DataType<"length">;
        strokeColor: DataType<"color">;
        strokeCap: DataType<"enum">;
        strokeDash: DataType<"tokens<length>">;
        strokeDashOffset: DataType<"length">;
        // fill
        fillColor: DataType<"color">;

        //transforms
        positionMode: DataType<"enum">,
        positionX: DataType<"length">,
        positionY: DataType<"length">,
        positionRadius: DataType<"length">,
        // positionTheta: DataType<"angle">,
        // rotation: DataType<"angle">,
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
                // transforms
                positionMode: null,
                positionX: null,
                positionY: null,
                positionRadius: null,
                // positionTheta: null,
                // rotation: null,
            },
            out: {
                output: [],
            },
            payload: {
                label: "",
                radius: "100px",
                test: "0",
                // stroke
                strokeWidth: "1px",
                strokeDash: "",
                strokeColor: "#000000ff",
                strokeDashOffset: "0px",
                strokeCap: Enum.Common.strokeCap.Butt,
                // fill
                fillColor: "none",
                // transforms
                positionMode: Enum.Common.positionMode.Cartesian,
                positionX: "0px",
                positionY: "0px",
                positionRadius: "0px",
                // positionTheta: 0,
                // rotation: 0,
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
                label: "Test",
                type: "float",
                widget: "input",
                property: "test",
            },
            {
                label: "Radius",
                type: "length",
                socketIn: "radius",
                widget: "input",
                property: "radius",
                min: "0px",
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
                        options: Enum.options(Enum.Common.strokeCap),
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
            {
                label: "Transforms",
                type: "ui",
                widget: "accordion",
                children: [
                    {
                        label: "Position Mode",
                        type: "enum",
                        widget: "radiobutton",
                        options: Enum.options(Enum.Common.positionMode),
                        socketIn: "positionMode",
                        property: "positionMode"
                    },
                    {
                        label: "Position X",
                        type: "length",
                        widget: "input",
                        socketIn: "positionX",
                        property: "positionX"
                    },
                    {
                        label: "Position Y",
                        type: "length",
                        widget: "input",
                        socketIn: "positionY",
                        property: "positionY"
                    },
                    {
                        label: "Position Radius",
                        type: "length",
                        widget: "input",
                        socketIn: "positionRadius",
                        property: "positionRadius"
                    },
                ]
            }
        ];
    }
    dependsOn(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<CircleDefinition>>, outSocket: keyof CircleDefinition["outputs"]): (keyof CircleDefinition["inputs"])[] {
        return [];
    }

    evaluate(node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<CircleDefinition>>, socket: keyof CircleDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEvaluation | null {
        if (socket === "output") {
            const radius = Length.Emptyable.asNumber(Length.Emptyable.max(context.resolve<"length">(node.id, "radius")?.data ?? node.payload.radius, "0px"));
            if (!radius) {
                return null;
            }

            // Resolve stroke attributes
            const strokeColor = context.resolve<"color">(node.id, "strokeColor")?.data ?? node.payload.strokeColor;
            const strokeWidth = context.resolve<"length">(node.id, "strokeWidth")?.data ?? node.payload.strokeWidth;
            const strokeCap = context.resolve<"enum">(node.id, "strokeCap")?.data ?? node.payload.strokeCap;
            const strokeDash = context.resolve<"tokens<length>">(node.id, "strokeDash")?.data ?? node.payload.strokeDash;
            const strokeDashOffset = context.resolve<"length">(node.id, "strokeDashOffset")?.data ?? node.payload.strokeDashOffset;

            // Resolve fill attributes
            const fillColor = context.resolve<"color">(node.id, "fillColor")?.data ?? node.payload.fillColor;

            // Map strokeCap enum to SVG linecap value
            const strokeLinecap = (Resolver.EnumMappings.strokeCap[strokeCap]) ?? "butt";

            // Convert stroke dash to pixel values
            const strokeDasharray = strokeDash
                ? strokeDash
                      .split(/\s+/)
                      .filter(Boolean)
                      .map((token) => Length.Emptyable.asNumber(token as Length.Type) ?? 0)
                      .join(" ")
                : undefined;

            const attributes: Record<string, string> = {
                d: `M 0,${-1 * radius} A ${radius},${radius} 0 0 1 0,${radius} A ${radius},${radius} 0 0 1 0,${radius * -1}`,
            };

            // Add stroke attributes
            if (strokeColor !== "none") {
                attributes.stroke = strokeColor;
                attributes["stroke-width"] = String(Length.Emptyable.asNumber(strokeWidth) ?? 0);
                attributes["stroke-linecap"] = strokeLinecap;
                if (strokeDasharray) {
                    attributes["stroke-dasharray"] = strokeDasharray;
                    attributes["stroke-dashoffset"] = String(Length.Emptyable.asNumber(strokeDashOffset) ?? 0);
                }
            }

            // Add fill attribute
            attributes.fill = fillColor;

            return {
                kind: "shape",
                data: {
                    tag: "path",
                    attributes,
                    children: [],
                },
            };
        }

        return null;
    }
})();
