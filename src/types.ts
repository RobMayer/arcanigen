export type Color = `#${string}` | "none";

export type BoundsOf<T extends string | number> = `${">" | ">="}${T}` | `${"<" | "<="}${T}` | `${">" | ">="}${T}${"<" | "<="}${T}`

export type SVGObject = {
    tag: "g" | "path" | "svg";
    children: SVGObject[];
    attributes: { [key: string]: string };
};

export type NodeCategory = "result" | "interface" | "primitive" | "collection" | "shape";
