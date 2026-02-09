export type Color = `#${string}` | "none";

export type SVGObject = {
    tag: "g" | "path" | "svg";
    children: SVGObject[];
    attributes: { [key: string]: string | undefined };
};
