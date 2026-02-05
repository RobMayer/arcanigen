export type Length = `${number}${LengthUnit}`;
export type LengthUnit = "px" | "pt" | "in" | "cm" | "mm";

export type Color = `#${string}` | "none";

type MinBoundsOf<T extends string | number> = `<${T}` | `<=${T}`;
type MaxBoundsOf<T extends string | number> = `>${T}` | `>=${T}`;
type RangeBoundsOf<T extends string | number> = `${MinBoundsOf<T>}${MaxBoundsOf<T>}`;

export type BoundsOf<T extends string | number> = RangeBoundsOf<T> | MinBoundsOf<T> | MaxBoundsOf<T>;

export type SVGObject = {
    tag: "g" | "path" | "svg";
    children: SVGObject[];
    attributes: { [key: string]: string };
};

export type NodeCategory = "result" | "interface" | "primitive" | "collection" | "shape";
